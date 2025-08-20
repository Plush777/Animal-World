import { svg } from "./svg";

const introBottomButtonText = "intro-bottom-button-text";

export const authHtml: { [key: string]: any } = {
  login: `
    <div class="intro-bottom-button-box">
        <button type="button" id="google-login" class="google-login-button button-white button-size-lg button button-has-icon rounded-button">
            ${svg.google}
            <span class="${introBottomButtonText}">구글 계정으로 로그인</span>
        </button>
        <button type="button" id="kakao-login" class="kakao-login-button button-yellow button-size-lg button button-has-icon rounded-button">
            ${svg.kakao}
            <span class="${introBottomButtonText}">카카오 계정으로 로그인</span>
        </button>
         <button type="button" class="guest-login button-gray button-size-lg button button-has-icon rounded-button" id="guest-login">
            ${svg.guest}
            <span class="${introBottomButtonText}">비회원으로 이용하기</span>
        </button>
    </div>
    `,

  logout: {
    buttons: `
        <div class="intro-description-box">
            <p class="intro-description-text">
            다른 동물친구들이 당신을 기다리고 있어요.
            </p>
            <p class="intro-description-text">아래 버튼을 눌러 빨리 참여해보세요!</p>
        </div>
        <button
            type="button"
            id="join-button"
            class="button button-sky button-size-lg has-short-key"
        >
            <span class="short-key has-border has-text"> J </span>
            <span>참여하기</span>
        </button>
    `,

    userBoxDiv: `
        <div class="user-box">
            <button type="button" class="user-box-button">
            <span id="user-info"></span>
            ${svg.arrowUp}
            </button>

            <ul class="user-box-list">
            <li class="user-box-item">
                <a href="#mypage-setting" class="user-box-item-button" id="mypage-setting-button">마이페이지</a>
            </li>
            <li class="user-box-item">
                <button type="button" class="user-box-item-button" id="logout">로그아웃</button>
            </li>
            </ul>
        </div>
    `,
  },

  mypage: {
    setting: {
      guest: `
        <div class="popup mypage-setting fullscreen" role="dialog">
          <div class="popup-inner">
            <div class="popup-title-box">
              <h2 class="popup-title">마이페이지</h2>
              <p class="popup-description">계정 또는 상세 설정을 할 수 있어요.</p>
            </div>

            <div class="mypage-setting-wrapper mypage-loading">
              <div id="mypage-section-loading"></div>

              <section class="mypage-section">
                <div class="mypage-section-title-box">
                  <strong class="mypage-section-title">내 정보</strong>
                </div>
                <div class="mypage-row">
                  <div class="mypage-item">
                    <span class="mypage-item-text">프로필 사진</span>

                    <div class="mypage-img-box">
                      <div id="mypage-img-element"></div>

                      <div class="mypage-img-button-group">
                        <button type="button" class="button button-sky button-size-sm">
                          <span>이미지 업로드</span>
                        </button>
                        <button type="button" class="button button-blue button-size-sm">
                          <span>이미지 제거</span>
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
                <div class="mypage-row">
                  <div class="mypage-item">
                    <label for="mypage-name" class="mypage-item-text">이름</label>

                    <div class="mypage-input-group">
                      <input type="text" class="input" id="mypage-name" maxlength="16" />
                    </div>
                  </div>
                </div>

                <div class="mypage-row">
                  <div class="mypage-item">
                    <label for="mypage-intro-text" class="mypage-item-text">한 줄 소개</label>

                    <div class="mypage-input-group">
                      <textarea id="mypage-intro-text" maxlength="100" placeholder="나를 한 줄로 표현해보세요." class="textarea"></textarea>
                    </div>
                  </div>
                </div>

                <div class="mypage-row">
                  <div id="guest-notice-message"></div>
                </div>
              </section>
            </div>

              <div class="popup-bottom-button-group">
                  <button type="button" class="esc-button button button-blue button-size-lg has-short-key">
                      <span class="short-key has-border has-text">ESC</span>
                      <span>닫기</span>
                  </button>
              </div>
          </div>
      </div>
      `,

      user: `
        <div class="popup mypage-setting fullscreen" role="dialog">
          <div class="popup-inner">
            <div class="popup-title-box">
              <h2 class="popup-title">마이페이지</h2>
              <p class="popup-description">계정 또는 상세 설정을 할 수 있어요.</p>
            </div>

            <div class="mypage-setting-wrapper">
              <div id="mypage-section-loading"></div>

              <section class="mypage-section">
                <div class="mypage-section-title-box">
                  <strong class="mypage-section-title">내 정보</strong>
                </div>
                <div class="mypage-row">
                  <div class="mypage-item">
                    <span class="mypage-item-text">프로필 사진</span>

                    <div class="mypage-img-box">
                      <div id="mypage-img-element"></div>

                      <div class="mypage-img-button-group">
                        <button type="button" class="button button-sky button-size-sm">
                          <span>이미지 업로드</span>
                        </button>
                        <button type="button" class="button button-blue button-size-sm">
                          <span>이미지 제거</span>
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
                <div class="mypage-row">
                  <div class="mypage-item">
                    <label for="mypage-name" class="mypage-item-text">이름</label>

                    <div class="mypage-input-group">
                      <input type="text" class="input" id="mypage-name" maxlength="16" />
                    </div>
                  </div>
                </div>

                <div class="mypage-row">
                  <div class="mypage-item">
                    <label for="mypage-intro-text" class="mypage-item-text">한 줄 소개</label>

                    <div class="mypage-input-group">
                      <textarea id="mypage-intro-text" maxlength="100" placeholder="나를 한 줄로 표현해보세요." class="textarea"></textarea>
                      <div class="mypage-intro-text-count">
                        <span class="mypage-intro-text-count-text">0</span>
                        <span class="mypage-intro-text-count-text">/100</span>
                      </div>
                    </div>
                  </div>
                </div>

                <div class="mypage-row">
                  <div id="guest-notice-message"></div>
                </div>
              </section>
            </div>

              <div class="popup-bottom-button-group">
                  <button type="button" class="esc-button button button-blue button-size-lg has-short-key">
                      <span class="short-key has-border has-text">ESC</span>
                      <span>닫기</span>
                  </button>
                  <button type="button" class="next-button button button-sky button-size-lg has-short-key">
                      <span class="short-key has-border has-text">
                          ${svg.enter}
                      </span>
                      <span>저장</span>
                  </button>
              </div>
          </div>
      </div>
      `,
    },
  },
};
