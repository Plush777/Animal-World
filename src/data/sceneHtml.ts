import { svg } from "./svg";

export const sceneHtml: { [key: string]: any } = {
  headerRight: `
<div class="world-header-box">
    <div class="header-left">
        <button type="button" class="chat-leave-button only-icon-button">
            ${svg.chatLeave}
            <span class="hidden">방 나가기</span>
            <span class="short-key has-border has-text">L</span>
        </button>
    </div>
    <div class="header-right">
        <button type="button" disabled="" class="ranking-button only-icon-button">
            <span class="hidden">랭킹</span>
            ${svg.ranking}
            <span class="short-key has-border has-text">R</span>
        </button>
        <button type="button" class="world-user-list-button only-icon-button">
            <span class="hidden">광장 유저 목록 보기</span>
            ${svg.worldUserList}
            <span class="short-key has-border has-text">U</span>
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
            <span class="hidden">설정</span>
            ${svg.setting}
            <span class="short-key has-border has-text">S</span>
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
};
