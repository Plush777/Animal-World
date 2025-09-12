import * as THREE from "three";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";
import { loadGLBModel, addGLBModelToScene } from "../utils/glbLoader";
import { addFloatingAnimation, addWaterWaveAnimation } from "./animation";
import { getSceneModelPath, isDayTime } from "./time";

export function createScene(): THREE.Scene {
  const scene = new THREE.Scene();

  const canvas = document.createElement("canvas");
  const ctx = canvas.getContext("2d")!;
  canvas.width = 2;
  canvas.height = 1024;

  const gradient = ctx.createLinearGradient(0, 0, 0, canvas.height);

  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  const texture = new THREE.CanvasTexture(canvas);
  texture.mapping = THREE.EquirectangularReflectionMapping;

  scene.background = texture;
  return scene;
}

export function createCamera(): THREE.PerspectiveCamera {
  const camera = new THREE.PerspectiveCamera(40, window.innerWidth / window.innerHeight, 0.1, 1000000);
  // 카메라 위치를 캐릭터가 잘 보이도록 조정 (지면 근처)
  camera.position.set(70, 60, 115); // 캐릭터 근처로 위치 조정
  camera.lookAt(70, 45, 100); // 캐릭터가 있을 위치를 바라봄

  console.log("Camera created:", camera);
  return camera;
}

// 카메라 정보를 콘솔에 출력하는 디버깅 함수
export function logCameraInfo(camera: THREE.PerspectiveCamera, label: string = "Camera"): void {
  console.log(`=== ${label} Info ===`);
  console.log(`Position:`, camera.position);
  console.log(`Rotation:`, camera.rotation);
  console.log(`FOV:`, camera.fov);
  console.log(`Aspect:`, camera.aspect);
  console.log(`Near:`, camera.near);
  console.log(`Far:`, camera.far);
  console.log(`Matrix:`, camera.matrix);
  console.log(`Projection Matrix:`, camera.projectionMatrix);
  console.log(`==================`);
}

export function createRenderer(): THREE.WebGLRenderer {
  const renderer = new THREE.WebGLRenderer({
    canvas: document.getElementById("scene") as HTMLCanvasElement,
    antialias: true,
  });
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.setPixelRatio(window.devicePixelRatio);

  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  renderer.shadowMap.autoUpdate = false; // 성능을 위해 자동 업데이트 비활성화
  // renderer.shadowMap.needsUpdate = true; // 초기 그림자 맵 업데이트 강제

  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = isDayTime() ? 1.2 : 1.4; // 원본 이미지의 밝은 느낌을 위해 노출 증가
  renderer.outputColorSpace = THREE.SRGBColorSpace;

  return renderer;
}

// 조명 설정
export function setupLighting(scene: THREE.Scene): void {
  const isDay = isDayTime();

  const ambientIntensity = isDay ? 0.15 : 0.25; // 성능을 위해 약간 증가하여 그림자 의존도 감소
  const directionalIntensity = isDay ? 2.0 : 0.8; // 성능을 위해 약간 감소
  const lightColor = isDay ? 0xffffff : 0xffffff; // 밤에는 흰색 조명으로 원래 색상 보존

  const ambientLight = new THREE.AmbientLight(lightColor, ambientIntensity);
  scene.add(ambientLight);

  const directionalLight = new THREE.DirectionalLight(lightColor, directionalIntensity);
  directionalLight.position.set(30, 150, 0); // 조명 높이를 증가하여 애니메이션 중에도 그림자가 잘 보이도록
  directionalLight.castShadow = true;

  // 그림자 맵 품질 향상 - 성능과 품질의 균형을 맞춰 최적화
  directionalLight.shadow.mapSize.width = 2048; // 성능을 위해 적당한 해상도로 조정
  directionalLight.shadow.mapSize.height = 2048;
  directionalLight.shadow.camera.near = 0.1;
  directionalLight.shadow.camera.far = 8000; // 적당한 far 값으로 조정
  directionalLight.shadow.camera.left = -2000; // 적당한 그림자 범위로 조정
  directionalLight.shadow.camera.right = 2000;
  directionalLight.shadow.camera.top = 2000; // 애니메이션 중 높은 위치까지 그림자 범위
  directionalLight.shadow.camera.bottom = -2000;

  // 그림자 품질 설정 - 성능과 품질의 균형
  directionalLight.shadow.bias = -0.0005; // 성능을 고려한 bias 값
  directionalLight.shadow.normalBias = 0.001; // 성능을 고려한 normalBias 값
  directionalLight.shadow.radius = 0.3; // 적당한 그림자 경계 품질

  scene.add(directionalLight);

  const fillLight = new THREE.DirectionalLight(0xffffff, 0.05);
  fillLight.position.set(-20, 100, -20);
  scene.add(fillLight);
}

