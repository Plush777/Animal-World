import * as THREE from "three";
import { getSceneModelBoundaryInfo } from "../utils/glbLoader";
import { isDayTime } from "./time";
import { getBoundaryMargin, getCircularBoundarySettings } from "./smoothCharacterController";

declare global {
  interface Window {
    Ammo: any;
  }
}

let ammoInitialized = false;
let ammoInitPromise: Promise<void> | null = null;

// Ammo.js 초기화 함수
export async function initializeAmmo(): Promise<void> {
  if (ammoInitialized) {
    return;
  }

  if (ammoInitPromise) {
    return ammoInitPromise;
  }

  try {
    // CDN에서 로드된 Ammo.js 사용
    if (typeof window.Ammo !== "undefined") {
      ammoInitialized = true;
      console.log("Ammo.js CDN에서 로드됨");
      return Promise.resolve();
    }

    // fallback: npm 패키지 사용
    const AmmoModule = await import("ammojs-typed");
    ammoInitPromise = AmmoModule.default()
      .then((AmmoInstance: any) => {
        (window as any).Ammo = AmmoInstance;
        ammoInitialized = true;
        console.log("Ammo.js 초기화 완료");
      })
      .catch((error: any) => {
        console.error("Ammo.js 초기화 중 오류:", error);
        throw error;
      });

    return ammoInitPromise;
  } catch (error) {
    console.error("Ammo.js 초기화 실패:", error);
    throw error;
  }
}

// 물리 엔진 초기화 함수
export function initPhysicsWorld(): any {
  const Ammo = window.Ammo;
  if (!Ammo) {
    console.warn("Ammo.js가 로드되지 않았습니다.");
    return null;
  }

  const collisionConfiguration = new Ammo.btDefaultCollisionConfiguration();
  const dispatcher = new Ammo.btCollisionDispatcher(collisionConfiguration);
  const broadphase = new Ammo.btDbvtBroadphase();
  const solver = new Ammo.btSequentialImpulseConstraintSolver();

  const physicsWorld = new Ammo.btDiscreteDynamicsWorld(dispatcher, broadphase, solver, collisionConfiguration);
  physicsWorld.setGravity(new Ammo.btVector3(0, -9.8, 0)); // 표준 중력으로 조정하여 안정성 향상

  // 더 정확한 충돌 감지를 위한 설정 (Ammo.js API에 맞게 수정)
  try {
    const solverInfo = physicsWorld.getSolverInfo();
    if (solverInfo && solverInfo.set_m_numIterations) {
      solverInfo.set_m_numIterations(10);
    }
    // solverMode 설정은 제거 (API에서 지원하지 않음)
  } catch (error) {
    console.warn("물리 솔버 고급 설정 실패, 기본 설정 사용:", error);
  }

  console.log("물리 월드 생성 완료 - 중력: -9.8");
  return physicsWorld;
}

// 향상된 지형 높이 감지 시스템 - 다중 레이캐스팅과 스무딩 적용
export function findGroundHeight(physicsWorld: any, x: number, z: number): number {
  const Ammo = window.Ammo;
  if (!Ammo || !physicsWorld) {
    console.warn("Ammo 또는 physicsWorld가 없음");
    return 80; // 기본값
  }

  // 다중 레이캐스팅으로 정확한 지형 높이 감지
  const rayResults: number[] = [];
  const sampleOffsets = [
    { x: 0, z: 0 }, // 중앙
    { x: 0.5, z: 0 }, // 오른쪽
    { x: -0.5, z: 0 }, // 왼쪽
    { x: 0, z: 0.5 }, // 앞
    { x: 0, z: -0.5 }, // 뒤
  ];

  sampleOffsets.forEach((offset) => {
    const sampleX = x + offset.x;
    const sampleZ = z + offset.z;

    // 위에서 아래로 레이캐스팅
    const rayStart = new Ammo.btVector3(sampleX, 500, sampleZ);
    const rayEnd = new Ammo.btVector3(sampleX, -100, sampleZ);
    const rayCallback = new Ammo.ClosestRayResultCallback(rayStart, rayEnd);

    physicsWorld.rayTest(rayStart, rayEnd, rayCallback);

    if (rayCallback.hasHit()) {
      const hitPoint = rayCallback.get_m_hitPointWorld();
      rayResults.push(hitPoint.y());
    }
  });

  if (rayResults.length > 0) {
    // 평균 높이 계산으로 스무딩 효과
    const averageHeight = rayResults.reduce((sum, height) => sum + height, 0) / rayResults.length;

    return averageHeight + 1.5; // 지면에서 1.5 단위 위로 조정
  } else {
    // Forest 위치 기본값
    if (Math.abs(x - 70) < 150 && Math.abs(z - 100) < 150) {
      return 150;
    }
    return 5;
  }
}

