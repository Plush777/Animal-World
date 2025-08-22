// server.js
import express from "express";
import { createServer } from "http";
import { Server } from "socket.io";

const app = express();
const httpServer = createServer(app);

// CORS
app.use((req, res, next) => {
  res.header("Access-Control-Allow-Origin", "*");
  res.header("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS");
  res.header("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept, Authorization");

  if (req.method === "OPTIONS") {
    res.sendStatus(200);
  } else {
    next();
  }
});

const io = new Server(httpServer, {
  cors: {
    origin: "*", // 개발용
  },
});

// 방 관리 클래스
class RoomManager {
  private rooms: Map<string, Set<string>> = new Map(); // roomId -> Set of socketIds
  private userRooms: Map<string, string> = new Map(); // socketId -> roomId
  public maxUsersPerRoom = 50;

  // 사용자를 방에 배정
  assignUserToRoom(socketId: string): string {
    console.log(`방 배정 시작 - 현재 방 개수: ${this.rooms.size}`);

    // 방 번호 순서대로 정렬하여 가장 낮은 번호부터 확인
    const sortedRooms = Array.from(this.rooms.entries()).sort(([a], [b]) => {
      const aNum = parseInt(a.replace("room_", ""));
      const bNum = parseInt(b.replace("room_", ""));
      return aNum - bNum;
    });

    // 여유가 있는 방 찾기 (가장 낮은 번호부터)
    for (const [roomId, users] of sortedRooms) {
      if (users.size < this.maxUsersPerRoom) {
        // 사용자를 방에 추가
        users.add(socketId);
        this.userRooms.set(socketId, roomId);
        console.log(`기존 방 ${roomId}에 배정 (현재 인원: ${users.size}/${this.maxUsersPerRoom})`);
        return roomId;
      }
    }

    // 여유가 있는 방이 없으면 새 방 생성
    const nextRoomNumber = this.getNextRoomNumber();
    const targetRoom = `room_${nextRoomNumber}`;
    this.rooms.set(targetRoom, new Set());

    // 사용자를 새 방에 추가
    const roomUsers = this.rooms.get(targetRoom)!;
    roomUsers.add(socketId);
    this.userRooms.set(socketId, targetRoom);

    console.log(`새 방 생성 및 배정: ${targetRoom} (현재 인원: ${roomUsers.size}/${this.maxUsersPerRoom})`);
    return targetRoom;
  }

  // 다음 방 번호 계산 (연속된 가장 작은 번호)
  private getNextRoomNumber(): number {
    if (this.rooms.size === 0) {
      return 1;
    }

    // 현재 존재하는 방 번호들을 정렬
    const existingRoomNumbers = Array.from(this.rooms.keys())
      .map((roomId) => parseInt(roomId.replace("room_", "")))
      .sort((a, b) => a - b);

    // 연속되지 않는 가장 작은 번호 찾기
    for (let i = 1; i <= existingRoomNumbers.length + 1; i++) {
      if (!existingRoomNumbers.includes(i)) {
        return i;
      }
    }

    // 모든 번호가 연속되어 있다면 다음 번호 반환
    return existingRoomNumbers.length + 1;
  }

  // 특정 방에 사용자 배정
  assignUserToSpecificRoom(socketId: string, roomNumber: number): string | null {
    const targetRoom = `room_${roomNumber}`;

    console.log(`특정 방 배정 시도: ${targetRoom}, 현재 방 목록:`, Array.from(this.rooms.keys()));

    // 해당 방이 존재하는지 확인
    if (!this.rooms.has(targetRoom)) {
      console.log(`방 ${targetRoom}이 존재하지 않습니다. 새로 생성합니다.`);
      this.rooms.set(targetRoom, new Set());
    }

    const roomUsers = this.rooms.get(targetRoom)!;

    // 방이 가득 찬 경우
    if (roomUsers.size >= this.maxUsersPerRoom) {
      console.log(`방 ${targetRoom}이 가득 찼습니다. (${roomUsers.size}/${this.maxUsersPerRoom})`);
      return null;
    }

    // 사용자를 방에 추가
    roomUsers.add(socketId);
    this.userRooms.set(socketId, targetRoom);

    console.log(`사용자 ${socketId}를 특정 방 ${targetRoom}에 배정 (현재 인원: ${roomUsers.size}/${this.maxUsersPerRoom})`);

    return targetRoom;
  }

