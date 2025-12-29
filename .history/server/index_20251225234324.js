const express = require("express");
const http = require("http");
const socketIo = require("socket.io");
const cors = require("cors");

const app = express();
app.use(cors());
app.use(express.json());

const server = http.createServer(app);
const io = socketIo(server, { cors: { origin: "*" } });

const players = {};
const gameState = {
  round: 1,
  totalRounds: 3,
  properties: [
    { id: 1, name: "BẾN TÀU", price: 500000, owner: null, position: 5 },
    { id: 2, name: "NHÀ MÁY", price: 800000, owner: null, position: 15 },
    { id: 3, name: "SIÊU THỊ", price: 1200000, owner: null, position: 25 },
    { id: 4, name: "KHÁCH SẠN", price: 2000000, owner: null, position: 35 }
  ]
};

// ===== API ENDPOINTS =====
app.get("/api/players", (req, res) => {
  res.json(players);
});

app.get("/api/gamestate", (req, res) => {
  res.json(gameState);
});

// ===== SOCKET.IO EVENTS =====
io.on("connection", (socket) => {
  console.log(`✅ Người chơi kết nối: ${socket.id}`);

  // Đăng ký người chơi
  socket.on("registerPlayer", (data) => {
    players[socket.id] = {
      id: socket.id,
      name: data.name || "Khách",
      role: data.role || "guest",
      money: 5000000,
      position: 0,
      properties: [],
      online: true,
      lastUpdate: Date.now()
    };
    
    // Gửi thông tin người chơi mới cho tất cả clients
    io.emit("updatePlayers", players);
    io.emit("receiveMessage", {
      id: "system",
      name: "HỆ THỐNG",
      role: "system",
      text: `🎮 ${data.name || "Khách"} (${data.role}) đã tham gia trò chơi!`
    });
  });

  // ===== XỬ LÝ DI CHUYỂN REAL-TIME =====
  socket.on("movePlayer", (data) => {
    if (players[socket.id]) {
      const steps = data.steps || 0;
      const oldPosition = players[socket.id].position;
      const newPosition = (oldPosition + steps) % 40; // 40 ô trên bàn cờ
      
      players[socket.id].position = newPosition;
      players[socket.id].lastUpdate = Date.now();
      
      // Broadcast real-time position update cho TẤT CẢ clients
      io.emit("playerMoved", {
        playerId: socket.id,
        playerName: players[socket.id].name,
        oldPosition: oldPosition,
        newPosition: newPosition,
        steps: steps
      });
      
      // Cập nhật danh sách players
      io.emit("updatePlayers", players);
      
      console.log(`🚶 ${players[socket.id].name} di chuyển từ ô ${oldPosition} đến ô ${newPosition}`);
    }
  });

  // ===== XỬ LÝ MUA BÁN TÀI SẢN =====
  socket.on("buyProperty", (data) => {
    const player = players[socket.id];
    const property = gameState.properties.find(p => p.id === data.propertyId);
    
    if (player && property && property.owner === null) {
      if (player.money >= property.price) {
        player.money -= property.price;
        property.owner = socket.id;
        player.properties.push(property.id);
        
        // Cập nhật trạng thái SOLD
        io.emit("propertyStatusChanged", {
          propertyId: property.id,
          status: "sold",
          owner: player.name,
          ownerId: socket.id
        });
        
        io.emit("updatePlayers", players);
        io.emit("updateGameState", gameState);
        io.emit("receiveMessage", {
          id: "system",
          name: "HỆ THỐNG",
          role: "system",
          text: `🏢 ${player.name} đã mua ${property.name} với giá ${property.price.toLocaleString()} VNĐ`
        });
        
        // Blockchain notification
        io.emit("receiveMessage", {
          id: "system",
          name: "BLOCKCHAIN",
          role: "system",
          text: `🔗 HỢP ĐỒNG THÔNG MINH ĐÃ KÍCH HOẠT! GIAO DỊCH THÀNH CÔNG.`
        });
      } else {
        socket.emit("receiveMessage", {
          id: "system",
          name: "HỆ THỐNG",
          role: "system",
          text: `❌ Không đủ tiền để mua ${property.name}`
        });
      }
    }
  });

  // ===== SALE CHANGE STATUS TO SOLD =====
  socket.on("markAsSold", (data) => {
    const player = players[socket.id];
    
    // Chỉ cho phép role "sale" thực hiện
    if (player && player.role === "sale") {
      const property = gameState.properties.find(p => p.id === data.propertyId);
      
      if (property) {
        property.owner = data.buyerId || "SOLD";
        
        io.emit("propertyStatusChanged", {
          propertyId: property.id,
          status: "sold",
          owner: data.buyerName || "Đã bán",
          ownerId: data.buyerId
        });
        
        io.emit("updateGameState", gameState);
        io.emit("receiveMessage", {
          id: "system",
          name: "SALE",
          role: "system",
          text: `💼 ${player.name} đã đánh dấu ${property.name} là ĐÃ BÁN`
        });
      }
    } else {
      socket.emit("receiveMessage", {
        id: "system",
        name: "HỆ THỐNG",
        role: "system",
        text: `❌ Chỉ nhân viên Sale mới có quyền này!`
      });
    }
  });

  // ===== XỬ LÝ CHAT =====
  socket.on("sendMessage", (data) => {
    const player = players[socket.id];
    if (player) {
      const message = {
        id: socket.id,
        name: player.name,
        role: player.role,
        text: data.text,
        timestamp: Date.now(),
        isPrivate: data.isPrivate || false,
        recipientId: data.recipientId || null
      };
      
      if (data.isPrivate && data.recipientId) {
        // Chat riêng tư
        socket.emit("receiveMessage", message);
        io.to(data.recipientId).emit("receiveMessage", message);
      } else {
        // Chat công khai
        io.emit("receiveMessage", message);
      }
    }
  });

  // ===== AI CHATBOT RESPONSE =====
  socket.on("sendToAI", async (data) => {
    const player = players[socket.id];
    if (player) {
      // Echo user message
      socket.emit("receiveAIMessage", {
        id: "user",
        sender: "user",
        text: data.text,
        timestamp: Date.now()
      });
      
      // Simulate AI thinking
      setTimeout(() => {
        const aiResponse = generateAIResponse(data.text);
        socket.emit("receiveAIMessage", {
          id: "ai",
          sender: "ai",
          text: aiResponse,
          timestamp: Date.now()
        });
      }, 1000);
    }
  });

  // ===== REQUEST PLAYER INFO =====
  socket.on("requestPlayerInfo", (data) => {
    const targetPlayer = players[data.playerId];
    if (targetPlayer) {
      socket.emit("playerInfoResponse", {
        playerId: data.playerId,
        playerData: targetPlayer
      });
    }
  });

  // ===== DISCONNECT =====
  socket.on("disconnect", () => {
    if (players[socket.id]) {
      const playerName = players[socket.id].name;
      delete players[socket.id];
      io.emit("updatePlayers", players);
      io.emit("receiveMessage", {
        id: "system",
        name: "HỆ THỐNG",
        role: "system",
        text: `👋 ${playerName} đã rời khỏi trò chơi`
      });
      console.log(`❌ Người chơi ngắt kết nối: ${socket.id}`);
    }
  });
});

