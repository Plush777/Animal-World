window.LoadingUI = window.LoadingUI || {};

(function () {
  let loadingWrapper: HTMLElement | null = null;
  let progressFill: HTMLElement | null = null;
  let progressText: HTMLElement | null = null;
  let tipText: HTMLElement | null = null;

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
    loadingWrapper = document.querySelector(".loading-wrapper");
    progressFill = document.getElementById("progress-fill");
    progressText = document.getElementById("progress-text");
    tipText = document.getElementById("tip-text");

    showRandomTip();
  }

  /**
   * 로딩할 총 모델 수 설정
   */
  function setTotalModels(total: number) {
    totalModels = total;
    loadedModels = 0;
    currentProgress = 0;
    updateProgress();
  }

  /**
   * 모델 로딩 완료 시 호출
   */
  function onModelLoaded() {
    loadedModels++;
    currentProgress = (loadedModels / totalModels) * 100;

    updateProgress();

    // 모든 모델이 로드되면 완료 처리
    if (loadedModels >= totalModels) {
      setTimeout(() => {
        onLoadingComplete();
      }, 500);
    }
  }

  function onModelProgress(loaded: number, total: number) {
    if (total === 0) return;

    const modelProgress = (loaded / total) * 100;
    const baseProgress = (loadedModels / totalModels) * 100;
    const modelContribution = (1 / totalModels) * 100;
    const currentModelProgress = (modelProgress / 100) * modelContribution;

    currentProgress = baseProgress + currentModelProgress;

    updateProgress();
  }

  function updateProgress(): void {
    if (progressFill) {
      progressFill.style.width = `${Math.min(currentProgress, 100)}%`;
    }

    updateProgressText(`월드를 만드는 중... ${Math.round(currentProgress)}%`);
  }

  function updateProgressText(text: string): void {
    if (progressText) {
      progressText.textContent = text;
    }
  }

  function showRandomTip(): void {
    if (tipText && tips.length > 0) {
      const randomIndex = Math.floor(Math.random() * tips.length);
      tipText.textContent = `TIP: ${tips[randomIndex]}`;
    }
  }

  function onLoadingComplete(): void {
    updateProgressText("월드 생성 완료!");

    // 1초 후 로딩 화면 페이드아웃
    setTimeout(() => {
      hideLoadingScreen();
    }, 1000);
  }

  function hideLoadingScreen(): void {
    if (loadingWrapper) {
      loadingWrapper.classList.add("fade-out");

      setTimeout(() => {
        if (loadingWrapper) {
          loadingWrapper.remove();
        }

        const canvas = document.getElementById("scene");
        if (canvas) {
          canvas.classList.add("loaded");
        }

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

  function onLoadingError(error: any) {
    if (progressText) {
      progressText.textContent = "로딩 중 오류가 발생했습니다.";
    }

    if (tipText) {
      tipText.textContent = "페이지를 새로고침해 주세요.";
    }

    console.error("Loading Error:", error);

    setTimeout(() => {
      forceHideLoading();
    }, 5000);
  }

  window.LoadingUI = {
    init: initLoadingUI,
    setTotalModels: setTotalModels,
    onModelLoaded: onModelLoaded,
    onModelProgress: onModelProgress,
    forceHide: forceHideLoading,
    onError: onLoadingError,
  };

  function hideIntroWrapper(): void {
    const introWrapper = document.querySelector(
      ".intro-wrapper"
    ) as HTMLElement;
    if (introWrapper) {
      introWrapper.style.transition = "opacity 0.5s ease-out";
      introWrapper.style.opacity = "0";

      setTimeout(() => {
        introWrapper.style.display = "none";

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
        duration: 2500,
      },
    });

    document.dispatchEvent(event);
  }

  function setupJoinButton(): void {
    const joinButton = document.querySelector(
      "#join-button"
    ) as HTMLButtonElement;
    if (joinButton) {
      joinButton.addEventListener("click", () => {
        hideIntroWrapper();
      });
    }
  }

  document.addEventListener("DOMContentLoaded", () => {
    initLoadingUI();
    setupJoinButton();
  });
})();

document.querySelector(".chat-close-button")?.addEventListener("click", () => {
  const chatWrapper = document.querySelector(".chat-wrapper") as HTMLElement;

  if (chatWrapper) {
    chatWrapper.classList.toggle("active");
  }

  const hidden = document.querySelector(
    ".chat-close-button .hidden"
  ) as HTMLElement;

  if (hidden) {
    hidden.textContent = chatWrapper.classList.contains("active")
      ? "채팅창 닫기"
      : "채팅창 열기";
  }
});
