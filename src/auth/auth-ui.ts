import { type User } from "@supabase/supabase-js";
import { authHtml } from "../data/authHtml";
import { handleGoogleLogin, handleKakaoLogin, handleLogout, handleGuestLogin, handleGuestLogout, isGuestUser } from "./auth-core";
import { renderMyPageProfileImage, reconnectMyPageEventListeners, loadMyPageFormData } from "../ui/modules/myPage";
import { closeSidebar } from "../utils/sidebar";
import { sceneHtml } from "../data/sceneHtml";

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

        const creditButton = document.getElementById("credits");
        const creditPopup = document.getElementById("credit-popup");

        if (creditButton) {
          creditButton.addEventListener("click", () => {
            console.log("creditButton clicked");

            if (creditPopup) {
              // 기존 BGM 일시정지
              const globalAudioManager = (window as any).globalAudioManager;
              const globalIntroAudioManager = (window as any).globalIntroAudioManager;

              // 현재 활성화된 오디오 매니저 확인 및 일시정지
              let activeAudioManager = null;
              if (globalAudioManager && globalAudioManager.isBGMPlaying !== undefined) {
                activeAudioManager = globalAudioManager;
              } else if (globalIntroAudioManager && globalIntroAudioManager.isBGMPlaying !== undefined) {
                activeAudioManager = globalIntroAudioManager;
              }

              if (activeAudioManager && activeAudioManager.isBGMPlaying()) {
                activeAudioManager.pauseBGM();
                console.log("기존 BGM 일시정지 (credits 팝업 열기)");
              }

              creditPopup.innerHTML = sceneHtml.credit;

              const creditCloseBtn = document.getElementById("credit-close-button") as HTMLButtonElement;
              creditCloseBtn?.addEventListener("click", () => {
                if (creditPopup) {
                  creditPopup.innerHTML = "";

                  setTimeout(async () => {
                    if (activeAudioManager) {
                      // 기존 BGM을 완전히 중지하고 새로 시작
                      activeAudioManager.stopBGM();

                      // 현재 시간대에 맞는 BGM을 새로 로드하고 재생
                      if (activeAudioManager.switchBGMForTimeChange) {
                        await activeAudioManager.switchBGMForTimeChange();
                        console.log("기존 BGM 새로 시작 (credits 팝업 닫기)");
                      } else {
                        // IntroAudioManager의 경우 다른 방식으로 처리
                        activeAudioManager.playBGM();
                        console.log("기존 BGM 새로 시작 (credits 팝업 닫기)");
                      }
                    }
                  }, 200);
                }
              });
            }
          });
        }
      }
    });

    const app = document.querySelector("#app") as HTMLElement;

    app?.addEventListener("click", (e) => {
      const sidebarButton = userBoxLogoutElement.querySelector(".sidebar-hamburger-menu") as HTMLButtonElement;
      const sidebar = document.getElementById("sidebar") as HTMLDivElement;
      const creditContent = document.querySelector(".credit-content") as HTMLDivElement;

      // 사이드바가 열려있는지 확인
      const isSidebarOpen = main.classList.contains("sidebar-open");

      if (creditContent) {
        creditContent.classList.add("transition-start");

        const creditAudio = document.getElementById("credit-audio") as HTMLAudioElement;
        creditAudio.volume = 1;
      }

      // credit-close-button 또는 그 자식 요소를 클릭한 경우 사이드바를 닫지 않음
      if ((e.target as HTMLElement).closest("#credit-close-button")) {
        if (creditContent) {
          creditContent.classList.remove("transition-start");
        }

        return;
      }

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
