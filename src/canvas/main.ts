import * as THREE from "three";
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
import { CharacterManager, CharacterLoader } from "./character";
import { CharacterStorage } from "./characterStorage";
import { joinButtonManager } from "../ui/modules/joinButton";
import { getCharacterSettings, createVector3FromSettings, createScaleFromSettings } from "../data/characterInfo";
import {
  initializeAmmo,
  initPhysicsWorld,
  createTriangleMeshShape,
  createStaticRigidBody,
  createBoxShapeFromGeometry,
  analyzeTerrainAroundCharacter,
} from "./physicsEngine";

import { TerrainRaycaster } from "./terrainRaycaster";
import { TerrainAdaptiveCharacterController, SmoothCharacterController } from "./smoothCharacterController";

import { initializeTheme, startAutoThemeUpdater } from "../ui/theme";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";

// THREE.js를 전역에서 사용할 수 있도록 노출
(window as any).THREE = THREE;

// GLTFLoader를 전역에서 사용할 수 있도록 노출
(window as any).gltfLoader = new GLTFLoader();

// 전역 변수로 캔버스 관련 객체들 저장
let globalScene: THREE.Scene | null = null;
let globalRenderer: THREE.WebGLRenderer | null = null;
let globalCharacterManager: CharacterManager | null = null;
let animationId: number | null = null;

// 물리 엔진 관련 변수
let globalPhysicsWorld: any = null;

// 캐릭터 관련 변수
let keys: { [key: string]: boolean } = {};
let physicsCharacterController: any = null; // 통합된 물리 캐릭터

// 새로운 Raycaster 기반 시스템
let terrainRaycaster: TerrainRaycaster | null = null;
let smoothCharacterController: SmoothCharacterController | null = null;

// 캔버스 정리 함수
(window as any).cleanupScene = function (): void {
  console.log("캔버스 정리 시작");

  // 애니메이션 루프 중지
  if (animationId !== null) {
    cancelAnimationFrame(animationId);
    animationId = null;
  }

  // 캐릭터 매니저 정리
  if (globalCharacterManager) {
    const characters = globalCharacterManager.getAllCharacters();
    characters.forEach((char) => {
      globalCharacterManager?.removeCharacter(char.id);
    });
  }

  // 렌더러 정리
  if (globalRenderer) {
    globalRenderer.dispose();
    globalRenderer = null;
  }

  // 씬 정리
  if (globalScene) {
    // 씬의 모든 객체 제거
    while (globalScene.children.length > 0) {
      globalScene.remove(globalScene.children[0]);
    }
    globalScene = null;
  }

  console.log("캔버스 정리 완료");
};

