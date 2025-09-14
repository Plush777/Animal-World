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

/**
 * 스플래시 화면과 인트로 전환 관리
 */
function initSplashToIntroTransition(): void {
  const splashWrapper = document.querySelector(".splash-wrapper") as HTMLElement;
  const introContainer = document.getElementById("intro") as HTMLElement;

  if (!splashWrapper || !introContainer) {
    console.warn("스플래시 또는 인트로 컨테이너를 찾을 수 없습니다.");
    return;
  }

  // 세션 스토리지에서 스플래시 표시 여부 확인
  const hasShownSplash = sessionStorage.getItem("splashShown") === "true";

  if (hasShownSplash) {
    // 이미 스플래시를 보여준 경우 바로 인트로 표시
    splashWrapper.style.display = "none";
    introContainer.innerHTML = introHtml.intro;

    // 새로고침 후에도 이벤트 리스너들이 제대로 설정되도록 초기화
    initializeIntroElements();
  } else {
    // 스플래시를 처음 보여주는 경우
    splashWrapper.style.display = "flex";

    // 2.5초 후 인트로로 전환
    setTimeout(() => {
      // 세션 스토리지에 스플래시 표시 완료 저장
      sessionStorage.setItem("splashShown", "true");

      // 스플래시 숨기기
      splashWrapper.style.display = "none";

      // 인트로 HTML 삽입
      introContainer.innerHTML = introHtml.intro;

      // 인트로 요소들 초기화
      initializeIntroElements();
    }, 2500);
  }
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