// 캐릭터 주변 지형 분석 함수 - TPS 게임 스타일
export function analyzeTerrainAroundCharacter(
  physicsWorld: any,
  x: number,
  z: number,
  range: number = 5
): {
  currentHeight: number;
  averageHeight: number;
  slope: number;
  canMove: boolean;
} {
  const Ammo = window.Ammo;
  if (!Ammo || !physicsWorld) {
    return { currentHeight: 80, averageHeight: 80, slope: 0, canMove: true };
  }

  const heights: number[] = [];
  const gridSize = 9; // 3x3 그리드
  const step = range / (gridSize - 1);

  // 그리드 패턴으로 지형 샘플링
  for (let i = 0; i < gridSize; i++) {
    for (let j = 0; j < gridSize; j++) {
      const sampleX = x - range / 2 + i * step;
      const sampleZ = z - range / 2 + j * step;

      const rayStart = new Ammo.btVector3(sampleX, 300, sampleZ);
      const rayEnd = new Ammo.btVector3(sampleX, -50, sampleZ);
      const rayCallback = new Ammo.ClosestRayResultCallback(rayStart, rayEnd);

      physicsWorld.rayTest(rayStart, rayEnd, rayCallback);

      if (rayCallback.hasHit()) {
        const hitPoint = rayCallback.get_m_hitPointWorld();
        heights.push(hitPoint.y());
      }
    }
  }

  if (heights.length === 0) {
    return { currentHeight: 80, averageHeight: 80, slope: 0, canMove: true };
  }

  const currentHeight = findGroundHeight(physicsWorld, x, z);
  const averageHeight = heights.reduce((sum, h) => sum + h, 0) / heights.length;
  const minHeight = Math.min(...heights);
  const maxHeight = Math.max(...heights);
  const slope = maxHeight - minHeight;

  // 이동 가능 여부 판단 (경사가 너무 가파르지 않은지)
  const canMove = slope < 15; // 15 단위 이하의 경사만 이동 가능

  return {
    currentHeight,
    averageHeight,
    slope,
    canMove,
  };
}

// 지면 레이캐스팅 테스트 함수 (디버깅용)
function performGroundRayTest(physicsWorld: any, x: number, z: number): boolean {
  const Ammo = window.Ammo;
  if (!Ammo || !physicsWorld) return false;

  const rayStart = new Ammo.btVector3(x, 50, z); // 현재 위치에서 위로
  const rayEnd = new Ammo.btVector3(x, -50, z); // 현재 위치에서 아래로

  const rayCallback = new Ammo.ClosestRayResultCallback(rayStart, rayEnd);
  physicsWorld.rayTest(rayStart, rayEnd, rayCallback);

  return rayCallback.hasHit();
}

