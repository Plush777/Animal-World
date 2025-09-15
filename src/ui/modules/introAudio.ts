/**
 * 인트로 화면용 오디오 관리 모듈
 * HTML5 Audio를 사용하여 인트로 화면에서 BGM을 재생합니다.
 */

import { isDayTime } from "../../canvas/time";

/**
 * 인트로 화면용 오디오 매니저 클래스
 */
export class IntroAudioManager {
  private currentAudio: HTMLAudioElement | null = null;
  private isPlaying: boolean = false;
  private volume: number = 0.3; // 기본 볼륨 (30%)

  constructor() {
    // 메인화면에서 자동 오디오 재생 비활성화
    // this.setupInitialBGM();
  }

  /**
   * 현재 시간대에 맞는 초기 BGM 설정
   */
  private setupInitialBGM(): void {
    const bgmPath = this.getBGMForCurrentTime();
    console.log(`인트로 화면 BGM 설정: ${bgmPath}`);

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
  private loadAndPlayBGM(bgmPath: string): void {
    try {
      // 기존 오디오가 있으면 정리
      this.stopCurrentAudio();

      console.log(`인트로 BGM 로드 시작: ${bgmPath}`);

      // 새로운 HTML5 오디오 객체 생성
      const audio = document.createElement("audio");
      audio.src = bgmPath;
      audio.loop = true;
      audio.volume = this.volume;

      // 오디오 로드 완료 이벤트
      audio.addEventListener("canplaythrough", () => {
        console.log(`인트로 BGM 로드 성공: ${bgmPath}`);
        this.currentAudio = audio;
        this.playBGM();
      });

      // 오디오 로드 오류 이벤트
      audio.addEventListener("error", (error) => {
        console.error(`인트로 BGM 로드 실패: ${bgmPath}`, error);
      });

      // 오디오 로드 시작
      audio.load();
    } catch (error) {
      console.error("인트로 BGM 로드 중 오류 발생:", error);
    }
  }

  /**
   * BGM 재생
   */
  public playBGM(): void {
    if (!this.currentAudio) {
      console.warn("재생할 인트로 BGM이 없습니다.");
      return;
    }

    if (this.isPlaying) {
      console.log("인트로 BGM이 이미 재생 중입니다.");
      return;
    }

    try {
      // 사용자 상호작용 후에만 오디오 재생 가능 (브라우저 정책)
      const playPromise = this.currentAudio.play();

      if (playPromise !== undefined) {
        playPromise
          .then(() => {
            this.isPlaying = true;
            console.log("인트로 BGM 재생 시작");
          })
          .catch((error) => {
            console.warn("인트로 BGM 자동 재생 실패 (사용자 상호작용 필요):", error);
            // 사용자 상호작용 후 재생을 위해 이벤트 리스너 등록
            this.setupUserInteractionPlayback();
          });
      }
    } catch (error) {
      console.error("인트로 BGM 재생 중 오류 발생:", error);
    }
  }

  /**
   * 사용자 상호작용 후 재생을 위한 이벤트 리스너 설정
   */
  private setupUserInteractionPlayback(): void {
    const playOnInteraction = () => {
      if (this.currentAudio && !this.isPlaying) {
        this.playBGM();
      }
      // 이벤트 리스너 제거
      document.removeEventListener("click", playOnInteraction);
      document.removeEventListener("keydown", playOnInteraction);
      document.removeEventListener("touchstart", playOnInteraction);
    };

    document.addEventListener("click", playOnInteraction, { once: true });
    document.addEventListener("keydown", playOnInteraction, { once: true });
    document.addEventListener("touchstart", playOnInteraction, { once: true });
  }

  /**
   * BGM 일시정지
   */
  public pauseBGM(): void {
    if (!this.currentAudio || !this.isPlaying) {
      return;
    }

    try {
      this.currentAudio.pause();
      this.isPlaying = false;
      console.log("인트로 BGM 일시정지");
    } catch (error) {
      console.error("인트로 BGM 일시정지 중 오류 발생:", error);
    }
  }

  /**
   * BGM 정지
   */
  public stopBGM(): void {
    this.stopCurrentAudio();
  }

  /**
   * 현재 오디오 정지 및 정리
   */
  private stopCurrentAudio(): void {
    if (this.currentAudio) {
      try {
        this.currentAudio.pause();
        this.currentAudio.currentTime = 0;
        this.currentAudio = null;
        this.isPlaying = false;
        console.log("인트로 BGM 정지 및 정리 완료");
      } catch (error) {
        console.error("인트로 BGM 정지 중 오류 발생:", error);
      }
    }
  }

  /**
   * 시간대 변경에 따른 BGM 전환
   */
  public switchBGMForTimeChange(): void {
    const newBgmPath = this.getBGMForCurrentTime();
    console.log(`시간대 변경으로 인한 인트로 BGM 전환: ${newBgmPath}`);

    this.loadAndPlayBGM(newBgmPath);
  }

  /**
   * 볼륨 설정
   */
  public setVolume(volume: number): void {
    this.volume = Math.max(0, Math.min(1, volume)); // 0-1 범위로 제한

    if (this.currentAudio) {
      this.currentAudio.volume = this.volume;
    }

    console.log(`인트로 BGM 볼륨 설정: ${(this.volume * 100).toFixed(0)}%`);
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
   * 인트로 오디오 매니저 정리
   */
  public dispose(): void {
    console.log("인트로 AudioManager 정리 시작...");

    this.stopCurrentAudio();

    console.log("인트로 AudioManager 정리 완료");
  }
}

// 전역 인트로 오디오 매니저 인스턴스
let globalIntroAudioManager: IntroAudioManager | null = null;

/**
 * 전역 인트로 오디오 매니저 초기화
 */
export function initializeIntroAudioManager(): IntroAudioManager {
  if (globalIntroAudioManager) {
    console.log("전역 인트로 AudioManager가 이미 초기화되었습니다.");
    return globalIntroAudioManager;
  }

  globalIntroAudioManager = new IntroAudioManager();

  // 전역에서 접근 가능하도록 노출
  (window as any).globalIntroAudioManager = globalIntroAudioManager;

  return globalIntroAudioManager;
}

/**
 * 전역 인트로 오디오 매니저 반환
 */
export function getGlobalIntroAudioManager(): IntroAudioManager | null {
  return globalIntroAudioManager;
}

/**
 * 전역 인트로 오디오 매니저 정리
 */
export function disposeGlobalIntroAudioManager(): void {
  if (globalIntroAudioManager) {
    globalIntroAudioManager.dispose();
    globalIntroAudioManager = null;
    (window as any).globalIntroAudioManager = null;
  }
}
