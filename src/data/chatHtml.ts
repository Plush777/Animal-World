import { svg } from "./svg";

export const chatHtml: { [key: string]: any } = {
  chat: `
        <div class="chat-wrapper active ui-element">
            <div class="chat-inner">
                <header class="chat-header">
                    <div class="chat-button-group">
                        <button type="button" class="chat-leave-button">
                            ${svg.chatLeave}
                            <span class="hidden">방 나가기</span>
                        </button>
                    </div>
                    <div class="chat-button-group">
                        <button type="button" class="chat-close-button">
                        ${svg.chatClose}
                        <span class="hidden">채팅창 닫기</span>
                        </button>
                    </div>
                </header>
                <div class="chat-body">
                    <ul id="chat-messages" class="chat-log-box"></ul>
                    <div class="chat-input-box">
                        <form id="chat-form">
                            <input
                                type="text"
                                placeholder="메시지를 입력하세요."
                                class="chat-input"
                                id="chat-input"
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
