import { type User } from "@supabase/supabase-js";
import { svg } from "../../data/svg";
import { saveUserProfile, loadUserProfile, type UserProfile } from "../../auth/auth-core";
import { getCurrentLoggedInUser } from "../../auth/auth-ui";

// 마이페이지 관련 타입 정의
interface MyPageImageState {
  currentImageUrl: string | null;
  hasCustomImage: boolean;
  isImageRemoved: boolean; // 이미지 제거 여부 추가
}

let imageState: MyPageImageState = {
  currentImageUrl: null,
  hasCustomImage: false,
  isImageRemoved: false,
};

// 원본 데이터 백업용 (닫기 버튼 클릭 시 복원용) - 로컬 형태
interface OriginalProfileData {
  name: string;
  introduction: string;
  avatarUrl: string | null;
  hasCustomImage: boolean;
  isImageRemoved: boolean;
}

let originalProfileData: OriginalProfileData | null = null;

// 이미지 업로드 핸들러
export function handleImageUpload(): void {
  const input = document.createElement("input");
  input.type = "file";
  input.accept = "image/*";

  input.onchange = (event) => {
    const file = (event.target as HTMLInputElement).files?.[0];
    if (file) {
      // 파일 크기 체크 (5MB 제한)
      if (file.size > 5 * 1024 * 1024) {
        alert("파일 크기는 5MB 이하여야 합니다.");
        return;
      }

      // 이미지 파일 타입 체크
      if (!file.type.startsWith("image/")) {
        alert("이미지 파일만 업로드 가능합니다.");
        return;
      }

      // FileReader로 이미지 미리보기
      const reader = new FileReader();
      reader.onload = (e) => {
        const imageUrl = e.target?.result as string;
        updateProfileImage(imageUrl);
        imageState.currentImageUrl = imageUrl;
        imageState.hasCustomImage = true;
        imageState.isImageRemoved = false; // 이미지 업로드 시 제거 상태 해제
      };
      reader.readAsDataURL(file);
    }
  };

  input.click();
}

// 이미지 제거 핸들러
export function handleImageRemove(): void {
  if (confirm("프로필 이미지를 제거하시겠습니까?")) {
    // 기본 SVG 이미지로 복원 (항상 svg.defaultImage 사용)
    updateProfileImage(svg.defaultImage);
    imageState.currentImageUrl = svg.defaultImage;
    imageState.hasCustomImage = false;
    imageState.isImageRemoved = true; // 이미지 제거 상태로 설정
  }
}

// 프로필 이미지 업데이트 (UI 반영)
function updateProfileImage(imageUrlOrSvg: string): void {
  // SVG 문자열인지 URL인지 확인
  const isSvg = imageUrlOrSvg.trim().startsWith("<svg");

  // 마이페이지 설정 팝업의 이미지 업데이트
  const mypageImgElement = document.getElementById("mypage-img-element") as HTMLDivElement | null;
  if (mypageImgElement) {
    if (isSvg) {
      // SVG 문자열을 직접 삽입
      mypageImgElement.innerHTML = imageUrlOrSvg;
    } else {
      // URL을 이미지 태그로 삽입
      mypageImgElement.innerHTML = `
        <img src="${imageUrlOrSvg}" 
        alt="프로필 이미지" class="mypage-img">
      `;
    }
  }

  // 헤더 유저 아바타 이미지 업데이트
  const userInfoDiv = document.getElementById("user-info") as HTMLDivElement | null;
  if (userInfoDiv) {
    if (isSvg) {
      // SVG 문자열을 직접 삽입
      userInfoDiv.innerHTML = `
        <div class="user-avatar user-avatar-default-svg">
          ${imageUrlOrSvg}
        </div>
      `;
    } else {
      // URL을 이미지 태그로 삽입
      userInfoDiv.innerHTML = `
        <img width="48" height="48" src="${imageUrlOrSvg}" 
        alt="user-avatar" class="user-avatar ">
      `;
    }
  }
}

