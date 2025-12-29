const express = require('express');
const app = express();
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');

app.use(cors());
const server = http.createServer(app);
const io = new Server(server, { cors: { origin: "*" } });

// --- CẤU HÌNH NHÀ & MÀU SẮC ---
let players = {}; 
let houseStatus = "FOR SALE";
let environmentPreset = "city"; 
let lightsOn = false;

// Lưu trạng thái màu sắc của từng phòng (MỚI)
let houseDesign = {
  livingRoom: { wall: "#f5f6fa", floor: "#7f8c8d" },
  bedroom: { wall: "#fad390", floor: "#8e44ad" },
  kitchen: { wall: "#fff", floor: "#e17055" }
};

io.on("connection", (socket) => {
  // Gửi dữ liệu ban đầu
  socket.emit("updateHouseStatus", houseStatus);
  socket.emit("updateEnvironment", environmentPreset);
  socket.emit("updateLights", lightsOn);
  socket.emit("updateDesign", houseDesign); // Gửi thiết kế nhà

  // Phân vai
  const playerCount = Object.keys(players).length;
  let role = playerCount === 0 ? "broker" : "client";
  let name = role === "broker" ? "Môi Giới (Admin)" : `Khách ${Math.floor(Math.random() * 100)}`;
  
  // Thêm thuộc tính currentRoom (MỚI)
  players[socket.id] = {
    id: socket.id, role: role, name: name,
    position: [0, 0, 5],
    currentRoom: "Outside", 
    color: role === "broker" ? "#d35400" : '#' + Math.floor(Math.random()*16777215).toString(16)
  };
  io.emit("updatePlayers", players);

  // --- XỬ LÝ TIN NHẮN (PUBLIC & PRIVATE) ---
  socket.on("sendMessage", (data) => {
    const p = players[socket.id];
    
    if (data.toId) {
      // Chat riêng (MỚI)
      const targetSocket = io.sockets.sockets.get(data.toId);
      if (targetSocket) {
        // Gửi cho người nhận
        targetSocket.emit("receivePrivateMessage", {
          from: p.name, text: data.text, isSelf: false
        });
        // Gửi lại cho người gửi (để hiện lên UI)
        socket.emit("receivePrivateMessage", {
          to: players[data.toId].name, text: data.text, isSelf: true
        });
      }
    } else {
      // Chat Public (Cũ)
      io.emit("receiveMessage", {
        id: socket.id, name: p?.name, role: p?.role, text: data.text
      });
      // Logic Bot cũ (giữ nguyên, lược bớt cho gọn code này)
    }
  });

  // --- LOGIC DI CHUYỂN & PHÒNG (MỚI) ---
  socket.on("playerMove", (roomName) => {
    if (players[socket.id]) {
      players[socket.id].currentRoom = roomName;
      io.emit("updatePlayers", players);
    }
  });

  // --- LOGIC ĐỔI MÀU NHÀ (MỚI) ---
  socket.on("changeDesign", (data) => {
    // data: { room: 'livingRoom', type: 'wall' | 'floor', color: '#hex' }
    if (houseDesign[data.room]) {
      houseDesign[data.room][data.type] = data.color;
      io.emit("updateDesign", houseDesign);
    }
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

server.listen(3001, () => console.log("SERVER 2025 RUNNING ON 3001"));