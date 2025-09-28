/**
 * 팝업 UI 관리 모듈
 * 설정 팝업, 캐릭터 선택 등 팝업 관련 기능 처리
 */

import { showErrorState } from "./state";

// 전역 변수로 이벤트 리스너 관리
let userListUpdateHandler: ((event: CustomEvent) => void) | null = null;
let isUserListButtonActive = false;
let userListLoadTimeout: NodeJS.Timeout | null = null;

function commonInitPopup(popupType: string, e: Event): void {
  const target = e.target as HTMLElement;

  if (popupType === "setting") {
    const settingButton = document.querySelector(".setting-button") as HTMLElement;

    // 다른 버튼들의 active 상태 제거
    const helpButton = document.querySelector(".help-button") as HTMLElement;
    const userListButton = document.querySelector(".world-user-list-button") as HTMLElement;

    if (helpButton?.classList.contains("active")) {
      helpButton.classList.remove("active");
    }

    if (userListButton?.classList.contains("active")) {
      userListButton.classList.remove("active");
      isUserListButtonActive = false;

      if (userListLoadTimeout) {
        clearTimeout(userListLoadTimeout);
        userListLoadTimeout = null;
      }
    }

    settingButton && settingButton.classList.toggle("active");
  }

  if (popupType === "user-list") {
    const userListButton = document.querySelector(".world-user-list-button") as HTMLElement;
    const isKeyboardEvent = e instanceof KeyboardEvent;

    // 클릭 이벤트인 경우와 키보드 이벤트인 경우를 구분하여 처리
    if (isKeyboardEvent || target.classList.contains("world-user-list-button")) {
      // 다른 버튼들의 active 상태 제거
      const helpButton = document.querySelector(".help-button") as HTMLElement;
      const settingButton = document.querySelector(".setting-button") as HTMLElement;

      if (helpButton?.classList.contains("active")) {
        helpButton.classList.remove("active");
      }

      if (settingButton?.classList.contains("active")) {
        settingButton.classList.remove("active");
      }

      userListButton?.classList.toggle("active");
      isUserListButtonActive = userListButton?.classList.contains("active") || false;

      // 팝업이 열릴 때만 사용자 목록 로드
      if (isUserListButtonActive) {
        loadUsersList();
      } else {
        if (userListLoadTimeout) {
          clearTimeout(userListLoadTimeout);
          userListLoadTimeout = null;
        }
      }
    }

    // 키보드 이벤트가 아닌 경우에만 외부 클릭 감지
    if (!isKeyboardEvent && userListButton?.classList.contains("active") && target !== userListButton && !target.closest(".popup.user-list")) {
      userListButton?.classList.remove("active");
      isUserListButtonActive = false;
      if (userListLoadTimeout) {
        clearTimeout(userListLoadTimeout);
        userListLoadTimeout = null;
      }
    }
  }

  if (popupType === "help") {
    const helpButton = document.querySelector(".help-button") as HTMLElement;
    const isKeyboardEvent = e instanceof KeyboardEvent;

    if (isKeyboardEvent || target.classList.contains("help-button")) {
      // 다른 버튼들의 active 상태 제거
      const settingButton = document.querySelector(".setting-button") as HTMLElement;
      const userListButton = document.querySelector(".world-user-list-button") as HTMLElement;

      if (settingButton?.classList.contains("active")) {
        settingButton.classList.remove("active");
      }

      if (userListButton?.classList.contains("active")) {
        userListButton.classList.remove("active");
        isUserListButtonActive = false;

        if (userListLoadTimeout) {
          clearTimeout(userListLoadTimeout);
          userListLoadTimeout = null;
        }
      }

      helpButton && helpButton.classList.toggle("active");
    }

    if (!isKeyboardEvent && helpButton?.classList.contains("active") && target !== helpButton && !target.closest(".popup.help")) {
      helpButton?.classList.remove("active");
    }
  }
}

function setupSettingPopup(): void {
  const app = document.querySelector("#app") as HTMLElement;

  if (app) {
    app.addEventListener("click", (e) => {
      const target = e.target as HTMLElement;

      if (target.classList.contains("setting-button")) {
        commonInitPopup("setting", e);
      }
    });
  }
}