export function setupOrbitControls(camera: THREE.PerspectiveCamera, renderer: THREE.WebGLRenderer): OrbitControls {
  const controls = new OrbitControls(camera, renderer.domElement);

  controls.enableDamping = true; // 부드러운 움직임
  controls.dampingFactor = 0.05;
  controls.screenSpacePanning = false;

  // 캐릭터 중심으로 카메라 조작 설정
  controls.target.set(70, 45, 100); // 캐릭터 위치를 중심으로 설정
  // controls.minDistance = 400; // 최소 거리
  // controls.maxDistance = 570; // 최대 거리
  controls.enableZoom = true; // 줌 활성화

  // controls.minPolarAngle = Math.PI / 3; //위로 올라가는거 제한
  // controls.maxPolarAngle = Math.PI / 2.5; // 수평선 아래로 내려가지 않도록

  // 초기 map-explore 상태 확인 및 적용
  const savedMapExploreState = localStorage.getItem("mapExplore");
  const isMapExploreEnabled = savedMapExploreState ? JSON.parse(savedMapExploreState) : false;

  if (!isMapExploreEnabled) {
    // 맵 둘러보기 비활성화 상태면 카메라 고정
    controls.enabled = false;
    camera.position.set(456.93, 249.97, 464.93);
    camera.lookAt(70, 45, 100);
  }

  controls.addEventListener("change", () => {
    console.log("카메라 위치:", {
      x: camera.position.x.toFixed(2),
      y: camera.position.y.toFixed(2),
      z: camera.position.z.toFixed(2),
    });
  });

  return controls;
}

// 카메라 위치 변경 이벤트 처리
export function setupCameraEventListeners(camera: THREE.PerspectiveCamera, controls: OrbitControls): void {
  document.addEventListener("changeCameraPosition", (event: Event) => {
    const customEvent = event as CustomEvent;
    const { x, y, z, duration = 2000 } = customEvent.detail;

    import("./animation")
      .then((animationModule) => {
        animationModule.startCameraAnimation(camera, controls, x, y, z, duration);
      })
      .catch((error) => {
        console.error("카메라 애니메이션 시작 중 오류:", error);
      });
  });
}

export function setupResizeHandler(camera: THREE.PerspectiveCamera, renderer: THREE.WebGLRenderer): void {
  window.addEventListener("resize", () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
  });
}

export async function loadModel(
  scene: THREE.Scene,
  modelPath: string,
  position: THREE.Vector3 = new THREE.Vector3(0, 0, 0),
  scale: THREE.Vector3 = new THREE.Vector3(1, 1, 1),
  rotation: THREE.Euler = new THREE.Euler(0, 0, 0)
): Promise<THREE.Group | null> {
  try {
    console.log(`모델 로드 시도: ${modelPath}`);

    // GLTFLoader가 존재하는지 확인
    if (!(window as any).gltfLoader) {
      console.warn("GLTFLoader가 없습니다. 새로운 인스턴스를 생성합니다.");
      const GLTFLoader = (await import("three/addons/loaders/GLTFLoader.js")).GLTFLoader;
      (window as any).gltfLoader = new GLTFLoader();
    }
    const gltf = await loadGLBModel(modelPath);
    const model = addGLBModelToScene(scene, gltf, modelPath);
    model.position.copy(position);
    model.scale.copy(scale);
    model.rotation.copy(rotation);

    console.log(`모델 로드 성공: ${modelPath}`);
    return model;
  } catch (error) {
    console.error(`GLB 모델 로드 실패: ${modelPath}`, error);
    return null;
  }
}

