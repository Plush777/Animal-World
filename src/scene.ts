import * as THREE from "three";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";
import { loadGLBModel, addGLBModelToScene } from "./utils/glbLoader";

export function createScene(): THREE.Scene {
  const scene = new THREE.Scene();

  // 그라데이션 배경 설정
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

  camera.position.set(332.99, 92.09, 377.12);
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
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;

  // 톤 매핑 설정으로 밝기 조정
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.0; // 밝기 조정 (원본에 가깝게 조정)
  renderer.outputColorSpace = THREE.SRGBColorSpace;

  return renderer;
}

// 조명 설정
export function setupLighting(scene: THREE.Scene): void {
  // 환경광 (자연스러운 밝기로 조정)
  const ambientLight = new THREE.AmbientLight(0xffffff, 0.6);
  scene.add(ambientLight);

  // 방향성 조명 (자연스러운 밝기로 조정)
  const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
  directionalLight.position.set(5, 10, 2);
  directionalLight.castShadow = true;
  directionalLight.shadow.mapSize.width = 2048;
  directionalLight.shadow.mapSize.height = 2048;
  directionalLight.shadow.camera.near = 0.5;
  directionalLight.shadow.camera.far = 100;
  directionalLight.shadow.camera.left = 100;
  directionalLight.shadow.camera.right = 100;
  directionalLight.shadow.camera.top = 100;
  directionalLight.shadow.camera.bottom = -100;
  scene.add(directionalLight);

  // 추가 보조 조명 (자연스러운 밝기로 조정)
  const fillLight = new THREE.DirectionalLight(0xffffff, 0.4);
  fillLight.position.set(-5, 8, -5);
  scene.add(fillLight);
}

// 원형 그라데이션 지면 생성 (Canvas 텍스처 사용)
export function createCircularGradientGround(scene: THREE.Scene): void {
  // 원형 지면의 반지름과 세그먼트 수
  const radius = 425;
  const segments = 128;

  // 원형 지오메트리 생성
  const groundGeometry = new THREE.CircleGeometry(radius, segments);

  // Canvas를 사용한 그라데이션 텍스처 생성
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

  // 간단하고 선명한 3단계 그라데이션
  gradient.addColorStop(0, "#0dd8fc"); // 밝은 하늘색 (중앙)
  gradient.addColorStop(0.5, "#0d94fc"); // 중간 파란색
  gradient.addColorStop(1, "#0329ff"); // 진한 파란색 (가장자리)

  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  // 텍스처 생성
  const texture = new THREE.CanvasTexture(canvas);
  texture.wrapS = THREE.ClampToEdgeWrapping;
  texture.wrapT = THREE.ClampToEdgeWrapping;

  // 머티리얼 생성
  const groundMaterial = new THREE.MeshBasicMaterial({
    map: texture,
    transparent: true,
    side: THREE.DoubleSide,
  });

  // 메시 생성
  const ground = new THREE.Mesh(groundGeometry, groundMaterial);
  ground.rotation.x = -Math.PI / 2; // 수평으로 회전
  ground.position.y = -1; // 배경과 자연스럽게 연결
  ground.receiveShadow = true;

  scene.add(ground);
}

// OrbitControls 설정
export function setupOrbitControls(
  camera: THREE.PerspectiveCamera,
  renderer: THREE.WebGLRenderer
): OrbitControls {
  const controls = new OrbitControls(camera, renderer.domElement);

  // 컨트롤 설정
  // controls.enableDamping = true; // 부드러운 움직임
  controls.dampingFactor = 0.05;
  controls.screenSpacePanning = false;
  // controls.minDistance = 100; // 최소 거리
  // controls.maxDistance = 5000; // 최대 거리
  // controls.maxPolarAngle = Math.PI / 2; // 수평선 아래로 내려가지 않도록

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
      "/models/low_poly_nature_scene.glb",
      new THREE.Vector3(0, 26, 0),
      new THREE.Vector3(4, 4, 4),
      new THREE.Euler(0, 2, 0)
    );

    await loadModel(
      scene,
      "/models/low_poly_trees.glb",
      new THREE.Vector3(300, 80, 0),
      new THREE.Vector3(0.04, 0.04, 0.04),
      new THREE.Euler(0, 5, 0)
    );

    await loadModel(
      scene,
      "/models/low_poly_triple_trees.glb",
      new THREE.Vector3(-100, 110, 300),
      new THREE.Vector3(4, 4, 4),
      new THREE.Euler(0, 4, 0)
    );

    await loadModel(
      scene,
      "/models/lighthouse.glb",
      new THREE.Vector3(0, 65, -300),
      new THREE.Vector3(100, 100, 100),
      new THREE.Euler(0, 0, 0)
    );

    console.log("모든 모델이 성공적으로 로드되었습니다.");
  } catch (error) {
    console.error("모델 로드 중 오류 발생:", error);
  }
}
