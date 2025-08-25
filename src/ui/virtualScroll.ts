interface VirtualScrollOptions {
  container: HTMLElement;
  itemHeight?: number;
  smoothScroll?: boolean;
  scrollDuration?: number;
  showScrollbar?: boolean;
  // 팝업 환경을 위한 추가 옵션들
  autoResize?: boolean; // 컨테이너 크기 변화 자동 감지
  scrollbarWidth?: number; // 스크롤바 너비
  scrollbarColor?: string; // 스크롤바 색상
  scrollbarTrackColor?: string; // 스크롤바 트랙 색상
  scrollbarThumbColor?: string; // 스크롤바 썸 색상
  scrollbarRadius?: number; // 스크롤바 둥근 모서리
  containerClass?: string; // 스크롤 컨테이너 클래스명
  scrollbarClass?: string; // 스크롤바 클래스명
  scrollbarThumbClass?: string; // 스크롤바 썸 클래스명
  enableTouchScroll?: boolean; // 터치 스크롤 활성화
  touchSensitivity?: number; // 터치 스크롤 감도
  maxScrollSpeed?: number; // 최대 스크롤 속도
  scrollMargin?: number; // 스크롤 여백
}

export class VirtualScroll {
  private container: HTMLElement;
  private itemHeight: number;
  private smoothScroll: boolean;
  protected scrollContainer: HTMLElement | null = null;
  private scrollbar: HTMLElement | null = null;
  private scrollbarThumb: HTMLElement | null = null;
  private scrollDuration: number;
  private showScrollbar: boolean;

  // 팝업 환경을 위한 추가 속성들
  private autoResize: boolean;

  private containerClass: string;
  private scrollbarClass: string;
  private scrollbarThumbClass: string;
  private enableTouchScroll: boolean;
  private touchSensitivity: number;
  private maxScrollSpeed: number;
  protected scrollMargin: number;

  protected items: HTMLElement[] = [];
  protected scrollTop: number = 0;
  protected containerHeight: number = 0;
  protected totalHeight: number = 0;

  private scrollAnimationId: number | null = null;
  private isDragging: boolean = false;
  private dragStartY: number = 0;

  // 터치 스크롤을 위한 속성들
  private touchStartY: number = 0;
  private touchStartScrollTop: number = 0;
  private isTouching: boolean = false;
  private lastTouchTime: number = 0;
  private touchVelocity: number = 0;

  // ResizeObserver를 위한 속성
  private resizeObserver: ResizeObserver | null = null;

  constructor(options: VirtualScrollOptions) {
    this.container = options.container;
    this.itemHeight = options.itemHeight || 80;
    this.smoothScroll = options.smoothScroll ?? true;
    this.scrollDuration = options.scrollDuration || 250;
    this.showScrollbar = options.showScrollbar ?? true;

    // 팝업 환경을 위한 옵션들 초기화
    this.autoResize = options.autoResize ?? true;
    this.containerClass = options.containerClass || "virtual-scroll-container";
    this.scrollbarClass = options.scrollbarClass || "virtual-scrollbar";
    this.scrollbarThumbClass = options.scrollbarThumbClass || "virtual-scrollbar-thumb";
    this.enableTouchScroll = options.enableTouchScroll ?? true;
    this.touchSensitivity = options.touchSensitivity || 1;
    this.maxScrollSpeed = options.maxScrollSpeed || 50;
    this.scrollMargin = options.scrollMargin || 8;

    this.init();
  }

  private init(): void {
    this.containerHeight = this.container.clientHeight;
    this.setupContainer();
    if (this.showScrollbar) {
      this.setupScrollbar();
    }
    this.bindEvents();

    // ResizeObserver 설정 (팝업 리사이즈 감지)
    if (this.autoResize && window.ResizeObserver) {
      this.setupResizeObserver();
    }
  }

  private setupContainer(): void {
    // 내부 스크롤 컨테이너 생성
    const scrollContainer = document.createElement("div");

    scrollContainer.classList.add(this.containerClass);

    scrollContainer.style.top = "0";
    scrollContainer.style.transform = "translateY(0px)";

    this.container.appendChild(scrollContainer);
    this.scrollContainer = scrollContainer;
  }

  private setupScrollbar(): void {
    // 스크롤바 컨테이너 생성
    const scrollbar = document.createElement("div");
    scrollbar.classList.add(this.scrollbarClass);

    scrollbar.style.height = "100%";

    // 스크롤바 썸 생성
    const scrollbarThumb = document.createElement("div");
    scrollbarThumb.classList.add(this.scrollbarThumbClass);

    scrollbar.appendChild(scrollbarThumb);
    this.container.appendChild(scrollbar);

    this.scrollbar = scrollbar;
    this.scrollbarThumb = scrollbarThumb;
  }

