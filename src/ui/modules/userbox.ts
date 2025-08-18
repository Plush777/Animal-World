/**
 * 사용자 박스 UI 관리 모듈
 * 사용자 박스 드롭다운 메뉴 열기/닫기 처리
 */

/**
 * 사용자 박스 드롭다운 토글 설정
 */
function setupUserBoxToggle(): void {
  const userBoxLogoutElement = document.getElementById("userbox-user-logout-element") as HTMLElement;

  if (userBoxLogoutElement) {
    userBoxLogoutElement.addEventListener("click", (e) => {
      e.stopPropagation();
      const userBoxList = document.querySelector(".user-box-list") as HTMLElement;
      if (userBoxList) {
        userBoxList.classList.toggle("active");
      }
    });
  }
}

/**
 * 사용자 박스 외부 클릭 시 닫기 설정
 */
function setupUserBoxOutsideClick(): void {
  document.addEventListener("click", (e) => {
    const userBoxList = document.querySelector(".user-box-list") as HTMLElement;
    const userBoxLogoutElement = document.getElementById("userbox-user-logout-element") as HTMLElement;

    if (userBoxList && userBoxList.classList.contains("active")) {
      if (!userBoxList.contains(e.target as Node) && e.target !== userBoxLogoutElement) {
        userBoxList.classList.remove("active");
      }
    }
  });
}

/**
 * 사용자 박스 모듈 초기화
 */
function initUserBoxModule(): void {
  setupUserBoxToggle();
  setupUserBoxOutsideClick();
}

export { initUserBoxModule, setupUserBoxToggle, setupUserBoxOutsideClick };
