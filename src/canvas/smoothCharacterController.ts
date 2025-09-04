import * as THREE from "three";
import { TerrainRaycaster } from "./terrainRaycaster";
import { isDayTime } from "./time";
import { sceneHtml } from "../data/sceneHtml";
import { getSceneModelBoundaryInfo } from "../utils/glbLoader";

/**
 * Three.js Raycaster 기반 부드러운 캐릭터 컨트롤러
 * 물 속에서 구름 효과가 있는 버전 - 오브젝트 위 이동 최적화
 */

// 상수 정의
const PHYSICS_CONSTANTS = {
  MOVE_SPEED: 50,
  GRAVITY: 45,
  VELOCITY_DAMPING: 0.9,
  GROUND_CHECK_DISTANCE: 4.0,
  MAX_STEP_HEIGHT: 2.0,
  STAIR_DETECTION_RADIUS: 2.5,
  GROUND_SNAP_DISTANCE: 1.5,
  LANDING_SPEED_THRESHOLD: 5.0,
  CLOUD_OFFSET: 5.0,
  CLOUD_ROTATION_SPEED: 0.05,
  WATER_STATE_DELAY: 0.1, // 물 상태 전환 지연을 줄여서 더 빠르게 반응
  LANDING_BUFFER_DECAY: 0.9,
  MIN_VELOCITY_THRESHOLD: 0.1,
  MAX_FALL_SPEED: -70,

  // 개선된 오브젝트 위 이동 최적화 상수
  FLOATING_OBJECT_BUFFER: 3.0, // 오브젝트 위에서 더 안정적인 감지
  OBJECT_MOVE_SPEED_MULTIPLIER: 1.0, // 일반 속도와 동일하게 변경
  OBJECT_GROUND_SNAP_MULTIPLIER: 1.5, // 오브젝트 표면에 더 강하게 달라붙기
  OBJECT_DETECTION_HEIGHT_BUFFER: 15.0, // 오브젝트 감지 높이 여유분 감소
  OBJECT_STABILITY_THRESHOLD: 0.5, // 오브젝트 위에서의 안정성 임계값 감소
  FRAME_STABILITY_BUFFER: 2, // 프레임 간 안정성을 위한 버퍼 감소
  OBJECT_HEIGHT_LERP_FACTOR: 8.0, // 오브젝트 높이 보간 속도 조절
  OBJECT_TRANSITION_SMOOTHING: 0.15, // 오브젝트 전환 시 부드러움 조절
  DAMPING_FACTOR_COLLISION: 0.95, // 충돌 시 감속 계수
  LERP_FACTOR_BASE: 15, // 기본 보간 속도
  LERP_FACTOR_OBJECT: 20, // 오브젝트 위 보간 속도
  WATER_MOVE_SPEED_MULTIPLIER: 1.5, // 물 속 이동 속도 곱수
  HEIGHT_LERP_FACTOR_GROUND: 12, // 지면 높이 보간 속도
  HEIGHT_LERP_FACTOR_TERRAIN: 15, // 지형 높이 보간 속도
  DAMPING_FACTOR_LANDING: 0.85, // 착지 시 감속 계수
  DAMPING_FACTOR_WATER: 0.95, // 물 속 감속 계수

  // 씬 경계 마진 상수
  SCENE_BOUNDARY_MARGIN_X: 100, // X축(양옆) 경계에서 안전한 거리 (단위)
  SCENE_BOUNDARY_MARGIN_Z: 220, // Z축(앞뒤) 경계에서 안전한 거리 (단위) - 더 좁게 조정

  // 원형 경계 설정
  USE_CIRCULAR_BOUNDARY: true, // 원형 경계 사용 여부
  CIRCULAR_BOUNDARY_MARGIN: 50, // 원형 경계에서 안전한 거리 (단위)
} as const;

// 방향별 마진 값을 동적으로 조정할 수 있는 변수
let dynamicBoundaryMarginX: number = PHYSICS_CONSTANTS.SCENE_BOUNDARY_MARGIN_X;
let dynamicBoundaryMarginZ: number = PHYSICS_CONSTANTS.SCENE_BOUNDARY_MARGIN_Z;

// 원형 경계 관련 변수
let useCircularBoundary: boolean = PHYSICS_CONSTANTS.USE_CIRCULAR_BOUNDARY;
let circularBoundaryMargin: number = PHYSICS_CONSTANTS.CIRCULAR_BOUNDARY_MARGIN;

// 시작 위치 상수
const START_POSITIONS = [
  { x: 104.56, y: 88.87, z: 139.81 },
  { x: 169.63, y: 66.87, z: 189.27 },
  { x: 73.5, y: 110.65, z: 63.0 },
  { x: 134.81, y: 88.87, z: 68.44 },
  { x: 185.08, y: 44.65, z: 230.37 },
  { x: 38.86, y: 44.77, z: 216.85 },
] as const;

// 인터페이스 정의
export interface SmoothCharacterController {
  position: THREE.Vector3;
  velocity: THREE.Vector3;
  isOnGround: boolean;
  mesh: THREE.Mesh;
  update(keys: any, deltaTime: number): void;
  setPosition(x: number, y: number, z: number): void;
  getPosition(): THREE.Vector3;
  destroy(): void;
}

interface WaterZone {
  center: { x: number; y: number; z: number };
  size: { x: number; y: number; z: number };
  buoyancy: number;
  waterLevel: number;
}

interface FloatingObject {
  name: string;
  position: THREE.Vector3;
  radius: number;
  height: number;
  actualHeight?: number; // 실제 높이 추가
}

interface WaterStatus {
  inWater: boolean;
  waterLevel: number;
  buoyancy: number;
}

interface ObjectCollisionInfo {
  isOnFloatingObject: boolean;
  objectHeight: number;
  objectName: string;
  distanceFromCenter: number;
  stability: number;
  actualObjectHeight?: number; // 실제 오브젝트 높이 추가
}

// 캐릭터 상태 관리 클래스
class CharacterState {
  public position: THREE.Vector3;
  public velocity: THREE.Vector3;
  public isOnGround: boolean = true;

  // 물 관련 상태
  public isInWater: boolean = false;
  public waterLevel: number = 0;
  public waterBuoyancy: number = 0;
  public preWaterHeight: number = 0;

  // 착지 안정화 변수
  public landingBuffer: number = 0;
  public lastGroundHeight: number = 150;
  public groundContactTime: number = 0;
  public airTime: number = 0;

  // 캐릭터 방향
  public characterDirection: THREE.Vector3 = new THREE.Vector3(0, 0, -1);
  public lastMoveDirection: THREE.Vector3 = new THREE.Vector3(0, 0, -1);

  // 물 상태 안정화 변수
  public waterStateTimer: number = 0;
  public pendingWaterState: boolean | null = null;
  public waterTransitionInProgress: boolean = false;

  // 제어 상태
  public isControlLocked: boolean = false;

