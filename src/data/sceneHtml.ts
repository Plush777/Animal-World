import { svg } from "./svg";

export const sceneHtml: { [key: string]: any } = {
  headerRight: `
<div class="world-header-box">
    <div class="header-left">
        <button type="button" class="chat-leave-button only-icon-button">
            ${svg.chatLeave}
            <span class="short-key has-border has-text">L</span>
            <span class="tooltip">방 나가기</span>
        </button>
    </div>
    <div class="header-right">
        <button type="button" disabled="" class="ranking-button only-icon-button">
            ${svg.ranking}
            <span class="short-key has-border has-text">R</span>
            <span class="tooltip">랭킹</span>
        </button>
        <button type="button" class="world-user-list-button only-icon-button">
            ${svg.worldUserList}
            <span class="short-key has-border has-text">U</span>
            <span class="tooltip">유저 목록</span>
        </button>

        <div class="popup user-list" role="dialog">
            <div class="popup-inner">
                <header class="popup-header">
                    <h2 class="popup-header-title">유저 목록</h2>

                    <button type="button" class="popup-close">
                        ${svg.popupClose}
                    </button>
                </header>

                <div class="popup-body">
                    
                </div>
            </div>
        </div>

       

        <button type="button" class="setting-button only-icon-button">
            ${svg.setting}
            <span class="short-key has-border has-text">F</span>
            <span class="tooltip">설정</span>
        </button>

        <div class="popup setting" role="dialog">
            <div class="popup-inner">
                <header class="popup-header">
                  <h2 class="popup-header-title">설정</h2>

                  <button type="button" class="popup-close">
                      ${svg.popupClose}
                  </button>
                </header>

                <div class="popup-body">
                    
                </div>
            </div>
        </div>

         <button type="button" class="help-button ui-hide-button only-icon-button">
            ${svg.question}
            <span class="short-key has-border has-text">Q</span>
            <span class="tooltip">도움말</span>
        </button>
        
        <div class="popup help" role="dialog">
            <div class="popup-inner">
                <header class="popup-header">
                  <h2 class="popup-header-title">도움말</h2>

                  <button type="button" class="popup-close">
                      ${svg.popupClose}
                  </button>
                </header>

                <div class="popup-body">
                    
                </div>
            </div>
        </div>
    </div>
</div>
    
    `,

  settings: `
    <section class="popup-section">
      <h3 class="popup-section-title">Sound setting</h3>
      <div class="popup-section-item-box">
        <div class="popup-section-item">
          <strong class="popup-section-item-title">배경음 음량</strong>
          <input type="range" class="range-bar" />
        </div>
        <div class="popup-section-item">
          <strong class="popup-section-item-title">효과음 음량</strong>
          <input type="range" class="range-bar" />
        </div>
      </div>
    </section>
    <section class="popup-section">
      <h3 class="popup-section-title">Scene setting</h3>
      <div class="popup-section-item-box">
        
        <div class="popup-section-item">
          <input type="checkbox" id="map-explore" />
          <label for="map-explore" class="popup-section-item-title">
            ${svg.check}
            <span>맵 둘러보기</span>
          </label>
        </div>
      </div>
    </section>
    <section class="popup-section">
      <h3 class="popup-section-title">Common setting</h3>
      <div class="popup-section-item-box">
        <div class="popup-section-item">
          <input type="checkbox" id="short-key-disable" />
          <label for="short-key-disable" class="popup-section-item-title">
            ${svg.check}
            <span>단축키 비활성화</span>
          </label>
        </div>
      </div>
    </section>
    `,

  help: `
      <section class="popup-section">
        <div class="help-group-box">
          <div class="help-group">
            <strong class="help-group-text">UI 숨기기</strong>
            <span class="short-key has-border has-text"> H </span>
          </div>
          <p class="help-group-description">상단 메뉴, 채팅창 등 화면에 표시되는 요소를 숨길 수 있어요.</p>
        </div>
      </section>

      <section class="popup-section">
        <div class="help-group-box">
          <div class="help-group">
            <strong class="help-group-text">이모지</strong>
            <span class="short-key has-border has-text"> E </span>
            <span class="short-key has-border has-text"> 1 ~ 6</span>
          </div>
          <p class="help-group-description">상대방에게 보낼 이모지를 선택할 수 있어요.</p>
        </div>
      </section>

      <section class="popup-section">
        <div class="help-group-box">
          <div class="help-group">
            <strong class="help-group-text">맵 둘러보기</strong>
            <span class="short-key has-border has-text"> M </span>
          </div>
          <p class="help-group-description">해당 설정을 켜면 카메라가 활성화 되어 드래그를 통해 맵을 둘러볼 수 있어요. (단, 캐릭터 조작 및 채팅 등의 기능은 비활성화 됩니다.)</p>
        </div>
      </section>

      <section class="popup-section">
        <div class="help-group-box">
          <div class="help-group">
            <strong class="help-group-text">월드 나가기</strong>
            <span class="short-key has-border has-text"> L </span>
          </div>
          <p class="help-group-description">접속해있는 월드를 나갈 수 있어요.</p>
        </div>
      </section>

      <section class="popup-section">
        <div class="help-group-box">
          <div class="help-group">
            <strong class="help-group-text">랭킹</strong>
            <span class="short-key has-border has-text"> R </span>
          </div>
          <p class="help-group-description">해당 단축키로 랭킹 팝업을 열 수 있어요.</p>
        </div>
      </section>

      <section class="popup-section">
        <div class="help-group-box">
          <div class="help-group">
            <strong class="help-group-text">유저 목록</strong>
            <span class="short-key has-border has-text"> U </span>
          </div>
          <p class="help-group-description">해당 단축키로 유저 목록 팝업을 열 수 있어요.</p>
        </div>
      </section>

      <section class="popup-section">
        <div class="help-group-box">
          <div class="help-group">
            <strong class="help-group-text">설정</strong>
            <span class="short-key has-border has-text"> F </span>
          </div>
          <p class="help-group-description">해당 단축키로 설정 팝업을 열 수 있어요.</p>
        </div>
      </section>

      <section class="popup-section">
        <div class="help-group-box">
          <div class="help-group">
            <strong class="help-group-text">도움말</strong>
            <span class="short-key has-border has-text"> Q </span>
          </div>
          <p class="help-group-description">해당 단축키로 도움말 팝업을 열 수 있어요.</p>
        </div>
      </section>

      <section class="popup-section">
        <div class="help-group-box">
          <div class="help-group">
            <strong class="help-group-text">채팅 입력 및 전송</strong>
            <span class="short-key has-border has-text"> Enter </span>
          </div>
          <p class="help-group-description">해당 단축키로 채팅을 입력하고 전송할 수 있어요.</p>
        </div>
      </section>

      <section class="popup-section">
        <div class="help-group-box">
          <div class="help-group">
            <strong class="help-group-text">채팅창 열기 및 닫기</strong>
            <span class="short-key has-border has-text"> C </span>
          </div>
          <p class="help-group-description">해당 단축키로 채팅창을 열고 닫을 수 있어요.</p>
        </div>
      </section>
    `,

  characterSetting: `
<div class="popup character-setting fullscreen" role="dialog">
  <div class="popup-inner">
    <div class="popup-title-box">
      <h2 class="popup-title">캐릭터 설정</h2>
      <p class="popup-description">사용할 본인의 캐릭터를 결정해주세요!</p>
    </div>

    <ul class="popup-character-tab-list">
      <li class="popup-character-tab-item">
        <button type="button" id="character-dog" class="popup-character-tab-button" data-character="dog">
          <model-viewer
            src="/models/character/low_poly_dog.glb"
            camera-controls
            tone-mapping="neutral"
            shadow-intensity="1"
            camera-target="0m 1.568m -0.3797m"
            camera-orbit="-22.13deg 80.93deg 10.19m"
            field-of-view="30deg"
            touch-action="pan-y"
          ></model-viewer>
          <span class="character-name">강아지</span>
        </button>
      </li>

      <li class="popup-character-tab-item">
        <button type="button" id="character-cat" class="popup-character-tab-button" data-character="cat">
          <model-viewer
            src="/models/character/cat_ps1_low_poly_rigged.glb"
            camera-controls
            tone-mapping="neutral"
            shadow-intensity="1"
            camera-orbit="-23.32deg 88.04deg 19.91m"
            field-of-view="30deg"
          ></model-viewer>
          <span class="character-name">고양이</span>
        </button>
      </li>

      <li class="popup-character-tab-item">
        <button type="button" id="character-fox" class="popup-character-tab-button" data-character="fox">
          <model-viewer
            src="/models/character/low_poly_fox.glb"
            camera-controls
            tone-mapping="neutral"
            shadow-intensity="1"
            environment-image="legacy"
            camera-orbit="-24.51deg 84.88deg 8.209m"
            field-of-view="30deg"
          ></model-viewer>
          <span class="character-name">여우</span>
        </button>
      </li>

      <li class="popup-character-tab-item">
        <button type="button" id="character-hamster" class="popup-character-tab-button locked" data-character="hamster" disabled>
          <div class="character-lock-overlay">
            <div class="lock-icon">🔒</div>
            <span class="lock-text">잠금</span>
          </div>
          <model-viewer
            src="/models/character/hamster.glb"
            camera-controls
            tone-mapping="neutral"
            shadow-intensity="1"
            camera-orbit="-23.32deg 80.04deg 228.4m"
            field-of-view="30deg"
          ></model-viewer>
          <span class="character-name">햄스터</span>
        </button>
      </li>

      <li class="popup-character-tab-item">
        <button type="button" id="character-rabbit" class="popup-character-tab-button locked" data-character="rabbit" disabled>
          <div class="character-lock-overlay">
            <div class="lock-icon">🔒</div>
            <span class="lock-text">잠금</span>
          </div>
          <model-viewer
            src="/models/character/rabbit.glb"
            camera-controls
            tone-mapping="neutral"
            shadow-intensity="1"
            environment-image="legacy"
            camera-orbit="-29.65deg 87.65deg 111.8m"
            field-of-view="30deg"
          ></model-viewer>
          <span class="character-name">토끼</span>
        </button>
      </li>

      <li class="popup-character-tab-item">
        <button type="button" id="character-wolf" class="popup-character-tab-button locked" data-character="wolf" disabled>
          <div class="character-lock-overlay">
            <div class="lock-icon">🔒</div>
            <span class="lock-text">잠금</span>
          </div>
          <model-viewer
            src="/models/character/wolf.glb"
            camera-controls
            tone-mapping="neutral"
            shadow-intensity="1"
            camera-orbit="-24.12deg 78.96deg 30m"
            field-of-view="30deg"
          ></model-viewer>
          <span class="character-name">늑대</span>
        </button>
      </li>
    </ul>

    <div class="popup-bottom-button-group">
      <button type="button" class="button button-blue button-size-lg has-short-key">
        <span class="short-key has-border has-text">ESC</span>
        <span>뒤로</span>
      </button>
      <button type="button" class="button button-sky button-size-lg has-short-key">
        <span class="short-key has-border has-text">
         ${svg.enter}
        </span>
        <span>완료</span>
      </button>
    </div>
  </div>
</div>
    
    `,

  actionButtons: {
    reset: `
      <button type="button" id="reset-position-button" class="button button-sky button-size-lg has-short-key">
        <span class="short-key has-border has-text"> X </span>
        <span>위치 초기화</span>
      </button>
    `,
  },

  toast: {
    mapExploreOn: `
      <div class="toast-wrapper"> 
        <button type="button" class="toast-close-button">
          ${svg.popupClose}
        </button>
        <p class="toast-message">맵 둘러보기 기능이 활성화 되었어요! 드래그 또는 스와이프로 맵을 둘러볼 수 있어요.</p>
        <p class="toast-message">단, 맵 둘러보기 중에는 캐릭터를 조작할 수 없어요.</p>
      </div>
    `,

    storageMapExploreOn: `
      <div class="toast-wrapper"> 
        <button type="button" class="toast-close-button">
          ${svg.popupClose}
        </button>
        <p class="toast-message">맵 둘러보기 기능이 켜져있네요! 드래그 또는 스와이프로 맵을 둘러볼 수 있어요.</p>
        <p class="toast-message">단, 맵 둘러보기 중에는 캐릭터를 조작할 수 없어요.</p>
        <p class="toast-message map-explore">(해당 기능은 설정에서 끌 수 있어요.)</p>
      </div>
    `,
  },
};
