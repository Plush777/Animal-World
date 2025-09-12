export const characterScale = {
  default: {
    x: 1,
    y: 1,
    z: 1,
    heightOffset: 10, // 지형에서의 높이 오프셋
    rotationOffset: { x: 0, y: 0, z: 0 }, // 회전
  },
  dog: {
    scale: { x: 0.3, y: 0.3, z: 0.3 },
    heightOffset: 10,
    rotationOffset: { x: 0, y: 0, z: 0 },
  },
  fox: {
    scale: { x: 10, y: 10, z: 10 },
    heightOffset: -2,
    rotationOffset: { x: 0, y: 0, z: 0 },
  },
  cat: {
    scale: { x: 3, y: 3, z: 3 },
    heightOffset: 10,
    rotationOffset: { x: 0, y: 0, z: 0 },
  },
  hamster: {
    scale: { x: 0.3, y: 0.3, z: 0.3 },
    heightOffset: 5,
    rotationOffset: { x: 0, y: 0, z: 0 },
  },
  rabbit: {
    scale: { x: 0.6, y: 0.6, z: 0.6 },
    heightOffset: 10,
    rotationOffset: { x: 0, y: 0, z: 0 },
  },
  wolf: {
    scale: { x: 2.5, y: 2.5, z: 2.5 },
    heightOffset: 0,
    rotationOffset: { x: 0, y: 0, z: 0 },
  },
};

// 모든 캐릭터가 공유하는 시작 위치 배열 (smoothCharacterController와 동일)
export const START_POSITIONS = [
  { x: 104.56, y: 88.87, z: 139.81 },
  { x: 169.63, y: 66.87, z: 189.27 },
  { x: 73.5, y: 110.65, z: 63.0 },
  { x: 134.81, y: 88.87, z: 68.44 },
  { x: 185.08, y: 44.65, z: 230.37 },
  { x: 38.86, y: 44.77, z: 216.85 },
];

// 랜덤 시작 위치를 반환하는 헬퍼 함수
export function getRandomStartPosition(): { x: number; y: number; z: number } {
  const randomIndex = Math.floor(Math.random() * START_POSITIONS.length);
  return START_POSITIONS[randomIndex];
}

// 캐릭터 설정을 가져오는 헬퍼 함수
export function getCharacterSettings(characterId?: string) {
  if (characterId && characterScale[characterId as keyof typeof characterScale]) {
    return characterScale[characterId as keyof typeof characterScale];
  }
  return characterScale.default;
}

// scale만 반환하는 헬퍼 함수 (position은 더 이상 사용하지 않음)
export function createScaleFromSettings(settings: any) {
  if (typeof (window as any).THREE !== "undefined") {
    return new (window as any).THREE.Vector3(settings.scale.x, settings.scale.y, settings.scale.z);
  }
  return settings.scale;
}

// 캐릭터별 높이 오프셋을 반환하는 헬퍼 함수
export function getCharacterHeightOffset(characterId?: string): number {
  if (characterId && characterScale[characterId as keyof typeof characterScale]) {
    return characterScale[characterId as keyof typeof characterScale].heightOffset || 0;
  }
  return characterScale.default.heightOffset || 0;
}

// 캐릭터별 회전 오프셋을 반환하는 헬퍼 함수
export function getCharacterRotationOffset(characterId?: string): { x: number; y: number; z: number } {
  if (characterId && characterScale[characterId as keyof typeof characterScale]) {
    return characterScale[characterId as keyof typeof characterScale].rotationOffset || { x: 0, y: 0, z: 0 };
  }
  return characterScale.default.rotationOffset || { x: 0, y: 0, z: 0 };
}