  // 개선된 오브젝트 관련 상태
  public currentObjectCollision: ObjectCollisionInfo = {
    isOnFloatingObject: false,
    objectHeight: 0,
    objectName: "",
    distanceFromCenter: 0,
    stability: 0,
    actualObjectHeight: 0,
  };
  public lastObjectCollision: ObjectCollisionInfo = {
    isOnFloatingObject: false,
    objectHeight: 0,
    objectName: "",
    distanceFromCenter: 0,
    stability: 0,
    actualObjectHeight: 0,
  };
  public objectTransitionBuffer: number = 0;
  public objectStabilityFrames: number = 0;
  public lastValidObjectHeight: number = 0;
  public targetObjectHeight: number = 0; // 목표 오브젝트 높이 추가
  public objectHeightLerpProgress: number = 0; // 높이 보간 진행도 추가

  // 부드러운 움직임을 위한 보간 변수들
  public targetPosition: THREE.Vector3;
  public smoothVelocity: THREE.Vector3;
  public positionBuffer: THREE.Vector3[] = [];

  constructor(startPosition: THREE.Vector3) {
    this.position = startPosition.clone();
    this.velocity = new THREE.Vector3(0, 0, 0);
    this.targetPosition = startPosition.clone();
    this.smoothVelocity = new THREE.Vector3(0, 0, 0);
  }
}

// UI 관리 클래스
class UIManager {
  private resetButtonVisible: boolean = false;

  public showResetButton(): void {
    if (this.resetButtonVisible) return;

    const resetButtonDiv = document.getElementById("reset-button");
    if (!resetButtonDiv) return;

    resetButtonDiv.innerHTML = sceneHtml.actionButtons.reset;

    const resetPositionButton = document.getElementById("reset-position-button");
    resetPositionButton?.addEventListener("click", this.handleResetClick);

    this.resetButtonVisible = true;
    console.log("리셋 버튼 표시됨");
  }

  public hideResetButton(): void {
    if (!this.resetButtonVisible) return;

    const resetButtonDiv = document.getElementById("reset-button");
    if (resetButtonDiv) {
      resetButtonDiv.innerHTML = "";
      this.resetButtonVisible = false;
      console.log("리셋 버튼 숨겨짐");
    }
  }

  private handleResetClick = (): void => {
    window.dispatchEvent(new CustomEvent("characterReset"));
  };
}

// 클라우드 관리 클래스
class CloudManager {
  private waterCloudModel: THREE.Object3D | null = null;
  private scene: THREE.Scene;

  constructor(scene: THREE.Scene) {
    this.scene = scene;
  }

  public async loadWaterCloudModel(): Promise<THREE.Object3D | null> {
    if (this.waterCloudModel) return this.waterCloudModel;

    try {
      const gltfLoader = (window as any).gltfLoader;
      if (!gltfLoader) {
        console.warn("GLTFLoader가 없습니다. 대체 구름을 생성합니다.");
        return this.createFallbackCloud();
      }

      return new Promise((resolve) => {
        gltfLoader.load(
          "/models/water_cloud.glb",
          (gltf: any) => {
            const cloudModel = gltf.scene.clone();
            cloudModel.name = "WaterCloudModel";
            this.setupCloudModel(cloudModel);
            console.log("✅ water_cloud.glb 로드 완료!");
            resolve(cloudModel);
          },
          (progress: any) => {
            console.log(`구름 모델 로딩 중... ${((progress.loaded / progress.total) * 100).toFixed(1)}%`);
          },
          (error: any) => {
            console.error("❌ water_cloud.glb 로드 실패:", error);
            resolve(this.createFallbackCloud());
          }
        );
      });
    } catch (error) {
      console.error("구름 모델 로드 중 오류:", error);
      return this.createFallbackCloud();
    }
  }

  private createFallbackCloud(): THREE.Object3D {
    console.log("🔄 대체 구름 모델 생성 중...");

    const group = new THREE.Group();
    const cloudMaterial = new THREE.MeshLambertMaterial({
      color: 0xffffff,
      transparent: true,
      opacity: 0.8,
    });

    const sphereConfigs = [
      { position: [0, 0, 0] as [number, number, number], radius: 3 },
      { position: [-3, 0, 1] as [number, number, number], radius: 2.5 },
      { position: [3, 0, -1] as [number, number, number], radius: 2.2 },
      { position: [0, 1, -2.5] as [number, number, number], radius: 1.8 },
      { position: [-1, 0.5, 2.5] as [number, number, number], radius: 2 },
    ];

    sphereConfigs.forEach((config) => {
      const sphere = new THREE.Mesh(new THREE.SphereGeometry(config.radius, 16, 12), cloudMaterial);
      sphere.position.set(...config.position);
      group.add(sphere);
    });

    group.name = "FallbackCloudModel";
    this.setupCloudModel(group);
    return group;
  }

  private setupCloudModel(cloudModel: THREE.Object3D): void {
    cloudModel.scale.set(21, 21, 21);
    cloudModel.visible = false;
    cloudModel.castShadow = false;
    cloudModel.receiveShadow = false;

    const userData = {
      noCollision: true,
      isWaterCloud: true,
      excludeFromRaycast: true,
    };

    cloudModel.userData = userData;

    cloudModel.traverse((child) => {
      if (child instanceof THREE.Mesh) {
        child.castShadow = false;
        child.receiveShadow = false;
        child.userData = userData;

        if (child.material) {
          const materials = Array.isArray(child.material) ? child.material : [child.material];
          materials.forEach((mat: any) => {
            mat.transparent = true;
            if (mat.color) mat.color.setHex(0xffffff);
            mat.needsUpdate = true;
          });
        }
      }
    });
  }

  public showCloud(): void {
    if (this.waterCloudModel) {
      this.waterCloudModel.visible = true;
    }
  }

  public hideCloud(): void {
    if (this.waterCloudModel) {
      this.waterCloudModel.visible = false;
    }
  }

  public updateCloudPosition(position: THREE.Vector3, characterDirection: THREE.Vector3): void {
    if (!this.waterCloudModel || !this.waterCloudModel.visible) return;

    const time = Date.now() * 0.001;
    const floatOffset = Math.sin(time * 0.8) * 0.5;

    this.waterCloudModel.position.set(position.x, position.y + floatOffset, position.z);
    this.updateCloudRotation(characterDirection);
  }

  private updateCloudRotation(characterDirection: THREE.Vector3): void {
    if (!this.waterCloudModel) return;

    const targetRotationY = Math.atan2(characterDirection.x, characterDirection.z);
    let currentRotationY = this.waterCloudModel.rotation.y;

    let angleDiff = targetRotationY - currentRotationY;
    while (angleDiff > Math.PI) angleDiff -= 2 * Math.PI;
    while (angleDiff < -Math.PI) angleDiff += 2 * Math.PI;

    this.waterCloudModel.rotation.y += angleDiff * PHYSICS_CONSTANTS.CLOUD_ROTATION_SPEED;
    this.waterCloudModel.rotation.y += 0.001;
  }

  public setCloudModel(model: THREE.Object3D): void {
    this.waterCloudModel = model;
    if (model) {
      this.scene.add(model);
    }
  }

  public getCloudModel(): THREE.Object3D | null {
    return this.waterCloudModel;
  }

  public destroy(): void {
    if (this.waterCloudModel) {
      this.scene.remove(this.waterCloudModel);

      this.waterCloudModel.traverse((child) => {
        if (child instanceof THREE.Mesh) {
          child.geometry?.dispose();
          if (child.material) {
            if (Array.isArray(child.material)) {
              child.material.forEach((mat) => mat.dispose());
            } else {
              child.material.dispose();
            }
          }
        }
      });

      this.waterCloudModel = null;
      console.log("🧹 구름 모델 정리 완료");
    }
  }
}

