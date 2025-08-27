import * as THREE from "three";

// Ammo.js 타입 정의
declare global {
  interface Window {
    Ammo: any;
  }
}

// Ammo.js 초기화 상태
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

// 충돌 모양 생성 함수
export function createTriangleMeshShape(geometry: THREE.BufferGeometry): any {
  const Ammo = window.Ammo;
  if (!Ammo) return null;

  const vertices = geometry.attributes.position.array;
  const indices = geometry.index ? geometry.index.array : null;

  if (!indices) {
    console.warn("Geometry has no indices, creating box shape instead");
    return createBoxShapeFromGeometry(geometry);
  }

  const triangleMesh = new Ammo.btTriangleMesh();
  for (let i = 0; i < indices.length; i += 3) {
    const ai = indices[i] * 3;
    const bi = indices[i + 1] * 3;
    const ci = indices[i + 2] * 3;

    const v0 = new Ammo.btVector3(vertices[ai], vertices[ai + 1], vertices[ai + 2]);
    const v1 = new Ammo.btVector3(vertices[bi], vertices[bi + 1], vertices[bi + 2]);
    const v2 = new Ammo.btVector3(vertices[ci], vertices[ci + 1], vertices[ci + 2]);

    triangleMesh.addTriangle(v0, v1, v2, true);
  }

  return new Ammo.btBvhTriangleMeshShape(triangleMesh, true, true);
}

// indices가 없는 geometry를 위한 박스 모양 생성 함수
export function createBoxShapeFromGeometry(geometry: THREE.BufferGeometry): any {
  const Ammo = window.Ammo;
  if (!Ammo) return null;

  // geometry의 바운딩 박스 계산
  if (!geometry.boundingBox) {
    geometry.computeBoundingBox();
  }
  const box = geometry.boundingBox;

  if (!box) {
    console.warn("Cannot compute bounding box for geometry");
    return null;
  }

  const size = new THREE.Vector3();
  box.getSize(size);

  // 최소 크기 보장 (너무 얇은 지면 방지) 및 안정성 향상
  const minHeight = 2.0; // 최소 높이 증가
  const minWidth = 1.0;
  const minDepth = 1.0;

  const adjustedHeight = Math.max(size.y * 0.5, minHeight);
  const adjustedWidth = Math.max(size.x * 0.5, minWidth);
  const adjustedDepth = Math.max(size.z * 0.5, minDepth);

  const halfExtents = new Ammo.btVector3(adjustedWidth, adjustedHeight, adjustedDepth);
  const boxShape = new Ammo.btBoxShape(halfExtents);

  console.log(`박스 모양 생성: 크기=(${adjustedWidth * 2}, ${adjustedHeight * 2}, ${adjustedDepth * 2})`);
  return boxShape;
}

// 정적 리지드 바디 생성 함수
export function createStaticRigidBody(mesh: THREE.Mesh, shape: any, physicsWorld: any): void {
  const Ammo = window.Ammo;
  if (!Ammo || !physicsWorld) return;

  const transform = new Ammo.btTransform();
  transform.setIdentity();

  // 월드 매트릭스를 적용하여 정확한 위치/회전 설정
  mesh.updateMatrixWorld(true);
  const pos = mesh.position;
  const quat = mesh.quaternion;

  transform.setOrigin(new Ammo.btVector3(pos.x, pos.y, pos.z));
  transform.setRotation(new Ammo.btQuaternion(quat.x, quat.y, quat.z, quat.w));

  const motionState = new Ammo.btDefaultMotionState(transform);
  const rbInfo = new Ammo.btRigidBodyConstructionInfo(0, motionState, shape, new Ammo.btVector3(0, 0, 0));
  const body = new Ammo.btRigidBody(rbInfo);

  // 마찰력과 복원력 설정 더욱 강화
  body.setFriction(8.0); // 마찰력 더욱 강화
  body.setRestitution(0.0); // 복원력 제거로 안정성 향상

  // 지면은 절대 움직이지 않도록 설정
  body.setCollisionFlags(body.getCollisionFlags() | 1); // CF_STATIC_OBJECT
  body.setActivationState(4); // DISABLE_DEACTIVATION

  // 충돌 그룹 설정: 지면 그룹으로 설정하여 캐릭터와 확실한 충돌 보장
  const groundCollisionGroup = 1; // 지면 그룹
  const groundCollisionMask = 1 | 2; // 지면(1)과 캐릭터(2) 모두와 충돌
  physicsWorld.addRigidBody(body, groundCollisionGroup, groundCollisionMask);

  console.log(`지면 물리 바디 추가: ${mesh.name} (${pos.x.toFixed(2)}, ${pos.y.toFixed(2)}, ${pos.z.toFixed(2)})`);
}