export async function loadMultipleModels(scene: THREE.Scene): Promise<void> {
  try {
    // 씬이 이미 로드되어 있는지 확인
    const existingSceneModel = scene.getObjectByName("scene.glb") || scene.getObjectByName("night_sky_scene.glb");
    if (existingSceneModel) {
      console.log("씬 모델이 이미 로드되어 있습니다. 중복 로딩 방지");

      // 기존 모델의 재질 상태 확인 및 복원
      existingSceneModel.traverse((child: any) => {
        if (child instanceof THREE.Mesh && child.material) {
          const materials = Array.isArray(child.material) ? child.material : [child.material];
          materials.forEach((mat: any) => {
            if (mat) {
              mat.needsUpdate = true;
              // 기본 색상 확인 (검은색으로 바뀐 경우 복원)
              if (mat.color && mat.color.getHex() === 0x000000) {
                mat.color.setHex(0xffffff);
              }
            }
          });
        }
      });

      // UI에 로딩 완료 알림
      if (window.LoadingUI) {
        window.LoadingUI.updateProgressText("씬 모델 이미 로드됨");
        window.LoadingUI.onModelLoaded();
      }

      return;
    }

    // 모델 로딩 시작을 알림
    if (window.LoadingUI) {
      window.LoadingUI.updateProgressText("모델 로딩을 시작합니다...");
    }

    const sceneModelPath = getSceneModelPath();
    const isDay = isDayTime();

    const scenePosition = isDay
      ? new THREE.Vector3(0, 0, 0) // 낮
      : new THREE.Vector3(0, 400, 0); // 밤

    const sceneScale = isDay ? new THREE.Vector3(1, 1, 1) : new THREE.Vector3(7.6, 7.6, 7.6);

    const sceneRotation = isDay ? new THREE.Euler(0, 0, 0) : new THREE.Euler(0, 0, 0);

    // 씬 모델 로드
    const sceneModel = await loadModel(scene, sceneModelPath, scenePosition, sceneScale, sceneRotation);

    if (sceneModel) {
      // 씬 모델에 이름과 경계 정보 설정
      const modelName = isDay ? "scene.glb" : "night_sky_scene.glb";
      sceneModel.name = modelName;
      sceneModel.userData.modelName = modelName;
      sceneModel.userData.isSceneModel = true;

      // 전역 변수로 저장하여 다른 시스템에서 접근 가능하도록 함
      (window as any).sceneModel = sceneModel;

      console.log(`✅ 씬 모델 로드 완료: ${modelName}`, {
        position: sceneModel.position,
        scale: sceneModel.scale,
        name: sceneModel.name,
      });
    }

    if (sceneModel && !isDay && !sceneModelPath.includes("night_sky_scene")) {
      adjustSceneForNightTime(sceneModel);
    }

    if (sceneModel && !isDay && sceneModelPath.includes("night_sky_scene")) {
      adjustNightSkySceneOpacity(sceneModel);
    }

    await loadModel(
      scene,
      "/models/low_poly_game_forest.glb",
      new THREE.Vector3(70, 0, 100),
      new THREE.Vector3(22, 22, 22),
      new THREE.Euler(0, 0, 0)
    );

    const forestGroundModel = await loadModel(
      scene,
      "/models/low_poly_game_forest_ground.glb",
      new THREE.Vector3(70, 0, 100),
      new THREE.Vector3(22, 22, 22),
      new THREE.Euler(0, 0, 0)
    );

    // 시간에 따른 숲 지면 조명 조정
    if (forestGroundModel) {
      adjustForestGroundLighting(forestGroundModel, isDay);
    }

    const floatingIsland = await loadModel(
      scene,
      "/models/low_poly_floating_island.glb",
      new THREE.Vector3(-100, 130, 330),
      new THREE.Vector3(3, 3, 3),
      new THREE.Euler(0, 2, 0)
    );

    if (floatingIsland) {
      addFloatingAnimation(floatingIsland, 8, 0.4, 0);
      // 캐릭터가 오브젝트로 인식하지 않도록 물리 속성 비활성화
      floatingIsland.traverse((child) => {
        if (child instanceof THREE.Mesh) {
          child.userData.isCollidable = false;
          child.userData.isTerrain = false;
          // 그림자 설정 최적화
          child.castShadow = true;
          child.receiveShadow = true;
        }
      });
      // 전역 변수로 저장
      (window as any).floatingIslandModel = floatingIsland;
    }

    const floatingTrees = await loadModel(
      scene,
      "/models/low_poly_trees.glb",
      new THREE.Vector3(310, 90, 0),
      new THREE.Vector3(0.05, 0.05, 0.05),
      new THREE.Euler(0, 5, 0)
    );

    if (floatingTrees) {
      addFloatingAnimation(floatingTrees, 6, 0.6, Math.PI / 3);
      // 캐릭터가 오브젝트로 인식하지 않도록 물리 속성 비활성화
      floatingTrees.traverse((child) => {
        if (child instanceof THREE.Mesh) {
          child.userData.isCollidable = false;
          child.userData.isTerrain = false;
          // 그림자 설정 최적화
          child.castShadow = true;
          child.receiveShadow = true;
        }
      });
      // 전역 변수로 저장
      (window as any).floatingTreesModel = floatingTrees;
    }

    const tripleTrees = await loadModel(
      scene,
      "/models/low_poly_triple_trees.glb",
      new THREE.Vector3(-330, 70, 0),
      new THREE.Vector3(4, 4, 4),
      new THREE.Euler(0, 4, 0)
    );

    if (tripleTrees) {
      addFloatingAnimation(tripleTrees, 7, 0.4, Math.PI / 4);
      // 캐릭터가 오브젝트로 인식하지 않도록 물리 속성 비활성화
      tripleTrees.traverse((child) => {
        if (child instanceof THREE.Mesh) {
          child.userData.isCollidable = false;
          child.userData.isTerrain = false;
        }
      });
      // 전역 변수로 저장
      (window as any).tripleTreesModel = tripleTrees;
    }

    const lighthouseModel = await loadModel(
      scene,
      "/models/lighthouse.glb",
      new THREE.Vector3(-80, 65, -340),
      new THREE.Vector3(100, 100, 100),
      new THREE.Euler(0, 0, 0)
    );

    console.log("lighthouse 모델 로드 완료:", lighthouseModel);

    // lighthouse 모델의 Node-Mesh_9 오브젝트 제어
    if (lighthouseModel) {
      console.log("controlLighthouseLight 함수 호출 시작, isDay:", isDay);
      controlLighthouseLight(lighthouseModel, isDay);
    } else {
      console.error("lighthouse 모델 로드 실패");
    }

    const waterPosition = isDay ? new THREE.Vector3(0, -100, 0) : new THREE.Vector3(0, -85, 0);

    const waterScale = isDay ? new THREE.Vector3(55, 55, 55) : new THREE.Vector3(48, 48, 48);

    const waterModel = await loadModel(scene, "/models/water.glb", waterPosition, waterScale, new THREE.Euler(0, 0, 0));

    // water.glb 모델에서 pSic1_WaterL_0 오브젝트를 찾아 물결 애니메이션 및 조명 조정 적용
    if (waterModel) {
      waterModel.traverse((child) => {
        if (child.name === "pDisc1_WaterL_0") {
          addWaterWaveAnimation(child, 0.5, 1.5, 1.2, 0);
          adjustWaterLighting(child, isDay);
        }
      });
    }

    // water_cloud.glb 모델 로드 - 캐릭터가 물 위를 구름을 타고 이동하는 효과
    console.log("🌩️ water_cloud.glb 로드 시도 중...");
    const waterCloudModel = await loadModel(
      scene,
      "/models/water_cloud.glb",
      new THREE.Vector3(0, 0, 0), // 위치는 캐릭터에 따라 동적으로 변경될 예정
      new THREE.Vector3(12, 12, 12), // 크기를 더 크게 설정
      new THREE.Euler(0, 0, 0)
    );

    if (waterCloudModel) {
      // 구름 모델의 재질 최적화
      waterCloudModel.traverse((child) => {
        if (child instanceof THREE.Mesh) {
          console.log("🌩️ 구름 메시 발견:", child.name, "재질:", child.material);

          if (child.material) {
            const materials = Array.isArray(child.material) ? child.material : [child.material];
            materials.forEach((mat) => {
              // 더 나은 가시성을 위한 재질 설정
              mat.transparent = true;
              mat.opacity = 0.85; // 적당한 투명도

              // 색상을 흰색으로 설정
              if (mat.color) {
                mat.color.setHex(0xffffff);
              }

              // 발광 효과로 더 눈에 띄게
              if (mat.emissive) {
                mat.emissive.setHex(0x888888); // 강한 발광
              }

              // 그림자 설정 (성능을 위해 간소화)
              child.castShadow = false; // 구름은 그림자를 받지만 만들지 않음
              child.receiveShadow = true;

              mat.needsUpdate = true;
            });
          }
        }
      });

      // 초기에는 보이지 않게 설정
      waterCloudModel.visible = false;

      // 구름 이름 설정 (디버깅용)
      waterCloudModel.name = "WaterCloudEffect";

      // 충돌 감지 비활성화 (중요! 캐릭터가 구름을 오브젝트로 인식하지 않도록)
      waterCloudModel.userData.noCollision = true;
      waterCloudModel.userData.isWaterCloud = true;
      waterCloudModel.traverse((child) => {
        if (child instanceof THREE.Mesh) {
          child.userData.noCollision = true;
          child.userData.isWaterCloud = true;
        }
      });

      // 백업 구름 생성 (더 크고 눈에 띄게)
      const backupCloudGeometry = new THREE.SphereGeometry(10, 16, 12); // 더 큰 크기
      const backupCloudMaterial = new THREE.MeshStandardMaterial({
        color: 0xffffff,
        opacity: 0.9, // 더 불투명하게
        transparent: true,
        emissive: 0xaaaaaa, // 더 강한 발광
        roughness: 0.3, // 더 매끄럽게
        metalness: 0.0,
      });
      const backupCloud = new THREE.Mesh(backupCloudGeometry, backupCloudMaterial);
      backupCloud.visible = false;
      backupCloud.name = "BackupWaterCloud";
      backupCloud.castShadow = false;
      backupCloud.receiveShadow = true;

      // 백업 구름도 충돌 감지 비활성화
      backupCloud.userData.noCollision = true;
      backupCloud.userData.isWaterCloud = true;

      scene.add(backupCloud);

      // 전역에서 접근 가능하도록 설정
      (window as any).waterCloudModel = waterCloudModel;
      (window as any).backupCloudModel = backupCloud;

      console.log("✅ water_cloud.glb 모델 로드 완료!");
      console.log("🌩️ 구름 모델 정보:", {
        position: waterCloudModel.position,
        scale: waterCloudModel.scale,
        visible: waterCloudModel.visible,
        children: waterCloudModel.children.length,
        name: waterCloudModel.name,
      });

      // 로드 완료 이벤트 발생 (다른 시스템에서 감지할 수 있도록)
      window.dispatchEvent(
        new CustomEvent("waterCloudModelLoaded", {
          detail: { waterCloudModel, backupCloud },
        })
      );

      console.log("🌩️ 구름 효과 시스템 준비 완료 - 물에 들어가면 구름이 나타납니다!");
    } else {
      console.error("❌ water_cloud.glb 모델 로드 실패!");

      // 모델 로드에 실패해도 백업 구름은 생성
      console.log("🔄 백업 구름만 생성합니다...");
      const fallbackCloud = new THREE.Mesh(
        new THREE.SphereGeometry(8, 16, 12),
        new THREE.MeshStandardMaterial({
          color: 0xffffff,
          opacity: 0.8,
          transparent: true,
          emissive: 0x777777,
        })
      );
      fallbackCloud.visible = false;
      fallbackCloud.name = "FallbackWaterCloud";
      scene.add(fallbackCloud);

      (window as any).waterCloudModel = fallbackCloud; // 백업을 메인으로 사용
      (window as any).backupCloudModel = fallbackCloud;

      console.log("✅ 백업 구름 생성 완료!");
    }

    console.log("모든 모델이 성공적으로 로드되었습니다.");
  } catch (error) {
    console.error("모델 로드 중 오류 발생:", error);
  }
}

