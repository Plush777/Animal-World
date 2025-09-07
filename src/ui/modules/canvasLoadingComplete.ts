import { showToastMapExplore } from "./toast";

export function canvasLoadingComplete() {
  document.addEventListener(
    "canvasLoadingComplete",
    () => {
      // ui-visible 클래스가 추가될 때까지 대기 (3초 후)
      setTimeout(() => {
        showToastMapExplore();
      }, 3000);
    },
    { once: true }
  );
}
