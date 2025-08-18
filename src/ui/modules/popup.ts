/**
 * 팝업 UI 관리 모듈
 * 설정 팝업, 캐릭터 선택 등 팝업 관련 기능 처리
 */

/**
 * 설정 팝업 열기/닫기
 */
function setupSettingPopup(): void {
  const settingButton = document.querySelector(".setting-button");
  if (settingButton) {
    settingButton.addEventListener("click", () => {
      const settingPopup = document.querySelector(".popup.setting") as HTMLElement;
      if (settingPopup) {
        settingPopup.classList.toggle("active");
      }
    });
  }
}

/**
 * 팝업 닫기 버튼 설정
 */
function setupPopupClose(): void {
  const popupCloseButton = document.querySelector(".popup-close");
  if (popupCloseButton) {
    popupCloseButton.addEventListener("click", () => {
      const popup = document.querySelector(".popup") as HTMLElement;
      if (popup) {
        popup.classList.remove("active");
      }
    });
  }
}

/**
 * 캐릭터 선택 버튼 이벤트 설정
 */
function setupCharacterSelection(): void {
  // 캐릭터 선택 버튼 이벤트
  document.querySelectorAll(".popup-character-tab-button").forEach((button) => {
    button.addEventListener("click", () => {
      // 모든 버튼에서 selected 클래스 제거
      document.querySelectorAll(".popup-character-tab-button").forEach((btn) => {
        btn.classList.remove("selected");
      });

      // 클릭된 버튼에 selected 클래스 추가
      button.classList.add("selected");

      // 선택된 캐릭터 저장
      const character = button.getAttribute("data-character");
      if (character) {
        localStorage.setItem("selectedCharacter", character);
        console.log(`선택된 캐릭터: ${character}`);
      }
    });
  });

  // 저장된 캐릭터 선택 복원
  restoreSelectedCharacter();
}

/**
 * 저장된 캐릭터 선택 복원
 */
function restoreSelectedCharacter(): void {
  const savedCharacter = localStorage.getItem("selectedCharacter");
  if (savedCharacter) {
    const savedButton = document.querySelector(`[data-character="${savedCharacter}"]`);
    if (savedButton) {
      savedButton.classList.add("selected");
    }
  }
}

/**
 * 팝업 모듈 초기화
 */
function initPopupModule(): void {
  setupSettingPopup();
  setupPopupClose();
  setupCharacterSelection();
}

export { initPopupModule, setupSettingPopup, setupPopupClose, setupCharacterSelection, restoreSelectedCharacter };