// ===== AI RESPONSE GENERATOR =====
function generateAIResponse(message) {
  const responses = {
    "luật chơi": "📜 Luật chơi: Tung xúc xắc, di chuyển theo số chấm. Mua tài sản khi dừng lại. Người có nhiều tiền nhất sau 3 vòng thắng!",
    "giá": "💰 Giá các tài sản:\n- Bến Tàu: 500,000 VNĐ\n- Nhà Máy: 800,000 VNĐ\n- Siêu Thị: 1,200,000 VNĐ\n- Khách Sạn: 2,000,000 VNĐ",
    "chiến thuật": "🎯 Mẹo chơi: Ưu tiên mua tài sản gần điểm xuất phát, quản lý tiền cẩn thận, và quan sát đối thủ!",
    "blockchain": "🔗 Game sử dụng công nghệ Blockchain để đảm bảo giao dịch minh bạch và không thể thay đổi!",
    default: "🤖 AI Assistant: Tôi có thể giúp bạn về: luật chơi, giá tài sản, chiến thuật, blockchain. Hỏi tôi nhé!"
  };
  
  const lowerMessage = message.toLowerCase();
  for (const [key, value] of Object.entries(responses)) {
    if (lowerMessage.includes(key)) {
      return value;
    }
  }
  return responses.default;
}

// ===== START SERVER =====
const PORT = 3001;
server.listen(PORT, () => {
  console.log(`
╔═══════════════════════════════════════╗
║   🎮 SERVER ĐANG CHẠY CỔNG ${PORT}    ║
║   ✅ Real-time sync đã bật            ║
║   ✅ AI Chatbot đã sẵn sàng           ║
╚═══════════════════════════════════════╝
  `);
});