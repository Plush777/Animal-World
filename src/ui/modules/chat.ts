//ui.ts 호출 순서 주의
function initChatModule(): void {
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

export { initChatModule };

// 전역에서 접근 가능하도록 노출
if (typeof window !== "undefined") {
  (window as any).initChatModule = initChatModule;
}
