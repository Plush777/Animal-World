/**
 * 테마 및 비디오 관리 모듈
 * 라이트/다크 테마에 따른 비디오 표시/숨김 처리
 */

/**
 * 현재 테마에 따른 비디오 표시/숨김 설정
 */
function setupThemeVideos(): void {
  const lightVideo = document.querySelector(".light-video") as HTMLVideoElement;
  const darkVideo = document.querySelector(".dark-video") as HTMLVideoElement;

  const currentTheme = document.body.dataset.theme;

  if (currentTheme === "dark") {
    if (lightVideo) {
      lightVideo.style.display = "none";
    }

    if (darkVideo) {
      darkVideo.style.display = "block";
    }
  } else if (currentTheme === "light") {
    if (lightVideo) {
      lightVideo.style.display = "block";
    }

    if (darkVideo) {
      darkVideo.style.display = "none";
    }
  }
}

/**
 * 테마 변경 시 비디오 업데이트
 */
function updateThemeVideos(theme: "light" | "dark"): void {
  const lightVideo = document.querySelector(".light-video") as HTMLVideoElement;
  const darkVideo = document.querySelector(".dark-video") as HTMLVideoElement;

  if (theme === "dark") {
    if (lightVideo) {
      lightVideo.style.display = "none";
    }
    if (darkVideo) {
      darkVideo.style.display = "block";
    }
  } else {
    if (lightVideo) {
      lightVideo.style.display = "block";
    }
    if (darkVideo) {
      darkVideo.style.display = "none";
    }
  }
}

/**
 * 테마 모듈 초기화
 */
function initThemeModule(): void {
  setupThemeVideos();

  // 테마 변경 이벤트 리스너 설정 (필요시)
  const observer = new MutationObserver((mutations) => {
    mutations.forEach((mutation) => {
      if (mutation.type === "attributes" && mutation.attributeName === "data-theme") {
        const newTheme = document.body.dataset.theme as "light" | "dark";
        if (newTheme) {
          updateThemeVideos(newTheme);
        }
      }
    });
  });

  observer.observe(document.body, {
    attributes: true,
    attributeFilter: ["data-theme"],
  });
}

export { initThemeModule, setupThemeVideos, updateThemeVideos };
