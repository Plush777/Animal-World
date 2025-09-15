import { CharacterStorage } from "../../canvas/characterStorage";
import { characterSettingPopup } from "./characterSetting";
import { createAndShowLoadingUI, setTotalModels, updateProgressText, onLoadingError } from "./loading";
import { getCurrentLoggedInUser } from "../../auth/auth-ui";

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

  public handleJoinClick(): void {
    console.log("참여 버튼 클릭됨");

    // 캔버스 초기화 시작 (캐릭터 선택 여부와 관계없이)
    this.startCanvasInitialization();

    // 캔버스 로딩 완료 후 캐릭터 설정 처리
    this.waitForCanvasLoading();
  }

  private waitForCanvasLoading(): void {
    // 참여 버튼 비활성화 (중복 클릭 방지)
    this.disableJoinButton();

    // Canvas 로딩 완료 이벤트 리스너 등록
    const handleCanvasLoadingComplete = () => {
      console.log("Canvas 로딩 완료 이벤트 수신됨");
      // 이벤트 리스너 제거 (한 번만 실행)
      document.removeEventListener("canvasLoadingComplete", handleCanvasLoadingComplete);

      // 캔버스 로딩 완료 후 캐릭터 설정 처리
      this.handleCharacterSetting();
    };

    document.addEventListener("canvasLoadingComplete", handleCanvasLoadingComplete);

    // 만약 이미 로딩이 완료된 상태라면 즉시 실행
    if (document.querySelector(".main.ui-visible")) {
      console.log("이미 월드가 로딩된 상태입니다. 캐릭터 설정을 처리합니다.");
      this.handleCharacterSetting();
    } else {
      console.log("월드가 아직 로딩 중입니다. canvasLoadingComplete 이벤트를 기다립니다.");
    }
  }

  private handleCharacterSetting(): void {
    console.log("캐릭터 설정 처리 시작");

    // 로컬스토리지에서 캐릭터 정보 확인
    const hasCharacter = CharacterStorage.hasSelectedCharacter();
    console.log("CharacterStorage.hasSelectedCharacter():", hasCharacter);

    if (hasCharacter) {
      // 캐릭터가 이미 선택되어 있으면 바로 완료
      const currentCharacter = CharacterStorage.getCurrentCharacter();
      if (currentCharacter) {
        console.log(`이미 캐릭터가 선택되어 있습니다: ${currentCharacter.name}`);
        this.completeJoin(currentCharacter.id);
        return;
      }
    }

    // 캐릭터가 선택되지 않았다면 캐릭터 설정 팝업 표시
    console.log("캐릭터가 선택되지 않았습니다. 캐릭터 설정 팝업을 표시합니다.");
    this.showCharacterSettingPopup();
  }

  private startCanvasInitialization(): void {
    console.log("캔버스 초기화 시작...");

    // 현재 사용자 정보 가져오기
    const currentUser = getCurrentLoggedInUser();
    const userName = currentUser?.user_metadata?.name || currentUser?.email || "게스트";

    // 채팅 시스템 초기화
    if ((window as any).initializeChatSystem) {
      (window as any).initializeChatSystem(userName);
    }

    // 인트로 화면 즉시 숨기기 (카메라 이동 없음)
    const hideIntroWrapperOnly = () => {
      const introWrapper = document.querySelector(".intro-wrapper") as HTMLElement;
      if (introWrapper) {
        introWrapper.style.display = "none";
        introWrapper.style.opacity = "0";
      }
    };
    hideIntroWrapperOnly();

    // 인트로 오디오 정지 (Three.js 오디오로 전환)
    const introAudioManager = (window as any).globalIntroAudioManager;
    if (introAudioManager) {
      introAudioManager.stopBGM();
      console.log("인트로 BGM 정지 - Three.js 오디오로 전환");
    }

    // 로딩 화면 표시 및 초기 설정
    console.log("로딩 UI 표시 시작...");
    createAndShowLoadingUI();
    setTotalModels(8);
    updateProgressText("월드를 준비하는 중...");

    // Canvas 초기화 실행
    this.initializeCanvas();
  }

  private async initializeCanvas(): Promise<void> {
    try {
      console.log("initCanvas 함수 확인:", typeof (window as any).initCanvas);
      if (typeof (window as any).initCanvas !== "function") {
        throw new Error("initCanvas 함수를 찾을 수 없습니다.");
      }
      await (window as any).initCanvas();
      console.log("캔버스 초기화 완료");
    } catch (error) {
      console.error("Canvas 초기화 중 오류:", error);
      onLoadingError(error);
    }
  }

  private showCharacterSettingPopup(): void {
    // 참여 버튼 다시 활성화 (캐릭터 선택 취소 시를 대비)
    this.enableJoinButton();

    console.log("캐릭터 설정 팝업을 생성하고 표시합니다...");

    // 캐릭터 설정 팝업 HTML 생성
    characterSettingPopup.createPopup();

    // 팝업 표시
    characterSettingPopup.show((characterId: string) => {
      // 캐릭터 선택 완료 시 콜백
      console.log(`캐릭터 선택 완료: ${characterId}`);
      this.completeJoin(characterId);
    });
  }

  private completeJoin(characterId: string): void {
    console.log(`참여 완료: ${characterId}`);

    // 참여 완료 콜백 호출
    if (this.onJoinComplete) {
      console.log("참여 완료 콜백 호출 중...");
      this.onJoinComplete(characterId);
    } else {
      console.warn("참여 완료 콜백이 설정되지 않았습니다.");
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
