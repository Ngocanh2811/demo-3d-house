import React, { useEffect, useState } from "react";
import io from "socket.io-client";
import { Canvas } from "@react-three/fiber";
import { OrbitControls, useGLTF, Text, Billboard, Environment } from "@react-three/drei";

const socket = io.connect("http://localhost:3001");

// --- 1. SÀN NHÀ ĐƠN GIẢN (KHÔNG BÓNG) ---
function Floor() {
  return (
    <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.01, 0]}>
      {/* Sàn rộng 50x50 */}
      <planeGeometry args={[50, 50]} />
      {/* Màu xám xi măng hoặc màu gỗ nhạt, không bóng */}
      <meshStandardMaterial color="#e0e0e0" /> 
    </mesh>
  );
}

// --- 2. CĂN NHÀ ---
function House() {
  const { scene } = useGLTF("/nha.glb");
  // Chỉnh position y lên một chút nếu nhà bị chìm
  return <primitive object={scene} scale={[0.8, 0.8, 0.8]} position={[0, 1.7, 0]} />;
}

// --- 3. AVATAR (PHÂN BIỆT KHÁCH & MÔI GIỚI) ---
function Human({ position, color, name, role }) {
  const isBroker = role === "broker";

  return (
    <group position={position}>
      {/* TÊN: Môi giới màu Vàng Đậm, Khách màu Đen */}
      <Billboard position={[0, 2.6, 0]}>
        <Text 
          fontSize={isBroker ? 0.4 : 0.3} 
          color={isBroker ? "#d35400" : "black"} 
          outlineWidth={0.02} 
          outlineColor="white"
          fontWeight={isBroker ? "bold" : "normal"}
        >
          {name}
        </Text>
      </Billboard>

      {/* ĐẦU */}
      <mesh position={[0, 1.6, 0]}>
        <boxGeometry args={[0.5, 0.5, 0.5]} />
        <meshStandardMaterial color={isBroker ? "#ffcc00" : color} /> 
        {/* Môi giới đầu vàng (đội mũ bảo hộ :D), Khách đầu theo màu áo */}
      </mesh>

      {/* THÂN (Môi giới mặc Vest đen) */}
      <mesh position={[0, 0.75, 0]}>
        <boxGeometry args={[0.6, 1, 0.3]} />
        <meshStandardMaterial color={color} />
      </mesh>
      
      {/* Nếu là Môi giới, thêm cái Cà vạt đỏ cho oách */}
      {isBroker && (
         <mesh position={[0, 1, 0.16]}>
            <boxGeometry args={[0.1, 0.4, 0.05]} />
            <meshStandardMaterial color="red" />
         </mesh>
      )}
    </group>
  );
}

// --- 4. APP CHÍNH ---
export default function App() {
  const [players, setPlayers] = useState({});
  const [message, setMessage] = useState("");
  const [chatList, setChatList] = useState([]);
  const [myInfo, setMyInfo] = useState({ name: "", role: "client" });

  useEffect(() => {
    socket.on("updatePlayers", (backendPlayers) => {
      setPlayers(backendPlayers);
      if(backendPlayers[socket.id]) {
        setMyInfo({
          name: backendPlayers[socket.id].name,
          role: backendPlayers[socket.id].role
        });
      }
    });

    socket.on("receiveMessage", (data) => {
      setChatList((prev) => [...prev, data]);
    });

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
      
      {/* KHÔNG GIAN 3D */}
      <Canvas camera={{ position: [8, 8, 15], fov: 50 }}>
        {/* Ánh sáng tự nhiên, không bóng đổ gắt */}
        <Environment preset="city" /> 
        <ambientLight intensity={0.8} />
        
        <OrbitControls maxPolarAngle={Math.PI / 2 - 0.05} />

        <Floor />
        <House />

        {Object.keys(players).map((key) => (
          <Human 
            key={key} 
            position={players[key].position} 
            color={players[key].color} 
            name={players[key].name}
            role={players[key].role} 
          />
        ))}
      </Canvas>

      {/* CHAT UI */}
      <div style={{
        position: "absolute", bottom: "20px", left: "20px",
        width: "350px", height: "400px",
        backgroundColor: "white", borderRadius: "10px", padding: "15px",
        display: "flex", flexDirection: "column",
        boxShadow: "0 5px 15px rgba(0,0,0,0.2)", fontFamily: "Arial"
      }}>
        <div style={{ borderBottom: "1px solid #eee", paddingBottom: "10px", marginBottom: "10px"}}>
          <h4 style={{margin: 0, color: "#333"}}>Trao đổi mua nhà</h4>
          <small>
            Bạn là: <b style={{color: myInfo.role === 'broker' ? "red" : "blue"}}>
              {myInfo.name}
            </b>
          </small>
        </div>

        <div style={{ flex: 1, overflowY: "auto", marginBottom: "10px" }}>
          {chatList.map((msg, index) => {
            const isMe = msg.id === socket.id;
            const isBrokerMsg = msg.role === 'broker';
            
            return (
              <div key={index} style={{ marginBottom: "8px", textAlign: isMe ? "right" : "left" }}>
                <div style={{
                  fontSize: "11px", 
                  color: isBrokerMsg ? "#d35400" : "#888", 
                  fontWeight: isBrokerMsg ? "bold" : "normal",
                  marginBottom: "2px", marginLeft: "5px"
                }}>
                  {isMe ? "" : msg.name}
                </div>
                <span style={{
                  background: isMe ? "#007bff" : (isBrokerMsg ? "#fff3cd" : "#f1f1f1"),
                  border: isBrokerMsg && !isMe ? "1px solid #ffeeba" : "none",
                  color: isMe ? "white" : "black",
                  padding: "8px 12px", borderRadius: "12px", fontSize: "14px", display: "inline-block"
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
            style={{ flex: 1, padding: "10px", borderRadius: "5px", border: "1px solid #ccc" }}
          />
          <button onClick={sendMessage} style={{ 
            padding: "8px 15px", borderRadius: "5px", border: "none", 
            background: "#28a745", color: "white", cursor: "pointer" 
          }}>Gửi</button>
        </div>
      </div>
    </div>
  );
}