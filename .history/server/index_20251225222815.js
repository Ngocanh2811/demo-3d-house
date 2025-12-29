const express = require('express');
const app = express();
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');

app.use(cors());
const server = http.createServer(app);
const io = new Server(server, { cors: { origin: "*" } });

// --- STATE ---
let players = {}; 
let houseConfig = {
  status: "FOR SALE",
  env: "city",
  lights: false,
  wallColor: "#f5f6fa", // Mặc định màu tường
  floorColor: "#7f8c8d" // Mặc định màu sàn
};

// --- LOGIC CHATBOT (Giữ nguyên logic cũ, rút gọn cho gọn code) ---
function getBotReply(text) {
  const t = text.toLowerCase();
  if (t.includes("giá")) return "💰 Giá: $500,000 (12 tỷ VND).";
  if (t.includes("diện tích")) return "📐 200m² (10x20), sàn 350m².";
  if (t.includes("liên hệ")) return "📞 Gọi Admin: 0909.888.888";
  return null;
}

io.on("connection", (socket) => {
  console.log("User connected:", socket.id);

  // 1. Gửi cấu hình nhà hiện tại
  socket.emit("initHouse", houseConfig);

  // 2. Phân vai & Tạo Player
  const playerCount = Object.keys(players).length;
  const role = playerCount === 0 ? "broker" : "client";
  const name = role === "broker" ? "Môi Giới (Admin)" : `Khách ${Math.floor(Math.random() * 999)}`;
  
  players[socket.id] = {
    id: socket.id, role, name,
    position: [0, 1, 5], // Vị trí xuất phát
    rotation: 0,
    color: role === "broker" ? "#d35400" : '#' + Math.floor(Math.random()*16777215).toString(16)
  };
  
  // Gửi danh sách player cho tất cả
  io.emit("updatePlayers", players);

  // --- XỬ LÝ DI CHUYỂN (REAL-TIME) ---
  socket.on("playerMove", (data) => {
    if (players[socket.id]) {
      players[socket.id].position = data.position;
      players[socket.id].rotation = data.rotation;
      // Chỉ gửi update cho người KHÁC (để tránh lag cho chính mình)
      socket.broadcast.emit("playerMoved", { id: socket.id, position: data.position, rotation: data.rotation });
    }
  });

  // --- XỬ LÝ CHAT (CHUNG & RIÊNG) ---
  socket.on("sendMessage", ({ text, toId }) => {
    const sender = players[socket.id];
    const msgData = { id: socket.id, name: sender.name, role: sender.role, text, isPrivate: !!toId };

    if (toId) {
      // Chat riêng: Gửi cho người nhận và người gửi
      io.to(toId).emit("receiveMessage", msgData);
      socket.emit("receiveMessage", msgData);
    } else {
      // Chat chung
      io.emit("receiveMessage", msgData);
      // Bot trả lời nếu chat chung
      if (sender.role !== 'broker') {
        const botReply = getBotReply(text);
        if (botReply) {
            setTimeout(() => io.emit("receiveMessage", { id: "BOT", name: "🤖 AI", role: "bot", text: botReply }), 1000);
        }
      }
    }
  });

  // --- CÁC TÍNH NĂNG NHÀ (Status, Màu sắc, Đèn) ---
  socket.on("updateHouseConfig", (newConfig) => {
    // Merge config mới vào config cũ
    houseConfig = { ...houseConfig, ...newConfig };
    io.emit("syncHouseConfig", houseConfig); // Đồng bộ cho tất cả
  });

  socket.on("disconnect", () => {
    delete players[socket.id];
    io.emit("updatePlayers", players);
  });
});

server.listen(3001, () => console.log("SERVER RUNNING PORT 3001"));