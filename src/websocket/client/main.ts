import { io, Socket } from "socket.io-client";
import { chatHtml } from "../../data/chatHtml";
import { sceneHtml } from "../../data/sceneHtml";
import { supabase, isGuestUser } from "../../auth/auth-core";
import { ChatVirtualScroll } from "../../ui/virtualScroll";

// 타입 정의
interface RoomInfo {
  roomId: string;
  userCount: number;
  maxUsers: number;
  timestamp: number;
}

interface ChatMessage {
  user: string;
  text: string;
  timestamp?: string;
}

interface ChatUIElements {
  form: HTMLFormElement | null;
  input: HTMLInputElement | null;
  messages: HTMLUListElement | null;
  container: HTMLDivElement | null;
  virtualScroll: ChatVirtualScroll | null;
}

// 채팅 시스템 클래스
class ChatSystem {
  public socket: Socket | null = null;
  public isInitialized: boolean = false;
  public currentRoom: string | null = null;
  public currentUser: string | null = null;
  public ui: ChatUIElements = {
    form: null,
    input: null,
    messages: null,
    container: null,
    virtualScroll: null,
  };

  // 채팅 UI HTML 템플릿
  private static readonly CHAT_HTML_TEMPLATE = chatHtml.chat;

  // 채팅 초기화
  initialize(): void {
    console.log("채팅 초기화 시작");

    this.ui.container = document.querySelector<HTMLDivElement>("#chat");
    if (!this.ui.container) {
      console.error("채팅 컨테이너를 찾을 수 없습니다.");
      return;
    }

    this.ui.container.innerHTML = ChatSystem.CHAT_HTML_TEMPLATE;

    // UI 요소들 찾기
    this.ui.form = document.querySelector<HTMLFormElement>("#chat-form");
    this.ui.input = document.querySelector<HTMLInputElement>("#chat-input");
    this.ui.messages = document.querySelector<HTMLUListElement>("#chat-messages");

    // 가상 스크롤 초기화
    if (this.ui.messages) {
      this.ui.virtualScroll = new ChatVirtualScroll(this.ui.messages);
    }

    if ((window as any).initChatModule) {
      (window as any).initChatModule();
    }

    this.setupEventDelegation();
    this.isInitialized = true;
    console.log("채팅 초기화 완료");
  }

  // 이벤트 위임 설정
  private setupEventDelegation(): void {
    if (!this.ui.container) return;

    const app = document.querySelector("#app") as HTMLElement;

    app.addEventListener("click", (e) => {
      e.stopPropagation();

      const target = e.target as HTMLElement;

      if (target.closest(".chat-leave-button")) {
        this.leaveRoom();
      }
    });

    if (this.ui.form) {
      this.ui.form.addEventListener("submit", (e) => {
        e.preventDefault();
        this.sendMessage();
      });
    }

    if (this.ui.input) {
      this.ui.input.addEventListener("keypress", (e) => {
        if (e.key === "Enter") {
          this.sendMessage();
        }
      });
    }
  }

  // 메시지 전송
  private sendMessage(): void {
    if (!this.ui.input?.value.trim() || !this.currentUser) return;

    const message = this.ui.input.value.trim();
    if (this.socket && this.currentRoom) {
      this.socket.emit("sendMessage", {
        nickname: this.currentUser,
        text: message,
      });
      this.ui.input.value = "";
    }
  }

  // 메시지 추가
  addMessage(user: string, text: string, timestamp?: string): void {
    if (!this.ui.messages) return;

    const li = document.createElement("li");
    li.className = "chat-message";

    const time = timestamp ? new Date(timestamp).toLocaleTimeString() : new Date().toLocaleTimeString();

    li.innerHTML = `
      <div class="message-header">
        <span class="message-user">${user}</span>
        <span class="message-time">${time}</span>
      </div>
      <p class="message-text">${text}</p>
    `;

    // 가상 스크롤 사용
    if (this.ui.virtualScroll) {
      this.ui.virtualScroll.addChatMessage(li);
    } else {
      // 폴백: 기존 방식
      this.ui.messages.appendChild(li);
      this.ui.messages.scrollTop = this.ui.messages.scrollHeight;
    }
  }

  // 시스템 메시지 추가
  addSystemMessage(text: string): void {
    this.addMessage("시스템", text);
  }

  // 방 정보 업데이트
  updateRoomInfo(roomId: string, userCount: number, maxUsers: number): void {
    const roomInfoElement = document.querySelector<HTMLElement>("#room-info");
    if (roomInfoElement) {
      roomInfoElement.textContent = `방 ${roomId} (${userCount}/${maxUsers}명)`;
    }

    this.currentRoom = roomId;
    this.updateURL(roomId);
    this.updateHeader(roomId);
    this.saveRoomInfoToStorage(roomId, userCount, maxUsers);
  }

