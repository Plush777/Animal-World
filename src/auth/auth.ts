// 인증 시스템 진입점
// 인증 로직과 UI 로직을 분리하여 관리

import { onAuthStateChange, initializeAuth, validateGuestSession, refreshGuestSession } from "./auth-core";
import { renderUser, initializeAuthUI } from "./auth-ui";

initializeAuthUI();

onAuthStateChange(renderUser);

initializeAuth(renderUser);

// 주기적 세션 검증 (5분마다)
setInterval(async () => {
  const isValid = await validateGuestSession();
  if (!isValid) {
    // 세션이 유효하지 않으면 로그아웃
    console.log("게스트 세션이 만료되어 로그아웃됩니다.");
  } else {
    // 세션 갱신 시도
    await refreshGuestSession();
  }
}, 5 * 60 * 1000); // 5분
