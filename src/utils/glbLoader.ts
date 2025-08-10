import * as THREE from "three";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";

const gltfLoader = new GLTFLoader();

// GLB 파일 로드 함수
export function loadGLBModel(
  path: string,
  onLoad?: (gltf: any) => void,
  onProgress?: (event: ProgressEvent) => void,
  onError?: (error: Error) => void
): Promise<any> {
  return new Promise((resolve, reject) => {
    gltfLoader.load(
      path,
      (gltf) => {
        console.log(`GLB 모델 로드 성공: ${path}`, gltf);

        // 모델의 모든 메시에 그림자 설정 및 재질 조정
        gltf.scene.traverse((child) => {
          if (child instanceof THREE.Mesh) {
            child.castShadow = true;
            child.receiveShadow = true;

            // 잔디바닥(지면) 식별 및 밝은 초록색으로 조정
            if (
              child.name.toLowerCase().includes("Object") ||
              isGroundByColor(child.material)
            ) {
              console.log(`잔디바닥 모델 발견: ${child.name}`);
              restoreGroundMaterial(child.material);
            }
          }

          // GLB 내부 조명 강도 조정
          if (child instanceof THREE.Light) {
            console.log(`조명 발견: ${child.type}, 강도: ${child.intensity}`);
            // 조명 강도를 50%로 줄임 (과도한 밝기 방지)
            child.intensity *= 0.5;
          }
        });

        if (onLoad) onLoad(gltf);
        resolve(gltf);
      },
      (progress) => {
        console.log(
          `GLB 모델 로드 진행률: ${path}`,
          ((progress.loaded / progress.total) * 100).toFixed(2) + "%"
        );
        if (onProgress) onProgress(progress);
      },
      (error) => {
        console.error(`GLB 모델 로드 실패: ${path}`, error);
        if (onError) onError(error as Error);
        reject(error);
      }
    );
  });
}

// 색상 기반으로 잔디바닥을 감지하는 함수
function isGroundByColor(material: THREE.Material | THREE.Material[]): boolean {
  if (Array.isArray(material)) {
    return material.some((mat) => checkGroundColor(mat));
  } else {
    return checkGroundColor(material);
  }
}

// 단일 재질의 색상이 잔디바닥인지 확인하는 함수
function checkGroundColor(material: THREE.Material): boolean {
  if ("color" in material && material.color) {
    const color = material.color as THREE.Color;
    // 잔디바닥 색상 감지 (밝은 초록색)
    return color.r > 0.4 && color.g > 0.6 && color.b < 0.3;
  }
  return false;
}

// 잔디바닥 재질을 원본 색상으로 복원하는 함수
function restoreGroundMaterial(
  material: THREE.Material | THREE.Material[]
): void {
  if (Array.isArray(material)) {
    material.forEach((mat) => {
      restoreSingleGroundMaterial(mat);
    });
  } else {
    restoreSingleGroundMaterial(material);
  }
}

// 단일 잔디바닥 재질 복원 함수
function restoreSingleGroundMaterial(material: THREE.Material): void {
  // MeshStandardMaterial 또는 MeshPhysicalMaterial인 경우
  if (
    material instanceof THREE.MeshStandardMaterial ||
    material instanceof THREE.MeshPhysicalMaterial
  ) {
    // 잔디바닥의 원본 속성 복원
    material.metalness = 0.0; // 메탈릭 없음
    material.roughness = 1.0; // 높은 러프니스 (잔디 느낌)
    material.transparent = false; // 투명도 없음
    material.opacity = 1.0;

    // 잔디바닥의 원본 색상 복원 (더 밝은 초록색)
    if (material.color) {
      material.color.setRGB(1.0, 1.0, 0.6); // 더 밝은 초록색으로 조정
    }
  }

  // MeshLambertMaterial인 경우
  else if (material instanceof THREE.MeshLambertMaterial) {
    material.transparent = false;
    material.opacity = 1.0;

    if (material.color) {
      material.color.setRGB(1.0, 1.0, 0.6); // 더 밝은 초록색으로 조정
    }
  }

  // MeshBasicMaterial인 경우
  else if (material instanceof THREE.MeshBasicMaterial) {
    material.transparent = false;
    material.opacity = 1.0;

    if (material.color) {
      material.color.setRGB(1.0, 1.0, 0.6); // 더 밝은 초록색으로 조정
    }
  }
}

export function addGLBModelToScene(scene: THREE.Scene, gltf: any): THREE.Group {
  const model = gltf.scene.clone();

  scene.add(model);

  console.log(`GLB 모델을 씬에 추가했습니다 (원본 변환 정보 유지):`, {
    position: model.position,
    rotation: model.rotation,
    scale: model.scale,
  });

  return model;
}

// GLB 모델의 바운딩 박스 정보를 반환하는 함수
export function getModelBounds(gltf: any): THREE.Box3 {
  const box = new THREE.Box3();
  box.setFromObject(gltf.scene);
  return box;
}

// GLB 모델의 크기 정보를 반환하는 함수
export function getModelSize(gltf: any): THREE.Vector3 {
  const box = getModelBounds(gltf);
  const size = new THREE.Vector3();
  box.getSize(size);
  return size;
}
