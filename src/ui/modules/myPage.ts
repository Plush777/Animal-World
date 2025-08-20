import { type User } from "@supabase/supabase-js";
import { svg } from "../../data/svg";
import { saveUserProfile, loadUserProfile, type UserProfile, isGuestUser, isAnonymousUser } from "../../auth/auth-core";
import { getCurrentLoggedInUser } from "../../auth/auth-ui";

import { addGuestNoticeMessage, CONSTANTS, showMyPageLoading, hideMyPageLoading } from "../../utils/mypage";

interface MyPageImageState {
  currentImageUrl: string | null;
  hasCustomImage: boolean;
  isImageRemoved: boolean;
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

// 이미지 상태 설정 유틸리티 함수
function setImageState(imageUrl: string, hasCustomImage: boolean, isImageRemoved: boolean): void {
  imageState.currentImageUrl = imageUrl;
  imageState.hasCustomImage = hasCustomImage;
  imageState.isImageRemoved = isImageRemoved;
}

// 모든 프로필 이미지 업데이트 (중복 제거)
function updateAllProfileImages(imageUrlOrSvg: string): void {
  const mypageImg = document.getElementById("mypage-img-element") as HTMLDivElement;
  const userInfo = document.getElementById("user-info") as HTMLDivElement;
  const isSvg = imageUrlOrSvg.trim().startsWith("<svg");

  // 마이페이지 설정 팝업의 이미지 업데이트
  if (mypageImg) {
    mypageImg.innerHTML = isSvg ? imageUrlOrSvg : `<img src="${imageUrlOrSvg}" alt="프로필 이미지" class="mypage-img">`;
  }

  // 헤더 유저 아바타 이미지 업데이트
  if (userInfo) {
    userInfo.innerHTML = isSvg
      ? `<div class="user-avatar user-avatar-default-svg">${imageUrlOrSvg}</div>`
      : `<img width="48" height="48" src="${imageUrlOrSvg}" alt="user-avatar" class="user-avatar">`;
  }
}

function handleImageUpload(): void {
  const input = document.createElement("input");
  input.type = "file";
  input.accept = "image/*";

  input.onchange = (event) => {
    const file = (event.target as HTMLInputElement).files?.[0];
    if (file) {
      // 파일 크기 체크
      if (file.size > CONSTANTS.MAX_FILE_SIZE) {
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
        setImageState(imageUrl, true, false);
        updateAllProfileImages(imageUrl);
      };
      reader.readAsDataURL(file);
    }
  };

  input.click();
}

function handleImageRemove(): void {
  if (confirm("프로필 이미지를 제거하시겠습니까?")) {
    setImageState(svg.defaultImage, false, true);
    updateAllProfileImages(svg.defaultImage);
  }
}

// 마이페이지 렌더링 (프로필 이미지 부분)
export async function renderMyPageProfileImage(user: User | null): Promise<void> {
  if (!user) return;

  try {
    if (isGuestUser(user)) {
      // 게스트 사용자는 기본 이미지 사용
      console.log("게스트 사용자 이미지 렌더링: 기본 이미지 사용");
      const finalImageUrl = svg.defaultImage;
      setImageState(finalImageUrl, false, false);
      updateAllProfileImages(finalImageUrl);
      return;
    }

    // 일반 사용자만 프로필 데이터 로드
    console.log("일반 사용자 이미지 렌더링: 프로필 데이터 로드 시작");
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
      setImageState(finalImageUrl, imageState.hasCustomImage, imageState.isImageRemoved);
    } else {
      // 저장된 프로필이 없으면 소셜 로그인 이미지 사용
      const userMetadata = user.user_metadata;
      finalImageUrl = userMetadata.avatar_url || svg.defaultImage;
      setImageState(finalImageUrl, false, false);
    }

    updateAllProfileImages(finalImageUrl);
  } catch (error) {
    console.error("프로필 이미지 렌더링 실패:", error);
    // 에러 시 기본 이미지 사용
    const fallbackImageUrl = svg.defaultImage;
    setImageState(fallbackImageUrl, false, false);
    updateAllProfileImages(fallbackImageUrl);
  }
}

// 마이페이지 이벤트 리스너 초기화
export function initializeMyPageEventListeners(): void {
  // 현재 사용자 정보 가져오기
  const currentUser = getCurrentLoggedInUser();

  // 게스트 사용자인지 확인하고 제한 적용
  if (currentUser && isGuestUser(currentUser)) {
    disableGuestUserInputs();
  }

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

  const mypageSetting = document.getElementById("mypage-setting") as HTMLElement;

  if (mypageSetting) {
    mypageSetting.removeEventListener("click", handleMyPageSettingClick);
    mypageSetting.addEventListener("click", handleMyPageSettingClick);
  }
}