// 원형 경계 체크 함수
function checkCircularBoundary(position: THREE.Vector3, center: THREE.Vector3, radius: number): THREE.Vector3 {
  const newPosition = position.clone();

  // 중심점에서의 거리 계산
  const distanceFromCenter = Math.sqrt(Math.pow(position.x - center.x, 2) + Math.pow(position.z - center.z, 2));

  // 경계를 벗어났는지 확인
  if (distanceFromCenter > radius) {
    // 중심점에서 경계까지의 방향 벡터 계산
    const directionX = (position.x - center.x) / distanceFromCenter;
    const directionZ = (position.z - center.z) / distanceFromCenter;

    // 경계 위의 가장 가까운 점으로 이동
    newPosition.x = center.x + directionX * radius;
    newPosition.z = center.z + directionZ * radius;

    console.log(
      `⭕ 원형 경계 제한: 거리 ${distanceFromCenter.toFixed(1)} → ${radius.toFixed(1)} (${position.x.toFixed(1)}, ${position.z.toFixed(
        1
      )}) → (${newPosition.x.toFixed(1)}, ${newPosition.z.toFixed(1)})`
    );
  }

  return newPosition;
}

// 마진 조정 함수들
export function setBoundaryMargin(marginX: number, marginZ?: number): void {
  dynamicBoundaryMarginX = Math.max(0, marginX); // 음수 방지
  if (marginZ !== undefined) {
    dynamicBoundaryMarginZ = Math.max(0, marginZ);
  } else {
    dynamicBoundaryMarginZ = dynamicBoundaryMarginX; // Z축 마진이 지정되지 않으면 X축과 동일하게
  }
  console.log(`🔧 씬 경계 마진이 X: ${dynamicBoundaryMarginX}, Z: ${dynamicBoundaryMarginZ}으로 설정되었습니다.`);
}

export function getBoundaryMargin(): { x: number; z: number } {
  return { x: dynamicBoundaryMarginX, z: dynamicBoundaryMarginZ };
}

export function increaseBoundaryMargin(amountX: number = 10, amountZ?: number): void {
  dynamicBoundaryMarginX += amountX;
  if (amountZ !== undefined) {
    dynamicBoundaryMarginZ += amountZ;
  } else {
    dynamicBoundaryMarginZ += amountX; // Z축 증가량이 지정되지 않으면 X축과 동일하게
  }
  console.log(`🔧 씬 경계 마진이 X: ${dynamicBoundaryMarginX}, Z: ${dynamicBoundaryMarginZ}으로 증가했습니다.`);
}

export function decreaseBoundaryMargin(amountX: number = 10, amountZ?: number): void {
  dynamicBoundaryMarginX = Math.max(0, dynamicBoundaryMarginX - amountX);
  if (amountZ !== undefined) {
    dynamicBoundaryMarginZ = Math.max(0, dynamicBoundaryMarginZ - amountZ);
  } else {
    dynamicBoundaryMarginZ = Math.max(0, dynamicBoundaryMarginZ - amountX); // Z축 감소량이 지정되지 않으면 X축과 동일하게
  }
  console.log(`🔧 씬 경계 마진이 X: ${dynamicBoundaryMarginX}, Z: ${dynamicBoundaryMarginZ}으로 감소했습니다.`);
}

// 방향별 개별 조정 함수들
export function setBoundaryMarginX(margin: number): void {
  dynamicBoundaryMarginX = Math.max(0, margin);
  console.log(`🔧 X축(양옆) 경계 마진이 ${dynamicBoundaryMarginX}으로 설정되었습니다.`);
}

export function setBoundaryMarginZ(margin: number): void {
  dynamicBoundaryMarginZ = Math.max(0, margin);
  console.log(`🔧 Z축(앞뒤) 경계 마진이 ${dynamicBoundaryMarginZ}으로 설정되었습니다.`);
}

// 원형 경계 제어 함수들
export function setCircularBoundary(enabled: boolean): void {
  useCircularBoundary = enabled;
  console.log(`⭕ 원형 경계가 ${enabled ? "활성화" : "비활성화"}되었습니다.`);
}

export function setCircularBoundaryMargin(margin: number): void {
  circularBoundaryMargin = Math.max(0, margin);
  console.log(`⭕ 원형 경계 마진이 ${circularBoundaryMargin}으로 설정되었습니다.`);
}

export function getCircularBoundarySettings(): { enabled: boolean; margin: number } {
  return { enabled: useCircularBoundary, margin: circularBoundaryMargin };
}

// 유틸리티 클래스
class TerrainUtils {
  public static generateRandomStartPosition(): THREE.Vector3 {
    const randomIndex = Math.floor(Math.random() * START_POSITIONS.length);
    const selectedPosition = START_POSITIONS[randomIndex];

    console.log(
      `🎯 선택된 시작 위치 ${randomIndex + 1}번: (${selectedPosition.x.toFixed(2)}, ${selectedPosition.y.toFixed(2)}, ${selectedPosition.z.toFixed(
        2
      )})`
    );

    return new THREE.Vector3(selectedPosition.x, selectedPosition.y, selectedPosition.z);
  }

  public static getWaterZones(): WaterZone[] {
    const isDay = isDayTime();

    return isDay
      ? [
          {
            center: { x: 0, y: -100, z: 0 },
            size: { x: 3025, y: 200, z: 3025 },
            buoyancy: 25.0,
            waterLevel: 7,
          },
        ]
      : [
          {
            center: { x: 0, y: -85, z: 0 },
            size: { x: 600, y: 200, z: 600 },
            buoyancy: 25.0,
            waterLevel: -85,
          },
        ];
  }

