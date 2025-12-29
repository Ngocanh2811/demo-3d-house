const express = require('express');
const app = express();
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');

app.use(cors());
const server = http.createServer(app);

const io = new Server(server, {
  cors: { origin: "*", methods: ["GET", "POST"] },
});

// --- KHO LƯU TRỮ TRẠNG THÁI (STATE) ---
let players = {}; 
let currentFloorColor = "#e0e0e0"; // Màu sàn
let houseStatus = "FOR SALE";      // Trạng thái bán: FOR SALE hoặc SOLD
let environmentPreset = "city";    // Môi trường: city (Ngày) hoặc night (Đêm)

io.on("connection", (socket) => {
  console.log(`User kết nối: ${socket.id}`);

  // 1. Gửi ngay toàn bộ trạng thái hiện tại cho người mới vào
  socket.emit("updateFloor", currentFloorColor);
  socket.emit("updateHouseStatus", houseStatus);
  socket.emit("updateEnvironment", environmentPreset);

  // 2. PHÂN VAI (Người đầu tiên là Môi Giới)
  const playerCount = Object.keys(players).length;
  let role = "client";
  let name = `Khách ${Math.floor(Math.random() * 100)}`;
  let color = '#' + Math.floor(Math.random()*16777215).toString(16);

  if (playerCount === 0) {
    role = "broker";
    name = "Môi Giới (Admin)";
    color = "#1a1a1a"; // Vest đen
  }

  // Tạo vị trí ngẫu nhiên
  const angle = Math.random() * Math.PI * 2;
  const radius = 6 + Math.random() * 4;
  players[socket.id] = {
    id: socket.id, role: role, name: name,
    position: [Math.cos(angle) * radius, 0, Math.sin(angle) * radius],
    color: color
  };

  io.emit("updatePlayers", players);

  // 3. XỬ LÝ CHAT & AI BOT
  socket.on("sendMessage", (data) => {
    // Gửi tin nhắn người dùng
    const p = players[socket.id];
    io.emit("receiveMessage", {
      id: socket.id, 
      name: p ? p.name : "Ẩn danh", 
      role: p ? p.role : "client", 
      text: data.text
    });

    // AI BOT TRẢ LỜI TỰ ĐỘNG
    const lowerText = data.text.toLowerCase();
    if (lowerText.includes("giá") || lowerText.includes("nhiêu tiền")) {
      setTimeout(() => {
        io.emit("receiveMessage", {
          id: "bot", name: "Trợ lý ảo AI", role: "bot",
          text: "Dạ, căn biệt thự này đang được định giá 15 tỷ VNĐ ạ (Bao gồm nội thất)."
        });
      }, 1000);
    }
  });

  // 4. XỬ LÝ ĐỔI MÀU SÀN
  socket.on("changeFloorColor", (newColor) => {
    currentFloorColor = newColor;
    io.emit("updateFloor", currentFloorColor);
  });

  // 5. XỬ LÝ NGÀY / ĐÊM
  socket.on("changeEnvironment", (preset) => {
    environmentPreset = preset;
    io.emit("updateEnvironment", environmentPreset);
  });

  // 6. XỬ LÝ CHỐT ĐƠN (ĐỔI BIỂN BÁO)
  socket.on("changeStatus", (status) => {
    houseStatus = status;
    io.emit("updateHouseStatus", houseStatus);
    
    // Nếu bán thành công -> Hệ thống chúc mừng
    if(status === "SOLD") {
       io.emit("receiveMessage", {
         id: "system", name: "HỆ THỐNG", role: "system",
         text: "🎉 CHÚC MỪNG! CĂN NHÀ ĐÃ ĐƯỢC CHỐT ĐƠN THÀNH CÔNG! 🎉"
       });
    }
  });

  // 7. NGẮT KẾT NỐI
  socket.on("disconnect", () => {
    delete players[socket.id];
    io.emit("updatePlayers", players);
  });
});

server.listen(3001, () => {
  console.log("SERVER BACKEND ĐANG CHẠY CỔNG 3001");
});