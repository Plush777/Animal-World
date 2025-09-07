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

import { initShortKey } from "./modules/shortKey.ts";
import { canvasLoadingComplete } from "./modules/canvasLoadingComplete.ts";
import { appClickEvents } from "./modules/appClickEvents.ts";
import { appMouseoverEvent } from "./modules/appMouseoverEvent.ts";
import { appTransition } from "./modules/appTransition.ts";
import { applyShortKeyDisabledToAllElements } from "./modules/functions.ts";

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
  initShortKey();
}

document.addEventListener("DOMContentLoaded", () => {
  initAllUIModules();
});
