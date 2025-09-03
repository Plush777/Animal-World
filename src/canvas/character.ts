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

  // GLTF_SceneRootNode 경계 설정
  private sceneBounds: {
    minX: number;
    maxX: number;
    minZ: number;
    maxZ: number;
  } = {
    minX: -50,
    maxX: 50,
    minZ: -50,
    maxZ: 50,
  };

  constructor(scene: THREE.Scene, physicsWorld?: any) {
    this.scene = scene;
    this.physicsWorld = physicsWorld;
  }

  // 모든 오브젝트 이름 출력 (디버깅용)
  public logAllObjectNames(): void {
    console.log("=== 모든 오브젝트 이름 출력 ===");
    this.scene.traverse((object) => {
      if (object instanceof THREE.Mesh) {
        console.log(
          `오브젝트: ${object.name}, 위치: ${object.position.x.toFixed(2)}, ${object.position.y.toFixed(2)}, ${object.position.z.toFixed(2)}`
        );
      }
    });
    console.log("=== 오브젝트 이름 출력 완료 ===");
  }

  // 씬 경계 정보 출력 (디버깅용)
  public logSceneBounds(): void {
    console.log("=== 씬 경계 정보 ===");
    console.log(`X축: ${this.sceneBounds.minX} ~ ${this.sceneBounds.maxX}`);
    console.log(`Z축: ${this.sceneBounds.minZ} ~ ${this.sceneBounds.maxZ}`);
    console.log("=== 씬 경계 정보 완료 ===");
  }

  // 경계 시각화 (디버깅용)
  public visualizeBounds(): void {
    // 기존 경계 시각화 제거
    this.scene.children.forEach((child) => {
      if (child.name === "bounds_visualization") {
        this.scene.remove(child);
      }
    });

    // 새로운 경계 시각화 생성
    const boundsGeometry = new THREE.EdgesGeometry(
      new THREE.BoxGeometry(this.sceneBounds.maxX - this.sceneBounds.minX, 10, this.sceneBounds.maxZ - this.sceneBounds.minZ)
    );
    const boundsMaterial = new THREE.LineBasicMaterial({ color: 0xff0000 });
    const boundsLines = new THREE.LineSegments(boundsGeometry, boundsMaterial);
    boundsLines.name = "bounds_visualization";
    boundsLines.position.set((this.sceneBounds.minX + this.sceneBounds.maxX) / 2, 5, (this.sceneBounds.minZ + this.sceneBounds.maxZ) / 2);

    this.scene.add(boundsLines);
    console.log("경계 시각화 추가됨");
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

      // 모델 설정 - 위치를 명확하게 설정
      model.position.copy(position);
      model.scale.copy(scale);
      model.castShadow = true;
      model.receiveShadow = true;

      // 캐릭터가 지면 위에 확실히 위치하도록 조정
      if (model.position.y < 10) {
        model.position.y = 10;
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

  // 캐릭터에 물리 바디 추가
  addPhysicsToCharacter(characterId: string): void {
    console.log(`물리 바디 추가 시작: ${characterId}`);

    const character = this.characters.get(characterId);
    if (!character) {
      console.error(`캐릭터를 찾을 수 없습니다: ${characterId}`);
      return;
    }

    if (!this.physicsWorld) {
      console.error("물리 월드가 초기화되지 않았습니다.");
      return;
    }

    const Ammo = window.Ammo;
    if (!Ammo) {
      console.warn("Ammo.js가 로드되지 않았습니다.");
      return;
    }

    // 캐릭터의 바운딩 박스 계산
    const box = new THREE.Box3().setFromObject(character.model);
    const size = box.getSize(new THREE.Vector3());

    console.log(`캐릭터 바운딩 박스: 크기=${size.x.toFixed(2)}, ${size.y.toFixed(2)}, ${size.z.toFixed(2)}`);

    // 캡슐 모양의 물리 바디 생성 (캐릭터 크기에 맞춤)
    const radius = Math.max(size.x, size.z) * 0.3;
    const height = size.y * 0.8;

    console.log(`물리 바디 크기: 반지름=${radius.toFixed(2)}, 높이=${height.toFixed(2)}`);

    // Ammo ghostObject 생성 (보이지 않는 물리 바디)
    const shape = new Ammo.btCapsuleShape(radius, height);
    const ghostObject = new Ammo.btPairCachingGhostObject();
    const transform = new Ammo.btTransform();
    transform.setIdentity();

    // 현재 캐릭터 모델 위치를 기준으로 물리 바디 위치 설정
    transform.setOrigin(
      new Ammo.btVector3(
        character.model.position.x,
        character.model.position.y + size.y * 0.5, // 모델 바닥에서 중심까지의 높이
        character.model.position.z
      )
    );

    ghostObject.setWorldTransform(transform);
    ghostObject.setCollisionShape(shape);

    // *** 중요: CF_NO_CONTACT_RESPONSE 플래그 제거하여 충돌 감지 활성화 ***
    ghostObject.setCollisionFlags(16); // CF_CHARACTER_OBJECT만 설정

    // Character controller 생성
    const stepHeight = 0.35;
    const characterController = new Ammo.btKinematicCharacterController(ghostObject, shape, stepHeight);
    characterController.setGravity(-9.8); // 음수로 설정 (아래쪽으로)

    // 물리 월드에 추가
    this.physicsWorld.addCollisionObject(ghostObject, 2, 1);
    this.physicsWorld.addAction(characterController);

    // 캐릭터에 물리 바디 저장
    character.physicsBody = ghostObject;
    character.physicsController = characterController;

    console.log(`캐릭터 ${characterId}에 물리 바디 추가 완료`);
    console.log(
      `모델 위치: (${character.model.position.x.toFixed(2)}, ${character.model.position.y.toFixed(2)}, ${character.model.position.z.toFixed(2)})`
    );
  }

  // 캐릭터 위치를 외부에서 직접 설정하는 메서드 추가
  setCharacterPosition(characterId: string, position: THREE.Vector3): void {
    const character = this.characters.get(characterId);
    if (!character) {
      return;
    }

    // 모델 위치 직접 설정
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

    // smoothCharacterController를 사용하는 경우 물리 업데이트 건너뛰기
    // animation.ts에서 위치 동기화가 처리됨
    if (Math.random() < 0.1) {
      // 10% 확률로만 로그 출력 (스팸 방지)
      console.log(`캐릭터 ${characterId} 물리 업데이트 건너뛰기 (smoothCharacterController 사용 중)`);
    }
    return;
  }

  // 물리 월드 설정
  setPhysicsWorld(physicsWorld: any): void {
    this.physicsWorld = physicsWorld;
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

    // 디버깅 로그 빈도 줄이기
    if (keys && Math.random() < 0.02) {
      // 2% 확률
      const pressedKeys = Object.keys(keys).filter((key) => keys[key]);
      if (pressedKeys.length > 0) {
        console.log("CharacterManager update - 활성 키:", pressedKeys);
        console.log("관리 중인 캐릭터 수:", this.characters.size);
      }
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
}
