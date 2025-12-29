const express = require('express');
const app = express();
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');

app.use(cors());
const server = http.createServer(app);
const io = new Server(server, { cors: { origin: "*" } });

// --- TRẠNG THÁI SERVER ---
let players = {}; 
let houseStatus = "FOR SALE";
let environmentPreset = "city"; // "city" (Ngày) - "night" (Đêm)
let lightsOn = false;

// --- HÀM XỬ LÝ CHATBOT AI ---
function handleBotReply(text) {
  const lowerText = text.toLowerCase();
  let replyText = "";

  // Logic bắt từ khóa
  if (lowerText.includes("giá") || lowerText.includes("bao nhiêu") || lowerText.includes("tiền")) {
    replyText = "💰 Căn biệt thự này đang có giá bán là $500,000 (Đã bao gồm nội thất Smart Home).";
  } else if (lowerText.includes("địa chỉ") || lowerText.includes("ở đâu") || lowerText.includes("vị trí")) {
    replyText = "📍 Địa chỉ: Lô A1, Khu Đô Thị Metaverse, Quận Nhất.";
  } else if (lowerText.includes("diện tích") || lowerText.includes("rộng")) {
    replyText = "📐 Diện tích đất: 200m2 (10x20), diện tích xây dựng 350m2.";
  } else if (lowerText.includes("liên hệ") || lowerText.includes("sđt") || lowerText.includes("gọi")) {
    replyText = "📞 Hotline Môi Giới VIP: 0909.888.888 (Mr. Admin).";
  } else if (lowerText.includes("xin chào") || lowerText.includes("hello") || lowerText.includes("hi")) {
    replyText = "🤖 Xin chào! Tôi là Trợ Lý Ảo. Bạn cần thông tin gì về căn nhà này không?";
  }

  // Nếu có câu trả lời thì gửi lại sau 1 giây
  if (replyText) {
    setTimeout(() => {
      io.emit("receiveMessage", {
        id: "BOT_ID",
        name: "🤖 Trợ Lý AI",
        role: "broker", // Để role broker cho tin nhắn có màu nổi bật
        text: replyText
      });
    }, 1000);
  }
}

io.on("connection", (socket) => {
  console.log("User connected:", socket.id);

  // Gửi trạng thái ban đầu
  socket.emit("updateHouseStatus", houseStatus);
  socket.emit("updateEnvironment", environmentPreset);
  socket.emit("updateLights", lightsOn);

  // Phân vai
  const playerCount = Object.keys(players).length;
  let role = playerCount === 0 ? "broker" : "client";
  let name = role === "broker" ? "Môi Giới (Admin)" : `Khách ${Math.floor(Math.random() * 100)}`;
  
  players[socket.id] = {
    id: socket.id, role: role, name: name,
    position: [Math.random() * 5, 0, Math.random() * 5],
    color: role === "broker" ? "#d35400" : '#' + Math.floor(Math.random()*16777215).toString(16)
  };
  io.emit("updatePlayers", players);

  // --- XỬ LÝ TIN NHẮN & KÍCH HOẠT BOT ---
  socket.on("sendMessage", (data) => {
    const p = players[socket.id];
    
    // Gửi tin nhắn của người dùng
    io.emit("receiveMessage", {
      id: socket.id, 
      name: p?.name || "Ẩn danh", 
      role: p?.role || "client", 
      text: data.text
    });

    // Gọi Bot check tin nhắn (trừ khi tin nhắn từ hệ thống)
    if (socket.id !== "BOT_ID") {
        handleBotReply(data.text);
    }
  });

  // Các tính năng Smart Home
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
       io.emit("receiveMessage", { id: "system", name: "HỆ THỐNG", role: "system", text: "🎉 CHÚC MỪNG! CĂN NHÀ ĐÃ ĐƯỢC BÁN THÀNH CÔNG! 🎉" });
    }
  });

  socket.on("disconnect", () => {
    delete players[socket.id];
    io.emit("updatePlayers", players);
  });
});

server.listen(3001, () => console.log("SERVER ĐANG CHẠY CỔNG 3001 (ĐÃ CÓ BOT)"));