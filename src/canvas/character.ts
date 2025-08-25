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
  speed: number;
  isMoving: boolean;
  targetPosition?: THREE.Vector3;
}

// 캐릭터 매니저 클래스
export class CharacterManager {
  private characters: Map<string, Character> = new Map();
  private scene: THREE.Scene;
  private clock: THREE.Clock;

  constructor(scene: THREE.Scene) {
    this.scene = scene;
    this.clock = new THREE.Clock();
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
      console.log(`위치:`, position);
      console.log(`스케일:`, scale);

      const gltf = await loadGLBModel(modelPath);
      console.log("GLTF 로드 완료:", gltf);

      const model = addGLBModelToScene(this.scene, gltf);
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

      // 모델 설정 - 위치를 카메라 앞으로 조정
      model.position.copy(position);
      model.scale.copy(scale);
      model.castShadow = true;
      model.receiveShadow = true;

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
        speed: 0.5, // 더 적절한 이동 속도로 조정
        isMoving: false,
      };

      // 기본 애니메이션 재생 (있는 경우)
      if (animations.length > 0) {
        character.currentAnimation = animations[0];
        character.currentAnimation.play();
      }

      this.characters.set(characterId, character);
      console.log(`캐릭터 로드 완료: ${characterId}`);

      return character;
    } catch (error) {
      console.error(`캐릭터 로드 실패: ${characterId}`, error);
      return null;
    }
  }

  // 캐릭터 이동
  moveCharacter(characterId: string, targetPosition: THREE.Vector3): void {
    const character = this.characters.get(characterId);
    if (!character) {
      console.error(`캐릭터를 찾을 수 없습니다: ${characterId}`);
      return;
    }

    character.targetPosition = targetPosition.clone();
    character.isMoving = true;

    // 이동 방향 계산
    const direction = targetPosition.clone().sub(character.position);
    const angle = Math.atan2(direction.x, direction.z);
    character.rotation.y = angle;

    // 이동 애니메이션 재생 (있는 경우)
    this.playAnimation(characterId, "walk");
  }

  // 캐릭터 정지
  stopCharacter(characterId: string): void {
    const character = this.characters.get(characterId);
    if (!character) return;

    character.isMoving = false;
    character.targetPosition = undefined;

    // 정지 애니메이션 재생 (있는 경우)
    this.playAnimation(characterId, "idle");
  }

  // 애니메이션 재생
  playAnimation(characterId: string, animationName: string): void {
    const character = this.characters.get(characterId);
    if (!character || !character.mixer) return;

    // 현재 애니메이션 정지
    if (character.currentAnimation) {
      character.currentAnimation.stop();
    }

    // 새로운 애니메이션 찾기
    const animation = character.animations.find((action) => action.getClip().name.toLowerCase().includes(animationName.toLowerCase()));

    if (animation) {
      character.currentAnimation = animation;
      animation.reset();
      animation.play();
      console.log(`캐릭터 애니메이션 재생: ${characterId} - ${animationName}`);
    } else {
      console.warn(`애니메이션을 찾을 수 없습니다: ${animationName}`);
    }
  }

  // 캐릭터 회전
  rotateCharacter(characterId: string, rotation: THREE.Euler): void {
    const character = this.characters.get(characterId);
    if (!character) return;

    character.rotation.copy(rotation);
    character.model.rotation.copy(rotation);
  }

  // 캐릭터 크기 조정
  scaleCharacter(characterId: string, scale: THREE.Vector3): void {
    const character = this.characters.get(characterId);
    if (!character) return;

    character.scale.copy(scale);
    character.model.scale.copy(scale);
  }

  // 캐릭터 속도 설정
  setCharacterSpeed(characterId: string, speed: number): void {
    const character = this.characters.get(characterId);
    if (!character) return;

    character.speed = speed;
  }

  // 캐릭터 가져오기
  getCharacter(characterId: string): Character | undefined {
    return this.characters.get(characterId);
  }

  // 모든 캐릭터 가져오기
  getAllCharacters(): Character[] {
    return Array.from(this.characters.values());
  }

  // 캐릭터 제거
  removeCharacter(characterId: string): void {
    const character = this.characters.get(characterId);
    if (!character) return;

    // 애니메이션 믹서 정리
    if (character.mixer) {
      character.mixer.stopAllAction();
    }

    // 씬에서 모델 제거
    this.scene.remove(character.model);

    // 캐릭터 맵에서 제거
    this.characters.delete(characterId);
    console.log(`캐릭터 제거됨: ${characterId}`);
  }

  // 업데이트 (애니메이션 및 이동 처리)
  update(): void {
    const deltaTime = this.clock.getDelta();

    this.characters.forEach((character) => {
      // 애니메이션 믹서 업데이트
      if (character.mixer) {
        character.mixer.update(deltaTime);
      }

      // 이동 처리
      if (character.isMoving && character.targetPosition) {
        const direction = character.targetPosition.clone().sub(character.position);
        const distance = direction.length();

        if (distance > 0.1) {
          // 이동
          direction.normalize();
          const movement = direction.multiplyScalar(character.speed * deltaTime);
          character.position.add(movement);
          character.model.position.copy(character.position);

          // 이동 방향으로 회전
          const angle = Math.atan2(direction.x, direction.z);
          character.rotation.y = angle;
          character.model.rotation.y = angle;
        } else {
          // 목표 지점 도달
          character.position.copy(character.targetPosition);
          character.model.position.copy(character.position);
          character.isMoving = false;
          character.targetPosition = undefined;

          // 정지 애니메이션 재생
          this.playAnimation(character.id, "idle");
        }
      }
    });
  }

  // 키보드 입력으로 캐릭터 조작
  handleKeyboardInput(characterId: string, keys: Set<string>): void {
    const character = this.characters.get(characterId);
    if (!character) return;

    const moveSpeed = character.speed; // 기본 속도 사용
    let moved = false;
    let targetPosition = character.position.clone();

    // WASD 키 입력 처리 (소문자만 처리, 대소문자 구분 없음)
    if (keys.has("w")) {
      targetPosition.z -= moveSpeed;
      moved = true;
    }
    if (keys.has("s")) {
      targetPosition.z += moveSpeed;
      moved = true;
    }
    if (keys.has("a")) {
      targetPosition.x -= moveSpeed;
      moved = true;
    }
    if (keys.has("d")) {
      targetPosition.x += moveSpeed;
      moved = true;
    }

    if (moved) {
      // 이동 방향으로 즉시 회전
      const direction = targetPosition.clone().sub(character.position);
      if (direction.length() > 0.01) {
        const angle = Math.atan2(direction.x, direction.z);
        character.rotation.y = angle;
        character.model.rotation.y = angle;
      }

      // 즉시 위치 업데이트 (부드러운 이동 대신 즉시 반응)
      character.position.copy(targetPosition);
      character.model.position.copy(targetPosition);

      // 이동 애니메이션 재생
      this.playAnimation(characterId, "walk");
    } else {
      // 정지 시 idle 애니메이션 재생
      this.playAnimation(characterId, "idle");
    }
  }
}

// 캐릭터 로더 유틸리티
export class CharacterLoader {
  private static characterModels = {
    cat: "/models/character/cat_ps1_low_poly_rigged.glb",
    dog: "/models/character/low_poly_dog.glb",
    fox: "/models/character/low_poly_fox.glb",
    hamster: "/models/character/hamster.glb",
    rabbit: "/models/character/rabbit.glb",
    wolf: "/models/character/wolf.glb",
  };

  // 사용 가능한 캐릭터 목록 반환
  static getAvailableCharacters(): string[] {
    return Object.keys(this.characterModels);
  }

  // 캐릭터 모델 경로 가져오기
  static getCharacterModelPath(characterType: string): string | null {
    return this.characterModels[characterType as keyof typeof this.characterModels] || null;
  }

  // 랜덤 캐릭터 타입 선택
  static getRandomCharacterType(): string {
    const characters = this.getAvailableCharacters();
    return characters[Math.floor(Math.random() * characters.length)];
  }
}
