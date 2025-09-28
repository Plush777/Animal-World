import { sceneHtml } from "../../data/sceneHtml";

export function showToastMapExplore() {
  sessionStorage.setItem("toast-mapExplore-close", "false");

  const getLocalStorageMapExplore = localStorage.getItem("mapExplore");
  const getSessionStorageMapExploreClose = sessionStorage.getItem("toast-mapExplore-close");
  const toast = document.getElementById("toast") as HTMLElement;

  if (getLocalStorageMapExplore === "true" && getSessionStorageMapExploreClose !== "true") {
    toast.innerHTML = sceneHtml.toast.storageMapExploreOn;

    // 이전 타이머가 있다면 정리
    if (window.toastTimers) {
      window.toastTimers.forEach((timerId: number | NodeJS.Timeout) => clearTimeout(timerId as any));
    }

    // 새로운 타이머 ID들을 저장할 배열
    window.toastTimers = [];

    const timer1 = setTimeout(() => {
      const toastWrapper = document.querySelector(".toast-wrapper") as HTMLElement;
      if (toastWrapper) {
        toastWrapper.classList.add("active");
      }
    }, 10);
    window.toastTimers.push(timer1);
  }
}