  private setupResizeObserver(): void {
    this.resizeObserver = new ResizeObserver((entries) => {
      for (const entry of entries) {
        if (entry.target === this.container) {
          this.handleResize();
        }
      }
    });

    this.resizeObserver.observe(this.container);
  }

  private bindEvents(): void {
    // 휠 이벤트 처리 (부드러운 스크롤)
    this.container.addEventListener("wheel", this.handleWheel.bind(this), { passive: false });

    // 리사이즈 이벤트 처리 (ResizeObserver가 없을 때의 fallback)
    if (!this.resizeObserver) {
      window.addEventListener("resize", this.handleResize.bind(this));
    }

    // 스크롤바 드래그 이벤트
    if (this.scrollbarThumb) {
      this.scrollbarThumb.addEventListener("mousedown", this.handleScrollbarMouseDown.bind(this));
    }

    // 스크롤바 영역 클릭 이벤트
    if (this.scrollbar) {
      this.scrollbar.addEventListener("click", this.handleScrollbarClick.bind(this));
    }

    // 터치 스크롤 이벤트 (모바일/팝업 환경)
    if (this.enableTouchScroll) {
      this.container.addEventListener("touchstart", this.handleTouchStart.bind(this), { passive: false });
      this.container.addEventListener("touchmove", this.handleTouchMove.bind(this), { passive: false });
      this.container.addEventListener("touchend", this.handleTouchEnd.bind(this), { passive: false });
    }
  }

  private handleWheel(e: WheelEvent): void {
    if (!this.smoothScroll) return;

    e.preventDefault();

    const delta = e.deltaY;
    const currentScrollTop = this.scrollTop;
    const maxScrollTop = this.totalHeight - this.containerHeight + this.scrollMargin;
    const newScrollTop = Math.max(0, Math.min(maxScrollTop, currentScrollTop + delta));

    this.smoothScrollTo(newScrollTop);
  }

  private handleTouchStart(e: TouchEvent): void {
    if (e.touches.length !== 1) return;

    e.preventDefault();
    this.isTouching = true;
    this.touchStartY = e.touches[0].clientY;
    this.touchStartScrollTop = this.scrollTop;
    this.lastTouchTime = Date.now();
    this.touchVelocity = 0;
  }

  private handleTouchMove(e: TouchEvent): void {
    if (!this.isTouching || e.touches.length !== 1) return;

    e.preventDefault();

    const currentY = e.touches[0].clientY;
    const deltaY = (this.touchStartY - currentY) * this.touchSensitivity;
    const newScrollTop = this.touchStartScrollTop + deltaY;

    const maxScrollTop = this.totalHeight - this.containerHeight + this.scrollMargin;
    this.scrollTop = Math.max(0, Math.min(maxScrollTop, newScrollTop));

    if (this.scrollContainer) {
      this.scrollContainer.style.transform = `translateY(-${this.scrollTop}px)`;
    }

    this.updateScrollbarThumb();

    // 터치 속도 계산
    const currentTime = Date.now();
    const timeDelta = currentTime - this.lastTouchTime;
    if (timeDelta > 0) {
      this.touchVelocity = deltaY / timeDelta;
    }
    this.lastTouchTime = currentTime;
  }

  private handleTouchEnd(_e: TouchEvent): void {
    if (!this.isTouching) return;

    this.isTouching = false;

    // 관성 스크롤 (터치 속도 기반)
    if (Math.abs(this.touchVelocity) > 0.1) {
      const momentum = this.touchVelocity * this.maxScrollSpeed;
      const targetScrollTop = this.scrollTop + momentum;
      this.smoothScrollTo(targetScrollTop);
    }
  }

  protected handleResize(): void {
    this.containerHeight = this.container.clientHeight;
    this.updateScrollbarThumb();
  }