  // URL 업데이트
  private updateURL(roomId: string): void {
    const roomNumber = roomId.replace("room_", "");
    const newURL = `/#world?number=${roomNumber}`;

    if (window.history?.pushState) {
      window.history.pushState({ roomId, type: "room" }, "", newURL);
    } else {
      window.location.hash = `world?number=${roomNumber}`;
    }

    console.log(`URL 업데이트: ${newURL}`);
  }

  // 헤더 업데이트
  private updateHeader(roomId: string): void {
    const roomNumber = roomId.replace("room_", "");
    this.removeExistingHeaders();

    const app = document.getElementById("app") as HTMLElement;

    app.insertAdjacentHTML(
      "afterbegin",
      `
      <header id="world-header" >
        <div class="world-header-content ui-element">
          <h1>월드 채널 ${roomNumber}</h1>
          ${sceneHtml.headerRight}
        </div>
      </header>
    `
    );
  }

  // 기존 헤더 제거
  private removeExistingHeaders(): void {
    // ID로 헤더 제거
    const existingHeaderById = document.querySelector("#world-header");
    if (existingHeaderById) {
      existingHeaderById.remove();
    }

    // 클래스로 헤더 제거 (추가 안전장치)
    const existingHeadersByClass = document.querySelectorAll(".world-header");
    existingHeadersByClass.forEach((header) => header.remove());

    console.log("기존 헤더 제거 완료");
  }

  // 소켓 연결
  connectToServer(): void {
    console.log("채팅 서버에 연결 중...");

    this.socket = io("http://localhost:8000");

    this.socket.on("connect", () => {
      console.log("채팅 서버 연결됨:", this.socket?.id);
      this.addSystemMessage("채팅 서버에 연결되었습니다.");

      // 사용자 정보를 먼저 서버로 전송
      if (this.currentUser && this.socket) {
        this.socket.emit("setUserInfo", { nickname: this.currentUser });
      }

      // 사용자 정보 설정 후 방 입장 확인
      setTimeout(() => {
        this.checkURLForRoom();
      }, 100);
    });

    this.socket.on("roomAssigned", (data: { roomId: string; userCount: number; maxUsers: number; nickname?: string; roomNumber?: string }) => {
      this.updateRoomInfo(data.roomId, data.userCount, data.maxUsers);

      // 서버에서 보낸 사용자 정보를 우선 사용, 없으면 클라이언트 정보 사용
      const roomNumber = data.roomNumber || data.roomId.replace("room_", "");
      const userNickname = data.nickname || this.currentUser || "사용자";
      this.addSystemMessage(`${userNickname}님이 월드 채널 ${roomNumber}에 입장하셨습니다. (${data.userCount}/${data.maxUsers}명)`);

      console.log(`방 배정 완료: ${data.roomId} (${data.userCount}/${data.maxUsers}명)`);
    });

    this.socket.on("userJoined", (data: { roomId: string; userCount: number; message: string }) => {
      // maxUsers 하드코딩 대신 현재 방 정보에서 가져오기
      const currentMaxUsers = this.getCurrentMaxUsers();
      this.updateRoomInfo(data.roomId, data.userCount, currentMaxUsers);
      this.addSystemMessage(data.message);
    });

    this.socket.on("userLeft", (data: { roomId: string; userCount: number; message: string }) => {
      // maxUsers 하드코딩 대신 현재 방 정보에서 가져오기
      const currentMaxUsers = this.getCurrentMaxUsers();
      this.updateRoomInfo(data.roomId, data.userCount, currentMaxUsers);
      this.addSystemMessage(data.message);
    });

    this.socket.on("message", (data: ChatMessage) => {
      this.addMessage(data.user, data.text, data.timestamp);
    });

    this.socket.on("disconnect", () => {
      console.log("채팅 서버 연결 해제");
      this.addSystemMessage("채팅 서버와의 연결이 끊어졌습니다.");
    });

    this.socket.on("roomFull", (data: { message: string }) => {
      this.addSystemMessage(data.message);
      console.log("방이 가득 참:", data.message);
    });

    // 연결 에러 처리 추가
    this.socket.on("connect_error", (error) => {
      console.error("소켓 연결 에러:", error);
      this.addSystemMessage("서버 연결에 실패했습니다. 다시 시도하겠습니다.");
    });

    // 재연결 시도 로깅
    this.socket.on("reconnect", (attemptNumber) => {
      console.log(`서버 재연결 성공 (시도 ${attemptNumber}회)`);
      this.addSystemMessage("서버에 다시 연결되었습니다.");
    });

    this.socket.on("reconnect_attempt", (attemptNumber) => {
      console.log(`서버 재연결 시도 중... (${attemptNumber}회)`);
    });
  }

