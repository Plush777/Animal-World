import { commonInitPopup } from "./popup";
import { emojiToggle } from "./appClickEvents";
import { toggleMapExplore, loadMapExploreState, syncMapExploreCheckboxWithLocalStorage, showMapExploreToast } from "./functions";

/**
 * J키를 눌렀을 때 방에 참여하는 함수
 */
function handleJoinRoom(): void {
  console.log("J키 눌림 - 방 참여 시도");

  // 현재 인트로 화면인지 확인
  const introWrapper = document.querySelector(".intro-wrapper") as HTMLElement;
  const isIntroVisible = introWrapper && introWrapper.style.display !== "none" && introWrapper.style.opacity !== "0";

  if (isIntroVisible) {
    // 인트로 화면에서 J키를 누른 경우: 참여 버튼 클릭과 동일한 동작
    console.log("인트로 화면에서 J키 눌림 - 참여 버튼 클릭 실행");
    const joinButton = document.getElementById("join-button") as HTMLButtonElement;
    if (joinButton && !joinButton.disabled) {
      joinButton.click();
    } else {
      console.log("참여 버튼을 찾을 수 없거나 비활성화 상태입니다.");
    }
  } else {
    // 월드 화면에서 J키를 누른 경우: 자동 방 배정 요청
    console.log("월드 화면에서 J키 눌림 - 자동 방 배정 요청");

    // 채팅 시스템이 초기화되어 있는지 확인
    const chatSystem = (window as any).chatSystem;
    if (chatSystem && chatSystem.socket && chatSystem.socket.connected) {
      // 자동 방 배정 요청
      chatSystem.socket.emit("requestAutoRoomAssignment");
      console.log("자동 방 배정 요청 전송됨");
    } else {
      console.log("채팅 시스템이 연결되지 않음");
      // 채팅 시스템 재초기화 시도
      if ((window as any).initializeChatSystem) {
        const currentUser = (window as any).getCurrentLoggedInUser?.() || { email: "게스트" };
        const userName = currentUser?.user_metadata?.name || currentUser?.email || "게스트";
        (window as any).initializeChatSystem(userName);
      }
    }
  }
}

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

    if (e.key === "J" || e.key === "j" || e.key === "ㅓ") {
      e.preventDefault();
      handleJoinRoom();
    }
  });
}

export function initShortKey() {
  chatEnterKey();
  questionKey();
}
