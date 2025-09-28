/**
 * 볼륨 컨트롤 모듈
 * 설정 팝업의 BGM 및 효과음 볼륨 조절 기능을 제공합니다.
 */

import { setSoundEffectVolume as setClickSoundVolume } from "../../sound/soundEffect";

// 로컬스토리지 키
const STORAGE_KEYS = {
  BGM_VOLUME: "scene-bgm-volume",
  SOUND_EFFECT_VOLUME: "scene-sound-effect-volume",
} as const;

// 기본 볼륨 값 (100%)
const DEFAULT_VOLUME = 100;

/**
 * 로컬스토리지에서 볼륨 설정 불러오기
 */
function loadVolumeFromStorage(key: string): number {
  try {
    const stored = localStorage.getItem(key);
    return stored ? parseInt(stored, 10) : DEFAULT_VOLUME;
  } catch (error) {
    console.warn(`볼륨 설정 불러오기 실패 (${key}):`, error);
    return DEFAULT_VOLUME;
  }
}

/**
 * 로컬스토리지에 볼륨 설정 저장하기
 */
function saveVolumeToStorage(key: string, volume: number): void {
  try {
    localStorage.setItem(key, volume.toString());
  } catch (error) {
    console.warn(`볼륨 설정 저장 실패 (${key}):`, error);
  }
}

/**
 * BGM 볼륨 조절
 */
function handleBGMVolumeChange(event: Event): void {
  const target = event.target as HTMLInputElement;
  const volume = parseInt(target.value, 10);

  // 로컬스토리지에 저장
  saveVolumeToStorage(STORAGE_KEYS.BGM_VOLUME, volume);

  // 실제 BGM 볼륨 적용
  const globalAudioManager = (window as any).globalAudioManager;
  const globalIntroAudioManager = (window as any).globalIntroAudioManager;

  const normalizedVolume = volume / 100; // 0-1 범위로 변환

  if (globalAudioManager && globalAudioManager.setVolume) {
    globalAudioManager.setVolume(normalizedVolume);
  }
  if (globalIntroAudioManager && globalIntroAudioManager.setVolume) {
    globalIntroAudioManager.setVolume(normalizedVolume);
  }

  console.log(`BGM 볼륨 설정: ${volume}%`);
}

/**
 * 효과음 볼륨 조절
 */
function handleSoundEffectVolumeChange(event: Event): void {
  const target = event.target as HTMLInputElement;
  const volume = parseInt(target.value, 10);

  // 로컬스토리지에 저장
  saveVolumeToStorage(STORAGE_KEYS.SOUND_EFFECT_VOLUME, volume);

  // 효과음 볼륨을 전역 변수로 설정 (다른 모듈에서 사용할 수 있도록)
  const normalizedVolume = volume / 100; // 0-1 범위로 변환
  (window as any).soundEffectVolume = normalizedVolume;

  // 실제 효과음 볼륨 적용
  setClickSoundVolume(normalizedVolume);

  console.log(`효과음 볼륨 설정: ${volume}%`);
}

/**
 * 볼륨 컨트롤 초기화
 */
