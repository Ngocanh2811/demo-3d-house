const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');

const app = express();
app.use(cors());
const server = http.createServer(app);
const io = new Server(server, { cors: { origin: "*" } });

let players = {};
let houseStatus = "FOR SALE";

function getBotReply(text) {
    const low = text.toLowerCase();
    if (low.includes("vay")) return "🤖 AI: Chúng tôi hỗ trợ vay tới 80% giá trị căn nhà với lãi suất ưu đãi 8%/năm.";
    if (low.includes("hợp đồng")) return "🤖 AI: Bạn có thể nhấn nút 'Hợp đồng' phía trên để xem các điều khoản Smart Contract.";
    if (low.includes("giá")) return "🤖 AI: Căn biệt thự này có giá niêm yết là $500,000.";
    return null;
}

io.on("connection", (socket) => {
    // Thằng đầu tiên vào là Sales
    const isFirst = Object.keys(players).length === 0;
    const role = isFirst ? "broker" : "client";
    
    players[socket.id] = {
        id: socket.id,
        role: role,
        name: isFirst ? "Sales Admin" : `Khách #${socket.id.substr(0, 3)}`,
        position: [0, 0, 10],
        color: isFirst ? "#f1c40f" : "#" + Math.floor(Math.random()*16777215).toString(16),
        location: "Đang vào sân vườn"
    };

    io.emit("updatePlayers", players);
    socket.emit("updateHouseStatus", houseStatus);

    socket.on("move", (pos) => {
        if (players[socket.id]) {
            players[socket.id].position = pos;
            socket.broadcast.emit("updatePlayers", players);
        }
    });

    socket.on("updateLocation", (loc) => {
        if (players[socket.id]) players[socket.id].location = loc;
    });

    socket.on("sendMessage", (data) => {
        const sender = players[socket.id];
        const msgObject = {
            id: socket.id,
            name: sender.name,
            text: data.text,
            location: sender.location,
            isPrivate: data.to !== "all"
        };

        if (data.to === "all") {
            io.emit("receiveMessage", msgObject);
            // AI Bot chỉ trả lời tin nhắn công khai của khách
            const botReply = getBotReply(data.text);
            if (botReply && sender.role !== "broker") {
                setTimeout(() => io.emit("receiveMessage", { name: "Hệ thống", text: botReply, location: "Trung tâm điều khiển" }), 1000);
            }
        } else {
            // Nhắn tin riêng
            socket.emit("receiveMessage", msgObject); // Gửi cho chính mình
            io.to(data.to).emit("receiveMessage", msgObject); // Gửi cho người nhận
        }
    });

    socket.on("changeStatus", (status) => {
        houseStatus = status;
        io.emit("updateHouseStatus", houseStatus);
        io.emit("receiveMessage", { name: "BLOCKCHAIN", text: `📢 Hợp đồng đã được xác nhận: ${status}`, location: "Ethereum Mainnet" });
    });

    socket.on("disconnect", () => {
        delete players[socket.id];
        io.emit("updatePlayers", players);
    });
});

server.listen(3001, () => console.log("Server đang chạy cổng 3001 - Sales được kích hoạt cho người đầu tiên."));