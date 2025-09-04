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

      // 공통 시작 위치 시스템 사용
      const selectedPosition = getRandomStartPosition();
      const position = new THREE.Vector3(selectedPosition.x, 0, selectedPosition.z);

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
    // 공통 시작 위치 시스템 사용
    const selectedPosition = getRandomStartPosition();
    const initialHeight = terrainRaycaster.getTerrainHeight(selectedPosition.x, selectedPosition.z);
    const startPosition = new THREE.Vector3(selectedPosition.x, initialHeight + 2, selectedPosition.z);

    smoothCharacterController = new TerrainAdaptiveCharacterController(globalScene, terrainRaycaster, startPosition);

    console.log(
      `초기 부드러운 캐릭터 컨트롤러 생성 완료 - 시작 위치: (${selectedPosition.x.toFixed(2)}, ${selectedPosition.z.toFixed(
        2
      )}), 지형 높이: ${initialHeight.toFixed(2)}`
    );
  }

  // 초기 캐릭터 로드 (이미 선택된 캐릭터가 있는 경우)
  const currentCharacter = CharacterStorage.getCurrentCharacter();
  if (currentCharacter) {
    console.log(`저장된 캐릭터 발견: ${currentCharacter.name}`);

    const characterSettings = getCharacterSettings(currentCharacter.id);

    // 공통 시작 위치 시스템 사용
    const selectedPosition = getRandomStartPosition();
    const position = new THREE.Vector3(selectedPosition.x, 0, selectedPosition.z);

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
