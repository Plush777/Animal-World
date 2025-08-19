import { type User } from "@supabase/supabase-js";
import { svg } from "../../data/svg";
import { saveUserProfile, loadUserProfile, type UserProfile, isGuestUser, isAnonymousUser, supabase } from "../../auth/auth-core";
import { getCurrentLoggedInUser } from "../../auth/auth-ui";

import { handleImageUpload, handleImageRemove } from "../../utils/imageUpload";
import { addGuestNoticeMessage, CONSTANTS, getMyPageElements, getImageElements, showMyPageLoading, hideMyPageLoading } from "../../utils/mypage";

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
  const { mypageImg, userInfo } = getImageElements();
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
    // 게스트 사용자인지 확인
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
    console.log("마이페이지 초기화: 게스트 사용자 제한 적용");
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
  // 즉시 실행하되, DOM이 준비될 때까지 대기
  const executeWhenReady = async () => {
    console.log("마이페이지 이벤트 리스너 재연결 시작");

    // 현재 사용자 정보 가져오기
    const currentUser = getCurrentLoggedInUser();
    console.log("현재 사용자:", currentUser);

    if (!currentUser) {
      console.log("사용자 정보가 없음");
      return;
    }

    // DOM 요소가 준비될 때까지 대기
    let attempts = 0;
    while (attempts < CONSTANTS.MAX_DOM_WAIT_ATTEMPTS) {
      const { nameInput, introTextarea } = getMyPageElements();

      if (nameInput && introTextarea) {
        break;
      }

      await new Promise((resolve) => setTimeout(resolve, CONSTANTS.DOM_WAIT_DELAY));
      attempts++;
    }

    // 먼저 폼 데이터 로드 (모든 사용자 타입에 대해)
    console.log("폼 데이터 로드 시작");
    await loadMyPageFormData(currentUser);
    console.log("폼 데이터 로드 완료");

    // 게스트 사용자인지 확인하고 제한 적용
    if (isGuestUser(currentUser)) {
      console.log("마이페이지 재연결: 게스트 사용자 제한 적용");

      // 게스트 제한 다시 적용
      disableGuestUserInputs();
    } else {
      console.log("일반 사용자: 기본 이벤트 리스너 초기화");
      // 일반 사용자는 기본 이벤트 리스너만 초기화
      initializeMyPageEventListeners();
    }

    console.log("마이페이지 이벤트 리스너 재연결 완료");
  };

  // 즉시 실행 시도
  executeWhenReady();
}