function setupUserListPopup(): void {
  const app = document.querySelector("#app") as HTMLElement;

  if (app) {
    app.addEventListener("click", (e) => {
      const target = e.target as HTMLElement;

      if (target.classList.contains("world-user-list-button")) {
        commonInitPopup("user-list", e);
      }
    });
  }
}

function setupHelpPopup(): void {
  const app = document.querySelector("#app") as HTMLElement;

  if (app) {
    app.addEventListener("click", (e) => {
      const target = e.target as HTMLElement;

      if (target.classList.contains("help-button")) {
        commonInitPopup("help", e);
      }
    });
  }
}

// 실시간 사용자 목록 업데이트 함수
function updateUserListRealTime(): void {
  // 사용자 목록 팝업이 열려있을 때만 업데이트
  if (isUserListButtonActive) {
    loadUsersList();
  }
}

// 사용자 목록 렌더링 함수 (분리) - 가상 스크롤 적용
function renderUserList(users: Array<{ nickname?: string }>): void {
  const chatSystem = (window as any).chatSystem;
  const popupBody = document.querySelector(".popup.user-list .popup-body") as HTMLElement;

  if (!popupBody) {
    console.error("popup-body 요소를 찾을 수 없습니다.");
    return;
  }

  // 기존 내용 초기화
  popupBody.innerHTML = "";

  if (users && users.length > 0) {
    // 사용자 목록 렌더링 (현재 사용자 강조 표시)
    users.forEach((user: { nickname?: string }) => {
      const isCurrentUser = user.nickname === chatSystem?.currentUser;
      const userClass = isCurrentUser ? "world-user-list-item current-user" : "world-user-list-item";

      const userElement = document.createElement("span");
      userElement.className = userClass;
      userElement.textContent = user.nickname || "Unknown User";

      // DOM에 요소 추가
      popupBody.appendChild(userElement);
    });
  } else {
    showErrorState(popupBody, "userList");
  }
}

// 사용자 목록 로드 및 표시
async function loadUsersList(): Promise<void> {
  try {
    const popupBody = document.querySelector(".popup.user-list .popup-body") as HTMLElement;

    if (!popupBody) {
      console.error("popup-body 요소를 찾을 수 없습니다.");
      return;
    }

    // 채팅 시스템에서 현재 방의 사용자 목록 요청
    const chatSystem = (window as any).chatSystem;
    console.log("채팅 시스템 상태:", {
      exists: !!chatSystem,
      hasRequestMethod: !!(chatSystem && chatSystem.requestRoomUsers),
      socketConnected: !!(chatSystem && chatSystem.socket?.connected),
      currentRoom: chatSystem?.currentRoom,
      currentUser: chatSystem?.currentUser,
      socketId: chatSystem?.socket?.id,
      socketState: chatSystem?.socket?.connected ? "connected" : "disconnected",
    });

    if (chatSystem && chatSystem.requestRoomUsers && chatSystem.socket?.connected) {
      // 기존 타임아웃이 있다면 제거
      if (userListLoadTimeout) {
        clearTimeout(userListLoadTimeout);
      }

      // 사용자 목록 요청
      chatSystem.requestRoomUsers();

      // 타임아웃 설정 (5초 후 에러 상태 표시)
      userListLoadTimeout = setTimeout(() => {
        if (popupBody.innerHTML.includes("로딩 중")) {
          showErrorState(popupBody, "userList");
        }
      }, 5000);
    } else {
      // 웹소켓이 연결되지 않은 경우 에러 상태 표시
      showErrorState(popupBody, "userList");
    }
  } catch (error) {
    console.error("사용자 목록 로드 중 오류:", error);
    const popupBody = document.querySelector(".popup.user-list .popup-body") as HTMLElement;
    if (popupBody) {
      showErrorState(popupBody, "userList");
    }
  }
}

