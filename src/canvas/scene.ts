import * as THREE from "three";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";
import { loadGLBModel, addGLBModelToScene } from "../utils/glbLoader";
import { addFloatingAnimation, addWaterWaveAnimation } from "./animation";

export function createScene(): THREE.Scene {
  const scene = new THREE.Scene();

  const canvas = document.createElement("canvas");
  const ctx = canvas.getContext("2d")!;
  canvas.width = 2;
  canvas.height = 1024;

  const gradient = ctx.createLinearGradient(0, 0, 0, canvas.height);
  gradient.addColorStop(0, "#87CEEB"); // 밝은 하늘색 (위쪽)
  gradient.addColorStop(0.5, "#4682B4"); // 중간 파란색
  gradient.addColorStop(1, "#000080"); // 진한 파란색 (아래쪽)

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
  const ambientLight = new THREE.AmbientLight(0xffffff, 0.15);
  scene.add(ambientLight);

  const directionalLight = new THREE.DirectionalLight(0xffffff, 2.0);
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

  gradient.addColorStop(0, "#0dd8fc"); // 밝은 하늘색 (중앙)
  gradient.addColorStop(0.5, "#0d94fc"); // 중간 파란색
  gradient.addColorStop(1, "#0329ff"); // 진한 파란색 (가장자리)

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
    await loadModel(
      scene,
      "/models/scene.glb",
      new THREE.Vector3(0, 0, 0),
      new THREE.Vector3(1, 1, 1),
      new THREE.Euler(0, 0, 0)
    );

    await loadModel(
      scene,
      "/models/low_poly_game_forest.glb",
      new THREE.Vector3(70, 0, 100),
      new THREE.Vector3(22, 22, 22),
      new THREE.Euler(0, 0, 0)
    );

    await loadModel(
      scene,
      "/models/low_poly_game_forest_ground.glb",
      new THREE.Vector3(70, 0, 100),
      new THREE.Vector3(22, 22, 22),
      new THREE.Euler(0, 0, 0)
    );

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

    // water.glb 모델에서 pSic1_WaterL_0 오브젝트를 찾아 물결 애니메이션 적용
    if (waterModel) {
      waterModel.traverse((child) => {
        if (child.name === "pDisc1_WaterL_0") {
          addWaterWaveAnimation(child, 0.5, 1.5, 1.2, 0);
        }
      });
    }

    console.log("모든 모델이 성공적으로 로드되었습니다.");
  } catch (error) {
    console.error("모델 로드 중 오류 발생:", error);
  }
}
