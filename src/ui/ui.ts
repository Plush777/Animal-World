window.LoadingUI = window.LoadingUI || {};

/**
 * UI 메인 모듈
 * 모든 UI 관련 모듈들을 통합 관리
 */

import { initIntroModule, setupJoinButton, startIntroAnimations } from "./modules/intro.js";
import { initPopupModule } from "./modules/popup.js";
import { initChatModule } from "./modules/chat.js";
import { initThemeModule } from "./modules/theme.js";
import { initUserBoxModule } from "./modules/userbox.js";
import { initializeMyPageEventListeners, ensureMyPageDataLoaded } from "./modules/myPage.js";

// 로딩 UI는 별도로 초기화 (전역 LoadingUI 객체 생성을 위해)
import "./modules/loading.ts";

function initAllUIModules(): void {
  initIntroModule();
  initPopupModule();
  initChatModule();
  initThemeModule();
  initUserBoxModule();
  initializeMyPageEventListeners();

  // 새로고침 시 마이페이지 데이터 로드 확인
  ensureMyPageDataLoaded();
}

document.addEventListener("DOMContentLoaded", () => {
  initAllUIModules();
  startIntroAnimations();
});
