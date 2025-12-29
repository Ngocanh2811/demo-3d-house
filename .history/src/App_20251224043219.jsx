import React, { useEffect, useState } from "react";
import io from "socket.io-client";
import { Canvas } from "@react-three/fiber";
import { OrbitControls, useGLTF, Text, Billboard, Environment, Html } from "@react-three/drei";

// Kết nối Backend
const socket = io.connect("http://localhost:3001");

// --- 1. SÀN NHÀ TƯƠNG TÁC (Click để đổi màu) ---
function InteractiveFloor() {
  const [color, setColor] = useState("#e0e0e0");

  useEffect(() => {
    socket.on("updateFloor", (newColor) => setColor(newColor));
    return () => socket.off("updateFloor");
  }, []);

  const handleClick = (e) => {
    e.stopPropagation(); // Ngăn click xuyên qua
    // Random màu mới
    const randomColor = '#' + Math.floor(Math.random()*16777215).toString(16);
    socket.emit("changeFloorColor", randomColor);
  };

  return (
    <mesh 
      rotation={[-Math.PI / 2, 0, 0]} 
      position={[0, -0.01, 0]} 
      onClick={handleClick}
      onPointerOver={() => document.body.style.cursor = 'pointer'}
      onPointerOut={() => document.body.style.cursor = 'auto'}
    >
      <planeGeometry args={[50, 50]} />
      <meshStandardMaterial color={color} />
    </mesh>
  );
}

// --- 2. CĂN NHÀ & HOTSPOT (Điểm thông tin) ---
function SmartHouse() {
  // LƯU Ý: Đổi tên file này đúng với file trong thư mục public của bạn
  const { scene } = useGLTF("/nha.glb"); 
  const [showInfo, setShowInfo] = useState(false);

  return (
    <group position={[0, 1.7, 0]}>
      {/* Ngôi nhà */}
      <primitive object={scene} scale={[0.8, 0.8, 0.8]} />

      {/* HOTSPOT: Nút tròn đỏ bay lơ lửng */}
      <mesh position={[2, 2.5, 2]} onClick={() => setShowInfo(!showInfo)}>
        <sphereGeometry args={[0.3, 16, 16]} />
        <meshBasicMaterial color="#ff4757" transparent opacity={0.8} />
      </mesh>
      
      {/* Vòng tròn động dưới hotspot cho đẹp */}
      <mesh position={[2, 2.5, 2]} scale={[1.5, 1.5, 1.5]}>
         <ringGeometry args={[0.25, 0.3, 32]} />
         <meshBasicMaterial color="white" side={2} /> 
         {/* (Bạn có thể thêm animation xoay cho ring này nếu muốn) */}
      </mesh>

      {/* BẢNG THÔNG TIN (Hiện ra khi bấm hotspot) */}
      {showInfo && (
        <Html position={[2, 3.2, 2]} center>
          <div style={{
            background: "rgba(255, 255, 255, 0.95)",
            padding: "15px", borderRadius: "12px", width: "200px",
            boxShadow: "0 10px 30px rgba(0,0,0,0.3)", textAlign: "center",
            fontFamily: "Arial", transform: "scale(1)"
          }}>
            <h3 style={{margin: "0 0 5px", color: "#2f3542"}}>Smart Home Package</h3>
            <p style={{margin: "0 0 10px", fontSize: "13px", color: "#57606f"}}>
              Tích hợp hệ thống ánh sáng & rèm cửa tự động.
            </p>
            <strong style={{display:"block", marginBottom:"10px", color: "#2ed573", fontSize: "16px"}}>$5,000 USD</strong>
            <button 
              onClick={() => setShowInfo(false)}
              style={{background: "#ff4757", color:"white", border:"none", padding:"5px 15px", borderRadius:"20px", cursor:"pointer"}}
            >
              Đóng
            </button>
          </div>
        </Html>
      )}
    </group>
  );
}

