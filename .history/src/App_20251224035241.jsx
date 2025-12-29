import React, { useEffect, useState } from "react";
import io from "socket.io-client";
import { Canvas } from "@react-three/fiber";
import { OrbitControls, useGLTF, Text, Billboard, ContactShadows } from "@react-three/drei";

// --- KẾT NỐI ---
const socket = io.connect("http://localhost:3001");

// --- 1. SÀN NHÀ (Thay cho ô lưới trắng) ---
function Floor() {
  return (
    <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.01, 0]}>
      {/* Sàn rộng 50x50 mét */}
      <planeGeometry args={[50, 50]} />
      {/* Màu xanh cỏ (hoặc đổi màu khác tùy bạn) */}
      <meshStandardMaterial color="#5fab2d" roughness={1} />
    </mesh>
  );
}

// --- 2. CĂN NHÀ ---
function House() {
  const { scene } = useGLTF("/nha.glb");
  return <primitive object={scene} scale={[0.5, 0.5, 0.5]} position={[0, 0, 0]} />;
}

// --- 3. AVATAR ROBOT (Đẹp hơn) ---
function Human({ position, color, name }) {
  return (
    <group position={position}>
      {/* TÊN NGƯỜI DÙNG (Bay trên đầu) */}
      <Billboard position={[0, 2.5, 0]}>
        <Text fontSize={0.35} color="black" outlineWidth={0.02} outlineColor="white">
          {name}
        </Text>
      </Billboard>

      {/* ĐẦU (Hình hộp chữ nhật) */}
      <mesh position={[0, 1.6, 0]}>
        <boxGeometry args={[0.5, 0.5, 0.5]} />
        <meshStandardMaterial color={color} />
      </mesh>
      {/* Mắt trái */}
      <mesh position={[-0.12, 1.6, 0.26]}>
        <boxGeometry args={[0.1, 0.1, 0.05]} />
        <meshStandardMaterial color="white" />
      </mesh>
      {/* Mắt phải */}
      <mesh position={[0.12, 1.6, 0.26]}>
        <boxGeometry args={[0.1, 0.1, 0.05]} />
        <meshStandardMaterial color="white" />
      </mesh>

      {/* THÂN (Hình hộp to hơn) */}
      <mesh position={[0, 0.8, 0]}>
        <boxGeometry args={[0.6, 0.9, 0.3]} />
        <meshStandardMaterial color={color} />
      </mesh>

      {/* CHÂN TRÁI */}
      <mesh position={[-0.15, 0.2, 0]}>
        <boxGeometry args={[0.2, 0.4, 0.2]} />
        <meshStandardMaterial color="#333" />
      </mesh>
       {/* CHÂN PHẢI */}
       <mesh position={[0.15, 0.2, 0]}>
        <boxGeometry args={[0.2, 0.4, 0.2]} />
        <meshStandardMaterial color="#333" />
      </mesh>

      {/* BÓNG ĐEN DƯỚI CHÂN (Cho cảm giác dính đất) */}
      <ContactShadows opacity={0.5} scale={2} blur={1} far={1} />
    </group>
  );
}

// --- 4. APP CHÍNH ---
export default function App() {
  const [players, setPlayers] = useState({});
  const [message, setMessage] = useState("");
  const [chatList, setChatList] = useState([]);
  const [myName, setMyName] = useState("");

  useEffect(() => {
    socket.on("updatePlayers", (backendPlayers) => {
      setPlayers(backendPlayers);
      if(backendPlayers[socket.id]) setMyName(backendPlayers[socket.id].name);
    });
    socket.on("receiveMessage", (data) => setChatList((prev) => [...prev, data]));
    return () => { socket.off("updatePlayers"); socket.off("receiveMessage"); };
  }, []);

  const sendMessage = () => {
    if (message.trim()) {
      socket.emit("sendMessage", { text: message });
      setMessage("");
    }
  };

  return (
    <div style={{ width: "100vw", height: "100vh", position: "relative" }}>
      
      <Canvas camera={{ position: [0, 6, 15], fov: 50 }} shadows>
        {/* Bầu trời & Ánh sáng đẹp hơn */}
        <color attach="background" args={['#87CEEB']} /> {/* Màu trời xanh */}
        <ambientLight intensity={0.7} />
        <pointLight position={[10, 20, 10]} intensity={1} castShadow />
        
        <OrbitControls maxPolarAngle={Math.PI / 2 - 0.1} /> {/* Không cho xoay xuống dưới đất */}

        <Floor />
        <House />

        {Object.keys(players).map((key) => (
          <Human 
            key={key} 
            position={players[key].position} 
            color={players[key].color} 
            name={players[key].name} 
          />
        ))}
      </Canvas>

      {/* GIAO DIỆN CHAT (Giữ nguyên hoặc custom thêm) */}
      <div style={{
        position: "absolute", bottom: "20px", left: "20px",
        width: "320px", height: "400px",
        backgroundColor: "rgba(255, 255, 255, 0.9)", // Màu trắng trong suốt cho sạch
        borderRadius: "15px", padding: "15px",
        display: "flex", flexDirection: "column", color: "#333",
        boxShadow: "0 10px 25px rgba(0,0,0,0.2)",
        fontFamily: "Arial, sans-serif"
      }}>
        <div style={{ borderBottom: "1px solid #ddd", paddingBottom: "10px", marginBottom: "10px"}}>
          <h4 style={{margin: 0, color: "#2c3e50"}}>💬 Trò chuyện</h4>
          <small>Bạn: <b style={{color: "#e67e22"}}>{myName}</b></small>
        </div>

        <div style={{ flex: 1, overflowY: "auto", marginBottom: "10px", paddingRight: "5px" }}>
          {chatList.map((msg, index) => {
            const isMe = msg.id === socket.id;
            return (
              <div key={index} style={{ marginBottom: "8px", textAlign: isMe ? "right" : "left" }}>
                <div style={{fontSize: "10px", color: "#888", marginBottom: "2px", margin: "0 5px"}}>
                  {isMe ? "" : msg.name}
                </div>
                <span style={{
                  background: isMe ? "#007bff" : "#f1f0f0",
                  color: isMe ? "white" : "black",
                  padding: "8px 12px", borderRadius: "15px", fontSize: "14px", display: "inline-block",
                  boxShadow: "0 1px 2px rgba(0,0,0,0.1)"
                }}>
                  {msg.text}
                </span>
              </div>
            );
          })}
        </div>

        <div style={{ display: "flex", gap: "8px" }}>
          <input 
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && sendMessage()}
            placeholder="Nhập tin nhắn..."
            style={{ 
              flex: 1, padding: "10px", borderRadius: "20px", border: "1px solid #ddd", outline: "none" 
            }}
          />
          <button onClick={sendMessage} style={{ 
            padding: "8px 20px", borderRadius: "20px", border: "none", 
            background: "#28a745", color: "white", cursor: "pointer", fontWeight: "bold"
          }}>Gửi</button>
        </div>
      </div>
    </div>
  );
}