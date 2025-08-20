// 인증 시스템 진입점
// 인증 로직과 UI 로직을 분리하여 관리

import { onAuthStateChange, initializeAuth } from "./auth-core";
import { renderUser, initializeAuthUI } from "./auth-ui";

initializeAuthUI();

onAuthStateChange(renderUser);

initializeAuth(renderUser);