/**
 * 시간에 따라 물 모델의 조명을 조정합니다.
 * @param waterObject 물 오브젝트 (pDisc1_WaterL_0)
 * @param isDay 낮 시간 여부
 */
function adjustWaterLighting(waterObject: any, isDay: boolean): void {
  if (waterObject && waterObject.material) {
    const material = waterObject.material;

    if (isDay) {
      // 낮 시간: 밝은 물 설정
      if (material.color) {
        material.color.setHex(0x4dd8fc);
      }
      if (material.emissive) {
        material.emissive.setHex(0x001122);
      }
      if (material.opacity !== undefined) {
        material.opacity = 0.95;
      }
    } else {
      if (material.color) {
        material.color.setHex(0x2a6d86);
      }
      if (material.emissive) {
        material.emissive.setHex(0x001122);
      }
      if (material.opacity !== undefined) {
        material.opacity = 0.9;
      }
    }
    material.needsUpdate = true;
  }
}

function adjustSceneForNightTime(sceneModel: THREE.Group): void {
  sceneModel.traverse((child) => {
    if (child instanceof THREE.Mesh && child.material) {
      const materials = Array.isArray(child.material) ? child.material : [child.material];

      materials.forEach((mat) => {
        if (mat.color) {
          mat.color.multiplyScalar(0.8);
        }
        if (mat.emissive) {
          mat.emissive.setHex(0x001122);
        }
        mat.needsUpdate = true;
      });
    }
  });
}

