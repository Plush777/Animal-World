/**
 * 채팅 UI 관리 모듈
 * 채팅창 열기/닫기 및 관련 기능 처리
 */

/**
 * 채팅창 열기/닫기 토글
 */
function setupChatToggle(): void {
  const chatCloseButton = document.querySelector(".chat-close-button");
  if (chatCloseButton) {
    chatCloseButton.addEventListener("click", () => {
      const chatWrapper = document.querySelector(".chat-wrapper") as HTMLElement;

      if (chatWrapper) {
        chatWrapper.classList.toggle("active");
      }

      const hidden = document.querySelector(".chat-close-button .hidden") as HTMLElement;

      if (hidden) {
        hidden.textContent = chatWrapper?.classList.contains("active") ? "채팅창 닫기" : "채팅창 열기";
      }
    });
  }
}

/**
 * 채팅 모듈 초기화
 */
function initChatModule(): void {
  setupChatToggle();
}

export { initChatModule, setupChatToggle };
