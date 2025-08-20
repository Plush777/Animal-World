// 인증 시스템 진입점
// 인증 로직과 UI 로직을 분리하여 관리

import { onAuthStateChange, initializeAuth } from "./auth-core";
import { renderUser } from "./auth-ui";

onAuthStateChange(renderUser);

initializeAuth(renderUser);
