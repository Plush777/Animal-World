import { commonInitPopup } from "./popup";
import { emojiToggle } from "./appClickEvents";

function chatEnterKey() {
  document.addEventListener("keydown", (e: KeyboardEvent) => {
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

function questionKey() {
  document.addEventListener("keydown", (e: KeyboardEvent) => {
    if (e.key === "Q" || e.key === "q" || e.key === "ㅂ") {
      e.preventDefault();
      commonInitPopup("help", e);
    }

    if (e.key === "F" || e.key === "f" || e.key === "ㅠ") {
      e.preventDefault();
      commonInitPopup("setting", e);
    }

    if (e.key === "U" || e.key === "u" || e.key === "ㅕ") {
      e.preventDefault();
      commonInitPopup("user-list", e);
    }

    if (e.key === "E" || e.key === "e" || e.key === "ㄷ") {
      e.preventDefault();
      emojiToggle();
    }

    if (e.key === "C" || e.key === "c" || e.key === "ㅊ") {
      e.preventDefault();

      const chatWrapper = document.querySelector(".chat-wrapper") as HTMLElement;
      chatWrapper.classList.toggle("active");
    }
  });
}

export function initShortKey() {
  chatEnterKey();
  questionKey();
}
