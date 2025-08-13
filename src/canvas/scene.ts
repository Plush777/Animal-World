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

  // 시간에 따라 다른 배경색 적용
  if (isDayTime()) {
    // 낮 시간 배경 (기존 색상)
    gradient.addColorStop(0, "#87CEEB"); // 밝은 하늘색 (위쪽)
    gradient.addColorStop(0.5, "#4682B4"); // 중간 파란색
    gradient.addColorStop(1, "#000080"); // 진한 파란색 (아래쪽)
  } else {
    // 밤 시간 배경 (어두운 색상)
    gradient.addColorStop(0, "#1a1a2e"); // 어두운 보라색 (위쪽)
    gradient.addColorStop(0.5, "#16213e"); // 어두운 남색
    gradient.addColorStop(1, "#0f0f0f"); // 검은색에 가까운 색 (아래쪽)
  }

  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  const texture = new THREE.CanvasTexture(canvas);
  texture.mapping = THREE.EquirectangularReflectionMapping;

  scene.background = texture;
  return scene;
}

export function createCamera(): THREE.PerspectiveCamera {
  const camera = new THREE.PerspectiveCamera(
    40,
    window.innerWidth / window.innerHeight,
    0.1,
    500000
  );
  camera.position.set(456, 249, 462);
  camera.lookAt(0, 0, 0);

  console.log("Camera created:", camera);
  return camera;
}

