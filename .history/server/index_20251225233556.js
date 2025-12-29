const express = require('express');
const app = express();
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');

app.use(cors());
const server = http.createServer(app);
const io = new Server(server, { cors: { origin: "*" } });

let players = {}; 
let houseStatus = "FOR SALE";
let environmentPreset = "city"; 
let lightsOn = false;

// --- AI BOT LOGIC ---
function handleBotReply(text, socketId) {
  const lowerText = text.toLowerCase();
  let replyText = "";

  if (lowerText.includes("giá") || lowerText.includes("tiền") || lowerText.includes("bao nhiêu")) {
    replyText = "💰 Giá bán hiện tại: $500,000 (Có hỗ trợ trả góp qua MetaBank).";
  } else if (lowerText.includes("địa chỉ") || lowerText.includes("ở đâu")) {
    replyText = "📍 Địa chỉ: Lô A1, Phố Metaverse (Khu đất vàng trung tâm).";
  } else if (lowerText.includes("nhà rộng") || lowerText.includes("diện tích")) {
    replyText = "📐 Diện tích: 200m² (10x20m), xây dựng 1 trệt 2 lầu.";
  } else if (lowerText.includes("tư vấn") || lowerText.includes("hello") || lowerText.includes("chào")) {
    replyText = "👋 Chào bạn! Tôi là AI hỗ trợ. Bạn cần thông tin về Giá hay Thủ tục vay?";
  }

  if (replyText) {
    // Giả lập độ trễ như người thật đang gõ
    setTimeout(() => {
      io.emit("receiveMessage", { id: "BOT_ID", name: "🤖 Trợ Lý AI", role: "bot", text: replyText });
    }, 1000);
  }
}

io.on("connection", (socket) => {
  console.log("User Connected:", socket.id);

  socket.emit("updateHouseStatus", houseStatus);
  socket.emit("updateEnvironment", environmentPreset);
  socket.emit("updateLights", lightsOn);

  // Người đầu tiên vào là Broker
  const playerCount = Object.keys(players).length;
  let role = playerCount === 0 ? "broker" : "client"; 
  let name = role === "broker" ? "⭐ SALES ADMIN" : `Khách ${Math.floor(Math.random() * 900) + 100}`;
  
  // Random vị trí xuất hiện (tránh trùng nhau)
  players[socket.id] = {
    id: socket.id, 
    role: role, 
    name: name,
    // Y = 1.6 để đứng trên mặt đất, không bị chìm
    position: [(Math.random() - 0.5) * 5, 1.6, 10 + (Math.random() * 5)], 
    rotation: 0,
    color: role === "broker" ? "#f1c40f" : `hsl(${Math.random() * 360}, 70%, 50%)`
  };
  
  io.emit("updatePlayers", players);

  // --- XỬ LÝ DI CHUYỂN (REAL-TIME) ---
  socket.on("move", (data) => {
    if (players[socket.id]) {
        // Cập nhật cả vị trí và góc quay
        players[socket.id].position = data.pos;
        players[socket.id].rotation = data.rot;
        // Broadcast gửi cho TẤT CẢ người khác (trừ người gửi)
        socket.broadcast.emit("updatePlayers", players);
    }
  });

  socket.on("sendMessage", (data) => {
    const sender = players[socket.id];
    const msgData = { id: socket.id, name: sender?.name, role: sender?.role, text: data.text, isPrivate: data.isPrivate };

    if (data.isPrivate) {
        socket.emit("receiveMessage", msgData); // Gửi lại cho mình
        // Tìm Sales để gửi
        const brokerId = Object.keys(players).find(key => players[key].role === 'broker');
        if (brokerId && brokerId !== socket.id) {
            io.to(brokerId).emit("receiveMessage", msgData);
        }
    } else {
        io.emit("receiveMessage", msgData);
        if (sender?.role !== 'broker') handleBotReply(data.text, socket.id);
    }
  });

  socket.on("changeStatus", (status) => {
    houseStatus = status;
    io.emit("updateHouseStatus", houseStatus);
    if(status === "SOLD") {
       io.emit("receiveMessage", { id: "sys", name: "HỆ THỐNG", role: "system", text: "🔥 CĂN NHÀ ĐÃ ĐƯỢC CHỐT ĐƠN THÀNH CÔNG!" });
    }
  });

  socket.on("toggleLights", () => { lightsOn = !lightsOn; io.emit("updateLights", lightsOn); });
  socket.on("changeEnvironment", (p) => { environmentPreset = p; io.emit("updateEnvironment", environmentPreset); });

  socket.on("disconnect", () => {
    delete players[socket.id];
    io.emit("updatePlayers", players);
  });
});

server.listen(3001, () => console.log("SERVER RUNNING ON PORT 3001"));