// 물리 엔진용 경계 체크 함수
function checkPhysicsBounds(position: THREE.Vector3, scene?: THREE.Scene): THREE.Vector3 {
  const newPosition = position.clone();
  let boundaryChanged = false;

  // 방향별 동적 마진 사용 (smoothCharacterController와 동일)
  const boundaryMargins = getBoundaryMargin();
  const SCENE_BOUNDARY_MARGIN_X = boundaryMargins.x;
  const SCENE_BOUNDARY_MARGIN_Z = boundaryMargins.z;

  // 원형 경계 설정 확인
  const circularSettings = getCircularBoundarySettings();
  const useCircularBoundary = circularSettings.enabled;
  const circularBoundaryMargin = circularSettings.margin;

  // 씬 모델의 실제 경계를 사용한 체크
  if (scene) {
    const isDay = isDayTime();
    const modelName = isDay ? "scene.glb" : "night_sky_scene.glb";

    const boundaryInfo = getSceneModelBoundaryInfo(scene, modelName);

    if (boundaryInfo) {
      // 모델의 실제 경계를 사용하여 체크
      const { center, size } = boundaryInfo;

      if (useCircularBoundary) {
        // 원형 경계 사용
        const radius = Math.min(size.x, size.z) / 2 - circularBoundaryMargin;
        const circularCenter = new THREE.Vector3(center.x, center.y, center.z);

        // 중심점에서의 거리 계산
        const distanceFromCenter = Math.sqrt(Math.pow(newPosition.x - circularCenter.x, 2) + Math.pow(newPosition.z - circularCenter.z, 2));

        // 경계를 벗어났는지 확인
        if (distanceFromCenter > radius) {
          // 중심점에서 경계까지의 방향 벡터 계산
          const directionX = (newPosition.x - circularCenter.x) / distanceFromCenter;
          const directionZ = (newPosition.z - circularCenter.z) / distanceFromCenter;

          // 경계 위의 가장 가까운 점으로 이동
          newPosition.x = circularCenter.x + directionX * radius;
          newPosition.z = circularCenter.z + directionZ * radius;
          boundaryChanged = true;

          console.log(
            `⭕ 물리 엔진 원형 경계 제한: 거리 ${distanceFromCenter.toFixed(1)} → ${radius.toFixed(1)} (${position.x.toFixed(
              1
            )}, ${position.z.toFixed(1)}) → (${newPosition.x.toFixed(1)}, ${newPosition.z.toFixed(1)})`
          );
        }
      } else {
        // 기존 사각형 경계 사용
        const halfWidth = size.x / 2 - SCENE_BOUNDARY_MARGIN_X;
        const halfDepth = size.z / 2 - SCENE_BOUNDARY_MARGIN_Z;

        const minX = center.x - halfWidth;
        const maxX = center.x + halfWidth;
        const minZ = center.z - halfDepth;
        const maxZ = center.z + halfDepth;

        // 경계 체크 및 제한
        if (newPosition.x < minX) {
          newPosition.x = minX;
          boundaryChanged = true;
        } else if (newPosition.x > maxX) {
          newPosition.x = maxX;
          boundaryChanged = true;
        }

        if (newPosition.z < minZ) {
          newPosition.z = minZ;
          boundaryChanged = true;
        } else if (newPosition.z > maxZ) {
          newPosition.z = maxZ;
          boundaryChanged = true;
        }
      }

      if (boundaryChanged) {
        console.log(
          `🌌 물리 엔진 씬 모델 경계 제한 (${modelName}, 마진 X:${SCENE_BOUNDARY_MARGIN_X}, Z:${SCENE_BOUNDARY_MARGIN_Z}): (${position.x.toFixed(
            1
          )}, ${position.z.toFixed(1)}) → (${newPosition.x.toFixed(1)}, ${newPosition.z.toFixed(1)})`
        );
      }
    } else {
      // 모델을 찾을 수 없는 경우 기본 경계 사용
      const bounds = isDay ? { minX: -800, maxX: 800, minZ: -800, maxZ: 800 } : { minX: -3800, maxX: 3800, minZ: -3800, maxZ: 3800 };

      newPosition.x = THREE.MathUtils.clamp(newPosition.x, bounds.minX, bounds.maxX);
      newPosition.z = THREE.MathUtils.clamp(newPosition.z, bounds.minZ, bounds.maxZ);

      if (newPosition.x !== position.x || newPosition.z !== position.z) {
        boundaryChanged = true;
        console.log(
          `🚧 물리 엔진 기본 경계 제한: (${position.x.toFixed(1)}, ${position.z.toFixed(1)}) → (${newPosition.x.toFixed(1)}, ${newPosition.z.toFixed(
            1
          )})`
        );
      }
    }
  }

  return newPosition;
}

