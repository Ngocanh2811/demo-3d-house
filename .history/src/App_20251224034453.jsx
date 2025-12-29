import React, { useEffect, useState } from "react";
import io from "socket.io-client";
import { Canvas } from "@react-three/fiber";
import { OrbitControls, useGLTF, Grid, Text, Billboard } from "@react-three/drei";

// --- KẾT NỐI ---
const socket = io.connect("http://localhost:3001");

// --- 1. Component CĂN NHÀ ---
function House() {
  const { scene } = useGLTF("/nha.glb");
  return <primitive object={scene} scale={[0.5, 0.5, 0.5]} position={[0, 0, 0]} />;
}

// --- 2. Component HÌNH NGƯỜI (Thay cho quả bóng) ---
function Human({ position, color, name }) {
  return (
    <group position={position}>
      {/* HIỆN TÊN TRÊN ĐẦU (Dùng Billboard để chữ luôn quay về phía Camera) */}
      <Billboard position={[0, 2.2, 0]}>
        <Text fontSize={0.3} color="white" anchorX="center" anchorY="middle">
          {name}
        </Text>
      </Billboard>

      {/* CÁI ĐẦU (Hình cầu nhỏ) */}
      <mesh position={[0, 1.6, 0]}>
        <sphereGeometry args={[0.25, 32, 32]} />
        <meshStandardMaterial color={color} />
      </mesh>

      {/* CÁI THÂN (Hình trụ hoặc hình hộp) */}
      <mesh position={[0, 0.75, 0]}>
        <cylinderGeometry args={[0.25, 0.25, 1.5, 32]} />
        <meshStandardMaterial color={color} />
      </mesh>
    </group>
  );
}

// --- 3. APP CHÍNH ---
export default function App() {
  const [players, setPlayers] = useState({});
  const [message, setMessage] = useState("");
  const [chatList, setChatList] = useState([]);
  const [myName, setMyName] = useState(""); // Lưu tên của chính mình

  useEffect(() => {
    socket.on("updatePlayers", (backendPlayers) => {
      setPlayers(backendPlayers);
      // Tìm xem tên mình là gì
      if(backendPlayers[socket.id]) {
        setMyName(backendPlayers[socket.id].name);
      }
    });

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
      socket.emit("sendMessage", { text: message });
      setMessage("");
    }
  };

  return (
    <div style={{ width: "100vw", height: "100vh", position: "relative" }}>
      
      {/* 3D SCENE */}
      <Canvas camera={{ position: [0, 5, 12], fov: 50 }}>
        <ambientLight intensity={0.6} />
        <pointLight position={[10, 10, 10]} />
        <OrbitControls />
        <Grid args={[20, 20]} cellColor="white" sectionColor="gray" />

        <House />

        {/* Vẽ tất cả người chơi */}
        {Object.keys(players).map((key) => (
          <Human 
            key={key} 
            position={players[key].position} 
            color={players[key].color} 
            name={players[key].name} // Truyền tên vào để hiển thị 3D
          />
        ))}
      </Canvas>

      {/* KHUNG CHAT */}
      <div style={{
        position: "absolute", bottom: "20px", left: "20px",
        width: "320px", height: "400px",
        backgroundColor: "rgba(0,0,0,0.8)", borderRadius: "12px", padding: "15px",
        display: "flex", flexDirection: "column", color: "white", fontFamily: "Segoe UI, sans-serif",
        boxShadow: "0 4px 10px rgba(0,0,0,0.5)"
      }}>
        <div style={{ borderBottom: "1px solid #555", paddingBottom: "10px", marginBottom: "10px"}}>
          <h4 style={{margin: 0}}>Phòng Chat</h4>
          <small style={{color: "#aaa"}}>Bạn là: <b style={{color: "#4caf50"}}>{myName}</b></small>
        </div>

        {/* Danh sách tin nhắn */}
        <div style={{ flex: 1, overflowY: "auto", marginBottom: "10px", paddingRight: "5px" }}>
          {chatList.map((msg, index) => {
            const isMe = msg.id === socket.id;
            return (
              <div key={index} style={{ 
                marginBottom: "8px", 
                textAlign: isMe ? "right" : "left" 
              }}>
                {/* Hiện tên người gửi nhỏ xíu bên trên tin nhắn */}
                <div style={{fontSize: "10px", color: "#ccc", marginBottom: "2px", marginRight: "5px", marginLeft: "5px"}}>
                  {isMe ? "Tôi" : msg.name}
                </div>
                
                <span style={{
                  background: isMe ? "#007bff" : "#333",
                  color: "white",
                  padding: "6px 12px", 
                  borderRadius: "15px", 
                  fontSize: "14px", 
                  display: "inline-block",
                  borderBottomRightRadius: isMe ? "2px" : "15px",
                  borderBottomLeftRadius: isMe ? "15px" : "2px"
                }}>
                  {msg.text}
                </span>
              </div>
            );
          })}
        </div>

        {/* Ô nhập */}
        <div style={{ display: "flex", gap: "8px" }}>
          <input 
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && sendMessage()}
            placeholder="Nhập tin nhắn..."
            style={{ 
              flex: 1, padding: "8px", borderRadius: "20px", border: "none", outline: "none", 
              background: "#444", color: "white" 
            }}
          />
          <button onClick={sendMessage} style={{ 
            padding: "8px 15px", borderRadius: "20px", border: "none", 
            background: "#28a745", color: "white", cursor: "pointer", fontWeight: "bold"
          }}>Gửi</button>
        </div>
      </div>
    </div>
  );
}