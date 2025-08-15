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
 * 저장된 테마가 있으면 사용하고, 없으면 현재 시간을 기반으로 자동 설정합니다.
 */
export function initializeTheme(): void {
  const storedTheme = getStoredTheme();

  if (storedTheme) {
    applyTheme(storedTheme);
  } else {
    setAutoTheme();
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