  public static checkBounds(position: THREE.Vector3, scene?: THREE.Scene): THREE.Vector3 {
    const newPosition = position.clone();
    let boundaryChanged = false;

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

          const boundedPosition = checkCircularBoundary(newPosition, circularCenter, radius);
          if (boundedPosition.x !== newPosition.x || boundedPosition.z !== newPosition.z) {
            newPosition.copy(boundedPosition);
            boundaryChanged = true;
          }
        } else {
          // 기존 사각형 경계 사용
          const halfWidth = size.x / 2 - dynamicBoundaryMarginX;
          const halfDepth = size.z / 2 - dynamicBoundaryMarginZ;

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

          if (boundaryChanged) {
            console.log(
              `🌌 씬 모델 경계 제한 (${modelName}, 마진 X:${dynamicBoundaryMarginX}, Z:${dynamicBoundaryMarginZ}): (${position.x.toFixed(
                1
              )}, ${position.z.toFixed(1)}) → (${newPosition.x.toFixed(1)}, ${newPosition.z.toFixed(1)})`
            );
            console.log(`📍 모델 경계 (방향별 마진 적용): X[${minX.toFixed(1)}, ${maxX.toFixed(1)}], Z[${minZ.toFixed(1)}, ${maxZ.toFixed(1)}]`);
          }
        }
      } else {
        // 모델을 찾을 수 없는 경우 기본 경계 사용
        console.warn(`씬 모델을 찾을 수 없습니다: ${modelName}, 기본 경계 사용`);
        const bounds = isDay ? { minX: -800, maxX: 800, minZ: -800, maxZ: 800 } : { minX: -3800, maxX: 3800, minZ: -3800, maxZ: 3800 };

        newPosition.x = THREE.MathUtils.clamp(newPosition.x, bounds.minX, bounds.maxX);
        newPosition.z = THREE.MathUtils.clamp(newPosition.z, bounds.minZ, bounds.maxZ);

        if (newPosition.x !== position.x || newPosition.z !== position.z) {
          boundaryChanged = true;
          console.log(
            `🚧 기본 경계 제한: (${position.x.toFixed(1)}, ${position.z.toFixed(1)}) → (${newPosition.x.toFixed(1)}, ${newPosition.z.toFixed(1)})`
          );
        }
      }
    } else {
      // 씬이 없는 경우 기본 경계 사용
      const isDay = isDayTime();
      const bounds = isDay ? { minX: -800, maxX: 800, minZ: -800, maxZ: 800 } : { minX: -3800, maxX: 3800, minZ: -3800, maxZ: 3800 };

      newPosition.x = THREE.MathUtils.clamp(newPosition.x, bounds.minX, bounds.maxX);
      newPosition.z = THREE.MathUtils.clamp(newPosition.z, bounds.minZ, bounds.maxZ);

      if (newPosition.x !== position.x || newPosition.z !== position.z) {
        boundaryChanged = true;
        console.log(
          `🚧 기본 경계 제한: (${position.x.toFixed(1)}, ${position.z.toFixed(1)}) → (${newPosition.x.toFixed(1)}, ${newPosition.z.toFixed(1)})`
        );
      }
    }

    // 등대 경계 체크
    const lighthousePosition = new THREE.Vector3(-80, 65, -340);
    const boundaryDistance = 60;
    const distanceToLighthouse = Math.sqrt(Math.pow(newPosition.x - lighthousePosition.x, 2) + Math.pow(newPosition.z - lighthousePosition.z, 2));

    if (distanceToLighthouse <= boundaryDistance) {
      // 등대 경계 내부에 있으면 가장 가까운 경계 밖으로 이동
      const direction = new THREE.Vector2(newPosition.x - lighthousePosition.x, newPosition.z - lighthousePosition.z).normalize();

      newPosition.x = lighthousePosition.x + direction.x * boundaryDistance;
      newPosition.z = lighthousePosition.z + direction.y * boundaryDistance;
      boundaryChanged = true;

      console.log(
        `🏗️ 등대 경계 제한: (${position.x.toFixed(1)}, ${position.z.toFixed(1)}) → (${newPosition.x.toFixed(1)}, ${newPosition.z.toFixed(1)})`
      );
    }

    // low_poly_triple_trees 경계 체크
    const tripleTreesPosition = new THREE.Vector3(-330, 70, 0);
    const tripleTreesBoundaryDistance = 80; // 트리 크기에 맞는 경계
    const distanceToTripleTrees = Math.sqrt(Math.pow(newPosition.x - tripleTreesPosition.x, 2) + Math.pow(newPosition.z - tripleTreesPosition.z, 2));

    if (distanceToTripleTrees <= tripleTreesBoundaryDistance) {
      // 트리 경계 내부에 있으면 가장 가까운 경계 밖으로 이동
      const direction = new THREE.Vector2(newPosition.x - tripleTreesPosition.x, newPosition.z - tripleTreesPosition.z).normalize();

      newPosition.x = tripleTreesPosition.x + direction.x * tripleTreesBoundaryDistance;
      newPosition.z = tripleTreesPosition.z + direction.y * tripleTreesBoundaryDistance;
      boundaryChanged = true;

      console.log(
        `🌳 트리 경계 제한: (${position.x.toFixed(1)}, ${position.z.toFixed(1)}) → (${newPosition.x.toFixed(1)}, ${newPosition.z.toFixed(1)})`
      );
    }

    return newPosition;
  }

  public static isChatInputActive(): boolean {
    const activeElement = document.activeElement;
    return activeElement?.tagName === "INPUT" || activeElement?.tagName === "TEXTAREA";
  }

  public static clampDeltaTime(deltaTime: number): number {
    return Math.min(Math.max(deltaTime, 1 / 120), 1 / 45);
  }

  public static smoothLerp(current: number, target: number, factor: number): number {
    return current + (target - current) * factor;
  }

  public static smoothVector3Lerp(current: THREE.Vector3, target: THREE.Vector3, factor: number): THREE.Vector3 {
    return new THREE.Vector3(
      this.smoothLerp(current.x, target.x, factor),
      this.smoothLerp(current.y, target.y, factor),
      this.smoothLerp(current.z, target.z, factor)
    );
  }
}

export class TerrainAdaptiveCharacterController implements SmoothCharacterController {
  public get position() {
    return this.state.position;
  }
  public get velocity() {
    return this.state.velocity;
  }
  public get isOnGround() {
    return this.state.isOnGround;
  }
  public mesh!: THREE.Mesh;

  private state: CharacterState;
  private terrainRaycaster: TerrainRaycaster;
  private scene: THREE.Scene;
  private uiManager: UIManager;
  private cloudManager: CloudManager;
  private floatingObjects: FloatingObject[] = [];

  constructor(scene: THREE.Scene, terrainRaycaster: TerrainRaycaster, _startPosition: THREE.Vector3) {
    this.scene = scene;
    this.terrainRaycaster = terrainRaycaster;
    this.uiManager = new UIManager();
    this.cloudManager = new CloudManager(scene);

    const randomStartPosition = TerrainUtils.generateRandomStartPosition();
    this.state = new CharacterState(randomStartPosition);

    this.createCharacterMesh();

    this.state.lastGroundHeight = this.terrainRaycaster.getTerrainHeight(this.state.position.x, this.state.position.z);
    this.state.position.y = this.state.lastGroundHeight;

    this.setupEventListeners();
    this.initializeFloatingObjects();

    console.log(
      `부드러운 캐릭터 컨트롤러 생성: (${this.state.position.x.toFixed(1)}, ${this.state.position.y.toFixed(1)}, ${this.state.position.z.toFixed(1)})`
    );
  }

  private createCharacterMesh(): void {
    const geometry = new THREE.CapsuleGeometry(0.8, 2.0);
    const material = new THREE.MeshStandardMaterial({
      color: 0x44ff44,
      transparent: true,
      opacity: 0.0,
      visible: false,
    });

    this.mesh = new THREE.Mesh(geometry, material);
    this.mesh.position.copy(this.state.position);
    this.mesh.castShadow = false;
    this.mesh.visible = false;

    this.scene.add(this.mesh);
  }

  private setupEventListeners(): void {
    window.addEventListener("characterReset", this.handleResetPosition);
  }

  private handleResetPosition = (): void => {
    console.log("리셋 버튼 클릭됨 - 지정된 위치로 이동");
    this.setPosition(104.56, 88.87, 139.81);
    this.uiManager.hideResetButton();
    console.log("캐릭터가 리셋 위치로 이동했습니다.");
  };

  private initializeFloatingObjects(): void {
    this.floatingObjects = [];
  }

