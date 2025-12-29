const express = require('express');
const app = express();
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');

app.use(cors());
const server = http.createServer(app);
const io = new Server(server, { cors: { origin: "*" } });

// --- DỮ LIỆU LƯU TRỮ ---
let players = {}; 
let houseStatus = "FOR SALE";
let environmentPreset = "city"; 
let lightsOn = false;

// --- LOGIC BOT AI ---
function handleBotReply(text, socketId) {
  const lowerText = text.toLowerCase();
  let replyText = "";

  if (lowerText.includes("giá") || lowerText.includes("tiền")) {
    replyText = "💰 Giá: $500,000. Có hỗ trợ thanh toán Crypto.";
  } else if (lowerText.includes("diện tích") || lowerText.includes("rộng")) {
    replyText = "📐 Diện tích 200m² (10x20), Hướng Đông Nam mát mẻ.";
  } else if (lowerText.includes("vay")) {
    replyText = "🏦 Hỗ trợ vay 70%. Mời bạn click vào biển Info đỏ để tính lãi.";
  } else if (lowerText.includes("chào")) {
    replyText = "🤖 Bot xin chào! Cần thông tin gì cứ hỏi nhé.";
  }

  if (replyText) {
    setTimeout(() => {
      io.emit("receiveMessage", { id: "BOT_ID", name: "🤖 Trợ Lý AI", role: "bot", text: replyText });
    }, 1000);
  }
}

io.on("connection", (socket) => {
  console.log("Connect:", socket.id);

  socket.emit("updateHouseStatus", houseStatus);
  socket.emit("updateEnvironment", environmentPreset);
  socket.emit("updateLights", lightsOn);

  // --- TẠO NGƯỜI CHƠI ---
  const playerCount = Object.keys(players).length;
  // Người đầu tiên là BROKER, còn lại là KHÁCH
  let role = playerCount === 0 ? "broker" : "client"; 
  let name = role === "broker" ? "⭐ SALES ADMIN" : `Khách ${Math.floor(Math.random() * 1000)}`;
  
  // Vị trí: Y=0 (Mặt đất) để avatar không bay
  players[socket.id] = {
    id: socket.id, 
    role: role, 
    name: name,
    position: [(Math.random() - 0.5) * 5, 0, 5 + Math.random() * 5], 
    color: role === "broker" ? "#f1c40f" : '#' + Math.floor(Math.random()*16777215).toString(16)
  };
  
  io.emit("updatePlayers", players);

  // --- XỬ LÝ DI CHUYỂN ---
  socket.on("move", (position) => {
    if (players[socket.id]) {
      // position gửi lên là [x, 0, z] từ client
      players[socket.id].position = position;
      socket.broadcast.emit("updatePlayers", players);
    }
  });

  // --- XỬ LÝ CHAT (ĐÃ NÂNG CẤP) ---
  socket.on("sendMessage", (data) => {
    const sender = players[socket.id];
    // targetId: ID người nhận (nếu nhắn riêng), null nếu public
    const { text, targetId } = data; 
    
    const msgData = { 
        id: socket.id, 
        name: sender?.name, 
        role: sender?.role, 
        text: text, 
        isPrivate: !!targetId 
    };

    if (targetId) {
        // --- NHẮN RIÊNG (PRIVATE) ---
        // 1. Gửi lại cho người gửi (để hiện bên phải chatbox)
        socket.emit("receiveMessage", { ...msgData, recipientName: players[targetId]?.name });
        
        // 2. Gửi cho người nhận
        if (players[targetId]) {
            io.to(targetId).emit("receiveMessage", { ...msgData, recipientName: "Bạn" });
        }
    } else {
        // --- NHẮN PUBLIC ---
        io.emit("receiveMessage", msgData);
        if (sender?.role !== 'broker') handleBotReply(text, socket.id);
    }
  });

  // --- TÍNH NĂNG KHÁC ---
  socket.on("toggleLights", () => { lightsOn = !lightsOn; io.emit("updateLights", lightsOn); });
  socket.on("changeEnvironment", (preset) => { environmentPreset = preset; io.emit("updateEnvironment", environmentPreset); });
  
  socket.on("changeStatus", (status) => {
    houseStatus = status;
    io.emit("updateHouseStatus", houseStatus);
    if(status === "SOLD") {
      io.emit("receiveMessage", { id: "system", name: "BLOCKCHAIN", role: "system", text: "🔗 SMART CONTRACT: ĐÃ CHỐT ĐƠN THÀNH CÔNG!" });
    }
  });

  socket.on("disconnect", () => {
    delete players[socket.id];
    io.emit("updatePlayers", players);
  });
});

server.listen(3001, () => console.log("SERVER CHẠY: http://localhost:3001"));