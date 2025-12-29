const express = require('express');
const app = express();
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');

app.use(cors());
const server = http.createServer(app);

const io = new Server(server, {
  cors: { origin: "*", methods: ["GET", "POST"] },
});

// --- TRẠNG THÁI SERVER ---
let players = {}; 
let currentFloorColor = "#e0e0e0"; // Lưu màu sàn hiện tại

io.on("connection", (socket) => {
  console.log(`User kết nối: ${socket.id}`);

  // 1. Gửi màu sàn hiện tại cho người mới vào ngay lập tức
  socket.emit("updateFloor", currentFloorColor);

  // 2. LOGIC PHÂN VAI (Người đầu tiên là Môi Giới)
  const playerCount = Object.keys(players).length;
  let role = "client"; 
  let name = `Khách ${Math.floor(Math.random() * 100)}`;
  let color = '#' + Math.floor(Math.random()*16777215).toString(16);

  if (playerCount === 0) {
    role = "broker";
    name = "Môi Giới (Admin)";
    color = "#1a1a1a"; // Màu đen
  }

  // 3. Tạo vị trí ngẫu nhiên
  const angle = Math.random() * Math.PI * 2;
  const radius = 7 + Math.random() * 3; // Cách tâm 7-10m
  const x = Math.cos(angle) * radius;
  const z = Math.sin(angle) * radius;

  players[socket.id] = {
    id: socket.id,
    role: role,
    name: name,
    position: [x, 0, z],
    color: color
  };

  // Cập nhật danh sách người chơi cho tất cả
  io.emit("updatePlayers", players);

  // 4. XỬ LÝ CHAT
  socket.on("sendMessage", (data) => {
    const p = players[socket.id];
    io.emit("receiveMessage", {
      id: socket.id,
      name: p ? p.name : "Ẩn danh",
      role: p ? p.role : "client",
      text: data.text
    });
  });

  // 5. XỬ LÝ ĐỔI MÀU SÀN (Đồng bộ)
  socket.on("changeFloorColor", (newColor) => {
    currentFloorColor = newColor; // Cập nhật biến server
    io.emit("updateFloor", currentFloorColor); // Báo tất cả đổi màu
  });

  // 6. NGẮT KẾT NỐI
  socket.on("disconnect", () => {
    delete players[socket.id];
    io.emit("updatePlayers", players);
  });
});

server.listen(3001, () => {
  console.log("SERVER BACKEND ĐANG CHẠY CỔNG 3001");
});