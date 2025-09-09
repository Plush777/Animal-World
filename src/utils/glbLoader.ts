import * as THREE from "three";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";

// GLB 파일 캐시 시스템
interface CachedGLB {
  gltf: any;
  loadTime: number;
  accessCount: number;
  lastAccess: number;
}

class GLBCache {
  private cache: Map<string, CachedGLB> = new Map();
  private maxCacheSize = 20; // 최대 캐시 항목 수
  private maxCacheAge = 30 * 60 * 1000; // 30분

  public get(path: string): any | null {
    const cacheKey = this.getCacheKey(path);
    const cached = this.cache.get(cacheKey);

    if (cached) {
      // 캐시 히트 - 접근 정보 업데이트
      cached.accessCount++;
      cached.lastAccess = Date.now();
      console.log(`GLB 캐시 히트: ${path} (접근 횟수: ${cached.accessCount})`);

      // 새로운 씬 복사본 반환 (원본 보호)
      return this.cloneGLTF(cached.gltf);
    }

    return null;
  }

  public set(path: string, gltf: any): void {
    const cacheKey = this.getCacheKey(path);

    // 캐시 크기 관리
    this.cleanupCache();

    // 원본을 직접 저장하여 텍스처 참조 유지
    this.cache.set(cacheKey, {
      gltf: gltf, // 원본 GLTF 직접 저장 (텍스처 참조 유지)
      loadTime: Date.now(),
      accessCount: 1,
      lastAccess: Date.now(),
    });

    console.log(`GLB 캐시 저장: ${path} (캐시 크기: ${this.cache.size})`);
  }

  private getCacheKey(path: string): string {
    // 캐시 버스팅 파라미터 제거하여 실제 파일 경로로 키 생성
    return path.split("?")[0];
  }

  private cloneGLTF(gltf: any): any {
    // GLTF 객체의 깊은 복사본 생성
    const cloned = {
      ...gltf,
      scene: gltf.scene.clone(true),
    };

    // 애니메이션이 있는 경우 복사
    if (gltf.animations && gltf.animations.length > 0) {
      cloned.animations = gltf.animations.map((anim: any) => anim.clone());
    }

    // 텍스처와 재질 참조 복원
    this.restoreMaterialsAndTextures(cloned.scene, gltf.scene);

    return cloned;
  }

  private restoreMaterialsAndTextures(clonedNode: THREE.Object3D, originalNode: THREE.Object3D): void {
    // 원본과 복사본을 매핑하여 재질과 텍스처 복원
    const originalMeshes: THREE.Mesh[] = [];
    const clonedMeshes: THREE.Mesh[] = [];

    // 원본 메시들 수집
    originalNode.traverse((child) => {
      if (child instanceof THREE.Mesh) {
        originalMeshes.push(child);
      }
    });

    // 복사본 메시들 수집
    clonedNode.traverse((child) => {
      if (child instanceof THREE.Mesh) {
        clonedMeshes.push(child);
      }
    });

    // 메시 개수가 일치하는 경우에만 재질 복원
    if (originalMeshes.length === clonedMeshes.length) {
      for (let i = 0; i < originalMeshes.length; i++) {
        const originalMesh = originalMeshes[i];
        const clonedMesh = clonedMeshes[i];

        if (originalMesh.material && clonedMesh.material) {
          // 원본 재질을 그대로 사용 (텍스처 참조 유지)
          if (Array.isArray(originalMesh.material)) {
            clonedMesh.material = originalMesh.material.slice(); // 배열 복사
          } else {
            clonedMesh.material = originalMesh.material; // 재질 참조 복사
          }

          // 재질 업데이트 플래그 설정
          const materials = Array.isArray(clonedMesh.material) ? clonedMesh.material : [clonedMesh.material];
          materials.forEach((mat: THREE.Material) => {
            if (mat) {
              mat.needsUpdate = true;
            }
          });
        }
      }
    }
  }

