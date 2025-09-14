/**
 * 오디오 컨트롤 UI 모듈
 * BGM 볼륨 조절 및 재생/일시정지 기능을 제공합니다.
 */

/**
 * 오디오 컨트롤 UI 생성
 */
export function createAudioControls(): void {
  // 이미 오디오 컨트롤이 있으면 중복 생성 방지
  if (document.getElementById("audio-controls")) {
    return;
  }

  const audioControlsHTML = `
    <div id="audio-controls" class="audio-controls">
      <div class="audio-control-group">
        <button id="audio-toggle" class="audio-toggle" title="BGM 재생/일시정지">
          <svg class="audio-icon" viewBox="0 0 24 24" width="20" height="20">
            <path d="M12 3v10.55c-.59-.34-1.27-.55-2-.55-2.21 0-4 1.79-4 4s1.79 4 4 4 4-1.79 4-4V7h4V3h-6z"/>
          </svg>
        </button>
        <div class="audio-volume-group">
          <input 
            type="range" 
            id="audio-volume" 
            class="audio-volume-slider" 
            min="0" 
            max="100" 
            value="30" 
            title="BGM 볼륨 조절"
          />
          <span id="audio-volume-text" class="audio-volume-text">30%</span>
        </div>
      </div>
    </div>
  `;

  // 오디오 컨트롤을 world-header에 추가
  const worldHeader = document.getElementById("world-header");
  if (worldHeader) {
    worldHeader.insertAdjacentHTML("beforeend", audioControlsHTML);
    setupAudioControlEvents();
  } else {
    // world-header가 없으면 body에 추가
    document.body.insertAdjacentHTML("beforeend", audioControlsHTML);
    setupAudioControlEvents();
  }
}

/**
 * 오디오 컨트롤 이벤트 설정
 */
function setupAudioControlEvents(): void {
  const audioToggle = document.getElementById("audio-toggle") as HTMLButtonElement;
  const audioVolume = document.getElementById("audio-volume") as HTMLInputElement;
  const audioVolumeText = document.getElementById("audio-volume-text") as HTMLSpanElement;

  if (!audioToggle || !audioVolume || !audioVolumeText) {
    console.warn("오디오 컨트롤 요소를 찾을 수 없습니다.");
    return;
  }

  // 재생/일시정지 토글
  audioToggle.addEventListener("click", () => {
    const globalAudioManager = (window as any).globalAudioManager;
    const globalIntroAudioManager = (window as any).globalIntroAudioManager;

    // 현재 활성화된 오디오 매니저 확인
    let activeAudioManager = null;
    if (globalAudioManager && globalAudioManager.isBGMPlaying !== undefined) {
      activeAudioManager = globalAudioManager;
    } else if (globalIntroAudioManager && globalIntroAudioManager.isBGMPlaying !== undefined) {
      activeAudioManager = globalIntroAudioManager;
    }

    if (activeAudioManager) {
      if (activeAudioManager.isBGMPlaying()) {
        activeAudioManager.pauseBGM();
        updateAudioToggleIcon(false);
      } else {
        activeAudioManager.playBGM();
        updateAudioToggleIcon(true);
      }
    } else {
      console.warn("활성화된 오디오 매니저를 찾을 수 없습니다.");
    }
  });

  // 볼륨 조절
  audioVolume.addEventListener("input", (event) => {
    const volume = parseInt((event.target as HTMLInputElement).value) / 100;
    audioVolumeText.textContent = `${Math.round(volume * 100)}%`;

    // 모든 오디오 매니저의 볼륨 업데이트
    const globalAudioManager = (window as any).globalAudioManager;
    const globalIntroAudioManager = (window as any).globalIntroAudioManager;

    if (globalAudioManager && globalAudioManager.setVolume) {
      globalAudioManager.setVolume(volume);
    }
    if (globalIntroAudioManager && globalIntroAudioManager.setVolume) {
      globalIntroAudioManager.setVolume(volume);
    }
  });

  // 초기 상태 설정
  updateAudioToggleIcon(true);
}

/**
 * 오디오 토글 아이콘 업데이트
 */
function updateAudioToggleIcon(isPlaying: boolean): void {
  const audioToggle = document.getElementById("audio-toggle") as HTMLButtonElement;
  if (!audioToggle) return;

  const icon = audioToggle.querySelector(".audio-icon") as SVGElement;
  if (!icon) return;

  if (isPlaying) {
    // 재생 중 아이콘
    icon.innerHTML = `
      <path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z"/>
    `;
    audioToggle.title = "BGM 일시정지";
  } else {
    // 일시정지 아이콘
    icon.innerHTML = `
      <path d="M8 5v14l11-7z"/>
    `;
    audioToggle.title = "BGM 재생";
  }
}