// 기본 아바타 URL 또는 SVG 가져오기
function getDefaultAvatarUrl(): string {
  // 현재 사용자의 소셜 로그인 아바타 URL을 반환하거나 기본 이미지 사용
  const userInfoImg = document.querySelector(".user-avatar") as HTMLImageElement;
  if (userInfoImg && userInfoImg.src && !imageState.hasCustomImage) {
    return userInfoImg.src;
  }

  // 기본 SVG 이미지 반환 (URL이 아닌 SVG 문자열)
  return svg.defaultImage;
}

// 마이페이지 렌더링 (프로필 이미지 부분)
export async function renderMyPageProfileImage(user: User | null): Promise<void> {
  if (!user) return;

  try {
    // 저장된 프로필 정보 먼저 로드
    const savedProfile = await loadUserProfileData(user.id);

    let finalImageUrl: string;

    if (savedProfile) {
      // 저장된 프로필이 있으면 그 이미지 사용
      if (savedProfile.is_image_removed) {
        finalImageUrl = svg.defaultImage;
        imageState.isImageRemoved = true;
        imageState.hasCustomImage = false;
      } else if (savedProfile.has_custom_image && savedProfile.avatar_url) {
        finalImageUrl = savedProfile.avatar_url;
        imageState.hasCustomImage = true;
        imageState.isImageRemoved = false;
      } else {
        // 저장된 소셜 로그인 이미지 사용
        finalImageUrl = savedProfile.avatar_url || user.user_metadata.avatar_url || svg.defaultImage;
        imageState.hasCustomImage = false;
        imageState.isImageRemoved = false;
      }
      imageState.currentImageUrl = finalImageUrl;
    } else {
      // 저장된 프로필이 없으면 소셜 로그인 이미지 사용
      const userMetadata = user.user_metadata;
      finalImageUrl = userMetadata.avatar_url || svg.defaultImage;

      imageState.currentImageUrl = finalImageUrl;
      imageState.hasCustomImage = false;
      imageState.isImageRemoved = false;
    }

    updateProfileImage(finalImageUrl);
  } catch (error) {
    console.error("프로필 이미지 렌더링 실패:", error);

    // 에러 시 소셜 로그인 이미지로 폴백
    const userMetadata = user.user_metadata;
    const fallbackImageUrl = userMetadata.avatar_url || svg.defaultImage;

    imageState.currentImageUrl = fallbackImageUrl;
    imageState.hasCustomImage = false;
    imageState.isImageRemoved = false;

    updateProfileImage(fallbackImageUrl);
  }
}

// 마이페이지 이벤트 리스너 초기화
export function initializeMyPageEventListeners(): void {
  // 이미지 업로드 버튼 이벤트 리스너
  const uploadButton = document.querySelector(".mypage-img-button-group .button-sky") as HTMLButtonElement;
  if (uploadButton) {
    uploadButton.addEventListener("click", handleImageUpload);
  }

  // 이미지 제거 버튼 이벤트 리스너
  const removeButton = document.querySelector(".mypage-img-button-group .button-blue") as HTMLButtonElement;
  if (removeButton) {
    removeButton.addEventListener("click", handleImageRemove);
  }

  // 한 줄 소개 글자 수 카운터
  const introTextarea = document.getElementById("mypage-intro-text") as HTMLTextAreaElement;
  const countText = document.querySelector(".mypage-intro-text-count-text") as HTMLSpanElement;

  if (introTextarea && countText) {
    introTextarea.addEventListener("input", () => {
      const currentLength = introTextarea.value.length;
      countText.textContent = currentLength.toString();
    });
  }

  // 저장 버튼 이벤트 리스너 (next-button)
  const saveButton = document.querySelector("#mypage-setting .popup-bottom-button-group .next-button") as HTMLButtonElement;
  if (saveButton) {
    saveButton.addEventListener("click", handleSaveProfile);
  }

  // 닫기 버튼 이벤트 리스너 (esc-button)
  const cancelButton = document.querySelector("#mypage-setting .popup-bottom-button-group .esc-button") as HTMLButtonElement;
  if (cancelButton) {
    cancelButton.addEventListener("click", handleCancelProfile);
  }
}

