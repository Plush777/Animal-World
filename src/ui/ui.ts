window.LoadingUI = window.LoadingUI || {};

/**
 * UI 메인 모듈
 * 모든 UI 관련 모듈들을 통합 관리
 */

// UI 모듈들 import
import { initIntroModule, setupJoinButton, startIntroAnimations } from "./modules/intro.js";
import { initPopupModule } from "./modules/popup.js";
import { initChatModule } from "./modules/chat.js";
import { initThemeModule } from "./modules/theme.js";
import { initUserBoxModule } from "./modules/userbox.js";

// 로딩 UI는 별도로 초기화 (전역 LoadingUI 객체 생성을 위해)
import "./modules/loading.js";

/**
 * 모든 UI 모듈 초기화
 */
function initAllUIModules(): void {
  initIntroModule();
  initPopupModule();
  initChatModule();
  initThemeModule();
  initUserBoxModule();
}

// DOM 로딩 완료 시 초기화
document.addEventListener("DOMContentLoaded", () => {
  initAllUIModules();
  startIntroAnimations();
});
