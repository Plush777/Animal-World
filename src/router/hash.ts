import { authHtml } from "../data/authHtml";

interface RouteHandler {
  show: () => void;
  hide: () => void;
}

interface Routes {
  [key: string]: RouteHandler;
}

// 라우터 상태
const routes: Routes = {};
let currentRoute: string | null = null;

/**
 * 해시 변경 처리
 */
function handleHashChange(): void {
  const hash = window.location.hash.slice(1); // # 제거

  // 이전 라우트 숨기기
  if (currentRoute && routes[currentRoute]) {
    routes[currentRoute].hide();
  }

  // 새 라우트 표시
  if (hash && routes[hash]) {
    routes[hash].show();
    currentRoute = hash;
  } else {
    // 해시가 없거나 등록되지 않은 라우트인 경우
    currentRoute = null;
  }
}

/**
 * 라우트 등록
 */
function registerRoute(hash: string, handler: RouteHandler): void {
  routes[hash] = handler;
}

/**
 * 프로그래매틱 네비게이션
 */
function navigate(hash: string): void {
  window.location.hash = hash;
}

/**
 * 현재 활성 라우트 반환
 */
function getCurrentRoute(): string | null {
  return currentRoute;
}

/**
 * 해시와 # 완전히 제거
 */
function clearHash(): void {
  const url = window.location.pathname + window.location.search;
  window.history.replaceState({}, "", url);

  // 해시 변경 이벤트 수동 트리거 (빈 해시로)
  const event = new HashChangeEvent("hashchange", {
    newURL: window.location.href,
    oldURL: window.location.href + window.location.hash,
  });
  window.dispatchEvent(event);
}

/**
 * 페이지 네비게이션 (일반화된 함수)
 */
function pageNavigate(pageName: string): void {
  navigate(pageName);
}

/**
 * 현재 페이지 닫기 (일반화된 함수)
 */
function pageClose(): void {
  clearHash();
}

/**
 * 라우터 초기화
 */
function initRouter(): void {
  // 페이지 로드 시 해시 확인
  window.addEventListener("DOMContentLoaded", () => {
    handleHashChange();
  });

  // 해시 변경 이벤트 리스너
  window.addEventListener("hashchange", () => {
    handleHashChange();
  });

  // 새로고침 시에도 마이페이지 데이터 로드 확인
  window.addEventListener("load", () => {
    setTimeout(async () => {
      const hash = window.location.hash.slice(1);
      if (hash === "mypage-setting") {
        try {
          const { ensureMyPageDataLoaded } = await import("../ui/modules/myPage");
          ensureMyPageDataLoaded();
        } catch (error) {
          console.error("마이페이지 데이터 로드 실패:", error);
        }
      }
    }, 300);
  });
}

// 라우터 객체 생성
const router = {
  registerRoute,
  navigate,
  getCurrentRoute,
  clearHash,
  pageNavigate,
  pageClose,
  init: initRouter,
};

// 라우터 초기화
initRouter();

// 마이페이지 라우트 등록
router.registerRoute("mypage-setting", {
  show: () => {
    const mypageSettingPopup = document.querySelector("#mypage-setting") as HTMLElement;
    mypageSettingPopup.innerHTML = authHtml.mypage.setting;

    if (mypageSettingPopup) {
      // 로딩 상태 초기화
      const wrapper = mypageSettingPopup.querySelector(".mypage-setting-wrapper") as HTMLElement;
      if (wrapper) {
        wrapper.classList.add("mypage-loading");
        wrapper.classList.remove("mypage-loaded");
      }

      // 마이페이지 폼 데이터 로드 및 이벤트 리스너 재연결
      // 즉시 실행하되, DOM이 준비될 때까지 대기
      (async () => {
        // 동적 import로 마이페이지 모듈 로드
        const { reconnectMyPageEventListeners } = await import("../ui/modules/myPage");
        reconnectMyPageEventListeners();
      })();
    }
  },
  hide: () => {
    const mypageSettingPopup = document.querySelector("#mypage-setting") as HTMLElement;
    if (mypageSettingPopup) {
      mypageSettingPopup.innerHTML = "";

      // 로딩 상태 리셋
      const wrapper = mypageSettingPopup.querySelector(".mypage-setting-wrapper") as HTMLElement;
      if (wrapper) {
        wrapper.classList.add("mypage-loading");
        wrapper.classList.remove("mypage-loaded");
      }
    }
  },
});

// 전역에서 접근 가능하도록 export
export { router };

// window 객체에도 추가 (기존 코드와의 호환성을 위해)
(window as any).hashRouter = router;
(window as any).pageNavigate = pageNavigate;
(window as any).pageClose = pageClose;
