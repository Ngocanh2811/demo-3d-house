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

io.on("connection", (socket) => {
  console.log("User Connected:", socket.id);

  // Gửi trạng thái hiện tại
  socket.emit("updateHouseStatus", houseStatus);
  socket.emit("updateEnvironment", environmentPreset);

  // Tạo nhân vật
  const playerCount = Object.keys(players).length;
  // Người đầu tiên vào là Broker, sau đó là khách
  let role = playerCount === 0 ? "broker" : "client"; 
  let name = role === "broker" ? "⭐ SALES ADMIN" : `Khách ${Math.floor(Math.random() * 1000)}`;
  
  players[socket.id] = {
    id: socket.id, 
    role: role, 
    name: name,
    position: [0, 0, 5], 
    color: role === "broker" ? "#f1c40f" : '#' + Math.floor(Math.random()*16777215).toString(16)
  };
  
  io.emit("updatePlayers", players);

  socket.on("move", (position) => {
    if (players[socket.id]) {
      players[socket.id].position = position;
      socket.broadcast.emit("updatePlayers", players);
    }
  });

  socket.on("sendMessage", (data) => {
    const sender = players[socket.id];
    io.emit("receiveMessage", { id: socket.id, name: sender?.name, role: sender?.role, text: data.text });
  });

  socket.on("changeEnvironment", (preset) => { 
      environmentPreset = preset; 
      io.emit("updateEnvironment", environmentPreset); 
  });
  
  // --- LOGIC CHỐT ĐƠN BẢO MẬT ---
  socket.on("confirmTransaction", ({ buyerId }) => {
    const broker = players[socket.id];
    const buyer = players[buyerId];

    if (broker?.role !== 'broker') return; // Chỉ broker được quyền

    houseStatus = "SOLD";

    // 1. Tạo dữ liệu hợp đồng
    const txData = {
        hash: "0x" + Math.random().toString(16).substr(2, 40).toUpperCase(),
        timestamp: new Date().toLocaleString("vi-VN"),
        price: 500000,
        buyerName: buyer ? buyer.name : "Khách hàng ẩn danh",
        brokerName: broker.name
    };

    // 2. Thông báo Public (Chỉ đổi màu biển báo)
    io.emit("updateHouseStatus", "SOLD");
    io.emit("receiveMessage", { role: "system", text: `🔔 Căn biệt thự đã được bán cho ${buyer ? buyer.name : "..."}!` });

    // 3. Gửi Sổ hồng (Private) - Chỉ cho Broker và Buyer
    // Gửi cho Broker (Sales)
    io.to(socket.id).emit("receiveCertificate", txData);
    
    // Gửi cho Buyer (Khách mua)
    if (buyerId && players[buyerId]) {
        io.to(buyerId).emit("receiveCertificate", txData);
    }
  });

  // Reset trạng thái (để demo lại)
  socket.on("resetHouseStatus", () => {
      houseStatus = "FOR SALE";
      io.emit("updateHouseStatus", "FOR SALE");
      io.emit("receiveMessage", { role: "system", text: "♻️ Căn nhà đang được mở bán lại!" });
  });

  socket.on("disconnect", () => {
    delete players[socket.id];
    io.emit("updatePlayers", players);
    // Nếu broker thoát, có thể cần logic reset hoặc bầu broker mới (tùy nhu cầu)
  });
});

server.listen(3001, () => console.log("SERVER REAL ESTATE RUNNING: Port 3001"));