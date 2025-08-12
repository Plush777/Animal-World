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

interface WaterWaveAnimation {
  object: THREE.Object3D;
  originalPosition: THREE.Vector3;
  originalRotation: THREE.Euler;
  waveAmplitude: number;
  waveFrequency: number;
  waveSpeed: number;
  phase: number;
}

const floatingObjects: FloatingAnimation[] = [];
const waterWaveObjects: WaterWaveAnimation[] = [];

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

export function addWaterWaveAnimation(
  object: THREE.Object3D,
  waveAmplitude: number = 0.5,
  waveFrequency: number = 2.0,
  waveSpeed: number = 1.0,
  phase: number = 0
): void {
  waterWaveObjects.push({
    object,
    originalPosition: object.position.clone(),
    originalRotation: object.rotation.clone(),
    waveAmplitude,
    waveFrequency,
    waveSpeed,
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

function updateWaterWaveAnimations(time: number): void {
  waterWaveObjects.forEach((waterWave) => {
    const {
      object,
      originalPosition,
      originalRotation,
      waveAmplitude,
      waveFrequency,
      waveSpeed,
      phase,
    } = waterWave;

    // 위치는 고정 (움직임 없음)
    object.position.copy(originalPosition);

    // 물결 효과를 위한 회전 (좌우로 부드럽게 흔들림)
    const rotationOffset = Math.sin(time * waveSpeed * 0.5 + phase) * 0.02;
    object.rotation.z = originalRotation.z + rotationOffset;

    // 물결 효과를 위한 X축 회전 (앞뒤로 부드럽게 흔들림)
    const xRotationOffset = Math.sin(time * waveSpeed * 0.3 + phase + 1) * 0.01;
    object.rotation.x = originalRotation.x + xRotationOffset;

    // 물결 효과를 위한 Y축 회전 (좌우로 부드럽게 흔들림)
    const yRotationOffset =
      Math.sin(time * waveSpeed * 0.4 + phase + 2) * 0.015;
    object.rotation.y = originalRotation.y + yRotationOffset;

    // 물결 효과를 위한 스케일 변화 (호흡하는 듯한 효과)
    const scaleOffset = Math.sin(time * waveSpeed * 0.3 + phase) * 0.01;
    const newScale = 1 + scaleOffset;
    object.scale.set(newScale, newScale, newScale);

    // 물결 효과를 위한 재질 애니메이션 (투명도 변화)
    if (object instanceof THREE.Mesh && object.material) {
      const material = Array.isArray(object.material)
        ? object.material[0]
        : object.material;
      if (material && material.transparent) {
        const opacityOffset = Math.sin(time * waveSpeed * 0.2 + phase) * 0.1;
        material.opacity = Math.max(0.3, Math.min(0.7, 0.5 + opacityOffset));
      }
    }
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
    updateWaterWaveAnimations(time);

    const target = controls.target;
    trackballControls.target.set(target.x, target.y, target.z);

    // 떠다니는 모델들이 있을 때만 그림자 맵 업데이트 (성능 최적화)
    if (
      (floatingObjects.length > 0 || waterWaveObjects.length > 0) &&
      time - lastUpdateTime > 0.1
    ) {
      renderer.shadowMap.needsUpdate = true;
      lastUpdateTime = time;
    }

    requestAnimationFrame(animate);
    controls.update();
    trackballControls.update();
    renderer.render(scene, camera);
  };
}