  private cleanupCache(): void {
    const now = Date.now();

    // 오래된 캐시 항목 제거
    for (const [key, cached] of this.cache.entries()) {
      if (now - cached.lastAccess > this.maxCacheAge) {
        this.cache.delete(key);
        console.log(`GLB 캐시 만료 제거: ${key}`);
      }
    }

    // 캐시 크기 초과 시 가장 적게 사용된 항목 제거
    if (this.cache.size >= this.maxCacheSize) {
      const entries = Array.from(this.cache.entries());
      entries.sort((a, b) => a[1].accessCount - b[1].accessCount);

      const toRemove = entries.slice(0, Math.ceil(this.maxCacheSize * 0.2)); // 20% 제거
      for (const [key] of toRemove) {
        this.cache.delete(key);
        console.log(`GLB 캐시 크기 초과 제거: ${key}`);
      }
    }
  }

  public clear(): void {
    this.cache.clear();
    console.log("GLB 캐시 전체 정리 완료");
  }

  public getStats(): { size: number; keys: string[] } {
    return {
      size: this.cache.size,
      keys: Array.from(this.cache.keys()),
    };
  }
}

// 전역 GLB 캐시 인스턴스
const glbCache = new GLBCache();
(window as any).glbCache = glbCache;

// 전역 GLTFLoader 사용 (캐시 관리를 위해)
const getGLTFLoader = (): GLTFLoader => {
  if ((window as any).gltfLoader && (window as any).gltfLoader instanceof GLTFLoader) {
    return (window as any).gltfLoader;
  }
  // fallback: 새 인스턴스 생성 및 전역 등록
  console.log("GLTFLoader가 없거나 유효하지 않습니다. 새 인스턴스를 생성합니다.");
  const newLoader = new GLTFLoader();
  (window as any).gltfLoader = newLoader;
  return newLoader;
};