  // 개선된 오브젝트 충돌 감지
  private checkFloatingObjectCollision(position: THREE.Vector3): ObjectCollisionInfo {
    for (const obj of this.floatingObjects) {
      const horizontalDistance = Math.sqrt(Math.pow(position.x - obj.position.x, 2) + Math.pow(position.z - obj.position.z, 2));

      const heightDiff = position.y - obj.position.y;
      const isInHeightRange =
        heightDiff >= -PHYSICS_CONSTANTS.OBJECT_DETECTION_HEIGHT_BUFFER &&
        heightDiff <= obj.height + PHYSICS_CONSTANTS.OBJECT_DETECTION_HEIGHT_BUFFER;

      if (horizontalDistance <= obj.radius + PHYSICS_CONSTANTS.FLOATING_OBJECT_BUFFER && isInHeightRange) {
        // 실제 오브젝트 높이 사용
        const actualHeight = obj.actualHeight || obj.position.y + obj.height;
        const surfaceHeight = actualHeight;

        // 안정성 지수 계산 (중심에서 가까울수록 높은 안정성)
        const stability = Math.max(0, 1 - horizontalDistance / obj.radius);

        return {
          isOnFloatingObject: true,
          objectHeight: surfaceHeight,
          objectName: obj.name,
          distanceFromCenter: horizontalDistance,
          stability: stability,
          actualObjectHeight: actualHeight,
        };
      }
    }

    return {
      isOnFloatingObject: false,
      objectHeight: 0,
      objectName: "",
      distanceFromCenter: 0,
      stability: 0,
      actualObjectHeight: 0,
    };
  }

  private checkWaterStatus(position: THREE.Vector3): WaterStatus {
    const waterZones = TerrainUtils.getWaterZones();
    const margin = 2.0; // 마진을 줄여서 더 정확한 경계 감지

    for (const zone of waterZones) {
      const inX = Math.abs(position.x - zone.center.x) <= zone.size.x / 2 + margin;
      const inZ = Math.abs(position.z - zone.center.z) <= zone.size.z / 2 + margin;

      const terrainHeight = this.terrainRaycaster.getTerrainHeight(position.x, position.z);
      // 물 위에 있는지 더 정확하게 판단 (물 높이보다 약간 위에 있어야 함)
      const isOnWaterTerrain = terrainHeight <= zone.waterLevel + 8;

      // 디버깅을 위한 로그 추가
      if (Math.abs(position.x) < 100 && Math.abs(position.z) < 100) {
        // 중앙 지역 근처에서만 로그 출력
        console.log(
          `🔍 물 상태 체크: 위치=(${position.x.toFixed(1)}, ${position.z.toFixed(1)}), inX=${inX}, inZ=${inZ}, 지형높이=${terrainHeight.toFixed(
            1
          )}, 물높이=${zone.waterLevel}, isOnWaterTerrain=${isOnWaterTerrain}`
        );
      }

      if (inX && inZ && isOnWaterTerrain) {
        return {
          inWater: true,
          waterLevel: zone.waterLevel,
          buoyancy: zone.buoyancy,
        };
      }
    }

    return { inWater: false, waterLevel: 0, buoyancy: 0 };
  }

  public update(keys: any, deltaTime: number): void {
    deltaTime = TerrainUtils.clampDeltaTime(deltaTime);

    // 개선된 오브젝트 상태 업데이트
    this.updateObjectCollisionStateImproved();

    this.updateWaterState(deltaTime);
    this.handleHorizontalMovementImproved(keys, deltaTime);
    this.adaptToTerrainImproved(deltaTime);
    this.updateFinalPositionImproved(deltaTime);
    this.updateCloudPosition();

    // 부드러운 메시 위치 업데이트
    this.mesh.position.copy(this.state.position);
  }

  // 개선된 오브젝트 충돌 상태 업데이트
  private updateObjectCollisionStateImproved(): void {
    this.state.lastObjectCollision = { ...this.state.currentObjectCollision };
    this.state.currentObjectCollision = this.checkFloatingObjectCollision(this.state.position);

    // 오브젝트 위에서의 안정성 프레임 카운터 관리
    if (this.state.currentObjectCollision.isOnFloatingObject) {
      if (this.state.currentObjectCollision.stability > 0.4) {
        this.state.objectStabilityFrames = Math.min(this.state.objectStabilityFrames + 1, PHYSICS_CONSTANTS.FRAME_STABILITY_BUFFER);
      }

      // 타겟 높이 설정
      if (this.state.currentObjectCollision.actualObjectHeight) {
        this.state.targetObjectHeight = this.state.currentObjectCollision.actualObjectHeight;
      }

      this.state.lastValidObjectHeight = this.state.currentObjectCollision.objectHeight;
    } else {
      this.state.objectStabilityFrames = Math.max(this.state.objectStabilityFrames - 1, 0);
    }

    // 오브젝트 간 전환 시 부드러운 처리
    if (this.state.lastObjectCollision.isOnFloatingObject !== this.state.currentObjectCollision.isOnFloatingObject) {
      this.state.objectTransitionBuffer = PHYSICS_CONSTANTS.OBJECT_TRANSITION_SMOOTHING;
      this.state.objectHeightLerpProgress = 0;
    }

    if (this.state.objectTransitionBuffer > 0) {
      this.state.objectTransitionBuffer = Math.max(this.state.objectTransitionBuffer - 0.016, 0);
    }
  }

  private updateWaterState(deltaTime: number): void {
    const currentWaterStatus = this.checkWaterStatus(this.state.position);
    const shouldBeInWater = currentWaterStatus.inWater;

    // 디버깅을 위한 로그 추가
    if (this.state.isInWater !== shouldBeInWater) {
      console.log(`🔍 물 상태 변경 감지: 현재=${this.state.isInWater}, 예상=${shouldBeInWater}`);
      console.log(`📍 위치: (${this.state.position.x.toFixed(1)}, ${this.state.position.y.toFixed(1)}, ${this.state.position.z.toFixed(1)})`);
    }

    if (this.state.isInWater !== shouldBeInWater) {
      if (this.state.pendingWaterState !== shouldBeInWater) {
        this.state.pendingWaterState = shouldBeInWater;
        this.state.waterStateTimer = 0;
        console.log(`🔄 물 상태 변경 대기 시작: ${this.state.isInWater} → ${shouldBeInWater}`);
      }

      this.state.waterStateTimer += deltaTime;
      console.log(`⏱️ 물 상태 타이머: ${this.state.waterStateTimer.toFixed(3)}/${PHYSICS_CONSTANTS.WATER_STATE_DELAY}`);

      if (this.state.waterStateTimer >= PHYSICS_CONSTANTS.WATER_STATE_DELAY && !this.state.waterTransitionInProgress) {
        this.state.waterTransitionInProgress = true;
        console.log("🚀 물 상태 전환 시작!");

        if (shouldBeInWater) {
          console.log("🌊 물에 진입! 구름 생성 중... (안정화됨)");
          this.enterWater(currentWaterStatus);
        } else {
          console.log("🏃 물에서 탈출! 구름 제거 중... (안정화됨)");
          this.exitWater();
        }

        this.state.isInWater = shouldBeInWater;
        this.state.waterLevel = currentWaterStatus.waterLevel;
        this.state.waterBuoyancy = currentWaterStatus.buoyancy;

        // 전환 완료 후 플래그 리셋
        this.state.waterTransitionInProgress = false;
        console.log("✅ 물 상태 전환 완료");
      }
    } else {
      this.state.pendingWaterState = null;
      this.state.waterStateTimer = 0;
      this.state.waterLevel = currentWaterStatus.waterLevel;
      this.state.waterBuoyancy = currentWaterStatus.buoyancy;
    }
  }

