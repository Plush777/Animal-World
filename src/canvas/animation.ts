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

interface CameraAnimation {
  camera: THREE.PerspectiveCamera;
  controls: OrbitControls;
  startPosition: THREE.Vector3;
  targetPosition: THREE.Vector3;
  startTime: number;
  duration: number;
  isActive: boolean;
}

const floatingObjects: FloatingAnimation[] = [];
const waterWaveObjects: WaterWaveAnimation[] = [];
let cameraAnimation: CameraAnimation | null = null;

export function addFloatingAnimation(object: THREE.Object3D, amplitude: number = 10, frequency: number = 1, phase: number = 0): void {
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

// 카메라 애니메이션 시작 함수
export function startCameraAnimation(
  camera: THREE.PerspectiveCamera,
  controls: OrbitControls,
  targetX: number,
  targetY: number,
  targetZ: number,
  duration: number = 2000
): void {
  // 기존 애니메이션이 있으면 중단
  if (cameraAnimation?.isActive) {
    cameraAnimation.isActive = false;
  }

  // 새로운 카메라 애니메이션 설정
  cameraAnimation = {
    camera,
    controls,
    startPosition: camera.position.clone(),
    targetPosition: new THREE.Vector3(targetX, targetY, targetZ),
    startTime: Date.now(),
    duration,
    isActive: true,
  };

  console.log(`카메라 애니메이션 시작: (${targetX}, ${targetY}, ${targetZ})`);
}

// easing 함수 (부드러운 애니메이션을 위한)
function easeInOutCubic(t: number): number {
  return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
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
    const { object, originalPosition, originalRotation, waveSpeed, phase } = waterWave;

    // 위치는 고정 (움직임 없음)
    object.position.copy(originalPosition);

    // 물결 효과를 위한 회전 (좌우로 부드럽게 흔들림) - 더 흔들리게 증가
    const rotationOffset = Math.sin(time * waveSpeed * 0.8 + phase) * 0.015;
    object.rotation.z = originalRotation.z + rotationOffset;

    // 물결 효과를 위한 X축 회전 (앞뒤로 부드럽게 흔들림) - 더 흔들리게 증가
    const xRotationOffset = Math.sin(time * waveSpeed * 0.6 + phase + 1) * 0.012;
    object.rotation.x = originalRotation.x + xRotationOffset;

    // 물결 효과를 위한 Y축 회전 (좌우로 부드럽게 흔들림) - 더 흔들리게 증가
    const yRotationOffset = Math.sin(time * waveSpeed * 0.7 + phase + 2) * 0.018;
    object.rotation.y = originalRotation.y + yRotationOffset;

    // 물결 효과를 위한 스케일 변화 (호흡하는 듯한 효과) - 더 흔들리게 증가
    const scaleOffset = Math.sin(time * waveSpeed * 0.5 + phase) * 0.003;
    const newScale = 1 + scaleOffset;
    object.scale.set(newScale, newScale, newScale);

    // 물결 효과를 위한 재질 애니메이션 (투명도 변화) - 더 흔들리게 증가
    if (object instanceof THREE.Mesh && object.material) {
      const material = Array.isArray(object.material) ? object.material[0] : object.material;
      if (material && material.transparent) {
        const opacityOffset = Math.sin(time * waveSpeed * 0.4 + phase) * 0.05;
        material.opacity = Math.max(0.85, Math.min(0.98, 0.92 + opacityOffset));
      }
    }
  });
}

function updateCameraAnimation(): void {
  if (!cameraAnimation || !cameraAnimation.isActive) {
    return;
  }

  const { camera, controls, startPosition, targetPosition, startTime, duration } = cameraAnimation;
  const elapsed = Date.now() - startTime;
  const progress = Math.min(elapsed / duration, 1);

  // easeInOutCubic 함수 사용하여 부드러운 애니메이션
  const easedProgress = easeInOutCubic(progress);

  // 위치 보간
  const currentPosition = new THREE.Vector3().lerpVectors(startPosition, targetPosition, easedProgress);

  // 카메라 위치 설정
  camera.position.copy(currentPosition);

  // 컨트롤 업데이트
  controls.update();

  // 애니메이션 완료 확인
  if (progress >= 1) {
    cameraAnimation.isActive = false;
    console.log("카메라 애니메이션 완료");
  }
}

export function createAnimationLoop(
  scene: THREE.Scene,
  camera: THREE.PerspectiveCamera,
  renderer: THREE.WebGLRenderer,
  controls: OrbitControls | TrackballControls
): () => number {
  const clock = new THREE.Clock();
  let lastUpdateTime = 0;

  const trackballControls = new TrackballControls(camera, renderer.domElement);
  trackballControls.noRotate = true;
  trackballControls.noPan = true;
  trackballControls.noZoom = false; // Enable zoom
  trackballControls.zoomSpeed = 0.2; // Adjust as needed

  return function animate(): number {
    const time = clock.getElapsedTime();

    updateFloatingAnimations(time);
    updateWaterWaveAnimations(time);
    updateCameraAnimation(); // 카메라 애니메이션 업데이트 추가

    const target = controls.target;
    trackballControls.target.set(target.x, target.y, target.z);

    // 떠다니는 모델들이 있을 때만 그림자 맵 업데이트 (성능 최적화)
    if ((floatingObjects.length > 0 || waterWaveObjects.length > 0) && time - lastUpdateTime > 0.1) {
      renderer.shadowMap.needsUpdate = true;
      lastUpdateTime = time;
    }

    const animationId = requestAnimationFrame(animate);
    controls.update();
    trackballControls.update();
    renderer.render(scene, camera);

    return animationId;
  };
}