// 물리 바디를 씬에 추가하는 함수 (현재 사용하지 않음 - 호환성을 위해 유지)
// eslint-disable-next-line @typescript-eslint/no-unused-vars
function addPhysicsBodiesToScene(scene: THREE.Scene, physicsWorld: any): void {
  let addedCount = 0;

  // 모든 메시를 순회하면서 지면이 될 수 있는 메시들을 찾음
  scene.traverse((child: THREE.Object3D) => {
    if ((child as THREE.Mesh).isMesh) {
      const mesh = child as THREE.Mesh;

      // forest 모델의 모든 지면 메시를 감지하도록 개선
      let isGroundMesh = false;

      // 먼저 이름으로 판단 (더 넓은 패턴)
      if (
        mesh.name.toLowerCase().includes("ground") ||
        mesh.name.toLowerCase().includes("floor") ||
        mesh.name.toLowerCase().includes("terrain") ||
        mesh.name.toLowerCase().includes("base") ||
        mesh.name.toLowerCase().includes("forest") ||
        mesh.name.toLowerCase().includes("land") ||
        mesh.name.toLowerCase().includes("plane") ||
        mesh.name.toLowerCase().includes("island") ||
        mesh.name.toLowerCase().includes("mesh")
      ) {
        isGroundMesh = true;
      }

      // forest 모델 근처의 모든 메시를 지면으로 간주 (더 넓은 범위와 더 정확한 탐지)
      const forestCenter = new THREE.Vector3(70, 0, 100);
      const meshWorldPosition = new THREE.Vector3();
      mesh.getWorldPosition(meshWorldPosition);

      if (meshWorldPosition.distanceTo(forestCenter) < 300) {
        // 바운딩 박스 계산
        if (!mesh.geometry.boundingBox) {
          mesh.geometry.computeBoundingBox();
        }

        if (mesh.geometry.boundingBox) {
          const size = new THREE.Vector3();
          mesh.geometry.boundingBox.getSize(size);

          // 지면 특성을 가진 메시 탐지 (더 정교한 조건)
          const hasGroundLikeSize = size.x > 0.5 && size.z > 0.5; // 최소 크기
          const isReasonableHeight = meshWorldPosition.y < 50 && meshWorldPosition.y > -20; // 적정 높이
          const hasGroundRatio = (size.x * size.z) / size.y > 2; // 가로세로가 높이보다 훨씬 큰 경우

          if (hasGroundLikeSize && isReasonableHeight && hasGroundRatio) {
            isGroundMesh = true;
            console.log(
              `지형 메시 발견 (거리 기반): ${mesh.name}, 위치: ${meshWorldPosition.x.toFixed(1)}, ${meshWorldPosition.y.toFixed(
                1
              )}, ${meshWorldPosition.z.toFixed(1)}, 크기: ${size.x.toFixed(1)}x${size.y.toFixed(1)}x${size.z.toFixed(1)}`
            );
          }
        }
      }

      if (isGroundMesh && mesh.geometry) {
        console.log(
          `지면 메시 발견: ${mesh.name || "unnamed"} (위치: ${mesh.position.x.toFixed(2)}, ${mesh.position.y.toFixed(2)}, ${mesh.position.z.toFixed(
            2
          )})`
        );

        // geometry 정보 확인
        mesh.geometry.computeBoundingBox();
        const size = new THREE.Vector3();
        if (mesh.geometry.boundingBox) {
          mesh.geometry.boundingBox.getSize(size);
          console.log(`  크기: ${size.x.toFixed(2)} x ${size.y.toFixed(2)} x ${size.z.toFixed(2)}`);
        }

        // 물리 바디 생성 - 박스 모양 우선 사용 (안정성 향상)
        const boxShape = createBoxShapeFromGeometry(mesh.geometry);
        if (boxShape) {
          createStaticRigidBody(mesh, boxShape, physicsWorld);
          console.log(`  박스 물리 바디 추가 성공`);
          addedCount++;
        } else {
          // 박스 실패 시에만 Triangle mesh 시도
          const shape = createTriangleMeshShape(mesh.geometry);
          if (shape) {
            createStaticRigidBody(mesh, shape, physicsWorld);
            console.log(`  트라이앵글 메시 물리 바디 추가 성공`);
            addedCount++;
          }
        }
      }
    }
  });

  console.log(`총 ${addedCount}개의 지면 물리 바디가 추가되었습니다.`);

  // 항상 기본 지면 생성 (안전장치)
  console.log("=== 기본 지면 생성 시작 ===");
  createManualGroundPhysics(physicsWorld);
  createLargerGroundPhysics(physicsWorld);

  // 물리 월드 상태 확인
  if (physicsWorld) {
    console.log("=== 물리 월드 상태 확인 ===");
    try {
      // 중력 확인
      const gravity = physicsWorld.getGravity();
      if (gravity) {
        console.log(`중력 설정: (${gravity.x()}, ${gravity.y()}, ${gravity.z()})`);
      } else {
        console.log("중력 설정: 확인 불가");
      }
      console.log("물리 월드 초기화 완료");
    } catch (error) {
      console.warn("물리 월드 상태 확인 중 오류:", error);
    }
    console.log("=========================");
  }
}

