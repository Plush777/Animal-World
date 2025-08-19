/**
 * 인트로 애니메이션 관리 모듈
 * 로그인 상태에 따른 인트로 요소들의 순차적 애니메이션 처리
 */

import { createAndShowLoadingUI, setTotalModels, updateProgressText, onLoadingError } from "./loading.js";

/**
 * 로그인 상태 확인 함수
 */
function isUserLoggedIn(): boolean {
  const userLogoutElement = document.querySelector("#user-logout-element");
  const userLoginElement = document.querySelector("#user-login-element");

  // userLogoutElement가 존재하고 display가 none이 아니면 로그인된 상태
  if (userLogoutElement && (userLogoutElement as HTMLElement).style.display !== "none") {
    return true;
  }

  // userLoginElement가 존재하고 display가 none이 아니면 로그인되지 않은 상태
  if (userLoginElement && (userLoginElement as HTMLElement).style.display !== "none") {
    return false;
  }

  // 기본적으로 로그인 버튼이 있는지 확인
  const googleLoginButton = document.querySelector(".google-login-button");
  const kakaoLoginButton = document.querySelector(".kakao-login-button");

  return !(googleLoginButton || kakaoLoginButton);
}

/**
 * 기존 애니메이션 클래스 제거 함수
 */
function resetAnimationClasses(): void {
  const animatedElements = document.querySelectorAll(".animate-in");
  animatedElements.forEach((element) => {
    element.classList.remove("animate-in");
  });
}

/**
 * Intro 요소들의 순차적 애니메이션 시작
 */
function startIntroAnimations(): void {
  resetAnimationClasses();

  const logoArea = document.querySelector(".intro-logo-area");
  const descriptionBox = document.querySelector(".intro-description-box");
  const button = document.querySelector(".intro-bottom button");
  const guestLoginButton = document.querySelector(".guest-login");
  const googleLoginButton = document.querySelector(".google-login-button");
  const kakaoLoginButton = document.querySelector(".kakao-login-button");
  // const introEtcArea = document.querySelector(".intro-etc-area");

  // 로고 영역은 항상 먼저 애니메이션
  if (logoArea) {
    setTimeout(() => {
      logoArea.classList.add("animate-in");
    }, 200);
  }

  if (isUserLoggedIn()) {
    if (button) {
      setTimeout(() => {
        button.classList.add("animate-in");
      }, 400);
    }

    if (descriptionBox) {
      setTimeout(() => {
        descriptionBox.classList.add("animate-in");
      }, 1200);
    }
  } else {
    if (googleLoginButton) {
      setTimeout(() => {
        googleLoginButton.classList.add("animate-in");
      }, 400);
    }

    if (kakaoLoginButton) {
      setTimeout(() => {
        kakaoLoginButton.classList.add("animate-in");
      }, 600);
    }

    if (guestLoginButton) {
      setTimeout(() => {
        guestLoginButton.classList.add("animate-in");
      }, 800);
    }

    // if (introEtcArea) {
    //   setTimeout(() => {
    //     introEtcArea.classList.add("animate-in");
    //   }, 800);
    // }
  }
}

/**
 * intro-wrapper만 숨기기 (카메라 이동 없음)
 */
function hideIntroWrapperOnly(): void {
  const introWrapper = document.querySelector(".intro-wrapper") as HTMLElement;
  if (introWrapper) {
    introWrapper.style.transition = "opacity 0.5s ease-out";
    introWrapper.style.opacity = "0";

    setTimeout(() => {
      introWrapper.style.display = "none";
    }, 500);
  }
}

/**
 * 카메라 위치 변경 이벤트 발생
 */
function dispatchCameraChangeEvent(): void {
  const event = new CustomEvent("changeCameraPosition", {
    detail: {
      x: 485.35,
      y: 265.02,
      z: 491.73,
      duration: 2500,
    },
  });

  document.dispatchEvent(event);
}

/**
 * 로딩 완료 시 인트로 화면 표시
 */
function showIntroWrapper(): void {
  const introWrapper = document.querySelector(".intro-wrapper") as HTMLElement;
  if (introWrapper) {
    introWrapper.style.display = "flex";
    // 순차적 애니메이션 시작
    startIntroAnimations();
  }
}

/**
 * 참여하기 버튼 설정
 */
async function setupJoinButton(): Promise<void> {
  console.log("setupJoinButton 함수 호출됨");
  const joinButton = document.querySelector("#join-button") as HTMLButtonElement;
  console.log("join-button 요소 찾기:", joinButton);
  if (joinButton) {
    console.log("join-button 이벤트 리스너 등록");

    // 기존 이벤트 리스너 제거 (중복 방지)
    joinButton.replaceWith(joinButton.cloneNode(true));
    const newJoinButton = document.querySelector("#join-button") as HTMLButtonElement;

    newJoinButton.addEventListener("click", async () => {
      console.log("join-button 클릭됨!");
      // Canvas 로딩 완료 이벤트 리스너 등록 (참여하기 버튼 클릭 시점에 등록)
      document.addEventListener(
        "canvasLoadingComplete",
        () => {
          // 카메라 위치 변경 (Canvas 준비 완료 후)
          dispatchCameraChangeEvent();

          setTimeout(() => {
            const mainTag = document.querySelector(".main") as HTMLElement;
            if (mainTag) {
              mainTag.classList.add("ui-visible");
            }
          }, 3000);
        },
        { once: true }
      );

      // 인트로 화면 즉시 숨기기 (카메라 이동 없음)
      hideIntroWrapperOnly();

      // 로딩 화면 표시 및 초기 설정
      createAndShowLoadingUI();

      // 로딩할 총 모델 수를 미리 설정 (8개 모델)
      setTotalModels(8);

      // 초기 진행률 표시
      updateProgressText("월드를 준비하는 중...");

      try {
        // Canvas 초기화 (전역 함수 호출)
        console.log("initCanvas 함수 확인:", typeof (window as any).initCanvas);
        if (typeof (window as any).initCanvas !== "function") {
          throw new Error("initCanvas 함수를 찾을 수 없습니다.");
        }
        await (window as any).initCanvas();
      } catch (error) {
        console.error("Canvas 초기화 중 오류:", error);
        onLoadingError(error);
        return;
      }
    });
  } else {
    console.warn("join-button 요소를 찾을 수 없습니다.");
  }
}

/**
 * 인트로 모듈 초기화
 */
function initIntroModule(): void {
  // 로딩 완료 이벤트 리스너 등록
  document.addEventListener("loadingComplete", showIntroWrapper);

  // 전역에서 애니메이션 함수 접근 가능하도록 노출
  if (typeof window !== "undefined") {
    (window as any).startIntroAnimations = startIntroAnimations;
    (window as any).setupJoinButton = setupJoinButton;
  }
}

export { startIntroAnimations, setupJoinButton, initIntroModule, isUserLoggedIn };
