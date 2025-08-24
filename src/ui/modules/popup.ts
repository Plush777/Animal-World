/**
 * 팝업 UI 관리 모듈
 * 설정 팝업, 캐릭터 선택 등 팝업 관련 기능 처리
 */

import { showLoadingState, showErrorState } from "./state";
import { PopupVirtualScroll } from "../virtualScroll";

// 전역 변수로 이벤트 리스너 관리
let userListUpdateHandler: ((event: CustomEvent) => void) | null = null;
let isUserListPopupActive = false;
let userListLoadTimeout: NodeJS.Timeout | null = null;

// 가상 스크롤 인스턴스들
let userListVirtualScroll: PopupVirtualScroll | null = null;
let settingVirtualScroll: PopupVirtualScroll | null = null;

function setupSettingPopup(): void {
  const app = document.querySelector("#app") as HTMLElement;

  if (app) {
    app.addEventListener("click", (e) => {
      const target = e.target as HTMLElement;

      if (target.classList.contains("setting-button")) {
        const settingPopup = document.querySelector(".popup.setting") as HTMLElement;
        settingPopup.classList.toggle("active");

        // 팝업이 열릴 때 가상 스크롤 초기화
        if (settingPopup.classList.contains("active")) {
          initializeSettingVirtualScroll();
          // 스크롤 위치 초기화
          if (settingVirtualScroll) {
            settingVirtualScroll.resetScroll();
          }
        } else {
          // 팝업이 닫힐 때 가상 스크롤 정리
          if (settingVirtualScroll) {
            settingVirtualScroll.destroy();
            settingVirtualScroll = null;
          }
        }
      }

      const settingPopup = document.querySelector(".popup.setting") as HTMLElement;
      const settingButton = document.querySelector(".setting-button") as HTMLElement;

      if (settingPopup?.classList.contains("active") && target !== settingButton && !target.closest(".popup.setting")) {
        settingPopup?.classList.remove("active");
        // 팝업이 닫힐 때 가상 스크롤 정리
        if (settingVirtualScroll) {
          settingVirtualScroll.destroy();
          settingVirtualScroll = null;
        }
      }
    });
  }
}

function setupUserListPopup(): void {
  const app = document.querySelector("#app") as HTMLElement;

  if (app) {
    app.addEventListener("click", (e) => {
      const target = e.target as HTMLElement;
      const userListPopup = document.querySelector(".popup.user-list") as HTMLElement;

      if (target.classList.contains("world-user-list-button")) {
        userListPopup?.classList.toggle("active");
        isUserListPopupActive = userListPopup?.classList.contains("active") || false;

        // 팝업이 열릴 때만 사용자 목록 로드 및 가상 스크롤 초기화
        if (isUserListPopupActive) {
          initializeUserListVirtualScroll();
          loadUsersList();
        } else {
          // 팝업이 닫힐 때 가상 스크롤 정리 및 타임아웃 제거
          if (userListVirtualScroll) {
            userListVirtualScroll.destroy();
            userListVirtualScroll = null;
          }
          if (userListLoadTimeout) {
            clearTimeout(userListLoadTimeout);
            userListLoadTimeout = null;
          }
        }
      }

      const userListButton = document.querySelector(".world-user-list-button") as HTMLElement;

      if (userListPopup?.classList.contains("active") && target !== userListButton && !target.closest(".popup.user-list")) {
        userListPopup?.classList.remove("active");
        isUserListPopupActive = false;
        // 팝업이 닫힐 때 가상 스크롤 정리 및 타임아웃 제거
        if (userListVirtualScroll) {
          userListVirtualScroll.destroy();
          userListVirtualScroll = null;
        }
        if (userListLoadTimeout) {
          clearTimeout(userListLoadTimeout);
          userListLoadTimeout = null;
        }
      }
    });
  }
}

// 유저 목록 팝업 가상 스크롤 초기화
function initializeUserListVirtualScroll(): void {
  const popupBody = document.querySelector(".popup.user-list .popup-body") as HTMLElement;

  if (!popupBody) {
    console.error("유저 목록 팝업 요소를 찾을 수 없습니다.");
    return;
  }

  // 기존 가상 스크롤이 있다면 정리
  if (userListVirtualScroll) {
    userListVirtualScroll.destroy();
  }

  // 팝업 바디 스타일 설정 (chat div와 동일한 방식)
  popupBody.style.position = "relative";
  popupBody.style.overflow = "hidden";
  popupBody.style.height = "300px"; // 고정 높이 설정

  // 팝업 바디에 가상 스크롤 적용
  userListVirtualScroll = new PopupVirtualScroll(popupBody, {
    itemHeight: 30, // 각 사용자 아이템 간격 (top 값 간격과 동일)
    scrollbarWidth: 6,
    scrollbarColor: "#666",
    scrollbarTrackColor: "rgba(0,0,0,0.1)",
    scrollbarThumbColor: "#999",
    scrollbarRadius: 3,
    enableTouchScroll: true,
    touchSensitivity: 1.2,
    maxScrollSpeed: 30,
    scrollMargin: 4,
    containerClass: "user-list-virtual-scroll-container",
    scrollbarClass: "user-list-virtual-scrollbar",
    scrollbarThumbClass: "user-list-virtual-scrollbar-thumb",
  });
}

