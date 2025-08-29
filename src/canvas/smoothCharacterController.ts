import * as THREE from "three";
import { TerrainRaycaster } from "./terrainRaycaster";
import { isDayTime } from "./time";
import { sceneHtml } from "../data/sceneHtml";

/**
 * Three.js Raycaster 기반 부드러운 캐릭터 컨트롤러
 * 물 속에서 구름 효과가 있는 버전
 */

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

export class TerrainAdaptiveCharacterController implements SmoothCharacterController {
  public position: THREE.Vector3;
  public velocity: THREE.Vector3;
  public isOnGround: boolean = true;
  public mesh: THREE.Mesh;

  private terrainRaycaster: TerrainRaycaster;
  private scene: THREE.Scene;

  // 이동 설정
  private moveSpeed: number = 50;
  private jumpPower: number = 50;
  private gravity: number = 45;

  // 지형 적응 설정
  private groundCheckDistance: number = 4.0;
  private maxStepHeight: number = 2.0;
  private stairDetectionRadius: number = 2.5;

  // 스무딩 설정
  private velocityDamping: number = 0.9;
  private groundSnapDistance: number = 1.5;
  private landingSpeedThreshold: number = 3.0;

  // 상태 추적
  private lastGroundHeight: number = 150;
  private groundContactTime: number = 0;
  private airTime: number = 0;

  // 물 관련 상태
  private isInWater: boolean = false;
  private waterLevel: number = 0;
  private waterBuoyancy: number = 0;
  private preWaterHeight: number = 0; // 물 진입 전 캐릭터 높이 저장
  private resetButtonVisible: boolean = false; // 리셋 버튼 표시 상태

  // 공중 오브젝트 상호작용 상태
  private floatingObjects: Array<{
    name: string;
    position: THREE.Vector3;
    radius: number;
    height: number;
  }> = [];
  private isNearFloatingObject: boolean = false;
  private currentFloatingObject: any = null;
  private actionButtonVisible: boolean = false;
  private isControlLocked: boolean = false; // 캐릭터 조작 잠금 상태

  // 구름 관련 상태
  private waterCloudModel: THREE.Object3D | null = null;
  private cloudOffset: number = 5.0; // 물 표면 위 구름 높이 (줄임)
  private characterHeightOffset: number = 0.0; // 캐릭터가 구름 중앙에 위치하도록 변경

  // 캐릭터 방향 추적
  private characterDirection: THREE.Vector3 = new THREE.Vector3(0, 0, -1); // 기본 방향 (앞쪽)
  private lastMoveDirection: THREE.Vector3 = new THREE.Vector3(0, 0, -1); // 마지막 이동 방향
  private cloudRotationSpeed: number = 0.05; // 구름 회전 속도 (부드러운 전환)

  // 물 상태 안정화 변수들
  private waterStateTimer: number = 0; // 물 상태 변경 타이머
  private waterStateChangeDelay: number = 0.3; // 300ms 지연 (디바운싱)
  private pendingWaterState: boolean | null = null; // 대기 중인 물 상태
  private waterTransitionInProgress: boolean = false; // 전환 진행 중 플래그

  // 물 영역 정의
  private getWaterZones(): Array<{
    center: { x: number; y: number; z: number };
    size: { x: number; y: number; z: number };
    buoyancy: number;
    waterLevel: number;
  }> {
    const isDay = isDayTime();

    if (isDay) {
      return [
        {
          center: { x: 0, y: -100, z: 0 },
          size: { x: 3025, y: 200, z: 3025 },
          buoyancy: 25.0,
          waterLevel: 7, // 실제 물 모델 위치에 맞춤
        },
      ];
    } else {
      return [
        {
          center: { x: 0, y: -85, z: 0 },
          size: { x: 2640, y: 200, z: 2640 },
          buoyancy: 25.0,
          waterLevel: -85, // 실제 물 모델 위치에 맞춤
        },
      ];
    }
  }

  /**
   * 랜덤 시작 위치 생성 (6개의 고정된 좌표 중에서 선택)
   */
  private generateRandomStartPosition(): THREE.Vector3 {
    // 6개의 고정된 시작 좌표
    const startPositions = [
      { x: 104.56, y: 88.87, z: 139.81 },
      { x: 169.63, y: 66.87, z: 189.27 },
      { x: 73.5, y: 110.65, z: 63.0 },
      { x: 134.81, y: 88.87, z: 68.44 },
      { x: 185.08, y: 44.65, z: 230.37 },
      { x: 38.86, y: 44.77, z: 216.85 },
    ];

    // 랜덤으로 하나의 좌표 선택
    const randomIndex = Math.floor(Math.random() * startPositions.length);
    const selectedPosition = startPositions[randomIndex];

    console.log(
      `🎯 선택된 시작 위치 ${randomIndex + 1}번: (${selectedPosition.x.toFixed(2)}, ${selectedPosition.y.toFixed(2)}, ${selectedPosition.z.toFixed(
        2
      )})`
    );

    return new THREE.Vector3(selectedPosition.x, selectedPosition.y, selectedPosition.z);
  }

  /**
   * 공중 오브젝트와의 상호작용 체크
   */
  private checkFloatingObjectInteraction(position: THREE.Vector3): { isNear: boolean; object: any } {
    for (const obj of this.floatingObjects) {
      const distance = position.distanceTo(obj.position);

      // 기본 상호작용 반경
      const baseRadius = obj.radius + 15;

      // 캐릭터와 오브젝트 사이의 방향 벡터 계산
      const directionToObject = new THREE.Vector3();
      directionToObject.subVectors(obj.position, position).normalize();

      // 캐릭터의 현재 이동 방향 (또는 기본 방향)
      const characterDirection = this.lastMoveDirection.length() > 0.1 ? this.lastMoveDirection : new THREE.Vector3(0, 0, -1);

      // 캐릭터 방향과 오브젝트 방향 사이의 각도 계산
      const dotProduct = characterDirection.dot(directionToObject);
      const angle = Math.acos(Math.abs(dotProduct));

      // 각도에 따른 반경 조정 (뒤쪽과 양옆에 더 큰 감지 영역)
      let adjustedRadius = baseRadius;
      if (angle > Math.PI / 2) {
        // 뒤쪽 (180도) - 1.5배
        adjustedRadius = baseRadius * 1.5;
      } else if (angle > Math.PI / 4) {
        // 양옆 (90도) - 1.3배
        adjustedRadius = baseRadius * 1.3;
      }
      // 앞쪽은 기본 반경 유지

      if (distance <= adjustedRadius) {
        return { isNear: true, object: obj };
      }
    }
    return { isNear: false, object: null };
  }

