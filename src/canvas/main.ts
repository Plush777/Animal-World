import {
  createScene,
  createCamera,
  createRenderer,
  setupLighting,
  setupResizeHandler,
  setupOrbitControls,
  loadMultipleModels,
  createCircularGradientGround,
  setupCameraEventListeners,
} from "./scene";

import { createAnimationLoop } from "./animation";

import { initializeTheme, startAutoThemeUpdater } from "../ui/theme";

// 전역 함수로 선언
(window as any).initCanvas = async function (): Promise<void> {
  const scene = createScene();

  const camera = createCamera();

  const renderer = createRenderer();

  setupLighting(scene);

  createCircularGradientGround(scene);

  await loadMultipleModels(scene);

  const controls = setupOrbitControls(camera, renderer);

  setupCameraEventListeners(camera, controls);

  setupResizeHandler(camera, renderer);

  const animate = createAnimationLoop(scene, camera, renderer, controls);
  animate();

  // Canvas 로딩 완료 이벤트 발생
  const canvasLoadedEvent = new CustomEvent("canvasLoadingComplete");
  document.dispatchEvent(canvasLoadedEvent);
};

// 페이지 로드 시 테마 초기화
document.addEventListener("DOMContentLoaded", () => {
  initializeTheme();
  startAutoThemeUpdater();
});
