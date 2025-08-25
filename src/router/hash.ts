import { isGuestUser, supabase } from "../auth/auth-core";
import { getCurrentLoggedInUser } from "../auth/auth-ui";
import { authHtml } from "../data/authHtml";
import { chatHtml } from "../data/chatHtml";
import { reconnectMyPageEventListeners } from "../ui/modules/myPage";

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

initRouter();

router.registerRoute("mypage-setting", {
  show: async () => {
    const mypageSettingPopup = document.querySelector("#mypage-setting") as HTMLElement;

    // 새로고침 시에도 올바른 사용자 정보를 가져오기 위해 Supabase 세션에서 직접 확인
    let currentUser = getCurrentLoggedInUser();

    if (!currentUser) {
      // 세션에서 사용자 정보 가져오기
      try {
        const {
          data: { session },
        } = await supabase.auth.getSession();
        currentUser = session?.user || null;
      } catch (error) {
        console.error("세션에서 사용자 정보 가져오기 실패:", error);
        currentUser = null;
      }
    }

    if (currentUser && isGuestUser(currentUser)) {
      mypageSettingPopup.innerHTML = authHtml.mypage.setting.guest;
    } else {
      mypageSettingPopup.innerHTML = authHtml.mypage.setting.user;
    }

    if (mypageSettingPopup) {
      reconnectMyPageEventListeners();

      // HTML이 삽입된 후 popup 요소를 찾아서 active 클래스 추가
      setTimeout(() => {
        const popup = document.querySelector(".popup.mypage-setting") as HTMLElement;
        if (popup) {
          popup.classList.add("active");
        }
      }, 50);
    }
  },
  hide: () => {
    const mypageSettingPopup = document.querySelector("#mypage-setting") as HTMLElement;
    const popup = document.querySelector(".popup.mypage-setting") as HTMLElement;

    if (mypageSettingPopup) {
      if (popup) {
        popup.classList.remove("active");
      }
      setTimeout(() => {
        mypageSettingPopup.innerHTML = "";
      }, 500);
    }
  },
});

router.registerRoute("world", {
  show: () => {
    const world = document.getElementById("chat") as HTMLElement;
    world.innerHTML = chatHtml.chat;
  },
  hide: () => {
    const world = document.getElementById("chat") as HTMLElement;
    world.innerHTML = "";
  },
});

export { router };

(window as any).hashRouter = router;
(window as any).pageNavigate = pageNavigate;
(window as any).pageClose = pageClose;
