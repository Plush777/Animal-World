import { type User } from "@supabase/supabase-js";
import { authHtml } from "../data/authHtml";
import { handleGoogleLogin, handleKakaoLogin, handleLogout, handleGuestLogin, handleGuestLogout, isGuestUser } from "./auth-core";
import { renderMyPageProfileImage, reconnectMyPageEventListeners, loadMyPageFormData } from "../ui/modules/myPage";
import { closeSidebar } from "../utils/sidebar";

const userInfoDiv = document.getElementById("user-info") as HTMLDivElement | null;

// 현재 로그인된 사용자 정보 저장
let currentLoggedInUser: User | null = null;

// 현재 로그인된 사용자 정보 가져오기
export function getCurrentLoggedInUser(): User | null {
  return currentLoggedInUser;
}

// 로그인 이벤트 리스너 재연결 함수
export function reconnectLoginEventListeners(): void {
  const dynamicGoogleLoginBtn = document.getElementById("google-login");
  const dynamicKakaoLoginBtn = document.getElementById("kakao-login") as HTMLButtonElement | null;
  const dynamicGuestLoginBtn = document.getElementById("guest-login") as HTMLButtonElement | null;

  dynamicGoogleLoginBtn?.addEventListener("click", handleGoogleLogin);
  dynamicKakaoLoginBtn?.addEventListener("click", handleKakaoLogin);
  dynamicGuestLoginBtn?.addEventListener("click", async () => {
    const isConfirmed = confirm(
      "비회원 계정은 제한된 기능만 이용할 수 있으며, 로그아웃 시 데이터가 자동으로 삭제됩니다.\n\n안전한 이용을 위하여 소셜 계정 연동을 권장드립니다.\n\n그래도 비회원으로 이용하시겠습니까?"
    );

    if (isConfirmed) {
      await handleGuestLogin();
    }
  });
}

// 로그아웃 이벤트 리스너 재연결 함수
export function reconnectLogoutEventListener(): void {
  const dynamicLogoutBtn = document.getElementById("logout") as HTMLButtonElement | null;
  const dynamicMypageSettingBtn = document.getElementById("mypage-setting-button") as HTMLButtonElement | null;
  const dynamicMyPageSettingCloseBtn = document.querySelector("#mypage-setting .esc-button") as HTMLButtonElement | null;

  dynamicLogoutBtn?.addEventListener("click", async () => {
    const currentUser = getCurrentLoggedInUser();
    if (currentUser && isGuestUser(currentUser)) {
      await handleGuestLogout();
    } else {
      await handleLogout();
    }
  });

  dynamicMypageSettingBtn?.addEventListener("click", (e) => {
    e.preventDefault();

    (window as any).pageNavigate?.("mypage-setting");

    const currentUser = getCurrentLoggedInUser();
    loadMyPageFormData(currentUser);
    reconnectMyPageEventListeners();
  });

  dynamicMyPageSettingCloseBtn?.addEventListener("click", () => {
    (window as any).pageClose?.();
  });
}

// 유저 정보 렌더링 함수
export function renderUser(user: User | null): void {
  // console.log("renderUser 호출됨:", user);

  if (user) {
    // console.log("renderUser - app_metadata:", user.app_metadata);
    // console.log("renderUser - user_metadata:", user.user_metadata);
    // console.log("renderUser - isGuestUser 결과:", isGuestUser(user));
  }

  // 현재 사용자 정보 업데이트
  currentLoggedInUser = user;
  const userLoginElement = document.getElementById("user-login-element") as HTMLDivElement | null;
  const userLogoutElement = document.getElementById("user-logout-element") as HTMLDivElement | null;
  const userBoxLogoutElement = document.getElementById("userbox-user-logout-element") as HTMLDivElement | null;

  // DOM 요소들이 존재하지 않으면 잠시 후 다시 시도
  if (!userLoginElement || !userLogoutElement || !userBoxLogoutElement) {
    console.log("DOM 요소들이 아직 준비되지 않음, 100ms 후 재시도");
    setTimeout(() => {
      renderUser(user);
    }, 100);
    return;
  }

  if (!user) {
    // 로그아웃 상태 UI 렌더링
    if (userLoginElement) {
      userLoginElement.style.display = "block";
      userLoginElement.innerHTML = authHtml.login;
    }

    if (userLogoutElement) {
      userLogoutElement.style.display = "none";
      userLogoutElement.innerHTML = "";
    }

    if (userBoxLogoutElement) {
      userBoxLogoutElement.style.display = "none";
      userBoxLogoutElement.innerHTML = "";
    }

    if (userInfoDiv) {
      userInfoDiv.innerHTML = "";
    }

    reconnectLoginEventListeners();

    return;
  }

  // 로그인 상태 UI 렌더링
  if (userLoginElement) {
    userLoginElement.style.display = "none";
    userLoginElement.innerHTML = "";
  }

  if (userLogoutElement) {
    // // 요소가 이미 존재하는지 확인
    // const existingDescriptionBox = userLogoutElement.querySelector(".intro-description-box");
    // const existingJoinButton = userLogoutElement.querySelector("#join-button");

    // // 요소가 존재하지 않을 때만 렌더링
    // if (!existingDescriptionBox || !existingJoinButton) {

    // }
    userLogoutElement.innerHTML = authHtml.logout.buttons;
    userLogoutElement.style.display = "flex";
  }

  if (userBoxLogoutElement) {
    userBoxLogoutElement.innerHTML = `
      ${authHtml.logout.sidebarButton}
      ${authHtml.logout.userBoxDiv}
    `;
    userBoxLogoutElement.style.display = "flex";

    const main = document.querySelector(".main") as HTMLDivElement;
    const sidebarButton = userBoxLogoutElement.querySelector(".sidebar-hamburger-menu") as HTMLButtonElement;
    const sidebar = document.getElementById("sidebar") as HTMLDivElement;

    sidebarButton?.addEventListener("click", (e) => {
      console.log(e.target);

      main.classList.toggle("sidebar-open");

      if (main?.classList.contains("sidebar-open")) {
        sidebar.innerHTML = authHtml.logout.sidebarContent;

        setTimeout(() => {
          sidebar.classList.add("transition-start");
        }, 1);

        const sidebarCloseButton = sidebar.querySelector(".sidebar-close-button") as HTMLButtonElement;

        sidebarCloseButton?.addEventListener("click", () => {
          closeSidebar();
        });
      }
    });

    const app = document.querySelector("#app") as HTMLElement;

    app?.addEventListener("click", (e) => {
      const sidebarButton = userBoxLogoutElement.querySelector(".sidebar-hamburger-menu") as HTMLButtonElement;
      const sidebar = document.getElementById("sidebar") as HTMLDivElement;

      // 사이드바가 열려있는지 확인
      const isSidebarOpen = main.classList.contains("sidebar-open");

      // 사이드바가 열려있고, 클릭된 요소가 사이드바 버튼이나 사이드바 내부 요소가 아닌 경우
      if (isSidebarOpen && e.target !== sidebarButton && !sidebar.contains(e.target as Node)) {
        closeSidebar();
      }
    });
  }

  // 사용자 정보 표시 - 마이페이지 모듈에서 처리하도록 위임
  // (저장된 프로필 이미지가 있으면 우선 사용)
  renderMyPageProfileImage(user).catch((error) => {
    console.error("프로필 이미지 렌더링 실패:", error);
  });

  reconnectLogoutEventListener();

  // join-button 이벤트 리스너 설정 (로그인 상태에서만)
  if ((window as any).setupJoinButton) {
    (window as any).setupJoinButton();
  }

  // console.log("로그인된 사용자:", user);
}
