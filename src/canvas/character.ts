import * as THREE from "three";
import { loadGLBModel, addGLBModelToScene } from "../utils/glbLoader";

// 캐릭터 타입 정의
export interface Character {
  id: string;
  model: THREE.Group;
  mixer?: THREE.AnimationMixer;
  animations: THREE.AnimationAction[];
  currentAnimation?: THREE.AnimationAction;
  position: THREE.Vector3;
  rotation: THREE.Euler;
  scale: THREE.Vector3;
}

// 캐릭터 매니저 클래스
export class CharacterManager {
  private characters: Map<string, Character> = new Map();
  private scene: THREE.Scene;
  private currentSelectedCharacterId: string | null = null; // 현재 선택된 캐릭터 ID 추가

  constructor(scene: THREE.Scene) {
    this.scene = scene;
  }

  // 캐릭터 모델 로드
  async loadCharacter(
    characterId: string,
    modelPath: string,
    position: THREE.Vector3 = new THREE.Vector3(0, 0, 0),
    scale: THREE.Vector3 = new THREE.Vector3(1, 1, 1),
    rotationOffset?: { x: number; y: number; z: number }
  ): Promise<Character | null> {
    try {
      console.log(`=== 캐릭터 매니저 로드 시작 ===`);
      console.log(`캐릭터 ID: ${characterId}`);
      console.log(`모델 경로: ${modelPath}`);
      console.log(`위치:`, position);
      console.log(`스케일:`, scale);

      const gltf = await loadGLBModel(modelPath);
      console.log("GLTF 로드 완료:", gltf);

      const model = addGLBModelToScene(this.scene, gltf, modelPath);
      console.log("모델을 scene에 추가 완료:", model);

      console.log(modelPath);

      // 캐릭터 모델의 재질 확인 및 조정 (모든 캐릭터에 대해 통일된 처리)
      model.traverse((child) => {
        if (child instanceof THREE.Mesh) {
          console.log(`[${characterId}] 캐릭터 메시 발견:`, child.name);
          console.log(`[${characterId}] 재질 정보:`, {
            material: child.material,
            visible: child.visible,
            castShadow: child.castShadow,
            receiveShadow: child.receiveShadow,
          });

          // 재질이 투명하거나 너무 어두운 경우 조정
          if (child.material) {
            if (Array.isArray(child.material)) {
              child.material.forEach((mat) => {
                // 모든 캐릭터에 대해 동일한 재질 처리
                if (mat.transparent && mat.opacity < 0.8) {
                  mat.opacity = 1.0;
                  mat.transparent = false;
                  console.log(`[${characterId}] 재질 투명도 수정:`, child.name);
                }

                mat.needsUpdate = true;
              });
            } else {
              // 투명도 수정
              if (child.material.transparent && child.material.opacity < 0.8) {
                child.material.opacity = 1.0;
                child.material.transparent = false;
                console.log(`[${characterId}] 재질 투명도 수정:`, child.name);
              }

              child.material.needsUpdate = true;
            }
          }

          // 메시 가시성 강제 설정
          child.visible = true;
          child.castShadow = true;
          child.receiveShadow = true;
        }
      });

      // 처음에 캐릭터가 로드될 때 position
      model.position.copy(position);
      model.scale.copy(scale);

      // 회전 오프셋 적용 (기본값 {0,0,0}이어도 적용)
      const finalRotationOffset = rotationOffset || { x: 0, y: 0, z: 0 };

      // 회전 적용 전 로그
      console.log(`회전 적용 전 - 모델 회전:`, {
        x: model.rotation.x,
        y: model.rotation.y,
        z: model.rotation.z,
      });

      // 회전 적용
      model.rotation.set(finalRotationOffset.x, finalRotationOffset.y, finalRotationOffset.z);

      // 회전 적용 후 로그
      console.log(`회전 적용 후 - 모델 회전:`, {
        x: model.rotation.x,
        y: model.rotation.y,
        z: model.rotation.z,
      });
      console.log(`캐릭터 회전 오프셋 적용:`, finalRotationOffset);

      model.castShadow = true;
      model.receiveShadow = true;

      // 모델의 월드 위치 계산
      const worldPosition = new THREE.Vector3();
      model.getWorldPosition(worldPosition);

      console.log("모델 위치 설정:", {
        localPosition: model.position,
        worldPosition: worldPosition,
        modelVisible: model.visible,
        modelParent: model.parent?.name || "no parent",
        modelChildren: model.children.length,
      });

      // 모델 전체의 가시성과 그림자 설정
      model.visible = true;
      model.castShadow = true;
      model.receiveShadow = true;

      // 모델 로드 완료 후 실제 위치 재확인
      const finalWorldPosition = new THREE.Vector3();
      model.getWorldPosition(finalWorldPosition);

      // 모델 구조 분석
      let meshCount = 0;
      let totalVertices = 0;
      const meshInfo: any[] = [];

      model.traverse((child) => {
        if (child instanceof THREE.Mesh) {
          meshCount++;
          const geometry = child.geometry;
          if (geometry) {
            const vertices = geometry.attributes.position?.count || 0;
            totalVertices += vertices;
            meshInfo.push({
              name: child.name,
              vertices: vertices,
              position: child.position,
              visible: child.visible,
              material: child.material?.type || "unknown",
            });
          }
        }
      });

      console.log(`[${characterId}] 모델 기본 설정 완료:`, {
        visible: model.visible,
        castShadow: model.castShadow,
        receiveShadow: model.receiveShadow,
        localPosition: model.position,
        worldPosition: finalWorldPosition,
        scale: model.scale,
        expectedPosition: position,
        positionMatch: model.position.equals(position),
        scaleMatch: model.scale.equals(scale),
        modelAnalysis: {
          meshCount: meshCount,
          totalVertices: totalVertices,
          meshInfo: meshInfo,
          modelPath: modelPath,
        },
      });

      // 위치와 스케일이 제대로 적용되지 않은 경우 강제로 다시 설정
      if (!model.position.equals(position)) {
        console.warn(`[${characterId}] 위치가 일치하지 않음! 강제로 다시 설정합니다.`);
        model.position.copy(position);
      }

      if (!model.scale.equals(scale)) {
        console.warn(`[${characterId}] 스케일이 일치하지 않음! 강제로 다시 설정합니다.`);
        model.scale.copy(scale);
      }

      console.log("모델 설정 완료:", {
        position: model.position,
        scale: model.scale,
        castShadow: model.castShadow,
        receiveShadow: model.receiveShadow,
        visible: model.visible,
      });

      // 바운딩 박스 계산 및 출력
      const box = new THREE.Box3().setFromObject(model);
      const size = box.getSize(new THREE.Vector3());
      const center = box.getCenter(new THREE.Vector3());

      console.log("캐릭터 바운딩 박스:", {
        min: box.min,
        max: box.max,
        size: size,
        center: center,
        modelPosition: model.position,
        worldCenter: center.clone().add(model.position),
        expectedPosition: position,
        positionDifference: {
          x: model.position.x - position.x,
          y: model.position.y - position.y,
          z: model.position.z - position.z,
        },
        scaleDifference: {
          x: model.scale.x - scale.x,
          y: model.scale.y - scale.y,
          z: model.scale.z - scale.z,
        },
      });

      // 애니메이션 믹서 생성
      let mixer: THREE.AnimationMixer | undefined;
      let animations: THREE.AnimationAction[] = [];

      if (gltf.animations && gltf.animations.length > 0) {
        mixer = new THREE.AnimationMixer(model);
        animations = gltf.animations.map((clip: THREE.AnimationClip) => {
          return mixer!.clipAction(clip);
        });
        console.log(`캐릭터 애니메이션 로드: ${animations.length}개`);
      }

      // 캐릭터 객체 생성
      const character: Character = {
        id: characterId,
        model,
        mixer,
        animations,
        position: position.clone(),
        rotation: new THREE.Euler(finalRotationOffset.x, finalRotationOffset.y, finalRotationOffset.z),
        scale: scale.clone(),
      };

      console.log(character);

      // 기본 애니메이션 재생 (있는 경우)
      if (animations.length > 0) {
        character.currentAnimation = animations[0];
        character.currentAnimation.play();
      }

      this.characters.set(characterId, character);

      // 현재 선택된 캐릭터로 설정 (첫 번째 캐릭터이거나 명시적으로 설정된 경우)
      if (!this.currentSelectedCharacterId || this.characters.size === 1) {
        this.currentSelectedCharacterId = characterId;
        console.log(`현재 선택된 캐릭터로 설정: ${characterId}`);
      }

      console.log(`캐릭터 로드 완료: ${characterId}`);

      return character;
    } catch (error) {
      console.error(`캐릭터 로드 실패: ${characterId}`, error);
      return null;
    }
  }

