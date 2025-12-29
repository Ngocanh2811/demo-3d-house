const express = require('express');
const app = express();
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');

app.use(cors());
const server = http.createServer(app);
const io = new Server(server, { cors: { origin: "*" } });

// --- CẤU HÌNH HỆ THỐNG ---
let players = {}; 
let houseStatus = "FOR SALE";
let environmentPreset = "city"; 
let lightsOn = false;

// --- LOGIC CHATBOT AI ---
function handleBotReply(text) {
    const lowerText = text.toLowerCase();
    let replyText = "";

    if (lowerText.includes("giá") || lowerText.includes("tiền")) {
        replyText = "💰 Giá niêm yết: $500,000. Bạn có thể mở bảng 'Vay vốn' để tính toán trả góp.";
    } else if (lowerText.includes("vay") || lowerText.includes("lãi")) {
        replyText = "🏦 Hỗ trợ vay ngân hàng tới 80%, lãi suất ưu đãi 8%/năm.";
    } else if (lowerText.includes("hợp đồng") || lowerText.includes("mua")) {
        replyText = "📄 Bạn có thể ký hợp đồng thông minh ngay tại bảng điều khiển phía góc trái màn hình.";
    } else if (lowerText.includes("xin chào")) {
        replyText = "🤖 Bot AI xin chào! Tôi là trợ lý ảo hỗ trợ thông tin nhà đất.";
    }

    if (replyText) {
        setTimeout(() => {
            io.emit("receiveMessage", { id: "BOT_ID", name: "🤖 Trợ Lý AI", text: replyText });
        }, 1000);
    }
}

io.on("connection", (socket) => {
    // --- PHÂN QUYỀN: THẰNG ĐẦU TIÊN LÀ SALES ---
    const playerCount = Object.keys(players).length;
    let role = playerCount === 0 ? "broker" : "client"; 
    let name = role === "broker" ? "👔 Sales Admin" : `👤 Khách ${Math.floor(Math.random() * 100)}`;
    
    players[socket.id] = {
        id: socket.id, 
        role: role, 
        name: name,
        position: [0, 0, 5], 
        color: role === "broker" ? "#d35400" : '#' + Math.floor(Math.random()*16777215).toString(16),
        location: "Sân vườn"
    };
    
    io.emit("updatePlayers", players);
    socket.emit("updateHouseStatus", houseStatus);
    socket.emit("updateEnvironment", environmentPreset);
    socket.emit("updateLights", lightsOn);

    // --- XỬ LÝ DI CHUYỂN & THÔNG BÁO VỊ TRÍ ---
    socket.on("move", (newPos) => {
        if (players[socket.id]) {
            players[socket.id].position = newPos;
            
            // Logic nhận diện vị trí
            let currentLoc = "Sân vườn";
            const distToHouse = Math.sqrt(newPos[0]**2 + newPos[2]**2);
            if (distToHouse < 4) currentLoc = "Trong Nhà";
            else if (newPos[2] > 8) currentLoc = "Cổng Biệt Thự";

            // Nếu thay đổi vị trí thì thông báo cho mọi người
            if (players[socket.id].location !== currentLoc) {
                players[socket.id].location = currentLoc;
                io.emit("receiveMessage", { 
                    id: "system", 
                    name: "HỆ THỐNG", 
                    text: `📍 ${players[socket.id].name} vừa đi đến: ${currentLoc}` 
                });
            }
            socket.broadcast.emit("updatePlayers", players);
        }
    });

    // --- CHAT CHUNG & CHAT RIÊNG ---
    socket.on("sendMessage", (data) => {
        const p = players[socket.id];
        const msgObject = { 
            id: socket.id, 
            name: p?.name || "Ẩn danh", 
            text: data.text,
            isPrivate: !!data.to 
        };

        if (data.to && data.to !== "all") {
            // Nhắn tin riêng
            io.to(data.to).emit("receiveMessage", msgObject);
            socket.emit("receiveMessage", msgObject); 
        } else {
            // Nhắn tin chung
            io.emit("receiveMessage", msgObject);
            if (p?.role !== 'broker') handleBotReply(data.text);
        }
    });

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
        io.emit("receiveMessage", { 
            id: "system", 
            name: "BLOCKCHAIN", 
            text: status === "SOLD" ? "✅ Giao dịch đã được ghi vào sổ cái!" : "🔄 Trạng thái mở bán lại." 
        });
    });

    socket.on("disconnect", () => {
        delete players[socket.id];
        io.emit("updatePlayers", players);
    });
});

server.listen(3001, () => console.log("SERVER REAL ESTATE RUNNING ON 3001"));