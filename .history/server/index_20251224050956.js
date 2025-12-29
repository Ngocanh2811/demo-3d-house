const express = require('express');
const app = express();
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');

app.use(cors());
const server = http.createServer(app);
const io = new Server(server, { cors: { origin: "*" } });

// --- TRẠNG THÁI SERVER ---
let players = {}; 
let houseStatus = "FOR SALE";
let environmentPreset = "city"; // "city" (Ngày) - "night" (Đêm)
let lightsOn = false;

io.on("connection", (socket) => {
  // Gửi trạng thái ban đầu cho người mới vào
  socket.emit("updateHouseStatus", houseStatus);
  socket.emit("updateEnvironment", environmentPreset);
  socket.emit("updateLights", lightsOn);

  // --- PHÂN VAI (Người đầu tiên vào là Môi Giới) ---
  const playerCount = Object.keys(players).length;
  let role = playerCount === 0 ? "broker" : "client";
  let name = role === "broker" ? "Môi Giới (Admin)" : `Khách ${Math.floor(Math.random() * 100)}`;
  
  // Tạo người chơi mới
  players[socket.id] = {
    id: socket.id, role: role, name: name,
    position: [Math.random() * 5, 0, Math.random() * 5],
    color: role === "broker" ? "#2c3e50" : '#' + Math.floor(Math.random()*16777215).toString(16)
  };
  io.emit("updatePlayers", players);

  // --- CHAT (Gửi kèm tên và role để hiện thị) ---
  socket.on("sendMessage", (data) => {
    const p = players[socket.id];
    io.emit("receiveMessage", {
      id: socket.id, 
      name: p?.name || "Ẩn danh", 
      role: p?.role || "client", 
      text: data.text
    });
  });

  // --- CÁC TÍNH NĂNG IOT / CHUYỂN ĐỔI SỐ ---
  
  // 1. Bật tắt đèn
  socket.on("toggleLights", () => {
    lightsOn = !lightsOn;
    io.emit("updateLights", lightsOn);
  });

  // 2. Đổi ngày đêm
  socket.on("changeEnvironment", (preset) => {
    environmentPreset = preset;
    io.emit("updateEnvironment", environmentPreset);
  });

  // 3. Đổi trạng thái bán (Check role ở frontend, nhưng server cứ nhận)
  socket.on("changeStatus", (status) => {
    houseStatus = status;
    io.emit("updateHouseStatus", houseStatus);
    if(status === "SOLD") {
       io.emit("receiveMessage", {
         id: "system", name: "HỆ THỐNG", role: "system",
         text: "🎉 CĂN NHÀ ĐÃ ĐƯỢC CHỐT ĐƠN THÀNH CÔNG! 🎉"
       });
    }
  });

  socket.on("disconnect", () => {
    delete players[socket.id];
    io.emit("updatePlayers", players);
  });
});

server.listen(3001, () => console.log("SERVER BACKEND CHẠY CỔNG 3001"));