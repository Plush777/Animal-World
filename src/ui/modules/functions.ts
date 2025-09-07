/**
 * 단축키 비활성화 상태를 로컬 스토리지에 저장하는 함수
 * @param isDisabled 단축키 비활성화 여부
 */
function saveShortKeyDisabledState(isDisabled: boolean): void {
  localStorage.setItem("shortKeyDisabled", JSON.stringify(isDisabled));
}

/**
 * 로컬 스토리지에서 단축키 비활성화 상태를 불러오는 함수
 * @returns 단축키 비활성화 여부
 */
function loadShortKeyDisabledState(): boolean {
  const savedState = localStorage.getItem("shortKeyDisabled");
  return savedState ? JSON.parse(savedState) : false;
}

/**
 * 단축키 비활성화 상태를 토글하는 함수
 * @param isDisabled 단축키 비활성화 여부
 */
function toggleShortKeyDisabled(isDisabled: boolean): void {
  // body 태그에 data-short-key-disable 속성 설정
  if (isDisabled) {
    document.body.setAttribute("data-short-key-disable", "true");
  } else {
    document.body.setAttribute("data-short-key-disable", "false");
  }
}

/**
 * 체크박스 상태를 로컬 스토리지 값과 동기화하는 함수
 */
function syncCheckboxWithLocalStorage(): void {
  const shortKeyDisableCheckbox = document.getElementById("short-key-disable") as HTMLInputElement;
  if (shortKeyDisableCheckbox) {
    const savedState = loadShortKeyDisabledState();
    shortKeyDisableCheckbox.checked = savedState;
    toggleShortKeyDisabled(savedState);
  }
}

/**
 * 맵 둘러보기 상태를 로컬 스토리지에 저장하는 함수
 * @param isEnabled 맵 둘러보기 활성화 여부
 */
function saveMapExploreState(isEnabled: boolean): void {
  localStorage.setItem("mapExplore", JSON.stringify(isEnabled));
}

/**
 * 로컬 스토리지에서 맵 둘러보기 상태를 불러오는 함수
 * @returns 맵 둘러보기 활성화 여부
 */
function loadMapExploreState(): boolean {
  const savedState = localStorage.getItem("mapExplore");
  return savedState ? JSON.parse(savedState) : false;
}

/**
 * 맵 둘러보기 상태를 토글하는 함수
 * @param isEnabled 맵 둘러보기 활성화 여부
 */
function toggleMapExplore(isEnabled: boolean): void {
  // 전역 카메라 컨트롤에 맵 둘러보기 상태 전달
  if (window.globalControls) {
    if (isEnabled) {
      // 맵 둘러보기 활성화 - 카메라 자유 이동 허용
      window.globalControls.enabled = true;
      // 카메라 제한 설정 복원
      window.globalControls.minDistance = 400;
      window.globalControls.maxDistance = 570;
      window.globalControls.minPolarAngle = Math.PI / 3;
      window.globalControls.maxPolarAngle = Math.PI / 2.5;
    } else {
      // 맵 둘러보기 비활성화 - 카메라 고정
      window.globalControls.enabled = false;
      // 카메라를 지정된 위치로 고정
      if (window.globalCamera) {
        window.globalCamera.position.set(456.93, 249.97, 464.93);
        window.globalCamera.lookAt(70, 45, 100);
      }
    }
  }
}

/**
 * 맵 둘러보기 체크박스 상태를 로컬 스토리지 값과 동기화하는 함수
 */
function syncMapExploreCheckboxWithLocalStorage(): void {
  const mapExploreCheckbox = document.getElementById("map-explore") as HTMLInputElement;
  if (mapExploreCheckbox) {
    const savedState = loadMapExploreState();
    mapExploreCheckbox.checked = savedState;
    toggleMapExplore(savedState);
  }
}

/**
 * 모든 기존 요소에 단축키 비활성화 상태를 적용하는 함수
 */
export function applyShortKeyDisabledToAllElements(): void {
  // 페이지 로드 즉시 로컬 스토리지 값 적용
  const savedState = loadShortKeyDisabledState();
  toggleShortKeyDisabled(savedState);

  // 단축키 비활성화 체크박스 이벤트 리스너
  document.addEventListener("change", (e) => {
    const target = e.target as HTMLInputElement;

    if (target.id === "short-key-disable") {
      toggleShortKeyDisabled(target.checked);
      saveShortKeyDisabledState(target.checked);
    }

    if (target.id === "map-explore") {
      toggleMapExplore(target.checked);
      saveMapExploreState(target.checked);
    }
  });

  // 페이지 로드 후 체크박스 상태 확인 (지연 실행)
  setTimeout(() => {
    syncCheckboxWithLocalStorage();
    syncMapExploreCheckboxWithLocalStorage();
  }, 1000);

  // DOM 변화를 감지하여 새로 추가된 요소에 단축키 비활성화 상태 적용
  const observer = new MutationObserver((mutations) => {
    mutations.forEach((mutation) => {
      if (mutation.type === "childList" && mutation.addedNodes.length > 0) {
        // 새로 추가된 노드 중에 체크박스가 있는지 확인하고 상태 동기화
        mutation.addedNodes.forEach((node) => {
          if (node.nodeType === Node.ELEMENT_NODE) {
            const element = node as Element;
            if (element.id === "short-key-disable" || element.querySelector("#short-key-disable")) {
              syncCheckboxWithLocalStorage();
            }
            if (element.id === "map-explore" || element.querySelector("#map-explore")) {
              syncMapExploreCheckboxWithLocalStorage();
            }
          }
        });
      }
    });
  });

  // DOM 전체를 감시 시작
  observer.observe(document.body, {
    childList: true,
    subtree: true,
  });

  // 체크박스가 이미 존재하는 경우 즉시 동기화
  if (document.getElementById("short-key-disable")) syncCheckboxWithLocalStorage();
  if (document.getElementById("map-explore")) syncMapExploreCheckboxWithLocalStorage();
}
