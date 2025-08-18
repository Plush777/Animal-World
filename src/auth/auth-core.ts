/// <reference types="vite/client" />

import { createClient, type User } from "@supabase/supabase-js";

const supabaseUrl = import.meta.env.VITE_SUPABASE_PROJECT_URL as string;
const supabaseKey = import.meta.env.VITE_SUPABASE_API_KEY as string;
const supabase = createClient(supabaseUrl, supabaseKey);

// 인증 이벤트 리스너 타입 정의
export type AuthEventCallback = (user: User | null) => void;

// 구글 로그인 함수
export async function handleGoogleLogin(): Promise<void> {
  try {
    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
    });
    if (error) {
      console.error("구글 로그인 에러:", error.message);
    }
  } catch (err) {
    console.error("예기치 못한 구글 로그인 에러:", err);
  }
}

// 카카오 로그인 함수
export async function handleKakaoLogin(): Promise<void> {
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
}

// 로그아웃 함수
export async function handleLogout(): Promise<void> {
  try {
    await supabase.auth.signOut();
    // UI 업데이트는 onAuthStateChange에서 처리됨
  } catch (err) {
    console.error("로그아웃 에러:", err);
  }
}

// 현재 세션 가져오기
export async function getCurrentSession() {
  try {
    const {
      data: { session },
      error,
    } = await supabase.auth.getSession();

    if (error) {
      console.error("세션 가져오기 에러:", error.message);
      return null;
    }

    return session;
  } catch (err) {
    console.error("예기치 못한 세션 에러:", err);
    return null;
  }
}

// 인증 상태 변경 리스너 등록
export function onAuthStateChange(callback: AuthEventCallback): void {
  supabase.auth.onAuthStateChange(async (_event, session) => {
    try {
      if (session?.user) {
        callback(session.user);
      } else {
        callback(null);
      }
    } catch (err) {
      console.error("인증 상태 변경 에러:", err);
    }
  });
}

// 초기 세션 확인
export async function initializeAuth(callback: AuthEventCallback): Promise<void> {
  const session = await getCurrentSession();
  if (session?.user) {
    callback(session.user);
  } else {
    callback(null);
  }
}
