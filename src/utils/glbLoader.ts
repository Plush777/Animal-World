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
            // 모든 메시에 그림자 설정 강화
            child.castShadow = true;
            child.receiveShadow = true;

            // 그림자 품질 향상을 위한 재질 설정
            if (child.material) {
              if (Array.isArray(child.material)) {
                child.material.forEach((mat) => {
                  if (
                    mat instanceof THREE.MeshStandardMaterial ||
                    mat instanceof THREE.MeshPhysicalMaterial
                  ) {
                    mat.shadowSide = THREE.FrontSide;
                  }
                });
              } else {
                if (
                  child.material instanceof THREE.MeshStandardMaterial ||
                  child.material instanceof THREE.MeshPhysicalMaterial
                ) {
                  child.material.shadowSide = THREE.FrontSide;
                }
              }
            }

            // 나무 모델의 재질을 초록색으로 조정
            if (path.includes("low_poly_trees")) {
              console.log(`나무 모델 발견: ${child.name}`);
              adjustTreeMaterial(child.material);
            }
            // floating island 모델의 재질 조정 (색상 보존)
            else if (path.includes("low_poly_floating_island")) {
              console.log(`Floating Island 모델 발견: ${child.name}`);
              console.log(`재질 색상:`, child.material.color);
              console.log(
                `그림자 설정 - castShadow: ${child.castShadow}, receiveShadow: ${child.receiveShadow}`
              );
              adjustFloatingIslandMaterial(child.material, child.name);

              // Floating Island 모델에 대해 추가 그림자 설정
              child.castShadow = true;
              child.receiveShadow = true;

              if (child.material) {
                if (Array.isArray(child.material)) {
                  child.material.forEach((mat) => {
                    mat.needsUpdate = true;
                    if (
                      mat instanceof THREE.MeshStandardMaterial ||
                      mat instanceof THREE.MeshPhysicalMaterial
                    ) {
                      mat.shadowSide = THREE.FrontSide;
                    }
                  });
                } else {
                  child.material.needsUpdate = true;
                  if (
                    child.material instanceof THREE.MeshStandardMaterial ||
                    child.material instanceof THREE.MeshPhysicalMaterial
                  ) {
                    child.material.shadowSide = THREE.FrontSide;
                  }
                }
              }
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

// 나무 재질을 초록색으로 조정하는 함수
function adjustTreeMaterial(material: THREE.Material | THREE.Material[]): void {
  if (Array.isArray(material)) {
    material.forEach((mat) => {
      adjustSingleTreeMaterial(mat);
    });
  } else {
    adjustSingleTreeMaterial(material);
  }
}

// 단일 나무 재질 조정 함수
function adjustSingleTreeMaterial(material: THREE.Material): void {
  // MeshStandardMaterial 또는 MeshPhysicalMaterial인 경우
  if (
    material instanceof THREE.MeshStandardMaterial ||
    material instanceof THREE.MeshPhysicalMaterial
  ) {
    material.metalness = 0.0; // 메탈릭 없음
    material.roughness = 0.8; // 적당한 러프니스
    material.transparent = false;
    material.opacity = 1.0;

    // 나무를 초록색으로 설정
    if (material.color) {
      // 하얀색이나 회색인 경우 다양한 초록색 톤으로 변경
      if (
        material.color.r > 0.8 &&
        material.color.g > 0.8 &&
        material.color.b > 0.8
      ) {
        // 랜덤하게 다양한 초록색 톤 적용
        const greenTones = [
          [0.2, 0.8, 0.2], // 밝은 초록색
          [0.3, 0.9, 0.3], // 더 밝은 초록색
          [0.4, 1.0, 0.4], // 연한 초록색
          [0.1, 0.7, 0.1], // 진한 초록색
          [0.5, 1.0, 0.5], // 연한 라임 초록색
        ];
        const randomTone =
          greenTones[Math.floor(Math.random() * greenTones.length)];
        material.color.setRGB(randomTone[0], randomTone[1], randomTone[2]);
      } else if (
        material.color.r > 0.6 &&
        material.color.g > 0.6 &&
        material.color.b > 0.6
      ) {
        // 회색 톤인 경우도 초록색으로 변경
        const greenTones = [
          [0.2, 0.8, 0.2], // 밝은 초록색
          [0.3, 0.9, 0.3], // 더 밝은 초록색
          [0.4, 1.0, 0.4], // 연한 초록색
        ];
        const randomTone =
          greenTones[Math.floor(Math.random() * greenTones.length)];
        material.color.setRGB(randomTone[0], randomTone[1], randomTone[2]);
      }
    }
  }

  // MeshLambertMaterial인 경우
  else if (material instanceof THREE.MeshLambertMaterial) {
    material.transparent = false;
    material.opacity = 1.0;

    if (material.color) {
      // 하얀색이나 회색인 경우 다양한 초록색 톤으로 변경
      if (
        material.color.r > 0.8 &&
        material.color.g > 0.8 &&
        material.color.b > 0.8
      ) {
        const greenTones = [
          [0.2, 0.8, 0.2], // 밝은 초록색
          [0.3, 0.9, 0.3], // 더 밝은 초록색
          [0.4, 1.0, 0.4], // 연한 초록색
          [0.1, 0.7, 0.1], // 진한 초록색
          [0.5, 1.0, 0.5], // 연한 라임 초록색
        ];
        const randomTone =
          greenTones[Math.floor(Math.random() * greenTones.length)];
        material.color.setRGB(randomTone[0], randomTone[1], randomTone[2]);
      } else if (
        material.color.r > 0.6 &&
        material.color.g > 0.6 &&
        material.color.b > 0.6
      ) {
        const greenTones = [
          [0.2, 0.8, 0.2], // 밝은 초록색
          [0.3, 0.9, 0.3], // 더 밝은 초록색
          [0.4, 1.0, 0.4], // 연한 초록색
        ];
        const randomTone =
          greenTones[Math.floor(Math.random() * greenTones.length)];
        material.color.setRGB(randomTone[0], randomTone[1], randomTone[2]);
      }
    }
  }

  // MeshBasicMaterial인 경우
  else if (material instanceof THREE.MeshBasicMaterial) {
    material.transparent = false;
    material.opacity = 1.0;

    if (material.color) {
      // 하얀색이나 회색인 경우 다양한 초록색 톤으로 변경
      if (
        material.color.r > 0.8 &&
        material.color.g > 0.8 &&
        material.color.b > 0.8
      ) {
        const greenTones = [
          [0.2, 0.8, 0.2], // 밝은 초록색
          [0.3, 0.9, 0.3], // 더 밝은 초록색
          [0.4, 1.0, 0.4], // 연한 초록색
          [0.1, 0.7, 0.1], // 진한 초록색
          [0.5, 1.0, 0.5], // 연한 라임 초록색
        ];
        const randomTone =
          greenTones[Math.floor(Math.random() * greenTones.length)];
        material.color.setRGB(randomTone[0], randomTone[1], randomTone[2]);
      } else if (
        material.color.r > 0.6 &&
        material.color.g > 0.6 &&
        material.color.b > 0.6
      ) {
        const greenTones = [
          [0.2, 0.8, 0.2], // 밝은 초록색
          [0.3, 0.9, 0.3], // 더 밝은 초록색
          [0.4, 1.0, 0.4], // 연한 초록색
        ];
        const randomTone =
          greenTones[Math.floor(Math.random() * greenTones.length)];
        material.color.setRGB(randomTone[0], randomTone[1], randomTone[2]);
      }
    }
  }
}

// Floating Island 재질을 밝게 조정하는 함수
function adjustFloatingIslandMaterial(
  material: THREE.Material | THREE.Material[],
  meshName: string
): void {
  if (Array.isArray(material)) {
    material.forEach((mat) => {
      adjustSingleFloatingIslandMaterial(mat, meshName);
    });
  } else {
    adjustSingleFloatingIslandMaterial(material, meshName);
  }
}

// 단일 Floating Island 재질 조정 함수
function adjustSingleFloatingIslandMaterial(
  material: THREE.Material,
  meshName: string
): void {
  // MeshStandardMaterial 또는 MeshPhysicalMaterial인 경우
  if (
    material instanceof THREE.MeshStandardMaterial ||
    material instanceof THREE.MeshPhysicalMaterial
  ) {
    material.metalness = 0.0;
    material.roughness = 0.7;
    material.transparent = false;
    material.opacity = 1.0;

    // Floating Island 색상 조정 - 원래 색상을 보존하면서 약간만 밝게
    if (material.color) {
      // 원래 색상 값을 보존하면서 약간 밝게 조정
      const originalR = material.color.r;
      const originalG = material.color.g;
      const originalB = material.color.b;

      // 색상이 너무 어두운 경우에만 밝게 조정
      if (originalR < 0.3 && originalG < 0.3 && originalB < 0.3) {
        material.color.setRGB(
          Math.min(originalR * 1.5, 1.0),
          Math.min(originalG * 1.5, 1.0),
          Math.min(originalB * 1.5, 1.0)
        );
      }
    }
  }

  // MeshLambertMaterial인 경우
  else if (material instanceof THREE.MeshLambertMaterial) {
    material.transparent = false;
    material.opacity = 1.0;

    if (material.color) {
      const originalR = material.color.r;
      const originalG = material.color.g;
      const originalB = material.color.b;

      if (originalR < 0.3 && originalG < 0.3 && originalB < 0.3) {
        material.color.setRGB(
          Math.min(originalR * 1.5, 1.0),
          Math.min(originalG * 1.5, 1.0),
          Math.min(originalB * 1.5, 1.0)
        );
      }
    }
  }

  // MeshBasicMaterial인 경우
  else if (material instanceof THREE.MeshBasicMaterial) {
    material.transparent = false;
    material.opacity = 1.0;

    if (material.color) {
      const originalR = material.color.r;
      const originalG = material.color.g;
      const originalB = material.color.b;

      if (originalR < 0.3 && originalG < 0.3 && originalB < 0.3) {
        material.color.setRGB(
          Math.min(originalR * 1.5, 1.0),
          Math.min(originalG * 1.5, 1.0),
          Math.min(originalB * 1.5, 1.0)
        );
      }
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