// 수동 지면 물리 바디 생성 함수
// 수동 지면 물리 바디 생성 함수 (개선된 버전)
function createManualGroundPhysics(physicsWorld: any): void {
  const Ammo = window.Ammo;
  if (!Ammo) return;

  // 주요 지면들을 개별적으로 생성 - 150 높이로 조정
  const groundConfigs = [
    // forest 위치에 150 높이 지면 생성 - 여러 높이에 배치
    { x: 70, y: 150, z: 100, sizeX: 500, sizeY: 40, sizeZ: 500, name: "Forest 지면 (메인)" },
    { x: 70, y: 130, z: 100, sizeX: 600, sizeY: 40, sizeZ: 600, name: "Forest 지면 (하층)" },
    { x: 70, y: 110, z: 100, sizeX: 700, sizeY: 40, sizeZ: 700, name: "Forest 지면 (깊은층)" },

    // 추가 안전망 지면들 (기존 높이 유지)
    { x: 0, y: -10, z: 0, sizeX: 400, sizeY: 30, sizeZ: 400, name: "중앙 안전망" },
    { x: 150, y: -5, z: 200, sizeX: 300, sizeY: 30, sizeZ: 300, name: "동쪽 안전망" },
    { x: -100, y: -5, z: 50, sizeX: 300, sizeY: 30, sizeZ: 300, name: "서쪽 안전망" },

    // 대형 기본 지면 (최후의 안전망)
    { x: 0, y: -60, z: 0, sizeX: 1500, sizeY: 30, sizeZ: 1500, name: "기본 안전망" },
  ];

  groundConfigs.forEach((config) => {
    const halfExtents = new Ammo.btVector3(config.sizeX, config.sizeY, config.sizeZ);
    const groundShape = new Ammo.btBoxShape(halfExtents);

    const transform = new Ammo.btTransform();
    transform.setIdentity();
    transform.setOrigin(new Ammo.btVector3(config.x, config.y, config.z));

    const motionState = new Ammo.btDefaultMotionState(transform);
    const rbInfo = new Ammo.btRigidBodyConstructionInfo(0, motionState, groundShape, new Ammo.btVector3(0, 0, 0));
    const groundBody = new Ammo.btRigidBody(rbInfo);

    // 마찰력 강화
    groundBody.setFriction(3.0);
    groundBody.setRestitution(0.05);

    // 충돌 그룹: 기본 그룹으로 설정하여 확실한 충돌 보장
    physicsWorld.addRigidBody(groundBody);
    console.log(`${config.name} 생성 완료 - 위치: (${config.x}, ${config.y}, ${config.z}), 크기: ${config.sizeX}x${config.sizeY}x${config.sizeZ}`);
  });
}

// low_poly_game_forest.glb의 모든 메시에 대해 물리 바디 생성
function createLargerGroundPhysics(physicsWorld: any): void {
  const Ammo = window.Ammo;
  if (!Ammo) return;

  const positions = [
    { x: 0, y: -5, z: 0 }, // 중앙 (y 위치 조정)
    { x: 70, y: 140, z: 100 }, // forest 위치 - 220 높이로 조정
    { x: -100, y: -5, z: 0 }, // 서쪽
    { x: 200, y: -5, z: 0 }, // 동쪽
    { x: 0, y: -5, z: -100 }, // 북쪽
    { x: 0, y: -5, z: 200 }, // 남쪽
  ];

  positions.forEach((pos, index) => {
    const halfExtents = new Ammo.btVector3(150, 10, 150); // 높이 증가
    const groundShape = new Ammo.btBoxShape(halfExtents);

    const transform = new Ammo.btTransform();
    transform.setIdentity();
    transform.setOrigin(new Ammo.btVector3(pos.x, pos.y, pos.z));

    const motionState = new Ammo.btDefaultMotionState(transform);
    const rbInfo = new Ammo.btRigidBodyConstructionInfo(0, motionState, groundShape, new Ammo.btVector3(0, 0, 0));
    const groundBody = new Ammo.btRigidBody(rbInfo);

    // 마찰력 추가
    groundBody.setFriction(2.0);
    groundBody.setRestitution(0.1);

    // 충돌 그룹: 지면 그룹으로 설정하여 캐릭터와 확실한 충돌 보장
    const groundCollisionGroup = 1; // 지면 그룹
    const groundCollisionMask = 1 | 2; // 지면(1)과 캐릭터(2) 모두와 충돌
    physicsWorld.addRigidBody(groundBody, groundCollisionGroup, groundCollisionMask);
    console.log(`대형 지면 ${index + 1} 생성: (${pos.x}, ${pos.y}, ${pos.z})`);
  });
}

