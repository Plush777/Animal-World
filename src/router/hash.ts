import { isGuestUser, supabase } from "../auth/auth-core";
import { getCurrentLoggedInUser } from "../auth/auth-ui";
import { authHtml } from "../data/authHtml";
import { chatHtml } from "../data/chatHtml";
import { reconnectMyPageEventListeners } from "../ui/modules/myPage";
import { closeSidebar } from "../utils/sidebar";

interface RouteHandler {
  show: () => void;
  hide: () => void;
}

interface Routes {
  [key: string]: RouteHandler;
}

const routes: Routes = {};
let currentRoute: string | null = null;

function handleHashChange(): void {
  const hash = window.location.hash.slice(1); // # 제거

  if (currentRoute && routes[currentRoute]) {
    routes[currentRoute].hide();
  }

  if (hash && routes[hash]) {
    routes[hash].show();
    currentRoute = hash;
  } else {
    currentRoute = null;
  }
}

/**
 * 라우트 등록
 */
function registerRoute(hash: string, handler: RouteHandler): void {
  routes[hash] = handler;
}

function navigate(hash: string): void {
  window.location.hash = hash;
}

function getCurrentRoute(): string | null {
  return currentRoute;
}

/**
 * 해시와 # 완전히 제거
 */
function clearHash(): void {
  const url = window.location.pathname + window.location.search;
  window.history.replaceState({}, "", url);

  const event = new HashChangeEvent("hashchange", {
    newURL: window.location.href,
    oldURL: window.location.href + window.location.hash,
  });
  window.dispatchEvent(event);
}

function pageNavigate(pageName: string): void {
  navigate(pageName);
}

function pageClose(): void {
  clearHash();
}

function initRouter(): void {
  window.addEventListener("DOMContentLoaded", () => {
    handleHashChange();
  });

  window.addEventListener("hashchange", () => {
    handleHashChange();
  });
}

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

router.registerRoute("preferences", {
  show: () => {
    const preferences = document.getElementById("preferences") as HTMLElement;
    preferences.innerHTML = authHtml.preferences;

    setTimeout(() => {
      const popup = document.querySelector(".popup.preferences") as HTMLElement;

      if (popup) {
        popup.classList.add("active");
        closeSidebar();
      }
    }, 50);

    const preferencesCloseBtn = document.querySelector(".popup.preferences .esc-button") as HTMLElement;
    preferencesCloseBtn?.addEventListener("click", () => {
      (window as any).pageClose?.();
    });
  },
  hide: () => {
    const preferences = document.getElementById("preferences") as HTMLElement;
    const popup = document.querySelector(".popup.preferences") as HTMLElement;

    if (popup) {
      popup.classList.remove("active");
      setTimeout(() => {
        preferences.innerHTML = "";
      }, 500);
    }
  },
});

export { router };

(window as any).hashRouter = router;
(window as any).pageNavigate = pageNavigate;
(window as any).pageClose = pageClose;
