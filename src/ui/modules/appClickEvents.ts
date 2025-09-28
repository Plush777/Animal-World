import { sceneHtml } from "../../data/sceneHtml";
import { getAvailableEmojis, localEmojiCache } from "./emoji";

// 이모지 클릭 처리 함수
export function handleEmojiClick(emojiText: string, emojiElement?: HTMLElement) {
  console.log("이모지 클릭됨:", emojiText);

  // 캐릭터 위에 이모지 표시
  showEmojiAboveCharacter(emojiText, emojiElement);

  // 웹소켓을 통해 다른 사용자에게 이모지 전송
  if ((window as any).chatSystem && (window as any).chatSystem.socket) {
    const socket = (window as any).chatSystem.socket;
    socket.emit("emoji", {
      emoji: emojiText,
      timestamp: new Date().toISOString(),
    });
  }
}

// 이모지 렌더 순서 관리를 위한 전역 변수
let nextEmojiRenderOrder = 1000;

// 캐릭터 위에 이모지를 표시하는 함수
async function showEmojiAboveCharacter(emojiText: string, _emojiElement?: HTMLElement) {
  const characterManager = (window as any).globalCharacterManager;
  const scene = (window as any).globalScene;

  if (!characterManager || !scene) {
    console.warn("캐릭터 매니저나 씬이 초기화되지 않았습니다.");
    return;
  }

  const characters = characterManager.getAllCharacters();
  if (characters.length === 0) {
    console.warn("표시할 캐릭터가 없습니다.");
    return;
  }

  const currentCharacter = characters[0];
  const characterPosition = currentCharacter.model.position.clone();

  // 현재 이모지의 고유한 renderOrder 할당 (숫자가 클수록 앞에 렌더링)
  const currentRenderOrder = nextEmojiRenderOrder++;

  try {
    // 로컬 SVG 이모지 로드 (캐시 사용)
    const canvas = await localEmojiCache.getEmoji(emojiText);

    // Three.js 텍스처 생성
    const texture = new (window as any).THREE.CanvasTexture(canvas);
    texture.colorSpace = (window as any).THREE.SRGBColorSpace;
    texture.minFilter = (window as any).THREE.LinearFilter;
    texture.magFilter = (window as any).THREE.LinearFilter;
    texture.generateMipmaps = false;
    texture.flipY = false;
    texture.premultiplyAlpha = false;

    const material = new (window as any).THREE.SpriteMaterial({
      map: texture,
      transparent: true,
      alphaTest: 0.001,
      depthTest: false,
      depthWrite: false,
      toneMapped: false,
    });

    const sprite = new (window as any).THREE.Sprite(material);

    // 먼저 생성된 이모지가 더 높은 renderOrder를 가지도록 설정
    // (나중에 생성된 이모지는 더 낮은 값을 가져서 뒤로 렌더링됨)
    sprite.renderOrder = currentRenderOrder;
    sprite.scale.set(10, 10, 10);

    // 위치를 약간씩 랜덤하게 조정하여 겹침 방지
    // const randomOffset = {
    //   x: (Math.random() - 0.5) * 5, // -2.5 ~ 2.5
    //   z: (Math.random() - 0.5) * 5, // -2.5 ~ 2.5
    // };

    sprite.position.copy(characterPosition);
    sprite.position.y += 30;
    // sprite.position.x += randomOffset.x;
    // sprite.position.z += randomOffset.z;

    scene.add(sprite);
    animateEmojiSprite(sprite, scene);
  } catch (error) {
    console.error("이모지 로드 실패:", error);
  }
}

// 이모지 스프라이트 애니메이션
function animateEmojiSprite(sprite: any, scene: any) {
  const startTime = Date.now();
  const duration = 3000;
  const startY = sprite.position.y;
  const endY = startY + 20;

  const animate = () => {
    const elapsed = Date.now() - startTime;
    const progress = elapsed / duration;

    if (progress >= 1) {
      scene.remove(sprite);
      sprite.material.dispose();
      sprite.material.map.dispose();
      return;
    }

    sprite.position.y = startY + (endY - startY) * progress;
    const fadeProgress = Math.max(0, (progress - 0.7) / 0.3);
    sprite.material.opacity = 1 - fadeProgress;

    requestAnimationFrame(animate);
  };

  animate();
}

export function emojiToggle(e: Event) {
  const emojiWrapper = document.querySelector(".chat-emoji-wrapper") as HTMLElement;
  const emojiButton = document.querySelector(".chat-emoji-button") as HTMLElement;
  e.stopPropagation();

  emojiWrapper && emojiWrapper.classList.toggle("active");
  emojiButton && emojiButton.setAttribute("aria-expanded", emojiWrapper.classList.contains("active") ? "true" : "false");
}

export function appClickEvents() {
  const app = document.querySelector("#app") as HTMLElement;

  if (app) {
    app.addEventListener("click", (e) => {
      const target = e.target as HTMLElement;
      const closeButton = document.querySelector(".chat-close-button") as HTMLElement;
      const emojiButton = document.querySelector(".chat-emoji-button") as HTMLElement;
      const chatOpenButton = document.querySelector(".chat-open-button") as HTMLElement;

      // credit-close-button 클릭 시에는 이벤트 전파를 막지 않음
      if (!target.closest("#credit-close-button")) {
        e.stopPropagation();
      }

      const chatWrapper = document.querySelector(".chat-wrapper") as HTMLElement;
      if (chatWrapper && target === closeButton) {
        console.log(target);
        chatWrapper.classList.remove("active");
      }

      if (chatWrapper && target === chatOpenButton) {
        console.log(target);
        chatWrapper.classList.add("active");
      }

      const emojiWrapper = document.querySelector(".chat-emoji-wrapper") as HTMLElement;

      if (emojiWrapper && target === emojiButton) {
        emojiToggle(e);
      }

      // 이모지 버튼 클릭 이벤트 처리
      if (target.classList.contains("chat-emoji-list-button")) {
        const emojiText = target.textContent?.trim();
        if (emojiText) {
          handleEmojiClick(emojiText, target);
        }
      }

      const mapExploreCheckbox = document.getElementById("map-explore") as HTMLInputElement;
      const toast = document.getElementById("toast") as HTMLElement;

      //mapExploreCheckbox 체크박스가 존재하고 체크되어 있을 때
      if (mapExploreCheckbox?.checked && target === mapExploreCheckbox) {
        toast.innerHTML = sceneHtml.toast.mapExploreOn;

        // 이전 타이머가 있다면 정리
        if (window.toastTimers) {
          window.toastTimers.forEach((timerId: number | NodeJS.Timeout) => clearTimeout(timerId as any));
        }

        // 새로운 타이머 ID들을 저장할 배열
        window.toastTimers = [];

        const timer1 = setTimeout(() => {
          const toastWrapper = document.querySelector(".toast-wrapper") as HTMLElement;
          if (toastWrapper) {
            toastWrapper.classList.add("active");
          }
        }, 1);

        window.toastTimers.push(timer1);
      }

      const toastCloseButton = document.querySelector(".toast-close-button") as HTMLElement;

      if (toast && target === toastCloseButton) {
        toast.classList.remove("active");
        toast.innerHTML = "";
      }
    });
  }
}

// 전역에서 접근할 수 있도록 함수 노출
(window as any).handleEmojiClick = handleEmojiClick;
(window as any).getAvailableEmojis = getAvailableEmojis;
(window as any).appClickEvents = appClickEvents;
