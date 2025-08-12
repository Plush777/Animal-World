interface Letter {
  char: string;
  x: number;
  y: number;
  targetY: number;
  velocity: number;
  opacity: number;
  delay: number;
  isAnimating: boolean;
  fontSize: number;
  width: number;
  height: number;
  imageData?: ImageData;
}

class IntroLogoAnimation {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private letters: Letter[] = [];
  private animationId: number | null = null;
  private startTime: number = 0;
  private isLoaded: boolean = false;
  private svgImage: HTMLImageElement | null = null;

  constructor() {
    this.canvas = document.getElementById(
      "intro-logo-canvas"
    ) as HTMLCanvasElement;
    if (!this.canvas) {
      console.error("Canvas element not found");
      return;
    }

    this.ctx = this.canvas.getContext("2d")!;
    this.init();
  }

  private init(): void {
    this.setupCanvas();
    this.loadSVG();
  }

  private setupCanvas(): void {
    // 캔버스 크기 설정 - 반응형
    const container = this.canvas.parentElement;
    if (container) {
      const rect = container.getBoundingClientRect();
      this.canvas.width = rect.width;
      this.canvas.height = rect.height;
    } else {
      // 기본 크기 설정
      this.canvas.width = 1010;
      this.canvas.height = 246;
    }

    // 고해상도 디스플레이 지원
    const dpr = window.devicePixelRatio || 1;
    const displayWidth = this.canvas.width;
    const displayHeight = this.canvas.height;

    this.canvas.style.width = displayWidth + "px";
    this.canvas.style.height = displayHeight + "px";

    this.canvas.width = displayWidth * dpr;
    this.canvas.height = displayHeight * dpr;

    this.ctx.scale(dpr, dpr);

    // 배경을 투명하게 설정
    this.ctx.clearRect(0, 0, displayWidth, displayHeight);
  }

  private async loadSVG(): Promise<void> {
    try {
      // SVG를 이미지로 로드
      this.svgImage = new Image();
      this.svgImage.crossOrigin = "anonymous";

      this.svgImage.onload = () => {
        this.createLettersFromSVG();
        this.isLoaded = true;
        this.startAnimation();
      };

      this.svgImage.onerror = () => {
        console.error("SVG 이미지 로드 실패");
        // 폴백: 기본 텍스트 사용
        this.createLetters("Animal World!");
        this.isLoaded = true;
        this.startAnimation();
      };

      this.svgImage.src = "/images/logo/logo-intro.svg";
    } catch (error) {
      console.error("SVG 로드 실패:", error);
      // 폴백: 기본 텍스트 사용
      this.createLetters("Animal World!");
      this.isLoaded = true;
      this.startAnimation();
    }
  }

  private createLettersFromSVG(): void {
    if (!this.svgImage) return;

    const canvasWidth = this.canvas.width;
    const canvasHeight = this.canvas.height;

    // SVG 이미지를 캔버스에 그려서 픽셀 데이터 추출
    const tempCanvas = document.createElement("canvas");
    const tempCtx = tempCanvas.getContext("2d")!;

    tempCanvas.width = this.svgImage.width;
    tempCanvas.height = this.svgImage.height;

    tempCtx.drawImage(this.svgImage, 0, 0);

    // 텍스트를 글자별로 분할 (더 정확한 너비 계산)
    const text = "Animal World!";

    // 각 글자의 대략적인 너비 비율 (실제 폰트에 따라 조정 가능)
    const letterWidthRatios = [
      1.2, // A
      0.8, // n
      0.6, // i
      0.8, // m
      0.8, // a
      0.6, // l
      0.3, // (space)
      1.2, // W
      0.8, // o
      0.8, // r
      0.6, // l
      0.8, // d
      0.3, // !
    ];

    const totalRatio = letterWidthRatios.reduce((sum, ratio) => sum + ratio, 0);
    const letterHeight = this.svgImage.height;

    let currentX = 0;

    this.letters = text.split("").map((char, index) => {
      const letterWidth =
        (this.svgImage!.width * letterWidthRatios[index]) / totalRatio;
      const x = currentX;
      const y = 0;
      const width = letterWidth;
      const height = letterHeight;

      // 해당 영역의 이미지 데이터 추출
      const imageData = tempCtx.getImageData(x, y, width, height);

      const letter = {
        char,
        x: (canvasWidth - this.svgImage!.width) / 2 + x,
        y: -letterHeight, // 시작 위치 (화면 위)
        targetY: (canvasHeight - letterHeight) / 2, // 목표 위치
        velocity: 0,
        opacity: 0,
        delay: index * 100, // 각 글자마다 100ms 지연
        isAnimating: false,
        fontSize: letterHeight * 0.8,
        width,
        height,
        imageData,
      };

      currentX += letterWidth;
      return letter;
    });
  }

