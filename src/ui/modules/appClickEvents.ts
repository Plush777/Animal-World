import { sceneHtml } from "../../data/sceneHtml";

export function emojiToggle() {
  const emojiWrapper = document.querySelector(".chat-emoji-wrapper") as HTMLElement;
  const emojiButton = document.querySelector(".chat-emoji-button") as HTMLElement;

  emojiWrapper.classList.toggle("active");
  emojiButton.setAttribute("aria-expanded", emojiWrapper.classList.contains("active") ? "true" : "false");
}

export function appClickEvents() {
  const app = document.querySelector("#app") as HTMLElement;

  if (app) {
    app.addEventListener("click", (e) => {
      const target = e.target as HTMLElement;
      const closeButton = document.querySelector(".chat-close-button") as HTMLElement;
      const emojiButton = document.querySelector(".chat-emoji-button") as HTMLElement;
      const chatOpenButton = document.querySelector(".chat-open-button") as HTMLElement;

      e.stopPropagation();

      const chatWrapper = document.querySelector(".chat-wrapper") as HTMLElement;
      if (chatWrapper && target === closeButton) {
        console.log(target);
        chatWrapper.classList.remove("active");
      }

      if (chatWrapper && target === chatOpenButton) {
        console.log(target);
        chatWrapper.classList.add("active");
      }

      const emojiWrapper = document.querySelector(".chat-emoji-wrapper") as HTMLElement;

      if (emojiWrapper && target === emojiButton) {
        emojiToggle();
      }

      const mapExploreCheckbox = document.getElementById("map-explore") as HTMLInputElement;
      const toast = document.getElementById("toast") as HTMLElement;

      //mapExploreCheckbox 체크박스가 존재하고 체크되어 있을 때
      if (mapExploreCheckbox?.checked && target === mapExploreCheckbox) {
        toast.innerHTML = sceneHtml.toast.mapExploreOn;

        // 이전 타이머가 있다면 정리
        if (window.toastTimers) {
          window.toastTimers.forEach((timerId: number | NodeJS.Timeout) => clearTimeout(timerId as any));
        }

        // 새로운 타이머 ID들을 저장할 배열
        window.toastTimers = [];

        const timer1 = setTimeout(() => {
          const toastWrapper = document.querySelector(".toast-wrapper") as HTMLElement;
          if (toastWrapper) {
            toastWrapper.classList.add("active");
          }
        }, 1);

        window.toastTimers.push(timer1);
      }

      const toastCloseButton = document.querySelector(".toast-close-button") as HTMLElement;

      if (toast && target === toastCloseButton) {
        toast.classList.remove("active");
        toast.innerHTML = "";
        sessionStorage.setItem("toast-mapExplore-close", "true");
      }
    });
  }
}