  // 캐릭터 가져오기
  getCharacter(characterId: string): Character | undefined {
    console.log("캐릭터 가져오기:", characterId);
    return this.characters.get(characterId);
  }

  // 모든 캐릭터 가져오기
  getAllCharacters(): Character[] {
    return Array.from(this.characters.values());
  }

  // 현재 선택된 캐릭터 가져오기
  getCurrentSelectedCharacter(): Character | null {
    if (this.currentSelectedCharacterId) {
      return this.characters.get(this.currentSelectedCharacterId) || null;
    }
    return null;
  }

  // 현재 선택된 캐릭터 ID 설정
  setCurrentSelectedCharacter(characterId: string): void {
    if (this.characters.has(characterId)) {
      this.currentSelectedCharacterId = characterId;
      console.log(`현재 선택된 캐릭터 변경: ${characterId}`);
    } else {
      console.warn(`존재하지 않는 캐릭터 ID: ${characterId}`);
    }
  }

  // 캐릭터 제거
  removeCharacter(characterId: string): void {
    const character = this.characters.get(characterId);
    if (!character) return;

    console.log(`캐릭터 제거 시작: ${characterId}`);

    // 애니메이션 믹서 정리
    if (character.mixer) {
      character.mixer.stopAllAction();
      character.mixer = undefined;
    }

    // 애니메이션 액션 정리
    if (character.animations) {
      character.animations.forEach((action) => {
        if (action) {
          action.stop();
        }
      });
      character.animations = [];
    }

    // 캐릭터 모델의 모든 메시와 재질 정리
    if (character.model) {
      character.model.traverse((child) => {
        if (child instanceof THREE.Mesh) {
          // 지오메트리 정리
          if (child.geometry) {
            child.geometry.dispose();
          }

          // 재질 정리
          if (child.material) {
            const materials = Array.isArray(child.material) ? child.material : [child.material];
            materials.forEach((material) => {
              // 텍스처 정리
              const textureProperties = ["map", "normalMap", "bumpMap", "roughnessMap", "metalnessMap", "aoMap", "emissiveMap"];
              textureProperties.forEach((prop) => {
                const texture = material[prop];
                if (texture && texture instanceof THREE.Texture) {
                  texture.dispose();
                }
              });

              // 재질 정리
              material.dispose();
            });
          }
        }
      });

      // 씬에서 모델 제거
      this.scene.remove(character.model);
    }

    // 현재 선택된 캐릭터였다면 선택 해제
    if (this.currentSelectedCharacterId === characterId) {
      this.currentSelectedCharacterId = null;
      console.log(`선택된 캐릭터 해제: ${characterId}`);
    }

    // 캐릭터 맵에서 제거
    this.characters.delete(characterId);
    console.log(`캐릭터 제거 완료: ${characterId}`);
  }

