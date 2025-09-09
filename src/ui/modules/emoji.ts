const emojiSVGMap: { [key: string]: string } = {
  "👍": "/images/twemoji/thumbs-up.svg",
  "👏": "/images/twemoji/clap.svg",
  "❤️": "/images/twemoji/heart.svg",
  "👋": "/images/twemoji/wave.svg",
  "😆": "/images/twemoji/fun.svg",
  "😢": "/images/twemoji/cry.svg",
};

// SVG 파일에서 이모지를 로드하는 함수
async function loadLocalSVGEmoji(emoji: string): Promise<HTMLCanvasElement> {
  return new Promise((resolve, _reject) => {
    const svgPath = emojiSVGMap[emoji];

    if (!svgPath) {
      console.warn(`로컬 SVG를 찾을 수 없음: ${emoji}, 텍스트 이모지 사용`);
      resolve(createFallbackCanvas(emoji));
      return;
    }

    const img = new Image();

    img.onload = () => {
      const canvas = document.createElement("canvas");
      const context = canvas.getContext("2d")!;

      const scale = 4;
      const size = 256;
      canvas.width = size * scale;
      canvas.height = size * scale;

      // Y축 뒤집기를 보정하기 위한 변환
      context.scale(scale, -scale);
      context.translate(0, -size);

      context.imageSmoothingEnabled = true;
      context.imageSmoothingQuality = "high";
      context.drawImage(img, 0, 0, size, size);

      resolve(canvas);
    };

    img.onerror = () => {
      console.warn(`SVG 로드 실패: ${svgPath}, 텍스트 이모지 사용`);
      resolve(createFallbackCanvas(emoji));
    };

    // 로컬 파일이므로 CORS 설정 불필요
    img.src = svgPath;
  });
}

// 폴백용 텍스트 이모지 캔버스
function createFallbackCanvas(emoji: string): HTMLCanvasElement {
  const canvas = document.createElement("canvas");
  const context = canvas.getContext("2d")!;

  const scale = 4;
  const size = 256;
  canvas.width = size * scale;
  canvas.height = size * scale;

  context.scale(scale, -scale);
  context.translate(0, -size);

  context.font = `${Math.floor(size * 0.6)}px "Apple Color Emoji", "Segoe UI Emoji", "Noto Color Emoji"`;
  context.textAlign = "center";
  context.textBaseline = "middle";
  context.fillText(emoji, size / 2, size / 2);

  return canvas;
}

class LocalEmojiCache {
  private cache: Map<string, HTMLCanvasElement> = new Map();
  private maxSize: number = 50;

  async getEmoji(emoji: string): Promise<HTMLCanvasElement> {
    if (this.cache.has(emoji)) {
      return this.cache.get(emoji)!;
    }

    // 로컬 SVG 로드 시도 (빠른 방법 우선)
    const canvas = await loadLocalSVGEmoji(emoji);

    if (this.cache.size >= this.maxSize) {
      const firstKey = this.cache.keys().next().value;
      this.cache.delete(firstKey!);
    }

    this.cache.set(emoji, canvas);
    return canvas;
  }

  // 사용 가능한 이모지 목록 반환
  getAvailableEmojis(): string[] {
    return Object.keys(emojiSVGMap);
  }

  // 이모지가 로컬에 있는지 확인
  hasLocalEmoji(emoji: string): boolean {
    return emoji in emojiSVGMap;
  }
}

const localEmojiCache = new LocalEmojiCache();

function getAvailableEmojis(): string[] {
  return localEmojiCache.getAvailableEmojis();
}

function hasLocalEmoji(emoji: string): boolean {
  return localEmojiCache.hasLocalEmoji(emoji);
}

export { localEmojiCache, getAvailableEmojis, hasLocalEmoji };
