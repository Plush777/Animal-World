import { initShortKey } from "./shortKey";

// 디버깅을 위한 상태 추적
let currentShortKeyState: boolean | null = null;
let initShortKeyCallCount = 0;
let lastInitTime = 0;

// 단축키 이벤트 리스너들을 추적하기 위한 변수들
let shortKeyEventListeners: Array<{
  target: EventTarget;
  type: string;
  listener: EventListener;
  options?: boolean | AddEventListenerOptions;
}> = [];

/**
 * 원본 addEventListener를 후킹하여 단축키 관련 리스너들을 추적
 */
function setupEventListenerTracking(): void {
  const originalAddEventListener = EventTarget.prototype.addEventListener;
  const originalRemoveEventListener = EventTarget.prototype.removeEventListener;

  // addEventListener 후킹
  EventTarget.prototype.addEventListener = function (type: string, listener: EventListener, options?: boolean | AddEventListenerOptions) {
    // 키보드 관련 이벤트이고 단축키 관련으로 추정되는 경우 추적
    if (type === "keydown" || type === "keyup" || type === "keypress") {
      // console.log(`🎯 키보드 이벤트 리스너 등록 감지: ${type} on`, this);

      shortKeyEventListeners.push({
        target: this,
        type: type,
        listener: listener,
        options: options,
      });
    }

    return originalAddEventListener.call(this, type, listener, options);
  };

  // removeEventListener 후킹
  EventTarget.prototype.removeEventListener = function (type: string, listener: EventListener, options?: boolean | AddEventListenerOptions) {
    // 추적 목록에서 제거
    if (type === "keydown" || type === "keyup" || type === "keypress") {
      // console.log(`🗑️ 키보드 이벤트 리스너 제거 감지: ${type} from`, this);

      shortKeyEventListeners = shortKeyEventListeners.filter((item) => !(item.target === this && item.type === type && item.listener === listener));
    }

    return originalRemoveEventListener.call(this, type, listener, options);
  };

  // console.log(`✅ 이벤트 리스너 추적 시스템 설정 완료`);
}

/**
 * 등록된 모든 단축키 이벤트 리스너들을 강제로 제거
 */
function removeAllShortKeyListeners(): void {
  // console.log(`🧹 등록된 단축키 리스너 강제 제거 시작 (총 ${shortKeyEventListeners.length}개)`);

  shortKeyEventListeners.forEach((item, index) => {
    try {
      item.target.removeEventListener(item.type, item.listener, item.options);
      console.log(`  [${index + 1}] 제거됨: ${item.type} from`, item.target);
    } catch (error) {
      console.warn(`  [${index + 1}] 제거 실패: ${item.type}`, error);
    }
  });

  // 추적 목록 초기화
  shortKeyEventListeners = [];
  // console.log(`✅ 단축키 리스너 제거 완료`);
}

/**
 * initShortKey 함수를 래핑하여 추적 기능 추가
 */
function wrappedInitShortKey(): void {
  // console.log(`🔧 initShortKey 래핑 실행 시작`);

  // 기존 리스너들 정리
  if (shortKeyEventListeners.length > 0) {
    // console.log(`기존 단축키 리스너들 정리 중...`);
    removeAllShortKeyListeners();
  }

  // 원본 initShortKey 실행
  const beforeListenerCount = shortKeyEventListeners.length;
  initShortKey();
  const afterListenerCount = shortKeyEventListeners.length;

  // console.log(`initShortKey 실행 완료: ${afterListenerCount - beforeListenerCount}개 리스너 추가됨`);
}

/**
 * 단축키 초기화를 안전하게 처리하는 래퍼 함수
 */
function safeInitShortKey(reason: string): void {
  const now = Date.now();
  initShortKeyCallCount++;

  // console.log(`\n[${initShortKeyCallCount}] 단축키 초기화 시도: ${reason}`);
  // console.log(`이전 호출로부터 ${now - lastInitTime}ms 경과`);

  try {
    // 중복 호출 방지 (100ms 이내 중복 호출 차단)
    if (now - lastInitTime < 100) {
      console.warn(`중복 호출 차단: ${now - lastInitTime}ms`);
      return;
    }

    lastInitTime = now;

    // DOM이 준비되었는지 확인
    if (document.readyState !== "loading") {
      wrappedInitShortKey();
      // console.log(`✅ 단축키 초기화 성공: ${reason}`);
    } else {
      console.warn(`DOM이 준비되지 않아 지연 실행: ${reason}`);
      document.addEventListener("DOMContentLoaded", () => {
        wrappedInitShortKey();
        // console.log(`✅ 단축키 지연 초기화 완료: ${reason}`);
      });
    }
  } catch (error) {
    console.error(`❌ 단축키 초기화 중 오류 (${reason}):`, error);
  }
}

/**
 * 단축키를 완전히 비활성화하는 함수
 */
