const express = require('express');
const app = express();
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');

app.use(cors());
const server = http.createServer(app);
const io = new Server(server, { cors: { origin: "*" } });

let players = {}; 
let houseStatus = "FOR SALE";

function handleBotReply(text) {
    const lowerText = text.toLowerCase();
    let replyText = "";
    if (lowerText.includes("giá")) replyText = "💰 Giá bán: $500,000.";
    else if (lowerText.includes("vay")) replyText = "🏦 Hỗ trợ vay 80%, lãi suất 8%/năm.";
    else if (lowerText.includes("hợp đồng")) replyText = "📄 Nhấn 'Hợp đồng & Vay vốn' để xem chi tiết.";
    
    if (replyText) {
        setTimeout(() => io.emit("receiveMessage", { id: "BOT", name: "🤖 Trợ Lý AI", text: replyText }), 800);
    }
}

io.on("connection", (socket) => {
    const playerCount = Object.keys(players).length;
    let role = playerCount === 0 ? "broker" : "client"; 
    let name = role === "broker" ? "👔 Sales Admin" : `👤 Khách ${Math.floor(Math.random() * 100)}`;
    
    players[socket.id] = { id: socket.id, role: role, name: name, position: [0, 0, 10], color: role === "broker" ? "#d35400" : '#' + Math.floor(Math.random()*16777215).toString(16), location: "Sân vườn" };
    
    io.emit("updatePlayers", players);
    socket.emit("updateHouseStatus", houseStatus);

    socket.on("move", (newPos) => {
        if (players[socket.id]) {
            players[socket.id].position = newPos;
            // Dùng socket.broadcast.emit để giảm tải cho chính người gửi, 
            // nhưng gửi cập nhật liên tục cho người khác.
            socket.broadcast.emit("updatePlayers", players);

            // Logic nhận diện vị trí Real-time
            let currentLoc = "Sân vườn";
            const dist = Math.sqrt(newPos[0]**2 + newPos[2]**2);
            if (dist < 4) currentLoc = "Trong Nhà";
            else if (newPos[2] > 8) currentLoc = "Cổng";

            if (players[socket.id].location !== currentLoc) {
                players[socket.id].location = currentLoc;
                io.emit("receiveMessage", { id: "sys", name: "📍 VỊ TRÍ", text: `${players[socket.id].name} đã đến ${currentLoc}` });
            }
        }
    });

    socket.on("sendMessage", (data) => {
        const p = players[socket.id];
        if (data.to && data.to !== "all") {
            io.to(data.to).emit("receiveMessage", { ...data, name: p.name, isPrivate: true });
            socket.emit("receiveMessage", { ...data, name: p.name, isPrivate: true });
        } else {
            io.emit("receiveMessage", { ...data, name: p.name });
            if (p?.role !== 'broker') handleBotReply(data.text);
        }
    });

    socket.on("disconnect", () => { delete players[socket.id]; io.emit("updatePlayers", players); });
});

server.listen(3001, () => console.log("SERVER RUNNING ON 3001"));