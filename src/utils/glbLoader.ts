import * as THREE from "three";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";

const gltfLoader = new GLTFLoader();

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

        try {
          // UI에 모델 로드 완료 알림
          if (window.LoadingUI) {
            window.LoadingUI.onModelLoaded();
          }

          // 모델의 모든 메시에 그림자 설정 및 재질 조정
          gltf.scene.traverse((child) => {
            if (!child) return;

            if (child.type === "Bone" || child instanceof THREE.Bone) {
              return;
            }

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
              // water 모델의 재질 조정 (물 효과를 위한 투명도와 반사 설정)
              else if (path.includes("water")) {
                console.log(`Water 모델 발견: ${child.name}`);
                adjustWaterMaterial(child.material, child.name);

                // 물 모델에 대해 그림자 설정
                child.castShadow = false; // 물은 그림자를 드리지 않음
                child.receiveShadow = true; // 물은 그림자를 받음
              }
            }

            // GLB 내부 조명 강도 조정
            if (child instanceof THREE.Light) {
              console.log(`조명 발견: ${child.type}, 강도: ${child.intensity}`);
              // 조명 강도를 50%로 줄임 (과도한 밝기 방지)
              if (typeof child.intensity === "number") {
                child.intensity *= 0.5;
              }
            }
          });

          if (onLoad) onLoad(gltf);
          resolve(gltf);
        } catch (error) {
          console.error(`GLB 모델 후처리 중 오류 발생: ${path}`, error);
          // 후처리에서 오류가 발생해도 모델 자체는 로드 성공으로 처리
          if (onLoad) onLoad(gltf);
          resolve(gltf);
        }
      },
      (progress) => {
        console.log(
          `GLB 모델 로드 진행률: ${path}`,
          ((progress.loaded / progress.total) * 100).toFixed(2) + "%"
        );

        // UI에 진행률 업데이트
        if (progress.total > 0 && window.LoadingUI) {
          window.LoadingUI.onModelProgress(progress.loaded, progress.total);
        }

        if (onProgress) onProgress(progress);
      },
      (error) => {
        console.error(`GLB 모델 로드 실패: ${path}`, error);

        // UI에 에러 알림
        if (window.LoadingUI) {
          window.LoadingUI.onError(`모델 로드 실패`);
        }

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
  _meshName: string
): void {
  if (Array.isArray(material)) {
    material.forEach((mat) => {
      adjustSingleFloatingIslandMaterial(mat, _meshName);
    });
  } else {
    adjustSingleFloatingIslandMaterial(material, _meshName);
  }
}

// 단일 Floating Island 재질 조정 함수
function adjustSingleFloatingIslandMaterial(
  material: THREE.Material,
  _meshName: string
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

// Water 재질을 조정하는 함수
function adjustWaterMaterial(
  material: THREE.Material | THREE.Material[],
  _meshName: string
): void {
  if (Array.isArray(material)) {
    material.forEach((mat) => {
      adjustSingleWaterMaterial(mat, _meshName);
    });
  } else {
    adjustSingleWaterMaterial(material, _meshName);
  }
}

// 단일 Water 재질 조정 함수
function adjustSingleWaterMaterial(
  material: THREE.Material,
  _meshName: string
): void {
  // MeshStandardMaterial 또는 MeshPhysicalMaterial인 경우
  if (
    material instanceof THREE.MeshStandardMaterial ||
    material instanceof THREE.MeshPhysicalMaterial
  ) {
    // 물 효과를 위한 재질 설정
    material.metalness = 0.0; // 메탈릭 효과 제거
    material.roughness = 0.8; // 거친 표면으로 반사 감소
    material.transparent = true;
    material.opacity = 0.5; // 더 투명하게
    material.side = THREE.DoubleSide; // 양면 렌더링
    material.emissive = new THREE.Color(0x000000); // 발광 효과 제거
    material.envMapIntensity = 0.0; // 환경 반사 제거

    // 물 색상 설정 (파란색 계열)
    if (material.color) {
      // 기존 색상이 너무 어두운 경우 밝은 파란색으로 조정
      if (
        material.color.r < 0.2 &&
        material.color.g < 0.2 &&
        material.color.b < 0.2
      ) {
        material.color.setRGB(0.2, 0.6, 0.9); // 밝은 파란색
      } else {
        // 기존 색상을 보존하면서 약간 밝게 조정
        material.color.setRGB(
          Math.min(material.color.r * 1.2, 1.0),
          Math.min(material.color.g * 1.2, 1.0),
          Math.min(material.color.b * 1.2, 1.0)
        );
      }
    }
  }

  // MeshLambertMaterial인 경우
  else if (material instanceof THREE.MeshLambertMaterial) {
    material.transparent = true;
    material.opacity = 0.5;
    material.side = THREE.DoubleSide;
    material.emissive = new THREE.Color(0x000000); // 발광 효과 제거

    if (material.color) {
      if (
        material.color.r < 0.2 &&
        material.color.g < 0.2 &&
        material.color.b < 0.2
      ) {
        material.color.setRGB(0.2, 0.6, 0.9);
      } else {
        material.color.setRGB(
          Math.min(material.color.r * 1.2, 1.0),
          Math.min(material.color.g * 1.2, 1.0),
          Math.min(material.color.b * 1.2, 1.0)
        );
      }
    }
  }

  // MeshBasicMaterial인 경우
  else if (material instanceof THREE.MeshBasicMaterial) {
    material.transparent = true;
    material.opacity = 0.5;
    material.side = THREE.DoubleSide;
    material.lights = false; // 조명 반응 비활성화

    if (material.color) {
      if (
        material.color.r < 0.2 &&
        material.color.g < 0.2 &&
        material.color.b < 0.2
      ) {
        material.color.setRGB(0.2, 0.6, 0.9);
      } else {
        material.color.setRGB(
          Math.min(material.color.r * 1.2, 1.0),
          Math.min(material.color.g * 1.2, 1.0),
          Math.min(material.color.b * 1.2, 1.0)
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
