import { svg } from "./svg";

export const myPageHtml: { [key: string]: string } = {
  loading: `
    <div class="contents-loader">
        <span class="loader"></span>
    </div>
  `,

  guestNoticeMessage: `

  <div class="mypage-notice-area">
    ${svg.info} 
    <span class="mypage-notice-text">게스트 계정은 프로필 수정이 제한됩니다. 계정을 생성하면 모든 기능을 이용할 수 있어요.</span>
  </div>
  `,
};