function adjustForestGroundLighting(forestGroundModel: THREE.Group, isDay: boolean): void {
  forestGroundModel.traverse((child) => {
    if (child instanceof THREE.Mesh && child.material) {
      const material = child.material;

      const materials = Array.isArray(material) ? material : [material];

      materials.forEach((mat) => {
        if (isDay) {
          if (mat.color) {
            mat.color.multiplyScalar(1.0);
          }
          if (mat.emissive) {
            mat.emissive.setHex(0x000000);
          }
        } else {
          if (mat.color) {
            mat.color.multiplyScalar(1.0);
          }
          if (mat.emissive) {
            mat.emissive.setHex(0x001122);
          }
        }

        mat.needsUpdate = true;
      });
    }
  });
}

/**
 * night_sky_scene.glb 모델의 투명도와 색상을 자연스럽게 설정합니다.
 * @param nightSkyModel night_sky_scene 모델 그룹
 */
function adjustNightSkySceneOpacity(nightSkyModel: THREE.Group): void {
  nightSkyModel.traverse((child) => {
    if (child instanceof THREE.Mesh && child.material) {
      const materials = Array.isArray(child.material) ? child.material : [child.material];

      materials.forEach((mat) => {
        if (mat.emissive) {
          mat.emissive.setHex(0x555555);
        }
        mat.needsUpdate = true;
      });
    }
  });
}

function controlLighthouseLight(lighthouseModel: THREE.Group, isDay: boolean): void {
  let lightObject9: THREE.Object3D | null = null;

  lighthouseModel.traverse((child: THREE.Object3D) => {
    if (child.name === "Node-Mesh_9") {
      lightObject9 = child;
    }
  });

  if (lightObject9) {
    if (isDay) {
      (lightObject9 as THREE.Object3D).visible = false;
    } else {
      (lightObject9 as THREE.Object3D).visible = true;
    }
  } else {
    console.error("lighthouse 모델에서 Node-Mesh_9 오브젝트를 찾을 수 없습니다.");
  }
}