export function initializeVolumeControls(): void {
  console.log("볼륨 컨트롤 초기화 시작...");

  // BGM 볼륨 컨트롤 설정
  const bgmVolumeInput = document.getElementById("scene-bgm-volume") as HTMLInputElement;
  if (bgmVolumeInput) {
    // 저장된 값 불러오기 (기본값 100%)
    const savedBGMVolume = loadVolumeFromStorage(STORAGE_KEYS.BGM_VOLUME);
    bgmVolumeInput.value = savedBGMVolume.toString();
    bgmVolumeInput.min = "0";
    bgmVolumeInput.max = "100";

    console.log(`BGM 볼륨 컨트롤 초기화: ${savedBGMVolume}%`);

    // 기존 이벤트 리스너 제거 후 새로 추가 (중복 방지)
    bgmVolumeInput.removeEventListener("input", handleBGMVolumeChange);
    bgmVolumeInput.addEventListener("input", handleBGMVolumeChange);

    // 초기 볼륨 적용
    const normalizedVolume = savedBGMVolume / 100;
    const globalAudioManager = (window as any).globalAudioManager;
    const globalIntroAudioManager = (window as any).globalIntroAudioManager;

    if (globalAudioManager && globalAudioManager.setVolume) {
      globalAudioManager.setVolume(normalizedVolume);
    }
    if (globalIntroAudioManager && globalIntroAudioManager.setVolume) {
      globalIntroAudioManager.setVolume(normalizedVolume);
    }

    console.log(`BGM 볼륨 초기화: ${savedBGMVolume}%`);
  }

  // 효과음 볼륨 컨트롤 설정
  const soundEffectVolumeInput = document.getElementById("scene-sound-effect-volume") as HTMLInputElement;
  if (soundEffectVolumeInput) {
    // 저장된 값 불러오기 (기본값 100%)
    const savedSoundEffectVolume = loadVolumeFromStorage(STORAGE_KEYS.SOUND_EFFECT_VOLUME);
    soundEffectVolumeInput.value = savedSoundEffectVolume.toString();
    soundEffectVolumeInput.min = "0";
    soundEffectVolumeInput.max = "100";

    console.log(`효과음 볼륨 컨트롤 초기화: ${savedSoundEffectVolume}%`);

    // 기존 이벤트 리스너 제거 후 새로 추가 (중복 방지)
    soundEffectVolumeInput.removeEventListener("input", handleSoundEffectVolumeChange);
    soundEffectVolumeInput.addEventListener("input", handleSoundEffectVolumeChange);

    // 초기 볼륨 적용
    const normalizedSoundEffectVolume = savedSoundEffectVolume / 100;
    (window as any).soundEffectVolume = normalizedSoundEffectVolume;

    // 실제 효과음 볼륨 적용
    setClickSoundVolume(normalizedSoundEffectVolume);

    console.log(`효과음 볼륨 초기화: ${savedSoundEffectVolume}%`);
  }

  console.log("볼륨 컨트롤 초기화 완료");
}

/**
 * 볼륨 컨트롤 모듈 초기화 (외부에서 호출)
 */
export function initVolumeControls(): void {
  // DOM이 준비되면 초기화
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", initializeVolumeControls);
  } else {
    initializeVolumeControls();
  }

  // 설정 팝업이 열릴 때마다 볼륨 컨트롤 재초기화
  document.addEventListener("click", (event) => {
    const target = event.target as HTMLElement;
    if (target.closest(".setting-button")) {
      // 설정 버튼 클릭 시 가상 스크롤이 완료된 후 볼륨 컨트롤 초기화
      setTimeout(() => {
        initializeVolumeControls();
      }, 500); // 가상 스크롤 초기화 시간을 고려하여 지연 시간 증가
    }
  });

  // 가상 스크롤이 아이템을 추가한 후에도 초기화
  const observer = new MutationObserver((mutations) => {
    mutations.forEach((mutation) => {
      mutation.addedNodes.forEach((node) => {
        if (node.nodeType === Node.ELEMENT_NODE) {
          const element = node as Element;
          // 설정 팝업의 가상 스크롤 컨테이너에 아이템이 추가되면 볼륨 컨트롤 초기화
          if (
            element.classList.contains("setting-virtual-scroll-container") ||
            element.querySelector("#scene-bgm-volume") ||
            element.querySelector("#scene-sound-effect-volume")
          ) {
            setTimeout(() => {
              initializeVolumeControls();
            }, 100);
          }
        }
      });
    });
  });

  // body 전체를 관찰하여 동적으로 추가되는 요소 감지
  observer.observe(document.body, {
    childList: true,
    subtree: true,
  });

  // 디버깅 함수를 전역에서 사용할 수 있도록 노출
  (window as any).debugVolumeStatus = debugVolumeStatus;
}

