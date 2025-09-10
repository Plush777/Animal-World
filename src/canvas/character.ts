import * as THREE from "three";
import { loadGLBModel, addGLBModelToScene } from "../utils/glbLoader";

// Ammo.js 타입 정의
declare global {
  interface Window {
    Ammo: any;
  }
}

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
  // 물리 관련 속성 추가
  physicsBody?: any; // Ammo.js ghost object
  physicsController?: any; // Ammo.js character controller
}

// 캐릭터 매니저 클래스
export class CharacterManager {
  private characters: Map<string, Character> = new Map();
  private scene: THREE.Scene;
  private physicsWorld: any; // Ammo.js physics world
  private currentSelectedCharacterId: string | null = null; // 현재 선택된 캐릭터 ID 추가

  constructor(scene: THREE.Scene, physicsWorld?: any) {
    this.scene = scene;
    this.physicsWorld = physicsWorld;
  }

  // 캐릭터 모델 로드
  async loadCharacter(
    characterId: string,
    modelPath: string,
    position: THREE.Vector3 = new THREE.Vector3(0, 0, 0),
    scale: THREE.Vector3 = new THREE.Vector3(1, 1, 1)
  ): Promise<Character | null> {
    try {
      console.log(`=== 캐릭터 매니저 로드 시작 ===`);
      console.log(`캐릭터 ID: ${characterId}`);
      console.log(`모델 경로: ${modelPath}`);
      // console.log(`위치:`, position);
      console.log(`스케일:`, scale);

      const gltf = await loadGLBModel(modelPath);
      console.log("GLTF 로드 완료:", gltf);

      const model = addGLBModelToScene(this.scene, gltf, modelPath);
      console.log("모델을 scene에 추가 완료:", model);

      // 캐릭터 모델의 재질 확인 및 조정
      model.traverse((child) => {
        if (child instanceof THREE.Mesh) {
          console.log("캐릭터 메시 발견:", child.name);
          console.log("재질 정보:", {
            material: child.material,
            visible: child.visible,
            castShadow: child.castShadow,
            receiveShadow: child.receiveShadow,
          });

          // 재질이 투명하거나 너무 어두운 경우 조정
          if (child.material) {
            if (Array.isArray(child.material)) {
              child.material.forEach((mat) => {
                if (mat.transparent && mat.opacity < 0.5) {
                  mat.opacity = 1.0;
                  mat.transparent = false;
                }
                mat.needsUpdate = true;
              });
            } else {
              if (child.material.transparent && child.material.opacity < 0.5) {
                child.material.opacity = 1.0;
                child.material.transparent = false;
              }
              child.material.needsUpdate = true;
            }
          }
        }
      });

      // 처음에 캐릭터가 로드될 때 position
      model.position.copy(position);
      model.scale.copy(scale);
      model.castShadow = true;
      model.receiveShadow = true;

      // 캐릭터가 지면 위에 확실히 위치하도록 조정 (더 높은 위치로 설정)
      if (model.position.y < 15) {
        model.position.y = Math.max(15, position.y);
        console.log(`캐릭터 ${characterId} 위치를 지면 위로 조정: y = ${model.position.y}`);
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

      console.log("캐릭터 바운딩 박스:", {
        min: box.min,
        max: box.max,
        size: size,
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
        rotation: new THREE.Euler(0, 0, 0),
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

    // 물리 바디가 있다면 물리 바디 위치도 업데이트
    if (character.physicsBody) {
      const Ammo = window.Ammo;
      if (Ammo) {
        const transform = character.physicsBody.getWorldTransform();
        transform.setOrigin(new Ammo.btVector3(position.x, position.y, position.z));
        character.physicsBody.setWorldTransform(transform);
      }
    }
  }

  // 캐릭터 물리 업데이트 (smoothCharacterController 사용 시 비활성화)
  updateCharacterPhysics(characterId: string, _keys: any, _deltaTime: number): void {
    const character = this.characters.get(characterId);
    if (!character || !character.physicsController || !character.physicsBody) {
      return;
    }

    return;
  }

  // 업데이트 (애니메이션과 물리 처리)
  update(keys?: any): void {
    // 고정 deltaTime 사용 (더 안정적)
    const fixedDeltaTime = 1 / 60; // 60 FPS 기준

    this.characters.forEach((character) => {
      // 애니메이션 믹서 업데이트
      if (character.mixer) {
        character.mixer.update(fixedDeltaTime);
      }

      // 물리 업데이트 (키 입력이 있고 물리 컨트롤러가 있는 경우)
      if (keys && character.physicsController) {
        this.updateCharacterPhysics(character.id, keys, fixedDeltaTime);
      }
    });
  }
}
