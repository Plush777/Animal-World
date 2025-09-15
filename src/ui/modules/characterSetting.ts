import { CharacterStorage } from "../../canvas/characterStorage";
import { sceneHtml } from "../../data/sceneHtml";

export class CharacterSettingPopup {
  private popup: HTMLElement | null = null;
  private characterButtons: NodeListOf<HTMLButtonElement> | null = null;
  private selectedCharacterId: string | null = null;
  private onCharacterSelected: ((characterId: string) => void) | null = null;
  public isInitialized: boolean = false;

  constructor() {
    // 초기화는 show() 메서드에서 수행
  }

  private init(): void {
    // 먼저 기존 팝업이 있는지 확인
    this.popup = document.querySelector(".popup.character-setting");

    // 팝업이 없으면 동적으로 생성
    if (!this.popup) {
      this.createPopup();
    }

    if (!this.popup) {
      console.error("캐릭터 설정 팝업을 생성할 수 없습니다.");
      return;
    }

    // 팝업이 동적으로 생성된 경우 characterButtons가 이미 설정되어 있음
    if (!this.characterButtons) {
      this.characterButtons = this.popup.querySelectorAll(".popup-character-tab-button");
    }

    // 이벤트 리스너 설정 (매번 다시 설정)
    this.setupEventListeners();
    this.updateCharacterStates();
    this.isInitialized = true;
  }

  public createPopup(): void {
    // character-setting 컨테이너 찾기
    const container = document.querySelector("#character-setting");
    if (!container) {
      console.error("#character-setting 컨테이너를 찾을 수 없습니다.");
      return;
    }

    console.log("#character-setting 컨테이너를 찾았습니다:", container);

    // sceneHtml에서 캐릭터 설정 HTML 가져오기
    const characterSettingHtml = sceneHtml.characterSetting;
    if (!characterSettingHtml) {
      console.error("캐릭터 설정 HTML을 찾을 수 없습니다.");
      return;
    }

    console.log("캐릭터 설정 HTML을 가져왔습니다. 길이:", characterSettingHtml.length);

    // HTML을 컨테이너에 추가
    container.innerHTML = characterSettingHtml;

    // 생성된 팝업 요소 찾기
    this.popup = container.querySelector(".popup.character-setting");

    if (this.popup) {
      console.log("캐릭터 설정 팝업이 동적으로 생성되었습니다:", this.popup);

      // 팝업 생성 후 요소들 다시 찾기
      this.characterButtons = this.popup.querySelectorAll(".popup-character-tab-button");
      console.log("캐릭터 버튼 개수:", this.characterButtons.length);

      // 팝업이 생성되면 즉시 이벤트 리스너 설정
      this.setupEventListeners();
    } else {
      console.error("캐릭터 설정 팝업 요소를 찾을 수 없습니다.");
      console.log("컨테이너 내용:", container.innerHTML);
    }
  }

  private setupEventListeners(): void {
    if (!this.characterButtons) return;

    // 캐릭터 버튼 클릭 이벤트
    this.characterButtons.forEach((button) => {
      button.addEventListener("click", (e) => {
        e.preventDefault();
        this.handleCharacterClick(button);
      });
    });

    // 뒤로 버튼 이벤트
    const backButton = this.popup?.querySelector(".popup-bottom-button-group button:first-child");
    if (backButton) {
      backButton.addEventListener("click", () => {
        this.hide();
        // 참여 버튼 다시 활성화
        this.activateJoinButton();
      });
    }

    // 확인 버튼 이벤트
    const confirmButton = this.popup?.querySelector(".popup-bottom-button-group button:last-child");
    if (confirmButton) {
      confirmButton.addEventListener("click", () => {
        this.handleConfirm();
      });
    }
  }

  private activateJoinButton(): void {
    // joinButtonManager의 참여 버튼 활성화
    if ((window as any).joinButtonManager) {
      (window as any).joinButtonManager.enableJoinButton();
    }
  }

  private handleCharacterClick(button: HTMLButtonElement): void {
    const characterId = button.dataset.character;
    if (!characterId) return;

    // 잠긴 캐릭터는 선택 불가
    if (button.classList.contains("locked")) {
      this.showLockedMessage();
      return;
    }

    // 이전 선택 해제
    this.characterButtons?.forEach((btn) => {
      btn.classList.remove("selected");
    });

    // 새로운 선택
    button.classList.add("selected");
    this.selectedCharacterId = characterId;

    console.log(`캐릭터 선택됨: ${characterId}`);
  }

  private handleConfirm(): void {
    if (!this.selectedCharacterId) {
      this.showSelectMessage();
      return;
    }

    // 캐릭터 저장
    const success = CharacterStorage.setCurrentCharacter(this.selectedCharacterId);
    if (success) {
      console.log(`캐릭터 설정 완료: ${this.selectedCharacterId}`);

      // 콜백 호출
      if (this.onCharacterSelected) {
        this.onCharacterSelected(this.selectedCharacterId);
      }

      this.closePopupOnly();
    } else {
      console.error("캐릭터 설정 실패");
    }
  }

