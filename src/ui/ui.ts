window.LoadingUI = window.LoadingUI || {};

/**
 * UI 메인 모듈
 * 모든 UI 관련 모듈들을 통합 관리
 */

import { initIntroModule } from "./modules/intro.ts";
import { initPopupModule } from "./modules/popup.ts";
import { initThemeModule } from "./modules/theme.ts";
import { initUserBoxModule } from "./modules/userbox.ts";
import { initializeMyPageEventListeners } from "./modules/myPage.ts";
import { initAudioControls } from "./modules/audioControls.ts";
import { initSplashModule } from "./modules/splash.ts";

import "./modules/loading.ts";
import "./modules/characterSetting.ts";
import "./modules/joinButton.ts";

import { canvasLoadingComplete } from "./modules/canvasLoadingComplete.ts";
import { appClickEvents } from "./modules/appClickEvents.ts";
import { appMouseoverEvent } from "./modules/appMouseoverEvent.ts";
import { appTransition } from "./modules/appTransition.ts";
import { applyShortKeyDisabledToAllElements } from "./modules/functions.ts";
import { handleShortKeySettingChange, handleShortKeyState, shortKeyEventListeners } from "./modules/shortKeyToggle.ts";

/**
 * 모든 UI 모듈 초기화
 */
function initAllUIModules(): void {
  initSplashModule();
  appTransition();
  initIntroModule();
  initPopupModule();
  initThemeModule();
  initUserBoxModule();
  initializeMyPageEventListeners();
  initAudioControls();
  canvasLoadingComplete();
  appClickEvents();
  appMouseoverEvent();
  applyShortKeyDisabledToAllElements();
}

// DOM 상태별 처리
if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", () => {
    initAllUIModules();

    // 약간의 지연 후 단축키 설정 처리 (다른 초기화가 완료된 후)
    setTimeout(() => {
      handleShortKeySettingChange();
    }, 50);
  });
} else {
  initAllUIModules();
  handleShortKeySettingChange();
}

// 페이지 완전 로드 후 최종 확인
window.addEventListener("load", () => {
  setTimeout(() => {
    const finalState = document.body.getAttribute("data-short-key-disable") === "true";

    // 상태와 실제 리스너 개수가 맞지 않으면 강제 동기화
    const shouldHaveListeners = !finalState;
    const hasListeners = shortKeyEventListeners.length > 0;

    if (shouldHaveListeners !== hasListeners) {
      handleShortKeyState(finalState, "페이지 로드 완료 후 최종 확인");
    }
  }, 100);
});
