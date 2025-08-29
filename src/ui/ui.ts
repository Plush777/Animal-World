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

  // Enter 키를 눌렀을 때 채팅 입력 필드에 포커스
  document.addEventListener("keydown", (e) => {
    // Enter 키가 눌렸고, 현재 포커스된 요소가 입력 필드가 아닐 때
    if (e.key === "Enter" && document.activeElement?.tagName !== "INPUT" && document.activeElement?.tagName !== "TEXTAREA") {
      const chatInput = document.querySelector(".chat-input") as HTMLInputElement;
      const chatWrapper = document.querySelector(".chat-wrapper") as HTMLElement;

      // 채팅창이 활성화되어 있고 입력 필드가 존재할 때만 포커스
      if (chatInput && chatWrapper && chatWrapper.classList.contains("active")) {
        e.preventDefault();
        chatInput.focus();
      }
    }
  });
}

document.addEventListener("DOMContentLoaded", () => {
  initAllUIModules();
});
