/**
 * 오디오 컨트롤 UI 모듈
 * BGM 재생/일시정지 기능을 제공합니다.
 * (볼륨 조절은 설정 팝업에서 처리)
 */

/**
 * BGM 재생/일시정지 토글 함수
 */
export function toggleBGM(): void {
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
      console.log("BGM 일시정지");
    } else {
      activeAudioManager.playBGM();
      console.log("BGM 재생");
    }
  } else {
    console.warn("활성화된 오디오 매니저를 찾을 수 없습니다.");
  }
}

/**
 * 오디오 컨트롤 모듈 초기화
 */
export function initAudioControls(): void {
  // BGM 토글 기능을 전역에서 사용할 수 있도록 노출
  (window as any).toggleBGM = toggleBGM;

  console.log("오디오 컨트롤 모듈 초기화 완료 (BGM 토글 기능 활성화)");
}