  private async enterWater(waterStatus: WaterStatus): Promise<void> {
    this.state.preWaterHeight = this.state.position.y;

    const waterSurfaceHeight = waterStatus.waterLevel;
    const targetHeight = waterSurfaceHeight + PHYSICS_CONSTANTS.CLOUD_OFFSET;

    console.log(`캐릭터 높이 조정: ${this.state.preWaterHeight.toFixed(1)} → ${targetHeight.toFixed(1)}`);

    this.state.position.y = targetHeight;
    this.state.velocity.y = 0;

    if (!this.cloudManager.getCloudModel()) {
      const cloudModel = await this.cloudManager.loadWaterCloudModel();
      if (cloudModel) {
        this.cloudManager.setCloudModel(cloudModel);
      }
    }

    this.cloudManager.showCloud();
    this.uiManager.showResetButton();
  }

  private exitWater(): void {
    console.log("🚪 exitWater() 메서드 실행 시작");

    this.cloudManager.hideCloud();
    console.log("☁️ 구름 숨김 완료");

    const terrainHeight = this.terrainRaycaster.getTerrainHeight(this.state.position.x, this.state.position.z);
    console.log(`📍 현재 위치: (${this.state.position.x.toFixed(1)}, ${this.state.position.y.toFixed(1)}, ${this.state.position.z.toFixed(1)})`);
    console.log(`🏔️ 지형 높이: ${terrainHeight.toFixed(1)}`);

    this.state.position.y = terrainHeight;
    this.state.velocity.y = 0;

    console.log(`✅ 캐릭터 높이 복원 완료: ${terrainHeight.toFixed(1)} (지형 기준)`);
    this.uiManager.hideResetButton();
    console.log("🔄 리셋 버튼 숨김 완료");
  }

  private updateCharacterDirection(moveVector: THREE.Vector3): void {
    if (moveVector.length() > PHYSICS_CONSTANTS.MIN_VELOCITY_THRESHOLD) {
      this.state.lastMoveDirection.copy(moveVector);
      this.state.characterDirection.lerp(moveVector, 0.1);
      this.state.characterDirection.normalize();
    }
  }

  private updateCloudPosition(): void {
    this.cloudManager.updateCloudPosition(this.state.position, this.state.characterDirection);
  }

  // 개선된 수평 이동 처리 - 버벅임 해결
  private handleHorizontalMovementImproved(keys: any, deltaTime: number): void {
    if (this.state.isControlLocked || TerrainUtils.isChatInputActive()) {
      // 부드러운 감속
      this.state.velocity.x *= Math.pow(PHYSICS_CONSTANTS.VELOCITY_DAMPING, deltaTime * 60);
      this.state.velocity.z *= Math.pow(PHYSICS_CONSTANTS.VELOCITY_DAMPING, deltaTime * 60);
      return;
    }

    const moveVector = this.calculateMoveVector(keys);

    if (moveVector.length() > 0) {
      moveVector.normalize();
      this.updateCharacterDirection(moveVector);

      // 오브젝트 위에서의 이동 최적화 - 충돌 검사 간소화
      const canMove = this.canMoveToPositionOptimized(moveVector, deltaTime);

      if (!canMove && !this.state.isInWater && !this.isStablyOnFloatingObject()) {
        // 오브젝트 위나 물속이 아닌 경우만 이동 제한
        const dampingFactor = Math.pow(0.95, deltaTime * 60);
        this.state.velocity.x *= dampingFactor;
        this.state.velocity.z *= dampingFactor;
        return;
      }

      // 이동 속도 계산
      let finalMoveSpeed = PHYSICS_CONSTANTS.MOVE_SPEED;

      if (this.state.isInWater) {
        finalMoveSpeed *= 1.5;
      }

      // 더 부드러운 가속 - 오브젝트 위에서 버벅임 방지
      const targetVelocityX = moveVector.x * finalMoveSpeed;
      const targetVelocityZ = moveVector.z * finalMoveSpeed;

      // 오브젝트 위에서는 더 빠른 반응성 적용
      const baseLerpFactor = this.isStablyOnFloatingObject() ? 20 : 15;
      const lerpFactor = Math.min(deltaTime * baseLerpFactor, 1.0);

      this.state.velocity.x = THREE.MathUtils.lerp(this.state.velocity.x, targetVelocityX, lerpFactor);
      this.state.velocity.z = THREE.MathUtils.lerp(this.state.velocity.z, targetVelocityZ, lerpFactor);
    } else {
      // 부드러운 감속
      const dampingFactor = Math.pow(PHYSICS_CONSTANTS.VELOCITY_DAMPING, deltaTime * 60);
      this.state.velocity.x *= dampingFactor;
      this.state.velocity.z *= dampingFactor;
    }
  }

  // 안정적으로 오브젝트 위에 있는지 확인
  private isStablyOnFloatingObject(): boolean {
    return this.state.currentObjectCollision.isOnFloatingObject && this.state.objectStabilityFrames >= PHYSICS_CONSTANTS.FRAME_STABILITY_BUFFER - 1;
  }

  private calculateMoveVector(keys: any): THREE.Vector3 {
    const moveVector = new THREE.Vector3(0, 0, 0);

    if (keys["KeyW"] || keys["ArrowUp"]) moveVector.z = -1;
    if (keys["KeyS"] || keys["ArrowDown"]) moveVector.z = 1;
    if (keys["KeyA"] || keys["ArrowLeft"]) moveVector.x = -1;
    if (keys["KeyD"] || keys["ArrowRight"]) moveVector.x = 1;

    return moveVector;
  }

  // 최적화된 이동 가능 여부 체크 - 오브젝트 위에서 성능 개선
  private canMoveToPositionOptimized(moveVector: THREE.Vector3, deltaTime: number): boolean {
    // 오브젝트 위에 있거나 물속에 있으면 대부분의 체크를 건너뜀
    if (this.state.isInWater || this.isStablyOnFloatingObject()) {
      return true;
    }

    const futureX = this.state.position.x + moveVector.x * PHYSICS_CONSTANTS.MOVE_SPEED * deltaTime;
    const futureZ = this.state.position.z + moveVector.z * PHYSICS_CONSTANTS.MOVE_SPEED * deltaTime;

    const currentHeight = this.terrainRaycaster.getTerrainHeight(this.state.position.x, this.state.position.z);
    const futureHeight = this.terrainRaycaster.getTerrainHeight(futureX, futureZ);
    const heightDiff = futureHeight - currentHeight;

    if (heightDiff > 0.1 && heightDiff <= PHYSICS_CONSTANTS.MAX_STEP_HEIGHT) {
      if (this.isValidStair(futureX, futureZ, heightDiff) || this.state.isOnGround) {
        this.state.position.y += heightDiff;
        console.log(`계단 감지: 높이 ${heightDiff.toFixed(2)} 상승`);
      }
    }

    return true;
  }