/**
 * 오디오 컨트롤 CSS 스타일 추가
 */
export function addAudioControlStyles(): void {
  const styleId = "audio-controls-styles";
  if (document.getElementById(styleId)) {
    return; // 이미 스타일이 추가됨
  }

  const styles = `
    <style id="${styleId}">
      .audio-controls {
        position: fixed;
        top: 20px;
        right: 20px;
        z-index: 1000;
        background: rgba(255, 255, 255, 0.9);
        backdrop-filter: blur(10px);
        border-radius: 12px;
        padding: 12px;
        box-shadow: 0 4px 20px rgba(0, 0, 0, 0.1);
        border: 1px solid rgba(255, 255, 255, 0.2);
        transition: all 0.3s ease;
      }

      .audio-controls:hover {
        background: rgba(255, 255, 255, 0.95);
        box-shadow: 0 6px 25px rgba(0, 0, 0, 0.15);
      }

      .audio-control-group {
        display: flex;
        align-items: center;
        gap: 12px;
      }

      .audio-toggle {
        background: none;
        border: none;
        cursor: pointer;
        padding: 8px;
        border-radius: 8px;
        transition: all 0.2s ease;
        display: flex;
        align-items: center;
        justify-content: center;
      }

      .audio-toggle:hover {
        background: rgba(0, 0, 0, 0.1);
        transform: scale(1.05);
      }

      .audio-toggle:active {
        transform: scale(0.95);
      }

      .audio-icon {
        fill: #333;
        transition: fill 0.2s ease;
      }

      .audio-toggle:hover .audio-icon {
        fill: #007bff;
      }

      .audio-volume-group {
        display: flex;
        align-items: center;
        gap: 8px;
      }

      .audio-volume-slider {
        width: 80px;
        height: 4px;
        border-radius: 2px;
        background: #ddd;
        outline: none;
        cursor: pointer;
        -webkit-appearance: none;
        appearance: none;
      }

      .audio-volume-slider::-webkit-slider-thumb {
        -webkit-appearance: none;
        appearance: none;
        width: 16px;
        height: 16px;
        border-radius: 50%;
        background: #007bff;
        cursor: pointer;
        transition: all 0.2s ease;
      }

      .audio-volume-slider::-webkit-slider-thumb:hover {
        background: #0056b3;
        transform: scale(1.1);
      }

      .audio-volume-slider::-moz-range-thumb {
        width: 16px;
        height: 16px;
        border-radius: 50%;
        background: #007bff;
        cursor: pointer;
        border: none;
        transition: all 0.2s ease;
      }

      .audio-volume-slider::-moz-range-thumb:hover {
        background: #0056b3;
        transform: scale(1.1);
      }

      .audio-volume-text {
        font-size: 12px;
        color: #666;
        font-weight: 500;
        min-width: 35px;
        text-align: center;
      }

      /* 다크 테마 지원 */
      @media (prefers-color-scheme: dark) {
        .audio-controls {
          background: rgba(30, 30, 30, 0.9);
          border: 1px solid rgba(255, 255, 255, 0.1);
        }

        .audio-controls:hover {
          background: rgba(30, 30, 30, 0.95);
        }

        .audio-toggle:hover {
          background: rgba(255, 255, 255, 0.1);
        }

        .audio-icon {
          fill: #fff;
        }

        .audio-toggle:hover .audio-icon {
          fill: #4dabf7;
        }

        .audio-volume-slider {
          background: #444;
        }

        .audio-volume-slider::-webkit-slider-thumb {
          background: #4dabf7;
        }

        .audio-volume-slider::-webkit-slider-thumb:hover {
          background: #339af0;
        }

        .audio-volume-slider::-moz-range-thumb {
          background: #4dabf7;
        }

        .audio-volume-slider::-moz-range-thumb:hover {
          background: #339af0;
        }

        .audio-volume-text {
          color: #ccc;
        }
      }

      /* 반응형 디자인 */
      @media (max-width: 768px) {
        .audio-controls {
          top: 10px;
          right: 10px;
          padding: 8px;
        }

        .audio-control-group {
          gap: 8px;
        }

        .audio-volume-slider {
          width: 60px;
        }

        .audio-volume-text {
          font-size: 11px;
          min-width: 30px;
        }
      }
    </style>
  `;

  document.head.insertAdjacentHTML("beforeend", styles);
}

/**
 * 오디오 컨트롤 모듈 초기화
 */
export function initAudioControls(): void {
  // 스타일 추가
  addAudioControlStyles();

  // 캔버스 로딩 완료 후 오디오 컨트롤 생성
  document.addEventListener("canvasLoadingComplete", () => {
    setTimeout(() => {
      createAudioControls();
    }, 1000); // 1초 후 생성 (UI가 완전히 로드된 후)
  });
}
