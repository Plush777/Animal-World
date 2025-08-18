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

  const canvasLoadedEvent = new CustomEvent("canvasLoadingComplete");

  document.dispatchEvent(canvasLoadedEvent);
};

document.addEventListener("DOMContentLoaded", () => {
  initializeTheme();
  startAutoThemeUpdater();
});