  private updateCharacterStates(): void {
    if (!this.characterButtons) return;

    const settings = CharacterStorage.getCharacterSettings();

    this.characterButtons.forEach((button) => {
      const characterId = button.dataset.character;
      if (!characterId) return;

      const character = settings.find((c) => c.id === characterId);
      if (!character) return;

      // 잠금 상태 업데이트
      if (!character.isUnlocked) {
        button.classList.add("locked");
        button.disabled = true;
      } else {
        button.classList.remove("locked");
        button.disabled = false;
      }

      // 현재 선택된 캐릭터 표시
      const currentCharacter = CharacterStorage.getCurrentCharacter();
      if (currentCharacter && currentCharacter.id === characterId) {
        button.classList.add("selected");
        this.selectedCharacterId = characterId;
      }
    });
  }

  private showLockedMessage(): void {
    // 잠긴 캐릭터 메시지 표시
    alert("이 캐릭터는 아직 잠겨있습니다. 나중에 잠금을 해제할 수 있습니다.");
  }

  private showSelectMessage(): void {
    // 캐릭터 선택 메시지 표시
    alert("캐릭터를 선택해주세요.");
  }

  // 팝업 표시
  show(onCharacterSelected?: (characterId: string) => void): void {
    console.log("캐릭터 설정 팝업 show() 메서드 호출됨");

    // 초기화 수행
    this.init();

    if (!this.popup) {
      console.error("캐릭터 설정 팝업을 찾을 수 없습니다.");
      return;
    }

    console.log("팝업 요소를 찾았습니다:", this.popup);

    // 팝업이 이미 존재하는 경우 characterButtons 다시 찾기
    this.characterButtons = this.popup.querySelectorAll(".popup-character-tab-button");
    console.log("캐릭터 버튼 개수:", this.characterButtons.length);

    this.onCharacterSelected = onCharacterSelected || null;

    // 팝업을 즉시 표시
    this.popup.classList.add("active");
    console.log("팝업에 'active' 클래스 추가됨");

    // 상태 업데이트
    this.updateCharacterStates();

    console.log("캐릭터 설정 팝업 표시됨");
  }

  // 팝업 숨기기 (뒤로 버튼 클릭 시 - intro-wrapper로 복원)
  hide(): void {
    if (!this.popup) return;

    this.popup.classList.remove("active");

    // 즉시 상태 정리 및 intro-wrapper 복원
    this.selectedCharacterId = null;
    this.onCharacterSelected = null;

    // intro-wrapper 다시 보이기
    this.showIntroWrapper();

    // 캔버스 초기 상태로 되돌리기
    this.resetCanvasToInitialState();

    // chat 컨테이너만 비우기 (character-setting은 유지)
    this.clearChatContainer();

    console.log("캐릭터 설정 팝업 닫힘 - intro-wrapper로 복원됨");
  }

  // 팝업만 닫기 (캐릭터 선택 완료 시)
  closePopupOnly(): void {
    if (!this.popup) return;

    this.popup.classList.remove("active");

    // 상태 정리만 수행 (intro-wrapper 복원하지 않음)
    this.selectedCharacterId = null;
    this.onCharacterSelected = null;

    console.log("캐릭터 설정 팝업 닫힘 - 팝업만 닫힘");
  }

  // intro-wrapper 다시 보이기
  private showIntroWrapper(): void {
    const introWrapper = document.querySelector(".intro-wrapper") as HTMLElement;
    if (introWrapper) {
      introWrapper.style.display = "flex";
      introWrapper.style.opacity = "1";
    }
  }

  // 캔버스 초기 상태로 되돌리기
  private resetCanvasToInitialState(): void {
    const scene = document.querySelector<HTMLElement>("#scene");
    if (scene) {
      scene.classList.remove("loaded");
      scene.style.removeProperty("opacity");
    }

    const mainTag = document.querySelector<HTMLElement>(".main");
    const worldHeader = document.querySelector<HTMLElement>("#world-header");

    if (mainTag) {
      mainTag.classList.remove("ui-visible");
    }

    if (worldHeader) {
      worldHeader.classList.remove("ui-visible");
    }

    const loadingUI = document.querySelector<HTMLElement>(".loading-wrapper");
    if (loadingUI) {
      loadingUI.style.display = "none";
    }

    // 캔버스 정리 함수 호출
    if ((window as any).cleanupScene) {
      (window as any).cleanupScene();
    }
  }

  // chat 컨테이너만 비우기
  private clearChatContainer(): void {
    const chat = document.querySelector("#chat") as HTMLElement;

    if (chat) {
      chat.innerHTML = "";
    }
  }

  // 팝업이 표시되어 있는지 확인
  isVisible(): boolean {
    return this.popup?.classList.contains("active") || false;
  }

  // 선택된 캐릭터 ID 가져오기
  getSelectedCharacterId(): string | null {
    return this.selectedCharacterId;
  }
}

// 전역 인스턴스 생성
export const characterSettingPopup = new CharacterSettingPopup();