  // 현재 maxUsers 값 가져오기
  private getCurrentMaxUsers(): number {
    const storedRoomInfo = this.loadRoomInfoFromStorage();
    return storedRoomInfo?.maxUsers || 50; // 기본값 50
  }

  // 사용자 설정
  setUser(user: string): void {
    this.currentUser = user;
    console.log("현재 사용자 설정:", user);

    // 소켓이 연결되어 있다면 서버로 사용자 정보 전송
    if (this.socket && this.socket.connected) {
      this.socket.emit("setUserInfo", { nickname: user });

      // 사용자 정보 설정 후 방 입장 확인
      setTimeout(() => {
        this.checkURLForRoom();
      }, 100);
    }
  }

  // 현재 사용자의 닉네임 가져오기
  private async getCurrentUserNickname(): Promise<string> {
    try {
      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (!session?.user) {
        console.log("세션이 없음, 기본값 '게스트' 반환");
        return "게스트";
      }

      // 게스트 사용자인 경우 user_metadata에서 닉네임 가져오기
      if (isGuestUser(session.user)) {
        const guestNickname = session.user.user_metadata?.nickname;
        if (guestNickname) {
          console.log("게스트 닉네임 발견:", guestNickname);
          return guestNickname;
        }
        console.log("게스트 닉네임이 없음, 기본값 '게스트' 반환");
        return "게스트";
      }

      // 일반 사용자인 경우 profiles 테이블에서 닉네임 가져오기
      const { data: profile, error } = await supabase.from("profiles").select("name").eq("user_id", session.user.id).single();

      if (error) {
        console.error("프로필 조회 실패:", error);
        return session.user.user_metadata?.full_name || session.user.email || "사용자";
      }

      if (profile?.name) {
        console.log("프로필 닉네임 발견:", profile.name);
        return profile.name;
      }

      // 프로필에 닉네임이 없으면 기본값 반환
      return session.user.user_metadata?.full_name || session.user.email || "사용자";
    } catch (error) {
      console.error("닉네임 가져오기 실패:", error);
      return "게스트";
    }
  }

  // 방 나가기 (공통 로직)
  private leaveRoomCommon(): void {
    console.log("방 나가기 시작");

    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
    }

    this.cleanupUI();
    this.resetURL();
    this.clearRoomInfoFromStorage();
    this.resetCanvasToInitialState();
    this.showIntroWrapper();