  // 캐릭터 위치를 외부에서 직접 설정하는 메서드 추가
  setCharacterPosition(characterId: string, position: THREE.Vector3): void {
    const character = this.characters.get(characterId);
    if (!character) {
      return;
    }

    // wasd 조작키로 움직이는 position
    character.model.position.copy(position);
    character.position.copy(position);

    // 모델의 월드 매트릭스 업데이트 강제 실행
    character.model.updateMatrixWorld(true);

    // 모든 자식 객체의 매트릭스도 업데이트
    character.model.traverse((child) => {
      if (child instanceof THREE.Object3D) {
        child.updateMatrixWorld(true);
      }
    });

    // 모델의 월드 위치 계산
    const worldPosition = new THREE.Vector3();
    character.model.getWorldPosition(worldPosition);

    // 씬에 있는 모든 캐릭터 모델 확인
    const allModels: { name: string; position: THREE.Vector3; visible: boolean }[] = [];
    character.model.parent?.traverse((child) => {
      if (child instanceof THREE.Mesh && child.name) {
        allModels.push({
          name: child.name,
          position: child.position,
          visible: child.visible,
        });
      }
    });
  }

  // 업데이트 (애니메이션과 물리 처리)
  update(_keys?: any): void {
    // 고정 deltaTime 사용 (더 안정적)
    const fixedDeltaTime = 1 / 60; // 60 FPS 기준

    this.characters.forEach((character) => {
      // 애니메이션 믹서 업데이트
      if (character.mixer) {
        character.mixer.update(fixedDeltaTime);
      }
    });
  }
}
