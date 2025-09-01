import { svg } from "./svg";

export const chatHtml: { [key: string]: any } = {
  chat: `
        <div class="chat-wrapper active ui-element">
            <div class="chat-emoji-wrapper">
                <button type="button" class="chat-emoji-button" aria-expanded="false">
                    ${svg.emoji}
                    <span class="tooltip emoji">이모지 선택</span>
                </button>

                <div class="chat-emoji-list" id="chat-emoji-list">
                    <button type="button" class="chat-emoji-list-button">
                    👍
                    </button>
                    <button type="button" class="chat-emoji-list-button">
                    👏
                    </button>
                    <button type="button" class="chat-emoji-list-button">
                    ❤️
                    </button>
                    <button type="button" class="chat-emoji-list-button">
                    👋
                    </button>
                        <button type="button" class="chat-emoji-list-button">
                    😆
                    </button>
                    <button type="button" class="chat-emoji-list-button">
                    😢
                    </button>
                </div>
            </div>
            <span class="short-key has-border has-text">E</span>
            
           
            <div class="chat-open-button-area">
                <button type="button" class="chat-open-button">
                    ${svg.chat}
                    <span class="tooltip">채팅창 열기</span>
                </button>
            </div>
            <span class="short-key has-border has-text">C</span>

            <div class="chat-inner">
                <header class="chat-header">
                    <div class="chat-button-group">
                        <button type="button" class="chat-close-button">
                            ${svg.chatClose}
                            <span class="tooltip">채팅창 닫기</span>
                        </button>
                    </div>
                </header>
                <div class="chat-body">
                    <div id="chat-messages" class="chat-log-box"></div>
                        <div class="chat-input-box">
                            <form id="chat-form">
                                <input
                                    type="text"
                                    placeholder="Enter를 눌러 채팅을 시작해보세요."
                                    class="chat-input"
                                    id="chat-input"
                                    autocomplete="off"
                                    spellcheck="false"
                                />
                            </form>
                            
                            <button type="button" class="chat-enter-button short-key">
                                ${svg.enter}
                                <span class="hidden">메시지 전송</span>
                            </button>
                        </div>
                    </div>
                </div>
            </div>
    `,
};
