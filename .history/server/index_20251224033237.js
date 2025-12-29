const express = require('express');
const app = express();
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');

app.use(cors());

const server = http.createServer(app);

// Cấu hình Socket (Cho phép Frontend localhost kết nối)
const io = new Server(server, {
  cors: {
    origin: "*", 
    methods: ["GET", "POST"],
  },
});

let players = {}; // Danh sách người đang online

io.on("connection", (socket) => {
  console.log(`Tab mới đã mở: ${socket.id}`);

  // 1. Tạo vị trí & màu ngẫu nhiên cho người mới vào
  players[socket.id] = {
    id: socket.id,
    // Vị trí random xung quanh tâm
    position: [(Math.random() - 0.5) * 5, 0.5, (Math.random() - 0.5) * 5], 
    color: '#' + Math.floor(Math.random()*16777215).toString(16)
  };

  // 2. Gửi danh sách người chơi mới nhất cho TẤT CẢ các Tab
  io.emit("updatePlayers", players);

  // 3. Nhận tin nhắn chat từ 1 Tab -> Gửi cho tất cả
  socket.on("sendMessage", (data) => {
    io.emit("receiveMessage", data);
  });

  // 4. Khi đóng Tab -> Xóa người đó
  socket.on("disconnect", () => {
    console.log("Đã đóng Tab:", socket.id);
    delete players[socket.id];
    io.emit("updatePlayers", players);
  });
});

server.listen(3001, () => {
  console.log("SERVER BACKEND ĐANG CHẠY Ở PORT 3001");
});