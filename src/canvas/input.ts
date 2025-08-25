import * as THREE from "three";
import { CharacterManager } from "./character";

export class InputManager {
  private keys: Set<string> = new Set();
  private characterManager: CharacterManager;
  private activeCharacterId: string | null = null;
  private camera: THREE.Camera | null = null;

  constructor(characterManager: CharacterManager) {
    this.characterManager = characterManager;
    this.setupEventListeners();
  }

  // 카메라 설정
  setCamera(camera: THREE.Camera): void {
    this.camera = camera;
  }

  private setupEventListeners(): void {
    // 키보드 이벤트 리스너
    document.addEventListener("keydown", (event) => {
      // WASD, 방향키, 캐릭터 전환 키만 처리
      const key = event.key.toLowerCase();

      // WASD 키
      if (["w", "a", "s", "d"].includes(key)) {
        this.keys.add(key);
      }

      // 방향키
      if (["arrowup", "arrowdown", "arrowleft", "arrowright"].includes(key)) {
        // 방향키를 WASD로 매핑
        const keyMap: { [key: string]: string } = {
          arrowup: "w",
          arrowdown: "s",
          arrowleft: "a",
          arrowright: "d",
        };
        this.keys.add(keyMap[key]);
      }

      // 캐릭터 전환 (1-6 키)
      if (event.key >= "1" && event.key <= "6") {
        this.switchCharacter(parseInt(event.key) - 1);
      }
    });

    document.addEventListener("keyup", (event) => {
      const key = event.key.toLowerCase();

      // WASD 키
      if (["w", "a", "s", "d"].includes(key)) {
        this.keys.delete(key);
      }

      // 방향키
      if (["arrowup", "arrowdown", "arrowleft", "arrowright"].includes(key)) {
        const keyMap: { [key: string]: string } = {
          arrowup: "w",
          arrowdown: "s",
          arrowleft: "a",
          arrowright: "d",
        };
        this.keys.delete(keyMap[key]);
      }
    });
  }

  // 캐릭터 전환
  private switchCharacter(index: number): void {
    const characters = this.characterManager.getAllCharacters();
    if (characters[index]) {
      this.activeCharacterId = characters[index].id;
      console.log(`활성 캐릭터 변경: ${this.activeCharacterId}`);
    }
  }

  // 카메라 참조를 가져오는 메서드
  private getCamera(): THREE.Camera {
    if (!this.camera) {
      throw new Error("카메라가 설정되지 않았습니다.");
    }
    return this.camera;
  }

  // 업데이트 (키보드 입력 처리)
  update(): void {
    if (this.activeCharacterId) {
      this.characterManager.handleKeyboardInput(this.activeCharacterId, this.keys);
    }
  }

  // 활성 캐릭터 ID 설정
  setActiveCharacter(characterId: string): void {
    this.activeCharacterId = characterId;
  }

  // 활성 캐릭터 ID 가져오기
  getActiveCharacterId(): string | null {
    return this.activeCharacterId;
  }

  // 현재 눌린 키들 가져오기
  getPressedKeys(): Set<string> {
    return new Set(this.keys);
  }

  // 정리 메서드
  cleanup(): void {
    // 이벤트 리스너들을 제거하기 위해 필요한 경우 여기에 추가
    this.keys.clear();
    this.activeCharacterId = null;
    this.camera = null;
  }
}