// 통합된 사용자 목록 업데이트 이벤트 핸들러
function createUserListUpdateHandler(): (event: CustomEvent) => void {
  return (event: CustomEvent) => {
    const { users } = event.detail;

    // 사용자 목록이 성공적으로 업데이트되면 타임아웃 제거
    if (userListLoadTimeout) {
      clearTimeout(userListLoadTimeout);
      userListLoadTimeout = null;
    }

    renderUserList(users);
  };
}

// 실시간 사용자 목록 업데이트 이벤트 리스너 설정
function setupRealTimeUserListUpdates(): void {
  // 기존 이벤트 리스너 제거
  if (userListUpdateHandler) {
    document.removeEventListener("roomUsersUpdated", userListUpdateHandler as EventListener);
  }

  // 새로운 이벤트 리스너 생성 및 등록
  userListUpdateHandler = createUserListUpdateHandler();
  document.addEventListener("roomUsersUpdated", userListUpdateHandler as EventListener);
  console.log("roomUsersUpdated 이벤트 리스너 등록 완료");

  // 사용자 입장/퇴장 이벤트 리스너
  const chatSystem = (window as any).chatSystem;
  if (chatSystem && chatSystem.socket) {
    // 사용자 입장 시
    chatSystem.socket.on("userJoined", () => {
      setTimeout(() => {
        updateUserListRealTime();
      }, 500); // 약간의 지연을 두어 서버에서 사용자 목록이 업데이트될 시간을 줌
    });

    // 사용자 퇴장 시
    chatSystem.socket.on("userLeft", () => {
      setTimeout(() => {
        updateUserListRealTime();
      }, 500);
    });
  }
}

/**
 * 팝업 닫기 버튼 설정
 */
function setupPopupClose(): void {
  const app = document.querySelector("#app") as HTMLElement;

  if (app) {
    app.addEventListener("click", (e) => {
      const target = e.target as HTMLElement;

      if (target.classList.contains("popup-close")) {
        // 모든 활성화된 팝업을 닫기
        const activePopups = document.querySelectorAll(".header-right .only-icon-button.active");
        activePopups.forEach((button) => {
          button.classList.remove("active");

          // 팝업 종류에 따라 가상 스크롤 정리
          if (button.classList.contains("user-list")) {
            isUserListButtonActive = false;
            // 사용자 목록 팝업이 닫힐 때 타임아웃 제거
            if (userListLoadTimeout) {
              clearTimeout(userListLoadTimeout);
              userListLoadTimeout = null;
            }
          } else if (button.classList.contains("setting")) {
          }
        });
      }
    });
  }
}

/**
 * 캐릭터 선택 버튼 이벤트 설정
 */
function setupCharacterSelection(): void {
  // 캐릭터 선택 버튼 이벤트
  document.querySelectorAll(".popup-character-tab-button").forEach((button) => {
    button.addEventListener("click", () => {
      // 모든 버튼에서 selected 클래스 제거
      document.querySelectorAll(".popup-character-tab-button").forEach((btn) => {
        btn.classList.remove("selected");
      });

      // 클릭된 버튼에 selected 클래스 추가
      button.classList.add("selected");

      // 선택된 캐릭터 저장
      const character = button.getAttribute("data-character");
      if (character) {
        localStorage.setItem("selectedCharacter", character);
        console.log(`선택된 캐릭터: ${character}`);
      }
    });
  });

  // 저장된 캐릭터 선택 복원
  restoreSelectedCharacter();
}

/**
 * 저장된 캐릭터 선택 복원
 */
function restoreSelectedCharacter(): void {
  const savedCharacter = localStorage.getItem("selectedCharacter");
  if (savedCharacter) {
    const savedButton = document.querySelector(`[data-character="${savedCharacter}"]`);
    if (savedButton) {
      savedButton.classList.add("selected");
    }
  }
}

/**
 * 팝업 모듈 초기화
 */
function initPopupModule(): void {
  setupSettingPopup();
  setupUserListPopup();
  setupHelpPopup();
  setupPopupClose();
  setupCharacterSelection();
  setupRealTimeUserListUpdates();
}

// 전역에서 접근할 수 있도록 window 객체에 등록
(window as any).initPopupModule = initPopupModule;

export { initPopupModule, commonInitPopup, setupPopupClose, setupCharacterSelection, restoreSelectedCharacter };