  // 사용자를 방에서 제거
  removeUserFromRoom(socketId: string): string | null {
    const roomId = this.userRooms.get(socketId);
    if (!roomId) return null;

    const roomUsers = this.rooms.get(roomId);
    if (roomUsers) {
      roomUsers.delete(socketId);

      // 방이 비어있으면 방 삭제
      if (roomUsers.size === 0) {
        this.rooms.delete(roomId);
        console.log(`방 ${roomId}가 비어서 삭제됨 (현재 방 개수: ${this.rooms.size})`);
      } else {
        console.log(`사용자 ${socketId}가 방 ${roomId}에서 나감 (현재 인원: ${roomUsers.size}/${this.maxUsersPerRoom})`);
      }
    }

    this.userRooms.delete(socketId);
    return roomId;
  }

  // 방의 사용자 수 반환
  getRoomUserCount(roomId: string): number {
    return this.rooms.get(roomId)?.size || 0;
  }

  // 사용자의 현재 방 반환
  getUserRoom(socketId: string): string | null {
    return this.userRooms.get(socketId) || null;
  }

  // 모든 방 정보 반환 (번호 순으로 정렬)
  getAllRooms(): Array<{ roomId: string; userCount: number }> {
    const rooms = [];
    for (const [roomId, users] of this.rooms) {
      rooms.push({ roomId, userCount: users.size });
    }

    // 방 번호 순으로 정렬
    return rooms.sort((a, b) => {
      const aNum = parseInt(a.roomId.replace("room_", ""));
      const bNum = parseInt(b.roomId.replace("room_", ""));
      return aNum - bNum;
    });
  }

  // 전체 통계 정보 반환
  getStats(): { totalRooms: number; totalUsers: number; maxUsersPerRoom: number } {
    let totalUsers = 0;
    for (const users of this.rooms.values()) {
      totalUsers += users.size;
    }

    return {
      totalRooms: this.rooms.size,
      totalUsers,
      maxUsersPerRoom: this.maxUsersPerRoom,
    };
  }
}

const roomManager = new RoomManager();

