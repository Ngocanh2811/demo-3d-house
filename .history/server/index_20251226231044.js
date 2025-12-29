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
    replyText = "💰 Giá bán niêm yết: $500,000. Có hỗ trợ thanh toán Crypto.";
  } else if (lowerText.includes("vị trí") || lowerText.includes("địa chỉ")) {
    replyText = "📍 Vị trí: Quận 1 Metaverse, ngay trung tâm.";
  } else if (lowerText.includes("vay") || lowerText.includes("lãi")) {
    replyText = "🏦 Hỗ trợ vay 70%. Bạn hãy click vào nút INFO màu đỏ trên nhà để tính lãi nhé.";
  } else if (lowerText.includes("chào") || lowerText.includes("hi")) {
    replyText = "🤖 Bot xin chào! Bạn cần thông tin gì về căn nhà?";
  }

  if (replyText) {
    setTimeout(() => {
      io.emit("receiveMessage", { id: "BOT_ID", name: "🤖 Trợ Lý AI", role: "bot", text: replyText });
    }, 1000);
  }
}

io.on("connection", (socket) => {
  console.log("Người chơi kết nối:", socket.id);

  // Gửi trạng thái hiện tại cho người mới vào
  socket.emit("updateHouseStatus", houseStatus);
  socket.emit("updateEnvironment", environmentPreset);
  socket.emit("updateLights", lightsOn);

  // --- TẠO NGƯỜI CHƠI ---
  const playerCount = Object.keys(players).length;
  // Người đầu tiên vào là BROKER, còn lại là KHÁCH
  let role = playerCount === 0 ? "broker" : "client"; 
  let name = role === "broker" ? "⭐ SALES ADMIN" : `Khách ${Math.floor(Math.random() * 1000)}`;
  
  // Random vị trí xuất hiện
  players[socket.id] = {
    id: socket.id, 
    role: role, 
    name: name,
    position: [(Math.random() - 0.5) * 5, 1.6, 5 + Math.random() * 5], 
    color: role === "broker" ? "#f1c40f" : '#' + Math.floor(Math.random()*16777215).toString(16)
  };
  
  io.emit("updatePlayers", players);

  // --- XỬ LÝ DI CHUYỂN (QUAN TRỌNG) ---
  socket.on("move", (position) => {
    if (players[socket.id]) {
      players[socket.id].position = position;
      // Gửi vị trí mới cho những người khác (trừ chính mình để đỡ lag)
      socket.broadcast.emit("updatePlayers", players);
    }
  });

  // --- XỬ LÝ CHAT ---
  socket.on("sendMessage", (data) => {
    const sender = players[socket.id];
    const msgData = { id: socket.id, name: sender?.name, role: sender?.role, text: data.text, isPrivate: data.isPrivate };

    if (data.isPrivate) {
        // Gửi cho chính mình
        socket.emit("receiveMessage", msgData);
        // Tìm và gửi cho người nhận
        const recipientId = Object.keys(players).find(key => players[key].name === data.recipient);
        if (recipientId && recipientId !== socket.id) io.to(recipientId).emit("receiveMessage", msgData);
    } else {
        io.emit("receiveMessage", msgData);
        if (sender?.role !== 'broker') handleBotReply(data.text, socket.id);
    }
  });

  // --- CÁC TÍNH NĂNG KHÁC ---
  socket.on("toggleLights", () => { lightsOn = !lightsOn; io.emit("updateLights", lightsOn); });
  socket.on("changeEnvironment", (preset) => { environmentPreset = preset; io.emit("updateEnvironment", environmentPreset); });
  
  socket.on("changeStatus", (status) => {
    houseStatus = status;
    io.emit("updateHouseStatus", houseStatus);
    if(status === "SOLD") {
      io.emit("receiveMessage", { id: "system", name: "BLOCKCHAIN", role: "system", text: "🔗 HỢP ĐỒNG THÔNG MINH ĐÃ KÍCH HOẠT THÀNH CÔNG!" });
    }
  });

  socket.on("disconnect", () => {
    delete players[socket.id];
    io.emit("updatePlayers", players);
    console.log("User ngắt kết nối:", socket.id);
  });
});

server.listen(3001, () => console.log(">>> SERVER ĐANG CHẠY TẠI http://localhost:3001"));