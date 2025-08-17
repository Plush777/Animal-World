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
   * 로딩 화면 생성 및 표시
   */
  function createAndShowLoadingUI() {
    // 로딩 화면 HTML 생성
    const loadingHTML = `
      <div class="loading-wrapper">
        <div class="loading-image-area">
          <span class="hidden">로딩 배경화면</span>
        </div>
        <div class="progress-bar">
          <div class="progress-fill" id="progress-fill"></div>
        </div>
        <div class="loading-inner">
          <div class="loading-progress">
            <p class="progress-text" id="progress-text"></p>
            <div class="loading-tips">
              <p class="tip-text" id="tip-text"></p>
            </div>
          </div>
        </div>
      </div>
    `;

    // body에 로딩 화면 추가
    document.body.insertAdjacentHTML("afterbegin", loadingHTML);

    // DOM 요소 참조
    loadingWrapper = document.querySelector(".loading-wrapper");
    progressFill = document.getElementById("progress-fill");
    progressText = document.getElementById("progress-text");
    tipText = document.getElementById("tip-text");

    showRandomTip();
  }

  /**
   * 로딩 UI 초기화 (기존 로딩 화면이 있을 때)
   */
  function initLoadingUI() {
    loadingWrapper = document.querySelector(".loading-wrapper");
    progressFill = document.getElementById("progress-fill");
    progressText = document.getElementById("progress-text");
    tipText = document.getElementById("tip-text");

    if (loadingWrapper && tipText) {
      showRandomTip();
    }
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
    createAndShow: createAndShowLoadingUI,
    setTotalModels: setTotalModels,
    onModelLoaded: onModelLoaded,
    onModelProgress: onModelProgress,
    updateProgressText: updateProgressText,
    forceHide: forceHideLoading,
    onError: onLoadingError,
  };

  /**
   * intro-wrapper만 숨기기 (카메라 이동 없음)
   */
  function hideIntroWrapperOnly(): void {
    const introWrapper = document.querySelector(
      ".intro-wrapper"
    ) as HTMLElement;
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

  async function setupJoinButton(): Promise<void> {
    const joinButton = document.querySelector(
      "#join-button"
    ) as HTMLButtonElement;
    if (joinButton) {
      joinButton.addEventListener("click", async () => {
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
          await (window as any).initCanvas();
        } catch (error) {
          onLoadingError(error);
          return;
        }
      });
    }
  }

  document.addEventListener("DOMContentLoaded", () => {
    setupJoinButton();
    startIntroAnimations();
  });
})();

document.addEventListener("DOMContentLoaded", () => {
  document
    .querySelector(".chat-close-button")
    ?.addEventListener("click", () => {
      const chatWrapper = document.querySelector(
        ".chat-wrapper"
      ) as HTMLElement;

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

  document.querySelector(".setting-button")?.addEventListener("click", () => {
    const settingPopup = document.querySelector(
      ".popup.setting"
    ) as HTMLElement;

    settingPopup.classList.toggle("active");
  });

  document.querySelector(".popup-close")?.addEventListener("click", () => {
    const popup = document.querySelector(".popup") as HTMLElement;

    if (popup) {
      popup.classList.remove("active");
    }
  });

  const lightVideo = document.querySelector(".light-video") as HTMLVideoElement;
  const darkVideo = document.querySelector(".dark-video") as HTMLVideoElement;

  if (document.body.dataset.theme === "dark") {
    if (lightVideo) {
      lightVideo.style.display = "none";
    }

    if (darkVideo) {
      darkVideo.style.display = "block";
    }
  }

  if (document.body.dataset.theme === "light") {
    if (lightVideo) {
      lightVideo.style.display = "block";
    }

    if (darkVideo) {
      darkVideo.style.display = "none";
    }
  }
});
