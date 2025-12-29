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

let players = {}; 

io.on("connection", (socket) => {
  console.log(`User kết nối: ${socket.id}`);

  // --- LOGIC PHÂN VAI ---
  // Đếm số người đang có trong phòng
  const playerCount = Object.keys(players).length;
  
  let role = "client"; // Mặc định là khách
  let name = `Khách ${Math.floor(Math.random() * 100)}`;
  let color = '#' + Math.floor(Math.random()*16777215).toString(16);

  // Nếu chưa có ai -> Người này là Môi Giới
  if (playerCount === 0) {
    role = "broker";
    name = "Môi Giới (Admin)";
    color = "#1a1a1a"; // Màu đen (Vest)
  }

  // Tạo vị trí ngẫu nhiên quanh nhà
  const angle = Math.random() * Math.PI * 2;
  const radius = 8 + Math.random() * 2;
  const x = Math.cos(angle) * radius;
  const z = Math.sin(angle) * radius;

  players[socket.id] = {
    id: socket.id,
    role: role, // Lưu vai trò vào
    name: name,
    position: [x, 0, z],
    color: color
  };

  io.emit("updatePlayers", players);

  socket.on("sendMessage", (data) => {
    // Gửi kèm vai trò để Frontend hiển thị màu chữ khác nhau
    const currentPlayer = players[socket.id];
    io.emit("receiveMessage", {
      id: socket.id,
      name: currentPlayer ? currentPlayer.name : "Ẩn danh",
      role: currentPlayer ? currentPlayer.role : "client",
      text: data.text
    });
  });

  socket.on("disconnect", () => {
    delete players[socket.id];
    io.emit("updatePlayers", players);
  });
});

server.listen(3001, () => {
  console.log("SERVER RUNNING PORT 3001");
});