// 프로필 저장 핸들러
async function handleSaveProfile(): Promise<void> {
  const nameInput = document.getElementById("mypage-name") as HTMLInputElement;
  const introTextarea = document.getElementById("mypage-intro-text") as HTMLTextAreaElement;
  const saveButton = document.querySelector("#mypage-setting .popup-bottom-button-group .next-button") as HTMLButtonElement;

  if (!nameInput || !introTextarea) return;

  const name = nameInput.value.trim();
  const introduction = introTextarea.value.trim();

  // 이름은 필수 입력
  if (!name) {
    alert("이름을 입력해주세요.");
    nameInput.focus();
    return;
  }

  // 현재 사용자 정보 가져오기
  const currentUser = getCurrentLoggedInUser();
  if (!currentUser) {
    alert("로그인 정보를 찾을 수 없습니다.");
    return;
  }

  // 로딩 상태 표시
  if (saveButton) {
    saveButton.disabled = true;
    saveButton.innerHTML = "<span>저장 중...</span>";
  }

  try {
    // 프로필 저장
    const result = await saveUserProfileData(currentUser.id, name, introduction);

    if (!result.success) {
      throw new Error(result.error || "프로필 저장에 실패했습니다.");
    }

    // user-avatar에도 현재 이미지 반영
    const userInfoDiv = document.getElementById("user-info") as HTMLDivElement | null;
    if (userInfoDiv && imageState.currentImageUrl) {
      const isSvg = imageState.currentImageUrl.trim().startsWith("<svg");

      if (isSvg) {
        userInfoDiv.innerHTML = `
          <div class="user-avatar user-avatar-default-svg">
            ${imageState.currentImageUrl}
          </div>
        `;
      } else {
        userInfoDiv.innerHTML = `
          <img width="48" height="48" src="${imageState.currentImageUrl}" 
          alt="user-avatar" class="user-avatar">
        `;
      }
    }

    // 페이지 닫기
    if ((window as any).pageClose) {
      (window as any).pageClose();
    }

    alert("프로필이 저장되었습니다.");
  } catch (error) {
    console.error("프로필 저장 실패:", error);
    alert(`프로필 저장에 실패했습니다: ${error instanceof Error ? error.message : String(error)}`);
  } finally {
    // 로딩 상태 해제
    if (saveButton) {
      saveButton.disabled = false;
      saveButton.innerHTML = `
        <span class="short-key has-border has-text">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M5 12h14m-7-7l7 7-7 7" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
          </svg>
        </span>
        <span>저장</span>
      `;
    }
  }
}

// 프로필 취소 핸들러 (닫기 버튼)
function handleCancelProfile(): void {
  // 원본 데이터로 복원
  restoreOriginalFormData();

  // 페이지 닫기
  if ((window as any).pageClose) {
    (window as any).pageClose();
  }
}

// 마이페이지 이벤트 리스너 재연결 (동적 생성된 요소들을 위해)
export function reconnectMyPageEventListeners(): void {
  setTimeout(() => {
    initializeMyPageEventListeners();
  }, 100);
}

// 현재 이미지 상태 가져오기
export function getImageState(): MyPageImageState {
  return { ...imageState };
}

// 이미지 상태 초기화
export function resetImageState(): void {
  imageState = {
    currentImageUrl: null,
    hasCustomImage: false,
    isImageRemoved: false,
  };
}

// 사용자 프로필 데이터 저장 (Supabase)
export async function saveUserProfileData(userId: string, name: string, introduction: string): Promise<{ success: boolean; error?: string }> {
  const profileData: Omit<UserProfile, "id" | "created_at" | "updated_at"> = {
    user_id: userId,
    name,
    introduction,
    avatar_url: imageState.currentImageUrl,
    has_custom_image: imageState.hasCustomImage,
    is_image_removed: imageState.isImageRemoved,
  };

  return await saveUserProfile(profileData);
}