// --- 3. AVATAR (MÔI GIỚI & KHÁCH) ---
function Human({ position, color, name, role }) {
  const isBroker = role === "broker";
  return (
    <group position={position}>
      <Billboard position={[0, 2.6, 0]}>
        <Text 
          fontSize={isBroker ? 0.4 : 0.3} 
          color={isBroker ? "#d35400" : "black"} 
          outlineWidth={0.03} outlineColor="white" fontWeight="bold"
        >
          {name}
        </Text>
      </Billboard>
      {/* Đầu */}
      <mesh position={[0, 1.6, 0]}>
        <boxGeometry args={[0.5, 0.5, 0.5]} />
        <meshStandardMaterial color={isBroker ? "#f1c40f" : color} /> 
      </mesh>
      {/* Thân */}
      <mesh position={[0, 0.75, 0]}>
        <boxGeometry args={[0.6, 1, 0.3]} />
        <meshStandardMaterial color={color} />
      </mesh>
      {/* Cà vạt cho môi giới */}
      {isBroker && (
         <mesh position={[0, 1, 0.16]}>
            <boxGeometry args={[0.1, 0.4, 0.05]} />
            <meshStandardMaterial color="#c0392b" />
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
  const [myInfo, setMyInfo] = useState({ name: "Loading...", role: "client" });

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
    <div style={{ width: "100vw", height: "100vh", position: "relative", background: "#f0f2f5" }}>
      
      {/* KHÔNG GIAN 3D */}
      <Canvas camera={{ position: [8, 8, 15], fov: 50 }} shadows>
        <Environment preset="city" /> 
        <ambientLight intensity={0.7} />
        <pointLight position={[10, 20, 10]} intensity={1} />
        
        <OrbitControls maxPolarAngle={Math.PI / 2 - 0.05} />

        {/* Các Component 3D */}
        <InteractiveFloor />
        <SmartHouse />

        {/* Render Người chơi */}
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

      {/* GIAO DIỆN CHAT */}
      <div style={{
        position: "absolute", bottom: "20px", left: "20px",
        width: "350px", height: "450px",
        backgroundColor: "rgba(255, 255, 255, 0.95)", 
        borderRadius: "16px", padding: "20px",
        display: "flex", flexDirection: "column",
        boxShadow: "0 10px 40px rgba(0,0,0,0.2)", fontFamily: "Segoe UI, sans-serif"
      }}>
        <div style={{ borderBottom: "1px solid #eee", paddingBottom: "15px", marginBottom: "15px"}}>
          <h3 style={{margin: 0, color: "#2c3e50"}}>Virtual Showroom</h3>
          <div style={{fontSize: "13px", marginTop: "5px", color: "#7f8c8d"}}>
            Bạn là: <b style={{color: myInfo.role === 'broker' ? "#d35400" : "#2980b9"}}>{myInfo.name}</b>
          </div>
          <div style={{fontSize: "11px", color: "#95a5a6", marginTop: "5px"}}>
             *Click sàn nhà để đổi màu - Click bóng đỏ để xem giá
          </div>
        </div>

        <div style={{ flex: 1, overflowY: "auto", marginBottom: "10px", paddingRight: "5px" }}>
          {chatList.map((msg, index) => {
            const isMe = msg.id === socket.id;
            const isBrokerMsg = msg.role === 'broker';
            
            return (
              <div key={index} style={{ marginBottom: "10px", textAlign: isMe ? "right" : "left" }}>
                {!isMe && <div style={{fontSize: "10px", color: "#aaa", marginBottom: "2px", marginLeft:"5px"}}>{msg.name}</div>}
                <span style={{
                  background: isMe ? "linear-gradient(135deg, #667eea 0%, #764ba2 100%)" : (isBrokerMsg ? "#fcf8e3" : "#f1f2f6"),
                  border: isBrokerMsg && !isMe ? "1px solid #faebcc" : "none",
                  color: isMe ? "white" : (isBrokerMsg ? "#8a6d3b" : "#2f3542"),
                  padding: "8px 14px", borderRadius: "12px", fontSize: "14px", display: "inline-block",
                  boxShadow: "0 1px 2px rgba(0,0,0,0.05)"
                }}>
                  {msg.text}
                </span>
              </div>
            );
          })}
        </div>

        <div style={{ display: "flex", gap: "10px" }}>
          <input 
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && sendMessage()}
            placeholder="Nhập tin nhắn..."
            style={{ flex: 1, padding: "12px", borderRadius: "30px", border: "1px solid #ddd", outline: "none", background: "#f9f9f9" }}
          />
          <button onClick={sendMessage} style={{ 
            padding: "0 20px", borderRadius: "30px", border: "none", 
            background: "#27ae60", color: "white", cursor: "pointer", fontWeight: "bold"
          }}>Gửi</button>
        </div>
      </div>
    </div>
  );
}