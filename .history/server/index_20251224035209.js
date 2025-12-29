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
  console.log(`Tab mới: ${socket.id}`);

  // --- TẠO VỊ TRÍ MỚI (Hình tròn quanh nhà) ---
  const angle = Math.random() * Math.PI * 2; // Góc ngẫu nhiên 360 độ
  const radius = 8 + Math.random() * 2;      // Khoảng cách từ tâm: 8 đến 10 mét
  const x = Math.cos(angle) * radius;
  const z = Math.sin(angle) * radius;

  const randomName = "Khách " + Math.floor(Math.random() * 1000);

  players[socket.id] = {
    id: socket.id,
    name: randomName,
    position: [x, 0, z], // Y=0 là đứng trên mặt đất
    color: '#' + Math.floor(Math.random()*16777215).toString(16)
  };

  io.emit("updatePlayers", players);

  socket.on("sendMessage", (data) => {
    // Khi nhận tin nhắn, Server tìm tên người gửi và gắn vào
    const senderName = players[socket.id] ? players[socket.id].name : "Ẩn danh";
    
    io.emit("receiveMessage", {
      id: socket.id,
      name: senderName, // Gửi kèm tên
      text: data.text
    });
  });

  socket.on("disconnect", () => {
    delete players[socket.id];
    io.emit("updatePlayers", players);
  });
});

server.listen(3001, () => {
  console.log("SERVER BACKEND: PORT 3001");
});