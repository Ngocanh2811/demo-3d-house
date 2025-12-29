const express = require('express');
const app = express();
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');

app.use(cors());
const server = http.createServer(app);
const io = new Server(server, { cors: { origin: "*" } });

// --- CẤU HÌNH CŨ + MỚI ---
let players = {}; 
let houseStatus = "FOR SALE";
let lightsOn = false;
let environmentPreset = "city";

// (MỚI) Lưu màu sàn của 3 phòng (Lớp phủ)
let floorColors = {
  living: "#7f8c8d",
  kitchen: "#e17055",
  bedroom: "#8e44ad"
};

io.on("connection", (socket) => {
  // Gửi state ban đầu
  socket.emit("updateHouseStatus", houseStatus);
  socket.emit("updateLights", lightsOn);
  socket.emit("updateEnvironment", environmentPreset);
  socket.emit("updateFloors", floorColors); // Gửi màu sàn

  // Phân vai (Giữ nguyên logic cũ)
  const playerCount = Object.keys(players).length;
  let role = playerCount === 0 ? "broker" : "client";
  let name = role === "broker" ? "Môi Giới (Admin)" : `Khách ${Math.floor(Math.random() * 100)}`;
  
  players[socket.id] = {
    id: socket.id, role: role, name: name,
    position: [Math.random() * 5, 0, Math.random() * 5], // Random vị trí ngoài sân
    currentRoom: "Sân Vườn",
    color: role === "broker" ? "#d35400" : '#' + Math.floor(Math.random()*16777215).toString(16)
  };
  io.emit("updatePlayers", players);

  // --- XỬ LÝ TIN NHẮN (CŨ + MỚI) ---
  socket.on("sendMessage", (data) => {
    const p = players[socket.id];
    
    // Nếu có toId => Chat riêng (MỚI)
    if (data.toId) {
      const targetSocket = io.sockets.sockets.get(data.toId);
      const msgData = {
        id: socket.id,
        name: p.name,
        role: "private", // Đánh dấu là tin mật
        text: `(Riêng tư) ${data.text}`,
        isPrivate: true
      };
      
      // Gửi cho người nhận
      if (targetSocket) targetSocket.emit("receiveMessage", msgData);
      // Gửi lại cho người gửi (để hiện lên box mình)
      socket.emit("receiveMessage", msgData);
    } else {
      // Chat Public (CŨ - Giữ nguyên logic bot)
      io.emit("receiveMessage", {
        id: socket.id, name: p?.name, role: p?.role, text: data.text
      });
      // Logic Bot (Rút gọn cho code này, bạn có thể paste lại logic bot cũ vào đây)
    }
  });

  // (MỚI) Cập nhật vị trí phòng khi bấm WASD
  socket.on("updateRoom", (roomName) => {
    if (players[socket.id]) {
      players[socket.id].currentRoom = roomName;
      io.emit("updatePlayers", players);
    }
  });

  // (MỚI) Đổi màu sàn
  socket.on("changeFloorColor", (data) => {
    // data: { room: 'living', color: '#hex' }
    floorColors[data.room] = data.color;
    io.emit("updateFloors", floorColors);
  });

  // Các tính năng cũ
  socket.on("toggleLights", () => { lightsOn = !lightsOn; io.emit("updateLights", lightsOn); });
  socket.on("changeEnvironment", (preset) => { environmentPreset = preset; io.emit("updateEnvironment", environmentPreset); });
  socket.on("changeStatus", (status) => {
    houseStatus = status;
    io.emit("updateHouseStatus", houseStatus);
  });

  socket.on("disconnect", () => {
    delete players[socket.id];
    io.emit("updatePlayers", players);
  });
});

server.listen(3001, () => console.log("SERVER RUNNING 3001"));