  private smoothScrollTo(targetScrollTop: number): void {
    if (this.scrollAnimationId) {
      cancelAnimationFrame(this.scrollAnimationId);
    }

    const maxScrollTop = this.totalHeight - this.containerHeight + this.scrollMargin;
    const clampedTargetScrollTop = Math.max(0, Math.min(maxScrollTop, targetScrollTop));

    const startScrollTop = this.scrollTop;
    const distance = clampedTargetScrollTop - startScrollTop;
    const startTime = performance.now();

    const animate = (currentTime: number) => {
      const elapsed = currentTime - startTime;
      const progress = Math.min(elapsed / this.scrollDuration, 1);

      // easeOutCubic 함수
      const easeProgress = 1 - Math.pow(1 - progress, 3);

      this.scrollTop = startScrollTop + distance * easeProgress;

      // transform을 사용한 부드러운 스크롤
      if (this.scrollContainer) {
        this.scrollContainer.style.transform = `translateY(-${this.scrollTop}px)`;
      }

      // 스크롤바 썸 업데이트
      this.updateScrollbarThumb();

      if (progress < 1) {
        this.scrollAnimationId = requestAnimationFrame(animate);
      } else {
        this.scrollAnimationId = null;
      }
    };

    this.scrollAnimationId = requestAnimationFrame(animate);
  }

  private handleScrollbarMouseDown(e: MouseEvent): void {
    e.preventDefault();
    this.isDragging = true;
    this.dragStartY = e.clientY;

    document.addEventListener("mousemove", this.handleScrollbarMouseMove.bind(this));
    document.addEventListener("mouseup", this.handleScrollbarMouseUp.bind(this));
  }

  private handleScrollbarMouseMove(e: MouseEvent): void {
    if (!this.isDragging || !this.scrollbar) return;

    const deltaY = e.clientY - this.dragStartY;
    const scrollbarHeight = this.scrollbar.clientHeight;
    const thumbHeight = this.scrollbarThumb?.clientHeight || 0;
    const maxThumbOffset = scrollbarHeight - thumbHeight;

    const thumbOffset = Math.max(0, Math.min(maxThumbOffset, deltaY));
    const scrollRatio = thumbOffset / maxThumbOffset;

    const maxScrollTop = this.totalHeight - this.containerHeight + this.scrollMargin;
    const newScrollTop = scrollRatio * maxScrollTop;

    this.scrollTop = Math.max(0, Math.min(maxScrollTop, newScrollTop));

    if (this.scrollContainer) {
      this.scrollContainer.style.transform = `translateY(-${this.scrollTop}px)`;
    }

    this.updateScrollbarThumb();
  }

  private handleScrollbarMouseUp(): void {
    this.isDragging = false;
    document.removeEventListener("mousemove", this.handleScrollbarMouseMove);
    document.removeEventListener("mouseup", this.handleScrollbarMouseUp);
  }

  private handleScrollbarClick(e: MouseEvent): void {
    if (!this.scrollbar || !this.scrollbarThumb) return;

    const rect = this.scrollbar.getBoundingClientRect();
    const clickY = e.clientY - rect.top;
    const scrollbarHeight = this.scrollbar.clientHeight;
    const thumbHeight = this.scrollbarThumb.clientHeight;

    const maxScrollTop = this.totalHeight - this.containerHeight + this.scrollMargin;

    // 썸 영역 클릭이 아닌 경우에만 처리
    const thumbTop = (this.scrollTop / maxScrollTop) * (scrollbarHeight - thumbHeight);
    const thumbBottom = thumbTop + thumbHeight;

    if (clickY < thumbTop || clickY > thumbBottom) {
      const scrollRatio = clickY / scrollbarHeight;
      const newScrollTop = scrollRatio * maxScrollTop;

      this.smoothScrollTo(newScrollTop);
    }
  }

  protected updateScrollbarThumb(): void {
    if (!this.scrollbarThumb || !this.scrollbar) return;

    const scrollbarHeight = this.scrollbar.clientHeight;
    const maxScrollTop = this.totalHeight - this.containerHeight + this.scrollMargin;

    if (maxScrollTop <= 0) {
      this.scrollbarThumb.style.height = "0px";
      this.scrollbarThumb.style.display = "none";
      return;
    }

    const thumbHeight = Math.max(20, (this.containerHeight / (this.totalHeight + this.scrollMargin)) * scrollbarHeight);
    const thumbTop = (this.scrollTop / maxScrollTop) * (scrollbarHeight - thumbHeight);

    this.scrollbarThumb.style.height = `${thumbHeight}px`;
    this.scrollbarThumb.style.transform = `translateY(${thumbTop}px)`;
    this.scrollbarThumb.style.display = "block";
  }

  // 아이템 추가
  addItem(element: HTMLElement): void {
    this.items.push(element);
    this.totalHeight = this.items.length * this.itemHeight;

    if (this.scrollContainer) {
      this.scrollContainer.appendChild(element);

      // 아이템 위치 설정
      // element.style.position = "absolute";
      element.style.top = `${(this.items.length - 1) * this.itemHeight}px`;
      // element.style.width = "100%";

      // 스크롤 컨테이너 높이 업데이트
      this.scrollContainer.style.height = `${this.totalHeight + this.scrollMargin}px`;
    }
    this.updateScrollbarThumb();
  }

