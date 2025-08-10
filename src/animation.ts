import * as THREE from "three";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";

export function createAnimationLoop(
  scene: THREE.Scene,
  camera: THREE.PerspectiveCamera,
  renderer: THREE.WebGLRenderer,
  controls: OrbitControls
): () => void {
  return function animate(): void {
    requestAnimationFrame(animate);
    controls.update();
    renderer.render(scene, camera);
  };
}
