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
let environmentPreset = "city"; 
let lightsOn = false;

// --- LOGIC CHATBOT ---
function handleBotReply(text, socketId) {
  const lowerText = text.toLowerCase();
  let replyText = "";

  if (lowerText.includes("giá") || lowerText.includes("tiền")) replyText = "💰 Giá bán: $500,000 (Khoảng 12 tỷ VND).";
  else if (lowerText.includes("địa chỉ") || lowerText.includes("vị trí")) replyText = "📍 Vị trí: Khu Metaverse, Quận 1, TP.HCM.";
  else if (lowerText.includes("diện tích")) replyText = "📐 Diện tích: 200m² (10m x 20m).";
  else if (lowerText.includes("xin chào")) replyText = "🤖 Bot AI xin chào! Tôi có thể giúp gì?";

  if (replyText) {
    setTimeout(() => {
      // Bot trả lời công khai
      io.emit("receiveMessage", { id: "BOT_ID", name: "🤖 Trợ Lý AI", role: "bot", text: replyText });
    }, 1000);
  }
}

io.on("connection", (socket) => {
  console.log("User:", socket.id);
  
  // Gửi data ban đầu
  socket.emit("updateHouseStatus", houseStatus);
  socket.emit("updateEnvironment", environmentPreset);
  socket.emit("updateLights", lightsOn);

  // Phân quyền: Người đầu tiên là Broker
  const playerCount = Object.keys(players).length;
  let role = playerCount === 0 ? "broker" : "client";
  let name = role === "broker" ? "Môi Giới (Admin)" : `Khách ${Math.floor(Math.random() * 100)}`;
  
  players[socket.id] = {
    id: socket.id, role: role, name: name,
    position: [0, 1.6, 10], // Đứng xa một chút để bao quát nhà
    color: role === "broker" ? "#d35400" : '#' + Math.floor(Math.random()*16777215).toString(16)
  };
  io.emit("updatePlayers", players);

  // --- 1. XỬ LÝ DI CHUYỂN (WASD) ---
  socket.on("move", (newPos) => {
    if (players[socket.id]) {
        players[socket.id].position = newPos;
        socket.broadcast.emit("updatePlayers", players); // Gửi cho người khác
    }
  });

  // --- 2. XỬ LÝ CHAT (CÓ CHAT RIÊNG) ---
  socket.on("sendMessage", (data) => {
    const sender = players[socket.id];
    
    // Nếu là chat riêng (isPrivate = true)
    if (data.isPrivate) {
        // Tìm ông Broker
        const brokerId = Object.keys(players).find(key => players[key].role === 'broker');
        
        // Gửi lại cho người gửi (để họ thấy tin nhắn của mình)
        socket.emit("receiveMessage", { ...data, name: sender.name, role: sender.role, isPrivate: true });
        
        // Gửi cho Broker (nếu Broker không phải là người gửi)
        if (brokerId && brokerId !== socket.id) {
            io.to(brokerId).emit("receiveMessage", { ...data, name: sender.name, role: sender.role, isPrivate: true });
        }
    } else {
        // Chat công khai bình thường
        io.emit("receiveMessage", { id: socket.id, name: sender.name, role: sender.role, text: data.text });
        if (sender.role !== 'broker') handleBotReply(data.text, socket.id);
    }
  });

  // Các sự kiện khác
  socket.on("toggleLights", () => { lightsOn = !lightsOn; io.emit("updateLights", lightsOn); });
  socket.on("changeEnvironment", (mode) => { environmentPreset = mode; io.emit("updateEnvironment", environmentPreset); });
  
  // --- 3. HỢP ĐỒNG THÔNG MINH ---
  socket.on("changeStatus", (status) => {
    houseStatus = status;
    io.emit("updateHouseStatus", houseStatus);
    if(status === "SOLD") {
        // Thông báo toàn server
        io.emit("receiveMessage", { 
            id: "system", name: "BLOCKCHAIN", role: "system", 
            text: "📝 Hợp đồng thông minh đã kích hoạt! Giao dịch thành công." 
        });
    }
  });

  socket.on("disconnect", () => {
    delete players[socket.id];
    io.emit("updatePlayers", players);
  });
});

server.listen(3001, () => console.log("SERVER 3001 OK"));