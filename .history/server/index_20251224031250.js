const express = require('express');
const app = express();
const http = require('http');
const { Server } = require("socket.io");
const cors = require("cors");

app.use(cors());

const server = http.createServer(app);

const io = new Server(server, {
  cors: {
    origin: "http://localhost:5173", // URL của Vite React App
    methods: ["GET", "POST"],
  },
});

io.on("connection", (socket) => {
  console.log(`User Connected: ${socket.id}`);

  socket.on("send_message", (data) => {
    // Gửi tin nhắn cho tất cả TRỪ người gửi (người gửi đã tự update UI rồi)
    socket.broadcast.emit("receive_message", data);
  });
});

server.listen(3000, () => {
  console.log("SERVER RUNNING ON PORT 3000");
});