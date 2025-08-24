window.LoadingUI = window.LoadingUI || {};

/**
 * UI 메인 모듈
 * 모든 UI 관련 모듈들을 통합 관리
 */

import { initIntroModule } from "./modules/intro.js";
import { initPopupModule } from "./modules/popup.js";
import { initChatModule } from "./modules/chat.js";
import { initThemeModule } from "./modules/theme.js";
import { initUserBoxModule } from "./modules/userbox.js";
import { initializeMyPageEventListeners } from "./modules/myPage.js";

import "./modules/loading.ts";

function initAllUIModules(): void {
  initIntroModule();
  initPopupModule();
  initThemeModule();
  initUserBoxModule();
  initializeMyPageEventListeners();
  initChatModule();
}

document.addEventListener("DOMContentLoaded", () => {
  initAllUIModules();
});
