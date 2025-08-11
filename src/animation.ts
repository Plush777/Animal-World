import * as THREE from "three";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";
import { TrackballControls } from "three/addons/controls/TrackballControls.js";

interface FloatingAnimation {
  object: THREE.Object3D;
  originalPosition: THREE.Vector3;
  amplitude: number;
  frequency: number;
  phase: number;
}

const floatingObjects: FloatingAnimation[] = [];

export function addFloatingAnimation(
  object: THREE.Object3D,
  amplitude: number = 10,
  frequency: number = 1,
  phase: number = 0
): void {
  floatingObjects.push({
    object,
    originalPosition: object.position.clone(),
    amplitude,
    frequency,
    phase,
  });
}

function updateFloatingAnimations(time: number): void {
  floatingObjects.forEach((floating) => {
    const { object, originalPosition, amplitude, frequency, phase } = floating;

    const yOffset = Math.sin(time * frequency + phase) * amplitude;
    object.position.y = originalPosition.y + yOffset;
  });
}

export function createAnimationLoop(
  scene: THREE.Scene,
  camera: THREE.PerspectiveCamera,
  renderer: THREE.WebGLRenderer,
  controls: OrbitControls | TrackballControls
): () => void {
  const clock = new THREE.Clock();
  let lastUpdateTime = 0;

  const trackballControls = new TrackballControls(camera, renderer.domElement);
  trackballControls.noRotate = true;
  trackballControls.noPan = true;
  trackballControls.noZoom = false; // Enable zoom
  trackballControls.zoomSpeed = 0.2; // Adjust as needed

  return function animate(): void {
    const time = clock.getElapsedTime();

    updateFloatingAnimations(time);

    const target = controls.target;
    trackballControls.target.set(target.x, target.y, target.z);

    // 떠다니는 모델들이 있을 때만 그림자 맵 업데이트 (성능 최적화)
    if (floatingObjects.length > 0 && time - lastUpdateTime > 0.1) {
      renderer.shadowMap.needsUpdate = true;
      lastUpdateTime = time;
    }

    requestAnimationFrame(animate);
    controls.update();
    trackballControls.update();
    renderer.render(scene, camera);
  };
}
