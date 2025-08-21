/**
 * 채팅 UI 관리 모듈
 * 채팅창 열기/닫기 및 관련 기능 처리
 */

/**
 * 채팅창 열기/닫기 토글
 */
function setupChatToggle(): void {
  // document에 이벤트 위임으로 설정하여 동적으로 생성되는 요소에도 동작하도록 함
  document.addEventListener("click", (e) => {
    const target = e.target as HTMLElement;
    const chatCloseButton = target.closest(".chat-close-button");

    if (chatCloseButton) {
      e.preventDefault();
      e.stopPropagation();

      const chatWrapper = document.querySelector(".chat-wrapper") as HTMLElement;
      const hidden = chatCloseButton.querySelector(".hidden") as HTMLElement;

      if (chatWrapper) {
        const isActive = chatWrapper.classList.contains("active");

        if (isActive) {
          chatWrapper.classList.remove("active");
        } else {
          chatWrapper.classList.add("active");
        }

        // 텍스트 업데이트
        if (hidden) {
          hidden.textContent = chatWrapper.classList.contains("active") ? "채팅창 닫기" : "채팅창 열기";
        }

        console.log("채팅창 토글:", chatWrapper.classList.contains("active") ? "열림" : "닫힘");
      }
    }
  });
}

/**
 * 채팅 시스템 초기화 확인
 */
function isChatSystemInitialized(): boolean {
  return document.querySelector(".chat-wrapper") !== null;
}

/**
 * 채팅 모듈 초기화
 */
function initChatModule(): void {
  // 채팅 시스템이 이미 초기화되었는지 확인
  if (!isChatSystemInitialized()) {
    console.log("채팅 시스템이 아직 초기화되지 않았습니다.");
    return;
  }

  setupChatToggle();
  console.log("채팅 모듈 초기화 완료");
}

export { initChatModule, setupChatToggle, isChatSystemInitialized };

// 전역에서 접근 가능하도록 노출
if (typeof window !== "undefined") {
  (window as any).initChatModule = initChatModule;
}