  // 개선된 지형 적응
  private adaptToTerrainImproved(deltaTime: number): void {
    if (this.state.isInWater) {
      this.adaptToWaterTerrain();
    } else if (this.isStablyOnFloatingObject()) {
      this.adaptToFloatingObjectTerrainImproved(deltaTime);
    } else {
      this.adaptToLandTerrainImproved(deltaTime);
    }
  }

  // 개선된 오브젝트 위 지형 적응 - 실제 높이 사용 및 버벅임 해결
  private adaptToFloatingObjectTerrainImproved(deltaTime: number): void {
    const actualObjectHeight = this.state.currentObjectCollision.actualObjectHeight || this.state.currentObjectCollision.objectHeight;
    const distanceToTarget = this.state.position.y - actualObjectHeight;

    // 오브젝트 위에서는 매우 관대한 지면 감지
    const isNearObjectSurface = Math.abs(distanceToTarget) <= PHYSICS_CONSTANTS.GROUND_CHECK_DISTANCE * 1.5;
    const hasSlowVerticalSpeed = Math.abs(this.state.velocity.y) < PHYSICS_CONSTANTS.LANDING_SPEED_THRESHOLD * 1.2;

    // 안정성을 고려한 지면 상태 결정
    if (this.state.objectStabilityFrames >= PHYSICS_CONSTANTS.FRAME_STABILITY_BUFFER - 1) {
      this.state.isOnGround = true;
    } else {
      this.state.isOnGround = isNearObjectSurface && (hasSlowVerticalSpeed || this.state.velocity.y <= 10);
    }

    if (this.state.isOnGround) {
      this.state.groundContactTime += deltaTime;
      this.state.airTime = 0;

      // 실제 오브젝트 높이로 부드러운 보간 - 떠다니는 현상 완전 방지
      if (Math.abs(distanceToTarget) < PHYSICS_CONSTANTS.OBJECT_STABILITY_THRESHOLD) {
        this.state.position.y = actualObjectHeight;
        this.state.velocity.y = 0;
      } else if (Math.abs(distanceToTarget) < PHYSICS_CONSTANTS.GROUND_SNAP_DISTANCE * 1.5) {
        // 더 빠른 높이 보간으로 버벅임 방지
        const lerpFactor = Math.min(deltaTime * PHYSICS_CONSTANTS.OBJECT_HEIGHT_LERP_FACTOR, 1.0);
        this.state.position.y = THREE.MathUtils.lerp(this.state.position.y, actualObjectHeight, lerpFactor);

        if (this.state.velocity.y <= 0) {
          this.state.velocity.y *= 0.3; // 더 빠른 수직 속도 감쇠
          if (Math.abs(this.state.velocity.y) < 0.5) {
            this.state.velocity.y = 0;
          }
        }
      }
    } else {
      this.state.airTime += deltaTime;
      this.state.groundContactTime = 0;
    }

    // 오브젝트에서 떨어지는 경우 처리
    if (!this.state.currentObjectCollision.isOnFloatingObject && this.state.lastObjectCollision.isOnFloatingObject) {
      console.log(`🪂 ${this.state.lastObjectCollision.objectName}에서 떨어짐`);
      this.state.isOnGround = false;
      this.state.airTime = 0;
      this.state.objectStabilityFrames = 0;
    }
  }

  private adaptToWaterTerrain(): void {
    const waterSurfaceHeight = this.state.waterLevel;
    const targetHeight = waterSurfaceHeight + PHYSICS_CONSTANTS.CLOUD_OFFSET;

    this.state.position.y = targetHeight;
    this.state.isOnGround = true;
    this.state.groundContactTime += 0.016;
    this.state.airTime = 0;
    this.state.velocity.y = 0;
  }

  // 개선된 일반 지형 적응
  private adaptToLandTerrainImproved(deltaTime: number): void {
    const currentGroundHeight = this.terrainRaycaster.getTerrainHeight(this.state.position.x, this.state.position.z);
    const distanceToTarget = this.state.position.y - currentGroundHeight;
    const wasOnGround = this.state.isOnGround;

    const isNearGround = distanceToTarget <= PHYSICS_CONSTANTS.GROUND_CHECK_DISTANCE;
    const hasSlowVerticalSpeed = Math.abs(this.state.velocity.y) < PHYSICS_CONSTANTS.LANDING_SPEED_THRESHOLD;
    const isFalling = this.state.velocity.y <= 15;

    if (this.state.landingBuffer > 0) {
      this.state.isOnGround = true;
      this.state.landingBuffer *= PHYSICS_CONSTANTS.LANDING_BUFFER_DECAY;
      if (this.state.landingBuffer < 0.1) {
        this.state.landingBuffer = 0;
      }
    } else {
      this.state.isOnGround = isNearGround && (hasSlowVerticalSpeed || isFalling);
    }

    if (this.state.isOnGround) {
      this.handleGroundContactImproved(deltaTime, distanceToTarget, currentGroundHeight);
    } else {
      this.state.airTime += deltaTime;
      this.state.groundContactTime = 0;
    }

    if (!wasOnGround && this.state.isOnGround) {
      this.handleLanding();
    }
  }

  // 개선된 지면 접촉 처리
  private handleGroundContactImproved(deltaTime: number, distanceToTarget: number, currentGroundHeight: number): void {
    this.state.groundContactTime += deltaTime;
    this.state.airTime = 0;

    const snapDistance = PHYSICS_CONSTANTS.GROUND_SNAP_DISTANCE;

    if (distanceToTarget < snapDistance || (this.state.velocity.y <= 0 && distanceToTarget < snapDistance * 2.5)) {
      const lerpFactor = Math.min(deltaTime * PHYSICS_CONSTANTS.HEIGHT_LERP_FACTOR_GROUND, 1.0);
      this.state.position.y = THREE.MathUtils.lerp(this.state.position.y, currentGroundHeight, lerpFactor);
      this.state.lastGroundHeight = currentGroundHeight;

      if (this.state.velocity.y <= 0) {
        this.state.velocity.y *= PHYSICS_CONSTANTS.DAMPING_FACTOR_LANDING;
        if (Math.abs(this.state.velocity.y) < 1.0) {
          this.state.velocity.y = 0;
        }
      }
    }
  }

  private handleLanding(): void {
    this.state.velocity.y *= 0.3;
    this.state.landingBuffer = 1.0;

    if (this.state.currentObjectCollision.isOnFloatingObject) {
      console.log(`✅ ${this.state.currentObjectCollision.objectName} 위에 착지!`);
    } else {
      console.log(`착지! 높이: ${this.state.position.y.toFixed(1)}, 감쇄 후 속도: ${this.state.velocity.y.toFixed(1)}`);
    }
  }

  // 개선된 최종 위치 업데이트
  private updateFinalPositionImproved(deltaTime: number): void {
    if (this.state.isInWater) {
      this.updateWaterPosition(deltaTime);
    } else if (this.isStablyOnFloatingObject()) {
      this.updateObjectPositionImproved(deltaTime);
    } else {
      this.updateLandPositionImproved(deltaTime);
    }

    this.state.position = TerrainUtils.checkBounds(this.state.position, this.scene);
  }

