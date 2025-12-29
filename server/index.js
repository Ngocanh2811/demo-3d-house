const express = require('express');
const app = express();
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');

app.use(cors());
const server = http.createServer(app);
const io = new Server(server, { cors: { origin: "*" } });

// --- DỮ LIỆU ---
let players = {}; 
let houseStatus = "FOR SALE";
let environmentPreset = "city"; 
let lightsOn = false;

// --- BOT AI ---
function handleBotReply(text, socketId) {
  const lowerText = text.toLowerCase();
  let replyText = "";
  if (lowerText.includes("giá") || lowerText.includes("tiền")) {
    replyText = "💰 Giá bán: $500,000. Hỗ trợ vay ngân hàng 70%.";
  } else if (lowerText.includes("diện tích") || lowerText.includes("rộng")) {
    replyText = "📐 Diện tích 200m² (10x20). Xây dựng 1 trệt 2 lầu.";
  } else if (lowerText.includes("hướng") || lowerText.includes("phong thủy")) {
    replyText = "🧭 Nhà hướng Đông Nam - Gió mát, tài lộc.";
  } else if (lowerText.includes("giấy tờ") || lowerText.includes("sổ")) {
    replyText = "📜 Pháp lý: Sổ hồng riêng, công chứng trong ngày.";
  }
  if (replyText) {
    setTimeout(() => {
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

  // Tạo nhân vật
  const playerCount = Object.keys(players).length;
  let role = playerCount === 0 ? "broker" : "client"; 
  let name = role === "broker" ? "⭐ SALES ADMIN" : `Khách ${Math.floor(Math.random() * 1000)}`;
  
  players[socket.id] = {
    id: socket.id, 
    role: role, 
    name: name,
    position: [(Math.random() - 0.5) * 6, 0, 5 + Math.random() * 5], 
    color: role === "broker" ? "#f1c40f" : '#' + Math.floor(Math.random()*16777215).toString(16)
  };
  
  io.emit("updatePlayers", players);

  // Di chuyển
  socket.on("move", (position) => {
    if (players[socket.id]) {
      players[socket.id].position = position;
      socket.broadcast.emit("updatePlayers", players);
    }
  });

  // Chat
  socket.on("sendMessage", (data) => {
    const sender = players[socket.id];
    const { text, targetId } = data; 
    const msgData = { id: socket.id, name: sender?.name, role: sender?.role, text: text, isPrivate: !!targetId };

    if (targetId) {
        socket.emit("receiveMessage", { ...msgData, recipientName: players[targetId]?.name });
        if (players[targetId]) io.to(targetId).emit("receiveMessage", { ...msgData, recipientName: "Bạn" });
    } else {
        io.emit("receiveMessage", msgData);
        if (sender?.role !== 'broker') handleBotReply(text, socket.id);
    }
  });

  socket.on("toggleLights", () => { lightsOn = !lightsOn; io.emit("updateLights", lightsOn); });
  socket.on("changeEnvironment", (preset) => { environmentPreset = preset; io.emit("updateEnvironment", environmentPreset); });
  
  // --- [ĐÃ SỬA] XỬ LÝ CHỐT ĐƠN BẢO MẬT ---
  socket.on("confirmTransaction", ({ buyerId }) => {
    // 1. Cập nhật biển báo (PUBLIC) - Mọi người chỉ biết là SOLD
    houseStatus = "SOLD";
    io.emit("updateHouseStatus", "SOLD");
    
    // 2. Thông báo Hệ thống (PUBLIC) - Chỉ báo chung chung, không lộ tên người mua
    io.emit("receiveMessage", { 
        id: "system", name: "SYSTEM", role: "system", 
        text: "🔔 CĂN NHÀ ĐÃ ĐƯỢC BÁN (SOLD)!" 
    });

    // 3. Chuẩn bị dữ liệu sổ hồng
    const buyerInfo = players[buyerId];
    const txData = {
        hash: "0x" + Math.random().toString(16).substr(2, 40).toUpperCase(),
        timestamp: new Date().toLocaleString("vi-VN"),
        price: 500000,
        buyer: buyerInfo ? buyerInfo.name : "ẨN DANH"
    };

    // 4. Gửi sổ hồng (PRIVATE) - Chỉ gửi cho Broker và Buyer đích danh
    // Gửi cho Broker
    io.to(socket.id).emit("showCertificate", txData); 
    
    // Gửi cho Buyer (nếu tồn tại)
    if (buyerId && players[buyerId]) {
        io.to(buyerId).emit("showCertificate", txData);
        // Nhắn tin riêng chúc mừng khách
        io.to(buyerId).emit("receiveMessage", { 
            id: "system", name: "SYSTEM", role: "system", 
            text: "🎉 Chúc mừng! Bạn đã sở hữu căn nhà này." 
        });
    }
  });

  socket.on("resetHouseStatus", () => {
      houseStatus = "FOR SALE";
      io.emit("updateHouseStatus", "FOR SALE");
      io.emit("receiveMessage", { id: "system", name: "SYSTEM", role: "system", text: "♻️ Căn nhà đang được mở bán lại!" });
  });

  socket.on("disconnect", () => {
    delete players[socket.id];
    io.emit("updatePlayers", players);
  });
});

server.listen(3001, () => console.log("SERVER REAL ESTATE RUNNING: Port 3001"));