  private createLetters(text: string): void {
    const canvasWidth = this.canvas.width;
    const canvasHeight = this.canvas.height;

    // 반응형 폰트 크기 계산
    const baseFontSize = Math.min(canvasWidth / 20, canvasHeight / 5, 48);
    const letterSpacing = baseFontSize * 0.1;

    // 텍스트 중앙 정렬을 위한 계산
    this.ctx.font = `${baseFontSize}px Arial, sans-serif`;
    const textWidth = this.ctx.measureText(text).width;
    const startX = (canvasWidth - textWidth) / 2;
    const startY = canvasHeight / 2;

    this.letters = text.split("").map((char, index) => ({
      char,
      x: startX + index * (baseFontSize + letterSpacing),
      y: -baseFontSize, // 시작 위치 (화면 위)
      targetY: startY, // 목표 위치
      velocity: 0,
      opacity: 0,
      delay: index * 100, // 각 글자마다 100ms 지연
      isAnimating: false,
      fontSize: baseFontSize,
      width: baseFontSize,
      height: baseFontSize,
    }));
  }

  private startAnimation(): void {
    this.startTime = performance.now();
    this.animate();
  }

  private animate(): void {
    const currentTime = performance.now();
    const elapsed = currentTime - this.startTime;

    this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);

    this.letters.forEach((letter, index) => {
      if (elapsed >= letter.delay) {
        if (!letter.isAnimating) {
          letter.isAnimating = true;
          letter.opacity = 1;
        }

        // 중력 효과로 떨어지는 애니메이션
        if (letter.y < letter.targetY) {
          letter.velocity += 0.5; // 중력
          letter.y += letter.velocity;

          // 바운스 효과
          if (letter.y >= letter.targetY) {
            letter.y = letter.targetY;
            letter.velocity = -letter.velocity * 0.6; // 바운스 감쇠

            // 작은 바운스가 끝나면 정지
            if (Math.abs(letter.velocity) < 1) {
              letter.velocity = 0;
            }
          }
        }

        // 글자 그리기
        this.ctx.save();
        this.ctx.globalAlpha = letter.opacity;

        if (letter.imageData && this.svgImage) {
          // SVG 이미지 데이터를 사용하여 그리기
          const tempCanvas = document.createElement("canvas");
          const tempCtx = tempCanvas.getContext("2d")!;
          tempCanvas.width = letter.width;
          tempCanvas.height = letter.height;

          tempCtx.putImageData(letter.imageData, 0, 0);
          this.ctx.drawImage(tempCanvas, letter.x, letter.y);
        } else {
          // 폴백: 텍스트 그리기
          this.ctx.font = `${letter.fontSize}px Arial, sans-serif`;
          this.ctx.fillStyle = "#ffffff";
          this.ctx.textAlign = "left";
          this.ctx.textBaseline = "middle";
          this.ctx.fillText(letter.char, letter.x, letter.y);
        }

        this.ctx.restore();
      }
    });

    // 모든 글자가 애니메이션을 완료했는지 확인
    const allComplete = this.letters.every(
      (letter) =>
        letter.isAnimating &&
        Math.abs(letter.velocity) < 1 &&
        letter.y >= letter.targetY
    );

    if (!allComplete) {
      this.animationId = requestAnimationFrame(() => this.animate());
    } else {
      // 애니메이션 완료 후 약간의 지연 후 반복
      setTimeout(() => {
        this.resetAnimation();
        this.startAnimation();
      }, 2000);
    }
  }

  private resetAnimation(): void {
    this.letters.forEach((letter) => {
      letter.y = -letter.height;
      letter.velocity = 0;
      letter.opacity = 0;
      letter.isAnimating = false;
    });
  }

  public destroy(): void {
    if (this.animationId) {
      cancelAnimationFrame(this.animationId);
    }
  }
}

// 페이지 로드 시 애니메이션 시작
document.addEventListener("DOMContentLoaded", () => {
  new IntroLogoAnimation();
});

export default IntroLogoAnimation;
