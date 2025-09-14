import { svg } from "./svg";
import { authHtml } from "./authHtml";

export const introHtml: { [key: string]: string } = {
  intro: `
    <div class="intro-wrapper">
        <div id="userbox-user-logout-element">
            ${authHtml.logout.sidebar}
            ${authHtml.logout.userBoxDiv}
        </div>

        <section class="intro-box">
            <h1 class="intro-logo-area">
                ${svg.introLogo}
                <span class="hidden">Animal World! 로고</span>
            </h1>
            <div class="intro-bottom">
                <div id="user-login-element">
                    ${authHtml.login.buttons}
                </div>
                <div id="user-logout-element">
                    ${authHtml.logout.buttons}
                </div>
            </div>
        </section>

        <div class="video-wrapper">
            <video class="light-video" autoplay muted poster="/images/poster/intro-light-video-poster.png">
                <source src="/videos/intro-light.mp4" type="video/mp4" />
                Your browser does not support the video tag.
            </video>

            <video class="dark-video" autoplay muted>
                <source src="/videos/intro-dark.mp4" type="video/mp4" />
                Your browser does not support the video tag.
            </video>
        </div>
    </div>
    `,
};
