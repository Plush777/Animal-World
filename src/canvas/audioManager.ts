import * as THREE from "three";
import { isDayTime, isNightTime } from "./time";

/**
 * Three.js 오디오 매니저 클래스
 * 시간대에 따른 BGM 전환 및 오디오 관리
 */
export class AudioManager {
  private scene: THREE.Scene;
  private audioListener: THREE.AudioListener;
  private currentBGM: THREE.Audio | null = null;
  private isInitialized: boolean = false;
  private isPlaying: boolean = false;
  private volume: number = 0.3; // 기본 볼륨 (30%)

  constructor(scene: THREE.Scene) {
    this.scene = scene;
    this.audioListener = new THREE.AudioListener();
  }

  /**
   * 오디오 매니저 초기화
   * 카메라에 오디오 리스너를 추가하고 초기 BGM을 설정합니다.
   */
  public initialize(camera: THREE.Camera): void {
    if (this.isInitialized) {
      console.log("AudioManager가 이미 초기화되었습니다.");
      return;
    }

    console.log("AudioManager 초기화 시작...");

    // 카메라에 오디오 리스너 추가
    camera.add(this.audioListener);

    // 초기 BGM 설정
    this.setupInitialBGM();

    this.isInitialized = true;
    console.log("AudioManager 초기화 완료");
  }

  /**
   * 현재 시간대에 맞는 초기 BGM 설정
   */
  private setupInitialBGM(): void {
    const bgmPath = this.getBGMForCurrentTime();
    console.log(`현재 시간대에 맞는 BGM 설정: ${bgmPath}`);

    this.loadAndPlayBGM(bgmPath);
  }

  /**
   * 현재 시간대에 맞는 BGM 파일 경로 반환
   */
  private getBGMForCurrentTime(): string {
    if (isDayTime()) {
      return "/sounds/bgm/bgm_afternoon.mp3";
    } else {
      return "/sounds/bgm/bgm_night.mp3";
    }
  }

  /**
   * BGM 로드 및 재생
   */
  private async loadAndPlayBGM(bgmPath: string): Promise<void> {
    try {
      // 기존 BGM이 있으면 정리
      this.stopCurrentBGM();

      console.log(`BGM 로드 시작: ${bgmPath}`);

      // 새로운 오디오 객체 생성
      const audio = new THREE.Audio(this.audioListener);

      // 오디오 로더 생성
      const audioLoader = new THREE.AudioLoader();

      // 오디오 파일 로드
      const audioBuffer = await new Promise<AudioBuffer>((resolve, reject) => {
        audioLoader.load(
          bgmPath,
          (buffer) => {
            console.log(`BGM 로드 성공: ${bgmPath}`);
            resolve(buffer);
          },
          (progress) => {
            console.log(`BGM 로드 진행률: ${((progress.loaded / progress.total) * 100).toFixed(2)}%`);
          },
          (error) => {
            console.error(`BGM 로드 실패: ${bgmPath}`, error);
            reject(error);
          }
        );
      });

      // 오디오 버퍼 설정
      audio.setBuffer(audioBuffer);
      audio.setLoop(true); // 반복 재생
      audio.setVolume(this.volume);

      // 현재 BGM으로 설정
      this.currentBGM = audio;

      // 자동 재생 시작
      this.playBGM();
    } catch (error) {
      console.error("BGM 로드 중 오류 발생:", error);
    }
  }

  /**
   * BGM 재생
   */
  public playBGM(): void {
    if (!this.currentBGM) {
      console.warn("재생할 BGM이 없습니다.");
      return;
    }

    if (this.isPlaying) {
      console.log("BGM이 이미 재생 중입니다.");
      return;
    }

    try {
      this.currentBGM.play();
      this.isPlaying = true;
      console.log("BGM 재생 시작");
    } catch (error) {
      console.error("BGM 재생 중 오류 발생:", error);
    }
  }

  /**
   * BGM 일시정지
   */
  public pauseBGM(): void {
    if (!this.currentBGM || !this.isPlaying) {
      return;
    }

    try {
      this.currentBGM.pause();
      this.isPlaying = false;
      console.log("BGM 일시정지");
    } catch (error) {
      console.error("BGM 일시정지 중 오류 발생:", error);
    }
  }

  /**
   * BGM 정지
   */
  public stopBGM(): void {
    this.stopCurrentBGM();
  }

  /**
   * 현재 BGM 정지 및 정리
   */
  private stopCurrentBGM(): void {
    if (this.currentBGM) {
      try {
        this.currentBGM.stop();
        this.currentBGM.disconnect();
        this.currentBGM = null;
        this.isPlaying = false;
        console.log("현재 BGM 정지 및 정리 완료");
      } catch (error) {
        console.error("BGM 정지 중 오류 발생:", error);
      }
    }
  }

  /**
   * 시간대 변경에 따른 BGM 전환
   */
  public async switchBGMForTimeChange(): Promise<void> {
    const newBgmPath = this.getBGMForCurrentTime();
    console.log(`시간대 변경으로 인한 BGM 전환: ${newBgmPath}`);

    await this.loadAndPlayBGM(newBgmPath);
  }

  /**
   * 볼륨 설정
   */
  public setVolume(volume: number): void {
    this.volume = Math.max(0, Math.min(1, volume)); // 0-1 범위로 제한

    if (this.currentBGM) {
      this.currentBGM.setVolume(this.volume);
    }

    console.log(`BGM 볼륨 설정: ${(this.volume * 100).toFixed(0)}%`);
  }

  /**
   * 현재 볼륨 반환
   */
  public getVolume(): number {
    return this.volume;
  }

  /**
   * BGM 재생 상태 반환
   */
  public isBGMPlaying(): boolean {
    return this.isPlaying;
  }

  /**
   * 오디오 매니저 정리
   */
  public dispose(): void {
    console.log("AudioManager 정리 시작...");

    this.stopCurrentBGM();

    this.isInitialized = false;
    console.log("AudioManager 정리 완료");
  }
}

// 전역 오디오 매니저 인스턴스
let globalAudioManager: AudioManager | null = null;

/**
 * 전역 오디오 매니저 초기화
 */
export function initializeAudioManager(scene: THREE.Scene, camera: THREE.Camera): AudioManager {
  if (globalAudioManager) {
    console.log("전역 AudioManager가 이미 초기화되었습니다.");
    return globalAudioManager;
  }

  globalAudioManager = new AudioManager(scene);
  globalAudioManager.initialize(camera);

  // 전역에서 접근 가능하도록 노출
  (window as any).globalAudioManager = globalAudioManager;

  return globalAudioManager;
}

/**
 * 전역 오디오 매니저 반환
 */
export function getGlobalAudioManager(): AudioManager | null {
  return globalAudioManager;
}

/**
 * 전역 오디오 매니저 정리
 */
export function disposeGlobalAudioManager(): void {
  if (globalAudioManager) {
    globalAudioManager.dispose();
    globalAudioManager = null;
    (window as any).globalAudioManager = null;
  }
}