  // 아이템 제거
  removeItem(index: number): void {
    if (index < 0 || index >= this.items.length) return;

    const item = this.items[index];
    if (this.scrollContainer && item.parentNode === this.scrollContainer) {
      this.scrollContainer.removeChild(item);
    }

    this.items.splice(index, 1);
    this.totalHeight = this.items.length * this.itemHeight;

    // 아이템 위치 재조정
    this.items.forEach((item, i) => {
      item.style.top = `${i * this.itemHeight}px`;
    });

    if (this.scrollContainer) {
      this.scrollContainer.style.height = `${this.totalHeight + this.scrollMargin}px`;
    }

    this.updateScrollbarThumb();
  }

  // 모든 아이템 제거
  clearItems(): void {
    if (this.scrollContainer) {
      this.scrollContainer.innerHTML = "";
    }
    this.items = [];
    this.totalHeight = 0;
    this.scrollTop = 0;

    if (this.scrollContainer) {
      this.scrollContainer.style.transform = "translateY(0px)";
      this.scrollContainer.style.height = `${this.scrollMargin}px`;
    }

    this.updateScrollbarThumb();
  }

  // 맨 아래로 스크롤
  scrollToBottom(): void {
    const targetScrollTop = this.totalHeight - this.containerHeight + this.scrollMargin;
    if (this.smoothScroll) {
      this.smoothScrollTo(targetScrollTop);
    } else {
      this.scrollTop = targetScrollTop;
      if (this.scrollContainer) {
        this.scrollContainer.style.transform = `translateY(-${this.scrollTop}px)`;
      }
    }
    this.updateScrollbarThumb();
  }

  // 맨 위로 스크롤
  scrollToTop(): void {
    if (this.smoothScroll) {
      this.smoothScrollTo(0);
    } else {
      this.scrollTop = 0;
      if (this.scrollContainer) {
        this.scrollContainer.style.transform = `translateY(-${this.scrollTop}px)`;
      }
    }
    this.updateScrollbarThumb();
  }

  // 특정 위치로 스크롤
  scrollToPosition(position: number): void {
    if (this.smoothScroll) {
      this.smoothScrollTo(position);
    } else {
      this.scrollTop = position;
      if (this.scrollContainer) {
        this.scrollContainer.style.transform = `translateY(-${this.scrollTop}px)`;
      }
    }
    this.updateScrollbarThumb();
  }

  // 아이템 개수 반환
  getItemCount(): number {
    return this.items.length;
  }

  // 현재 스크롤 위치 반환
  getScrollTop(): number {
    return this.scrollTop;
  }

  // 컨테이너 높이 반환
  getContainerHeight(): number {
    return this.containerHeight;
  }

  // 전체 높이 반환
  getTotalHeight(): number {
    return this.totalHeight;
  }

  // 아이템 배열 반환
  getItems(): HTMLElement[] {
    return [...this.items];
  }

  // 특정 인덱스의 아이템 반환
  getItem(index: number): HTMLElement | null {
    return this.items[index] || null;
  }

  // 정리
  destroy(): void {
    if (this.scrollAnimationId) {
      cancelAnimationFrame(this.scrollAnimationId);
    }

    // ResizeObserver 정리
    if (this.resizeObserver) {
      this.resizeObserver.disconnect();
      this.resizeObserver = null;
    }

    // 이벤트 리스너 정리
    window.removeEventListener("resize", this.handleResize);
    this.container.removeEventListener("wheel", this.handleWheel);

    if (this.enableTouchScroll) {
      this.container.removeEventListener("touchstart", this.handleTouchStart);
      this.container.removeEventListener("touchmove", this.handleTouchMove);
      this.container.removeEventListener("touchend", this.handleTouchEnd);
    }

    // 스크롤바 이벤트 리스너 정리
    if (this.scrollbarThumb) {
      this.scrollbarThumb.removeEventListener("mousedown", this.handleScrollbarMouseDown);
    }
    if (this.scrollbar) {
      this.scrollbar.removeEventListener("click", this.handleScrollbarClick);
    }

    // 스크롤바 요소 제거
    if (this.scrollbar) {
      this.scrollbar.remove();
    }

    // 스크롤 컨테이너 요소 제거
    if (this.scrollContainer) {
      this.scrollContainer.remove();
      this.scrollContainer = null;
    }

    this.items = [];
  }
}