// 새로고침 시에도 데이터를 유지하기 위한 함수
export function ensureMyPageDataLoaded(): void {
  setTimeout(async () => {
    const currentUser = getCurrentLoggedInUser();
    if (currentUser) {
      console.log("마이페이지 데이터 로드 확인 시작");

      // 현재 마이페이지가 활성화되어 있는지 확인
      const mypageSettingPopup = document.querySelector("#mypage-setting") as HTMLElement;
      if (mypageSettingPopup) {
        console.log("마이페이지가 활성화되어 있음, 데이터 로드 실행");
        await loadMyPageFormData(currentUser);

        // 게스트 사용자인지 확인하고 제한 적용
        if (isGuestUser(currentUser)) {
          disableGuestUserInputs();
        } else {
          initializeMyPageEventListeners();
        }
      }
    }
  }, CONSTANTS.DATA_LOAD_DELAY);
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

// 사용자 프로필 데이터 로드 (Supabase) - 게스트 사용자는 호출하지 않아야 함
export async function loadUserProfileData(userId: string): Promise<UserProfile | null> {
  console.log("프로필 데이터 로드 시작, userId:", userId);

  // 게스트 사용자인지 다시 한번 확인 (이중 검증)
  const currentUser = getCurrentLoggedInUser();
  if (currentUser && (isGuestUser(currentUser) || isAnonymousUser(currentUser))) {
    console.log("게스트/익명 사용자이므로 프로필 조회를 건너뜁니다.");
    return null;
  }

  console.log("일반 사용자 프로필 조회 시작");
  const result = await loadUserProfile(userId);
  console.log("프로필 조회 결과:", result);

  if (result.success && result.data) {
    const profile = result.data;
    console.log("프로필 데이터 로드 성공:", profile);

    // 이미지 상태 복원
    imageState.currentImageUrl = profile.avatar_url;
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
  wrapper: HTMLElement | null,
  name: string,
  introduction: string
): void {
  // 닉네임과 소개 설정
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

  // 로딩 UI 제거
  hideMyPageLoading();

  // 데이터 로드 완료 후 UI 표시
  showMyPageLoading();
}

// UI 로딩 완료 함수
function completeUILoading(nameInput: HTMLInputElement, introTextarea: HTMLTextAreaElement, wrapper: HTMLElement | null): void {
  // 입력 필드 활성화
  nameInput.disabled = false;
  introTextarea.disabled = false;

  // 로딩 UI 제거하고 실제 콘텐츠 표시
  hideMyPageLoading();

  // 데이터 로드 완료 후 UI 표시
  showMyPageLoading();
}

// 게스트 사용자 UI 설정 함수
function setupGuestUserUI(
  nameInput: HTMLInputElement,
  introTextarea: HTMLTextAreaElement,
  countText: HTMLSpanElement | null,
  section: HTMLElement | null,
  nickname: string
): void {
  // 로딩 UI 표시
  showMyPageLoading();

  // 약간의 지연을 두어 로딩 UI가 보이도록 함
  setTimeout(() => {
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

    disableGuestUserInputs();

    // 로딩 UI 제거
    hideMyPageLoading();
  }, 500); // 0.5초 지연
}

// 마이페이지 폼 데이터 로드 (소셜 로그인 정보 + 저장된 정보)
export async function loadMyPageFormData(user: User | null): Promise<void> {
  const nameInput = document.getElementById("mypage-name") as HTMLInputElement;
  const introTextarea = document.getElementById("mypage-intro-text") as HTMLTextAreaElement;
  const countText = document.querySelector(".mypage-intro-text-count-text") as HTMLSpanElement;
  const wrapper = document.querySelector(".mypage-setting-wrapper") as HTMLElement;
  const section = document.querySelector(".mypage-section") as HTMLElement;

  if (!nameInput || !introTextarea || !user) {
    console.log("마이페이지 폼 요소를 찾을 수 없거나 사용자 정보가 없음");
    return;
  }

  // 로딩 UI 먼저 표시
  showMyPageLoading();

  console.log("마이페이지 폼 데이터 로드 시작:", user);

  // 게스트 사용자인지 확인
  if (isGuestUser(user)) {
    try {
      console.log("게스트 사용자 감지됨:", user);
      console.log("user.user_metadata:", user.user_metadata);

      // user_metadata에서 닉네임 가져오기
      const guestNickname = user.user_metadata?.nickname || CONSTANTS.GUEST_DEFAULT_NICKNAME;
      console.log("게스트 닉네임 설정:", guestNickname);

      setupGuestUserUI(nameInput, introTextarea, countText, section, guestNickname);
      console.log("게스트 사용자 폼 데이터 로드 완료");
      return;
    } catch (error) {
      console.error("게스트 계정 정보 로드 실패:", error);
      // 에러 시 기본값 사용
      setupGuestUserUI(nameInput, introTextarea, countText, section, CONSTANTS.GUEST_DEFAULT_NICKNAME);
    }
  }

  console.log("일반 사용자 폼 데이터 로드 시작");

  nameInput.disabled = true;
  introTextarea.disabled = true;

  try {
    // 저장된 프로필 데이터 로드 (loadUserProfileData에서 게스트 검증 처리)
    const savedProfile = await loadUserProfileData(user.id);

    if (savedProfile) {
      // 저장된 프로필 데이터가 있으면 사용
      console.log("저장된 프로필 데이터 로드:", savedProfile);

      const name = savedProfile.name || user.user_metadata?.full_name || user.user_metadata?.name || "";
      const introduction = savedProfile.introduction || "";

      setupRegularUserUI(nameInput, introTextarea, countText, wrapper, name, introduction);
    } else {
      // 저장된 프로필 데이터가 없으면 소셜 로그인 정보 사용
      console.log("저장된 프로필 데이터 없음, 소셜 로그인 정보 사용");

      const socialName = user.user_metadata?.full_name || user.user_metadata?.name || "";
      const introduction = "";

      setupRegularUserUI(nameInput, introTextarea, countText, wrapper, socialName, introduction);
    }

    console.log("일반 사용자 폼 데이터 로드 완료");
  } catch (error) {
    console.error("프로필 데이터 로드 실패:", error);

    // 에러 시 기본값 사용
    const socialName = user.user_metadata?.full_name || user.user_metadata?.name || "";
    nameInput.value = socialName;
    introTextarea.value = "";

    completeUILoading(nameInput, introTextarea, wrapper);
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
  const saveButton = document.querySelector("#mypage-setting .popup-bottom-button-group .next-button") as HTMLButtonElement;

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

  if (saveButton) {
    saveButton.disabled = true;
  }
}