export function loadGLBModel(
  path: string,
  onLoad?: (gltf: any) => void,
  onProgress?: (event: ProgressEvent) => void,
  onError?: (error: Error) => void
): Promise<any> {
  return new Promise((resolve, reject) => {
    // 캐시에서 먼저 확인
    const cachedGLTF = glbCache.get(path);
    if (cachedGLTF) {
      console.log(`GLB 모델 캐시에서 로드: ${path}`);

      // 캐시된 모델의 재질과 텍스처 상태 확인 및 복원
      cachedGLTF.scene.traverse((child: any) => {
        if (child instanceof THREE.Mesh && child.material) {
          const materials = Array.isArray(child.material) ? child.material : [child.material];
          materials.forEach((mat: any) => {
            if (mat) {
              // 재질 업데이트 강제
              mat.needsUpdate = true;

              // 텍스처가 있고 이미지 데이터가 유효한 경우에만 업데이트
              const textureProperties = ["map", "normalMap", "roughnessMap", "metalnessMap", "aoMap", "emissiveMap"];
              textureProperties.forEach((prop) => {
                const texture = mat[prop];
                if (texture && texture instanceof THREE.Texture && texture.image && texture.image !== null) {
                  texture.needsUpdate = true;
                }
              });

              // 기본 색상 확인 (검은색으로 바뀐 경우 복원)
              // 단, 캐릭터 모델의 경우 원래 검은색이어야 하는 부분(눈 등)은 보존
              if (mat.color && mat.color.getHex() === 0x000000) {
                // 캐릭터 모델의 특정 부위인지 확인
                const isCharacterMesh =
                  path.includes("character") &&
                  child.name &&
                  (child.name.toLowerCase().includes("eye") ||
                    child.name.toLowerCase().includes("pupil") ||
                    child.name.toLowerCase().includes("nose") ||
                    child.name.toLowerCase().includes("spot"));
                if (!isCharacterMesh) {
                  mat.color.setHex(0xffffff); // 캐릭터의 특정 부위가 아닌 경우만 흰색으로 복원
                }
              }
            }
          });
        }
      });

      // UI 업데이트
      if (window.LoadingUI) {
        window.LoadingUI.updateProgressText(`${path.split("/").pop()?.replace(".glb", "")} 캐시에서 로드됨`);
        window.LoadingUI.onModelLoaded();
      }

      // 콜백 호출
      if (onLoad) onLoad(cachedGLTF);
      resolve(cachedGLTF);
      return;
    }

    // 로딩 시작을 즉시 알림
    if (window.LoadingUI) {
      window.LoadingUI.updateProgressText(`${path.split("/").pop()?.replace(".glb", "")} 로딩 중...`);
    }

    // 캐시 버스팅을 위한 타임스탬프 추가 (개발 모드에서만, 캐시 미스 시에만)
    let finalPath = path;
    if (process.env.NODE_ENV === "development" || (window as any).clearCacheEnabled) {
      const separator = path.includes("?") ? "&" : "?";
      finalPath = `${path}${separator}_cache=${Date.now()}`;
    }

    getGLTFLoader().load(
      finalPath,
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
                    if (mat instanceof THREE.MeshStandardMaterial || mat instanceof THREE.MeshPhysicalMaterial) {
                      mat.shadowSide = THREE.FrontSide;
                    }
                  });
                } else {
                  if (child.material instanceof THREE.MeshStandardMaterial || child.material instanceof THREE.MeshPhysicalMaterial) {
                    child.material.shadowSide = THREE.FrontSide;
                  }
                }
              }

              // 나무 모델의 재질을 초록색으로 조정하고 충돌 감지 비활성화
              if (path.includes("low_poly_trees")) {
                console.log(`나무 모델 발견: ${child.name}`);
                adjustTreeMaterial(child.material);
                // 캐릭터가 오브젝트로 인식하지 않도록 물리 속성 비활성화
                child.userData.isCollidable = false;
                child.userData.isTerrain = false;
              }
              // floating island 모델의 재질 조정 (색상 보존) 및 충돌 감지 비활성화
              else if (path.includes("low_poly_floating_island")) {
                console.log(`Floating Island 모델 발견: ${child.name}`);
                console.log(`재질 색상:`, child.material.color);
                console.log(`그림자 설정 - castShadow: ${child.castShadow}, receiveShadow: ${child.receiveShadow}`);
                // adjustFloatingIslandMaterial(child.material, child.name);

                // Floating Island 모델에 대해 추가 그림자 설정
                child.castShadow = true;
                child.receiveShadow = true;

                // 캐릭터가 오브젝트로 인식하지 않도록 물리 속성 비활성화
                child.userData.isCollidable = false;
                child.userData.isTerrain = false;
              }
              // water 모델의 재질 조정 (물 효과를 위한 투명도와 반사 설정)
              else if (path.includes("water")) {
                console.log(`Water 모델 발견: ${child.name}`);
                adjustWaterMaterial(child.material, child.name);

                // 물 모델에 대해 그림자 설정
                child.castShadow = false; // 물은 그림자를 드리지 않음
                child.receiveShadow = true; // 물은 그림자를 받음
              }
              // triple trees 모델의 충돌 감지 비활성화
              else if (path.includes("low_poly_triple_trees")) {
                console.log(`Triple Trees 모델 발견: ${child.name}`);
                // 캐릭터가 오브젝트로 인식하지 않도록 물리 속성 비활성화
                child.userData.isCollidable = false;
                child.userData.isTerrain = false;
              }
              // night_sky_scene 모델의 재질 조정 (밤 하늘 배경 보존)
              else if (path.includes("night_sky_scene")) {
                console.log(`Night Sky Scene 모델 발견: ${child.name}`);
                adjustNightSkyMaterial(child.material, child.name);

                // 밤 하늘 배경은 그림자 설정 없음
                child.castShadow = false;
                child.receiveShadow = false;

                // 밤 하늘 배경에 특별한 조명 처리
                if (child.material) {
                  if (Array.isArray(child.material)) {
                    child.material.forEach((mat) => {
                      // 밤 하늘 배경의 밝기와 색상 보존
                      if (mat.color) {
                        console.log(`Night Sky Scene 원본 색상: ${mat.color.getHexString()}`);
                      }
                      mat.needsUpdate = true;
                    });
                  } else {
                    if (child.material.color) {
                      console.log(`Night Sky Scene 원본 색상: ${child.material.color.getHexString()}`);
                    }
                    child.material.needsUpdate = true;
                  }
                }
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

          // 후처리 완료 후 캐시에 저장
          glbCache.set(path, gltf);

          if (onLoad) onLoad(gltf);
          resolve(gltf);
        } catch (error) {
          console.error(`GLB 모델 후처리 중 오류 발생: ${path}`, error);
          // 후처리에서 오류가 발생해도 모델 자체는 로드 성공으로 처리

          // 오류가 발생해도 캐시에 저장 (후처리 실패해도 기본 모델은 사용 가능)
          glbCache.set(path, gltf);

          if (onLoad) onLoad(gltf);
          resolve(gltf);
        }
      },
      (progress) => {
        console.log(`GLB 모델 로드 진행률: ${path}`, ((progress.loaded / progress.total) * 100).toFixed(2) + "%");

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
  if (material instanceof THREE.MeshStandardMaterial || material instanceof THREE.MeshPhysicalMaterial) {
    material.metalness = 0.0; // 메탈릭 없음
    material.roughness = 0.8; // 적당한 러프니스
    material.transparent = false;
    material.opacity = 1.0;

    // 나무를 초록색으로 설정
    if (material.color) {
      // 하얀색이나 회색인 경우 다양한 초록색 톤으로 변경
      if (material.color.r > 0.8 && material.color.g > 0.8 && material.color.b > 0.8) {
        // 랜덤하게 다양한 초록색 톤 적용
        const greenTones = [
          [0.2, 0.8, 0.2], // 밝은 초록색
          [0.3, 0.9, 0.3], // 더 밝은 초록색
          [0.4, 1.0, 0.4], // 연한 초록색
          [0.1, 0.7, 0.1], // 진한 초록색
          [0.5, 1.0, 0.5], // 연한 라임 초록색
        ];
        const randomTone = greenTones[Math.floor(Math.random() * greenTones.length)];
        material.color.setRGB(randomTone[0], randomTone[1], randomTone[2]);
      } else if (material.color.r > 0.6 && material.color.g > 0.6 && material.color.b > 0.6) {
        // 회색 톤인 경우도 초록색으로 변경
        const greenTones = [
          [0.2, 0.8, 0.2], // 밝은 초록색
          [0.3, 0.9, 0.3], // 더 밝은 초록색
          [0.4, 1.0, 0.4], // 연한 초록색
        ];
        const randomTone = greenTones[Math.floor(Math.random() * greenTones.length)];
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
      if (material.color.r > 0.8 && material.color.g > 0.8 && material.color.b > 0.8) {
        const greenTones = [
          [0.2, 0.8, 0.2], // 밝은 초록색
          [0.3, 0.9, 0.3], // 더 밝은 초록색
          [0.4, 1.0, 0.4], // 연한 초록색
          [0.1, 0.7, 0.1], // 진한 초록색
          [0.5, 1.0, 0.5], // 연한 라임 초록색
        ];
        const randomTone = greenTones[Math.floor(Math.random() * greenTones.length)];
        material.color.setRGB(randomTone[0], randomTone[1], randomTone[2]);
      } else if (material.color.r > 0.6 && material.color.g > 0.6 && material.color.b > 0.6) {
        const greenTones = [
          [0.2, 0.8, 0.2], // 밝은 초록색
          [0.3, 0.9, 0.3], // 더 밝은 초록색
          [0.4, 1.0, 0.4], // 연한 초록색
        ];
        const randomTone = greenTones[Math.floor(Math.random() * greenTones.length)];
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
      if (material.color.r > 0.8 && material.color.g > 0.8 && material.color.b > 0.8) {
        const greenTones = [
          [0.2, 0.8, 0.2], // 밝은 초록색
          [0.3, 0.9, 0.3], // 더 밝은 초록색
          [0.4, 1.0, 0.4], // 연한 초록색
          [0.1, 0.7, 0.1], // 진한 초록색
          [0.5, 1.0, 0.5], // 연한 라임 초록색
        ];
        const randomTone = greenTones[Math.floor(Math.random() * greenTones.length)];
        material.color.setRGB(randomTone[0], randomTone[1], randomTone[2]);
      } else if (material.color.r > 0.6 && material.color.g > 0.6 && material.color.b > 0.6) {
        const greenTones = [
          [0.2, 0.8, 0.2], // 밝은 초록색
          [0.3, 0.9, 0.3], // 더 밝은 초록색
          [0.4, 1.0, 0.4], // 연한 초록색
        ];
        const randomTone = greenTones[Math.floor(Math.random() * greenTones.length)];
        material.color.setRGB(randomTone[0], randomTone[1], randomTone[2]);
      }
    }
  }
}

// Water 재질을 조정하는 함수
function adjustWaterMaterial(material: THREE.Material | THREE.Material[], _meshName: string): void {
  if (Array.isArray(material)) {
    material.forEach((mat) => {
      adjustSingleWaterMaterial(mat, _meshName);
    });
  } else {
    adjustSingleWaterMaterial(material, _meshName);
  }
}

// Night Sky Scene 재질을 조정하는 함수
function adjustNightSkyMaterial(material: THREE.Material | THREE.Material[], _meshName: string): void {
  if (Array.isArray(material)) {
    material.forEach((mat) => {
      adjustSingleNightSkyMaterial(mat, _meshName);
    });
  } else {
    adjustSingleNightSkyMaterial(material, _meshName);
  }
}

// 단일 Night Sky Scene 재질 조정 함수
function adjustSingleNightSkyMaterial(material: THREE.Material, _meshName: string): void {
  // MeshStandardMaterial 또는 MeshPhysicalMaterial인 경우
  if (material instanceof THREE.MeshStandardMaterial || material instanceof THREE.MeshPhysicalMaterial) {
    material.metalness = 0.0;
    material.roughness = 0.9;
    material.transparent = false;
    material.opacity = 1.0;

    // 밤 하늘 배경의 원래 색상 보존 - 색상 조정하지 않음
    if (material.color) {
      // 원래 색상을 그대로 유지
      console.log(`Night Sky Scene 색상 보존: ${material.color.getHexString()}`);
    }
  }

  // MeshLambertMaterial인 경우
  else if (material instanceof THREE.MeshLambertMaterial) {
    material.transparent = false;
    material.opacity = 1.0;

    if (material.color) {
      // 원래 색상을 그대로 유지
      console.log(`Night Sky Scene Lambert 색상 보존: ${material.color.getHexString()}`);
    }
  }

  // MeshBasicMaterial인 경우
  else if (material instanceof THREE.MeshBasicMaterial) {
    material.transparent = false;
    material.opacity = 1.0;

    if (material.color) {
      // 원래 색상을 그대로 유지
      console.log(`Night Sky Scene Basic 색상 보존: ${material.color.getHexString()}`);
    }
  }
}

// 단일 Water 재질 조정 함수
function adjustSingleWaterMaterial(material: THREE.Material, _meshName: string): void {
  // MeshStandardMaterial 또는 MeshPhysicalMaterial인 경우
  if (material instanceof THREE.MeshStandardMaterial || material instanceof THREE.MeshPhysicalMaterial) {
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
      if (material.color.r < 0.2 && material.color.g < 0.2 && material.color.b < 0.2) {
        material.color.setRGB(0.2, 0.6, 0.9); // 밝은 파란색
      } else {
        // 기존 색상을 보존하면서 약간 밝게 조정
        material.color.setRGB(Math.min(material.color.r * 1.2, 1.0), Math.min(material.color.g * 1.2, 1.0), Math.min(material.color.b * 1.2, 1.0));
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
      if (material.color.r < 0.2 && material.color.g < 0.2 && material.color.b < 0.2) {
        material.color.setRGB(0.2, 0.6, 0.9);
      } else {
        material.color.setRGB(Math.min(material.color.r * 1.2, 1.0), Math.min(material.color.g * 1.2, 1.0), Math.min(material.color.b * 1.2, 1.0));
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
      if (material.color.r < 0.2 && material.color.g < 0.2 && material.color.b < 0.2) {
        material.color.setRGB(0.2, 0.6, 0.9);
      } else {
        material.color.setRGB(Math.min(material.color.r * 1.2, 1.0), Math.min(material.color.g * 1.2, 1.0), Math.min(material.color.b * 1.2, 1.0));
      }
    }
  }
}

export function addGLBModelToScene(scene: THREE.Scene, gltf: any, modelPath?: string): THREE.Group {
  const model = gltf.scene.clone(true); // 깊은 복사

  // 모델 경로에서 캐릭터 타입 확인
  const isCharacterModel =
    modelPath &&
    (modelPath.includes("character") ||
      modelPath.includes("fox") ||
      modelPath.includes("dog") ||
      modelPath.includes("cat") ||
      modelPath.includes("hamster") ||
      modelPath.includes("rabbit") ||
      modelPath.includes("wolf"));

  // 복사된 모델의 재질과 텍스처 확인 및 복원
  model.traverse((child: any) => {
    if (child instanceof THREE.Mesh && child.material) {
      const materials = Array.isArray(child.material) ? child.material : [child.material];
      materials.forEach((mat: any) => {
        if (mat) {
          // 재질 업데이트 강제
          mat.needsUpdate = true;

          // 텍스처가 있고 이미지 데이터가 유효한 경우에만 업데이트
          const textureProperties = ["map", "normalMap", "roughnessMap", "metalnessMap", "aoMap", "emissiveMap"];
          textureProperties.forEach((prop) => {
            const texture = mat[prop];
            if (texture && texture instanceof THREE.Texture && texture.image && texture.image !== null) {
              texture.needsUpdate = true;
            }
          });

          // 기본 색상 확인 (검은색으로 바뀐 경우 복원)
          // 단, 캐릭터 모델의 경우 원래 검은색이어야 하는 부분(눈 등)은 보존
          if (mat.color && mat.color.getHex() === 0x000000) {
            // 캐릭터 모델인지 확인 (경로 기반 + 메시 이름 기반)
            const isCharacterMesh =
              isCharacterModel ||
              (child.name &&
                (child.name.toLowerCase().includes("eye") ||
                  child.name.toLowerCase().includes("pupil") ||
                  child.name.toLowerCase().includes("nose") ||
                  model.name.toLowerCase().includes("character") ||
                  model.name.toLowerCase().includes("fox") ||
                  model.name.toLowerCase().includes("dog") ||
                  model.name.toLowerCase().includes("cat")));

            // fox 모델 디버깅을 위한 로그
            if (isCharacterModel && modelPath?.includes("fox")) {
              console.log("Fox 모델 재질 처리:", {
                modelPath: modelPath,
                modelName: model.name,
                meshName: child.name,
                isCharacterMesh: isCharacterMesh,
                currentColor: mat.color.getHexString(),
                willChangeToWhite: !isCharacterMesh,
              });
            }

            if (!isCharacterMesh) {
              mat.color.setHex(0xffffff); // 캐릭터의 특정 부위가 아닌 경우만 흰색으로 복원
            }
          }

          // 그림자 설정 확인
          if (child.castShadow === undefined) child.castShadow = true;
          if (child.receiveShadow === undefined) child.receiveShadow = true;
        }
      });
    }
  });

  scene.add(model);

  console.log(`GLB 모델을 씬에 추가했습니다 (텍스처 복원 완료):`, {
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

// 씬 모델의 경계 정보를 반환하는 함수
export function getSceneModelBounds(scene: THREE.Scene, modelName: string): THREE.Box3 | null {
  let targetModel: THREE.Object3D | null = null;

  scene.traverse((child) => {
    if (child.name === modelName || (child.userData && child.userData.modelName === modelName)) {
      targetModel = child;
    }
  });

  if (!targetModel) {
    console.warn(`모델을 찾을 수 없습니다: ${modelName}`);
    return null;
  }

  const box = new THREE.Box3();
  box.setFromObject(targetModel);
  return box;
}

// 씬 모델의 경계 크기와 중심점을 반환하는 함수
export function getSceneModelBoundaryInfo(
  scene: THREE.Scene,
  modelName: string
): {
  center: THREE.Vector3;
  size: THREE.Vector3;
  min: THREE.Vector3;
  max: THREE.Vector3;
} | null {
  const box = getSceneModelBounds(scene, modelName);

  if (!box) {
    return null;
  }

  const center = new THREE.Vector3();
  const size = new THREE.Vector3();
  const min = new THREE.Vector3();
  const max = new THREE.Vector3();

  box.getCenter(center);
  box.getSize(size);
  box.min.copy(min);
  box.max.copy(max);

  return {
    center,
    size,
    min,
    max,
  };
}