// 방에 접속 처리
io.on("connection", (socket) => {
  console.log("새 유저 접속:", socket.id);

  // 초기 연결 시에는 방 배정하지 않음 (클라이언트에서 명시적으로 요청할 때 배정)

  // 사용자 정보 저장을 위한 이벤트 리스너
  socket.on("setUserInfo", ({ nickname }) => {
    socket.data.nickname = nickname;
    console.log(`사용자 정보 설정: ${nickname}`);

    // 현재 사용자의 방 정보 가져오기
    const currentRoom = roomManager.getUserRoom(socket.id);
    if (currentRoom) {
      // 방의 다른 사용자들에게 새 사용자 입장 알림
      const roomNumber = currentRoom.replace("room_", "");
      socket.to(currentRoom).emit("userJoined", {
        roomId: currentRoom,
        userCount: roomManager.getRoomUserCount(currentRoom),
        message: `${nickname}님이 월드 채널 ${roomNumber}에 입장하셨습니다.`,
      });
    }
  });

  // 메시지 전송 처리
  socket.on("sendMessage", ({ nickname, text }) => {
    const userRoom = roomManager.getUserRoom(socket.id);
    if (userRoom) {
      io.to(userRoom).emit("message", {
        user: nickname,
        text,
        timestamp: new Date().toISOString(),
      });
    }
  });

  // 특정 방 입장 요청 처리
  socket.on("joinSpecificRoom", ({ roomNumber }) => {
    console.log(`사용자 ${socket.id}가 방 ${roomNumber} 입장 요청`);

    // 현재 방에서 나가기
    const currentRoom = roomManager.getUserRoom(socket.id);
    if (currentRoom) {
      socket.leave(currentRoom);
      roomManager.removeUserFromRoom(socket.id);
    }

    // 특정 방에 입장
    const assignedRoom = roomManager.assignUserToSpecificRoom(socket.id, roomNumber);

    if (assignedRoom) {
      socket.join(assignedRoom);

      // 방 배정 완료 알림 (사용자 정보가 있으면 포함)
      const nickname = socket.data.nickname || "사용자";
      const roomNumber = assignedRoom.replace("room_", "");
      socket.emit("roomAssigned", {
        roomId: assignedRoom,
        userCount: roomManager.getRoomUserCount(assignedRoom),
        maxUsers: roomManager.maxUsersPerRoom,
        nickname: nickname,
        roomNumber: roomNumber,
      });

      // 사용자 정보가 이미 설정되어 있다면 입장 알림 전송
      if (socket.data.nickname) {
        const roomNumberStr = assignedRoom.replace("room_", "");
        socket.to(assignedRoom).emit("userJoined", {
          roomId: assignedRoom,
          userCount: roomManager.getRoomUserCount(assignedRoom),
          message: `${socket.data.nickname}님이 월드 채널 ${roomNumberStr}에 입장하셨습니다.`,
        });
      }
    } else {
      // 방이 가득 찬 경우
      socket.emit("roomFull", {
        message: `방 ${roomNumber}이 가득 찼습니다. 다른 방에 입장합니다.`,
      });

      // 자동으로 다른 방에 배정
      const newAssignedRoom = roomManager.assignUserToRoom(socket.id);
      socket.join(newAssignedRoom);

      socket.emit("roomAssigned", {
        roomId: newAssignedRoom,
        userCount: roomManager.getRoomUserCount(newAssignedRoom),
        maxUsers: roomManager.maxUsersPerRoom,
      });
    }
  });

  // 자동 방 배정 요청 처리
  socket.on("requestAutoRoomAssignment", () => {
    console.log(`사용자 ${socket.id}가 자동 방 배정 요청`);

    // 현재 방에서 나가기
    const currentRoom = roomManager.getUserRoom(socket.id);
    if (currentRoom) {
      socket.leave(currentRoom);
      roomManager.removeUserFromRoom(socket.id);
    }

    // 자동으로 방에 배정
    const assignedRoom = roomManager.assignUserToRoom(socket.id);
    socket.join(assignedRoom);

    // 방 배정 완료 알림 (사용자 정보가 있으면 포함)
    const nickname = socket.data.nickname || "사용자";
    const roomNumber = assignedRoom.replace("room_", "");
    socket.emit("roomAssigned", {
      roomId: assignedRoom,
      userCount: roomManager.getRoomUserCount(assignedRoom),
      maxUsers: roomManager.maxUsersPerRoom,
      nickname: nickname,
      roomNumber: roomNumber,
    });

    // 사용자 정보가 이미 설정되어 있다면 입장 알림 전송
    if (socket.data.nickname) {
      const roomNumberStr = assignedRoom.replace("room_", "");
      socket.to(assignedRoom).emit("userJoined", {
        roomId: assignedRoom,
        userCount: roomManager.getRoomUserCount(assignedRoom),
        message: `${socket.data.nickname}님이 월드 채널 ${roomNumberStr}에 입장하셨습니다.`,
      });
    }
  });

  // 연결 해제 처리
  socket.on("disconnect", () => {
    console.log("유저 연결 해제:", socket.id);
    const leftRoom = roomManager.removeUserFromRoom(socket.id);

    if (leftRoom) {
      // 방의 다른 사용자들에게 사용자 퇴장 알림
      const nickname = socket.data.nickname || "사용자";
      const roomNumber = leftRoom.replace("room_", "");
      socket.to(leftRoom).emit("userLeft", {
        roomId: leftRoom,
        userCount: roomManager.getRoomUserCount(leftRoom),
        message: `${nickname}님이 월드 채널 ${roomNumber}에서 퇴장하셨습니다.`,
      });
    }
  });
});

// 방 목록 조회 API
app.get("/rooms", (req, res) => {
  const rooms = roomManager.getAllRooms();
  res.json({
    rooms,
    maxUsersPerRoom: roomManager.maxUsersPerRoom,
  });
});

// 전체 통계 조회 API
app.get("/stats", (req, res) => {
  const stats = roomManager.getStats();
  res.json(stats);
});

// 상세 정보 조회 API (방 목록 + 통계)
app.get("/status", (req, res) => {
  const rooms = roomManager.getAllRooms();
  const stats = roomManager.getStats();
  res.json({
    ...stats,
    rooms,
  });
});

httpServer.listen(8000, () => {
  console.log("서버 실행 중: http://localhost:8000");
});
