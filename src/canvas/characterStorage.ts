// 캐릭터 정보 인터페이스
export interface CharacterInfo {
  id: string;
  type: string;
  name: string;
  modelPath: string;
  isUnlocked: boolean;
  selectedAt: number;
}

// 사용 가능한 캐릭터 정의
export const AVAILABLE_CHARACTERS: CharacterInfo[] = [
  {
    id: "dog",
    type: "dog",
    name: "강아지",
    modelPath: "/models/character/low_poly_dog.glb",
    isUnlocked: true,
    selectedAt: 0,
  },
  {
    id: "fox",
    type: "fox",
    name: "여우",
    modelPath: "/models/character/low_poly_fox.glb",
    isUnlocked: true,
    selectedAt: 0,
  },
  {
    id: "cat",
    type: "cat",
    name: "고양이",
    modelPath: "/models/character/cat_ps1_low_poly_rigged.glb",
    isUnlocked: true,
    selectedAt: 0,
  },
  {
    id: "hamster",
    type: "hamster",
    name: "햄스터",
    modelPath: "/models/character/hamster.glb",
    isUnlocked: false,
    selectedAt: 0,
  },
  {
    id: "rabbit",
    type: "rabbit",
    name: "토끼",
    modelPath: "/models/character/rabbit.glb",
    isUnlocked: false,
    selectedAt: 0,
  },
  {
    id: "wolf",
    type: "wolf",
    name: "늑대",
    modelPath: "/models/character/wolf.glb",
    isUnlocked: false,
    selectedAt: 0,
  },
];

// 로컬스토리지 키
const CHARACTER_STORAGE_KEY = "animal_world_character";
const CHARACTER_SETTINGS_KEY = "animal_world_character_settings";

// 캐릭터 스토리지 관리 클래스
export class CharacterStorage {
  // 현재 선택된 캐릭터 가져오기
  static getCurrentCharacter(): CharacterInfo | null {
    try {
      const stored = localStorage.getItem(CHARACTER_STORAGE_KEY);
      if (!stored) return null;

      const characterData = JSON.parse(stored);
      return characterData as CharacterInfo;
    } catch (error) {
      console.error("캐릭터 정보 로드 실패:", error);
      return null;
    }
  }

  // 캐릭터 선택 및 저장
  static setCurrentCharacter(characterId: string): boolean {
    try {
      const character = AVAILABLE_CHARACTERS.find((c) => c.id === characterId);
      if (!character) {
        console.error(`캐릭터를 찾을 수 없습니다: ${characterId}`);
        return false;
      }

      if (!character.isUnlocked) {
        console.error(`캐릭터가 잠겨있습니다: ${characterId}`);
        return false;
      }

      const characterData: CharacterInfo = {
        ...character,
        selectedAt: Date.now(),
      };

      localStorage.setItem(CHARACTER_STORAGE_KEY, JSON.stringify(characterData));
      console.log(`캐릭터 선택됨: ${character.name}`);
      return true;
    } catch (error) {
      console.error("캐릭터 저장 실패:", error);
      return false;
    }
  }

  // 캐릭터 설정 정보 가져오기
  static getCharacterSettings(): CharacterInfo[] {
    try {
      const stored = localStorage.getItem(CHARACTER_SETTINGS_KEY);
      if (!stored) {
        // 기본 설정으로 초기화
        return AVAILABLE_CHARACTERS;
      }

      const settings = JSON.parse(stored);
      return settings as CharacterInfo[];
    } catch (error) {
      console.error("캐릭터 설정 로드 실패:", error);
      return AVAILABLE_CHARACTERS;
    }
  }

  // 캐릭터 설정 저장
  static saveCharacterSettings(settings: CharacterInfo[]): void {
    try {
      localStorage.setItem(CHARACTER_SETTINGS_KEY, JSON.stringify(settings));
      console.log("캐릭터 설정 저장됨");
    } catch (error) {
      console.error("캐릭터 설정 저장 실패:", error);
    }
  }

  // 캐릭터 잠금 해제
  static unlockCharacter(characterId: string): boolean {
    try {
      const settings = this.getCharacterSettings();
      const character = settings.find((c) => c.id === characterId);

      if (!character) {
        console.error(`캐릭터를 찾을 수 없습니다: ${characterId}`);
        return false;
      }

      character.isUnlocked = true;
      this.saveCharacterSettings(settings);
      console.log(`캐릭터 잠금 해제됨: ${character.name}`);
      return true;
    } catch (error) {
      console.error("캐릭터 잠금 해제 실패:", error);
      return false;
    }
  }

  // 캐릭터 잠금
  static lockCharacter(characterId: string): boolean {
    try {
      const settings = this.getCharacterSettings();
      const character = settings.find((c) => c.id === characterId);

      if (!character) {
        console.error(`캐릭터를 찾을 수 없습니다: ${characterId}`);
        return false;
      }

      character.isUnlocked = false;
      this.saveCharacterSettings(settings);
      console.log(`캐릭터 잠금됨: ${character.name}`);
      return true;
    } catch (error) {
      console.error("캐릭터 잠금 실패:", error);
      return false;
    }
  }

  // 사용 가능한 캐릭터 목록 가져오기
  static getAvailableCharacters(): CharacterInfo[] {
    return this.getCharacterSettings().filter((c) => c.isUnlocked);
  }

  // 잠긴 캐릭터 목록 가져오기
  static getLockedCharacters(): CharacterInfo[] {
    return this.getCharacterSettings().filter((c) => !c.isUnlocked);
  }

  // 캐릭터가 선택되어 있는지 확인
  static hasSelectedCharacter(): boolean {
    return this.getCurrentCharacter() !== null;
  }

  // 캐릭터 정보 초기화
  static clearCharacterData(): void {
    try {
      localStorage.removeItem(CHARACTER_STORAGE_KEY);
      localStorage.removeItem(CHARACTER_SETTINGS_KEY);
      console.log("캐릭터 데이터 초기화됨");
    } catch (error) {
      console.error("캐릭터 데이터 초기화 실패:", error);
    }
  }

  // 캐릭터 정보 가져오기 (ID로)
  static getCharacterById(characterId: string): CharacterInfo | undefined {
    return this.getCharacterSettings().find((c) => c.id === characterId);
  }

  // 캐릭터가 잠겨있는지 확인
  static isCharacterLocked(characterId: string): boolean {
    const character = this.getCharacterById(characterId);
    return character ? !character.isUnlocked : true;
  }
}
