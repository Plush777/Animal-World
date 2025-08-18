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

function initUserBoxModule(): void {
  setupUserBoxToggle();
  setupUserBoxOutsideClick();
}

export { initUserBoxModule, setupUserBoxToggle, setupUserBoxOutsideClick };
