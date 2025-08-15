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
import { initializeTheme } from "../ui/theme";

async function init(): Promise<void> {
  initializeTheme();

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
}

init();