  /**
   * 공중 오브젝트와의 충돌 체크 (이동 차단용) - 상호작용 감지와 동일한 방법 사용
   */
  private checkFloatingObjectCollision(position: THREE.Vector3): { collision: boolean; object: any; direction: THREE.Vector3 } {
    // 상호작용 감지와 동일한 방법 사용하되, 더 작은 반경으로 충돌 감지
    for (const obj of this.floatingObjects) {
      const distance = position.distanceTo(obj.position);

      // low_poly_triple_trees의 경우 더 큰 충돌 반경 적용
      let collisionRadius;
      if (obj.name === "low_poly_triple_trees") {
        collisionRadius = obj.radius * 0.8; // triple_trees는 더 큰 충돌 반경
      } else {
        collisionRadius = obj.radius * 0.7; // 다른 오브젝트들은 기존 반경
      }

      if (distance <= collisionRadius) {
        // 충돌 방향 계산
        const direction = new THREE.Vector3();
        direction.subVectors(position, obj.position).normalize();
        return { collision: true, object: obj, direction };
      }
    }
    return { collision: false, object: null, direction: new THREE.Vector3() };
  }

  // 캐릭터가 물 안에 있는지 확인 - 지형 기반 판단으로 개선
  private checkWaterStatus(position: THREE.Vector3): { inWater: boolean; waterLevel: number; buoyancy: number } {
    const waterZones = this.getWaterZones();

    for (const zone of waterZones) {
      // 여유분을 두어 경계에서의 깜빡임 방지
      const margin = 5.0;

      const inX = Math.abs(position.x - zone.center.x) <= zone.size.x / 2 + margin;
      const inZ = Math.abs(position.z - zone.center.z) <= zone.size.z / 2 + margin;

      // 지형 높이를 기준으로 물 영역 판단
      const terrainHeight = this.terrainRaycaster.getTerrainHeight(position.x, position.z);
      const isOnWaterTerrain = terrainHeight <= zone.waterLevel + 15; // 물 표면 근처 지형 (여유 증가)

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

  constructor(scene: THREE.Scene, terrainRaycaster: TerrainRaycaster, startPosition: THREE.Vector3) {
    this.scene = scene;
    this.terrainRaycaster = terrainRaycaster;

    // 랜덤 시작 위치 생성 (물이 아닌 지형 위에만)
    const randomStartPosition = this.generateRandomStartPosition();
    this.position = randomStartPosition;
    this.velocity = new THREE.Vector3(0, 0, 0);

    // 시각적 메시 생성 (디버깅용, 투명하게)
    const geometry = new THREE.CapsuleGeometry(0.8, 2.0);
    const material = new THREE.MeshStandardMaterial({
      color: 0x44ff44,
      transparent: true,
      opacity: 0.0,
      visible: false,
    });

    this.mesh = new THREE.Mesh(geometry, material);
    this.mesh.position.copy(this.position);
    this.mesh.castShadow = false;
    this.mesh.visible = false;

    scene.add(this.mesh);

    // 초기 지형 높이 설정
    this.lastGroundHeight = this.terrainRaycaster.getTerrainHeight(this.position.x, this.position.z);
    this.position.y = this.lastGroundHeight;

    // 공중 오브젝트들 초기화 (지연 초기화)
    this.initializeFloatingObjectsDelayed();

    console.log(`부드러운 캐릭터 컨트롤러 생성: (${this.position.x.toFixed(1)}, ${this.position.y.toFixed(1)}, ${this.position.z.toFixed(1)})`);
  }

  /**
   * water_cloud.glb 모델을 로드하는 메서드
   */
  private async loadWaterCloudModel(): Promise<THREE.Object3D | null> {
    try {
      // GLTFLoader를 통해 모델 로드 (전역 변수에서 가져오기)
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

            // 구름 초기 설정
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

  /**
   * 오브젝트의 실제 바운딩 박스를 기반으로 반경 계산
   */
  private calculateObjectRadius(modelKey: string, defaultRadius: number): number {
    const model = (window as any)[modelKey];
    if (!model) {
      console.warn(`${modelKey} 모델을 찾을 수 없습니다. 기본 반경 ${defaultRadius} 사용`);
      return defaultRadius;
    }

    // 바운딩 박스 계산
    const boundingBox = new THREE.Box3();
    boundingBox.setFromObject(model);

    // 바운딩 박스의 크기 계산
    const size = new THREE.Vector3();
    boundingBox.getSize(size);

    // 가장 큰 축을 기준으로 반경 계산 (X, Z 축 중 큰 값)
    const maxRadius = Math.max(size.x, size.z) / 2;

    // 여유분 추가 (기본 반경의 20% 추가)
    const adjustedRadius = maxRadius + defaultRadius * 0.2;

    console.log(
      `${modelKey} 바운딩 박스 크기: ${size.x.toFixed(1)} x ${size.y.toFixed(1)} x ${size.z.toFixed(1)}, 계산된 반경: ${adjustedRadius.toFixed(1)}`
    );

    return adjustedRadius;
  }

  /**
   * 지연 초기화 - 모델이 로드된 후에 반경 계산
   */
  private initializeFloatingObjectsDelayed(): void {
    // 기본값으로 초기화
    this.floatingObjects = [
      {
        name: "low_poly_floating_island",
        position: new THREE.Vector3(-100, 90, 330),
        radius: 60,
        height: 90,
      },
      {
        name: "low_poly_trees",
        position: new THREE.Vector3(320, 80, 0),
        radius: 55,
        height: 80,
      },
      {
        name: "low_poly_triple_trees",
        position: new THREE.Vector3(-400, 60, 100),
        radius: 150,
        height: 60,
      },
    ];

    // 모델이 로드될 때까지 대기 후 반경 재계산
    const checkModelsLoaded = () => {
      const floatingIslandModel = (window as any).floatingIslandModel;
      const floatingTreesModel = (window as any).floatingTreesModel;
      const tripleTreesModel = (window as any).tripleTreesModel;

      if (floatingIslandModel && floatingTreesModel && tripleTreesModel) {
        // 모든 모델이 로드되었으면 반경 재계산
        this.floatingObjects[0].radius = this.calculateObjectRadius("floatingIslandModel", 60);
        this.floatingObjects[1].radius = this.calculateObjectRadius("floatingTreesModel", 55);
        this.floatingObjects[2].radius = this.calculateObjectRadius("tripleTreesModel", 220);

        console.log("공중 오브젝트들 바운딩 박스 기반 반경 계산 완료:", this.floatingObjects.length, "개");
        this.floatingObjects.forEach((obj) => {
          console.log(`- ${obj.name}: 위치 (${obj.position.x}, ${obj.position.y}, ${obj.position.z}), 반경: ${obj.radius}, 높이: ${obj.height}`);
        });
      } else {
        // 아직 로드되지 않았으면 100ms 후 다시 시도
        setTimeout(checkModelsLoaded, 100);
      }
    };

    // 즉시 체크 시작
    checkModelsLoaded();
  }

  /**
   * 대체 구름 모델 생성
   */
  private createFallbackCloud(): THREE.Object3D {
    console.log("🔄 대체 구름 모델 생성 중...");

    const group = new THREE.Group();

    // 여러 개의 구체를 조합해서 구름 모양 만들기
    const cloudMaterial = new THREE.MeshLambertMaterial({
      color: 0xffffff,
      transparent: true,
      opacity: 0.8,
    });

    // 메인 구름 덩어리들
    const mainSphere = new THREE.Mesh(new THREE.SphereGeometry(3, 16, 12), cloudMaterial);
    mainSphere.position.set(0, 0, 0);
    group.add(mainSphere);

    const leftSphere = new THREE.Mesh(new THREE.SphereGeometry(2.5, 16, 12), cloudMaterial);
    leftSphere.position.set(-3, 0, 1);
    group.add(leftSphere);

    const rightSphere = new THREE.Mesh(new THREE.SphereGeometry(2.2, 16, 12), cloudMaterial);
    rightSphere.position.set(3, 0, -1);
    group.add(rightSphere);

    const backSphere = new THREE.Mesh(new THREE.SphereGeometry(1.8, 16, 12), cloudMaterial);
    backSphere.position.set(0, 1, -2.5);
    group.add(backSphere);

    const frontSphere = new THREE.Mesh(new THREE.SphereGeometry(2, 16, 12), cloudMaterial);
    frontSphere.position.set(-1, 0.5, 2.5);
    group.add(frontSphere);

    group.name = "FallbackCloudModel";
    this.setupCloudModel(group);

    return group;
  }

  /**
   * 구름 모델 초기 설정
   */
  private setupCloudModel(cloudModel: THREE.Object3D): void {
    // 구름 모델 size
    cloudModel.scale.set(21, 21, 21);

    cloudModel.visible = false;
    cloudModel.castShadow = false;
    cloudModel.receiveShadow = false;

    // 충돌 감지 비활성화
    cloudModel.userData.noCollision = true;
    cloudModel.userData.isWaterCloud = true;
    cloudModel.userData.excludeFromRaycast = true;

    // 모든 자식 메시에 대해서도 설정
    cloudModel.traverse((child) => {
      if (child instanceof THREE.Mesh) {
        child.castShadow = false;
        child.receiveShadow = false;
        child.userData.noCollision = true;
        child.userData.excludeFromRaycast = true;

        // 재질 조정
        if (child.material) {
          const materials = Array.isArray(child.material) ? child.material : [child.material];
          materials.forEach((mat: any) => {
            mat.transparent = true;
            // mat.opacity = 0.7;
            if (mat.color) mat.color.setHex(0xffffff);
            mat.needsUpdate = true;
          });
        }
      }
    });
  }

  public update(keys: any, deltaTime: number): void {
    deltaTime = Math.min(Math.max(deltaTime, 1 / 120), 1 / 30);

    // 1. 물 상태 업데이트
    this.updateWaterState(deltaTime);

    // 2. 공중 오브젝트 상호작용 체크
    this.updateFloatingObjectInteraction();

    // 3. 키보드 입력 처리
    this.handleKeyPress(keys);

    // 4. 수평 이동 처리
    this.handleHorizontalMovement(keys, deltaTime);

    // 5. 지형 분석 및 적응
    this.adaptToTerrain(deltaTime);

    // 6. 수직 이동 처리
    this.handleVerticalMovement(keys, deltaTime);

    // 7. 최종 위치 업데이트
    this.updateFinalPosition(deltaTime);

    // 8. 구름 위치 업데이트
    this.updateCloudPosition();

    // 9. 메시 위치 동기화
    this.mesh.position.copy(this.position);
  }

  /**
   * 공중 오브젝트 상호작용 업데이트
   */
  private updateFloatingObjectInteraction(): void {
    const interaction = this.checkFloatingObjectInteraction(this.position);

    if (interaction.isNear && interaction.object) {
      if (!this.isNearFloatingObject) {
        console.log(
          `공중 오브젝트 근처 도달: ${interaction.object.name} (위치: ${this.position.x.toFixed(1)}, ${this.position.y.toFixed(
            1
          )}, ${this.position.z.toFixed(1)})`
        );
        this.isNearFloatingObject = true;
        this.currentFloatingObject = interaction.object;
        this.isControlLocked = true; // 캐릭터 조작 잠금
        this.showActionButton();
      }
    } else {
      if (this.isNearFloatingObject) {
        console.log(`공중 오브젝트에서 벗어남 (위치: ${this.position.x.toFixed(1)}, ${this.position.y.toFixed(1)}, ${this.position.z.toFixed(1)})`);
        this.isNearFloatingObject = false;
        this.currentFloatingObject = null;
        this.isControlLocked = false; // 캐릭터 조작 해제
        this.hideActionButton();
      }
    }
  }

  /**
   * 액션 버튼 표시
   */
  private showActionButton(): void {
    if (!this.actionButtonVisible) {
      const actionButtonsDiv = document.getElementById("action-buttons");
      if (actionButtonsDiv) {
        // 올라가기와 돌아가기 버튼을 함께 표시
        const actionButtonsHtml = sceneHtml.actionButtons.object;
        actionButtonsDiv.innerHTML = actionButtonsHtml;

        // 올라가기 버튼 클릭 이벤트 추가
        const moveButton = document.getElementById("move-button");
        if (moveButton) {
          moveButton.addEventListener("click", () => this.handleMoveToFloatingObject());
        }

        // 돌아가기 버튼 클릭 이벤트 추가
        const backButton = document.getElementById("back-button");
        if (backButton) {
          backButton.addEventListener("click", () => this.handleBackFromFloatingObject());
        }

        this.actionButtonVisible = true;
        console.log("액션 버튼 표시됨 (올라가기/돌아가기)");
      }
    }
  }

  /**
   * 액션 버튼 숨김
   */
  private hideActionButton(): void {
    if (this.actionButtonVisible) {
      const actionButtonsDiv = document.getElementById("action-buttons");
      if (actionButtonsDiv) {
        actionButtonsDiv.innerHTML = "";
        this.actionButtonVisible = false;
        console.log("액션 버튼 숨김됨");
      }
    }
  }

  /**
   * 리셋 버튼 표시
   */
  private showResetButton(): void {
    if (!this.resetButtonVisible) {
      const resetButtonDiv = document.getElementById("reset-button");
      if (resetButtonDiv) {
        // sceneHtml.ts에 있는 actionButtons.reset의 html을 넣어줌
        const resetButtonHtml = sceneHtml.actionButtons.reset;
        resetButtonDiv.innerHTML = resetButtonHtml;

        // 리셋 버튼 클릭 이벤트 추가
        const resetPositionButton = document.getElementById("reset-position-button");
        if (resetPositionButton) {
          resetPositionButton.addEventListener("click", () => this.handleResetPosition());
        }

        this.resetButtonVisible = true;
        console.log("리셋 버튼 표시됨");
      }
    }
  }

  /**
   * 리셋 버튼 숨김
   */
  private hideResetButton(): void {
    if (this.resetButtonVisible) {
      const resetButtonDiv = document.getElementById("reset-button");
      if (resetButtonDiv) {
        resetButtonDiv.innerHTML = "";
        this.resetButtonVisible = false;
        console.log("리셋 버튼 숨김됨");
      }
    }
  }

  /**
   * 리셋 위치로 이동 처리
   */
  private handleResetPosition(): void {
    console.log("리셋 버튼 클릭됨 - 지정된 위치로 이동");

    // 지정된 위치로 이동 (x: 104.56, y: 88.87, z: 139.81)
    this.setPosition(104.56, 88.87, 139.81);

    // 리셋 버튼 숨김
    this.hideResetButton();

    console.log("캐릭터가 리셋 위치로 이동했습니다.");
  }

  /**
   * 공중 오브젝트로 이동 처리
   */
  private handleMoveToFloatingObject(): void {
    if (this.currentFloatingObject) {
      console.log(`공중 오브젝트로 이동: ${this.currentFloatingObject.name}`);

      // 캐릭터를 공중 오브젝트 위로 이동
      const targetY = this.currentFloatingObject.height + 5; // 오브젝트 높이 + 여유분
      this.position.y = targetY;
      this.velocity.y = 0;

      // 버튼 숨김
      this.hideActionButton();

      console.log(`캐릭터가 ${this.currentFloatingObject.name} 위로 이동했습니다.`);
    }
  }

  /**
   * 공중 오브젝트에서 돌아가기 처리
   */
  private handleBackFromFloatingObject(): void {
    console.log("공중 오브젝트에서 돌아가기 선택됨");

    // 캐릭터 조작 잠금 해제
    this.isControlLocked = false;

    // 버튼 숨김
    this.hideActionButton();

    console.log("캐릭터 조작이 다시 활성화되었습니다.");
  }

  /**
   * 키보드 입력으로 공중 오브젝트 이동 처리
   */
  public handleKeyPress(keys: any): void {
    // M 키를 눌렀을 때 공중 오브젝트로 이동
    if (keys["KeyM"] && this.isNearFloatingObject && this.currentFloatingObject) {
      this.handleMoveToFloatingObject();
    }

    // B 키를 눌렀을 때 돌아가기
    if (keys["KeyB"] && this.isNearFloatingObject && this.isControlLocked) {
      this.handleBackFromFloatingObject();
    }
  }

  /**
   * 물 상태 업데이트 - 안정화된 버전 (디바운싱 적용)
   */
  private updateWaterState(deltaTime: number): void {
    const currentWaterStatus = this.checkWaterStatus(this.position);
    const shouldBeInWater = currentWaterStatus.inWater;

    // 현재 물 상태와 예상 물 상태가 다른 경우
    if (this.isInWater !== shouldBeInWater) {
      // 대기 중인 상태가 없거나 다른 상태로 변경된 경우
      if (this.pendingWaterState !== shouldBeInWater) {
        this.pendingWaterState = shouldBeInWater;
        this.waterStateTimer = 0; // 타이머 리셋
        console.log(`🔄 물 상태 변경 대기 시작: ${this.isInWater} → ${shouldBeInWater}`);
      }

      // 타이머 증가
      this.waterStateTimer += deltaTime;

      // 지연 시간이 지나면 실제 상태 변경
      if (this.waterStateTimer >= this.waterStateChangeDelay && !this.waterTransitionInProgress) {
        this.waterTransitionInProgress = true;

        if (shouldBeInWater) {
          console.log("🌊 물에 진입! 구름 생성 중... (안정화됨)");
          this.enterWater(currentWaterStatus);
        } else {
          console.log("🏃 물에서 탈출! 구름 제거 중... (안정화됨)");
          this.exitWater();
        }

        // 상태 업데이트
        this.isInWater = shouldBeInWater;
        this.waterLevel = currentWaterStatus.waterLevel;
        this.waterBuoyancy = currentWaterStatus.buoyancy;

        // 초기화
        this.pendingWaterState = null;
        this.waterStateTimer = 0;
        this.waterTransitionInProgress = false;
      }
    } else {
      // 상태가 안정적이면 초기화
      this.pendingWaterState = null;
      this.waterStateTimer = 0;

      // 현재 물 상태 유지
      this.waterLevel = currentWaterStatus.waterLevel;
      this.waterBuoyancy = currentWaterStatus.buoyancy;
    }
  }

  /**
   * 물 진입 처리 - 높이 조정을 부드럽게
   */
  private async enterWater(waterStatus: any): Promise<void> {
    // 현재 캐릭터 높이 저장 (복원용)
    this.preWaterHeight = this.position.y;

    // 물 표면 높이 계산 (waterLevel은 실제 물 모델의 Y 좌표)
    const waterSurfaceHeight = waterStatus.waterLevel; // 음수 값 그대로 사용
    const targetHeight = waterSurfaceHeight + this.cloudOffset; // 구름 중앙에 위치하도록 수정

    console.log(`캐릭터 높이 조정: ${this.preWaterHeight.toFixed(1)} → ${targetHeight.toFixed(1)}`);
    console.log(`물 표면 높이: ${waterSurfaceHeight.toFixed(1)}, 구름 오프셋: ${this.cloudOffset}`);
    console.log(`지형 높이 확인: ${this.terrainRaycaster.getTerrainHeight(this.position.x, this.position.z).toFixed(1)}`);

    // 높이를 즉시 설정하지만 Y 속도는 0으로
    this.position.y = targetHeight;
    this.velocity.y = 0;

    // 구름 모델이 없으면 로드
    if (!this.waterCloudModel) {
      this.waterCloudModel = await this.loadWaterCloudModel();
      if (this.waterCloudModel) {
        this.scene.add(this.waterCloudModel);
      }
    }

    // 구름 표시
    if (this.waterCloudModel) {
      this.waterCloudModel.visible = true;
      console.log("✅ 구름 모델 표시 완료!");
    }

    // 리셋 버튼 표시
    this.showResetButton();
  }

  /**
   * 물 탈출 처리 - 확실한 탈출 감지
   */
  private exitWater(): void {
    // 구름 숨김 - 즉시 처리
    if (this.waterCloudModel) {
      this.waterCloudModel.visible = false;
      console.log("🔴 구름 모델 숨김 완료!");
    }

    // 현재 위치의 지형 높이 확인
    const terrainHeight = this.terrainRaycaster.getTerrainHeight(this.position.x, this.position.z);

    // 캐릭터 높이를 지형 높이로 복원
    this.position.y = terrainHeight;
    this.velocity.y = 0;

    console.log(`캐릭터 높이 복원: ${terrainHeight.toFixed(1)} (지형 기준)`);

    // 리셋 버튼 숨김
    this.hideResetButton();
  }

  /**
   * 캐릭터 방향 업데이트
   */
  private updateCharacterDirection(moveVector: THREE.Vector3): void {
    // 이동 벡터가 있을 때만 방향 업데이트
    if (moveVector.length() > 0.1) {
      this.lastMoveDirection.copy(moveVector);

      // 부드러운 방향 전환
      this.characterDirection.lerp(moveVector, 0.1);
      this.characterDirection.normalize();
    }
  }

  /**
   * 구름 위치 및 회전 업데이트 - 캐릭터가 구름 중앙에 위치하도록
   */
  private updateCloudPosition(): void {
    if (!this.waterCloudModel || !this.waterCloudModel.visible) return;

    // 구름을 캐릭터 위치에 배치 (캐릭터가 구름 중앙에 오도록)
    const time = Date.now() * 0.001;

    // 부드러운 부유 효과
    const floatOffset = Math.sin(time * 0.8) * 0.5;

    this.waterCloudModel.position.set(this.position.x, this.position.y + floatOffset, this.position.z);

    // 캐릭터 방향에 따른 구름 회전
    this.updateCloudRotation();

    // 디버그 정보 (필요시 주석 해제)
    // console.log(`구름 위치: (${this.position.x.toFixed(1)}, ${this.position.y.toFixed(1)}, ${this.position.z.toFixed(1)})`);
  }

  /**
   * 구름 회전 업데이트 - 캐릭터 방향에 따라 회전
   */
  private updateCloudRotation(): void {
    if (!this.waterCloudModel) return;

    // 캐릭터 방향을 기반으로 목표 회전 각도 계산
    const targetRotationY = Math.atan2(this.characterDirection.x, this.characterDirection.z);

    // 현재 구름 회전과 목표 회전 사이의 차이 계산
    let currentRotationY = this.waterCloudModel.rotation.y;

    // 각도 차이를 -π ~ π 범위로 정규화
    let angleDiff = targetRotationY - currentRotationY;
    while (angleDiff > Math.PI) angleDiff -= 2 * Math.PI;
    while (angleDiff < -Math.PI) angleDiff += 2 * Math.PI;

    // 부드러운 회전 적용
    this.waterCloudModel.rotation.y += angleDiff * this.cloudRotationSpeed;

    // 추가적인 부드러운 회전 효과 (기존 효과 유지)
    this.waterCloudModel.rotation.y += 0.001;
  }

  private handleHorizontalMovement(keys: any, deltaTime: number): void {
    // 캐릭터 조작이 잠겨있으면 이동 처리 건너뛰기
    if (this.isControlLocked) {
      this.velocity.x *= this.velocityDamping;
      this.velocity.z *= this.velocityDamping;
      return;
    }

    // 채팅 입력 필드가 활성화되어 있으면 이동 처리 건너뛰기
    const activeElement = document.activeElement;
    const isChatInputActive = activeElement?.tagName === "INPUT" || activeElement?.tagName === "TEXTAREA";
    if (isChatInputActive) {
      this.velocity.x *= this.velocityDamping;
      this.velocity.z *= this.velocityDamping;
      return;
    }

    const moveVector = new THREE.Vector3(0, 0, 0);

    if (keys["KeyW"] || keys["ArrowUp"]) moveVector.z = -1;
    if (keys["KeyS"] || keys["ArrowDown"]) moveVector.z = 1;
    if (keys["KeyA"] || keys["ArrowLeft"]) moveVector.x = -1;
    if (keys["KeyD"] || keys["ArrowRight"]) moveVector.x = 1;

    if (moveVector.length() > 0) {
      moveVector.normalize();

      // 캐릭터 방향 업데이트
      this.updateCharacterDirection(moveVector);

      const futureX = this.position.x + moveVector.x * this.moveSpeed * deltaTime;
      const futureZ = this.position.z + moveVector.z * this.moveSpeed * deltaTime;

      // 공중 오브젝트와의 충돌 체크 (상호작용 감지와 동일한 방법 사용)
      const futurePosition = new THREE.Vector3(futureX, this.position.y, futureZ);
      const collisionCheck = this.checkFloatingObjectCollision(futurePosition);

      if (collisionCheck.collision) {
        // low_poly_triple_trees의 경우 더 강력한 충돌 차단
        if (collisionCheck.object.name === "low_poly_triple_trees") {
          console.log(`🌳 low_poly_triple_trees 충돌 감지 - 모든 방향 이동 차단됨`);
          // triple_trees의 경우 모든 방향 이동을 강력하게 차단
          this.velocity.x *= 0.05;
          this.velocity.z *= 0.05;
          return; // 이동 처리 완전 중단
        } else {
          // 다른 오브젝트들은 기존 로직 적용
          const moveDirection = new THREE.Vector3(moveVector.x, 0, moveVector.z);
          const dotProduct = moveDirection.dot(collisionCheck.direction);

          // 충돌 방향으로의 이동만 차단 (양옆, 뒤로는 이동 가능)
          if (dotProduct > 0.5) {
            // 충돌 방향으로 45도 이내의 각도로 이동하려는 경우
            console.log(`공중 오브젝트 충돌 감지: ${collisionCheck.object.name} - 충돌 방향 이동 차단됨`);
            // 충돌 방향으로의 속도만 감소
            const collisionDirectionX = collisionCheck.direction.x;
            const collisionDirectionZ = collisionCheck.direction.z;

            if (Math.abs(moveVector.x) > 0.1 && Math.sign(moveVector.x) === Math.sign(collisionDirectionX)) {
              this.velocity.x *= 0.1;
            }
            if (Math.abs(moveVector.z) > 0.1 && Math.sign(moveVector.z) === Math.sign(collisionDirectionZ)) {
              this.velocity.z *= 0.1;
            }
          }
        }
      }

      // 현재 위치에서도 충돌 체크 (이미 충돌 중인 경우)
      const currentCollisionCheck = this.checkFloatingObjectCollision(this.position);
      if (currentCollisionCheck.collision) {
        // low_poly_triple_trees의 경우 더 강력한 충돌 차단
        if (currentCollisionCheck.object.name === "low_poly_triple_trees") {
          console.log(`🌳 low_poly_triple_trees 내부 충돌 감지 - 모든 방향 이동 완전 차단됨`);
          // triple_trees 내부에서는 모든 방향 이동을 완전히 차단
          this.velocity.x *= 0.01;
          this.velocity.z *= 0.01;
          return; // 이동 처리 완전 중단
        } else {
          // 다른 오브젝트들은 기존 로직 적용
          const moveDirection = new THREE.Vector3(moveVector.x, 0, moveVector.z);
          const dotProduct = moveDirection.dot(currentCollisionCheck.direction);

          if (dotProduct > 0.5) {
            console.log(`공중 오브젝트 내부 충돌 감지: ${currentCollisionCheck.object.name} - 충돌 방향 이동 차단됨`);
            // 충돌 방향으로의 속도만 더 강하게 감소
            const collisionDirectionX = currentCollisionCheck.direction.x;
            const collisionDirectionZ = currentCollisionCheck.direction.z;

            if (Math.abs(moveVector.x) > 0.1 && Math.sign(moveVector.x) === Math.sign(collisionDirectionX)) {
              this.velocity.x *= 0.05;
            }
            if (Math.abs(moveVector.z) > 0.1 && Math.sign(moveVector.z) === Math.sign(collisionDirectionZ)) {
              this.velocity.z *= 0.05;
            }
          }
        }
      }

      // 물에서는 지형 충돌 검사 건너뛰기
      if (!this.isInWater) {
        const currentHeight = this.terrainRaycaster.getTerrainHeight(this.position.x, this.position.z);
        const futureHeight = this.terrainRaycaster.getTerrainHeight(futureX, futureZ);
        const basicHeightDiff = futureHeight - currentHeight;

        const heightThreshold = this.isOnGround ? this.maxStepHeight : this.maxStepHeight * 2;
        if (basicHeightDiff > heightThreshold) {
          if (this.isOnGround) {
            this.velocity.x *= 0.1;
            this.velocity.z *= 0.1;
            return;
          }
        }

        if (basicHeightDiff > 0.1 && basicHeightDiff <= this.maxStepHeight) {
          if (this.isValidStair(futureX, futureZ, basicHeightDiff) || this.isOnGround) {
            this.position.y += basicHeightDiff;
          } else if (this.isOnGround) {
            this.velocity.x *= 0.3;
            this.velocity.z *= 0.3;
          }
        }

        if (basicHeightDiff < -this.maxStepHeight) {
          if (!this.isOnGround || this.velocity.y > 0) {
            // 공중에 있거나 상승 중이면 자유롭게 이동
          } else {
            this.velocity.x *= 0.7;
            this.velocity.z *= 0.7;
          }
        }
      }

      // 물에서는 속도 증가
      let finalMoveSpeed = this.moveSpeed;
      if (this.isInWater) {
        finalMoveSpeed *= 1.5;
      }

      this.velocity.x = moveVector.x * finalMoveSpeed;
      this.velocity.z = moveVector.z * finalMoveSpeed;
    } else {
      this.velocity.x *= this.velocityDamping;
      this.velocity.z *= this.velocityDamping;
    }
  }

  private adaptToTerrain(deltaTime: number): void {
    if (this.isInWater) {
      // 물에서는 고정 높이 유지 (구름 중앙)
      const waterSurfaceHeight = this.waterLevel; // 음수 값 그대로 사용
      const targetHeight = waterSurfaceHeight + this.cloudOffset;
      this.position.y = targetHeight;
      this.isOnGround = true;
      this.groundContactTime += deltaTime;
      this.airTime = 0;
      this.velocity.y = 0;
    } else {
      // 공중 오브젝트와의 충돌 체크 (상호작용 감지와 동일한 방법 사용)
      const collisionCheck = this.checkFloatingObjectCollision(this.position);
      if (collisionCheck.collision) {
        // low_poly_triple_trees의 경우 더 강력한 충돌 처리
        if (collisionCheck.object.name === "low_poly_triple_trees") {
          console.log(`🌳 low_poly_triple_trees 지형 충돌 감지 - 높이 고정 및 이동 제한`);
          // triple_trees와 충돌 중이면 높이를 고정하고 모든 이동을 제한
          this.groundContactTime += deltaTime;
          this.airTime = 0;
          this.isOnGround = true; // 지형으로 인식하여 추가 이동 방지

          // 모든 방향 속도를 강력하게 감소
          this.velocity.x *= 0.01;
          this.velocity.z *= 0.01;
          this.velocity.y = 0; // 수직 이동 완전 차단

          // 현재 높이를 강제로 유지
          const currentHeight = this.position.y;
          this.position.y = currentHeight;

          return;
        } else {
          // 다른 오브젝트들은 기존 로직 적용
          // 공중 오브젝트와 충돌 중이면 위로 올라가는 것을 방지하고 현재 높이 유지
          // isOnGround를 true로 설정하지 않아서 지형 적응 로직이 계속 작동하도록 함
          this.groundContactTime += deltaTime;
          this.airTime = 0;

          // 위로 올라가는 것을 방지
          if (this.velocity.y > 0) {
            this.velocity.y *= 0.1;
          }

          // 현재 높이를 강제로 유지 (위로 올라가지 않도록)
          const currentHeight = this.position.y;
          if (this.velocity.y > 0) {
            this.position.y = currentHeight;
          }

          return;
        }
      }

      // 일반적인 지형 적응
      const currentGroundHeight = this.terrainRaycaster.getTerrainHeight(this.position.x, this.position.z);
      const distanceToTarget = this.position.y - currentGroundHeight;
      const wasOnGround = this.isOnGround;

      this.isOnGround =
        distanceToTarget <= this.groundCheckDistance && (Math.abs(this.velocity.y) < this.landingSpeedThreshold || this.velocity.y <= 10);

      if (this.isOnGround) {
        this.groundContactTime += deltaTime;
        this.airTime = 0;

        const snapDistance = this.groundSnapDistance;
        if (distanceToTarget < snapDistance || (this.velocity.y < 0 && distanceToTarget < snapDistance * 2)) {
          this.position.y = currentGroundHeight;
          this.lastGroundHeight = currentGroundHeight;

          if (this.velocity.y < 0) {
            this.velocity.y = 0;
          }
        }
      } else {
        this.airTime += deltaTime;
        this.groundContactTime = 0;
      }

      if (!wasOnGround && this.isOnGround) {
        console.log(`착지! 높이: ${this.position.y.toFixed(1)}`);
      }
    }
  }

  private handleVerticalMovement(keys: any, deltaTime: number): void {
    // 캐릭터 조작이 잠겨있으면 점프 처리 건너뛰기
    if (this.isControlLocked) {
      return;
    }

    // 공중 오브젝트와의 충돌 체크
    const collisionCheck = this.checkFloatingObjectCollision(this.position);
    const isCollidingWithFloatingObject = collisionCheck.collision;

    // 점프 처리 - 물이나 공중 오브젝트 충돌 시 점프 제한
    if (keys["Space"] && this.isOnGround && this.groundContactTime > 0.05) {
      // 채팅 입력 필드가 활성화되어 있으면 점프 차단
      const activeElement = document.activeElement;
      const isChatInputActive = activeElement?.tagName === "INPUT" || activeElement?.tagName === "TEXTAREA";
      if (isChatInputActive) {
        return; // 채팅 입력 중에는 점프 불가
      }

      if (this.isInWater || isCollidingWithFloatingObject) {
        return; // 물이나 공중 오브젝트 충돌 시 점프 불가
      }

      this.velocity.y = this.jumpPower;
      this.isOnGround = false;
      this.groundContactTime = 0;
      console.log(`점프! 현재 높이: ${this.position.y.toFixed(1)}, 점프력: ${this.jumpPower.toFixed(1)}`);
    }

    // 중력 처리
    if (this.isInWater) {
      this.velocity.y = 0; // 물에서는 Y축 속도 고정
    } else if (!this.isOnGround) {
      this.velocity.y -= this.gravity * deltaTime;
      this.velocity.y = Math.max(this.velocity.y, -70);
    } else if (this.isOnGround && !this.isInWater) {
      this.velocity.y = Math.max(this.velocity.y, 0);
    }
  }

  private updateFinalPosition(deltaTime: number): void {
    // 이전 위치 저장
    const previousPosition = this.position.clone();

    if (this.isInWater) {
      // 물 속에서는 구름 중앙에서 부드럽게 떠있도록
      const waterSurfaceHeight = this.waterLevel; // 음수 값 그대로 사용
      const targetHeight = waterSurfaceHeight + this.cloudOffset;

      // 수평 이동
      this.position.x += this.velocity.x * deltaTime;
      this.position.z += this.velocity.z * deltaTime;

      // 현재 높이와 목표 높이 사이의 차이를 부드럽게 보간
      const heightDiff = targetHeight - this.position.y;
      if (Math.abs(heightDiff) > 0.1) {
        this.position.y += heightDiff * 0.1; // 부드러운 보간
      }

      // 물 속에서는 중력 효과 감소
      this.velocity.y *= 0.95;
    } else {
      // 공중 오브젝트와의 충돌 체크 (상호작용 감지와 동일한 방법 사용)
      const collisionCheck = this.checkFloatingObjectCollision(this.position);
      if (collisionCheck.collision) {
        // 공중 오브젝트와 충돌 중이면 위로 올라가는 것을 강력하게 방지
        console.log(`공중 오브젝트 충돌 감지: ${collisionCheck.object.name} - 위로 올라가는 것 방지됨`);

        // 위로 올라가는 것을 완전히 차단
        if (this.velocity.y > 0) {
          this.velocity.y = 0;
        }

        // 현재 높이를 강제로 유지
        const currentHeight = this.position.y;
        this.position.y = currentHeight;
      }

      // 물 밖에서는 일반적인 중력 적용
      this.velocity.y -= this.gravity * deltaTime;

      // 일반적인 3D 이동
      const newPosition = this.position.clone();
      newPosition.add(this.velocity.clone().multiplyScalar(deltaTime));

      if (this.velocity.x !== 0 || this.velocity.z !== 0) {
        this.position.x = newPosition.x;
        this.position.z = newPosition.z;
      }

      this.position.y = newPosition.y;

      // 지형 높이 확인
      const terrainHeight = this.terrainRaycaster.getTerrainHeight(this.position.x, this.position.z);
      const minHeight = Math.max(terrainHeight, -1000); // 최소 높이 제한

      // 지형과의 충돌 검사
      const heightDifference = this.position.y - minHeight;

      if (heightDifference < -2.0 && this.velocity.y <= 0) {
        this.position.y = minHeight;
        this.velocity.y = 0;
        this.isOnGround = true;
      }
    }

    this.checkBounds();

    // 위치가 변경되었을 때만 콘솔에 출력
    if (this.velocity.x !== 0 || this.velocity.z !== 0 || this.velocity.y !== 0) {
      console.log(`캐릭터 위치: x=${this.position.x.toFixed(2)}, y=${this.position.y.toFixed(2)}, z=${this.position.z.toFixed(2)}`);
    }
  }

  // 맵 경계 제한
  private checkBounds(): void {
    const isDay = isDayTime();
    let bounds;

    if (isDay) {
      bounds = { minX: -800, maxX: 800, minZ: -800, maxZ: 800 };
    } else {
      bounds = { minX: -3800, maxX: 3800, minZ: -3800, maxZ: 3800 };
    }

    const oldX = this.position.x;
    const oldZ = this.position.z;

    this.position.x = THREE.MathUtils.clamp(this.position.x, bounds.minX, bounds.maxX);
    this.position.z = THREE.MathUtils.clamp(this.position.z, bounds.minZ, bounds.maxZ);

    if (oldX !== this.position.x || oldZ !== this.position.z) {
      console.log(`🚧 맵 경계 제한: (${oldX.toFixed(1)}, ${oldZ.toFixed(1)}) → (${this.position.x.toFixed(1)}, ${this.position.z.toFixed(1)})`);
    }
  }

  private isValidStair(x: number, z: number, heightDiff: number): boolean {
    if (heightDiff <= 2.0) return true;

    const checkPoints = [
      { x: x, z: z },
      { x: x + this.stairDetectionRadius, z: z },
      { x: x - this.stairDetectionRadius, z: z },
      { x: x, z: z + this.stairDetectionRadius },
      { x: x, z: z - this.stairDetectionRadius },
      { x: x + this.stairDetectionRadius * 0.7, z: z + this.stairDetectionRadius * 0.7 },
      { x: x - this.stairDetectionRadius * 0.7, z: z - this.stairDetectionRadius * 0.7 },
      { x: x + this.stairDetectionRadius * 0.7, z: z - this.stairDetectionRadius * 0.7 },
      { x: x - this.stairDetectionRadius * 0.7, z: z + this.stairDetectionRadius * 0.7 },
    ];

    let validStairCount = 0;
    const currentHeight = this.terrainRaycaster.getTerrainHeight(this.position.x, this.position.z);

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
    this.position.set(x, y, z);
    this.velocity.set(0, 0, 0);
    this.lastGroundHeight = this.terrainRaycaster.getTerrainHeight(x, z);
    this.mesh.position.copy(this.position);

    // 구름 숨김 처리
    if (this.waterCloudModel) {
      this.waterCloudModel.visible = false;
    }

    // 물 상태 안정화 변수 초기화
    this.waterStateTimer = 0;
    this.pendingWaterState = null;
    this.waterTransitionInProgress = false;
    this.isInWater = false; // 위치 변경시 물 상태 초기화
  }

  public getPosition(): THREE.Vector3 {
    return this.position.clone();
  }

  public destroy(): void {
    // 액션 버튼 정리
    this.hideActionButton();

    // 리셋 버튼 정리
    this.hideResetButton();

    // 구름 모델 정리
    if (this.waterCloudModel) {
      this.scene.remove(this.waterCloudModel);

      // 재귀적으로 모든 지오메트리와 재질 정리
      this.waterCloudModel.traverse((child) => {
        if (child instanceof THREE.Mesh) {
          if (child.geometry) child.geometry.dispose();
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
  }

  public getDebugInfo(): any {
    return {
      position: {
        x: this.position.x.toFixed(2),
        y: this.position.y.toFixed(2),
        z: this.position.z.toFixed(2),
      },
      velocity: {
        x: this.velocity.x.toFixed(2),
        y: this.velocity.y.toFixed(2),
        z: this.velocity.z.toFixed(2),
      },
      isOnGround: this.isOnGround,
      groundContactTime: this.groundContactTime.toFixed(2),
      airTime: this.airTime.toFixed(2),
      lastGroundHeight: this.lastGroundHeight.toFixed(2),
      isInWater: this.isInWater,
      waterLevel: this.waterLevel.toFixed(2),
      waterBuoyancy: this.waterBuoyancy.toFixed(2),
      preWaterHeight: this.preWaterHeight.toFixed(2),
      hasCloudModel: !!this.waterCloudModel,
      cloudVisible: this.waterCloudModel?.visible || false,
      // 물 상태 안정화 디버그 정보 추가
      waterStateTimer: this.waterStateTimer.toFixed(2),
      pendingWaterState: this.pendingWaterState,
      waterTransitionInProgress: this.waterTransitionInProgress,
      // 캐릭터 방향 정보 추가
      characterDirection: {
        x: this.characterDirection.x.toFixed(2),
        z: this.characterDirection.z.toFixed(2),
      },
      lastMoveDirection: {
        x: this.lastMoveDirection.x.toFixed(2),
        z: this.lastMoveDirection.z.toFixed(2),
      },
      // 공중 오브젝트 상호작용 정보 추가
      isNearFloatingObject: this.isNearFloatingObject,
      currentFloatingObject: this.currentFloatingObject?.name || "none",
      actionButtonVisible: this.actionButtonVisible,
      isControlLocked: this.isControlLocked,
      floatingObjectsCount: this.floatingObjects.length,
      // 리셋 버튼 정보 추가
      resetButtonVisible: this.resetButtonVisible,
    };
  }
}