// 캐릭터 업데이트 함수 - 안정성 개선 및 의도하지 않은 Y 이동 방지
export function updateCharacterController(character: any, keys: any, _deltaTime: number): { moveX: number; moveZ: number; isMoving: boolean } {
  const Ammo = window.Ammo;
  if (!Ammo || !character) return { moveX: 0, moveZ: 0, isMoving: false };

  // 이전 위치 저장 (Y값 모니터링용)
  const transform = character.ghostObject.getWorldTransform();
  const origin = transform.getOrigin();
  const prevPos = new THREE.Vector3(origin.x(), origin.y(), origin.z());

  const walkDirection = new Ammo.btVector3(0, 0, 0);
  const speed = 3; // 속도를 더 안정적으로 조정

  // 채팅 입력 필드가 활성화되어 있으면 이동 처리 건너뛰기
  const activeElement = document.activeElement;
  const isChatInputActive = activeElement?.tagName === "INPUT" || activeElement?.tagName === "TEXTAREA";
  if (isChatInputActive) {
    return { moveX: 0, moveZ: 0, isMoving: false };
  }

  // 키 입력 처리
  let isMoving = false;
  let moveX = 0;
  let moveZ = 0;

  if (keys["KeyW"] || keys["ArrowUp"]) {
    moveZ = -1;
    isMoving = true;
  }
  if (keys["KeyS"] || keys["ArrowDown"]) {
    moveZ = 1;
    isMoving = true;
  }
  if (keys["KeyA"] || keys["ArrowLeft"]) {
    moveX = -1;
    isMoving = true;
  }
  if (keys["KeyD"] || keys["ArrowRight"]) {
    moveX = 1;
    isMoving = true;
  }

  // 대각선 이동시 속도 정규화
  if (moveX !== 0 && moveZ !== 0) {
    const magnitude = Math.sqrt(moveX * moveX + moveZ * moveZ);
    moveX = (moveX / magnitude) * speed;
    moveZ = (moveZ / magnitude) * speed;
  } else {
    moveX *= speed;
    moveZ *= speed;
  }

  // 새로운 캐릭터 컨트롤러 시스템 사용
  // 먼저 위치 업데이트 (중력과 지면 감지)
  character.controller.updatePosition(1 / 60);

  // 움직임이 있을 때만 walkDirection 설정
  if (isMoving) {
    walkDirection.setX(moveX);
    walkDirection.setZ(moveZ);
    character.controller.setWalkDirection(walkDirection);
  }

  // 업데이트 후 위치 가져오기
  const newTransform = character.ghostObject.getWorldTransform();
  const newOrigin = newTransform.getOrigin();
  const newPos = new THREE.Vector3(newOrigin.x(), newOrigin.y(), newOrigin.z());

  // Y값 변화 모니터링 및 충돌 상태 디버깅
  const yDiff = Math.abs(newPos.y - prevPos.y);

  // 충돌 감지 상태 확인 (새로운 시스템)
  const isOnGround = character.controller.onGround();

  // 개선된 디버깅 정보 출력 - TPS 게임 스타일 시스템
  const detailedMode = (window as any).detailedDebugMode;
  const shouldDebug = detailedMode || (!isOnGround ? Math.random() < 0.15 : Math.random() < 0.03);

  if (shouldDebug) {
    console.log(`=== 🎮 TPS 지형 추적 상태 ===`);
    console.log(`📍 위치: (${newPos.x.toFixed(1)}, ${newPos.y.toFixed(1)}, ${newPos.z.toFixed(1)})`);
    console.log(`📊 Y변화: ${yDiff.toFixed(3)}`);
    console.log(`🏃 지면 접촉: ${isOnGround ? "✅ YES" : "❌ NO"}`);
    console.log(`🎯 움직임: ${isMoving ? "🚶 이동중" : "🧍 정지"}`);

    // 지형 분석 정보 추가
    const physicsWorld = (window as any).globalPhysicsWorld;
    if (physicsWorld) {
      console.log(`🌍 물리 월드: 정상 동작`);

      const terrainAnalysis = analyzeTerrainAroundCharacter(physicsWorld, newPos.x, newPos.z, 3);
      console.log(`🏔️ 지형 높이: ${terrainAnalysis.currentHeight.toFixed(1)}`);
      console.log(`📈 지형 경사: ${terrainAnalysis.slope.toFixed(1)}°`);
      console.log(`🚶 이동 가능: ${terrainAnalysis.canMove ? "✅" : "❌"}`);

      // 기본 레이캐스팅도 테스트
      const testRay = performGroundRayTest(physicsWorld, newPos.x, newPos.z);
      console.log(`📡 레이캐스팅: ${testRay ? "✅ 지면 감지" : "❌ 감지 실패"}`);
    }
    console.log(`==============================`);
  }

  // TPS 게임 스타일 지형 관통 방지 시스템
  const physicsWorld = (window as any).globalPhysicsWorld;
  if (physicsWorld && isOnGround) {
    // 현재 위치의 정확한 지형 높이 확인
    const currentGroundHeight = findGroundHeight(physicsWorld, newPos.x, newPos.z);
    const minAllowedHeight = currentGroundHeight - 0.5; // 지면 아래 0.5 단위까지만 허용

    // 관통 검사 및 수정
    if (newPos.y < minAllowedHeight) {
      // 지형 관통 감지! 즉시 수정
      console.log(`🚨 지형 관통 감지! ${newPos.y.toFixed(1)} < ${minAllowedHeight.toFixed(1)}`);

      const correctedTransform = new Ammo.btTransform();
      correctedTransform.setIdentity();
      correctedTransform.setOrigin(new Ammo.btVector3(newPos.x, currentGroundHeight, newPos.z));
      character.ghostObject.setWorldTransform(correctedTransform);

      // 메시 위치도 즉시 동기화
      character.mesh.position.set(newPos.x, currentGroundHeight, newPos.z);

      console.log(`✅ 지형 관통 수정 완료: ${newPos.y.toFixed(1)} → ${currentGroundHeight.toFixed(1)}`);
    }
    // 일반적인 안정화 (큰 Y값 변화 시)
    else if (yDiff > 3.0) {
      const correctGroundHeight = character.controller.lastGroundHeight;

      const correctedTransform = new Ammo.btTransform();
      correctedTransform.setIdentity();
      correctedTransform.setOrigin(new Ammo.btVector3(newPos.x, correctGroundHeight, newPos.z));
      character.ghostObject.setWorldTransform(correctedTransform);

      character.mesh.position.set(newPos.x, correctGroundHeight, newPos.z);

      if (Math.random() < 0.05) {
        console.log(`⚖️ Y값 안정화: ${newPos.y.toFixed(1)} → ${correctGroundHeight.toFixed(1)}`);
      }
    }
  }

  // 경계 체크 적용
  const scene = (window as any).globalScene;
  if (scene) {
    const boundedPos = checkPhysicsBounds(newPos, scene);
    if (boundedPos.x !== newPos.x || boundedPos.z !== newPos.z) {
      // 경계 제한이 적용된 경우 물리 객체 위치도 수정
      const correctedTransform = new Ammo.btTransform();
      correctedTransform.setIdentity();
      correctedTransform.setOrigin(new Ammo.btVector3(boundedPos.x, boundedPos.y, boundedPos.z));
      character.ghostObject.setWorldTransform(correctedTransform);
      newPos.copy(boundedPos);
    }
  }

  // 메시 위치 동기화
  character.mesh.position.copy(newPos);

  // 디버깅 정보 (빈도 줄이기)
  if ((isMoving || yDiff > 0.1) && Math.random() < 0.05) {
    console.log(`캐릭터 위치: (${newPos.x.toFixed(1)}, ${newPos.y.toFixed(1)}, ${newPos.z.toFixed(1)}), Y변화: ${yDiff.toFixed(3)}`);
  }

  // 새로운 시스템에서는 자동으로 지면에 유지되므로 긴급 리셋이 거의 불필요
  // 하지만 만약을 위해 매우 낮은 임계값으로 설정
  if (newPos.y < -50) {
    console.log("캐릭터 위치 극한 상황 리셋! 현재 위치:", newPos.y);

    const resetTransform = new Ammo.btTransform();
    resetTransform.setIdentity();
    resetTransform.setOrigin(new Ammo.btVector3(70, 50, 100)); // 안전한 기본 위치
    character.ghostObject.setWorldTransform(resetTransform);
    character.mesh.position.set(70, 50, 100);
    character.controller.isOnGround = false; // 지면 상태 리셋
    console.log("캐릭터 위치 극한 상황 리셋 완료: (70, 50, 100)");
  }

  // 이동 정보 반환
  return { moveX, moveZ, isMoving };
}
