import { io, Socket } from "socket.io-client";
import { chatHtml } from "../../data/chatHtml";

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
  };

  // 채팅 UI HTML 템플릿
  private static readonly CHAT_HTML_TEMPLATE = chatHtml.chat;

  // DOM 요소 찾기 헬퍼
  private findElement<T extends Element>(selector: string): T | null {
    return document.querySelector<T>(selector);
  }

  // 채팅 초기화
  initialize(): void {
    console.log("채팅 초기화 시작");

    this.ui.container = this.findElement<HTMLDivElement>("#chat");
    if (!this.ui.container) {
      console.error("채팅 컨테이너를 찾을 수 없습니다.");
      return;
    }

    this.ui.container.innerHTML = ChatSystem.CHAT_HTML_TEMPLATE;

    // UI 요소들 찾기
    this.ui.form = this.findElement<HTMLFormElement>("#chat-form");
    this.ui.input = this.findElement<HTMLInputElement>("#chat-input");
    this.ui.messages = this.findElement<HTMLUListElement>("#chat-messages");

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

    this.ui.container.addEventListener("click", (e) => {
      const target = e.target as HTMLElement;

      if (target.closest(".chat-leave-button") || target.closest("#leave-room-button")) {
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
      <div class="message-text">${text}</div>
    `;

    this.ui.messages.appendChild(li);
    this.ui.messages.scrollTop = this.ui.messages.scrollHeight;
  }

  // 시스템 메시지 추가
  addSystemMessage(text: string): void {
    this.addMessage("시스템", text);
  }

  // 방 정보 업데이트
  updateRoomInfo(roomId: string, userCount: number, maxUsers: number): void {
    const roomInfoElement = this.findElement<HTMLElement>("#room-info");
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

    const header = document.createElement("div");
    header.className = "world-header";
    header.innerHTML = `
      <div class="world-header-content">
        <h1>채팅 월드 ${roomNumber}</h1>
      </div>
    `;

    document.body.insertBefore(header, document.body.firstChild);
  }

  // 기존 헤더 제거
  private removeExistingHeaders(): void {
    const existingHeaders = document.querySelectorAll(".world-header");
    existingHeaders.forEach((header) => header.remove());
  }

  // 소켓 연결
  connectToServer(): void {
    console.log("채팅 서버에 연결 중...");

    this.socket = io("http://localhost:8000");

    this.socket.on("connect", () => {
      console.log("채팅 서버 연결됨:", this.socket?.id);
      this.addSystemMessage("채팅 서버에 연결되었습니다.");
      this.checkURLForRoom();
    });

    this.socket.on("roomAssigned", (data: { roomId: string; userCount: number; maxUsers: number }) => {
      this.updateRoomInfo(data.roomId, data.userCount, data.maxUsers);
      this.addSystemMessage(`${data.roomId} 방에 입장했습니다. (${data.userCount}/${data.maxUsers}명)`);
      console.log(`방 배정 완료: ${data.roomId} (${data.userCount}/${data.maxUsers}명)`);
    });

    this.socket.on("userJoined", (data: { roomId: string; userCount: number; message: string }) => {
      this.updateRoomInfo(data.roomId, data.userCount, 50);
      this.addSystemMessage(data.message);
    });

    this.socket.on("userLeft", (data: { roomId: string; userCount: number; message: string }) => {
      this.updateRoomInfo(data.roomId, data.userCount, 50);
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
    });
  }

  // 사용자 설정
  setUser(user: string): void {
    this.currentUser = user;
    console.log("현재 사용자 설정:", user);
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

    if (this.ui.container) {
      this.ui.container.innerHTML = '<div id="chat"></div>';
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
    const scene = this.findElement<HTMLElement>("#scene");
    if (scene) {
      scene.classList.remove("loaded");
      scene.style.removeProperty("opacity");
    }

    const mainTag = this.findElement<HTMLElement>(".main");
    if (mainTag) {
      mainTag.classList.remove("ui-visible");
    }

    const loadingUI = this.findElement<HTMLElement>(".loading-wrapper");
    if (loadingUI) {
      loadingUI.style.display = "none";
    }

    this.cleanupGLBModels();
    console.log("캔버스가 초기 상태로 되돌아갔습니다.");
  }

  // GLB 모델 정리
  private cleanupGLBModels(): void {
    if ((window as any).cleanupScene) {
      (window as any).cleanupScene();
    }
    console.log("GLB 모델들이 정리되었습니다.");
  }

  // 인트로 화면 표시
  private showIntroWrapper(): void {
    const introWrapper = this.findElement<HTMLElement>(".intro-wrapper");
    if (introWrapper) {
      introWrapper.style.display = "flex";
      introWrapper.style.opacity = "1";
      console.log("인트로 화면이 다시 표시되었습니다.");
    }
  }

  // URL에서 방 번호 파싱
  public parseRoomNumberFromURL(): string | null {
    const hash = window.location.hash;
    if (hash.includes("world") && hash.includes("number=")) {
      const match = hash.match(/number=(\d+)/);
      return match ? match[1] : null;
    }
    return null;
  }

  // URL에서 방 번호 확인
  private checkURLForRoom(): void {
    const roomNumber = this.parseRoomNumberFromURL();

    if (roomNumber) {
      console.log(`URL에서 방 번호 감지: ${roomNumber}`);
      if (this.socket) {
        this.socket.emit("joinSpecificRoom", { roomNumber: parseInt(roomNumber) });
      }
    } else {
      this.checkStoredRoomInfo();
    }
  }

  // 저장된 방 정보 확인
  private checkStoredRoomInfo(): void {
    const storedRoomInfo = this.loadRoomInfoFromStorage();
    if (storedRoomInfo && this.socket) {
      console.log(`저장된 방 정보 발견: ${storedRoomInfo.roomId}`);
      const roomNumber = parseInt(storedRoomInfo.roomId.replace("room_", ""));
      this.socket.emit("joinSpecificRoom", { roomNumber });
    }
  }

  // 로컬 스토리지 관리
  private saveRoomInfoToStorage(roomId: string, userCount: number, maxUsers: number): void {
    const roomInfo: RoomInfo = {
      roomId,
      userCount,
      maxUsers,
      timestamp: Date.now(),
    };
    localStorage.setItem("chatRoomInfo", JSON.stringify(roomInfo));
  }

  public loadRoomInfoFromStorage(): RoomInfo | null {
    const stored = localStorage.getItem("chatRoomInfo");
    if (stored) {
      try {
        const roomInfo: RoomInfo = JSON.parse(stored);
        if (Date.now() - roomInfo.timestamp < 3600000) {
          return roomInfo;
        }
      } catch (error) {
        console.error("방 정보 파싱 오류:", error);
      }
    }
    return null;
  }

  public clearRoomInfoFromStorage(): void {
    localStorage.removeItem("chatRoomInfo");
  }

  // 초기화 메서드들
  initializeChatSystem(user: string): void {
    console.log("채팅 시스템 초기화 시작 - 사용자:", user);

    this.setUser(user);

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
      this.setUser("게스트");

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
    }
  }

  // 헤더 강제 제거 (디버깅용)
  forceRemoveHeader(): void {
    const headers = document.querySelectorAll(".world-header");
    console.log(`강제 헤더 제거: ${headers.length}개 발견`);
    headers.forEach((header, index) => {
      console.log(`헤더 ${index + 1} 제거:`, header);
      header.remove();
    });

    const mainElement = this.findElement<HTMLElement>(".main");
    if (mainElement) {
      mainElement.style.marginTop = "0";
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
(window as any).forceRemoveHeader = () => chatSystem.forceRemoveHeader();

// 브라우저 이벤트 처리
window.addEventListener("popstate", (event) => {
  console.log("URL 변경 감지:", window.location.href, "State:", event.state);

  const roomNumber =
    chatSystem.parseRoomNumberFromURL?.() ||
    (() => {
      const hash = window.location.hash;
      if (hash.includes("world") && hash.includes("number=")) {
        const match = hash.match(/number=(\d+)/);
        return match ? match[1] : null;
      }
      return null;
    })();

  if (roomNumber && window.location.hash.includes("world")) {
    console.log(`popstate: 방 ${roomNumber}에 입장 시도`);
    if (chatSystem.socket) {
      chatSystem.socket.emit("joinSpecificRoom", { roomNumber: parseInt(roomNumber) });
    } else {
      chatSystem.connectToServer();
    }
  } else {
    console.log("popstate: 방에서 나가기");
    chatSystem.forceGoHome();
  }
});

window.addEventListener("beforeunload", () => {
  console.log("페이지 언로드 - 방 정보 정리");
  if (chatSystem.socket) {
    chatSystem.socket.disconnect();
  }
  chatSystem.clearRoomInfoFromStorage?.();
});

window.addEventListener("load", () => {
  setTimeout(() => {
    const roomNumber =
      chatSystem.parseRoomNumberFromURL?.() ||
      (() => {
        const hash = window.location.hash;
        if (hash.includes("world") && hash.includes("number=")) {
          const match = hash.match(/number=(\d+)/);
          return match ? match[1] : null;
        }
        return null;
      })();

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
  }, 100);
});

// 내보내기
export { chatSystem };
export const initializeChatSystem = (user: string) => chatSystem.initializeChatSystem(user);
export const autoJoinStoredRoom = () => chatSystem.autoJoinStoredRoom();
