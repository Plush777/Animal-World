export function initUserBoxModule(): void {
  const app = document.querySelector("#app") as HTMLElement;

  if (app) {
    app.removeEventListener("click", handleUserBoxClick);

    app.addEventListener("click", handleUserBoxClick);
  }
}

function handleUserBoxClick(e: Event): void {
  const userBoxList = document.querySelector(".user-box-list") as HTMLElement;
  const userBoxButton = document.querySelector(".user-box-button") as HTMLElement;

  if (!userBoxList || !userBoxButton) {
    return;
  }

  const target = e.target as HTMLElement;

  if (userBoxButton.contains(target)) {
    e.preventDefault();
    e.stopPropagation();
    userBoxList.classList.toggle("active");
    return;
  }

  if (userBoxList.classList.contains("active")) {
    if (!userBoxList.contains(target) && !userBoxButton.contains(target)) {
      userBoxList.classList.remove("active");
    }
  }
}
