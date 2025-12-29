import React, { useEffect, useState } from "react";
import io from "socket.io-client";
import { Canvas } from "@react-three/fiber";
import { OrbitControls, useGLTF, Grid } from "@react-three/drei";

// Kết nối thẳng vào Localhost
const socket = io.connect("http://localhost:3001");

// --- 1. Component Cái Nhà ---
function House() {
  const { scene } = useGLTF("/nha.glb");
  return <primitive object={scene} scale={[0.5, 0.5, 0.5]} position={[0, 0, 0]} />;
}

// --- 2. Component Avatar (Người chơi) ---
function Avatar({ position, color }) {
  return (
    <mesh position={position}>
      <sphereGeometry args={[0.4, 32, 32]} />
      <meshStandardMaterial color={color} />
    </mesh>
  );
}

// --- 3. App Chính ---
export default function App() {
  const [players, setPlayers] = useState({});
  const [message, setMessage] = useState("");
  const [chatList, setChatList] = useState([]);

  useEffect(() => {
    // Nghe server báo danh sách người chơi cập nhật
    socket.on("updatePlayers", (backendPlayers) => {
      setPlayers(backendPlayers);
    });

    // Nghe tin nhắn mới
    socket.on("receiveMessage", (data) => {
      setChatList((prev) => [...prev, data]);
    });

    return () => {
      socket.off("updatePlayers");
      socket.off("receiveMessage");
    };
  }, []);

  const sendMessage = () => {
    if (message.trim()) {
      // Gửi tin nhắn lên server
      socket.emit("sendMessage", { id: socket.id, text: message });
      setMessage("");
    }
  };

  return (
    <div style={{ width: "100vw", height: "100vh", position: "relative" }}>
      
      {/* --- MÀN HÌNH 3D --- */}
      <Canvas camera={{ position: [0, 5, 10], fov: 50 }}>
        <ambientLight intensity={0.5} />
        <pointLight position={[10, 10, 10]} />
        <OrbitControls />
        <Grid args={[20, 20]} cellColor="white" sectionColor="gray" />

        {/* Hiện cái nhà */}
        <House />

        {/* Hiện danh sách Avatar (Các Tab khác & Mình) */}
        {Object.keys(players).map((key) => (
          <Avatar 
            key={key} 
            position={players[key].position} 
            color={players[key].color} 
          />
        ))}
      </Canvas>

      {/* --- GIAO DIỆN CHAT --- */}
      <div style={{
        position: "absolute", bottom: "20px", left: "20px",
        width: "300px", height: "350px",
        backgroundColor: "rgba(0,0,0,0.7)", borderRadius: "10px", padding: "10px",
        display: "flex", flexDirection: "column", color: "white", fontFamily: "Arial"
      }}>
        <div style={{ borderBottom: "1px solid #555", paddingBottom: "5px", marginBottom: "5px"}}>
          <strong>Đang Online: {Object.keys(players).length} người</strong>
        </div>

        {/* List tin nhắn */}
        <div style={{ flex: 1, overflowY: "auto", marginBottom: "10px" }}>
          {chatList.map((msg, index) => (
            <div key={index} style={{ 
              marginBottom: "5px", 
              textAlign: msg.id === socket.id ? "right" : "left" 
            }}>
              <span style={{
                background: msg.id === socket.id ? "#007bff" : "#555",
                padding: "5px 10px", borderRadius: "10px", fontSize: "14px", display: "inline-block"
              }}>
                {msg.text}
              </span>
            </div>
          ))}
        </div>

        {/* Ô nhập tin nhắn */}
        <div style={{ display: "flex", gap: "5px" }}>
          <input 
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && sendMessage()}
            placeholder="Chat..."
            style={{ flex: 1, padding: "5px", borderRadius: "5px", border: "none" }}
          />
          <button onClick={sendMessage} style={{ padding: "5px 10px", cursor: "pointer" }}>Gửi</button>
        </div>
      </div>
    </div>
  );
}