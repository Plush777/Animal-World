export const stateHtml: { [key: string]: any } = {
  userList: {
    empty: `
            <div class="user-list-empty">
                <p>등록된 사용자가 없네요!</p>
                <p>일시적인 오류일 수 있으니 재접속 후 다시 시도해주세요.</p>
            </div>
        `,
    error: `
            <div class="user-list-empty">
                <p>이런, 사용자 목록을 불러오는 중 오류가 발생했어요.</p>
                <p>잠시 후 다시 시도해주세요.</p>
            </div>
        `,
  },

  general: {
    loading: `
            <div class="contents-loader">
                <span class="loader"></span>
            </div>
        `,
    error: `
            <div class="error-state">
                <p>데이터를 불러오는 중 오류가 발생했습니다.</p>
                <p>잠시 후 다시 시도해주세요.</p>
            </div>
        `,
  },

  chat: {
    error: `
            <div class="chat-error">
                <p>메시지를 불러오는 중 오류가 발생했습니다.</p>
                <p>연결을 확인하고 다시 시도해주세요.</p>
            </div>
        `,
  },
};