// 설정 팝업 가상 스크롤 초기화
function initializeSettingVirtualScroll(): void {
  const popupBody = document.querySelector(".popup.setting .popup-body") as HTMLElement;

  if (!popupBody) {
    console.error("설정 팝업 요소를 찾을 수 없습니다.");
    return;
  }

  // 기존 가상 스크롤이 있다면 정리
  if (settingVirtualScroll) {
    settingVirtualScroll.destroy();
  }

  // 팝업 바디 스타일 설정 (chat div와 동일한 방식)
  popupBody.style.position = "relative";
  popupBody.style.overflow = "hidden";
  popupBody.style.height = "300px"; // 설정팝업 높이 조정

  // 팝업 바디에 가상 스크롤 적용
  settingVirtualScroll = new PopupVirtualScroll(popupBody, {
    itemHeight: 30, // 각 섹션 간격 (top 값 간격과 동일)
    scrollbarWidth: 6,
    scrollbarColor: "#666",
    scrollbarTrackColor: "rgba(0,0,0,0.1)",
    scrollbarThumbColor: "#999",
    scrollbarRadius: 3,
    enableTouchScroll: true,
    touchSensitivity: 1.2,
    maxScrollSpeed: 30,
    scrollMargin: 4,
    containerClass: "setting-virtual-scroll-container",
    scrollbarClass: "setting-virtual-scrollbar",
    scrollbarThumbClass: "setting-virtual-scrollbar-thumb",
  });

  // 설정 아이템들을 가상 스크롤에 추가
  addSettingItems();
}

// 설정 아이템들을 가상 스크롤에 추가
function addSettingItems(): void {
  if (!settingVirtualScroll) return;

  // 기존 아이템들 제거
  settingVirtualScroll.clearItems();

  // 사운드 설정 섹션 HTML (chat div처럼 각 섹션을 개별적으로 처리)
  const soundSectionHTML = `
    <section class="popup-section">
      <h3 class="popup-section-title">Sound setting</h3>
      <div class="popup-section-item-box">
        <div class="popup-section-item">
          <strong class="popup-section-item-title">배경음 음량</strong>
          <input type="range" class="range-bar" />
        </div>
        <div class="popup-section-item">
          <strong class="popup-section-item-title">효과음 음량</strong>
          <input type="range" class="range-bar" />
        </div>
      </div>
    </section>
    <section class="popup-section">
      <h3 class="popup-section-title">Sound setting</h3>
      <div class="popup-section-item-box">
        <div class="popup-section-item">
          <strong class="popup-section-item-title">배경음 음량</strong>
          <input type="range" class="range-bar" />
        </div>
        <div class="popup-section-item">
          <strong class="popup-section-item-title">효과음 음량</strong>
          <input type="range" class="range-bar" />
        </div>
      </div>
    </section>
    <section class="popup-section">
      <h3 class="popup-section-title">Sound setting</h3>
      <div class="popup-section-item-box">
        <div class="popup-section-item">
          <strong class="popup-section-item-title">배경음 음량</strong>
          <input type="range" class="range-bar" />
        </div>
        <div class="popup-section-item">
          <strong class="popup-section-item-title">효과음 음량</strong>
          <input type="range" class="range-bar" />
        </div>
      </div>
    </section>
  `;

  // 임시 컨테이너를 생성하여 HTML을 파싱
  const tempContainer = document.createElement("div");
  tempContainer.innerHTML = soundSectionHTML;

  // 각 섹션을 개별적으로 가상 스크롤에 추가 (chat div와 동일한 방식)
  const sections = tempContainer.querySelectorAll(".popup-section");
  sections.forEach((section, index) => {
    const sectionElement = section as HTMLElement;
    if (settingVirtualScroll) {
      settingVirtualScroll.addItem(sectionElement);
      // 각 섹션의 top 값을 개별적으로 설정 (0, 30, 60...)
      sectionElement.style.top = `${index * 30}px`;
    }
  });

  // 가상스크롤의 totalHeight를 수동으로 조정 (실제 섹션 높이 + 간격 고려)
  if (settingVirtualScroll) {
    const actualSectionHeight = 105; // 실제 섹션 높이 (예상값)
    const sectionGap = 30; // 섹션 간 간격
    const totalSections = sections.length;
    const totalHeight = actualSectionHeight * totalSections + sectionGap * (totalSections - 1);

    // 가상스크롤의 totalHeight를 수동으로 설정
    (settingVirtualScroll as any).totalHeight = totalHeight;

    // 스크롤 컨테이너 높이 업데이트
    const scrollContainer = document.querySelector(".setting-virtual-scroll-container") as HTMLElement;
    if (scrollContainer) {
      scrollContainer.style.height = `${totalHeight + 4}px`; // scrollMargin 추가
    }

    // 스크롤바 업데이트
    (settingVirtualScroll as any).updateScrollbarThumb();
  }
}

