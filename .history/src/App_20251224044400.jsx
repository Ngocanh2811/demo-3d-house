import React, { useEffect, useState } from "react";
import io from "socket.io-client";
import { Canvas } from "@react-three/fiber";
import { OrbitControls, useGLTF, Text, Billboard, Environment, Html } from "@react-three/drei";

const socket = io.connect("http://localhost:3001");

// --- 1. SÀN NHÀ TƯƠNG TÁC (Đổi màu) ---
function InteractiveFloor() {
  const [color, setColor] = useState("#e0e0e0");

  useEffect(() => {
    socket.on("updateFloor", (newColor) => setColor(newColor));
    return () => socket.off("updateFloor");
  }, []);

  const handleClick = (e) => {
    e.stopPropagation();
    const randomColor = '#' + Math.floor(Math.random()*16777215).toString(16);
    socket.emit("changeFloorColor", randomColor);
  };

  return (
    <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.01, 0]} onClick={handleClick}
          onPointerOver={() => document.body.style.cursor = 'pointer'}
          onPointerOut={() => document.body.style.cursor = 'auto'}>
      <planeGeometry args={[50, 50]} />
      <meshStandardMaterial color={color} />
    </mesh>
  );
}

// --- 2. BIỂN BÁO TRẠNG THÁI (SOLD / FOR SALE) ---
function StatusSign({ position }) {
  const [status, setStatus] = useState("FOR SALE");

  useEffect(() => {
    socket.on("updateHouseStatus", (s) => setStatus(s));
    return () => socket.off("updateHouseStatus");
  }, []);

  const toggleStatus = (e) => {
    e.stopPropagation();
    // Logic: Click để chuyển đổi trạng thái
    const newStatus = status === "FOR SALE" ? "SOLD" : "FOR SALE";
    socket.emit("changeStatus", newStatus);
  };

  const isSold = status === "SOLD";

  return (
    <group position={position} onClick={toggleStatus} 
           onPointerOver={() => document.body.style.cursor = 'pointer'}
           onPointerOut={() => document.body.style.cursor = 'auto'}>
      {/* Cọc */}
      <mesh position={[0, 1, 0]}>
        <cylinderGeometry args={[0.05, 0.05, 2]} />
        <meshStandardMaterial color="#333" />
      </mesh>
      {/* Bảng */}
      <mesh position={[0, 2, 0]}>
        <boxGeometry args={[1.5, 0.8, 0.1]} />
        <meshStandardMaterial color={isSold ? "#c0392b" : "#27ae60"} />
      </mesh>
      <Text position={[0, 2, 0.06]} fontSize={0.35} color="white" fontWeight="bold">
        {status}
      </Text>
    </group>
  );
}

// --- 3. NGÔI NHÀ & HOTSPOT ---
function SmartHouse() {
  const { scene } = useGLTF("/nha.glb");
  const [showInfo, setShowInfo] = useState(false);

  return (
    <group position={[0, 0, 0]}>
      <primitive object={scene} scale={[0.8, 0.8, 0.8]} />
      
      {/* Hotspot (Nút đỏ) */}
      <mesh position={[2, 2.5, 2]} onClick={() => setShowInfo(!showInfo)}
            onPointerOver={() => document.body.style.cursor = 'pointer'}
            onPointerOut={() => document.body.style.cursor = 'auto'}>
        <sphereGeometry args={[0.25, 16, 16]} />
        <meshBasicMaterial color="#ff4757" transparent opacity={0.9} />
      </mesh>

      {/* Popup thông tin */}
      {showInfo && (
        <Html position={[2, 3.2, 2]} center>
          <div style={{
            background: "rgba(255,255,255,0.95)", padding: "15px", borderRadius: "10px", width: "180px",
            textAlign: "center", boxShadow: "0 5px 15px rgba(0,0,0,0.3)", fontFamily: "Arial"
          }}>
            <h4 style={{margin: "0 0 5px"}}>Smart TV Sony</h4>
            <div style={{color: "green", fontWeight: "bold", marginBottom: "5px"}}>$1,200</div>
            <button onClick={() => setShowInfo(false)} style={{padding: "5px 10px", cursor:"pointer"}}>Đóng</button>
          </div>
        </Html>
      )}
    </group>
  );
}

// --- 4. AVATAR ---
function Human({ position, color, name, role }) {
  const isBroker = role === "broker";
  return (
    <group position={position}>
      <Billboard position={[0, 2.6, 0]}>
        <Text fontSize={isBroker ? 0.4 : 0.3} color={isBroker ? "#d35400" : "black"} 
              outlineWidth={0.03} outlineColor="white" fontWeight="bold">
          {name}
        </Text>
      </Billboard>
      <mesh position={[0, 1.6, 0]}>
        <boxGeometry args={[0.5, 0.5, 0.5]} />
        <meshStandardMaterial color={isBroker ? "#f1c40f" : color} /> 
      </mesh>
      <mesh position={[0, 0.75, 0]}>
        <boxGeometry args={[0.6, 1, 0.3]} />
        <meshStandardMaterial color={color} />
      </mesh>
      {isBroker && (
         <mesh position={[0, 1, 0.16]}>
            <boxGeometry args={[0.1, 0.4, 0.05]} />
            <meshStandardMaterial color="#c0392b" />
         </mesh>
      )}
    </group>
  );
}