  // 개선된 오브젝트 위 위치 업데이트
  private updateObjectPositionImproved(deltaTime: number): void {
    const actualObjectHeight = this.state.currentObjectCollision.actualObjectHeight || this.state.currentObjectCollision.objectHeight;

    // 수평 이동 - 부드러운 이동
    this.state.position.x += this.state.velocity.x * deltaTime;
    this.state.position.z += this.state.velocity.z * deltaTime;

    // 수직 이동 - 오브젝트 위에서는 실제 높이로 완전히 고정
    if (this.state.isOnGround && this.state.objectStabilityFrames >= PHYSICS_CONSTANTS.FRAME_STABILITY_BUFFER - 1) {
      // 실제 오브젝트 높이로 완전히 고정 (떠다니는 현상 완전 방지)
      this.state.position.y = actualObjectHeight;
      this.state.velocity.y = 0;
    } else if (!this.state.isOnGround) {
      // 공중에 있을 때만 수직 이동 적용
      this.state.position.y += this.state.velocity.y * deltaTime;
    }

    // 오브젝트 경계를 벗어났는지 체크
    const updatedCollision = this.checkFloatingObjectCollision(this.state.position);
    if (!updatedCollision.isOnFloatingObject && this.state.isOnGround) {
      console.log(`🔄 ${this.state.currentObjectCollision.objectName}에서 일반 지형으로 전환`);
      this.state.isOnGround = false;
      this.state.objectStabilityFrames = 0;
    }
  }

  private updateWaterPosition(deltaTime: number): void {
    const waterSurfaceHeight = this.state.waterLevel;
    const targetHeight = waterSurfaceHeight + PHYSICS_CONSTANTS.CLOUD_OFFSET;

    // 수평 이동
    this.state.position.x += this.state.velocity.x * deltaTime;
    this.state.position.z += this.state.velocity.z * deltaTime;

    // 높이 보간
    const heightDiff = targetHeight - this.state.position.y;
    if (Math.abs(heightDiff) > 0.1) {
      this.state.position.y += heightDiff * 0.1;
    }

    this.state.velocity.y *= PHYSICS_CONSTANTS.DAMPING_FACTOR_WATER;
  }

  // 개선된 일반 지형 위치 업데이트
  private updateLandPositionImproved(deltaTime: number): void {
    // 부드러운 중력 적용
    if (!this.state.isOnGround) {
      this.state.velocity.y -= PHYSICS_CONSTANTS.GRAVITY * deltaTime;
    }

    const newPosition = this.state.position.clone();
    newPosition.add(this.state.velocity.clone().multiplyScalar(deltaTime));

    // 수평 이동은 항상 부드럽게
    this.state.position.x = newPosition.x;
    this.state.position.z = newPosition.z;

    // 수직 이동
    this.state.position.y = newPosition.y;

    const terrainHeight = this.terrainRaycaster.getTerrainHeight(this.state.position.x, this.state.position.z);
    const minHeight = Math.max(terrainHeight, -1000);
    const heightDifference = this.state.position.y - minHeight;

    if (heightDifference < -1.0 && this.state.velocity.y <= 0) {
      const lerpFactor = Math.min(deltaTime * PHYSICS_CONSTANTS.HEIGHT_LERP_FACTOR_TERRAIN, 1.0);
      this.state.position.y = THREE.MathUtils.lerp(this.state.position.y, minHeight, lerpFactor);

      const dampingRate = this.state.landingBuffer > 0 ? 0.5 : 0.7;
      this.state.velocity.y *= dampingRate;
      if (Math.abs(this.state.velocity.y) < 2.0) {
        this.state.velocity.y = 0;
        this.state.isOnGround = true;
        this.state.landingBuffer = 1.0;
      }
    }
  }

  private isValidStair(x: number, z: number, heightDiff: number): boolean {
    if (heightDiff <= 2.0) return true;

    const checkPoints = [
      { x: x, z: z },
      { x: x + PHYSICS_CONSTANTS.STAIR_DETECTION_RADIUS, z: z },
      { x: x - PHYSICS_CONSTANTS.STAIR_DETECTION_RADIUS, z: z },
      { x: x, z: z + PHYSICS_CONSTANTS.STAIR_DETECTION_RADIUS },
      { x: x, z: z - PHYSICS_CONSTANTS.STAIR_DETECTION_RADIUS },
      { x: x + PHYSICS_CONSTANTS.STAIR_DETECTION_RADIUS * 0.7, z: z + PHYSICS_CONSTANTS.STAIR_DETECTION_RADIUS * 0.7 },
      { x: x - PHYSICS_CONSTANTS.STAIR_DETECTION_RADIUS * 0.7, z: z - PHYSICS_CONSTANTS.STAIR_DETECTION_RADIUS * 0.7 },
      { x: x + PHYSICS_CONSTANTS.STAIR_DETECTION_RADIUS * 0.7, z: z - PHYSICS_CONSTANTS.STAIR_DETECTION_RADIUS * 0.7 },
      { x: x - PHYSICS_CONSTANTS.STAIR_DETECTION_RADIUS * 0.7, z: z + PHYSICS_CONSTANTS.STAIR_DETECTION_RADIUS * 0.7 },
    ];

    let validStairCount = 0;
    const currentHeight = this.terrainRaycaster.getTerrainHeight(this.state.position.x, this.state.position.z);

    for (const point of checkPoints) {
      const pointHeight = this.terrainRaycaster.getTerrainHeight(point.x, point.z);
      const pointHeightDiff = pointHeight - currentHeight;

      if (Math.abs(pointHeightDiff - heightDiff) < 2.0) {
        validStairCount++;
      }
    }

    const stairThreshold = checkPoints.length * 0.3;
    return validStairCount >= stairThreshold;
  }

  public setPosition(x: number, y: number, z: number): void {
    this.state.position.set(x, y, z);
    this.state.velocity.set(0, 0, 0);
    this.state.lastGroundHeight = this.terrainRaycaster.getTerrainHeight(x, z);
    this.mesh.position.copy(this.state.position);

    // 구름 숨김 처리
    this.cloudManager.hideCloud();

    // 상태 초기화
    this.state.waterStateTimer = 0;
    this.state.pendingWaterState = null;
    this.state.waterTransitionInProgress = false;
    this.state.isInWater = false;

    // 오브젝트 상태 초기화
    this.state.currentObjectCollision = {
      isOnFloatingObject: false,
      objectHeight: 0,
      objectName: "",
      distanceFromCenter: 0,
      stability: 0,
      actualObjectHeight: 0,
    };
    this.state.lastObjectCollision = {
      isOnFloatingObject: false,
      objectHeight: 0,
      objectName: "",
      distanceFromCenter: 0,
      stability: 0,
      actualObjectHeight: 0,
    };
    this.state.objectStabilityFrames = 0;
  }

  public getPosition(): THREE.Vector3 {
    return this.state.position.clone();
  }

  public destroy(): void {
    // 이벤트 리스너 정리
    window.removeEventListener("characterReset", this.handleResetPosition);

    // UI 정리
    this.uiManager.hideResetButton();

    // 구름 모델 정리
    this.cloudManager.destroy();

    // 캐릭터 메시 정리
    if (this.mesh) {
      this.scene.remove(this.mesh);
      this.mesh.geometry.dispose();
      if (Array.isArray(this.mesh.material)) {
        this.mesh.material.forEach((mat) => mat.dispose());
      } else {
        this.mesh.material.dispose();
      }
    }

    console.log("🧹 캐릭터 컨트롤러 정리 완료");
  }
}
