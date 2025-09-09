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

import { CharacterManager } from "./character";
import { CharacterStorage } from "./characterStorage";
import { joinButtonManager } from "../ui/modules/joinButton";
import { getCharacterSettings, createScaleFromSettings, getRandomStartPosition } from "../data/characterInfo";
import { initializeAmmo, initPhysicsWorld } from "./physicsEngine";

import { TerrainRaycaster } from "./terrainRaycaster";
import {
  TerrainAdaptiveCharacterController,
  SmoothCharacterController,
  setBoundaryMargin,
  getBoundaryMargin,
  increaseBoundaryMargin,
  decreaseBoundaryMargin,
  setBoundaryMarginX,
  setBoundaryMarginZ,
  setCircularBoundary,
  setCircularBoundaryMargin,
  getCircularBoundarySettings,
} from "./smoothCharacterController";

import { initializeTheme, startAutoThemeUpdater } from "../ui/theme";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";

// THREE.js를 전역에서 사용할 수 있도록 노출
(window as any).THREE = THREE;

// GLTFLoader를 전역에서 사용할 수 있도록 노출
(window as any).gltfLoader = new GLTFLoader();

// GLTFLoader 캐시 정리 함수
(window as any).clearGLTFCache = function (): void {
  console.log("GLTFLoader 캐시 정리 시작");

  // 기존 GLTFLoader 인스턴스 참조 제거
  (window as any).gltfLoader = null;

  // THREE.js Cache 정리 (브라우저 레벨 캐시)
  try {
    if (THREE.Cache && THREE.Cache.clear) {
      THREE.Cache.clear();
      console.log("THREE.js Cache 정리 완료");
    }
  } catch (e) {
    console.warn("THREE.js Cache 정리 중 오류:", e);
  }

  // 새로운 GLTFLoader 인스턴스 생성
  (window as any).gltfLoader = new GLTFLoader();

  // 다음 로딩 시 캐시 버스팅 활성화
  (window as any).clearCacheEnabled = true;

  // 브라우저 메모리 가비지 컬렉션 요청 (가능한 경우)
  if ((window as any).gc) {
    try {
      (window as any).gc();
      console.log("가비지 컬렉션 실행 완료");
    } catch (e) {
      console.log("가비지 컬렉션 실행 불가");
    }
  }

  console.log("GLTFLoader 캐시 정리 완료 - 새로운 인스턴스 생성됨");
};

// Fox 모델 눈 색상 문제를 해결하기 위한 캐시 정리 함수
(window as any).refreshCharacterModels = function (): void {
  console.log("캐릭터 모델 새로고침 시작 - Fox 눈 색상 수정 적용");

  // GLB 캐시와 GLTF 캐시 모두 정리
  if ((window as any).clearGLBCache) {
    (window as any).clearGLBCache();
  }
  if ((window as any).clearGLTFCache) {
    (window as any).clearGLTFCache();
  }

  console.log("캐릭터 모델 새로고침 완료 - 다음 로딩 시 수정된 로직 적용됨");
};

// GLB 캐시 관리 함수들 전역 노출
(window as any).getGLBCacheStats = function (): { size: number; keys: string[] } {
  if ((window as any).glbCache) {
    return (window as any).glbCache.getStats();
  }
  return { size: 0, keys: [] };
};

(window as any).clearGLBCache = function (): void {
  if ((window as any).glbCache) {
    (window as any).glbCache.clear();
    console.log("GLB 캐시가 정리되었습니다.");
  } else {
    console.log("GLB 캐시가 없습니다.");
  }
};

(window as any).logCacheStatus = function (): void {
  const stats = (window as any).getGLBCacheStats();
  console.log("=== GLB 캐시 상태 ===");
  console.log(`캐시된 모델 수: ${stats.size}`);
  console.log("캐시된 모델 목록:", stats.keys);

  // Socket.IO 연결 상태도 함께 출력
  if ((window as any).chatSystem && (window as any).chatSystem.socket) {
    const socket = (window as any).chatSystem.socket;
    console.log("=== Socket.IO 연결 상태 ===");
    console.log(`연결 상태: ${socket.connected ? "연결됨" : "연결 안됨"}`);
    console.log(`Socket ID: ${socket.id || "없음"}`);
  }
};