// 실시간 사용자 목록 업데이트 함수
function updateUserListRealTime(): void {
  // 사용자 목록 팝업이 열려있을 때만 업데이트
  if (isUserListPopupActive) {
    loadUsersList();
  }
}

// 사용자 목록 렌더링 함수 (분리) - 가상 스크롤 적용
function renderUserList(users: Array<{ nickname?: string }>): void {
  const chatSystem = (window as any).chatSystem;

  // 가상 스크롤이 있다면 기존 아이템들 제거
  if (userListVirtualScroll) {
    userListVirtualScroll.clearItems();
  }

  if (users && users.length > 0) {
    // 사용자 목록 렌더링 (현재 사용자 강조 표시)
    users.forEach((user: { nickname?: string }, index: number) => {
      const isCurrentUser = user.nickname === chatSystem?.currentUser;
      const userClass = isCurrentUser ? "world-user-list-item current-user" : "world-user-list-item";

      const userElement = document.createElement("div");
      userElement.className = userClass;
      userElement.textContent = user.nickname || "Unknown User";

      // 가상 스크롤에 아이템 추가
      if (userListVirtualScroll) {
        userListVirtualScroll.addItem(userElement);
        // 각 사용자 아이템의 top 값을 개별적으로 설정 (0, 30, 60...)
        userElement.style.top = `${index * 30}px`;
      }
    });

    // 가상스크롤의 totalHeight를 수동으로 조정 (실제 사용자 아이템 높이 + 간격 고려)
    if (userListVirtualScroll) {
      const actualUserItemHeight = 300; // 실제 사용자 아이템 높이
      const itemGap = 30; // 아이템 간 간격
      const totalUsers = users.length;
      const totalHeight = actualUserItemHeight * totalUsers + itemGap * (totalUsers - 1);

      // 가상스크롤의 totalHeight를 수동으로 설정
      (userListVirtualScroll as any).totalHeight = totalHeight;

      // 스크롤 컨테이너 높이 업데이트
      const scrollContainer = document.querySelector(".user-list-virtual-scroll-container") as HTMLElement;
      if (scrollContainer) {
        scrollContainer.style.height = `${totalHeight + 4}px`; // scrollMargin 추가
      }

      // 스크롤바 업데이트
      (userListVirtualScroll as any).updateScrollbarThumb();
    }
  } else {
    const noUserElement = document.createElement("div");
    noUserElement.className = "world-user-list-item";
    noUserElement.textContent = "접속한 사용자가 없습니다.";

    if (userListVirtualScroll) {
      userListVirtualScroll.addItem(noUserElement);
      // "접속한 사용자가 없습니다" 메시지의 top 값 설정
      noUserElement.style.top = "0px";

      // 가상스크롤의 totalHeight를 수동으로 조정
      const actualUserItemHeight = 32; // 실제 사용자 아이템 높이
      const totalHeight = actualUserItemHeight;

      // 가상스크롤의 totalHeight를 수동으로 설정
      (userListVirtualScroll as any).totalHeight = totalHeight;

      // 스크롤 컨테이너 높이 업데이트
      const scrollContainer = document.querySelector(".user-list-virtual-scroll-container") as HTMLElement;
      if (scrollContainer) {
        scrollContainer.style.height = `${totalHeight + 4}px`; // scrollMargin 추가
      }

      // 스크롤바 업데이트
      (userListVirtualScroll as any).updateScrollbarThumb();
    }
  }
}

// 사용자 목록 로드 및 표시
async function loadUsersList(): Promise<void> {
  try {
    const popupBody = document.querySelector(".popup.user-list .popup-body") as HTMLElement;

    if (!popupBody) {
      console.error("world-user-list-box 요소를 찾을 수 없습니다.");
      return;
    }

    // showLoadingState(popupBody, "general");

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
        const activePopups = document.querySelectorAll(".popup.active");
        activePopups.forEach((popup) => {
          popup.classList.remove("active");

          // 팝업 종류에 따라 가상 스크롤 정리
          if (popup.classList.contains("user-list")) {
            if (userListVirtualScroll) {
              userListVirtualScroll.destroy();
              userListVirtualScroll = null;
            }
            isUserListPopupActive = false;
            // 사용자 목록 팝업이 닫힐 때 타임아웃 제거
            if (userListLoadTimeout) {
              clearTimeout(userListLoadTimeout);
              userListLoadTimeout = null;
            }
          } else if (popup.classList.contains("setting")) {
            if (settingVirtualScroll) {
              settingVirtualScroll.destroy();
              settingVirtualScroll = null;
            }
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
  setupPopupClose();
  setupCharacterSelection();
  setupRealTimeUserListUpdates();
}

export { initPopupModule, setupSettingPopup, setupPopupClose, setupCharacterSelection, restoreSelectedCharacter };