// 채팅 메시지용 특화된 가상 스크롤 클래스
export class ChatVirtualScroll extends VirtualScroll {
  private systemMessageHeight: number = 70; // 시스템 메시지 높이
  private userMessageHeight: number = 27; // 사용자 메시지 높이

  constructor(container: HTMLElement, options?: Partial<VirtualScrollOptions>) {
    super({
      container,
      itemHeight: 75, // 기본 채팅 메시지 높이 (시스템 메시지용)
      smoothScroll: true,
      scrollDuration: 250,
      showScrollbar: true, // 채팅 메시지용 가상 스크롤도 스크롤바 표시
      ...options, // 추가 옵션 허용
    });
  }

  // 채팅 메시지 추가 (자동으로 맨 아래로 스크롤)
  addChatMessage(messageElement: HTMLElement): void {
    // 메시지 타입에 따라 높이 결정
    const isUserMessage = messageElement.classList.contains("user-message");
    const messageHeight = isUserMessage ? this.userMessageHeight : this.systemMessageHeight;

    // 아이템 추가 시 높이 계산을 위해 메시지 요소에 높이 정보 저장
    (messageElement as any).messageHeight = messageHeight;

    this.addItem(messageElement);
    this.scrollToBottom();
  }

  // 아이템 추가 (오버라이드)
  addItem(element: HTMLElement): void {
    this.items.push(element);

    // 메시지 타입에 따라 높이 계산
    const messageHeight = (element as any).messageHeight || this.systemMessageHeight;

    // 이전 아이템들의 높이 합계 계산
    let totalHeightBefore = 0;
    for (let i = 0; i < this.items.length - 1; i++) {
      const itemHeight = (this.items[i] as any).messageHeight || this.systemMessageHeight;
      totalHeightBefore += itemHeight;
    }

    this.totalHeight = totalHeightBefore + messageHeight;

    if (this.scrollContainer) {
      this.scrollContainer.appendChild(element);

      // 아이템 위치 설정 - 누적 높이로 계산
      element.style.top = `${totalHeightBefore}px`;

      // 스크롤 컨테이너 높이 업데이트
      this.scrollContainer.style.height = `${this.totalHeight + this.scrollMargin}px`;
    }
    this.updateScrollbarThumb();
  }

  // 아이템 제거 (오버라이드)
  removeItem(index: number): void {
    if (index < 0 || index >= this.items.length) return;

    const item = this.items[index];
    if (this.scrollContainer && item.parentNode === this.scrollContainer) {
      this.scrollContainer.removeChild(item);
    }

    this.items.splice(index, 1);

    // 높이 재계산
    this.totalHeight = 0;
    this.items.forEach((item, _i) => {
      const itemHeight = (item as any).messageHeight || this.systemMessageHeight;
      this.totalHeight += itemHeight;
      item.style.top = `${this.totalHeight - itemHeight}px`;
    });

    if (this.scrollContainer) {
      this.scrollContainer.style.height = `${this.totalHeight + this.scrollMargin}px`;
    }

    this.updateScrollbarThumb();
  }

  // 새 메시지가 추가되었을 때 자동 스크롤 여부 결정
  shouldAutoScroll(): boolean {
    const scrollTop = this.getScrollTop();
    const containerHeight = this.getContainerHeight();
    const totalHeight = this.getTotalHeight();

    // 사용자가 거의 맨 아래에 있을 때만 자동 스크롤
    return scrollTop + containerHeight >= totalHeight + 8 - 100; // 기본 여백 사용
  }
}

// 팝업용 특화된 가상 스크롤 클래스
export class PopupVirtualScroll extends VirtualScroll {
  constructor(container: HTMLElement, options?: Partial<VirtualScrollOptions>) {
    super({
      container,
      itemHeight: 60, // 팝업 기본 아이템 높이
      smoothScroll: true,
      scrollDuration: 200,
      showScrollbar: true,
      autoResize: true, // 팝업 리사이즈 자동 감지
      scrollbarWidth: 6, // 팝업용 얇은 스크롤바
      scrollbarColor: "#666",
      scrollbarTrackColor: "rgba(0,0,0,0.1)",
      scrollbarThumbColor: "#999",
      scrollbarRadius: 3,
      enableTouchScroll: true,
      touchSensitivity: 1.2,
      maxScrollSpeed: 30,
      scrollMargin: 4,
      ...options,
    });
  }

  // 팝업이 열릴 때 스크롤 위치 초기화
  resetScroll(): void {
    this.scrollToTop();
  }

  // 팝업 크기 변경 시 스크롤바 업데이트
  updateForPopupResize(): void {
    this.handleResize();
  }
}
