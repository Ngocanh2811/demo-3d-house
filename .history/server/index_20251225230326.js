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
function handleBotReply(text, socketId) {
  const lowerText = text.toLowerCase();
  let replyText = "";

  // Bộ từ khóa AI
  if (lowerText.includes("giá") || lowerText.includes("tiền") || lowerText.includes("bao nhiêu")) {
    replyText = "💰 Giá bán niêm yết: $500,000 (Khoảng 12.5 Tỷ VND). Có hỗ trợ thanh toán USDT/BTC.";
  } else if (lowerText.includes("địa chỉ") || lowerText.includes("vị trí") || lowerText.includes("ở đâu")) {
    replyText = "📍 Vị trí vàng: Lô A1, Phố Metaverse, Quận 1 (Ngay trung tâm ảo).";
  } else if (lowerText.includes("diện tích") || lowerText.includes("rộng") || lowerText.includes("mét")) {
    replyText = "📐 Thông số: Đất 10m x 20m (200m²). Xây dựng: 1 Trệt 2 Lầu.";
  } else if (lowerText.includes("vay") || lowerText.includes("ngân hàng") || lowerText.includes("trả góp")) {
    replyText = "🏦 Chúng tôi liên kết với MetaBank hỗ trợ vay 70%. Bạn xem chi tiết trong bảng thông tin nhà nhé!";
  } else if (lowerText.includes("xin chào") || lowerText.includes("hi")) {
    replyText = "🤖 Bot AI xin chào! Bạn cần tư vấn Giá hay Thủ tục vay?";
  }

  // Chỉ trả lời nếu có khớp từ khóa
  if (replyText) {
    setTimeout(() => {
      // Gửi tin nhắn bot công khai
      io.emit("receiveMessage", { id: "BOT_ID", name: "🤖 Trợ Lý AI", role: "bot", text: replyText });
    }, 1000);
  }
}

io.on("connection", (socket) => {
  console.log("User Connected:", socket.id);

  // Gửi trạng thái hiện tại
  socket.emit("updateHouseStatus", houseStatus);
  socket.emit("updateEnvironment", environmentPreset);
  socket.emit("updateLights", lightsOn);

  // --- PHÂN QUYỀN & VỊ TRÍ ---
  const playerCount = Object.keys(players).length;
  // Người đầu tiên là Broker (Sales), còn lại là Client
  let role = playerCount === 0 ? "broker" : "client"; 
  let name = role === "broker" ? "⭐ SALES ADMIN" : `Khách ${Math.floor(Math.random() * 1000)}`;
  
  // Random vị trí xung quanh gốc tọa độ để không bị chồng lên nhau
  const randomX = (Math.random() - 0.5) * 10; 
  const randomZ = 5 + (Math.random() * 5); 

  players[socket.id] = {
    id: socket.id, 
    role: role, 
    name: name,
    position: [randomX, 1.6, randomZ], // Y=1.6 là tầm mắt người
    color: role === "broker" ? "#f1c40f" : '#' + Math.floor(Math.random()*16777215).toString(16)
  };
  
  io.emit("updatePlayers", players);

  // --- XỬ LÝ DI CHUYỂN ---
  socket.on("move", (newPos) => {
    if (players[socket.id]) {
        players[socket.id].position = newPos;
        // Gửi cho TẤT CẢ người khác (trừ bản thân)
        socket.broadcast.emit("updatePlayers", players);
    }
  });

  // --- XỬ LÝ CHAT (CÓ CHAT RIÊNG) ---
  socket.on("sendMessage", (data) => {
    const sender = players[socket.id];
    const messageData = { id: socket.id, name: sender?.name, role: sender?.role, text: data.text, isPrivate: data.isPrivate };

    if (data.isPrivate) {
        // 1. Gửi lại cho người gửi (để họ thấy tin mình vừa nhắn)
        socket.emit("receiveMessage", messageData);

        // 2. Tìm ông Sales (Broker) để gửi
        const brokerId = Object.keys(players).find(key => players[key].role === 'broker');
        if (brokerId && brokerId !== socket.id) {
            io.to(brokerId).emit("receiveMessage", messageData);
        }
    } else {
        // Chat công khai: Gửi cho tất cả
        io.emit("receiveMessage", messageData);
        
        // Bot chỉ trả lời tin nhắn công khai và không trả lời Sales
        if (sender?.role !== 'broker' && socket.id !== "BOT_ID") {
            handleBotReply(data.text, socket.id);
        }
    }
  });

  // --- CÁC TÍNH NĂNG KHÁC ---
  socket.on("toggleLights", () => { lightsOn = !lightsOn; io.emit("updateLights", lightsOn); });
  socket.on("changeEnvironment", (preset) => { environmentPreset = preset; io.emit("updateEnvironment", environmentPreset); });
  
  socket.on("changeStatus", (status) => {
    houseStatus = status;
    io.emit("updateHouseStatus", houseStatus);
    if(status === "SOLD") {
        // Thông báo sự kiện Blockchain
        io.emit("receiveMessage", { id: "system", name: "BLOCKCHAIN", role: "system", text: "🔗 HỢP ĐỒNG THÔNG MINH ĐÃ KÍCH HOẠT! GIAO DỊCH THÀNH CÔNG." });
    }
  });

  socket.on("disconnect", () => {
    delete players[socket.id];
    io.emit("updatePlayers", players);
  });
});

server.listen(3001, () => console.log("SERVER ĐANG CHẠY CỔNG 3001"));