// 카메라 정보를 콘솔에 출력하는 디버깅 함수
export function logCameraInfo(
  camera: THREE.PerspectiveCamera,
  label: string = "Camera"
): void {
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

// 렌더러 생성 및 설정
export function createRenderer(): THREE.WebGLRenderer {
  const renderer = new THREE.WebGLRenderer({
    canvas: document.getElementById("scene") as HTMLCanvasElement,
    antialias: true,
  });
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.setPixelRatio(window.devicePixelRatio);

  // 그림자 설정 개선
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  renderer.shadowMap.autoUpdate = false; // 성능 최적화를 위해 자동 업데이트 비활성화

  // 톤 매핑 설정으로 밝기 조정
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.0; // 밝기 조정 (원본에 가깝게 조정)
  renderer.outputColorSpace = THREE.SRGBColorSpace;

  return renderer;
}

// 조명 설정
export function setupLighting(scene: THREE.Scene): void {
  // 시간에 따라 조명 강도 조정
  const isDay = isDayTime();
  // 밤에는 스카이박스가 잘 보이도록 주변광을 적당히 유지
  const ambientIntensity = isDay ? 0.15 : 0.12; // 밤에는 스카이박스를 위해 약간 밝게
  const directionalIntensity = isDay ? 2.0 : 0.6; // 밤에는 직사광을 줄여서 스카이박스가 돋보이게
  const lightColor = isDay ? 0xffffff : 0x9bb5ff; // 밤에는 스카이박스와 어울리는 연한 파란빛

  const ambientLight = new THREE.AmbientLight(lightColor, ambientIntensity);
  scene.add(ambientLight);

  const directionalLight = new THREE.DirectionalLight(
    lightColor,
    directionalIntensity
  );
  directionalLight.position.set(30, 120, 0);
  directionalLight.castShadow = true;

  // 그림자 맵 품질 향상 - 떠다니는 모델들을 위해 최적화
  directionalLight.shadow.mapSize.width = 2048;
  directionalLight.shadow.mapSize.height = 2048;
  directionalLight.shadow.camera.near = 0.1;
  directionalLight.shadow.camera.far = 5000;
  directionalLight.shadow.camera.left = -1000;
  directionalLight.shadow.camera.right = 1000;
  directionalLight.shadow.camera.top = 1000;
  directionalLight.shadow.camera.bottom = -1000;

  // 그림자 품질 설정 - 떠다니는 모델들을 위해 최적화
  directionalLight.shadow.bias = -0.0002;
  directionalLight.shadow.normalBias = 0.003;
  directionalLight.shadow.radius = 0.3;

  scene.add(directionalLight);

  const fillLight = new THREE.DirectionalLight(0xffffff, 0.05);
  fillLight.position.set(-20, 100, -20);
  scene.add(fillLight);
}

export function createCircularGradientGround(scene: THREE.Scene): void {
  // 원형 지면의 반지름과 세그먼트 수
  const radius = 500;
  const segments = 128;

  const groundGeometry = new THREE.CircleGeometry(radius, segments);

  const canvas = document.createElement("canvas");
  const ctx = canvas.getContext("2d")!;
  canvas.width = 1024;
  canvas.height = 1024;

  // 원형 그라데이션 생성 (중앙에서 바깥쪽으로)
  const gradient = ctx.createRadialGradient(
    canvas.width / 2,
    canvas.height / 2,
    0,
    canvas.width / 2,
    canvas.height / 2,
    canvas.width / 2
  );

  // 시간에 따라 다른 그라데이션 색상 적용
  if (isDayTime()) {
    // 낮 시간: 밝은 파란색 그라데이션
    gradient.addColorStop(0, "#0dd8fc"); // 밝은 하늘색 (중앙)
    gradient.addColorStop(0.5, "#0d94fc"); // 중간 파란색
    gradient.addColorStop(1, "#0329ff"); // 진한 파란색 (가장자리)
  } else {
    // 밤 시간: 어두운 보라/남색 그라데이션
    gradient.addColorStop(0, "#1a2540"); // 어두운 회색-파랑 (중앙)
    gradient.addColorStop(0.5, "#0f1b2e"); // 더 어두운 남색
    gradient.addColorStop(1, "#06101c"); // 거의 검은색 (가장자리)
  }

  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  const texture = new THREE.CanvasTexture(canvas);
  texture.wrapS = THREE.ClampToEdgeWrapping;
  texture.wrapT = THREE.ClampToEdgeWrapping;

  // 그림자를 더 잘 받을 수 있도록 MeshStandardMaterial 사용
  const groundMaterial = new THREE.MeshStandardMaterial({
    map: texture,
    transparent: true,
    side: THREE.DoubleSide,
    roughness: 0.8,
    metalness: 0.0,
  });

  const ground = new THREE.Mesh(groundGeometry, groundMaterial);
  ground.rotation.x = -Math.PI / 2;
  ground.position.y = -1;
  ground.receiveShadow = true;

  scene.add(ground);

  // 추가 그림자 평면 생성 (더 나은 그림자 품질을 위해)
  createShadowPlane(scene);
}

// 그림자 품질 향상을 위한 추가 그림자 평면
function createShadowPlane(scene: THREE.Scene): void {
  const shadowPlaneGeometry = new THREE.PlaneGeometry(2000, 2000);
  const shadowMaterial = new THREE.ShadowMaterial({
    transparent: true,
    opacity: 0.2, // 떠다니는 모델들의 그림자를 위해 투명도 증가
  });

  const shadowPlane = new THREE.Mesh(shadowPlaneGeometry, shadowMaterial);
  shadowPlane.rotation.x = -Math.PI / 2;
  shadowPlane.position.y = -0.3; // 바닥에 더 가깝게 배치
  shadowPlane.receiveShadow = true;

  scene.add(shadowPlane);
}

export function setupOrbitControls(
  camera: THREE.PerspectiveCamera,
  renderer: THREE.WebGLRenderer
): OrbitControls {
  const controls = new OrbitControls(camera, renderer.domElement);

  controls.enableDamping = true; // 부드러운 움직임
  controls.dampingFactor = 0.05;
  controls.screenSpacePanning = false;
  controls.minDistance = 500; // 최소 거리
  controls.maxDistance = 740; // 최대 거리

  controls.minPolarAngle = Math.PI / 3; //위로 올라가는거 제한
  controls.maxPolarAngle = Math.PI / 2.5; // 수평선 아래로 내려가지 않도록
  controls.enableZoom = false;

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
export function setupCameraEventListeners(
  camera: THREE.PerspectiveCamera,
  controls: OrbitControls
): void {
  // 'changeCameraPosition' 커스텀 이벤트 리스너 등록
  document.addEventListener("changeCameraPosition", (event: CustomEvent) => {
    const { x, y, z, duration = 2000 } = event.detail;

    // animation.ts의 카메라 애니메이션 함수 사용
    import("./animation")
      .then((animationModule) => {
        animationModule.startCameraAnimation(
          camera,
          controls,
          x,
          y,
          z,
          duration
        );
      })
      .catch((error) => {
        console.error("카메라 애니메이션 시작 중 오류:", error);
      });
  });
}

export function setupResizeHandler(
  camera: THREE.PerspectiveCamera,
  renderer: THREE.WebGLRenderer
): void {
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
    const gltf = await loadGLBModel(modelPath);
    const model = addGLBModelToScene(scene, gltf);
    model.position.copy(position);
    model.scale.copy(scale);
    model.rotation.copy(rotation);

    return model;
  } catch (error) {
    console.error(`GLB 모델 로드 실패: ${modelPath}`, error);
    return null;
  }
}

export async function loadMultipleModels(scene: THREE.Scene): Promise<void> {
  try {
    // 로딩할 총 모델 수 설정 (8개 모델)
    if (window.LoadingUI) {
      window.LoadingUI.setTotalModels(8);
    }

    // 현재 시간에 따라 적절한 씬 모델 로드
    const sceneModelPath = getSceneModelPath();
    const isDay = isDayTime();

    // 시간에 따라 다른 위치, 스케일, 회전 적용
    const scenePosition = isDay
      ? new THREE.Vector3(0, 0, 0) // 낮
      : new THREE.Vector3(0, 0, 0); // 밤

    const sceneScale = isDay
      ? new THREE.Vector3(1, 1, 1)
      : new THREE.Vector3(1, 1, 1);

    const sceneRotation = isDay
      ? new THREE.Euler(0, 0, 0)
      : new THREE.Euler(0, 0, 0);

    // 씬 모델 로드
    const sceneModel = await loadModel(
      scene,
      sceneModelPath,
      scenePosition,
      sceneScale,
      sceneRotation
    );

    // 밤 시간에 씬 모델에 어두운 효과 적용
    if (sceneModel && !isDay) {
      adjustSceneForNightTime(sceneModel);
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
      new THREE.Vector3(-100, 90, 330),
      new THREE.Vector3(3, 3, 3),
      new THREE.Euler(0, 2, 0)
    );

    if (floatingIsland) {
      addFloatingAnimation(floatingIsland, 8, 0.4, 0);
    }

    const floatingTrees = await loadModel(
      scene,
      "/models/low_poly_trees.glb",
      new THREE.Vector3(320, 80, 0),
      new THREE.Vector3(0.05, 0.05, 0.05),
      new THREE.Euler(0, 5, 0)
    );

    if (floatingTrees) {
      addFloatingAnimation(floatingTrees, 6, 0.6, Math.PI / 3);
    }

    const tripleTrees = await loadModel(
      scene,
      "/models/low_poly_triple_trees.glb",
      new THREE.Vector3(-400, 60, 100),
      new THREE.Vector3(4, 4, 4),
      new THREE.Euler(0, 4, 0)
    );

    if (tripleTrees) {
      addFloatingAnimation(tripleTrees, 7, 0.4, Math.PI / 4);
    }

    await loadModel(
      scene,
      "/models/lighthouse.glb",
      new THREE.Vector3(0, 70, -300),
      new THREE.Vector3(100, 100, 100),
      new THREE.Euler(0, 0, 0)
    );

    const waterModel = await loadModel(
      scene,
      "/models/water.glb",
      new THREE.Vector3(0, -70, 0),
      new THREE.Vector3(40, 40, 40),
      new THREE.Euler(0, 0, 0)
    );

    // water.glb 모델에서 pSic1_WaterL_0 오브젝트를 찾아 물결 애니메이션 및 조명 조정 적용
    if (waterModel) {
      waterModel.traverse((child) => {
        if (child.name === "pDisc1_WaterL_0") {
          // 물결 애니메이션 추가
          addWaterWaveAnimation(child, 0.5, 1.5, 1.2, 0);

          // 시간에 따른 물 조명 조정
          adjustWaterLighting(child, isDay);
        }
      });
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
        material.color.setHex(0x4dd8fc); // 밝은 파란색
      }
      if (material.emissive) {
        material.emissive.setHex(0x001122); // 약간의 발광
      }
      if (material.opacity !== undefined) {
        material.opacity = 0.8; // 투명도
      }
    } else {
      // 밤 시간: 어두운 물 설정
      if (material.color) {
        material.color.setHex(0x1a3d5c); // 어두운 파란색
      }
      if (material.emissive) {
        material.emissive.setHex(0x000811); // 더 어두운 발광
      }
      if (material.opacity !== undefined) {
        material.opacity = 0.6; // 더 투명하게
      }
    }

    // 머티리얼 업데이트
    material.needsUpdate = true;

    console.log(`물 조명 조정 완료: ${isDay ? "낮" : "밤"} 모드`);
  }
}