(window as any).initCanvas = async function (): Promise<void> {
  // Ammo.js 초기화 (선택적)
  try {
    await initializeAmmo();
    console.log("Ammo.js 초기화 성공");

    // 물리 엔진 초기화
    globalPhysicsWorld = initPhysicsWorld();
    if (globalPhysicsWorld) {
      console.log("물리 엔진 초기화 성공");
    }
  } catch (error) {
    console.warn("Ammo.js 초기화 실패:", error);
    return; // 물리 엔진 없이는 진행하지 않음
  }

  globalScene = createScene();
  const camera = createCamera();
  globalRenderer = createRenderer();

  setupLighting(globalScene);
  createCircularGradientGround(globalScene);

  await loadMultipleModels(globalScene);

  console.log("모델 로드 완료, 지형 시스템 초기화 시작...");

  // *** 새로운 Raycaster 기반 지형 시스템 초기화 ***
  if (globalScene) {
    console.log("=== Raycaster 기반 지형 시스템 초기화 ===");

    // 지형 라이캐스터 생성
    terrainRaycaster = new TerrainRaycaster(globalScene);

    // 지형 메시 디버깅
    terrainRaycaster.debugTerrainMeshes();

    // 초기 지형 높이 테스트
    const testHeight = terrainRaycaster.getTerrainHeight(70, 100);
    console.log(`초기 지형 높이 테스트: ${testHeight.toFixed(2)}`);

    // 지형 분석 테스트
    const terrainAnalysis = terrainRaycaster.analyzeTerrainAroundPosition(70, 100, 5);
    console.log("지형 분석 테스트:", terrainAnalysis);

    console.log("Raycaster 기반 지형 시스템 초기화 완료");
  }

  // *** 기존 물리 시스템도 유지 (호환성을 위해) ***
  if (globalPhysicsWorld && globalScene) {
    console.log("=== 기존 물리 바디 생성 (호환용) ===");

    // 1. 수동 지면 먼저 생성
    createManualGroundPhysics(globalPhysicsWorld);

    // 2. 물리 시뮬레이션을 여러 번 실행해서 완전히 안정화
    console.log("지면 물리 시뮬레이션 안정화 중...");
    for (let i = 0; i < 10; i++) {
      globalPhysicsWorld.stepSimulation(1 / 60, 1, 1 / 60);
    }

    console.log("기존 물리 바디 생성 완료");
  }

  // 키보드 이벤트 리스너 추가
  window.addEventListener("keydown", (e: KeyboardEvent) => {
    // 채팅 입력 필드가 활성화되어 있는지 확인
    const activeElement = document.activeElement;
    const isChatInputActive = activeElement?.tagName === "INPUT" || activeElement?.tagName === "TEXTAREA";

    // 채팅 입력 필드가 활성화되어 있으면 캐릭터 조작 키는 무시
    if (isChatInputActive) {
      // 캐릭터 조작에 사용되는 키들을 명시적으로 차단
      const blockedKeys = ["KeyW", "KeyA", "KeyS", "KeyD", "ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight", "Space"];
      if (blockedKeys.includes(e.code)) {
        return; // 캐릭터 조작 키 무시
      }
    }

    keys[e.code] = true;
  });
  window.addEventListener("keyup", (e: KeyboardEvent) => {
    keys[e.code] = false;
  });

  // 캐릭터 매니저 초기화
  globalCharacterManager = new CharacterManager(globalScene, globalPhysicsWorld);

  // low_poly_game_forest.glb의 GLTF_SceneRootNode 경계 설정
  // 모델 위치: (70, 0, 100), 스케일: (22, 22, 22)
  // 섬들의 실제 경계에 맞게 더 좁게 조정
  // globalCharacterManager.setSceneBounds(-100, 240, -50, 250);

  // 전역 변수들을 window 객체에 노출
  (window as any).globalCharacterManager = globalCharacterManager;
  (window as any).globalScene = globalScene;
  (window as any).globalRenderer = globalRenderer;
  (window as any).globalCamera = camera;
  (window as any).globalPhysicsWorld = globalPhysicsWorld; // 물리 월드도 전역에 노출
  // 레거시 함수들을 새로운 시스템으로 래핑 (호환성 유지)
  (window as any).findGroundHeight = (physicsWorld: any, x: number, z: number) => {
    return terrainRaycaster ? terrainRaycaster.getTerrainHeight(x, z) : 150;
  };
  (window as any).analyzeTerrainAroundCharacter = (physicsWorld: any, x: number, z: number, range: number = 5) => {
    if (terrainRaycaster) {
      const analysis = terrainRaycaster.analyzeTerrainAroundPosition(x, z, range);
      return {
        currentHeight: analysis.currentHeight,
        averageHeight: analysis.averageHeight,
        slope: analysis.slope,
        canMove: analysis.canMove,
      };
    }
    return { currentHeight: 150, averageHeight: 150, slope: 0, canMove: true };
  };

  // 새로운 시스템 전역 노출
  (window as any).terrainRaycaster = terrainRaycaster;
  (window as any).smoothCharacterController = smoothCharacterController;

  // 디버깅용 전역 함수들
  (window as any).logAllObjects = () => {
    globalCharacterManager?.logAllObjectNames();
  };

  (window as any).testInteraction = () => {
    const character = globalCharacterManager?.getAllCharacters()[0];
    if (character) {
      console.log("상호작용 테스트 시작");
    } else {
      console.log("캐릭터가 없습니다.");
    }
  };

  (window as any).logSceneBounds = () => {
    globalCharacterManager?.logSceneBounds();
  };

  (window as any).visualizeBounds = () => {
    globalCharacterManager?.visualizeBounds();
  };

  // TPS 지형 추적 시스템 테스트 함수들
  (window as any).testTerrainTracking = () => {
    if (globalPhysicsWorld && globalCharacterManager) {
      const characters = globalCharacterManager.getAllCharacters();
      if (characters.length > 0) {
        const char = characters[0];
        const pos = char.model.position;
        console.log("🧪 TPS 지형 추적 테스트 시작:");
        console.log(`📍 캐릭터 위치: (${pos.x.toFixed(1)}, ${pos.y.toFixed(1)}, ${pos.z.toFixed(1)})`);

        const terrainAnalysis = analyzeTerrainAroundCharacter(globalPhysicsWorld, pos.x, pos.z, 5);
        console.log(`🏔️ 지형 분석 결과:`);
        console.log(`  - 현재 높이: ${terrainAnalysis.currentHeight.toFixed(1)}`);
        console.log(`  - 평균 높이: ${terrainAnalysis.averageHeight.toFixed(1)}`);
        console.log(`  - 경사도: ${terrainAnalysis.slope.toFixed(1)}`);
        console.log(`  - 이동 가능: ${terrainAnalysis.canMove ? "✅" : "❌"}`);
      } else {
        console.log("❌ 테스트할 캐릭터가 없습니다.");
      }
    } else {
      console.log("❌ 물리 월드 또는 캐릭터 매니저가 없습니다.");
    }
  };

  (window as any).enableDetailedDebug = () => {
    console.log("🔍 상세 디버깅 모드 활성화됨 - 5초간 모든 정보 출력");
    (window as any).detailedDebugMode = true;
    setTimeout(() => {
      (window as any).detailedDebugMode = false;
      console.log("🔍 상세 디버깅 모드 비활성화됨");
    }, 5000);
  };

  // 새로운 지형 시스템 디버깅 함수들
  (window as any).debugTerrain = () => {
    if (terrainRaycaster) {
      terrainRaycaster.debugTerrainMeshes();
    } else {
      console.log("지형 레이캐스터가 초기화되지 않았습니다.");
    }
  };

  (window as any).testRaycast = (x = 70, z = 100) => {
    if (terrainRaycaster) {
      terrainRaycaster.testRaycastAtPosition(x, z);
      const height = terrainRaycaster.getTerrainHeight(x, z);
      console.log(`위치 (${x}, ${z})에서 지형 높이: ${height.toFixed(2)}`);
    } else {
      console.log("지형 레이캐스터가 초기화되지 않았습니다.");
    }
  };

  (window as any).analyzePosition = (x = 70, z = 100, radius = 5) => {
    if (terrainRaycaster) {
      const analysis = terrainRaycaster.analyzeTerrainAroundPosition(x, z, radius);
      console.log("지형 분석 결과:", analysis);
    } else {
      console.log("지형 레이캐스터가 초기화되지 않았습니다.");
    }
  };

  (window as any).getCharacterInfo = () => {
    if (smoothCharacterController) {
      const adaptiveController = smoothCharacterController as any;
      const info = adaptiveController.getDebugInfo ? adaptiveController.getDebugInfo() : smoothCharacterController.getPosition();
      console.log("캐릭터 정보:", info);
    } else {
      console.log("부드러운 캐릭터 컨트롤러가 초기화되지 않았습니다.");
    }
  };

  (window as any).testFloatingObjectInteraction = () => {
    if (smoothCharacterController) {
      const adaptiveController = smoothCharacterController as any;
      const info = adaptiveController.getDebugInfo ? adaptiveController.getDebugInfo() : {};
      console.log("=== 공중 오브젝트 상호작용 테스트 ===");
      console.log("공중 오브젝트 근처:", info.isNearFloatingObject);
      console.log("현재 오브젝트:", info.currentFloatingObject);
      console.log("액션 버튼 표시:", info.actionButtonVisible);
      console.log("총 오브젝트 수:", info.floatingObjectsCount);
      console.log("캐릭터 위치:", info.position);
      console.log("================================");
    } else {
      console.log("캐릭터 컨트롤러가 없습니다.");
    }
  };

  (window as any).testFloatingObjectCollision = () => {
    if (smoothCharacterController) {
      const adaptiveController = smoothCharacterController as any;
      const pos = adaptiveController.getPosition();
      console.log("=== 공중 오브젝트 충돌 테스트 ===");
      console.log("캐릭터 위치:", pos);

      // 각 공중 오브젝트와의 거리 계산
      const floatingObjects = [
        { name: "low_poly_floating_island", position: { x: -100, y: 90, z: 330 } },
        { name: "low_poly_trees", position: { x: 320, y: 80, z: 0 } },
        { name: "low_poly_triple_trees", position: { x: -400, y: 60, z: 100 } },
      ];

      floatingObjects.forEach((obj) => {
        const distance = Math.sqrt(Math.pow(pos.x - obj.position.x, 2) + Math.pow(pos.z - obj.position.z, 2));
        console.log(`${obj.name}과의 거리: ${distance.toFixed(2)}`);
      });
      console.log("================================");
    } else {
      console.log("캐릭터 컨트롤러가 없습니다.");
    }
  };

  (window as any).teleportCharacter = (x = 70, y: number | null = null, z = 100) => {
    if (smoothCharacterController) {
      let finalY = y;
      if (finalY === null && terrainRaycaster) {
        finalY = terrainRaycaster.getTerrainHeight(x, z) + 2;
      } else if (finalY === null) {
        finalY = 150;
      }
      smoothCharacterController.setPosition(x, finalY, z);
      console.log(`캐릭터를 (${x}, ${finalY}, ${z})로 이동시켰습니다.`);
    } else {
      console.log("부드러운 캐릭터 컨트롤러가 초기화되지 않았습니다.");
    }
  };

  // 카메라 위치 조정 함수들
  (window as any).setCameraPosition = (x = 70, y = 60, z = 115) => {
    const camera = (window as any).globalCamera;
    if (camera) {
      camera.position.set(x, y, z);
      console.log(`카메라 위치를 (${x}, ${y}, ${z})로 설정했습니다.`);
    }
  };

  (window as any).setCameraTarget = (x = 70, y = 45, z = 100) => {
    const controls = (window as any).globalControls;
    if (controls) {
      controls.target.set(x, y, z);
      console.log(`카메라 타겟을 (${x}, ${y}, ${z})로 설정했습니다.`);
    }
  };

  (window as any).getCameraInfo = () => {
    const camera = (window as any).globalCamera;
    const controls = (window as any).globalControls;
    if (camera && controls) {
      console.log("=== 카메라 정보 ===");
      console.log(`위치: (${camera.position.x.toFixed(2)}, ${camera.position.y.toFixed(2)}, ${camera.position.z.toFixed(2)})`);
      console.log(`타겟: (${controls.target.x.toFixed(2)}, ${controls.target.y.toFixed(2)}, ${controls.target.z.toFixed(2)})`);
      console.log("==================");
    }
  };

  // 캐릭터 중심으로 카메라 리셋
  (window as any).resetCameraToCharacter = () => {
    if (smoothCharacterController) {
      const pos = smoothCharacterController.getPosition();
      const camera = (window as any).globalCamera;
      const controls = (window as any).globalControls;

      if (camera && controls) {
        // 캐릭터 뒤쪽에서 바라보는 위치로 설정
        camera.position.set(pos.x, pos.y + 15, pos.z + 15);
        controls.target.set(pos.x, pos.y, pos.z);
        console.log(`카메라를 캐릭터 중심으로 리셋했습니다: (${pos.x.toFixed(1)}, ${pos.y.toFixed(1)}, ${pos.z.toFixed(1)})`);
      }
    } else {
      console.log("캐릭터 컨트롤러가 없습니다.");
    }
  };

  // 참여 버튼 매니저 설정
  joinButtonManager.setJoinCompleteCallback(async (characterId: string) => {
    console.log(`참여 완료, 새로운 부드러운 캐릭터 컨트롤러 생성: ${characterId}`);

    // 기존 부드러운 캐릭터 컨트롤러 제거
    if (smoothCharacterController) {
      smoothCharacterController.destroy();
      smoothCharacterController = null;
    }

    // 기존 물리 캐릭터 제거 (호환성을 위해 유지)
    if (physicsCharacterController && globalPhysicsWorld) {
      globalPhysicsWorld.removeCollisionObject(physicsCharacterController.ghostObject);
      globalPhysicsWorld.removeAction && globalPhysicsWorld.removeAction(physicsCharacterController.controller);
      globalScene?.remove(physicsCharacterController.mesh);
      physicsCharacterController = null;
    }

    // 기존 캐릭터 매니저의 캐릭터들 제거
    const existingCharacters = globalCharacterManager?.getAllCharacters() || [];
    existingCharacters.forEach((char) => {
      globalCharacterManager?.removeCharacter(char.id);
    });

    // 새로운 부드러운 캐릭터 컨트롤러 생성
    if (terrainRaycaster && globalScene) {
      const initialHeight = terrainRaycaster.getTerrainHeight(70, 100);
      const startPosition = new THREE.Vector3(70, initialHeight + 2, 100);

      smoothCharacterController = new TerrainAdaptiveCharacterController(globalScene, terrainRaycaster, startPosition);

      console.log(`새로운 부드러운 캐릭터 컨트롤러 생성 완료 - 지형 높이: ${initialHeight.toFixed(2)}`);
    }

    // 선택된 캐릭터 로드 (시각적 모델용)
    const characterInfo = CharacterStorage.getCurrentCharacter();
    if (characterInfo) {
      const characterSettings = getCharacterSettings(characterInfo.id);
      const position = createVector3FromSettings(characterSettings);

      // Raycaster 기반 지형 높이 사용
      if (terrainRaycaster) {
        const terrainHeight = terrainRaycaster.getTerrainHeight(position.x, position.z);
        position.y = terrainHeight + 5; // 지형에서 5 단위 위로 설정
        console.log(`캐릭터 위치 조정 (Raycaster) - 지형 높이: ${terrainHeight.toFixed(2)}, 최종 Y: ${position.y.toFixed(2)}`);
      }

      const scale = createScaleFromSettings(characterSettings);

      const loadedCharacter = await globalCharacterManager?.loadCharacter(characterInfo.id, characterInfo.modelPath, position, scale);

      if (loadedCharacter) {
        console.log(`사용자 캐릭터 로드 완료: ${characterInfo.name}`);
      }
    }
  });

  // 초기 부드러운 캐릭터 컨트롤러 생성
  if (terrainRaycaster && globalScene) {
    const initialHeight = terrainRaycaster.getTerrainHeight(70, 100);
    const startPosition = new THREE.Vector3(70, initialHeight + 2, 100);

    smoothCharacterController = new TerrainAdaptiveCharacterController(globalScene, terrainRaycaster, startPosition);

    console.log(`초기 부드러운 캐릭터 컨트롤러 생성 완료 - 지형 높이: ${initialHeight.toFixed(2)}`);
  }

  // 초기 캐릭터 로드 (이미 선택된 캐릭터가 있는 경우)
  const currentCharacter = CharacterStorage.getCurrentCharacter();
  if (currentCharacter) {
    console.log(`저장된 캐릭터 발견: ${currentCharacter.name}`);

    const characterSettings = getCharacterSettings(currentCharacter.id);
    const position = createVector3FromSettings(characterSettings);

    // Raycaster 기반 지형 높이 사용
    if (terrainRaycaster) {
      const terrainHeight = terrainRaycaster.getTerrainHeight(position.x, position.z);
      position.y = terrainHeight + 5; // 지형에서 5 단위 위로 설정
      console.log(`저장된 캐릭터 위치 조정 (Raycaster) - 지형 높이: ${terrainHeight.toFixed(2)}, 최종 Y: ${position.y.toFixed(2)}`);
    }

    const scale = createScaleFromSettings(characterSettings);

    const loadedCharacter = await globalCharacterManager?.loadCharacter(currentCharacter.id, currentCharacter.modelPath, position, scale);

    if (loadedCharacter) {
      console.log(`저장된 캐릭터 로드 완료: ${currentCharacter.name}`);
    }
  } else {
    console.log("저장된 캐릭터가 없습니다. 참여 버튼을 눌러 캐릭터를 선택하세요.");

    // 기본 캐릭터 로드 (테스트용)
    const defaultCharacterType = "cat";
    const defaultModelPath = CharacterLoader.getCharacterModelPath(defaultCharacterType);
    if (defaultModelPath && terrainRaycaster) {
      // 기본 캐릭터의 Raycaster 기반 지형 높이 사용
      const terrainHeight = terrainRaycaster.getTerrainHeight(70, 100);
      const defaultPosition = new THREE.Vector3(70, terrainHeight + 5, 100); // 지형에서 5 단위 위로 설정
      console.log(`기본 캐릭터 위치 조정 (Raycaster) - 지형 높이: ${terrainHeight.toFixed(2)}, 최종 Y: ${defaultPosition.y.toFixed(2)}`);

      const loadedCharacter = await globalCharacterManager?.loadCharacter(
        defaultCharacterType,
        defaultModelPath,
        defaultPosition,
        new THREE.Vector3(1, 1, 1)
      );

      if (loadedCharacter) {
        console.log(`기본 캐릭터 로드 완료: ${defaultCharacterType}`);
      }
    }
  }

  const controls = setupOrbitControls(camera, globalRenderer);

  // controls를 전역 변수에 할당
  (window as any).globalControls = controls;

  setupCameraEventListeners(camera, controls);

  setupResizeHandler(camera, globalRenderer);

  // 캐릭터 업데이트를 포함한 애니메이션 루프 (부드러운 캐릭터 컨트롤러 사용)
  const animate = createAnimationLoop(
    globalScene,
    camera,
    globalRenderer,
    controls,
    globalCharacterManager,
    globalPhysicsWorld,
    keys,
    () => smoothCharacterController // 새로운 부드러운 컨트롤러 사용
  );

  // 입력 매니저 업데이트를 위한 별도 애니메이션 루프
  const inputAnimationLoop = () => {
    requestAnimationFrame(inputAnimationLoop);
  };
  inputAnimationLoop();

  // 애니메이션 ID 저장
  const startAnimation = () => {
    animationId = animate();
  };
  startAnimation();

  const canvasLoadedEvent = new CustomEvent("canvasLoadingComplete");

  document.dispatchEvent(canvasLoadedEvent);
};

document.addEventListener("DOMContentLoaded", () => {
  initializeTheme();
  startAutoThemeUpdater();
});
