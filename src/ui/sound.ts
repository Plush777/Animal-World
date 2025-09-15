import { initClickSound, setSoundEffectVolume } from "../sound/soundEffect";

export function initSound() {
  // 클릭 사운드 초기화 (모든 기능이 포함됨)
  initClickSound("/sounds/effect/click/select-click.wav");

  // 저장된 효과음 볼륨 설정 적용
  const savedVolume = localStorage.getItem("scene-sound-effect-volume");
  if (savedVolume) {
    const volume = parseInt(savedVolume, 10) / 100; // 0-1 범위로 변환
    setSoundEffectVolume(volume);
    (window as any).soundEffectVolume = volume;
  } else {
    // 기본값 100% 설정
    setSoundEffectVolume(1);
    (window as any).soundEffectVolume = 1;
  }
}

// initSound는 ui.ts에서 호출됨
