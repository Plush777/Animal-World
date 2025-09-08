import { commonInitPopup } from "./popup";
import { emojiToggle } from "./appClickEvents";
import { toggleMapExplore, loadMapExploreState, syncMapExploreCheckboxWithLocalStorage, showMapExploreToast } from "./functions";

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
    const activeElement = document.activeElement;
    const isChatInputActive = activeElement?.tagName === "INPUT" || activeElement?.tagName === "TEXTAREA";

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

    if (e.key === "L" || e.key === "l" || e.key === "ㅣ") {
      e.preventDefault();
      (window as any).leaveRoom();
    }

    if (e.key === "J" || e.key === "j" || e.key === "ㅓ") {
      e.preventDefault();
      (window as any).autoJoinStoredRoom();
    }

    if (e.key === "M" || e.key === "m" || e.key === "ㅡ") {
      e.preventDefault();
      // 현재 맵 둘러보기 상태를 가져와서 토글
      const currentState = loadMapExploreState();
      const newState = !currentState;

      // 로컬 스토리지에 새로운 상태 저장
      localStorage.setItem("mapExplore", JSON.stringify(newState));

      // 맵 둘러보기 토글 실행
      toggleMapExplore(newState);

      // 체크박스 상태 동기화
      syncMapExploreCheckboxWithLocalStorage();

      // 맵 둘러보기 활성화 시 toast 메시지 표시
      showMapExploreToast(newState);

      console.log(`맵 둘러보기 ${newState ? "활성화" : "비활성화"}됨`);
    }

    if (e.key === "H" || e.key === "h" || e.key === "ㅗ") {
      e.preventDefault();

      const worldHeader = document.getElementById("world-header") as HTMLElement;
      worldHeader.classList.toggle("ui-visible");

      const main = document.querySelector(".main") as HTMLElement;
      main.classList.toggle("ui-visible");
    }

    if (isChatInputActive) {
      return;
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
