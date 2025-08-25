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
import { InputManager } from "./input";
import { CharacterStorage } from "./characterStorage";
import { joinButtonManager } from "../ui/modules/joinButton";
import { getCharacterSettings, createVector3FromSettings, createScaleFromSettings } from "../data/characterInfo";

import { initializeTheme, startAutoThemeUpdater } from "../ui/theme";

// THREE.js를 전역에서 사용할 수 있도록 노출
(window as any).THREE = THREE;

// 전역 변수로 캔버스 관련 객체들 저장
let globalScene: THREE.Scene | null = null;
let globalRenderer: THREE.WebGLRenderer | null = null;
let globalCharacterManager: CharacterManager | null = null;
let globalInputManager: InputManager | null = null;
let animationId: number | null = null;

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

  // 입력 매니저 정리
  if (globalInputManager) {
    globalInputManager.cleanup();
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
  globalScene = createScene();
  const camera = createCamera();
  globalRenderer = createRenderer();

  setupLighting(globalScene);

  createCircularGradientGround(globalScene);

  await loadMultipleModels(globalScene);

  // 캐릭터 매니저 초기화
  globalCharacterManager = new CharacterManager(globalScene);

  // 입력 매니저 초기화
  globalInputManager = new InputManager(globalCharacterManager);
  globalInputManager.setCamera(camera);

  // 전역 변수들을 window 객체에 노출
  (window as any).globalCharacterManager = globalCharacterManager;
  (window as any).globalInputManager = globalInputManager;
  (window as any).globalScene = globalScene;
  (window as any).globalRenderer = globalRenderer;
  (window as any).globalCamera = camera;

  // 참여 버튼 매니저 설정
  joinButtonManager.setJoinCompleteCallback(async (characterId: string) => {
    console.log(`참여 완료, 캐릭터 로드 시작: ${characterId}`);

    // 기존 캐릭터들 제거
    const existingCharacters = globalCharacterManager?.getAllCharacters() || [];
    existingCharacters.forEach((char) => {
      globalCharacterManager?.removeCharacter(char.id);
    });

    // 선택된 캐릭터 로드
    const characterInfo = CharacterStorage.getCurrentCharacter();
    if (characterInfo) {
      const characterSettings = getCharacterSettings(characterInfo.id);
      const position = createVector3FromSettings(characterSettings);
      const scale = createScaleFromSettings(characterSettings);

      const loadedCharacter = await globalCharacterManager?.loadCharacter(characterInfo.id, characterInfo.modelPath, position, scale);

      if (loadedCharacter) {
        globalInputManager?.setActiveCharacter(loadedCharacter.id);
        console.log(`사용자 캐릭터 로드 완료: ${characterInfo.name}`);
      }
    }
  });

  // 초기 캐릭터 로드 (이미 선택된 캐릭터가 있는 경우)
  const currentCharacter = CharacterStorage.getCurrentCharacter();
  if (currentCharacter) {
    console.log(`저장된 캐릭터 발견: ${currentCharacter.name}`);

    const characterSettings = getCharacterSettings(currentCharacter.id);
    const position = createVector3FromSettings(characterSettings);
    const scale = createScaleFromSettings(characterSettings);

    const loadedCharacter = await globalCharacterManager?.loadCharacter(currentCharacter.id, currentCharacter.modelPath, position, scale);

    if (loadedCharacter) {
      globalInputManager?.setActiveCharacter(loadedCharacter.id);
      console.log(`저장된 캐릭터 로드 완료: ${currentCharacter.name}`);
    }
  } else {
    console.log("저장된 캐릭터가 없습니다. 참여 버튼을 눌러 캐릭터를 선택하세요.");

    // 기본 캐릭터 로드 (테스트용)
    const defaultCharacterType = "cat";
    const defaultModelPath = CharacterLoader.getCharacterModelPath(defaultCharacterType);
    if (defaultModelPath) {
      const loadedCharacter = await globalCharacterManager?.loadCharacter(
        defaultCharacterType,
        defaultModelPath,
        new THREE.Vector3(0, 0, 0),
        new THREE.Vector3(1, 1, 1)
      );

      if (loadedCharacter) {
        globalInputManager?.setActiveCharacter(loadedCharacter.id);
        console.log(`기본 캐릭터 로드 완료: ${defaultCharacterType}`);
      }
    }
  }

  const controls = setupOrbitControls(camera, globalRenderer);

  // controls를 전역 변수에 할당
  (window as any).globalControls = controls;

  setupCameraEventListeners(camera, controls);

  setupResizeHandler(camera, globalRenderer);

  // 캐릭터 업데이트를 포함한 애니메이션 루프
  const animate = createAnimationLoop(globalScene, camera, globalRenderer, controls, globalCharacterManager);

  // 입력 매니저 업데이트를 위한 별도 애니메이션 루프
  const inputAnimationLoop = () => {
    if (globalInputManager) {
      globalInputManager.update();
    }
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
