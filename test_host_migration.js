/**
 * test_host_migration.js
 * Automated integration test to verify Socket.io Host Migration
 */

const { io } = require('socket.io-client');

const SERVER_URL = 'http://localhost:3000';

console.log('🏁 Khởi chạy kiểm thử di trú Host (Host Migration)...');

async function runTest() {
  return new Promise((resolve, reject) => {
    let hostClient, guestClient;
    let roomCode = null;
    let originalHostId = null;

    function connectClient(name) {
      const socket = io(SERVER_URL, {
        forceNew: true,
        transports: ['websocket']
      });

      socket.on('connect', () => {
        console.log(`🔌 [${name}] Đã kết nối với ID: ${socket.id}`);
      });

      socket.on('error_message', (data) => {
        console.error(`❌ [${name}] LỖI TỪ SERVER:`, data.message);
      });

      return socket;
    }

    // Set a timeout of 10 seconds to prevent hanging
    const timeout = setTimeout(() => {
      cleanupAndFinish(false, 'Hết thời gian chờ (10s)');
    }, 10000);

    function cleanupAndFinish(success, reason = '') {
      clearTimeout(timeout);
      console.log('\n🧹 Dọn dẹp kết nối...');
      if (hostClient) hostClient.disconnect();
      if (guestClient) guestClient.disconnect();

      if (success) {
        console.log('✅ THỬ NGHIỆM DI TRÚ HOST THÀNH CÔNG RỰC RỠ!');
        resolve();
      } else {
        console.error(`❌ THỬ NGHIỆM THẤT BẠI! Lý do: ${reason}`);
        reject(new Error(reason));
      }
    }

    // Connect Host client
    hostClient = connectClient('HostCat');

    hostClient.on('room_created', (data) => {
      roomCode = data.roomCode;
      originalHostId = hostClient.id;
      console.log(`🏠 [HostCat] Đã tạo phòng thành công! Mã phòng: ${roomCode} | Host ID: ${originalHostId}`);

      // Now connect Guest client
      guestClient = connectClient('GuestCat');

      guestClient.on('room_joined', (joinData) => {
        console.log(`👥 [GuestCat] Đã vào phòng thành công!`);

        // Now, GuestCat listens for player_left to check promotion
        guestClient.on('player_left', (leftData) => {
          console.log(`📢 [GuestCat] Nhận tin: Có người chơi rời phòng!`);
          console.log(`   Rời phòng: ${leftData.playerId}`);
          console.log(`   Host mới: ${leftData.newHostId}`);

          // Assertions
          const hostLeftCorrectly = leftData.playerId === originalHostId;
          const guestPromotedCorrectly = leftData.newHostId === guestClient.id;
          const roomStateUpdated = leftData.room && leftData.room.hostId === guestClient.id;

          if (hostLeftCorrectly && guestPromotedCorrectly && roomStateUpdated) {
            console.log(`🎉 [GuestCat] Được phong làm Chủ Phòng mới thành công!`);
            console.log(`🎉 Giao thức di trú Host trực tuyến hoạt động hoàn hảo!`);
            setTimeout(() => {
              cleanupAndFinish(true);
            }, 1000);
          } else {
            cleanupAndFinish(false, 'Dữ liệu di trú Host không hợp lệ');
          }
        });

        // Host client leaves the room
        console.log('⚡ [HostCat] Đang rời phòng để kích hoạt di trú Host...');
        setTimeout(() => {
          hostClient.emit('leave_room');
        }, 1000);
      });

      // Guest client joins room
      setTimeout(() => {
        console.log('👥 [GuestCat] Đang gửi yêu cầu vào phòng...');
        guestClient.emit('join_room', { roomCode, name: 'GuestCat', avatar: '😸' });
      }, 500);
    });

    // Host client creates room
    setTimeout(() => {
      console.log('🏠 [HostCat] Đang gửi yêu cầu tạo phòng...');
      hostClient.emit('create_room', { name: 'HostCat', avatar: '😺', maxPlayers: 4 });
    }, 1000);
  });
}

runTest()
  .then(() => {
    process.exit(0);
  })
  .catch((err) => {
    console.error(err);
    process.exit(1);
  });
