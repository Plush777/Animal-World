export const characterScale = {
  default: {
    scale: { x: 10, y: 10, z: 10 },
  },

  dog: {
    scale: { x: 12, y: 12, z: 12 }, // 여우와 동일한 크기로 조정
  },
  fox: {
    scale: { x: 10, y: 10, z: 10 },
  },
  cat: {
    scale: { x: 12, y: 12, z: 12 }, // 여우와 동일한 크기로 조정
  },
  hamster: {
    scale: { x: 10, y: 10, z: 10 },
  },
  rabbit: {
    scale: { x: 10, y: 10, z: 10 },
  },
  wolf: {
    scale: { x: 10, y: 10, z: 10 },
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
