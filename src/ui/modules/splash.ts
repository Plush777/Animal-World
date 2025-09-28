/**
 * 스플래시 화면 관리 모듈
 * 스플래시 화면 표시 및 인트로 전환 처리
 */

import { introHtml } from "../../data/introHtml.ts";
import { initIntroModule } from "./intro.ts";
import { initUserBoxModule } from "./userbox.ts";
import { initPopupModule } from "./popup.ts";
import { initAudioControls } from "./audioControls.ts";
import { appClickEvents } from "./appClickEvents.ts";
import { appMouseoverEvent } from "./appMouseoverEvent.ts";
import { applyShortKeyDisabledToAllElements } from "./functions.ts";
import { handleShortKeySettingChange, handleShortKeyState } from "./shortKeyToggle.ts";
import { getCurrentLoggedInUser, renderUser } from "../../auth/auth-ui.ts";
import { initializeIntroAudioManager } from "./introAudio.ts";

function initSplashToIntroTransition(): void {
  const splashWrapper = document.querySelector(".splash-wrapper") as HTMLElement;
  const introContainer = document.getElementById("intro") as HTMLElement;

  if (!splashWrapper || !introContainer) {
    console.warn("스플래시 또는 인트로 컨테이너를 찾을 수 없습니다.");
    return;
  }

  const pressStartButton = document.querySelector(".press-start-button") as HTMLButtonElement;

  pressStartButton.addEventListener("click", () => {
    // BGM 초기화 및 재생 (사용자 상호작용 직후)
    const audioManager = initializeIntroAudioManager();
    audioManager.startBGMAfterUserInteraction();

    splashWrapper.style.opacity = "0";
    splashWrapper.style.visibility = "hidden";

    setTimeout(() => {
      splashWrapper.style.display = "none";
    }, 1000);

    introContainer.innerHTML = introHtml.intro;
    initializeIntroElements();
  });

  document.addEventListener("keydown", () => {
    if (splashWrapper.style.opacity === "1") {
      // BGM 초기화 및 재생 (사용자 상호작용 직후)
      const audioManager = initializeIntroAudioManager();
      audioManager.startBGMAfterUserInteraction();

      splashWrapper.style.opacity = "0";
      splashWrapper.style.visibility = "hidden";

      setTimeout(() => {
        splashWrapper.style.display = "none";
      }, 1000);

      introContainer.innerHTML = introHtml.intro;
      initializeIntroElements();
    }
  });
}

/**
 * 인트로 요소들 초기화 및 이벤트 리스너 재설정
 */
function initializeIntroElements(): void {
  setTimeout(() => {
    initIntroModule();

    initUserBoxModule();

    initPopupModule();

    initAudioControls();

    appClickEvents();

    appMouseoverEvent();

    applyShortKeyDisabledToAllElements();

    setTimeout(() => {
      handleShortKeySettingChange();

      // 새로고침 후 단축키 상태 강제 동기화
      const bodyAttribute = document.body.getAttribute("data-short-key-disable");
      const isDisabled = bodyAttribute === "true";
      handleShortKeyState(isDisabled, "스플래시 후 단축키 상태 동기화");
    }, 50);

    setTimeout(() => {
      const currentUser = getCurrentLoggedInUser();
      if (currentUser !== null) {
        // 로그인된 사용자가 있으면 UI 재렌더링
        renderUser(currentUser);
      }
    }, 150);
  }, 100);
}

/**
 * 스플래시 모듈 초기화
 */
function initSplashModule(): void {
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", () => {
      initSplashToIntroTransition();
    });
  } else {
    initSplashToIntroTransition();
  }
}

export { initSplashModule, initSplashToIntroTransition, initializeIntroElements };
