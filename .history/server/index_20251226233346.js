const express = require('express');
const app = express();
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');

app.use(cors());
const server = http.createServer(app);
const io = new Server(server, { cors: { origin: "*" } });

// --- DATA ---
let players = {}; 
let houseStatus = "FOR SALE";
let environmentPreset = "city"; 
let lightsOn = false;

// --- BOT AI LOGIC ---
function handleBotReply(text, socketId) {
  const lowerText = text.toLowerCase();
  let replyText = "";

  if (lowerText.includes("giá") || lowerText.includes("tiền")) {
    replyText = "💰 Giá bán: $500,000. Hỗ trợ thanh toán bằng Smart Contract.";
  } else if (lowerText.includes("diện tích") || lowerText.includes("thông tin")) {
    replyText = "📐 Diện tích 200m² (10x20). Sổ hồng vĩnh viễn.";
  } else if (lowerText.includes("vay")) {
    replyText = "🏦 Lãi suất ưu đãi 8%/năm. Xem chi tiết tại bảng Info.";
  }

  if (replyText) {
    setTimeout(() => {
      io.emit("receiveMessage", { id: "BOT_ID", name: "🤖 AI Support", role: "bot", text: replyText });
    }, 1000);
  }
}

io.on("connection", (socket) => {
  console.log("Connect:", socket.id);

  // Gửi trạng thái ban đầu
  socket.emit("updateHouseStatus", { status: houseStatus, txData: null });
  socket.emit("updateEnvironment", environmentPreset);
  socket.emit("updateLights", lightsOn);

  // --- TẠO PLAYER (AVATAR) ---
  const playerCount = Object.keys(players).length;
  let role = playerCount === 0 ? "broker" : "client"; 
  let name = role === "broker" ? "⭐ SALES ADMIN" : `Khách ${Math.floor(Math.random() * 1000)}`;
  
  // Y=0 để chân chạm đất
  players[socket.id] = {
    id: socket.id, 
    role: role, 
    name: name,
    position: [(Math.random() - 0.5) * 6, 0, 5 + Math.random() * 5], 
    color: role === "broker" ? "#f1c40f" : '#' + Math.floor(Math.random()*16777215).toString(16)
  };
  
  io.emit("updatePlayers", players);

  // --- DI CHUYỂN ---
  socket.on("move", (position) => {
    if (players[socket.id]) {
      players[socket.id].position = position;
      socket.broadcast.emit("updatePlayers", players);
    }
  });

  // --- CHAT ---
  socket.on("sendMessage", (data) => {
    const sender = players[socket.id];
    const { text, targetId } = data; 
    
    const msgData = { 
        id: socket.id, 
        name: sender?.name, 
        role: sender?.role, 
        text: text, 
        isPrivate: !!targetId 
    };

    if (targetId) {
        // Chat riêng
        socket.emit("receiveMessage", { ...msgData, recipientName: players[targetId]?.name });
        if (players[targetId]) io.to(targetId).emit("receiveMessage", { ...msgData, recipientName: "Bạn" });
    } else {
        // Chat Public
        io.emit("receiveMessage", msgData);
        if (sender?.role !== 'broker') handleBotReply(text, socket.id);
    }
  });

  // --- XỬ LÝ SỰ KIỆN KHÁC ---
  socket.on("toggleLights", () => { lightsOn = !lightsOn; io.emit("updateLights", lightsOn); });
  socket.on("changeEnvironment", (preset) => { environmentPreset = preset; io.emit("updateEnvironment", environmentPreset); });
  
  // --- CHỐT ĐƠN & SINH SỔ HỒNG ---
  socket.on("changeStatus", (status) => {
    houseStatus = status;
    let txData = null;

    // Nếu chuyển sang ĐÃ BÁN -> Tạo dữ liệu Blockchain giả lập
    if (status === "SOLD") {
        txData = {
            hash: "0x" + Math.random().toString(16).substr(2, 40).toUpperCase(),
            timestamp: new Date().toLocaleString("vi-VN"),
            price: 500000,
            buyer: "ẨN DANH (Bảo mật)"
        };
        // Gửi thông báo hệ thống
        io.emit("receiveMessage", { id: "system", name: "BLOCKCHAIN", role: "system", text: "🔗 GIAO DỊCH THÀNH CÔNG! ĐANG TẠO SỔ HỒNG..." });
    }

    // Gửi cả trạng thái và dữ liệu giao dịch về client
    io.emit("updateHouseStatus", { status, txData });
  });

  socket.on("disconnect", () => {
    delete players[socket.id];
    io.emit("updatePlayers", players);
  });
});

server.listen(3001, () => console.log("SERVER REAL ESTATE RUNNING ON 3001"));