// 사용자 프로필 데이터 로드 (Supabase)
export async function loadUserProfileData(userId: string): Promise<UserProfile | null> {
  const result = await loadUserProfile(userId);

  if (result.success && result.data) {
    const profile = result.data;

    // 이미지 상태 복원
    imageState.currentImageUrl = profile.avatar_url;
    imageState.hasCustomImage = profile.has_custom_image;
    imageState.isImageRemoved = profile.is_image_removed;

    return profile;
  } else if (!result.success) {
    console.error("프로필 로드 실패:", result.error);
  }

  return null;
}

// 마이페이지 폼 데이터 로드 (소셜 로그인 정보 + 저장된 정보)
export async function loadMyPageFormData(user: User | null): Promise<void> {
  const nameInput = document.getElementById("mypage-name") as HTMLInputElement;
  const introTextarea = document.getElementById("mypage-intro-text") as HTMLTextAreaElement;
  const countText = document.querySelector(".mypage-intro-text-count-text") as HTMLSpanElement;

  if (!nameInput || !introTextarea || !user) return;

  // 로딩 상태 표시
  nameInput.disabled = true;
  introTextarea.disabled = true;

  try {
    // 저장된 프로필 데이터 로드
    const savedProfile = await loadUserProfileData(user.id);

    let displayName = "";
    let displayIntro = "";

    if (savedProfile) {
      // 저장된 데이터가 있으면 우선 사용
      displayName = savedProfile.name;
      displayIntro = savedProfile.introduction;
    } else if (user?.user_metadata) {
      // 저장된 데이터가 없으면 소셜 로그인 정보 사용
      const userMetadata = user.user_metadata;
      displayName = userMetadata.full_name || userMetadata.name || "";
      displayIntro = "";
    }

    // 원본 데이터 백업 (닫기 버튼용)
    originalProfileData = {
      name: displayName,
      introduction: displayIntro,
      avatarUrl: imageState.currentImageUrl,
      hasCustomImage: imageState.hasCustomImage,
      isImageRemoved: imageState.isImageRemoved,
    };

    // 폼에 데이터 설정
    nameInput.value = displayName;
    introTextarea.value = displayIntro;

    // 한줄 소개 글자 수 업데이트
    if (countText) {
      countText.textContent = displayIntro.length.toString();
    }
  } catch (error) {
    console.error("폼 데이터 로드 실패:", error);

    // 에러 시 소셜 로그인 정보로 폴백
    if (user?.user_metadata) {
      const userMetadata = user.user_metadata;
      const fallbackName = userMetadata.full_name || userMetadata.name || "";
      nameInput.value = fallbackName;
      introTextarea.value = "";

      originalProfileData = {
        name: fallbackName,
        introduction: "",
        avatarUrl: imageState.currentImageUrl,
        hasCustomImage: imageState.hasCustomImage,
        isImageRemoved: imageState.isImageRemoved,
      };
    }
  } finally {
    // 로딩 상태 해제
    nameInput.disabled = false;
    introTextarea.disabled = false;
  }
}

// 폼 데이터 복원 (닫기 버튼 클릭 시)
export function restoreOriginalFormData(): void {
  if (!originalProfileData) return;

  const nameInput = document.getElementById("mypage-name") as HTMLInputElement;
  const introTextarea = document.getElementById("mypage-intro-text") as HTMLTextAreaElement;
  const countText = document.querySelector(".mypage-intro-text-count-text") as HTMLSpanElement;

  if (nameInput) {
    nameInput.value = originalProfileData.name;
  }

  if (introTextarea) {
    introTextarea.value = originalProfileData.introduction;
  }

  if (countText) {
    countText.textContent = originalProfileData.introduction.length.toString();
  }

  // 이미지 상태 복원
  imageState.currentImageUrl = originalProfileData.avatarUrl;
  imageState.hasCustomImage = originalProfileData.hasCustomImage;
  imageState.isImageRemoved = originalProfileData.isImageRemoved;

  // UI에 이미지 복원
  if (originalProfileData.avatarUrl) {
    updateProfileImage(originalProfileData.avatarUrl);
  } else {
    updateProfileImage(svg.defaultImage);
  }
}
