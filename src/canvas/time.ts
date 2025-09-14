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

// 시간대 변경 감지를 위한 변수
let lastTimeState: boolean | null = null;

/**
 * 시간대 변경을 감지하고 이벤트를 발생시킵니다.
 * 매분마다 호출되어야 합니다.
 */
export function checkTimeChange(): void {
  const currentIsDay = isDayTime();

  // 첫 번째 호출이거나 시간대가 변경된 경우
  if (lastTimeState !== null && lastTimeState !== currentIsDay) {
    console.log(`시간대 변경 감지: ${lastTimeState ? "낮" : "밤"} → ${currentIsDay ? "낮" : "밤"}`);

    // 시간대 변경 이벤트 발생
    const timeChangeEvent = new CustomEvent("timeChange", {
      detail: {
        isDay: currentIsDay,
        isNight: !currentIsDay,
        previousState: lastTimeState ? "day" : "night",
        currentState: currentIsDay ? "day" : "night",
      },
    });

    document.dispatchEvent(timeChangeEvent);
  }

  lastTimeState = currentIsDay;
}

/**
 * 시간대 변경 감지 시작
 * 1분마다 시간대 변경을 확인합니다.
 */
export function startTimeChangeDetection(): void {
  console.log("시간대 변경 감지 시작");

  // 초기 상태 설정
  lastTimeState = isDayTime();

  // 1분마다 시간대 변경 확인
  setInterval(checkTimeChange, 60000); // 60초 = 1분
}
