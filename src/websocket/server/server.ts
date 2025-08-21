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
  private roomCounter = 1;

  // 사용자를 방에 배정
  assignUserToRoom(socketId: string): string {
    // 빈 방이나 여유가 있는 방 찾기 (가장 오래된 방부터)
    let targetRoom = null;
    let oldestRoom = null;
    let oldestRoomId = null;

    console.log(`방 배정 시작 - 현재 방 개수: ${this.rooms.size}`);

    // 방을 번호 순서대로 정렬하여 가장 오래된 방부터 확인
    const sortedRooms = Array.from(this.rooms.entries()).sort(([a], [b]) => {
      const aNum = parseInt(a.replace("room_", ""));
      const bNum = parseInt(b.replace("room_", ""));
      return aNum - bNum;
    });

    for (const [roomId, users] of sortedRooms) {
      // 가장 오래된 방 기록
      if (!oldestRoom || roomId < oldestRoomId!) {
        oldestRoom = users;
        oldestRoomId = roomId;
      }

      // 여유가 있는 방 찾기
      if (users.size < this.maxUsersPerRoom) {
        targetRoom = roomId;
        console.log(`기존 방 ${roomId}에 배정 (현재 인원: ${users.size}/${this.maxUsersPerRoom})`);
        break;
      }
    }

    // 여유가 있는 방이 없으면 새 방 생성
    if (!targetRoom) {
      targetRoom = `room_${this.roomCounter++}`;
      this.rooms.set(targetRoom, new Set());
      console.log(`새 방 생성: ${targetRoom}`);
    }

    // 사용자를 방에 추가
    const roomUsers = this.rooms.get(targetRoom)!;
    roomUsers.add(socketId);
    this.userRooms.set(socketId, targetRoom);

    console.log(`사용자 ${socketId}를 방 ${targetRoom}에 배정 (현재 인원: ${roomUsers.size}/${this.maxUsersPerRoom})`);

    return targetRoom;
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

  // 모든 방 정보 반환
  getAllRooms(): Array<{ roomId: string; userCount: number }> {
    const rooms = [];
    for (const [roomId, users] of this.rooms) {
      rooms.push({ roomId, userCount: users.size });
    }
    return rooms;
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

  // 사용자를 자동으로 방에 배정
  const assignedRoom = roomManager.assignUserToRoom(socket.id);
  socket.join(assignedRoom);

  // 방 배정 완료 알림
  socket.emit("roomAssigned", {
    roomId: assignedRoom,
    userCount: roomManager.getRoomUserCount(assignedRoom),
    maxUsers: roomManager.maxUsersPerRoom,
  });

  // 방의 다른 사용자들에게 새 사용자 입장 알림
  socket.to(assignedRoom).emit("userJoined", {
    roomId: assignedRoom,
    userCount: roomManager.getRoomUserCount(assignedRoom),
    message: "새로운 사용자가 입장했습니다.",
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

      // 방 배정 완료 알림
      socket.emit("roomAssigned", {
        roomId: assignedRoom,
        userCount: roomManager.getRoomUserCount(assignedRoom),
        maxUsers: roomManager.maxUsersPerRoom,
      });

      // 방의 다른 사용자들에게 새 사용자 입장 알림
      socket.to(assignedRoom).emit("userJoined", {
        roomId: assignedRoom,
        userCount: roomManager.getRoomUserCount(assignedRoom),
        message: "새로운 사용자가 입장했습니다.",
      });
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

  // 연결 해제 처리
  socket.on("disconnect", () => {
    console.log("유저 연결 해제:", socket.id);
    const leftRoom = roomManager.removeUserFromRoom(socket.id);

    if (leftRoom) {
      // 방의 다른 사용자들에게 사용자 퇴장 알림
      socket.to(leftRoom).emit("userLeft", {
        roomId: leftRoom,
        userCount: roomManager.getRoomUserCount(leftRoom),
        message: "사용자가 퇴장했습니다.",
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