/**
 * 밤 시간에 씬 모델을 어둡게 조정합니다.
 * @param sceneModel 씬 모델 그룹
 */
function adjustSceneForNightTime(sceneModel: THREE.Group): void {
  sceneModel.traverse((child) => {
    if (child instanceof THREE.Mesh && child.material) {
      const materials = Array.isArray(child.material)
        ? child.material
        : [child.material];

      materials.forEach((mat) => {
        if (mat.color) {
          // 밤 시간에는 모든 색상을 어둡게 조정
          mat.color.multiplyScalar(0.3); // 30%로 어둡게
        }
        if (mat.emissive) {
          // 약간의 파란 발광 효과 추가
          mat.emissive.setHex(0x001122);
        }
        mat.needsUpdate = true;
      });
    }
  });

  console.log("씬 모델에 밤 효과 적용 완료");
}

function adjustForestGroundLighting(
  forestGroundModel: THREE.Group,
  isDay: boolean
): void {
  forestGroundModel.traverse((child) => {
    if (child instanceof THREE.Mesh && child.material) {
      const material = child.material;

      // 배열 형태의 머티리얼 처리
      const materials = Array.isArray(material) ? material : [material];

      materials.forEach((mat) => {
        if (isDay) {
          // 낮 시간: 원래 색상 유지 (밝게)

          if (mat.color) {
            mat.color.multiplyScalar(1.0); // 밝기
          }
          if (mat.emissive) {
            mat.emissive.setHex(0x000000); // 발광 없음
          }
        } else {
          // 밤 시간: 어둡게 조정
          if (mat.color) {
            mat.color.multiplyScalar(1.0);
          }
          if (mat.emissive) {
            mat.emissive.setHex(0x001122); // 약간의 파란 발광
          }
        }

        mat.needsUpdate = true;
      });
    }
  });
}