export function createManualGroundPhysics(physicsWorld: any): void {
  const Ammo = window.Ammo;
  if (!Ammo) return;

  // 여러 개의 큰 지면 박스 생성
  const groundConfigs = [
    { x: 0, y: -5, z: 0, sizeX: 200, sizeY: 10, sizeZ: 200 }, // 중앙 대형 지면
    { x: 70, y: -5, z: 100, sizeX: 150, sizeY: 10, sizeZ: 150 }, // forest 위치 지면
    { x: -100, y: -5, z: 0, sizeX: 100, sizeY: 10, sizeZ: 100 }, // 서쪽
    { x: 200, y: -5, z: 0, sizeX: 100, sizeY: 10, sizeZ: 100 }, // 동쪽
  ];

  groundConfigs.forEach((config, index) => {
    const halfExtents = new Ammo.btVector3(config.sizeX, config.sizeY, config.sizeZ);
    const groundShape = new Ammo.btBoxShape(halfExtents);

    const transform = new Ammo.btTransform();
    transform.setIdentity();
    transform.setOrigin(new Ammo.btVector3(config.x, config.y, config.z));

    const motionState = new Ammo.btDefaultMotionState(transform);
    const rbInfo = new Ammo.btRigidBodyConstructionInfo(0, motionState, groundShape, new Ammo.btVector3(0, 0, 0));
    const groundBody = new Ammo.btRigidBody(rbInfo);

    // 마찰력 강화
    groundBody.setFriction(8.0);
    groundBody.setRestitution(0.0);

    // 지면 설정 강화
    groundBody.setCollisionFlags(groundBody.getCollisionFlags() | 1); // CF_STATIC_OBJECT
    groundBody.setActivationState(4); // DISABLE_DEACTIVATION

    // 충돌 그룹: 지면 그룹으로 설정하여 캐릭터와 확실한 충돌 보장
    const groundCollisionGroup = 1; // 지면 그룹
    const groundCollisionMask = 1 | 2; // 지면(1)과 캐릭터(2) 모두와 충돌
    physicsWorld.addRigidBody(groundBody, groundCollisionGroup, groundCollisionMask);

    console.log(`수동 지면 ${index + 1} 생성: (${config.x}, ${config.y}, ${config.z}) 크기: ${config.sizeX}x${config.sizeY}x${config.sizeZ}`);
  });
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

    // 디버깅 로그 (빈도 제한)
    if (Math.random() < 0.01) {
      console.log(`✅ 지형 높이 (${rayResults.length}개 샘플): ${averageHeight.toFixed(2)} at (${x.toFixed(1)}, ${z.toFixed(1)})`);
    }

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

// TPS 게임 스타일 캐릭터 생성 - 실제 지형 높이 자동 감지
export function createCharacterController(physicsWorld: any, scene: THREE.Scene, startPosition = { x: 70, y: 80, z: 100 }): any {
  const Ammo = window.Ammo;
  if (!Ammo || !physicsWorld) return null;

  // 실제 지형 높이 감지
  const detectedGroundHeight = findGroundHeight(physicsWorld, startPosition.x, startPosition.z);
  const adjustedStartPosition = {
    x: startPosition.x,
    y: detectedGroundHeight,
    z: startPosition.z,
  };

  console.log(
    `🎮 TPS 캐릭터 생성: (${startPosition.x}, ${startPosition.y}, ${startPosition.z}) → (${
      adjustedStartPosition.x
    }, ${adjustedStartPosition.y.toFixed(1)}, ${adjustedStartPosition.z})`
  );

  const radius = 1.2;
  const height = 2.5;

  // Three.js mesh (디버그용) - 투명하게 설정하여 숨김
  const geometry = new THREE.CapsuleGeometry(radius, height);
  const material = new THREE.MeshStandardMaterial({
    color: 0x44ff44,
    transparent: true,
    opacity: 0.0, // 완전히 투명하게 설정
    visible: false, // 보이지 않게 설정
  });
  const characterMesh = new THREE.Mesh(geometry, material);
  characterMesh.position.set(adjustedStartPosition.x, adjustedStartPosition.y, adjustedStartPosition.z);
  characterMesh.castShadow = false; // 그림자도 비활성화
  characterMesh.visible = false; // 완전히 숨김
  scene.add(characterMesh);

  // Ammo 캐릭터 생성
  const shape = new Ammo.btCapsuleShape(radius, height);
  const ghostObject = new Ammo.btPairCachingGhostObject();

  const transform = new Ammo.btTransform();
  transform.setIdentity();
  transform.setOrigin(new Ammo.btVector3(adjustedStartPosition.x, adjustedStartPosition.y, adjustedStartPosition.z));

  ghostObject.setWorldTransform(transform);
  ghostObject.setCollisionShape(shape);
  ghostObject.setCollisionFlags(16); // CF_CHARACTER_OBJECT

  // 간단한 강제 지면 접촉 시스템으로 대체
  console.log("간단한 물리 시스템으로 캐릭터 생성...");

  // ghostObject를 물리 월드에 추가 - 충돌 그룹과 마스크 설정
  const collisionGroup = 2; // 캐릭터 그룹
  const collisionMask = 1 | 2; // 지면(1)과 캐릭터(2) 모두와 충돌
  physicsWorld.addCollisionObject(ghostObject, collisionGroup, collisionMask);

  // btKinematicCharacterController 대신 수동 중력 및 충돌 감지 사용
  const characterController = {
    ghostObject: ghostObject,
    shape: shape,
    gravity: 9.8,
    isOnGround: true, // 생성 시 지면에 있음
    velocity: new Ammo.btVector3(0, 0, 0),
    lastGroundHeight: detectedGroundHeight, // 실제 감지된 지면 높이로 초기화
    heightChangeThreshold: 15, // 허용되는 최대 높이 변화 (더 민감하게)

    // TPS 게임 스타일 지형 추적 시스템 - 향상된 버전
    updatePosition: function (deltaTime: number) {
      const transform = this.ghostObject.getWorldTransform();
      const origin = transform.getOrigin();
      const currentPos = new THREE.Vector3(origin.x(), origin.y(), origin.z());

      // 현재 위치에서 지형 분석
      const physicsWorld = (window as any).globalPhysicsWorld;
      if (!physicsWorld) {
        console.warn("물리 월드가 없음");
        return;
      }

      // 주변 지형 분석 (TPS 게임 스타일)
      const terrainAnalysis = analyzeTerrainAroundCharacter(physicsWorld, currentPos.x, currentPos.z, 3);
      const targetGroundHeight = terrainAnalysis.currentHeight;

      // 지형 높이 스무딩 - 급격한 변화 방지
      const heightDiff = Math.abs(targetGroundHeight - this.lastGroundHeight);
      let smoothedGroundHeight = targetGroundHeight;

      if (heightDiff > this.heightChangeThreshold) {
        // 급격한 높이 변화 시 점진적 적용
        const smoothingFactor = 0.3; // 부드러운 전환
        if (targetGroundHeight > this.lastGroundHeight) {
          smoothedGroundHeight = this.lastGroundHeight + heightDiff * smoothingFactor;
        } else {
          smoothedGroundHeight = this.lastGroundHeight - heightDiff * smoothingFactor;
        }

        if (Math.random() < 0.05) {
          console.log(
            `🏔️ 지형 높이 스무딩: ${targetGroundHeight.toFixed(1)} → ${smoothedGroundHeight.toFixed(1)} (경사: ${terrainAnalysis.slope.toFixed(1)})`
          );
        }
      }

      // 스무딩된 높이 저장
      this.lastGroundHeight = smoothedGroundHeight;

      // 지면 접촉 및 중력 처리
      const groundCheckDistance = 2.0; // 지면 감지 거리
      const isCloseToGround = currentPos.y <= smoothedGroundHeight + groundCheckDistance;

      if (isCloseToGround) {
        // 지면에 접촉 상태
        this.isOnGround = true;

        // 캐릭터를 지형에 정확히 맞춤 (TPS 게임 스타일)
        const newTransform = new Ammo.btTransform();
        newTransform.setIdentity();
        newTransform.setOrigin(new Ammo.btVector3(currentPos.x, smoothedGroundHeight, currentPos.z));
        this.ghostObject.setWorldTransform(newTransform);

        // 지형 정보 로깅 (낮은 빈도)
        if (Math.random() < 0.02) {
          console.log(
            `⛰️ 지형 추적 중: 높이=${smoothedGroundHeight.toFixed(1)}, 경사=${terrainAnalysis.slope.toFixed(1)}, 이동가능=${terrainAnalysis.canMove}`
          );
        }
      } else {
        // 공중에 있음 - 중력 적용
        this.isOnGround = false;
        const fallSpeed = this.gravity * deltaTime * 10; // 좀 더 빠른 낙하
        const newY = Math.max(currentPos.y - fallSpeed, smoothedGroundHeight);

        const newTransform = new Ammo.btTransform();
        newTransform.setIdentity();
        newTransform.setOrigin(new Ammo.btVector3(currentPos.x, newY, currentPos.z));
        this.ghostObject.setWorldTransform(newTransform);

        // 착지 확인
        if (newY <= smoothedGroundHeight + 0.5) {
          this.isOnGround = true;
          console.log(`🛬 지면 착지: y=${newY.toFixed(1)}`);
        }
      }

      // 가파른 경사에서 미끄러짐 방지
      if (this.isOnGround && terrainAnalysis.slope > 10 && terrainAnalysis.slope < 25) {
        // 경사면에서 안정성 확보
        const stabilizedTransform = new Ammo.btTransform();
        stabilizedTransform.setIdentity();
        stabilizedTransform.setOrigin(new Ammo.btVector3(currentPos.x, smoothedGroundHeight + 0.1, currentPos.z));
        this.ghostObject.setWorldTransform(stabilizedTransform);
      }
    },

    // TPS 게임 스타일 움직임 처리 - 지형 적응형
    setWalkDirection: function (direction: any) {
      const transform = this.ghostObject.getWorldTransform();
      const origin = transform.getOrigin();
      const baseSpeed = 0.2; // 기본 이동 속도

      // 이동하려는 새 위치 계산
      const newX = origin.x() + direction.x() * baseSpeed;
      const newZ = origin.z() + direction.z() * baseSpeed;

      // 새 위치의 지형 분석
      const physicsWorld = (window as any).globalPhysicsWorld;
      if (physicsWorld) {
        const futureTerrainAnalysis = analyzeTerrainAroundCharacter(physicsWorld, newX, newZ, 2);

        // 이동 가능성 검증
        if (!futureTerrainAnalysis.canMove) {
          // 너무 가파른 경사 - 이동 제한
          console.log(`⛔ 이동 제한: 경사 ${futureTerrainAnalysis.slope.toFixed(1)} > 15`);
          return; // 이동하지 않음
        }

        // 경사에 따른 속도 조절
        let adjustedSpeed = baseSpeed;
        if (futureTerrainAnalysis.slope > 5) {
          // 경사가 있으면 속도 감소
          const slopeFactor = Math.max(0.3, 1 - futureTerrainAnalysis.slope / 20);
          adjustedSpeed *= slopeFactor;

          if (Math.random() < 0.02) {
            console.log(`🚶 경사 이동: 속도 ${(slopeFactor * 100).toFixed(0)}% (경사: ${futureTerrainAnalysis.slope.toFixed(1)})`);
          }
        }

        // 조정된 속도로 재계산
        const finalX = origin.x() + direction.x() * adjustedSpeed;
        const finalZ = origin.z() + direction.z() * adjustedSpeed;
        const targetHeight = futureTerrainAnalysis.currentHeight;

        // 지면 위에서만 이동
        const currentY = this.isOnGround ? targetHeight : origin.y();

        const newTransform = new Ammo.btTransform();
        newTransform.setIdentity();
        newTransform.setOrigin(new Ammo.btVector3(finalX, currentY, finalZ));
        this.ghostObject.setWorldTransform(newTransform);

        // 이동 후 지형 높이 업데이트
        this.lastGroundHeight = targetHeight;
      } else {
        // 물리 월드가 없으면 기본 이동
        const newTransform = new Ammo.btTransform();
        newTransform.setIdentity();
        newTransform.setOrigin(new Ammo.btVector3(newX, origin.y(), newZ));
        this.ghostObject.setWorldTransform(newTransform);
      }
    },

    // 점프
    jump: function () {
      if (this.isOnGround) {
        const transform = this.ghostObject.getWorldTransform();
        const origin = transform.getOrigin();
        const jumpHeight = 4; // 점프 높이를 줄임 (8 -> 4)
        const newTransform = new Ammo.btTransform();
        newTransform.setIdentity();
        newTransform.setOrigin(new Ammo.btVector3(origin.x(), origin.y() + jumpHeight, origin.z()));
        this.ghostObject.setWorldTransform(newTransform);
        this.isOnGround = false;
        console.log(`점프 실행! 높이: ${jumpHeight}`);
      } else {
        console.log("지면에 있지 않아 점프 불가");
      }
    },

    // 지면 접촉 상태
    onGround: function () {
      return this.isOnGround;
    },

    canJump: function () {
      return this.isOnGround;
    },
  };

  // 캐릭터의 추가 물리 설정 (충돌 감지 강화)
  ghostObject.setFriction(0.8);
  ghostObject.setRestitution(0.0);

  console.log(`캐릭터 생성 완료: (${adjustedStartPosition.x}, ${adjustedStartPosition.y}, ${adjustedStartPosition.z})`);

  // 즉시 지면 접촉 상태로 설정
  characterController.isOnGround = true;
  console.log("캐릭터 지면 접촉 상태로 초기화 완료");

  return {
    mesh: characterMesh,
    ghostObject: ghostObject,
    controller: characterController,
  };
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

  // 점프 처리
  if (keys["Space"]) {
    character.controller.jump();
    console.log("점프!");
  }

  // 업데이트 후 위치 가져오기
  const newTransform = character.ghostObject.getWorldTransform();
  const newOrigin = newTransform.getOrigin();
  const newPos = new THREE.Vector3(newOrigin.x(), newOrigin.y(), newOrigin.z());

  // Y값 변화 모니터링 및 충돌 상태 디버깅
  const yDiff = Math.abs(newPos.y - prevPos.y);

  // 충돌 감지 상태 확인 (새로운 시스템)
  const isOnGround = character.controller.onGround();
  const canJump = character.controller.canJump();

  // 개선된 디버깅 정보 출력 - TPS 게임 스타일 시스템
  const detailedMode = (window as any).detailedDebugMode;
  const shouldDebug = detailedMode || (!isOnGround ? Math.random() < 0.15 : Math.random() < 0.03);

  if (shouldDebug) {
    console.log(`=== 🎮 TPS 지형 추적 상태 ===`);
    console.log(`📍 위치: (${newPos.x.toFixed(1)}, ${newPos.y.toFixed(1)}, ${newPos.z.toFixed(1)})`);
    console.log(`📊 Y변화: ${yDiff.toFixed(3)}`);
    console.log(`🏃 지면 접촉: ${isOnGround ? "✅ YES" : "❌ NO"}`);
    console.log(`🦘 점프 가능: ${canJump ? "✅ YES" : "❌ NO"}`);
    console.log(`🎯 움직임: ${isMoving ? "🚶 이동중" : "🧍 정지"}, 스페이스: ${keys["Space"] ? "🦘 점프" : "⭕ 미입력"}`);

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
    else if (yDiff > 3.0 && !keys["Space"]) {
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

export function updatePhysicsWorld(physicsWorld: any, deltaTime: number): void {
  if (!physicsWorld) return;

  // deltaTime 클램핑 (안정성 향상)
  const clampedDeltaTime = Math.min(Math.max(deltaTime, 1 / 120), 1 / 30); // 30fps ~ 120fps 범위로 제한

  // 물리 시뮬레이션 실행 - 더 안정적인 파라미터
  // maxSubSteps를 1로 제한하여 일관된 시뮬레이션 보장
  physicsWorld.stepSimulation(clampedDeltaTime, 1, 1 / 60);
}
