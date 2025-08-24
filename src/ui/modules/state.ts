import { stateHtml } from "../../data/stateHtml";

/**
 * 상태 HTML을 표시하는 유틸리티 함수들
 */
function showLoadingState(element: HTMLElement, type: string = "general"): void {
  if (stateHtml[type] && stateHtml[type].loading) {
    element.innerHTML = stateHtml[type].loading;
  } else {
    element.innerHTML = stateHtml.general.loading;
  }
}

function showEmptyState(element: HTMLElement, type: string = "general"): void {
  if (stateHtml[type] && stateHtml[type].empty) {
    element.innerHTML = stateHtml[type].empty;
  } else {
    element.innerHTML = stateHtml.general.empty;
  }
}

function showErrorState(element: HTMLElement, type: string = "general"): void {
  if (stateHtml[type] && stateHtml[type].error) {
    element.innerHTML = stateHtml[type].error;
  } else {
    element.innerHTML = stateHtml.general.error;
  }
}

export { showLoadingState, showEmptyState, showErrorState };
