function initUserBoxModule(): void {
  const app = document.querySelector("#app") as HTMLElement;
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

  if (app) {
    app.addEventListener("click", (e) => {
      const userBoxList = document.querySelector(".user-box-list") as HTMLElement;

      if (userBoxList && userBoxList.classList.contains("active")) {
        if (!userBoxList.contains(e.target as Node) && e.target !== userBoxLogoutElement) {
          userBoxList.classList.remove("active");
        }
      }
    });
  }
}

export { initUserBoxModule };