// 씬의 모든 재질 상태 확인 함수
(window as any).checkSceneMaterials = function (): void {
  if (!globalScene) {
    console.log("씬이 초기화되지 않았습니다.");
    return;
  }

  console.log("=== 씬 재질 상태 검사 ===");
  let totalMeshes = 0;
  let blackMaterials = 0;
  let missingTextures = 0;

  globalScene.traverse((child: any) => {
    if (child instanceof THREE.Mesh) {
      totalMeshes++;

      if (child.material) {
        const materials = Array.isArray(child.material) ? child.material : [child.material];
        materials.forEach((mat: any) => {
          if (mat.color && mat.color.getHex() === 0x000000) {
            blackMaterials++;
            console.warn(`검은색 재질 발견:`, child.name || "이름없음", mat);
          }

          if (mat.map && (!mat.map.image || mat.map.image.width === 0)) {
            missingTextures++;
            console.warn(`텍스처 데이터 없음:`, child.name || "이름없음", mat.map);
          }
        });
      }
    }
  });

  console.log(`총 메시 수: ${totalMeshes}`);
  console.log(`검은색 재질 수: ${blackMaterials}`);
  console.log(`텍스처 누락 수: ${missingTextures}`);
};

// 재질 복원 함수
(window as any).restoreSceneMaterials = function (): void {
  if (!globalScene) {
    console.log("씬이 초기화되지 않았습니다.");
    return;
  }

  console.log("=== 씬 재질 복원 시작 ===");
  let restoredCount = 0;

  globalScene.traverse((child: any) => {
    if (child instanceof THREE.Mesh && child.material) {
      const materials = Array.isArray(child.material) ? child.material : [child.material];
      materials.forEach((mat: any) => {
        if (mat) {
          mat.needsUpdate = true;

          if (mat.color && mat.color.getHex() === 0x000000) {
            mat.color.setHex(0xffffff);
            restoredCount++;
          }

          // 텍스처가 있고 이미지 데이터가 유효한 경우에만 업데이트
          const textureProperties = ["map", "normalMap", "roughnessMap", "metalnessMap", "aoMap", "emissiveMap"];
          textureProperties.forEach((prop) => {
            const texture = mat[prop];
            if (texture && texture instanceof THREE.Texture && texture.image && texture.image !== null) {
              texture.needsUpdate = true;
            }
          });
        }
      });
    }
  });

  console.log(`복원된 재질 수: ${restoredCount}`);
};

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

  // 부드러운 캐릭터 컨트롤러 정리
  if (smoothCharacterController) {
    smoothCharacterController.destroy();
    smoothCharacterController = null;
  }

  // 지형 레이캐스터 정리
  if (terrainRaycaster) {
    terrainRaycaster = null;
  }

  // 캐릭터 매니저 정리
  if (globalCharacterManager) {
    const characters = globalCharacterManager.getAllCharacters();
    characters.forEach((char) => {
      globalCharacterManager?.removeCharacter(char.id);
    });
  }

  // 씬 정리
  if (globalScene) {
    // 씬의 모든 객체를 순회하며 텍스처와 재질 정리
    const disposeNode = (node: THREE.Object3D) => {
      if (node instanceof THREE.Mesh) {
        if (node.geometry) {
          node.geometry.dispose();
        }

        if (node.material) {
          const materials = Array.isArray(node.material) ? node.material : [node.material];
          materials.forEach((material) => {
            // 모든 텍스처 맵 정리
            const textureProperties = [
              "map",
              "normalMap",
              "bumpMap",
              "roughnessMap",
              "metalnessMap",
              "aoMap",
              "emissiveMap",
              "specularMap",
              "envMap",
              "lightMap",
              "alphaMap",
              "displacementMap",
            ];

            textureProperties.forEach((prop) => {
              const texture = material[prop];
              if (texture && texture instanceof THREE.Texture) {
                try {
                  // GPU에서 텍스처 정리 (image 속성은 건드리지 않음)
                  texture.dispose();
                } catch (e) {
                  console.warn(`텍스처 정리 중 오류 발생 (${prop}):`, e);
                }
              }
            });

            try {
              // 재질의 프로그램 참조 제거
              if (material.program) material.program = null;
              material.dispose();
            } catch (e) {
              console.warn("재질 정리 중 오류 발생:", e);
            }
          });
        }
      }
    };

    // 씬의 모든 객체를 순회하며 정리
    globalScene.traverse(disposeNode);

    // 씬의 모든 객체 제거
    while (globalScene.children.length > 0) {
      globalScene.remove(globalScene.children[0]);
    }
  }

  // 렌더러 정리
  if (globalRenderer) {
    try {
      // 렌더러의 캔버스 컨텍스트 정리
      const gl = globalRenderer.getContext();

      // 렌더러 정리
      globalRenderer.dispose();
      globalRenderer.forceContextLoss();

      // 캔버스 요소가 문서에 있는 경우에만 제거하고 새로운 캔버스 생성
      if (globalRenderer.domElement && globalRenderer.domElement.parentNode) {
        const sceneContainer = globalRenderer.domElement.parentNode;
        globalRenderer.domElement.remove();

        // 새로운 캔버스 요소 생성
        const newCanvas = document.createElement("canvas");
        newCanvas.id = "scene";
        sceneContainer.appendChild(newCanvas);
      }

      // 렌더러 참조 제거
      globalRenderer.setAnimationLoop(null);
      globalRenderer = null;

      // WebGL 컨텍스트 정리 시도 (선택적)
      try {
        const extension = gl.getExtension("WEBGL_lose_context");
        if (extension) {
          extension.loseContext();
        }
      } catch (glError) {
        console.log("WebGL 컨텍스트 정리 건너뜀");
      }
    } catch (e) {
      console.warn("렌더러 정리 중 오류 발생:", e);
    }
  }

  // 씬 참조 제거
  globalScene = null;

  // GLTFLoader 캐시 정리
  if ((window as any).clearGLTFCache) {
    (window as any).clearGLTFCache();
  }

  console.log("캔버스 정리 완료");
};

