import { myPageHtml } from "../../data/myPageHtml";

export const CONSTANTS = {
  MAX_FILE_SIZE: 5 * 1024 * 1024, // 5MB
  MAX_DOM_WAIT_ATTEMPTS: 10,
  DOM_WAIT_DELAY: 10,
  DATA_LOAD_DELAY: 200,
  GUEST_DEFAULT_NICKNAME: "Guest123456",
  GUEST_DEFAULT_INTRO: "게스트 계정입니다.",
  GUEST_INTRO_RESTRICTION_MESSAGE: "게스트 계정은 한 줄 소개를 수정할 수 없어요.",
} as const;

export function getMyPageElements() {
  return {
    nameInput: document.getElementById("mypage-name") as HTMLInputElement,
    introTextarea: document.getElementById("mypage-intro-text") as HTMLTextAreaElement,
    countText: document.querySelector(".mypage-intro-text-count-text") as HTMLSpanElement,
    wrapper: document.querySelector(".mypage-setting-wrapper") as HTMLElement,
    uploadButton: document.querySelector(".mypage-img-button-group .button-sky") as HTMLButtonElement,
    removeButton: document.querySelector(".mypage-img-button-group .button-blue") as HTMLButtonElement,
    saveButton: document.querySelector("#mypage-setting .popup-bottom-button-group .next-button") as HTMLButtonElement,
    cancelButton: document.querySelector("#mypage-setting .popup-bottom-button-group .esc-button") as HTMLButtonElement,
  };
}

export function getImageElements() {
  return {
    mypageImg: document.getElementById("mypage-img-element") as HTMLDivElement,
    userInfo: document.getElementById("user-info") as HTMLDivElement,
  };
}

// 로딩 UI 표시 함수
export function showMyPageLoading(): void {
  const loadingContainer = document.getElementById("mypage-section-loading") as HTMLElement;
  const wrapper = document.querySelector(".mypage-setting-wrapper") as HTMLElement;

  if (loadingContainer) {
    wrapper.classList.add("mypage-loading");
    wrapper.classList.remove("mypage-loaded");
    loadingContainer.innerHTML = myPageHtml.loading;
  }
}

// 로딩 UI 제거 함수
export function hideMyPageLoading(): void {
  const loadingContainer = document.getElementById("mypage-section-loading") as HTMLElement;
  const wrapper = document.querySelector(".mypage-setting-wrapper") as HTMLElement;

  if (loadingContainer) {
    loadingContainer.innerHTML = "";
    wrapper.classList.add("mypage-loaded");
    wrapper.classList.remove("mypage-loading");
  }
}

// 게스트 사용자 안내 메시지 추가
export function addGuestNoticeMessage(): void {
  const noticeMessage = myPageHtml.guestNoticeMessage;
  const noticeMessageContainer = document.getElementById("guest-notice-message") as HTMLElement;

  if (noticeMessageContainer) {
    noticeMessageContainer.innerHTML = noticeMessage;
  }
}
