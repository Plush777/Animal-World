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
  avatar_url?: string;
  has_custom_image: boolean;
  is_image_removed: boolean;
  created_at: string;
  updated_at: string;
}

// 사용자 프로필 저장
export async function saveUserProfile(profile: Omit<UserProfile, "id" | "created_at" | "updated_at">): Promise<{ success: boolean; error?: string }> {
  try {
    const {
      data: { session },
    } = await supabase.auth.getSession();
    if (session?.user && (isAnonymousUser(session.user) || isGuestUser(session.user))) {
      console.log("saveUserProfile: 게스트/익명 사용자이므로 프로필 저장을 건너뜁니다.");
      return { success: false, error: "게스트 사용자는 프로필을 저장할 수 없습니다." };
    }

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
    const {
      data: { session },
    } = await supabase.auth.getSession();

    if (session?.user && (isAnonymousUser(session.user) || isGuestUser(session.user))) {
      console.log("loadUserProfile: 게스트/익명 사용자이므로 프로필 조회를 건너뜁니다.");
      return { success: true, data: undefined };
    }

    console.log("일반 사용자로 확인됨, profiles 테이블 조회 진행");
    const { data, error } = await supabase.from("profiles").select("*").eq("user_id", userId).maybeSingle();

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

// 랜덤 닉네임 생성 함수
function generateRandomGuestNickname(): string {
  const randomNumber = Math.floor(Math.random() * 900000) + 100000;
  return `Guest${randomNumber}`;
}

// 게스트 로그인 (Supabase Auth만 사용)
export async function handleGuestLogin(): Promise<void> {
  try {
    // 익명 로그인
    const { data: anonymousData, error: anonymousError } = await supabase.auth.signInAnonymously();

    if (anonymousError) {
      console.error("게스트 로그인 실패:", anonymousError.message);
      return;
    }

    console.log("익명 로그인 성공:", anonymousData.user?.id);
    console.log("익명 로그인 사용자 전체 데이터:", anonymousData.user);

    // 랜덤 닉네임 생성
    const nickname = generateRandomGuestNickname();

    // user_metadata에 게스트 정보 추가
    const { error: updateError } = await supabase.auth.updateUser({
      data: {
        nickname,
        is_guest: true,
      },
    });

    if (updateError) {
      console.error("게스트 정보 업데이트 실패:", updateError.message);
      return;
    }

    console.log("게스트 로그인 완료:", nickname);

    // 업데이트 후 사용자 정보 확인
    const {
      data: { session: updatedSession },
    } = await supabase.auth.getSession();
    console.log("업데이트 후 사용자 정보:", updatedSession?.user);
    console.log("업데이트 후 app_metadata:", updatedSession?.user?.app_metadata);
    console.log("업데이트 후 user_metadata:", updatedSession?.user?.user_metadata);
  } catch (err) {
    console.error("예기치 못한 게스트 로그인 에러:", err);
  }
}

// 게스트 로그아웃 (Supabase Auth만 사용)
export async function handleGuestLogout(): Promise<void> {
  try {
    await supabase.auth.signOut();
    console.log("게스트 로그아웃 완료");
  } catch (err) {
    console.error("게스트 로그아웃 에러:", err);
  }
}

// 익명 사용자인지 확인
export function isAnonymousUser(user: any): boolean {
  // Supabase 익명 로그인의 다양한 경우를 체크
  const provider = user?.app_metadata?.provider;
  const providers = user?.app_metadata?.providers;

  // 로깅으로 실제 값 확인
  console.log("isAnonymousUser 체크 - provider:", provider);
  console.log("isAnonymousUser 체크 - providers:", providers);

  return provider === "anon" || provider === "anonymous" || providers?.includes("anon") || providers?.includes("anonymous") || !provider; // provider가 없는 경우도 익명으로 간주
}

// 게스트 사용자인지 확인
export function isGuestUser(user: any): boolean {
  return isAnonymousUser(user) && user?.user_metadata?.is_guest === true;
}

// 세션 토큰 검증
export async function validateGuestSession(): Promise<boolean> {
  try {
    const {
      data: { session },
    } = await supabase.auth.getSession();

    if (!session) {
      return false;
    }

    // 세션 만료 시간 확인
    const currentTime = Date.now();

    if (session.expires_at) {
      const sessionExpiresAt = new Date(session.expires_at).getTime();

      if (currentTime > sessionExpiresAt) {
        // 세션이 만료되었으면 로그아웃
        await supabase.auth.signOut();
        return false;
      }
    }

    return true;
  } catch (err) {
    console.error("세션 검증 실패:", err);
    return false;
  }
}

// 게스트 세션 갱신
export async function refreshGuestSession(): Promise<boolean> {
  try {
    const { data, error } = await supabase.auth.refreshSession();

    if (error) {
      console.error("세션 갱신 실패:", error.message);
      return false;
    }

    return !!data.session;
  } catch (err) {
    console.error("세션 갱신 중 오류:", err);
    return false;
  }
}
