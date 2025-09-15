export function closeSidebar() {
  const sidebar = document.getElementById("sidebar") as HTMLElement;
  const main = document.querySelector(".main") as HTMLElement;

  if (sidebar) {
    sidebar.classList.remove("transition-start");
  }

  setTimeout(() => {
    main?.classList.remove("sidebar-open");

    if (sidebar) {
      sidebar.innerHTML = "";
    }
  }, 500);
}
