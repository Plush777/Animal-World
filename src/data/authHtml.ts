import { svg } from "./svg";

export const authHtml: { [key: string]: string } = {
  login: `
    <div class="intro-bottom-button-box">
        <button type="button" id="google-login" class="google-login-button button-white button-size-lg button button-has-icon rounded-button">
        ${svg.google}
        <span>구글계정으로 로그인</span>
        </button>
        <button type="button" id="kakao-login" class="kakao-login-button button-yellow button-size-lg button button-has-icon rounded-button">
        ${svg.kakao}
        <span>카카오 계정으로 로그인</span>
        </button>
    </div>

    <div class="intro-etc-area">
        <button type="button" class="button-underline">비회원으로 이용하기</button>
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
};
