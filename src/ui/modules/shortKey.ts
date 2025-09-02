export function chatEnterKey() {
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

/**
 * 단축키 비활성화 상태를 로컬 스토리지에 저장하는 함수
 * @param isDisabled 단축키 비활성화 여부
 */
export function saveShortKeyDisabledState(isDisabled: boolean): void {
  localStorage.setItem("shortKeyDisabled", JSON.stringify(isDisabled));
}

/**
 * 로컬 스토리지에서 단축키 비활성화 상태를 불러오는 함수
 * @returns 단축키 비활성화 여부
 */
export function loadShortKeyDisabledState(): boolean {
  const savedState = localStorage.getItem("shortKeyDisabled");
  return savedState ? JSON.parse(savedState) : false;
}

/**
 * 단축키 비활성화 상태를 토글하는 함수
 * @param isDisabled 단축키 비활성화 여부
 */
export function toggleShortKeyDisabled(isDisabled: boolean): void {
  // body 태그에 data-short-key 속성 설정
  if (isDisabled) {
    document.body.setAttribute("data-short-key", "true");
  } else {
    document.body.setAttribute("data-short-key", "false");
  }
}
