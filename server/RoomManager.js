// ============================================================
// RoomManager.js - Quản lý phòng chơi Mèo Nổ
// Tạo, tham gia, rời phòng, bắt đầu game
// ============================================================

const ServerGame = require('./ServerGame');

class RoomManager {
  constructor(io) {
    this.io = io;
    // Map: roomCode → room object
    this.rooms = new Map();
    // Map: socketId → roomCode (để tìm phòng nhanh)
    this.socketToRoom = new Map();
  }

  // ============================================================
  // Tạo mã phòng ngẫu nhiên 6 ký tự (chữ hoa + số)
  // ============================================================
  generateRoomCode() {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let code;
    do {
      code = '';
      for (let i = 0; i < 6; i++) {
        code += chars.charAt(Math.floor(Math.random() * chars.length));
      }
    } while (this.rooms.has(code)); // Đảm bảo mã không trùng
    return code;
  }

  // ============================================================
  // Tạo phòng mới
  // ============================================================
  createRoom(socket, { name, avatar, maxPlayers }) {
    // Kiểm tra nếu người chơi đang ở phòng khác
    if (this.socketToRoom.has(socket.id)) {
      socket.emit('error_message', { message: 'Bạn đang ở trong một phòng khác!' });
      return;
    }

    // Giới hạn maxPlayers hợp lệ (2-5)
    maxPlayers = Math.min(Math.max(maxPlayers || 4, 2), 5);

    const code = this.generateRoomCode();
    const room = {
      code,
      hostId: socket.id,
      players: [
        {
          id: socket.id,
          name: name || 'Người chơi',
          avatar: avatar || 'default',
          ready: false,
          index: 0
        }
      ],
      maxPlayers,
      status: 'waiting', // 'waiting' | 'playing' | 'finished'
      game: null
    };

    this.rooms.set(code, room);
    this.socketToRoom.set(socket.id, code);

    // Cho socket vào room channel của Socket.io
    socket.join(code);

    socket.emit('room_created', {
      roomCode: code,
      room: this.sanitizeRoom(room)
    });

    console.log(`[PHÒNG] ${name} tạo phòng ${code} (tối đa ${maxPlayers} người)`);
  }

  // ============================================================
  // Tham gia phòng
  // ============================================================
  joinRoom(socket, { roomCode, name, avatar }) {
    // Kiểm tra nếu người chơi đang ở phòng khác
    if (this.socketToRoom.has(socket.id)) {
      socket.emit('error_message', { message: 'Bạn đang ở trong một phòng khác!' });
      return;
    }

    const code = (roomCode || '').toUpperCase().trim();
    const room = this.rooms.get(code);

    // Kiểm tra phòng tồn tại
    if (!room) {
      socket.emit('error_message', { message: 'Phòng không tồn tại!' });
      return;
    }

    // Kiểm tra trạng thái phòng
    if (room.status !== 'waiting') {
      socket.emit('error_message', { message: 'Trò chơi đã bắt đầu!' });
      return;
    }

    // Kiểm tra phòng đầy
    if (room.players.length >= room.maxPlayers) {
      socket.emit('error_message', { message: 'Phòng đã đầy!' });
      return;
    }

    // Thêm người chơi vào phòng
    const player = {
      id: socket.id,
      name: name || 'Người chơi',
      avatar: avatar || 'default',
      ready: false,
      index: room.players.length
    };

    room.players.push(player);
    this.socketToRoom.set(socket.id, code);
    socket.join(code);

    // Thông báo cho người vừa tham gia
    socket.emit('room_joined', {
      roomCode: code,
      room: this.sanitizeRoom(room)
    });

    // Thông báo cho những người khác trong phòng
    socket.to(code).emit('player_joined', {
      player: { id: player.id, name: player.name, avatar: player.avatar, index: player.index },
      room: this.sanitizeRoom(room)
    });

    console.log(`[PHÒNG] ${name} tham gia phòng ${code} (${room.players.length}/${room.maxPlayers})`);
  }

  // ============================================================
  // Rời phòng
  // ============================================================
  leaveRoom(socket) {
    const code = this.socketToRoom.get(socket.id);
    if (!code) return;

    const room = this.rooms.get(code);
    if (!room) {
      this.socketToRoom.delete(socket.id);
      return;
    }

    const leavingPlayer = room.players.find(p => p.id === socket.id);
    const playerName = leavingPlayer ? leavingPlayer.name : 'Không rõ';

    // Nếu game đang chơi, xử lý disconnect trong game
    if (room.game && leavingPlayer) {
      room.game.handlePlayerDisconnect(socket.id);
    }

    // Xóa người chơi khỏi phòng
    room.players = room.players.filter(p => p.id !== socket.id);
    this.socketToRoom.delete(socket.id);
    socket.leave(code);

    // Nếu chủ phòng rời → hủy phòng
    if (room.hostId === socket.id) {
      // Thông báo cho tất cả người còn lại
      this.io.to(code).emit('room_destroyed', {
        message: 'Chủ phòng đã rời, phòng bị giải tán!'
      });

      // Xóa mapping cho tất cả người chơi còn lại
      room.players.forEach(p => {
        this.socketToRoom.delete(p.id);
        const memberSocket = this.io.sockets.sockets.get(p.id);
        if (memberSocket) memberSocket.leave(code);
      });

      // Dọn dẹp game nếu đang chơi
      if (room.game) {
        room.game.cleanup();
      }

      this.rooms.delete(code);
      console.log(`[PHÒNG] Phòng ${code} bị hủy (chủ phòng ${playerName} rời)`);
      return;
    }

    // Cập nhật lại index cho người chơi còn lại
    room.players.forEach((p, i) => { p.index = i; });

    // Thông báo cho những người còn lại
    this.io.to(code).emit('player_left', {
      playerId: socket.id,
      playerName,
      room: this.sanitizeRoom(room)
    });

    console.log(`[PHÒNG] ${playerName} rời phòng ${code} (còn ${room.players.length}/${room.maxPlayers})`);

    // Nếu phòng trống → xóa
    if (room.players.length === 0) {
      if (room.game) room.game.cleanup();
      this.rooms.delete(code);
      console.log(`[PHÒNG] Phòng ${code} bị xóa (trống)`);
    }
  }

