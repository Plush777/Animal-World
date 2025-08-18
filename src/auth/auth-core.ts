/// <reference types="vite/client" />

import { createClient, type User } from "@supabase/supabase-js";

const supabaseUrl = import.meta.env.VITE_SUPABASE_PROJECT_URL as string;
const supabaseKey = import.meta.env.VITE_SUPABASE_API_KEY as string;
const supabase = createClient(supabaseUrl, supabaseKey);

// Supabase 클라이언트 export
export { supabase };

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

// 사용자 프로필 인터페이스
export interface UserProfile {
  id?: string;
  user_id: string;
  name: string;
  introduction: string;
  avatar_url: string | null;
  has_custom_image: boolean;
  is_image_removed: boolean;
  created_at?: string;
  updated_at?: string;
}

// 사용자 프로필 저장
export async function saveUserProfile(profile: Omit<UserProfile, "id" | "created_at" | "updated_at">): Promise<{ success: boolean; error?: string }> {
  try {
    const { data, error } = await supabase
      .from("profiles")
      .upsert(
        {
          user_id: profile.user_id,
          name: profile.name,
          introduction: profile.introduction,
          avatar_url: profile.avatar_url,
          has_custom_image: profile.has_custom_image,
          is_image_removed: profile.is_image_removed,
          updated_at: new Date().toISOString(),
        },
        {
          onConflict: "user_id",
        }
      )
      .select()
      .single();

    if (error) {
      console.error("프로필 저장 에러:", error.message);
      return { success: false, error: error.message };
    }

    console.log("프로필 저장 성공:", data);
    return { success: true };
  } catch (err) {
    console.error("예기치 못한 프로필 저장 에러:", err);
    return { success: false, error: String(err) };
  }
}

// 사용자 프로필 로드
export async function loadUserProfile(userId: string): Promise<{ success: boolean; data?: UserProfile; error?: string }> {
  try {
    const { data, error } = await supabase.from("profiles").select("*").eq("user_id", userId).single();

    if (error) {
      if (error.code === "PGRST116") {
        // 데이터가 없는 경우
        return { success: true, data: undefined };
      }
      console.error("프로필 로드 에러:", error.message);
      return { success: false, error: error.message };
    }

    return { success: true, data };
  } catch (err) {
    console.error("예기치 못한 프로필 로드 에러:", err);
    return { success: false, error: String(err) };
  }
}
