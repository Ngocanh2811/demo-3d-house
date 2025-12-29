const express = require('express');
const app = express();
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');

app.use(cors());
const server = http.createServer(app);
const io = new Server(server, { cors: { origin: "*" } });

// --- CẤU HÌNH ---
let players = {}; 
let houseStatus = "FOR SALE";
let lightsOn = false;
let environmentPreset = "city";

io.on("connection", (socket) => {
  // Gửi state ban đầu
  socket.emit("updateHouseStatus", houseStatus);
  socket.emit("updateLights", lightsOn);
  socket.emit("updateEnvironment", environmentPreset);

  // Phân vai
  const playerCount = Object.keys(players).length;
  let role = playerCount === 0 ? "broker" : "client";
  let name = role === "broker" ? "Môi Giới (Admin)" : `Khách ${Math.floor(Math.random() * 100)}`;
  
  // Khởi tạo người chơi
  players[socket.id] = {
    id: socket.id, role: role, name: name,
    position: [0, 0, 5], // Bắt đầu ở sân trước
    rotation: 0,
    currentRoom: "Sân Vườn",
    color: role === "broker" ? "#d35400" : '#' + Math.floor(Math.random()*16777215).toString(16)
  };
  io.emit("updatePlayers", players);

  // --- XỬ LÝ DI CHUYỂN (WASD) ---
  socket.on("playerMove", (data) => {
    // data gồm: position, currentRoom
    if (players[socket.id]) {
      players[socket.id].position = data.position;
      players[socket.id].currentRoom = data.currentRoom;
      // Broadcast cho mọi người khác thấy mình di chuyển
      socket.broadcast.emit("updatePlayers", players);
    }
  });

  // --- XỬ LÝ CHAT (Có chat riêng) ---
  socket.on("sendMessage", (data) => {
    const p = players[socket.id];
    if (data.toId) {
      // Chat riêng
      const target = io.sockets.sockets.get(data.toId);
      const msg = { id: socket.id, name: p.name, text: `(Riêng tư) ${data.text}`, isPrivate: true };
      if (target) target.emit("receiveMessage", msg);
      socket.emit("receiveMessage", msg);
    } else {
      // Chat chung
      io.emit("receiveMessage", { id: socket.id, name: p.name, role: p.role, text: data.text });
    }
  });

  // Các tính năng tiện ích
  socket.on("toggleLights", () => { lightsOn = !lightsOn; io.emit("updateLights", lightsOn); });
  socket.on("changeEnvironment", (preset) => { environmentPreset = preset; io.emit("updateEnvironment", environmentPreset); });
  socket.on("changeStatus", (status) => { houseStatus = status; io.emit("updateHouseStatus", houseStatus); });

  socket.on("disconnect", () => {
    delete players[socket.id];
    io.emit("updatePlayers", players);
  });
});

server.listen(3001, () => console.log("SERVER RUNNING 3001"));