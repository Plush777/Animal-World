function initChatModule(): void {
  const chat = document.getElementById("chat") as HTMLElement;

  if (chat) {
    chat.addEventListener("click", (e) => {
      e.stopPropagation();
      const target = e.target as HTMLElement;

      if (target.classList.contains("chat-close-button")) {
        const chatWrapper = document.querySelector(".chat-wrapper") as HTMLElement;
        if (chatWrapper) {
          chatWrapper.classList.toggle("active");
        }
      }
    });
  }
}

export { initChatModule };

// 전역에서 접근 가능하도록 노출
if (typeof window !== "undefined") {
  (window as any).initChatModule = initChatModule;
}
