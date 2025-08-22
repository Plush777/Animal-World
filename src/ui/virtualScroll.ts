interface VirtualScrollOptions {
  container: HTMLElement;
  itemHeight?: number;
  smoothScroll?: boolean;
  scrollDuration?: number;
  showScrollbar?: boolean;
}

export class VirtualScroll {
  private container: HTMLElement;
  private itemHeight: number;
  private smoothScroll: boolean;
  private scrollContainer: HTMLElement | null = null;
  private scrollbar: HTMLElement | null = null;
  private scrollbarThumb: HTMLElement | null = null;
  private scrollDuration: number;
  private showScrollbar: boolean;

  private items: HTMLElement[] = [];
  private scrollTop: number = 0;
  private containerHeight: number = 0;
  private totalHeight: number = 0;

  private scrollAnimationId: number | null = null;
  private isDragging: boolean = false;
  private dragStartY: number = 0;
  private dragStartScrollTop: number = 0;

  constructor(options: VirtualScrollOptions) {
    this.container = options.container;
    this.itemHeight = options.itemHeight || 80;
    this.smoothScroll = options.smoothScroll ?? true;
    this.scrollDuration = options.scrollDuration || 250;
    this.showScrollbar = options.showScrollbar ?? true;

    this.init();
  }

  private init(): void {
    this.containerHeight = this.container.clientHeight;
    this.setupContainer();
    if (this.showScrollbar) {
      this.setupScrollbar();
    }
    this.bindEvents();
  }

  private setupContainer(): void {
    // 내부 스크롤 컨테이너 생성
    const scrollContainer = document.createElement("div");

    scrollContainer.classList.add("virtual-scroll-container");

    scrollContainer.style.top = "0";
    scrollContainer.style.transform = "translateY(0px)";

    this.container.appendChild(scrollContainer);
    this.scrollContainer = scrollContainer;
  }

  private setupScrollbar(): void {
    // 스크롤바 컨테이너 생성
    const scrollbar = document.createElement("div");
    scrollbar.classList.add("virtual-scrollbar");

    // 스크롤바 썸 생성
    const scrollbarThumb = document.createElement("div");
    scrollbarThumb.classList.add("virtual-scrollbar-thumb");

    scrollbar.appendChild(scrollbarThumb);
    this.container.appendChild(scrollbar);

    this.scrollbar = scrollbar;
    this.scrollbarThumb = scrollbarThumb;
  }

  private bindEvents(): void {
    // 휠 이벤트 처리 (부드러운 스크롤)
    this.container.addEventListener("wheel", this.handleWheel.bind(this), { passive: false });

    // 리사이즈 이벤트 처리
    window.addEventListener("resize", this.handleResize.bind(this));

    // 스크롤바 드래그 이벤트
    if (this.scrollbarThumb) {
      this.scrollbarThumb.addEventListener("mousedown", this.handleScrollbarMouseDown.bind(this));
    }

    // 스크롤바 영역 클릭 이벤트
    if (this.scrollbar) {
      this.scrollbar.addEventListener("click", this.handleScrollbarClick.bind(this));
    }
  }

  private handleWheel(e: WheelEvent): void {
    if (!this.smoothScroll) return;

    e.preventDefault();

    const delta = e.deltaY;
    const currentScrollTop = this.scrollTop;
    // 8px 여백을 고려한 최대 스크롤 위치
    const maxScrollTop = this.totalHeight - this.containerHeight + 8;
    const newScrollTop = Math.max(0, Math.min(maxScrollTop, currentScrollTop + delta));

    this.smoothScrollTo(newScrollTop);
  }

  private handleResize(): void {
    this.containerHeight = this.container.clientHeight;
    this.updateScrollbarThumb();
  }

  private smoothScrollTo(targetScrollTop: number): void {
    if (this.scrollAnimationId) {
      cancelAnimationFrame(this.scrollAnimationId);
    }

    // 8px 여백을 고려한 최대 스크롤 위치로 제한
    const maxScrollTop = this.totalHeight - this.containerHeight + 8;
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
    this.dragStartScrollTop = this.scrollTop;

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

    // 8px 여백을 고려한 최대 스크롤 위치
    const maxScrollTop = this.totalHeight - this.containerHeight + 8;
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

    // 8px 여백을 고려한 최대 스크롤 위치
    const maxScrollTop = this.totalHeight - this.containerHeight + 8;

    // 썸 영역 클릭이 아닌 경우에만 처리
    const thumbTop = (this.scrollTop / maxScrollTop) * (scrollbarHeight - thumbHeight);
    const thumbBottom = thumbTop + thumbHeight;

    if (clickY < thumbTop || clickY > thumbBottom) {
      const scrollRatio = clickY / scrollbarHeight;
      const newScrollTop = scrollRatio * maxScrollTop;

      this.smoothScrollTo(newScrollTop);
    }
  }

  private updateScrollbarThumb(): void {
    if (!this.scrollbarThumb || !this.scrollbar) return;

    const scrollbarHeight = this.scrollbar.clientHeight;
    // 8px 여백을 고려한 최대 스크롤 위치
    const maxScrollTop = this.totalHeight - this.containerHeight + 8;

    if (maxScrollTop <= 0) {
      this.scrollbarThumb.style.height = "0px";
      this.scrollbarThumb.style.display = "none";
      return;
    }

    const thumbHeight = Math.max(20, (this.containerHeight / (this.totalHeight + 8)) * scrollbarHeight);
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

      element.style.top = `${(this.items.length - 1) * this.itemHeight}px`;

      // 스크롤 컨테이너 높이 업데이트 (margin-top 값 8px 추가)
      this.scrollContainer.style.height = `${this.totalHeight + 8}px`;
    }
    this.updateScrollbarThumb();
  }

  // 맨 아래로 스크롤
  scrollToBottom(): void {
    // 8px 여백을 고려하여 스크롤 위치 계산
    const targetScrollTop = this.totalHeight - this.containerHeight + 8;
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

  // 정리
  destroy(): void {
    if (this.scrollAnimationId) {
      cancelAnimationFrame(this.scrollAnimationId);
    }

    window.removeEventListener("resize", this.handleResize);
    this.container.removeEventListener("wheel", this.handleWheel);

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

    this.items = [];
  }
}

// 채팅 메시지용 특화된 가상 스크롤 클래스
export class ChatVirtualScroll extends VirtualScroll {
  constructor(container: HTMLElement) {
    super({
      container,
      itemHeight: 75, // 채팅 메시지 높이
      smoothScroll: true,
      scrollDuration: 250,
      showScrollbar: true, // 채팅 메시지용 가상 스크롤도 스크롤바 표시
    });
  }

  // 채팅 메시지 추가 (자동으로 맨 아래로 스크롤)
  addChatMessage(messageElement: HTMLElement): void {
    this.addItem(messageElement);
    this.scrollToBottom();
  }

  // 새 메시지가 추가되었을 때 자동 스크롤 여부 결정
  shouldAutoScroll(): boolean {
    const scrollTop = this.getScrollTop();
    const containerHeight = this.getContainerHeight();
    const totalHeight = this.getTotalHeight();

    // 8px 여백을 고려하여 사용자가 거의 맨 아래에 있을 때만 자동 스크롤
    return scrollTop + containerHeight >= totalHeight + 8 - 100;
  }
}