  // ============================================================
  // Bật/tắt trạng thái sẵn sàng
  // ============================================================
  toggleReady(socket) {
    const room = this.getRoomBySocket(socket.id);
    if (!room || room.status !== 'waiting') return;

    const player = room.players.find(p => p.id === socket.id);
    if (!player) return;

    // Chủ phòng không cần ready
    if (player.id === room.hostId) return;

    player.ready = !player.ready;

    this.io.to(room.code).emit('player_ready', {
      playerId: socket.id,
      ready: player.ready,
      room: this.sanitizeRoom(room)
    });
  }

  // ============================================================
  // Bắt đầu game (chỉ chủ phòng)
  // ============================================================
  startGame(socket) {
    const room = this.getRoomBySocket(socket.id);
    if (!room) {
      socket.emit('error_message', { message: 'Bạn không ở trong phòng nào!' });
      return;
    }

    // Chỉ chủ phòng mới được bắt đầu
    if (room.hostId !== socket.id) {
      socket.emit('error_message', { message: 'Chỉ chủ phòng mới được bắt đầu trò chơi!' });
      return;
    }

    // Kiểm tra trạng thái phòng
    if (room.status !== 'waiting') {
      socket.emit('error_message', { message: 'Trò chơi đã bắt đầu rồi!' });
      return;
    }

    // Cần ít nhất 2 người chơi
    if (room.players.length < 2) {
      socket.emit('error_message', { message: 'Cần ít nhất 2 người chơi để bắt đầu!' });
      return;
    }

    // Kiểm tra tất cả (trừ host) đã sẵn sàng
    const notReady = room.players.filter(p => p.id !== room.hostId && !p.ready);
    if (notReady.length > 0) {
      const names = notReady.map(p => p.name).join(', ');
      socket.emit('error_message', {
        message: `Người chơi chưa sẵn sàng: ${names}`
      });
      return;
    }

    // Bắt đầu game!
    room.status = 'playing';

    // Chuẩn bị danh sách người chơi cho game engine
    const gamePlayers = room.players.map(p => ({
      id: p.id,
      name: p.name,
      avatar: p.avatar,
      index: p.index
    }));

    // Tạo ServerGame instance
    room.game = new ServerGame(this.io, room.code, gamePlayers);
    room.game.start();

    console.log(`[GAME] Phòng ${room.code} bắt đầu chơi với ${gamePlayers.length} người!`);
  }

  // ============================================================
  // Xử lý ngắt kết nối
  // ============================================================
  handleDisconnect(socket) {
    const code = this.socketToRoom.get(socket.id);
    if (!code) return;

    // Delegate to leaveRoom which handles game disconnect too
    this.leaveRoom(socket);
  }

  // ============================================================
  // Chuyển tiếp hành động game đến ServerGame instance
  // ============================================================
  forwardToGame(socket, method, args) {
    const room = this.getRoomBySocket(socket.id);
    if (!room) {
      socket.emit('error_message', { message: 'Bạn không ở trong phòng nào!' });
      return;
    }

    if (!room.game) {
      socket.emit('error_message', { message: 'Trò chơi chưa bắt đầu!' });
      return;
    }

    if (room.status !== 'playing') {
      socket.emit('error_message', { message: 'Trò chơi chưa bắt đầu hoặc đã kết thúc!' });
      return;
    }

    // Gọi phương thức tương ứng trên ServerGame
    if (typeof room.game[method] === 'function') {
      room.game[method](...args);
    } else {
      console.error(`[LỖI] Phương thức ${method} không tồn tại trên ServerGame`);
    }
  }

  // ============================================================
  // Tìm phòng theo socketId
  // ============================================================
  getRoomBySocket(socketId) {
    const code = this.socketToRoom.get(socketId);
    if (!code) return null;
    return this.rooms.get(code) || null;
  }

  // ============================================================
  // Lọc thông tin phòng an toàn để gửi cho client
  // (không bao gồm game state bí mật)
  // ============================================================
  sanitizeRoom(room) {
    return {
      code: room.code,
      hostId: room.hostId,
      maxPlayers: room.maxPlayers,
      status: room.status,
      players: room.players.map(p => ({
        id: p.id,
        name: p.name,
        avatar: p.avatar,
        ready: p.ready,
        index: p.index
      }))
    };
  }
}

module.exports = RoomManager;
