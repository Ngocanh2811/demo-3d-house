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

// --- LOGIC CHATBOT AI ---
function handleBotReply(text) {
  const lowerText = text.toLowerCase();
  let replyText = "";

  if (lowerText.includes("giá") || lowerText.includes("tiền")) {
    replyText = "💰 Giá bán: $500,000 (Có hỗ trợ thanh toán Crypto).";
  } else if (lowerText.includes("địa chỉ") || lowerText.includes("vị trí")) {
    replyText = "📍 Vị trí: Khu Metaverse Quận 1, TP.HCM.";
  } else if (lowerText.includes("diện tích") || lowerText.includes("rộng")) {
    replyText = "📐 Diện tích đất: 200m² (10m x 20m).";
  } else if (lowerText.includes("liên hệ") || lowerText.includes("mua")) {
    replyText = "📞 Vui lòng liên hệ Admin (Môi giới) đang có mặt trong phòng để làm thủ tục Blockchain.";
  } else if (lowerText.includes("xin chào")) {
    replyText = "🤖 Bot AI xin chào! Bạn cần thông tin gì về căn nhà này?";
  }

  if (replyText) {
    setTimeout(() => {
      io.emit("receiveMessage", { id: "BOT_ID", name: "🤖 Trợ Lý AI", role: "bot", text: replyText });
    }, 1000);
  }
}

io.on("connection", (socket) => {
  console.log("User Connected:", socket.id);

  // Gửi trạng thái hiện tại cho người mới vào
  socket.emit("updateHouseStatus", houseStatus);
  socket.emit("updateEnvironment", environmentPreset);
  socket.emit("updateLights", lightsOn);

  // Tạo người chơi mới
  const playerCount = Object.keys(players).length;
  let role = playerCount === 0 ? "broker" : "client"; // Người đầu tiên là Broker
  let name = role === "broker" ? "Môi Giới (Admin)" : `Khách ${Math.floor(Math.random() * 100)}`;
  
  players[socket.id] = {
    id: socket.id, role: role, name: name,
    position: [0, 0, 5], // Vị trí đứng ban đầu
    color: role === "broker" ? "#d35400" : '#' + Math.floor(Math.random()*16777215).toString(16)
  };
  
  io.emit("updatePlayers", players); // Cập nhật danh sách người chơi cho tất cả

  // --- XỬ LÝ DI CHUYỂN (QUAN TRỌNG) ---
  socket.on("move", (newPos) => {
    if (players[socket.id]) {
        players[socket.id].position = newPos;
        // Gửi vị trí mới của người này cho những người khác (broadcast)
        // Dùng broadcast để người gửi không nhận lại tin của chính mình (đỡ lag)
        socket.broadcast.emit("updatePlayers", players);
    }
  });

  // --- XỬ LÝ CHAT ---
  socket.on("sendMessage", (data) => {
    const p = players[socket.id];
    io.emit("receiveMessage", { id: socket.id, name: p?.name || "Ẩn danh", role: p?.role || "client", text: data.text });

    if (p?.role !== 'broker' && socket.id !== "BOT_ID") {
        handleBotReply(data.text);
    }
  });

  // --- CÁC TÍNH NĂNG KHÁC ---
  socket.on("toggleLights", () => { 
      lightsOn = !lightsOn; 
      io.emit("updateLights", lightsOn); 
  });
  
  socket.on("changeEnvironment", (preset) => { 
      environmentPreset = preset; 
      io.emit("updateEnvironment", environmentPreset); 
  });
  
  socket.on("changeStatus", (status) => {
    houseStatus = status;
    io.emit("updateHouseStatus", houseStatus);
    if(status === "SOLD") {
        io.emit("receiveMessage", { id: "system", name: "HỆ THỐNG", role: "system", text: "🎉 GIAO DỊCH THÀNH CÔNG TRÊN BLOCKCHAIN! 🎉" });
    }
  });

  socket.on("disconnect", () => {
    delete players[socket.id];
    io.emit("updatePlayers", players);
  });
});

server.listen(3001, () => console.log("SERVER ĐANG CHẠY CỔNG 3001"));