    console.log("방을 나갔습니다.");
  }

  // 방 나가기
  leaveRoom(): void {
    this.leaveRoomCommon();
  }

  // 강제로 홈으로 이동
  forceGoHome(): void {
    console.log("강제로 홈으로 이동");
    this.leaveRoomCommon();
  }

  // UI 정리
  public cleanupUI(): void {
    console.log("UI 정리 시작");

    this.removeExistingHeaders();

    // 만약 chat div가 존재하지 않으면 생성
    if (!this.ui.container) {
      this.ui.container = document.createElement("div");
      this.ui.container.id = "chat";
      document.body.appendChild(this.ui.container);
    } else {
      this.ui.container.innerHTML = "";
    }

    this.isInitialized = false;
    this.currentRoom = null;

    console.log("UI 정리 완료");
  }

  // URL 초기화
  private resetURL(): void {
    if (window.history?.pushState) {
      window.history.pushState({ type: "home" }, "", "/");
    } else {
      window.location.hash = "";
    }
  }

  // 캔버스 초기화
  private resetCanvasToInitialState(): void {
    const scene = document.querySelector<HTMLElement>("#scene");
    if (scene) {
      scene.classList.remove("loaded");
      scene.style.removeProperty("opacity");
    }

    const mainTag = document.querySelector<HTMLElement>(".main");
    const worldHeader = document.querySelector<HTMLElement>("#world-header");

    if (mainTag) {
      mainTag.classList.remove("ui-visible");
    }

    if (worldHeader) {
      worldHeader.classList.remove("ui-visible");
    }

    const loadingUI = document.querySelector<HTMLElement>(".loading-wrapper");
    if (loadingUI) {
      loadingUI.style.display = "none";
    }

    this.cleanupGLBModels();
  }

  // GLB 모델 정리
  private cleanupGLBModels(): void {
    if ((window as any).cleanupScene) {
      (window as any).cleanupScene();
    }
  }

  // 인트로 화면 표시
  private showIntroWrapper(): void {
    const introWrapper = document.querySelector<HTMLElement>(".intro-wrapper");
    if (introWrapper) {
      introWrapper.style.display = "flex";
      introWrapper.style.opacity = "1";
    }
  }

  // URL에서 방 번호 파싱 (검증 로직 추가)
  public parseRoomNumberFromURL(): string | null {
    const hash = window.location.hash;
    if (hash.includes("world") && hash.includes("number=")) {
      const match = hash.match(/number=(\d+)/);
      if (match) {
        const roomNumber = parseInt(match[1]);
        // 방 번호 유효성 검사 (1 이상의 정수)
        if (roomNumber > 0 && Number.isInteger(roomNumber)) {
          return match[1];
        }
      }
    }
    return null;
  }

  // URL에서 방 번호 확인
  private checkURLForRoom(): void {
    const roomNumber = this.parseRoomNumberFromURL();

    if (roomNumber) {
      console.log(`URL에서 방 번호 감지: ${roomNumber}`);
      if (this.socket) {
        // 사용자 정보가 설정된 후 방 입장 요청
        this.socket.emit("joinSpecificRoom", { roomNumber: parseInt(roomNumber) });
      }
    } else {
      this.checkStoredRoomInfo();
    }
  }

  // 자동 방 배정 요청
  private requestAutoRoomAssignment(): void {
    if (this.socket) {
      console.log("자동 방 배정 요청");
      this.socket.emit("requestAutoRoomAssignment");
    }
  }

  // 저장된 방 정보 확인 (만료 시간 검증 개선)
  private checkStoredRoomInfo(): void {
    const storedRoomInfo = this.loadRoomInfoFromStorage();
    if (storedRoomInfo && this.socket) {
      console.log(`저장된 방 정보 발견: ${storedRoomInfo.roomId}`);
      const roomNumber = parseInt(storedRoomInfo.roomId.replace("room_", ""));

      // 방 번호 유효성 재검증
      if (roomNumber > 0 && Number.isInteger(roomNumber)) {
        // 사용자 정보가 설정된 후 방 입장 요청
        this.socket.emit("joinSpecificRoom", { roomNumber });
      } else {
        console.warn("저장된 방 정보의 방 번호가 유효하지 않음:", roomNumber);
        this.clearRoomInfoFromStorage();
        // 저장된 방 정보가 유효하지 않으면 자동 방 배정 요청
        this.requestAutoRoomAssignment();
      }
    } else {
      // 저장된 방 정보가 없으면 자동 방 배정 요청
      this.requestAutoRoomAssignment();
    }
  }

  // 로컬 스토리지 관리 (만료 시간 설정 개선)
  private saveRoomInfoToStorage(roomId: string, userCount: number, maxUsers: number): void {
    const roomInfo: RoomInfo = {
      roomId,
      userCount,
      maxUsers,
      timestamp: Date.now(),
    };

    try {
      localStorage.setItem("chatRoomInfo", JSON.stringify(roomInfo));
      console.log("방 정보 저장됨:", roomInfo);
    } catch (error) {
      console.error("방 정보 저장 실패:", error);
    }
  }

  public loadRoomInfoFromStorage(): RoomInfo | null {
    const stored = localStorage.getItem("chatRoomInfo");
    if (stored) {
      try {
        const roomInfo: RoomInfo = JSON.parse(stored);
        const ONE_HOUR = 3600000; // 1시간

        // 만료 시간 검사 (1시간)
        if (Date.now() - roomInfo.timestamp < ONE_HOUR) {
          // 추가 유효성 검사
          if (
            roomInfo.roomId &&
            roomInfo.roomId.startsWith("room_") &&
            typeof roomInfo.userCount === "number" &&
            typeof roomInfo.maxUsers === "number"
          ) {
            return roomInfo;
          } else {
            console.warn("저장된 방 정보 형식이 유효하지 않음:", roomInfo);
            this.clearRoomInfoFromStorage();
          }
        } else {
          console.log("저장된 방 정보가 만료됨");
          this.clearRoomInfoFromStorage();
        }
      } catch (error) {
        console.error("방 정보 파싱 오류:", error);
        this.clearRoomInfoFromStorage();
      }
    }
    return null;
  }

  public clearRoomInfoFromStorage(): void {
    try {
      localStorage.removeItem("chatRoomInfo");
      console.log("방 정보가 로컬 스토리지에서 제거됨");
    } catch (error) {
      console.error("방 정보 제거 실패:", error);
    }
  }

  // 초기화 메서드들
  initializeChatSystem(user: string): void {
    console.log("채팅 시스템 초기화 시작 - 사용자:", user);

    // 게스트 사용자인 경우 실제 닉네임으로 업데이트
    if (user === "게스트") {
      this.getCurrentUserNickname().then((nickname: string) => {
        this.setUser(nickname);
        this.initializeChatSystemWithUser(nickname);
      });
    } else {
      this.setUser(user);
      this.initializeChatSystemWithUser(user);
    }
  }

  private initializeChatSystemWithUser(user: string): void {
    document.addEventListener(
      "canvasLoadingComplete",
      () => {
        console.log("캔버스 로딩 완료, 채팅 초기화 시작");
        this.initialize();
        this.connectToServer();
        console.log("채팅 시스템 초기화 완료");
      },
      { once: true }
    );
  }

  autoJoinStoredRoom(): void {
    const storedRoomInfo = this.loadRoomInfoFromStorage();
    if (storedRoomInfo) {
      console.log("저장된 방 정보로 자동 입장:", storedRoomInfo);

      // Supabase에서 현재 사용자 정보 가져오기
      this.getCurrentUserNickname().then((nickname: string) => {
        this.setUser(nickname);

        document.addEventListener(
          "canvasLoadingComplete",
          () => {
            console.log("캔버스 로딩 완료, 자동 방 입장 시작");
            this.initialize();
            this.connectToServer();
            console.log("자동 방 입장 초기화 완료");
          },
          { once: true }
        );
      });
    }
  }
}

