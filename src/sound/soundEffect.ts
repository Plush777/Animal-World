import { Howl } from "howler";

let clickSound: Howl | null = null;

/**
 * 효과음 볼륨 설정
 */
export function setSoundEffectVolume(volume: number): void {
  if (clickSound) {
    clickSound.volume(volume);
  }
}

export function initClickSound(src: string, volume: number = 1, selector: string = 'button, input[type="checkbox"], a') {
  // 기존 사운드가 있다면 해제
  if (clickSound) {
    clickSound.unload();
  }

  // 새 사운드 생성
  clickSound = new Howl({
    src: [src],
    volume: volume,
  });

  // 모든 버튼 요소에 이벤트 리스너 추가
  document.querySelectorAll(selector).forEach((element) => {
    // 이미 이벤트 리스너가 있는지 확인
    if (!element.hasAttribute("data-click-sound-added")) {
      element.addEventListener("click", () => {
        if (clickSound) {
          clickSound.play();
        }
      });
      element.setAttribute("data-click-sound-added", "true");
    }
  });

  // 동적으로 추가되는 버튼들을 위한 MutationObserver
  const observer = new MutationObserver((mutations) => {
    mutations.forEach((mutation) => {
      mutation.addedNodes.forEach((node) => {
        if (node.nodeType === Node.ELEMENT_NODE) {
          const element = node as Element;
          // 새로 추가된 버튼들에 소리 효과 추가
          const buttons = element.querySelectorAll(selector);
          if (buttons.length > 0) {
            buttons.forEach((button) => {
              if (!button.hasAttribute("data-click-sound-added")) {
                button.addEventListener("click", () => {
                  if (clickSound) {
                    clickSound.play();
                  }
                });
                button.setAttribute("data-click-sound-added", "true");
              }
            });
          }
        }
      });
    });
  });

  // DOM 변화 감지 시작
  observer.observe(document.body, {
    childList: true,
    subtree: true,
  });
}
