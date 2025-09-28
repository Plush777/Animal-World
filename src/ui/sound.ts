import { initClickSound, setSoundEffectVolume, playClickSound } from "../sound/soundEffect";

export function initSound() {
  initClickSound("/sounds/effect/click/select-click.wav");

  // 전역에서 클릭 효과음 재생 함수 사용 가능하도록 노출
  (window as any).playClickSound = playClickSound;

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
