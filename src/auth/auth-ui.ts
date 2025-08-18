import { type User } from "@supabase/supabase-js";
import { authHtml } from "../data/authHtml";
import { handleGoogleLogin, handleKakaoLogin, handleLogout } from "./auth-core";

// DOM 요소들 가져오기
const loginBtn = document.getElementById("google-login") as HTMLButtonElement | null;
const loginKakaoBtn = document.getElementById("kakao-login") as HTMLButtonElement | null;
const logoutBtn = document.getElementById("logout") as HTMLButtonElement | null;
const userInfoDiv = document.getElementById("user-info") as HTMLDivElement | null;

// 로그인 이벤트 리스너 재연결 함수
export function reconnectLoginEventListeners(): void {
  const dynamicGoogleLoginBtn = document.getElementById("google-login") as HTMLButtonElement | null;
  const dynamicKakaoLoginBtn = document.getElementById("kakao-login") as HTMLButtonElement | null;

  dynamicGoogleLoginBtn?.addEventListener("click", handleGoogleLogin);
  dynamicKakaoLoginBtn?.addEventListener("click", handleKakaoLogin);
}

// 로그아웃 이벤트 리스너 재연결 함수
export function reconnectLogoutEventListener(): void {
  const dynamicLogoutBtn = document.getElementById("logout") as HTMLButtonElement | null;
  const dynamicMypageSettingBtn = document.getElementById("mypage-setting-button") as HTMLButtonElement | null;
  const dynamicMyPageSettingCloseBtn = document.querySelector("#mypage-setting .esc-button") as HTMLButtonElement | null;

  dynamicLogoutBtn?.addEventListener("click", handleLogout);

  dynamicMypageSettingBtn?.addEventListener("click", (e) => {
    e.preventDefault(); // 기본 앵커 동작 방지
    // pageNavigate 함수는 전역으로 선언되어 있다고 가정
    (window as any).pageNavigate?.("mypage-setting");
  });

  dynamicMyPageSettingCloseBtn?.addEventListener("click", () => {
    // pageClose 함수는 전역으로 선언되어 있다고 가정
    (window as any).pageClose?.();
  });
}

// 유저 정보 렌더링 함수
export function renderUser(user: User | null): void {
  const userLoginElement = document.getElementById("user-login-element") as HTMLDivElement | null;
  const userLogoutElement = document.getElementById("user-logout-element") as HTMLDivElement | null;
  const userBoxLogoutElement = document.getElementById("userbox-user-logout-element") as HTMLDivElement | null;

  if (!user) {
    // 로그아웃 상태 UI 렌더링
    if (userLoginElement) {
      userLoginElement.style.display = "block";
      userLoginElement.innerHTML = authHtml.login;
    }

    // 로그아웃 상태 요소들 숨김
    if (userLogoutElement) {
      userLogoutElement.style.display = "none";
      userLogoutElement.innerHTML = "";
    }

    if (userBoxLogoutElement) {
      userBoxLogoutElement.style.display = "none";
      userBoxLogoutElement.innerHTML = "";
    }

    // 사용자 정보 초기화
    if (userInfoDiv) {
      userInfoDiv.innerHTML = "";
    }

    reconnectLoginEventListeners();

    // 인트로 애니메이션 시작
    setTimeout(() => {
      if ((window as any).startIntroAnimations) {
        (window as any).startIntroAnimations();
      }
    }, 100);

    return;
  }

  // 로그인 상태 UI 렌더링
  // 로그인 요소 숨김
  if (userLoginElement) {
    userLoginElement.style.display = "none";
    userLoginElement.innerHTML = "";
  }

  // 로그아웃 상태 요소들 표시
  if (userLogoutElement) {
    userLogoutElement.innerHTML = authHtml.logout.buttons;
  }

  if (userBoxLogoutElement) {
    userBoxLogoutElement.innerHTML = authHtml.logout.userBoxDiv;
  }

  // 사용자 정보 표시 (동적으로 생성된 요소를 다시 선택)
  const userMetadata = user.user_metadata;
  const dynamicUserInfoDiv = document.getElementById("user-info") as HTMLDivElement | null;
  if (dynamicUserInfoDiv) {
    dynamicUserInfoDiv.innerHTML = `
      <img width="48" height="48" src="${userMetadata.avatar_url}" 
      alt="user-avatar" class="user-avatar">
    `;
  }

  reconnectLogoutEventListener();

  // join-button 이벤트 리스너 설정 (로그인 상태에서만)
  setTimeout(() => {
    if ((window as any).setupJoinButton) {
      (window as any).setupJoinButton();
    }
  }, 100);

  // 인트로 애니메이션 시작
  setTimeout(() => {
    if ((window as any).startIntroAnimations) {
      (window as any).startIntroAnimations();
    }
  }, 100);

  console.log("로그인된 사용자:", user);
}

// 초기 이벤트 리스너 설정
export function initializeAuthUI(): void {
  loginBtn?.addEventListener("click", handleGoogleLogin);
  loginKakaoBtn?.addEventListener("click", handleKakaoLogin);
  logoutBtn?.addEventListener("click", handleLogout);
}
