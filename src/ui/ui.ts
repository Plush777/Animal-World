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
  appTransition();
  initIntroModule();
  initPopupModule();
  initThemeModule();
  initUserBoxModule();
  initializeMyPageEventListeners();
  canvasLoadingComplete();
  appClickEvents();
  appMouseoverEvent();
  applyShortKeyDisabledToAllElements();

  console.log(`✅ UI 모듈 초기화 완료`);
}

// DOM 상태별 처리
if (document.readyState === "loading") {
  console.log(`⏳ DOM 로딩 중 - DOMContentLoaded 대기`);
  document.addEventListener("DOMContentLoaded", () => {
    console.log(`\n📄 DOMContentLoaded 이벤트 발생`);
    console.log(`DOM 상태: ${document.readyState}`);

    initAllUIModules();

    // 약간의 지연 후 단축키 설정 처리 (다른 초기화가 완료된 후)
    setTimeout(() => {
      handleShortKeySettingChange();
    }, 50);
  });
} else {
  console.log(`\n📄 DOM 이미 준비됨 (상태: ${document.readyState})`);
  initAllUIModules();
  handleShortKeySettingChange();
}

// 페이지 완전 로드 후 최종 확인
window.addEventListener("load", () => {
  console.log(`\n🏁 페이지 완전 로드 완료 - 단축키 상태 최종 확인`);
  setTimeout(() => {
    const finalState = document.body.getAttribute("data-short-key-disable") === "true";
    console.log(`최종 상태 확인: ${finalState ? "비활성화" : "활성화"}`);
    console.log(`현재 리스너 개수: ${shortKeyEventListeners.length}`);

    // 상태와 실제 리스너 개수가 맞지 않으면 강제 동기화
    const shouldHaveListeners = !finalState;
    const hasListeners = shortKeyEventListeners.length > 0;

    if (shouldHaveListeners !== hasListeners) {
      console.log(`🔧 최종 상태 동기화 필요`);
      handleShortKeyState(finalState, "페이지 로드 완료 후 최종 확인");
    }
  }, 100);
});