// 싱글톤 인스턴스 생성
const chatSystem = new ChatSystem();

// 전역에서 접근 가능하도록 노출
(window as any).initializeChatSystem = (user: string) => chatSystem.initializeChatSystem(user);
(window as any).leaveRoom = () => chatSystem.leaveRoom();
(window as any).forceGoHome = () => chatSystem.forceGoHome();
(window as any).autoJoinStoredRoom = () => chatSystem.autoJoinStoredRoom();
(window as any).cleanupUI = () => chatSystem.cleanupUI();

// 브라우저 이벤트 처리
window.addEventListener("popstate", (event) => {
  console.log("URL 변경 감지:", window.location.href, "State:", event.state);

  const hash = window.location.hash;

  // world 해시가 있는 경우에만 채팅 시스템 처리
  if (hash.includes("world")) {
    const roomNumber = chatSystem.parseRoomNumberFromURL?.();

    if (roomNumber) {
      console.log(`popstate: 방 ${roomNumber}에 입장 시도`);
      if (chatSystem.socket?.connected) {
        chatSystem.socket.emit("joinSpecificRoom", { roomNumber: parseInt(roomNumber) });
      } else {
        console.log("소켓이 연결되지 않음, 재연결 시도");
        chatSystem.connectToServer();
      }
    } else {
      console.log("popstate: world 해시는 있지만 유효한 방 번호가 없음");
    }
  } else {
    console.log("popstate: world 해시가 없음, 기존 라우터가 처리");
  }
});

window.addEventListener("beforeunload", () => {
  console.log("페이지 언로드 - 방 정보 정리");
  if (chatSystem.socket) {
    chatSystem.socket.disconnect();
  }
  // 페이지 언로드 시에는 방 정보를 유지 (다음 방문 시 자동 입장을 위해)
  // chatSystem.clearRoomInfoFromStorage?.();
});

window.addEventListener("load", () => {
  setTimeout(() => {
    const hash = window.location.hash;

    // world 해시가 있는 경우에만 채팅 시스템 처리
    if (hash.includes("world")) {
      const roomNumber = chatSystem.parseRoomNumberFromURL?.();
      const storedRoomInfo = chatSystem.loadRoomInfoFromStorage?.();

      if (roomNumber) {
        console.log("페이지 로드 시 URL에서 방 번호 발견:", roomNumber);
      } else if (storedRoomInfo) {
        console.log("페이지 로드 시 저장된 방 정보 발견:", storedRoomInfo);
        const storedRoomNumber = storedRoomInfo.roomId.replace("room_", "");
        const newURL = `/#world?number=${storedRoomNumber}`;
        window.history.replaceState({ roomId: storedRoomInfo.roomId, type: "room" }, "", newURL);
      } else {
        chatSystem.cleanupUI();
      }
    } else {
      console.log("페이지 로드 시 world 해시가 없음, 기존 라우터가 처리");
    }
  }, 100);
});

// 내보내기
export { chatSystem };
export const initializeChatSystem = (user: string) => chatSystem.initializeChatSystem(user);
export const autoJoinStoredRoom = () => chatSystem.autoJoinStoredRoom();
