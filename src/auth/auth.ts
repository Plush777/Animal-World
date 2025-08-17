/// <reference types="vite/client" />

import { createClient, type User } from "@supabase/supabase-js";
import { svg } from "../data/svg";

const supabaseUrl = import.meta.env.VITE_SUPABASE_PROJECT_URL as string;
const supabaseKey = import.meta.env.VITE_SUPABASE_API_KEY as string;
const supabase = createClient(supabaseUrl, supabaseKey);

const loginBtn = document.getElementById("google-login") as HTMLButtonElement | null;
const loginKakaoBtn = document.getElementById("kakao-login") as HTMLButtonElement | null;
const logoutBtn = document.getElementById("logout") as HTMLButtonElement | null;
const userInfoDiv = document.getElementById("user-info") as HTMLDivElement | null;
const userLoginElement = document.getElementById("user-login-element") as HTMLDivElement | null;
const userLogoutElement = document.getElementById("user-logout-element") as HTMLDivElement | null;
const userBoxLogoutElement = document.getElementById("userbox-user-logout-element") as HTMLDivElement | null;

function reconnectLoginEventListeners(): void {
  const dynamicGoogleLoginBtn = document.getElementById("google-login") as HTMLButtonElement | null;
  const dynamicKakaoLoginBtn = document.getElementById("kakao-login") as HTMLButtonElement | null;

  dynamicGoogleLoginBtn?.addEventListener("click", async (): Promise<void> => {
    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider: "google",
      });
      if (error) {
        console.error("로그인 에러:", error.message);
      }
    } catch (err) {
      console.error("예기치 못한 로그인 에러:", err);
    }
  });

  dynamicKakaoLoginBtn?.addEventListener("click", async (): Promise<void> => {
    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider: "kakao",
      });
      if (error) {
        console.error("카카오 로그인 에러:", error.message);
      }
    } catch (err) {
      console.error("예기치 못한 카카오 로그인 에러:", err);
    }
  });
}

function reconnectLogoutEventListener(): void {
  const dynamicLogoutBtn = document.getElementById("logout") as HTMLButtonElement | null;

  dynamicLogoutBtn?.addEventListener("click", async (): Promise<void> => {
    try {
      const userLoginElement = document.getElementById("user-login-element") as HTMLDivElement | null;

      await supabase.auth.signOut();
      renderUser(null);
      if (userLoginElement) {
        userLoginElement.style.display = "block";
      }
    } catch (err) {
      console.error("로그아웃 에러:", err);
    }
  });
}

// google login
loginBtn?.addEventListener("click", async (): Promise<void> => {
  try {
    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
    });
    if (error) {
      console.error("로그인 에러:", error.message);
    }
  } catch (err) {
    console.error("예기치 못한 로그인 에러:", err);
  }
});

// kakao login
loginKakaoBtn?.addEventListener("click", async (): Promise<void> => {
  try {
    const { error } = await supabase.auth.signInWithOAuth({
      provider: "kakao",
    });
    if (error) {
      console.error("카카오 로그인 에러:", error.message);
    }
  } catch (err) {
    console.error("예기치 못한 카카오 로그인 에러:", err);
  }
});

// logout
logoutBtn?.addEventListener("click", async (): Promise<void> => {
  try {
    await supabase.auth.signOut();
    renderUser(null);
  } catch (err) {
    console.error("로그아웃 에러:", err);
  }
});

