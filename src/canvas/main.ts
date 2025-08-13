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

async function init(): Promise<void> {
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
