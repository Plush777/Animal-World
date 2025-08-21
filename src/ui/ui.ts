window.LoadingUI = window.LoadingUI || {};

/**
 * UI 메인 모듈
 * 모든 UI 관련 모듈들을 통합 관리
 */

import { initIntroModule } from "./modules/intro.js";
import { initPopupModule } from "./modules/popup.js";
import { initChatModule, isChatSystemInitialized } from "./modules/chat.js";
import { initThemeModule } from "./modules/theme.js";
import { initUserBoxModule } from "./modules/userbox.js";
import { initializeMyPageEventListeners } from "./modules/myPage.js";

// 로딩 UI는 별도로 초기화 (전역 LoadingUI 객체 생성을 위해)
import "./modules/loading.ts";

function initAllUIModules(): void {
  initIntroModule();
  initPopupModule();
  initThemeModule();
  initUserBoxModule();
  initializeMyPageEventListeners();

  // 채팅 모듈은 채팅 시스템이 초기화된 후에 초기화
  if (isChatSystemInitialized()) {
    initChatModule();
  }
}

document.addEventListener("DOMContentLoaded", () => {
  initAllUIModules();
});

// 채팅 시스템 초기화 완료 이벤트 리스너
document.addEventListener("canvasLoadingComplete", () => {
  // 채팅 시스템이 초기화된 후 채팅 모듈 초기화
  setTimeout(() => {
    if (isChatSystemInitialized()) {
      initChatModule();
    }
  }, 1000); // 1초 후 확인
});
