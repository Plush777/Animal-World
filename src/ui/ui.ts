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

function initAllUIModules(): void {
  initIntroModule();
  initPopupModule();
  initThemeModule();
  initUserBoxModule();
  initializeMyPageEventListeners();

  const app = document.querySelector("#app") as HTMLElement;

  if (app) {
    app.addEventListener("click", (e) => {
      const target = e.target as HTMLElement;
      const closeButton = document.querySelector(".chat-close-button") as HTMLElement;

      e.stopPropagation();

      const chatWrapper = document.querySelector(".chat-wrapper") as HTMLElement;
      if (chatWrapper && target === closeButton) {
        console.log(target);
        chatWrapper.classList.toggle("active");
      }
    });
  }
}

document.addEventListener("DOMContentLoaded", () => {
  initAllUIModules();
});
