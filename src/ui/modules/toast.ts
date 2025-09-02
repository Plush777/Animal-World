import { sceneHtml } from "../../data/sceneHtml";

export function showToastMapExplore() {
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

    // const timer2 = setTimeout(() => {
    //   const toastWrapper = document.querySelector(".toast-wrapper") as HTMLElement;
    //   if (toastWrapper) {
    //     toastWrapper.classList.remove("active");

    //     // transition이 완료된 후 HTML 내용을 비움 (0.5초 후)
    //     const timer3 = setTimeout(() => {
    //       toast.innerHTML = "";
    //     }, 500);
    //     if (window.toastTimers) {
    //       window.toastTimers.push(timer3);
    //     }
    //   }
    // }, 3000);
    // window.toastTimers.push(timer2);
  }
}
