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
};
