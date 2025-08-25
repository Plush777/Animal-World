// 캐릭터 기본 설정 (THREE 객체에 의존하지 않음)
export const characterScale = {
  default: {
    position: { x: 0, y: 100, z: 0 }, // 물 위로 올려서 위치
    scale: { x: 5, y: 5, z: 5 }, // 크기를 5배로 확대
  },
  // 개별 캐릭터별 설정 (필요시)
  dog: {
    position: { x: 0, y: 100, z: 0 },
    scale: { x: 5, y: 5, z: 5 },
  },
  fox: {
    position: { x: 40, y: 110, z: 70 },
    scale: { x: 10, y: 10, z: 10 },
  },
  cat: {
    position: { x: 0, y: 100, z: 0 },
    scale: { x: 5, y: 5, z: 5 },
  },
  hamster: {
    position: { x: 0, y: 100, z: 0 },
    scale: { x: 5, y: 5, z: 5 },
  },
  rabbit: {
    position: { x: 0, y: 100, z: 0 },
    scale: { x: 5, y: 5, z: 5 },
  },
  wolf: {
    position: { x: 0, y: 100, z: 0 },
    scale: { x: 5, y: 5, z: 5 },
  },
};

// 캐릭터 설정을 가져오는 헬퍼 함수
export function getCharacterSettings(characterId?: string) {
  if (characterId && characterScale[characterId as keyof typeof characterScale]) {
    return characterScale[characterId as keyof typeof characterScale];
  }
  return characterScale.default;
}

// THREE.Vector3 객체로 변환하는 헬퍼 함수
export function createVector3FromSettings(settings: any) {
  if (typeof (window as any).THREE !== "undefined") {
    return new (window as any).THREE.Vector3(settings.position.x, settings.position.y, settings.position.z);
  }
  return settings.position;
}

export function createScaleFromSettings(settings: any) {
  if (typeof (window as any).THREE !== "undefined") {
    return new (window as any).THREE.Vector3(settings.scale.x, settings.scale.y, settings.scale.z);
  }
  return settings.scale;
}
