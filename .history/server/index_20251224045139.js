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
let houseStatus = "FOR SALE";
let environmentPreset = "city"; 
let lightsOn = false; // TRẠNG THÁI ĐÈN SÂN VƯỜN (Mới)

io.on("connection", (socket) => {
  // Gửi trạng thái ban đầu
  socket.emit("updateHouseStatus", houseStatus);
  socket.emit("updateEnvironment", environmentPreset);
  socket.emit("updateLights", lightsOn); // Gửi trạng thái đèn

  // --- PHÂN VAI ---
  const playerCount = Object.keys(players).length;
  let role = playerCount === 0 ? "broker" : "client";
  let name = role === "broker" ? "Môi Giới (Admin)" : `Khách ${Math.floor(Math.random() * 100)}`;
  
  players[socket.id] = {
    id: socket.id, role: role, name: name,
    position: [Math.random() * 5, 0, Math.random() * 5],
    color: role === "broker" ? "#1a1a1a" : '#' + Math.floor(Math.random()*16777215).toString(16)
  };
  io.emit("updatePlayers", players);

  // --- XỬ LÝ CHAT ---
  socket.on("sendMessage", (data) => {
    const p = players[socket.id];
    io.emit("receiveMessage", {
      id: socket.id, name: p?.name, role: p?.role, text: data.text
    });
  });

  // --- XỬ LÝ ĐÈN SÂN VƯỜN (Thay cho đổi màu sàn) ---
  socket.on("toggleLights", () => {
    lightsOn = !lightsOn; // Đảo ngược trạng thái
    io.emit("updateLights", lightsOn);
  });

  // --- XỬ LÝ MÔI TRƯỜNG ---
  socket.on("changeEnvironment", (preset) => {
    environmentPreset = preset;
    io.emit("updateEnvironment", environmentPreset);
  });

  // --- XỬ LÝ BIỂN BÁO (CHỈ CHO PHÉP NẾU LÀ BROKER - Check tại Client rồi, nhưng Server nhận là đổi) ---
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

server.listen(3001, () => console.log("SERVER 3001 RUNNING"));