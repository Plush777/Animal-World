import { isDayTime } from "../canvas/time";

export type Theme = "light" | "dark";

const THEME_STORAGE_KEY = "animal-world-theme";

/**
 * 로컬스토리지에서 테마 설정을 가져옵니다.
 * @returns 저장된 테마 값 또는 null
 */
export function getStoredTheme(): Theme | null {
  try {
    const stored = localStorage.getItem(THEME_STORAGE_KEY);
    return stored === "light" || stored === "dark" ? stored : null;
  } catch (error) {
    console.warn("로컬스토리지에서 테마를 읽어올 수 없습니다:", error);
    return null;
  }
}

/**
 * 테마 설정을 로컬스토리지에 저장합니다.
 * @param theme 저장할 테마 값
 */
export function setStoredTheme(theme: Theme): void {
  try {
    localStorage.setItem(THEME_STORAGE_KEY, theme);
  } catch (error) {
    console.warn("로컬스토리지에 테마를 저장할 수 없습니다:", error);
  }
}

/**
 * 현재 시간을 기반으로 자동 테마를 결정합니다.
 * @returns 낮 시간이면 'light', 밤 시간이면 'dark'
 */
export function getAutoTheme(): Theme {
  return isDayTime() ? "light" : "dark";
}

/**
 * body 요소에 data-theme 속성을 설정합니다.
 * @param theme 설정할 테마
 */
export function applyTheme(theme: Theme): void {
  document.body.setAttribute("data-theme", theme);
}

/**
 * 현재 시간을 기반으로 테마를 자동 설정하고 로컬스토리지에 저장합니다.
 */
export function setAutoTheme(): void {
  const autoTheme = getAutoTheme();
  applyTheme(autoTheme);
  setStoredTheme(autoTheme);
}

/**
 * 테마 시스템을 초기화합니다.
 * 저장된 테마와 현재 시간을 비교하여 필요시 자동 업데이트합니다.
 */
export function initializeTheme(): void {
  const storedTheme = getStoredTheme();
  const autoTheme = getAutoTheme();

  if (!storedTheme) {
    // 저장된 테마가 없으면 현재 시간 기반으로 설정
    setAutoTheme();
  } else {
    // 저장된 테마가 있어도 현재 시간과 다르면 업데이트
    if (storedTheme !== autoTheme) {
      console.log(`시간대 변경 감지: ${storedTheme} → ${autoTheme}`);
      setAutoTheme();
    } else {
      // 저장된 테마와 현재 시간 기반 테마가 같으면 그대로 사용
      applyTheme(storedTheme);
    }
  }
}

/**
 * 현재 적용된 테마를 가져옵니다.
 * @returns 현재 테마 값
 */
export function getCurrentTheme(): Theme {
  const theme = document.body.getAttribute("data-theme");
  return theme === "dark" ? "dark" : "light";
}

/**
 * 정기적으로 시간을 확인하여 테마를 자동 업데이트합니다.
 * 10분마다 현재 시간을 확인하고 필요시 테마를 변경합니다.
 */
export function startAutoThemeUpdater(): void {
  // 10분마다 테마 확인
  setInterval(() => {
    const currentTheme = getCurrentTheme();
    const autoTheme = getAutoTheme();

    if (currentTheme !== autoTheme) {
      console.log(`자동 테마 업데이트: ${currentTheme} → ${autoTheme}`);
      setAutoTheme();
    }
  }, 10 * 60 * 1000); // 10분 = 600,000ms
}
