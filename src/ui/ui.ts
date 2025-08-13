/**
 * Loading UI 관리 함수들 - 전역 스코프
 */

// 전역 로딩 상태 변수들
window.LoadingUI = window.LoadingUI || {};

(function () {
  // 로딩 상태 변수들 (전역 네임스페이스 내부)
  let loadingWrapper = null;
  let progressFill = null;
  let progressText = null;
  let tipText = null;

  let totalModels = 0;
  let loadedModels = 0;
  let currentProgress = 0;

  const tips = [
    "팁 텍스트입니다1",
    "팁 텍스트입니다2",
    "팁 텍스트입니다3",
    "팁 텍스트입니다4",
    "팁 텍스트입니다5",
  ];

  /**
   * 로딩 UI 초기화
   */
  function initLoadingUI() {
    // DOM 요소들 찾기
    loadingWrapper = document.querySelector(".loading-wrapper");
    progressFill = document.getElementById("progress-fill");
    progressText = document.getElementById("progress-text");
    tipText = document.getElementById("tip-text");

    // 초기 랜덤 팁 설정
    showRandomTip();
  }

  /**
   * 로딩할 총 모델 수 설정
   */
  function setTotalModels(total) {
    totalModels = total;
    loadedModels = 0;
    currentProgress = 0;
    updateProgress();
  }

  /**
   * 모델 로딩 완료 시 호출
   */
  function onModelLoaded(modelName) {
    loadedModels++;
    currentProgress = (loadedModels / totalModels) * 100;

    // 개별 모델 완료 메시지 대신 전체 진행률만 표시
    updateProgress();

    // 모든 모델이 로드되면 완료 처리
    if (loadedModels >= totalModels) {
      setTimeout(() => {
        onLoadingComplete();
      }, 500); // 약간의 지연 후 완료
    }
  }

  /**
   * 개별 모델 로딩 진행률 업데이트
   */
  function onModelProgress(loaded, total, modelName) {
    if (total === 0) return;

    const modelProgress = (loaded / total) * 100;
    const baseProgress = (loadedModels / totalModels) * 100;
    const modelContribution = (1 / totalModels) * 100;
    const currentModelProgress = (modelProgress / 100) * modelContribution;

    currentProgress = baseProgress + currentModelProgress;

    // 개별 모델명 대신 전체 진행률만 표시
    updateProgress();
  }

  /**
   * 진행률 업데이트
   */
  function updateProgress(): void {
    if (progressFill) {
      progressFill.style.width = `${Math.min(currentProgress, 100)}%`;
    }

    // 단순하게 전체 진행률만 표시
    updateProgressText(`월드를 만드는 중... ${Math.round(currentProgress)}%`);
  }

  /**
   * 진행률 텍스트 업데이트
   */
  function updateProgressText(text: string): void {
    if (progressText) {
      progressText.textContent = text;
    }
  }

  /**
   * 랜덤 팁 표시
   */
  function showRandomTip(): void {
    if (tipText && tips.length > 0) {
      const randomIndex = Math.floor(Math.random() * tips.length);
      tipText.textContent = `TIP: ${tips[randomIndex]}`;
    }
  }

  /**
   * 로딩 완료 처리
   */
  function onLoadingComplete(): void {
    updateProgressText("월드 생성 완료!");

    // 1초 후 로딩 화면 페이드아웃
    setTimeout(() => {
      hideLoadingScreen();
    }, 1000);
  }

  /**
   * 로딩 화면 숨기기
   */
  function hideLoadingScreen(): void {
    if (loadingWrapper) {
      loadingWrapper.classList.add("fade-out");

      // 페이드아웃 애니메이션 완료 후 DOM에서 제거
      setTimeout(() => {
        if (loadingWrapper) {
          loadingWrapper.remove();
        }

        // Canvas 표시
        const canvas = document.getElementById("scene");
        if (canvas) {
          canvas.classList.add("loaded");
        }

        // intro-wrapper 표시 (원래 intro UI로 전환)
        const introWrapper = document.querySelector(
          ".intro-wrapper"
        ) as HTMLElement;
        if (introWrapper) {
          introWrapper.style.display = "flex";

          // 순차적 애니메이션 시작
          startIntroAnimations();
        }
      }, 500);
    }
  }

  /**
   * 로딩 화면 강제 숨기기 (에러 발생 시 등)
   */
  function forceHideLoading() {
    hideLoadingScreen();
  }

  /**
   * Intro 요소들의 순차적 애니메이션 시작
   */
  function startIntroAnimations(): void {
    const logoArea = document.querySelector(".intro-logo-area");
    const descriptionBox = document.querySelector(".intro-description-box");
    const button = document.querySelector(".intro-bottom button");

    // 1. 로고 영역 애니메이션 (즉시 시작)
    if (logoArea) {
      setTimeout(() => {
        logoArea.classList.add("animate-in");
      }, 200);
    }

    // 2. 버튼 애니메이션 (0.6초 후)
    if (button) {
      setTimeout(() => {
        button.classList.add("animate-in");
      }, 500);
    }

    // 3. 설명 박스 애니메이션 (1.6초 후)
    if (descriptionBox) {
      setTimeout(() => {
        descriptionBox.classList.add("animate-in");
      }, 1600);
    }
  }

  /**
   * 에러 발생 시 처리
   */
  function onLoadingError(error) {
    if (progressText) {
      progressText.textContent = "로딩 중 오류가 발생했습니다.";
    }

    if (tipText) {
      tipText.textContent = "페이지를 새로고침해 주세요.";
    }

    console.error("Loading Error:", error);

    // 5초 후 강제로 로딩 화면 숨기기
    setTimeout(() => {
      forceHideLoading();
    }, 5000);
  }

  // 전역 함수들을 window.LoadingUI에 할당
  window.LoadingUI = {
    init: initLoadingUI,
    setTotalModels: setTotalModels,
    onModelLoaded: onModelLoaded,
    onModelProgress: onModelProgress,
    forceHide: forceHideLoading,
    onError: onLoadingError,
  };

  /**
   * 참여하기 버튼 클릭 시 intro-wrapper 숨기기 및 카메라 위치 변경
   */
  function hideIntroWrapper(): void {
    const introWrapper = document.querySelector(
      ".intro-wrapper"
    ) as HTMLElement;
    if (introWrapper) {
      introWrapper.style.transition = "opacity 0.5s ease-out";
      introWrapper.style.opacity = "0";

      // 페이드아웃 완료 후 완전히 숨기기
      setTimeout(() => {
        introWrapper.style.display = "none";

        // 카메라 위치 변경 이벤트 발생
        dispatchCameraChangeEvent();
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
        duration: 2500, // 2.5초 동안 부드럽게 애니메이션
      },
    });

    document.dispatchEvent(event);
  }

  /**
   * 참여하기 버튼 이벤트 리스너 설정
   */
  function setupJoinButton(): void {
    // 참여하기 버튼 찾기 (ID로 식별)
    const joinButton = document.querySelector(
      "#join-button"
    ) as HTMLButtonElement;
    if (joinButton) {
      joinButton.addEventListener("click", () => {
        hideIntroWrapper();
      });
    }
  }

  // DOM이 로드되면 로딩 UI 및 버튼 이벤트 초기화
  document.addEventListener("DOMContentLoaded", () => {
    initLoadingUI();
    setupJoinButton();
  });
})();
