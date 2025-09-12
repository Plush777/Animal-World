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

// 캐릭터 이동 방향 추적을 위한 변수들
let targetRotation = 0;

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
  controls: OrbitControls | TrackballControls,
  characterManager?: any,

  keys?: any,
  getPhysicsCharacterController?: () => any
): () => number {
  const clock = new THREE.Clock();

  const trackballControls = new TrackballControls(camera, renderer.domElement);
  trackballControls.noRotate = true;
  trackballControls.noPan = true;
  trackballControls.noZoom = false; // Enable zoom
  trackballControls.zoomSpeed = 0.2; // Adjust as needed

  return function animate(): number {
    const time = clock.getElapsedTime();
    // deltaTime 가져오기 (현재 사용 안함 - 고정 타임스텝 사용)
    clock.getDelta();

    updateFloatingAnimations(time);
    updateWaterWaveAnimations(time);
    updateCameraAnimation(); // 카메라 애니메이션 업데이트 추가

    // 캐릭터 컨트롤러 업데이트 (부드러운 컨트롤러 우선)
    const characterController = getPhysicsCharacterController ? getPhysicsCharacterController() : null;
    if (characterController && keys) {
      try {
        let characterPos = null;
        let moveInfo = null;

        // 부드러운 캐릭터 컨트롤러인지 확인
        if (characterController.update && typeof characterController.update === "function") {
          // 새로운 부드러운 컨트롤러
          characterController.update(keys, 1 / 60);
          characterPos = characterController.getPosition();

          // 이동 정보 계산 (키 입력 기반)
          const isMoving =
            keys["KeyW"] ||
            keys["KeyS"] ||
            keys["KeyA"] ||
            keys["KeyD"] ||
            keys["ArrowUp"] ||
            keys["ArrowDown"] ||
            keys["ArrowLeft"] ||
            keys["ArrowRight"];

          let moveX = 0,
            moveZ = 0;
          if (keys["KeyA"] || keys["ArrowLeft"]) moveX = -1;
          if (keys["KeyD"] || keys["ArrowRight"]) moveX = 1;
          if (keys["KeyW"] || keys["ArrowUp"]) moveZ = -1;
          if (keys["KeyS"] || keys["ArrowDown"]) moveZ = 1;

          moveInfo = { moveX, moveZ, isMoving };
        }

        // 시각적 캐릭터 모델을 컨트롤러 위치와 동기화
        if (characterManager && characterPos) {
          // CharacterManager의 새로운 메서드를 사용하여 현재 선택된 캐릭터 가져오기
          let visualCharacter = null;

          // 먼저 CharacterManager에서 현재 선택된 캐릭터 확인
          if (characterManager.getCurrentSelectedCharacter) {
            visualCharacter = characterManager.getCurrentSelectedCharacter();
          }

          if (visualCharacter) {
            // 시각적 모델을 컨트롤러 위치로 정확히 이동 (높이 조정 없음)
            const syncPosition = new THREE.Vector3(characterPos.x, characterPos.y, characterPos.z);

            // CharacterManager의 새로운 메서드를 사용하여 위치 설정
            if (characterManager.setCharacterPosition) {
              characterManager.setCharacterPosition(visualCharacter.id, syncPosition);
            }

            // 추가로 직접 모델 위치도 설정 (이중 보장)
            visualCharacter.model.position.copy(syncPosition);
            visualCharacter.model.updateMatrixWorld(true);

            // 캐릭터 회전 처리 (이동 방향에 따라)
            if (moveInfo && moveInfo.isMoving) {
              const moveX = moveInfo.moveX;
              const moveZ = moveInfo.moveZ;

              // 이동 방향에 따른 회전 각도 계산
              if (moveX !== 0 || moveZ !== 0) {
                targetRotation = Math.atan2(moveX, moveZ);
              }
            }

            // 부드러운 회전 적용
            if (targetRotation !== undefined) {
              const currentRotation = visualCharacter.model.rotation.y;
              const rotationDiff = targetRotation - currentRotation;

              // 각도 차이를 -π ~ π 범위로 정규화
              let normalizedDiff = ((rotationDiff + Math.PI) % (2 * Math.PI)) - Math.PI;

              // 부드러운 회전 적용 (lerp)
              const rotationSpeed = 0.15;
              visualCharacter.model.rotation.y += normalizedDiff * rotationSpeed;
            }

            // 시각적 모델이 보이도록 설정
            visualCharacter.model.visible = true;
          }
        }
      } catch (error) {
        console.error("캐릭터 컨트롤러 에러:", error);
      }
    }

    // 캐릭터 매니저 업데이트 (시각적 모델 업데이트)
    if (characterManager) {
      try {
        // 캐릭터 컨트롤러가 없을 때만 keys를 전달
        characterManager.update(characterController ? null : keys);
      } catch (error) {
        console.error("캐릭터 매니저 업데이트 에러:", error);
      }
    }

    const target = controls.target;
    trackballControls.target.set(target.x, target.y, target.z);

    // 떠다니는 모델들이 있을 때만 그림자 맵 업데이트 (성능 최적화)
    if ((floatingObjects.length > 0 || waterWaveObjects.length > 0) && time % 0.1 < 0.016) {
      renderer.shadowMap.needsUpdate = true;
    }

    const animationId = requestAnimationFrame(animate);

    try {
      controls.update();
      trackballControls.update();
      renderer.render(scene, camera);
    } catch (error) {
      console.error("렌더링 에러:", error);
    }

    return animationId;
  };
}
