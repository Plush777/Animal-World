import { type User } from "@supabase/supabase-js";
import { authHtml } from "../data/authHtml";
import { handleGoogleLogin, handleKakaoLogin, handleLogout, handleGuestLogin, handleGuestLogout, isGuestUser } from "./auth-core";
import { renderMyPageProfileImage, reconnectMyPageEventListeners, loadMyPageFormData } from "../ui/modules/myPage";

const loginBtn = document.getElementById("google-login") as HTMLButtonElement | null;
const loginKakaoBtn = document.getElementById("kakao-login") as HTMLButtonElement | null;
const logoutBtn = document.getElementById("logout") as HTMLButtonElement | null;
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
    // 비회원 로그인 확인 창 표시
    const isConfirmed = confirm(
      "비회원 계정은 제한된 기능만 이용할 수 있으며, 로그아웃 시 데이터가 자동으로 삭제됩니다.\n\n안전한 이용을 위하여 소셜 계정 연동을 권장드립니다.\n\n그래도 비회원으로 이용하시겠습니까?"
    );

    if (isConfirmed) {
      // 확인을 누른 경우 비회원 로그인 진행
      await handleGuestLogin();
    }
    // 취소를 누른 경우 아무것도 하지 않음
  });
}

// 로그아웃 이벤트 리스너 재연결 함수
export function reconnectLogoutEventListener(): void {
  const dynamicLogoutBtn = document.getElementById("logout") as HTMLButtonElement | null;
  const dynamicMypageSettingBtn = document.getElementById("mypage-setting-button") as HTMLButtonElement | null;
  const dynamicMyPageSettingCloseBtn = document.querySelector("#mypage-setting .esc-button") as HTMLButtonElement | null;

  dynamicLogoutBtn?.addEventListener("click", async () => {
    // 게스트 사용자인지 확인
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

    // 마이페이지 폼 데이터 로드 및 이벤트 리스너 재연결
    setTimeout(async () => {
      // 현재 로그인된 사용자 정보 가져오기
      const currentUser = getCurrentLoggedInUser();
      await loadMyPageFormData(currentUser);
      reconnectMyPageEventListeners();
    }, 100);
  });

  dynamicMyPageSettingCloseBtn?.addEventListener("click", () => {
    (window as any).pageClose?.();
  });
}

// 유저 정보 렌더링 함수
export function renderUser(user: User | null): void {
  console.log("renderUser 호출됨:", user);

  if (user) {
    console.log("renderUser - app_metadata:", user.app_metadata);
    console.log("renderUser - user_metadata:", user.user_metadata);
    console.log("renderUser - isGuestUser 결과:", isGuestUser(user));
  }

  // 현재 사용자 정보 업데이트
  currentLoggedInUser = user;
  const userLoginElement = document.getElementById("user-login-element") as HTMLDivElement | null;
  const userLogoutElement = document.getElementById("user-logout-element") as HTMLDivElement | null;
  const userBoxLogoutElement = document.getElementById("userbox-user-logout-element") as HTMLDivElement | null;

  if (!user) {
    console.log("로그아웃 상태 UI 렌더링");
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

  console.log("로그인 상태 UI 렌더링");
  // 로그인 상태 UI 렌더링
  // 로그인 요소 숨김
  if (userLoginElement) {
    userLoginElement.style.display = "none";
    userLoginElement.innerHTML = "";
  }

  // 로그아웃 상태 요소들 표시
  if (userLogoutElement) {
    userLogoutElement.innerHTML = authHtml.logout.buttons;
    userLogoutElement.style.display = "block";
  }

  if (userBoxLogoutElement) {
    userBoxLogoutElement.innerHTML = authHtml.logout.userBoxDiv;
    userBoxLogoutElement.style.display = "block";
  }

  // 사용자 정보 표시 - 마이페이지 모듈에서 처리하도록 위임
  // (저장된 프로필 이미지가 있으면 우선 사용)
  renderMyPageProfileImage(user).catch((error) => {
    console.error("프로필 이미지 렌더링 실패:", error);
  });

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

  // 비회원 로그인 버튼 이벤트 리스너 설정
  const guestLoginBtn = document.getElementById("guest-login") as HTMLButtonElement | null;
  guestLoginBtn?.addEventListener("click", async () => {
    // 비회원 로그인 확인 창 표시
    const isConfirmed = confirm("비회원으로 이용하시겠습니까?\n\n비회원 계정은 제한된 기능만 이용할 수 있으며, 24시간 후 자동으로 만료됩니다.");

    if (isConfirmed) {
      // 확인을 누른 경우 비회원 로그인 진행
      await handleGuestLogin();
    }
    // 취소를 누른 경우 아무것도 하지 않음
  });
}