// 유저 정보 출력 함수
function renderUser(user: User | null): void {
  // 로그인하지 않은 상태
  if (!user) {
    // 로그인 관련 요소들 표시
    if (userLoginElement) {
      userLoginElement.style.display = "block";
      userLoginElement.innerHTML = `
        <div class="popup-button-box">
          <button type="button" id="google-login" class="google-login-button button-white button-size-lg button button-has-icon rounded-button">
            ${svg.google}
            <span>구글계정으로 로그인</span>
          </button>
          <button type="button" id="kakao-login" class="kakao-login-button button-yellow button-size-lg button button-has-icon rounded-button">
            ${svg.kakao}
            <span>카카오 계정으로 로그인</span>
          </button>
        </div>

        <div class="popup-etc-area">
          <button type="button" class="button-underline">비회원으로 이용하기</button>
        </div>
      `;
    }

    // 로그아웃 상태 요소들 숨김
    if (userLogoutElement) {
      userLogoutElement.style.display = "none";
      userLogoutElement.innerHTML = "";
    }

    if (userBoxLogoutElement) {
      userBoxLogoutElement.style.display = "none";
      userBoxLogoutElement.innerHTML = "";
    }

    // 사용자 정보 초기화
    if (userInfoDiv) {
      userInfoDiv.innerHTML = "";
    }

    // 동적으로 생성된 로그인 버튼에 이벤트 리스너 재연결
    reconnectLoginEventListeners();

    // 로그인 상태 변경 후 애니메이션 다시 시작
    setTimeout(() => {
      if ((window as any).startIntroAnimations) {
        (window as any).startIntroAnimations();
      }
    }, 100);

    return;
  }

  // 로그인한 상태
  // 로그인 요소 숨김
  if (userLoginElement) {
    userLoginElement.style.display = "none";
    userLoginElement.innerHTML = "";
  }

  // 로그아웃 상태 요소들 표시
  if (userLogoutElement) {
    // userLogoutElement.style.display = "block";
    userLogoutElement.innerHTML = `
      <div class="intro-description-box">
        <p class="intro-description-text">
          다른 동물친구들이 당신을 기다리고 있어요.
        </p>
        <p class="intro-description-text">아래 버튼을 눌러 빨리 참여해보세요!</p>
      </div>
      <button
        type="button"
        id="join-button"
        class="button button-sky button-size-lg has-short-key"
      >
        <span class="short-key has-border has-text"> J </span>
        <span>참여하기</span>
      </button>
    `;
  }

  if (userBoxLogoutElement) {
    // userBoxLogoutElement.style.display = "block";
    userBoxLogoutElement.innerHTML = `
      <div class="user-box">
        <button type="button" class="user-box-button">
          <span id="user-info"></span>
          ${svg.arrowUp}
        </button>

        <ul class="user-box-list">
          <li class="user-box-item">
            <button type="button" class="user-box-item-button">설정</button>
          </li>
          <li class="user-box-item">
            <button type="button" class="user-box-item-button" id="logout">로그아웃</button>
          </li>
        </ul>
      </div>
    `;
  }

  // 사용자 정보 표시 (동적으로 생성된 요소를 다시 선택)
  const userMetadata = user.user_metadata;
  const dynamicUserInfoDiv = document.getElementById("user-info") as HTMLDivElement | null;
  if (dynamicUserInfoDiv) {
    dynamicUserInfoDiv.innerHTML = `
      <img width="48" height="48" src="${userMetadata.avatar_url}" 
      alt="user-avatar" class="user-avatar">
    `;
  }

  // 동적으로 생성된 로그아웃 버튼에 이벤트 리스너 재연결
  reconnectLogoutEventListener();

  // 로그인 상태 변경 후 애니메이션 다시 시작
  setTimeout(() => {
    if ((window as any).startIntroAnimations) {
      (window as any).startIntroAnimations();
    }
  }, 100);

  console.log("로그인된 사용자:", user);
}

// 로그인 상태 감지
supabase.auth.onAuthStateChange(async (_event, session): Promise<void> => {
  try {
    if (session?.user) {
      renderUser(session.user);
    } else {
      renderUser(null);
    }
  } catch (err) {
    console.error("인증 상태 변경 에러:", err);
  }
});

// 새로고침 시에도 세션 유지 확인
(async (): Promise<void> => {
  try {
    const {
      data: { session },
      error,
    } = await supabase.auth.getSession();

    if (error) {
      console.error("세션 가져오기 에러:", error.message);
      return;
    }

    if (session?.user) {
      renderUser(session.user);
    }
  } catch (err) {
    console.error("예기치 못한 세션 에러:", err);
  }
})();
