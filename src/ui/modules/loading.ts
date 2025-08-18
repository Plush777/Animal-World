/**
 * 로딩 UI 관리 모듈
 * 3D 모델 로딩 진행률 표시 및 로딩 화면 관리
 */

let loadingWrapper: HTMLElement | null = null;
let progressFill: HTMLElement | null = null;
let progressText: HTMLElement | null = null;
let tipText: HTMLElement | null = null;

let totalModels = 0;
let loadedModels = 0;
let currentProgress = 0;

const tips = ["팁 텍스트입니다1", "팁 텍스트입니다2", "팁 텍스트입니다3", "팁 텍스트입니다4", "팁 텍스트입니다5"];

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

      // 인트로 애니메이션 시작은 intro 모듈에서 처리하도록 이벤트 발생
      const event = new CustomEvent("loadingComplete");
      document.dispatchEvent(event);
    }, 500);
  }
}

/**
 * 로딩 화면 강제 숨기기 (에러 발생 시 등)
 */
function forceHideLoading() {
  hideLoadingScreen();
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

// 전역 LoadingUI 객체 생성
if (typeof window !== "undefined") {
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
}

export {
  initLoadingUI,
  createAndShowLoadingUI,
  setTotalModels,
  onModelLoaded,
  onModelProgress,
  updateProgressText,
  forceHideLoading,
  onLoadingError,
};