/**
 * 현재 BGM 볼륨 반환
 */
export function getBGMVolume(): number {
  return loadVolumeFromStorage(STORAGE_KEYS.BGM_VOLUME);
}

/**
 * 현재 효과음 볼륨 반환
 */
export function getSoundEffectVolume(): number {
  return loadVolumeFromStorage(STORAGE_KEYS.SOUND_EFFECT_VOLUME);
}

/**
 * BGM 볼륨 설정 (프로그래밍 방식)
 */
export function setBGMVolume(volume: number): void {
  const clampedVolume = Math.max(0, Math.min(100, volume));
  saveVolumeToStorage(STORAGE_KEYS.BGM_VOLUME, clampedVolume);

  const bgmVolumeInput = document.getElementById("scene-bgm-volume") as HTMLInputElement;
  if (bgmVolumeInput) {
    bgmVolumeInput.value = clampedVolume.toString();
  }

  // 실제 BGM 볼륨 적용
  const normalizedVolume = clampedVolume / 100;
  const globalAudioManager = (window as any).globalAudioManager;
  const globalIntroAudioManager = (window as any).globalIntroAudioManager;

  if (globalAudioManager && globalAudioManager.setVolume) {
    globalAudioManager.setVolume(normalizedVolume);
  }
  if (globalIntroAudioManager && globalIntroAudioManager.setVolume) {
    globalIntroAudioManager.setVolume(normalizedVolume);
  }
}

/**
 * 효과음 볼륨 설정 (프로그래밍 방식)
 */
export function setSoundEffectVolume(volume: number): void {
  const clampedVolume = Math.max(0, Math.min(100, volume));
  saveVolumeToStorage(STORAGE_KEYS.SOUND_EFFECT_VOLUME, clampedVolume);

  const soundEffectVolumeInput = document.getElementById("scene-sound-effect-volume") as HTMLInputElement;
  if (soundEffectVolumeInput) {
    soundEffectVolumeInput.value = clampedVolume.toString();
  }

  // 전역 변수로 설정
  const normalizedVolume = clampedVolume / 100;
  (window as any).soundEffectVolume = normalizedVolume;

  // 실제 효과음 볼륨 적용
  setClickSoundVolume(normalizedVolume);
}

/**
 * 디버깅용 함수 - 현재 볼륨 상태 확인
 */
export function debugVolumeStatus(): void {
  console.log("=== 볼륨 상태 디버깅 ===");

  const bgmInput = document.getElementById("scene-bgm-volume") as HTMLInputElement;
  const soundEffectInput = document.getElementById("scene-sound-effect-volume") as HTMLInputElement;

  console.log("BGM input 요소:", bgmInput);
  console.log("효과음 input 요소:", soundEffectInput);

  if (bgmInput) {
    console.log("BGM input 값:", bgmInput.value);
    console.log("BGM input min/max:", bgmInput.min, bgmInput.max);
  }

  if (soundEffectInput) {
    console.log("효과음 input 값:", soundEffectInput.value);
    console.log("효과음 input min/max:", soundEffectInput.min, soundEffectInput.max);
  }

  console.log("로컬스토리지 BGM 볼륨:", localStorage.getItem(STORAGE_KEYS.BGM_VOLUME));
  console.log("로컬스토리지 효과음 볼륨:", localStorage.getItem(STORAGE_KEYS.SOUND_EFFECT_VOLUME));

  const globalAudioManager = (window as any).globalAudioManager;
  const globalIntroAudioManager = (window as any).globalIntroAudioManager;

  console.log("전역 BGM 매니저:", globalAudioManager);
  console.log("전역 인트로 BGM 매니저:", globalIntroAudioManager);

  if (globalAudioManager) {
    console.log("BGM 매니저 볼륨:", globalAudioManager.getVolume());
  }

  console.log("전역 효과음 볼륨:", (window as any).soundEffectVolume);
  console.log("========================");
}
