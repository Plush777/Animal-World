/**
 * 인트로 애니메이션 관리 모듈
 * 로그인 상태에 따른 인트로 요소들의 순차적 애니메이션 처리
 */

// import { createAndShowLoadingUI, setTotalModels, updateProgressText, onLoadingError } from "./loading.js";
import { getCurrentLoggedInUser } from "../../auth/auth-ui.js";
import { initializeIntroAudioManager, disposeGlobalIntroAudioManager } from "./introAudio.js";
import { joinButtonManager } from "./joinButton.js";

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

// 전역 변수로 이벤트 리스너 참조 저장
let joinButtonClickListener: ((event: Event) => void) | null = null;

/**
 * 참여하기 버튼 설정
 */
async function setupJoinButton(): Promise<void> {
  const joinButton = document.querySelector("#join-button") as HTMLButtonElement;
  console.log("join-button 요소 찾기:", joinButton);
  if (joinButton) {
    console.log("join-button 이벤트 리스너 등록");

    // 기존 이벤트 리스너가 있으면 제거
    if (joinButtonClickListener) {
      joinButton.removeEventListener("click", joinButtonClickListener);
    }

    // 새로운 이벤트 리스너 생성 및 저장
    joinButtonClickListener = async () => {
      console.log("join-button 클릭됨!");

      // 클릭 효과음 재생
      if ((window as any).playClickSound) {
        (window as any).playClickSound();
      }

      // 인트로 BGM은 그대로 유지하여 Canvas BGM과 자연스럽게 전환
      console.log("인트로 BGM 유지 - Canvas BGM과 자연스러운 전환");

      // Canvas 로딩 완료 이벤트 리스너 등록 (참여하기 버튼 클릭 시점에 등록)
      document.addEventListener(
        "canvasLoadingComplete",
        () => {
          // 카메라 위치 변경 (Canvas 준비 완료 후)
          dispatchCameraChangeEvent();

          // 팝업 모듈 재초기화 (방 참여 후 버튼 클릭 이벤트 등록)
          if ((window as any).initPopupModule) {
            (window as any).initPopupModule();
            console.log("방 참여 후 팝업 모듈 재초기화 완료");
          }

          // 앱 클릭 이벤트 재등록 (방 참여 후 이모지 버튼 등 클릭 이벤트 등록)
          if ((window as any).appClickEvents) {
            (window as any).appClickEvents();
            console.log("방 참여 후 앱 클릭 이벤트 재등록 완료");
          }

          setTimeout(() => {
            const mainTag = document.querySelector(".main") as HTMLElement;
            const worldHeader = document.getElementById("world-header") as HTMLElement;

            if (mainTag) {
              mainTag.classList.add("ui-visible");
            }

            if (worldHeader) {
              worldHeader.classList.add("ui-visible");
            }
          }, 3000);
        },
        { once: true }
      );

      // JoinButtonManager를 통해 캐릭터 설정 처리
      if (joinButtonManager) {
        console.log("JoinButtonManager를 통해 캐릭터 설정 처리 시작");

        // JoinButtonManager의 참여 완료 콜백 설정
        joinButtonManager.setJoinCompleteCallback(async (characterId: string) => {
          console.log(`캐릭터 선택 완료: ${characterId}`);
          console.log("캐릭터 선택 완료 - 추가 처리 없음 (캔버스는 이미 초기화됨)");
        });

        // JoinButtonManager의 handleJoinClick 메서드 호출
        joinButtonManager.handleJoinClick();
      } else {
        console.error("JoinButtonManager를 찾을 수 없습니다.");
      }
    };

    // 이벤트 리스너 추가
    joinButton.addEventListener("click", joinButtonClickListener);
  }
}

/**
 * 인트로 모듈 초기화
 */
function initIntroModule(): void {
  // 전역에서 애니메이션 함수 접근 가능하도록 노출
  if (typeof window !== "undefined") {
    (window as any).setupJoinButton = setupJoinButton;
  }

  // 인트로 오디오 매니저 초기화
  initializeIntroAudioManager();
  console.log("인트로 오디오 매니저 초기화 완료");

  // 시간대 변경 이벤트 리스너 등록 (인트로 화면용)
  document.addEventListener("timeChange", (event: any) => {
    console.log("인트로 화면 시간대 변경 이벤트 수신:", event.detail);

    const introAudioManager = (window as any).globalIntroAudioManager;
    if (introAudioManager) {
      try {
        introAudioManager.switchBGMForTimeChange();
        console.log("인트로 화면 시간대 변경에 따른 BGM 전환 완료");
      } catch (error) {
        console.error("인트로 화면 시간대 변경 BGM 전환 중 오류:", error);
      }
    }
  });

  // 저장된 방 정보가 있으면 자동으로 방에 입장
  if ((window as any).autoJoinStoredRoom) {
    (window as any).autoJoinStoredRoom();
  }
}

export { setupJoinButton, initIntroModule, isUserLoggedIn };