// 마이페이지 설정 클릭 핸들러
function handleMyPageSettingClick(e: Event): void {
  e.stopPropagation();

  const cancelButton = document.querySelector(".popup-bottom-button-group .esc-button") as HTMLButtonElement;
  if (cancelButton && e.target === cancelButton) {
    handleCancelProfile();
  }

  const saveButton = document.querySelector(".popup-bottom-button-group .next-button") as HTMLButtonElement;
  if (saveButton && e.target === saveButton) {
    handleSaveProfile();
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
    if (imageState.currentImageUrl) {
      updateAllProfileImages(imageState.currentImageUrl);
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

function handleCancelProfile(): void {
  restoreOriginalFormData();

  if ((window as any).pageClose) {
    (window as any).pageClose();
  }
}

// 마이페이지 이벤트 리스너 재연결 (동적 생성된 요소들을 위해)
export function reconnectMyPageEventListeners(): void {
  const currentUser = getCurrentLoggedInUser();
  console.log("현재 사용자:", currentUser);

  if (!currentUser) {
    console.log("사용자 정보가 없음");
    return;
  }

  loadMyPageFormData(currentUser);

  if (isGuestUser(currentUser)) {
    disableGuestUserInputs();
  } else {
    initializeMyPageEventListeners();
  }
}

// 새로고침 시에도 데이터를 유지하기 위한 함수
export function ensureMyPageDataLoaded(): void {
  const currentUser = getCurrentLoggedInUser();

  if (currentUser) {
    const mypageSettingPopup = document.querySelector("#mypage-setting") as HTMLElement;
    if (mypageSettingPopup) {
      loadMyPageFormData(currentUser);

      if (isGuestUser(currentUser)) {
        disableGuestUserInputs();
      } else {
        initializeMyPageEventListeners();
      }
    }
  }
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
    avatar_url: imageState.currentImageUrl ?? undefined,
    has_custom_image: imageState.hasCustomImage,
    is_image_removed: imageState.isImageRemoved,
  };

  return await saveUserProfile(profileData);
}

// 사용자 프로필 데이터 로드 (Supabase) - 게스트 사용자는 호출하지 않아야 함
export async function loadUserProfileData(userId: string): Promise<UserProfile | null> {
  const currentUser = getCurrentLoggedInUser();
  if (currentUser && (isGuestUser(currentUser) || isAnonymousUser(currentUser))) {
    console.log("게스트/익명 사용자이므로 프로필 조회를 건너뜁니다.");
    return null;
  }

  const result = await loadUserProfile(userId);

  if (result.success && result.data) {
    const profile = result.data;
    console.log("프로필 데이터 로드 성공:", profile);

    // 이미지 상태 복원
    imageState.currentImageUrl = profile.avatar_url ?? null;
    imageState.hasCustomImage = profile.has_custom_image;
    imageState.isImageRemoved = profile.is_image_removed;

    return profile;
  } else if (!result.success) {
    console.error("프로필 로드 실패:", result.error);
  }

  console.log("프로필 데이터 없음");
  return null;
}

// 일반 사용자 UI 설정 함수
function setupRegularUserUI(
  nameInput: HTMLInputElement,
  introTextarea: HTMLTextAreaElement,
  countText: HTMLSpanElement | null,
  name: string,
  introduction: string
): void {
  nameInput.value = name;
  introTextarea.value = introduction;

  // 원본 데이터 백업
  originalProfileData = {
    name,
    introduction,
    avatarUrl: imageState.currentImageUrl,
    hasCustomImage: imageState.hasCustomImage,
    isImageRemoved: imageState.isImageRemoved,
  };

  // 한줄 소개 글자 수 업데이트
  if (countText) {
    countText.textContent = introduction.length.toString();
  }

  // 입력 필드 활성화
  nameInput.disabled = false;
  introTextarea.disabled = false;
}

function completeUILoading(nameInput: HTMLInputElement, introTextarea: HTMLTextAreaElement): void {
  // 입력 필드 활성화
  nameInput.disabled = false;
  introTextarea.disabled = false;
}

// 게스트 사용자 UI 설정 함수
function setupGuestUserUI(
  nameInput: HTMLInputElement,
  introTextarea: HTMLTextAreaElement,
  countText: HTMLSpanElement | null,
  nickname: string
): void {
  // 닉네임과 소개 설정 (disableGuestUserInputs보다 먼저 설정)
  nameInput.value = nickname;
  introTextarea.value = CONSTANTS.GUEST_DEFAULT_INTRO;

  // 원본 데이터 백업
  originalProfileData = {
    name: nickname,
    introduction: CONSTANTS.GUEST_DEFAULT_INTRO,
    avatarUrl: imageState.currentImageUrl,
    hasCustomImage: imageState.hasCustomImage,
    isImageRemoved: imageState.isImageRemoved,
  };

  if (countText) {
    countText.textContent = CONSTANTS.GUEST_DEFAULT_INTRO.length.toString();
  }

  updateAllProfileImages(svg.defaultImage);
  disableGuestUserInputs();
}

// 마이페이지 폼 데이터 로드 (소셜 로그인 정보 + 저장된 정보)
export async function loadMyPageFormData(user: User | null): Promise<void> {
  const nameInput = document.getElementById("mypage-name") as HTMLInputElement;
  const introTextarea = document.getElementById("mypage-intro-text") as HTMLTextAreaElement;
  const countText = document.querySelector(".mypage-intro-text-count-text") as HTMLSpanElement;

  showMyPageLoading();

  if (!nameInput || !introTextarea || !user) {
    console.log("마이페이지 폼 요소를 찾을 수 없거나 사용자 정보가 없음");
    return;
  }

  if (isGuestUser(user)) {
    try {
      console.log("user.user_metadata:", user.user_metadata);

      const guestNickname = user.user_metadata?.nickname || CONSTANTS.GUEST_DEFAULT_NICKNAME;

      setupGuestUserUI(nameInput, introTextarea, countText, guestNickname);
      hideMyPageLoading();

      return;
    } catch (error) {
      console.error("게스트 계정 정보 로드 실패:", error);
      // 에러 시 기본값 사용
      setupGuestUserUI(nameInput, introTextarea, countText, CONSTANTS.GUEST_DEFAULT_NICKNAME);
    }
  } else {
    console.log("일반 사용자 폼 데이터 로드 시작");

    try {
      const savedProfile = await loadUserProfileData(user.id);

      if (savedProfile) {
        const name = savedProfile.name || user.user_metadata?.full_name || user.user_metadata?.name || "";
        const introduction = savedProfile.introduction || "";

        updateAllProfileImages(savedProfile.avatar_url ?? svg.defaultImage);
        setupRegularUserUI(nameInput, introTextarea, countText, name, introduction);
        hideMyPageLoading();
      } else {
        const socialName = user.user_metadata?.full_name || user.user_metadata?.name || "";
        const introduction = "";

        updateAllProfileImages(user.user_metadata?.avatar_url ?? svg.defaultImage);
        setupRegularUserUI(nameInput, introTextarea, countText, socialName, introduction);
        hideMyPageLoading();
      }
    } catch (error) {
      console.error("프로필 데이터 로드 실패:", error);

      // 에러 시 기본값 사용
      const socialName = user.user_metadata?.full_name || user.user_metadata?.name || "";
      nameInput.value = socialName;
      introTextarea.value = "";

      completeUILoading(nameInput, introTextarea);
      hideMyPageLoading();
    }
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
    updateAllProfileImages(originalProfileData.avatarUrl);
  } else {
    updateAllProfileImages(svg.defaultImage);
  }
}

// 게스트 사용자 제한 함수
function disableGuestUserInputs(): void {
  const nameInput = document.getElementById("mypage-name") as HTMLInputElement;
  const introTextarea = document.getElementById("mypage-intro-text") as HTMLTextAreaElement;
  const uploadButton = document.querySelector(".mypage-img-button-group .button-sky") as HTMLButtonElement;
  const removeButton = document.querySelector(".mypage-img-button-group .button-blue") as HTMLButtonElement;

  // 게스트 안내 메시지 추가
  addGuestNoticeMessage();

  if (nameInput) {
    nameInput.disabled = true;
  }

  if (introTextarea) {
    introTextarea.disabled = true;
    // 게스트 계정 안내 메시지로 설정 (이미 설정된 값 덮어쓰기)
    introTextarea.value = CONSTANTS.GUEST_INTRO_RESTRICTION_MESSAGE;
  }

  if (uploadButton) {
    uploadButton.disabled = true;
  }

  if (removeButton) {
    removeButton.disabled = true;
  }
}