function disableShortKey(reason: string): void {
  // console.log(`\n🚫 단축키 비활성화 시작: ${reason}`);
  // console.log(`현재 등록된 리스너 개수: ${shortKeyEventListeners.length}`);

  if (shortKeyEventListeners.length > 0) {
    removeAllShortKeyListeners();
  } else {
    // console.log(`제거할 리스너가 없습니다`);
  }

  // console.log(`✅ 단축키 비활성화 완료: ${reason}\n`);
}

/**
 * 단축키 상태 처리 로직
 */
function handleShortKeyState(isDisabled: boolean, reason: string = ""): void {
  // console.log(`\n=== 단축키 상태 처리 시작 ===`);
  // console.log(`현재 상태: ${currentShortKeyState === null ? "null" : currentShortKeyState ? "비활성화" : "활성화"}`);
  // console.log(`새로운 상태: ${isDisabled ? "비활성화" : "활성화"}`);
  // console.log(`처리 이유: ${reason}`);
  // console.log(`현재 등록된 리스너 개수: ${shortKeyEventListeners.length}`);

  // 상태가 변경된 경우에만 처리
  if (currentShortKeyState !== isDisabled) {
    const previousState = currentShortKeyState;
    currentShortKeyState = isDisabled;

    // console.log(
    //   `🔄 상태 변경 감지: ${previousState === null ? "null" : previousState ? "비활성화" : "활성화"} → ${isDisabled ? "비활성화" : "활성화"}`
    // );

    if (!isDisabled) {
      // 단축키 활성화
      safeInitShortKey(`상태 변경 (${reason})`);
    } else {
      // 단축키 비활성화
      disableShortKey(`상태 변경 (${reason})`);
    }
  } else {
    // console.log(`ℹ️ 상태 변화 없음 - 처리 건너뜀`);

    // 상태 변화는 없지만 실제 리스너 상태와 다를 수 있으므로 검증
    const shouldHaveListeners = !isDisabled;
    const hasListeners = shortKeyEventListeners.length > 0;

    if (shouldHaveListeners !== hasListeners) {
      console.warn(
        `⚠️ 상태 불일치 감지! 예상: ${shouldHaveListeners ? "리스너 있음" : "리스너 없음"}, 실제: ${hasListeners ? "리스너 있음" : "리스너 없음"}`
      );

      // 강제 동기화
      if (shouldHaveListeners && !hasListeners) {
        // console.log(`🔧 리스너 강제 생성`);
        safeInitShortKey(`상태 동기화 (${reason})`);
      } else if (!shouldHaveListeners && hasListeners) {
        // console.log(`🔧 리스너 강제 제거`);
        disableShortKey(`상태 동기화 (${reason})`);
      }
    }
  }

  // console.log(`=== 단축키 상태 처리 완료 ===\n`);
}

/**
 * 단축키 설정 변경 감지 및 처리
 */
function handleShortKeySettingChange(): void {
  // console.log(`\n🚀 단축키 설정 감지 시스템 초기화`);

  // 이벤트 리스너 추적 시스템 설정
  setupEventListenerTracking();

  // 초기 상태 확인을 위한 여러 시점 체크
  const checkInitialState = () => {
    const bodyAttribute = document.body.getAttribute("data-short-key-disable");
    const isDisabled = bodyAttribute === "true";

    handleShortKeyState(isDisabled, "초기 상태 확인");
  };

  // 즉시 확인
  checkInitialState();

  // 약간의 지연 후 재확인 (다른 스크립트가 속성을 변경할 수 있음)
  setTimeout(() => {
    // console.log(`\n⏰ 지연된 초기 상태 재확인`);
    checkInitialState();
  }, 100);

  // MutationObserver로 변화 감지
  const observer = new MutationObserver((mutations) => {
    // console.log(`\n👀 MutationObserver 감지됨 (${mutations.length}개 변화)`);

    mutations.forEach((mutation, index) => {
      console.log(`변화 ${index + 1}:`);
      // console.log(`  - 타입: ${mutation.type}`);
      // console.log(`  - 속성명: ${mutation.attributeName}`);
      // console.log(`  - 이전 값: "${mutation.oldValue}"`);

      if (mutation.type === "attributes" && mutation.attributeName === "data-short-key-disable") {
        const newValue = document.body.getAttribute("data-short-key-disable");
        const isDisabled = newValue === "true";

        // console.log(`  - 새로운 값: "${newValue}"`);
        // console.log(`  - 해석된 상태: ${isDisabled ? "비활성화" : "활성화"}`);

        handleShortKeyState(isDisabled, "MutationObserver 감지");
      }
    });
  });

  // body 요소의 속성 변화 감시 (이전 값도 기록)
  observer.observe(document.body, {
    attributes: true,
    attributeFilter: ["data-short-key-disable"],
    attributeOldValue: true,
  });

  // console.log(`✅ MutationObserver 설정 완료`);
}

export { handleShortKeySettingChange, handleShortKeyState, shortKeyEventListeners };