// --- 5. APP CHÍNH ---
export default function App() {
  const [players, setPlayers] = useState({});
  const [envPreset, setEnvPreset] = useState("city"); // Trạng thái Ngày/Đêm
  const [chatList, setChatList] = useState([]);
  const [message, setMessage] = useState("");
  const [myInfo, setMyInfo] = useState({ name: "", role: "client" });

  useEffect(() => {
    socket.on("updatePlayers", (p) => {
        setPlayers(p);
        if(p[socket.id]) setMyInfo({ name: p[socket.id].name, role: p[socket.id].role });
    });
    socket.on("receiveMessage", (data) => setChatList((prev) => [...prev, data]));
    socket.on("updateEnvironment", (preset) => setEnvPreset(preset));

    return () => { 
        socket.off("updatePlayers"); socket.off("receiveMessage"); socket.off("updateEnvironment"); 
    };
  }, []);

  const changeMode = (mode) => socket.emit("changeEnvironment", mode);

  const sendMessage = () => {
    if (message.trim()) {
      socket.emit("sendMessage", { text: message });
      setMessage("");
    }
  };

  return (
    <div style={{ width: "100vw", height: "100vh", position: "relative", fontFamily: "Segoe UI, sans-serif" }}>
      
      {/* PANEL ĐIỀU KHIỂN (Góc trên trái) */}
      <div style={{ position: "absolute", top: "20px", left: "20px", zIndex: 10, display: "flex", gap: "10px" }}>
        <button onClick={() => changeMode("city")} 
            style={{padding: "10px 15px", background: envPreset==="city"?"#f1c40f":"white", border: "1px solid #ccc", borderRadius: "8px", cursor:"pointer", fontWeight:"bold"}}>
            ☀️ Ban Ngày
        </button>
        <button onClick={() => changeMode("night")} 
            style={{padding: "10px 15px", background: envPreset==="night"?"#2c3e50":"white", color: envPreset==="night"?"white":"black", border: "1px solid #ccc", borderRadius: "8px", cursor:"pointer", fontWeight:"bold"}}>
            🌙 Ban Đêm
        </button>
      </div>

      {/* 3D SCENE */}
      <Canvas camera={{ position: [5, 5, 12], fov: 50 }} shadows>
        {/* Chuyển đổi môi trường dựa trên state */}
        <Environment preset={envPreset} background blur={0.5} />
        
        {/* Ánh sáng thay đổi theo ngày/đêm */}
        <ambientLight intensity={envPreset === "night" ? 0.3 : 0.7} />
        <pointLight position={[10, 10, 10]} intensity={envPreset === "night" ? 5 : 1} />

        <OrbitControls maxPolarAngle={Math.PI / 2 - 0.05} />

        <InteractiveFloor />
        <SmartHouse />
        
        {/* Đặt biển báo bên trái nhà */}
        <StatusSign position={[-3, 0, 4]} />

        {Object.keys(players).map((key) => (
            <Human key={key} position={players[key].position} color={players[key].color} 
                   name={players[key].name} role={players[key].role} />
        ))}
      </Canvas>

      {/* CHAT BOX */}
      <div style={{
        position: "absolute", bottom: "20px", left: "20px", width: "320px", height: "400px",
        background: "rgba(255,255,255,0.9)", backdropFilter: "blur(10px)",
        borderRadius: "12px", padding: "15px", display: "flex", flexDirection: "column",
        boxShadow: "0 10px 30px rgba(0,0,0,0.2)"
      }}>
        <div style={{borderBottom: "1px solid #ddd", paddingBottom: "10px", marginBottom: "10px"}}>
          <h3 style={{margin: 0, color: "#333"}}>Live Chat</h3>
          <small style={{color: "#666"}}>Bạn là: <b style={{color: myInfo.role==='broker'?"#d35400":"#2980b9"}}>{myInfo.name}</b></small>
        </div>

        <div style={{flex: 1, overflowY:"auto", paddingRight: "5px"}}>
           {chatList.map((msg, i) => {
             const isMe = msg.id === socket.id;
             // Màu sắc tin nhắn dựa trên vai trò
             let bg = isMe ? "#007bff" : "#f1f2f6";
             let color = isMe ? "white" : "#333";
             if (msg.role === 'bot') { bg = "#8e44ad"; color = "white"; } // Bot màu tím
             if (msg.role === 'system') { bg = "#e74c3c"; color = "white"; } // System màu đỏ
             if (msg.role === 'broker' && !isMe) { bg = "#fcf8e3"; color = "#8a6d3b"; } // Broker màu vàng

             return (
               <div key={i} style={{marginBottom: "8px", textAlign: isMe ? "right" : "left"}}>
                   {msg.role !== 'system' && !isMe && <div style={{fontSize:"10px", color:"#999", marginLeft:"5px"}}>{msg.name}</div>}
                   <span style={{
                       background: bg, color: color, padding: "8px 12px", borderRadius: "15px", 
                       fontSize: "13px", display:"inline-block", maxWidth: "80%"
                   }}>
                       {msg.role === 'bot' && "🤖 "} 
                       {msg.text}
                   </span>
               </div>
             )
           })}
        </div>
        
        <div style={{display:"flex", gap:"5px", marginTop:"10px"}}>
            <input value={message} onChange={e=>setMessage(e.target.value)} onKeyDown={e=>e.key==="Enter"&&sendMessage()} 
                   placeholder="Nhập tin nhắn..."
                   style={{flex:1, padding:"10px", borderRadius:"20px", border:"1px solid #ddd", outline:"none"}} />
            <button onClick={sendMessage} style={{background:"#2ecc71", color:"white", border:"none", borderRadius:"20px", padding:"0 15px", cursor:"pointer"}}>Gửi</button>
        </div>
      </div>
    </div>
  );
}