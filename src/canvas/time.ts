const TEST_TIME: number | null = 8;

// const TEST_TIME: number | null = 8;   // 오전 8시 (낮 모드) 테스트
// const TEST_TIME: number | null = 20;  // 오후 8시 (밤 모드) 테스트
// const TEST_TIME: number | null = null; // 실제 시간 사용

/**
 * 현재 한국 시간(KST)을 가져옵니다.
 * @returns Date 객체 (한국 시간대)
 */
export function getKoreanTime(): Date {
  const now = new Date();
  // UTC 시간에 9시간을 더해서 한국 시간으로 변환
  const koreanTime = new Date(now.getTime() + 9 * 60 * 60 * 1000);
  return koreanTime;
}

/**
 * 현재 한국 시간의 시(hour)를 가져옵니다.
 * @returns 0-23 사이의 시간 값
 */
export function getKoreanHour(): number {
  // 테스트용 시간이 설정된 경우 해당 시간 사용
  if (TEST_TIME !== null) {
    return TEST_TIME;
  }
  return getKoreanTime().getUTCHours();
}

/**
 * 현재 시간이 낮 시간대인지 확인합니다.
 * @returns 06:00-17:59 사이면 true, 18:00-05:59 사이면 false
 */
export function isDayTime(): boolean {
  const hour = getKoreanHour();
  return hour >= 6 && hour <= 17;
}

/**
 * 현재 시간이 밤 시간대인지 확인합니다.
 * @returns 18:00-05:59 사이면 true, 06:00-17:59 사이면 false
 */
export function isNightTime(): boolean {
  return !isDayTime();
}

/**
 * 현재 시간에 따른 씬 파일 경로를 반환합니다.
 
 */
export function getSceneModelPath(): string {
  return isDayTime() ? "/models/scene.glb" : "/models/night_sky_scene.glb";
}
