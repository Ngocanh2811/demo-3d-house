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

  // 1. Hỏi giá
  if (lowerText.includes("giá") || lowerText.includes("bao nhiêu") || lowerText.includes("tiền")) {
    replyText = "💰 Giá bán hiện tại: $500,000 (Khoảng 12 tỷ VND) - Bao sang tên.";
  } 
  // 2. Hỏi địa chỉ
  else if (lowerText.includes("địa chỉ") || lowerText.includes("ở đâu") || lowerText.includes("vị trí")) {
    replyText = "📍 Vị trí đắc địa: Lô A1, Khu Biệt Thự Metaverse, Quận 1, TP.HCM.";
  } 
  // 3. Hỏi kích thước / diện tích (MỚI THÊM)
  else if (lowerText.includes("kích thước") || lowerText.includes("diện tích") || lowerText.includes("rộng") || lowerText.includes("dài")) {
    replyText = "📐 Thông số chi tiết:\n- Diện tích đất: 200m² (10m x 20m).\n- Diện tích sàn: 350m² (1 trệt, 2 lầu).";
  } 
  // 4. Hỏi công năng / phòng ốc
  else if (lowerText.includes("phòng") || lowerText.includes("wc") || lowerText.includes("ngủ")) {
    replyText = "🏠 Công năng sử dụng: 4 Phòng ngủ Master, 5 WC, 1 Phòng thờ, 1 Gara ô tô.";
  }
  // 5. Liên hệ
  else if (lowerText.includes("liên hệ") || lowerText.includes("sđt") || lowerText.includes("gọi")) {
    replyText = "📞 Anh/chị vui lòng bấm nút tròn đỏ trên nhà để xem chi tiết hoặc gọi Admin: 0909.888.888";
  } 
  // 6. Chào hỏi
  else if (lowerText.includes("xin chào") || lowerText.includes("hello") || lowerText.includes("hi")) {
    replyText = "🤖 Trợ lý AI xin chào! Bạn muốn hỏi về Giá hay Kích thước nhà?";
  }

  // Gửi phản hồi sau 1s
  if (replyText) {
    setTimeout(() => {
      io.emit("receiveMessage", {
        id: "BOT_ID",
        name: "🤖 Trợ Lý AI",
        role: "bot", // Role riêng cho bot để dễ style
        text: replyText
      });
    }, 1000);
  }
}

io.on("connection", (socket) => {
  // Gửi dữ liệu ban đầu
  socket.emit("updateHouseStatus", houseStatus);
  socket.emit("updateEnvironment", environmentPreset);
  socket.emit("updateLights", lightsOn);

  // Phân vai: Người đầu tiên là Broker
  const playerCount = Object.keys(players).length;
  let role = playerCount === 0 ? "broker" : "client";
  let name = role === "broker" ? "Môi Giới (Admin)" : `Khách ${Math.floor(Math.random() * 100)}`;
  
  players[socket.id] = {
    id: socket.id, role: role, name: name,
    position: [Math.random() * 5, 0, Math.random() * 5],
    color: role === "broker" ? "#d35400" : '#' + Math.floor(Math.random()*16777215).toString(16)
  };
  io.emit("updatePlayers", players);

  // XỬ LÝ TIN NHẮN
  socket.on("sendMessage", (data) => {
    const p = players[socket.id];
    
    // Gửi tin nhắn ra public
    io.emit("receiveMessage", {
      id: socket.id, 
      name: p?.name || "Ẩn danh", 
      role: p?.role || "client", 
      text: data.text
    });

    // --- LOGIC CHẶN BOT ---
    // Bot chỉ trả lời khi:
    // 1. Người gửi KHÔNG phải là Broker (Admin)
    // 2. Người gửi KHÔNG phải là chính Bot (tránh lặp vô tận)
    if (p?.role !== 'broker' && socket.id !== "BOT_ID") {
        handleBotReply(data.text);
    }
  });

  // Các tính năng khác
  socket.on("toggleLights", () => { lightsOn = !lightsOn; io.emit("updateLights", lightsOn); });
  socket.on("changeEnvironment", (preset) => { environmentPreset = preset; io.emit("updateEnvironment", environmentPreset); });
  socket.on("changeStatus", (status) => {
    houseStatus = status;
    io.emit("updateHouseStatus", houseStatus);
    if(status === "SOLD") io.emit("receiveMessage", { id: "system", name: "HỆ THỐNG", role: "system", text: "🎉 CHÚC MỪNG! ĐÃ CHỐT ĐƠN THÀNH CÔNG! 🎉" });
  });

  socket.on("disconnect", () => {
    delete players[socket.id];
    io.emit("updatePlayers", players);
  });
});

server.listen(3001, () => console.log("SERVER ĐANG CHẠY CỔNG 3001"));