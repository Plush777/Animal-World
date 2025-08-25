import { CharacterStorage } from "../../canvas/characterStorage";
import { characterSettingPopup } from "./characterSetting";

export class JoinButtonManager {
  private joinButton: HTMLElement | null = null;
  private onJoinComplete: ((characterId: string) => void) | null = null;
  private checkInterval: number | null = null;
  private isInitialized: boolean = false;

  constructor() {
    this.init();
  }

  private init(): void {
    // 먼저 기존 참여 버튼이 있는지 확인
    this.joinButton = document.getElementById("join-button");

    if (this.joinButton) {
      this.setupEventListeners();
      this.isInitialized = true;
    } else {
      console.log("참여 버튼이 아직 생성되지 않았습니다. 주기적으로 체크합니다.");
      this.startCheckingForJoinButton();
    }
  }

  private startCheckingForJoinButton(): void {
    // 100ms마다 join-button이 생성되었는지 체크
    this.checkInterval = window.setInterval(() => {
      const joinButton = document.getElementById("join-button");

      if (joinButton && !this.isInitialized) {
        console.log("참여 버튼이 생성되었습니다.");
        this.joinButton = joinButton;
        this.setupEventListeners();
        this.isInitialized = true;

        // 체크 중단
        this.stopCheckingForJoinButton();
      }
    }, 100);
  }

  private stopCheckingForJoinButton(): void {
    if (this.checkInterval) {
      clearInterval(this.checkInterval);
      this.checkInterval = null;
    }
  }

  private setupEventListeners(): void {
    if (!this.joinButton) return;

    this.joinButton.addEventListener("click", (e) => {
      e.preventDefault();
      this.handleJoinClick();
    });
  }

  private handleJoinClick(): void {
    console.log("참여 버튼 클릭됨");

    // 이미 캐릭터가 선택되어 있는지 확인
    if (CharacterStorage.hasSelectedCharacter()) {
      const currentCharacter = CharacterStorage.getCurrentCharacter();
      if (currentCharacter) {
        console.log(`이미 캐릭터가 선택되어 있습니다: ${currentCharacter.name}`);
        this.completeJoin(currentCharacter.id);
        return;
      }
    }

    // 캐릭터가 선택되지 않았다면 월드 로딩 완료 후 팝업 표시
    console.log("캐릭터가 선택되지 않았습니다. 월드 로딩 완료 후 캐릭터 설정 팝업을 표시합니다.");
    this.waitForWorldLoading();
  }

  private waitForWorldLoading(): void {
    // 참여 버튼 비활성화 (중복 클릭 방지)
    this.disableJoinButton();

    // HTML을 즉시 삽입 (숨겨진 상태로)
    characterSettingPopup.createPopup();

    // Canvas 로딩 완료 이벤트 리스너 등록
    const handleCanvasLoadingComplete = () => {
      // 이벤트 리스너 제거 (한 번만 실행)
      document.removeEventListener("canvasLoadingComplete", handleCanvasLoadingComplete);

      // 5초 지연 후 팝업 표시
      setTimeout(() => {
        this.showCharacterSettingPopup();
      }, 4000);
    };

    document.addEventListener("canvasLoadingComplete", handleCanvasLoadingComplete);

    // 만약 이미 로딩이 완료된 상태라면 즉시 실행
    if (document.querySelector(".main.ui-visible")) {
      console.log("이미 월드가 로딩된 상태입니다. 5초 후 캐릭터 설정 팝업을 표시합니다.");
      setTimeout(() => {
        this.showCharacterSettingPopup();
      }, 5000);
    }
  }

  private showCharacterSettingPopup(): void {
    // 참여 버튼 다시 활성화 (캐릭터 선택 취소 시를 대비)
    this.enableJoinButton();

    characterSettingPopup.show((characterId: string) => {
      // 캐릭터 선택 완료 시 콜백
      this.completeJoin(characterId);
    });
  }

  private completeJoin(characterId: string): void {
    console.log(`참여 완료: ${characterId}`);

    // 참여 완료 콜백 호출
    if (this.onJoinComplete) {
      this.onJoinComplete(characterId);
    }

    // 참여 버튼 비활성화 또는 숨기기
    this.disableJoinButton();
  }

  private disableJoinButton(): void {
    if (this.joinButton) {
      this.joinButton.setAttribute("disabled", "true");
      this.joinButton.classList.add("disabled");
    }
  }

  public enableJoinButton(): void {
    if (this.joinButton) {
      this.joinButton.removeAttribute("disabled");
      this.joinButton.classList.remove("disabled");
    }
  }

  // 참여 완료 콜백 설정
  setJoinCompleteCallback(callback: (characterId: string) => void): void {
    this.onJoinComplete = callback;
  }

  // 참여 버튼 활성화 (캐릭터 재설정 시 사용)
  resetJoinButton(): void {
    this.enableJoinButton();

    // 참여 버튼이 다시 생성될 수 있도록 MutationObserver 재설정
    if (!this.isInitialized && this.checkInterval) {
      clearInterval(this.checkInterval);
      this.checkInterval = null;
    }

    if (!this.isInitialized) {
      this.startCheckingForJoinButton();
    }
  }

  // 현재 선택된 캐릭터 정보 가져오기
  getCurrentCharacterInfo(): any {
    return CharacterStorage.getCurrentCharacter();
  }

  // 디버깅용: 현재 상태 확인
  getDebugInfo(): any {
    return {
      joinButton: this.joinButton,
      isInitialized: this.isInitialized,
      checkInterval: this.checkInterval,
      hasJoinCompleteCallback: !!this.onJoinComplete,
    };
  }

  // 캐릭터 재설정
  resetCharacter(): void {
    CharacterStorage.clearCharacterData();
    this.enableJoinButton();

    // 참여 버튼 상태 재설정
    this.isInitialized = false;
    this.joinButton = null;

    // 체크 중단
    this.stopCheckingForJoinButton();
    this.startCheckingForJoinButton();
    console.log("캐릭터 설정이 초기화되었습니다.");
  }
}

// 전역 인스턴스 생성
export const joinButtonManager = new JoinButtonManager();

// 전역에서 접근 가능하도록 설정
if (typeof window !== "undefined") {
  (window as any).joinButtonManager = joinButtonManager;
}