(window as any).initCanvas = async function (): Promise<void> {
  console.log("캔버스 초기화 확인 중...");

  // 이미 초기화되어 있는지 확인
  if (globalScene && globalRenderer && globalCharacterManager) {
    console.log("캔버스가 이미 초기화되어 있습니다. 중복 초기화 방지");

    // 캔버스 로딩 완료 이벤트 발생 (UI 업데이트를 위해)
    const canvasLoadedEvent = new CustomEvent("canvasLoadingComplete");
    document.dispatchEvent(canvasLoadedEvent);

    return;
  }

  console.log("새로운 캔버스 초기화 시작");

  // 캐시 버스팅 비활성화 (정상적인 캐싱을 위해)
  (window as any).clearCacheEnabled = false;

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

  // 키보드 이벤트 리스너 추가
  window.addEventListener("keydown", (e: KeyboardEvent) => {
    // 채팅 입력 필드가 활성화되어 있는지 확인
    const activeElement = document.activeElement;
    const isChatInputActive = activeElement?.tagName === "INPUT" || activeElement?.tagName === "TEXTAREA";

    // 채팅 입력 필드가 활성화되어 있으면 캐릭터 조작 키는 무시
    if (isChatInputActive) {
      // 캐릭터 조작에 사용되는 키들을 명시적으로 차단
      const blockedKeys = ["KeyW", "KeyA", "KeyS", "KeyD", "ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight"];
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

  // 전역 변수들을 window 객체에 노출
  (window as any).globalCharacterManager = globalCharacterManager;
  (window as any).globalScene = globalScene;
  (window as any).globalRenderer = globalRenderer;
  (window as any).globalCamera = camera;
  (window as any).globalPhysicsWorld = globalPhysicsWorld; // 물리 월드도 전역에 노출
  // 레거시 함수들을 새로운 시스템으로 래핑 (호환성 유지)
  (window as any).findGroundHeight = (x: number, z: number) => {
    return terrainRaycaster ? terrainRaycaster.getTerrainHeight(x, z) : 150;
  };
  (window as any).analyzeTerrainAroundCharacter = (x: number, z: number, range: number = 5) => {
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

  // 경계 마진 조정 함수들 전역 노출
  (window as any).setBoundaryMargin = setBoundaryMargin;
  (window as any).getBoundaryMargin = getBoundaryMargin;
  (window as any).increaseBoundaryMargin = increaseBoundaryMargin;
  (window as any).decreaseBoundaryMargin = decreaseBoundaryMargin;
  (window as any).setBoundaryMarginX = setBoundaryMarginX;
  (window as any).setBoundaryMarginZ = setBoundaryMarginZ;

  // 원형 경계 제어 함수들 전역 노출
  (window as any).setCircularBoundary = setCircularBoundary;
  (window as any).setCircularBoundaryMargin = setCircularBoundaryMargin;
  (window as any).getCircularBoundarySettings = getCircularBoundarySettings;

  (window as any).logSceneBounds = () => {
    globalCharacterManager?.logSceneBounds();
  };

  (window as any).visualizeBounds = () => {
    globalCharacterManager?.visualizeBounds();
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

    // 공통 시작 위치 결정 (smoothCharacterController와 캐릭터 모델이 동일한 위치에서 시작)
    const selectedPosition = getRandomStartPosition();
    let controllerStartPosition: THREE.Vector3 | null = null;

    // 새로운 부드러운 캐릭터 컨트롤러 생성
    if (terrainRaycaster && globalScene) {
      const initialHeight = terrainRaycaster.getTerrainHeight(selectedPosition.x, selectedPosition.z);
      controllerStartPosition = new THREE.Vector3(selectedPosition.x, initialHeight + 2, selectedPosition.z);

      smoothCharacterController = new TerrainAdaptiveCharacterController(globalScene, terrainRaycaster, controllerStartPosition);

      console.log(
        `새로운 부드러운 캐릭터 컨트롤러 생성 완료 - 시작 위치: (${selectedPosition.x.toFixed(2)}, ${selectedPosition.z.toFixed(
          2
        )}), 지형 높이: ${initialHeight.toFixed(2)}`
      );
    }

    // 선택된 캐릭터 로드 (시각적 모델용) - smoothCharacterController와 동일한 위치에서 시작
    const characterInfo = CharacterStorage.getCurrentCharacter();
    if (characterInfo && controllerStartPosition) {
      const characterSettings = getCharacterSettings(characterInfo.id);

      // smoothCharacterController와 동일한 위치 사용
      const position = controllerStartPosition.clone();
      position.y += 3; // 컨트롤러보다 약간 위에 배치하여 시각적으로 보이도록

      console.log(`캐릭터 위치 설정 (컨트롤러 동기화) - 위치: (${position.x.toFixed(2)}, ${position.y.toFixed(2)}, ${position.z.toFixed(2)})`);

      const scale = createScaleFromSettings(characterSettings);

      const loadedCharacter = await globalCharacterManager?.loadCharacter(characterInfo.id, characterInfo.modelPath, position, scale);

      if (loadedCharacter) {
        console.log(`사용자 캐릭터 로드 완료: ${characterInfo.name} - 컨트롤러 위치와 동기화됨`);
      }
    }
  });

  // 초기 부드러운 캐릭터 컨트롤러 생성
  let initialControllerStartPosition: THREE.Vector3 | null = null;
  if (terrainRaycaster && globalScene) {
    // 공통 시작 위치 시스템 사용
    const selectedPosition = getRandomStartPosition();
    const initialHeight = terrainRaycaster.getTerrainHeight(selectedPosition.x, selectedPosition.z);
    initialControllerStartPosition = new THREE.Vector3(selectedPosition.x, initialHeight + 2, selectedPosition.z);

    smoothCharacterController = new TerrainAdaptiveCharacterController(globalScene, terrainRaycaster, initialControllerStartPosition);

    console.log(
      `초기 부드러운 캐릭터 컨트롤러 생성 완료 - 시작 위치: (${selectedPosition.x.toFixed(2)}, ${selectedPosition.z.toFixed(
        2
      )}), 지형 높이: ${initialHeight.toFixed(2)}`
    );
  }

  // 초기 캐릭터 로드 (이미 선택된 캐릭터가 있는 경우) - smoothCharacterController와 동일한 위치에서 시작
  const currentCharacter = CharacterStorage.getCurrentCharacter();
  if (currentCharacter && initialControllerStartPosition) {
    console.log(`저장된 캐릭터 발견: ${currentCharacter.name}`);

    const characterSettings = getCharacterSettings(currentCharacter.id);

    // smoothCharacterController와 동일한 위치 사용
    const position = initialControllerStartPosition.clone();
    position.y += 3; // 컨트롤러보다 약간 위에 배치하여 시각적으로 보이도록

    console.log(`저장된 캐릭터 위치 설정 (컨트롤러 동기화) - 위치: (${position.x.toFixed(2)}, ${position.y.toFixed(2)}, ${position.z.toFixed(2)})`);

    const scale = createScaleFromSettings(characterSettings);

    const loadedCharacter = await globalCharacterManager?.loadCharacter(currentCharacter.id, currentCharacter.modelPath, position, scale);

    if (loadedCharacter) {
      console.log(`저장된 캐릭터 로드 완료: ${currentCharacter.name} - 컨트롤러 위치와 동기화됨`);
    }
  }

  const controls = setupOrbitControls(camera, globalRenderer);

  // controls를 전역 변수에 할당
  (window as any).globalControls = controls;

  // camera를 전역 변수에 할당
  (window as any).globalCamera = camera;

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
