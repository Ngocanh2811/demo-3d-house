import React, { useEffect, useState } from "react";
import io from "socket.io-client";
import { Canvas, useFrame } from "@react-three/fiber";
import { OrbitControls, useGLTF, Text, Billboard, Environment, Html, Stars } from "@react-three/drei";

const socket = io.connect("http://localhost:3001");

// --- 1. MẶT TRỜI / MẶT TRĂNG ---
function CelestialBody({ isNight }) {
  // Mặt trời/trăng sẽ nằm trên cao, phía xa
  return (
    <group>
      {/* Nếu là đêm thì hiện Ngôi sao lấp lánh */}
      {isNight && <Stars radius={100} depth={50} count={5000} factor={4} saturation={0} fade speed={1} />}
      
      <mesh position={[20, 20, -40]}>
        <sphereGeometry args={[4, 32, 32]} />
        {/* Đêm thì màu Trắng sáng (Trăng), Ngày thì màu Cam vàng (Trời) */}
        <meshBasicMaterial color={isNight ? "#f5f6fa" : "#f0932b"} />
        
        {/* Ánh sáng tỏa ra từ thiên thể */}
        <pointLight intensity={isNight ? 0.5 : 2} distance={100} color={isNight ? "#dcdde1" : "#ffbe76"} />
      </mesh>
    </group>
  );
}

// --- 2. ĐÈN SÂN VƯỜN IOT ---
function GardenLamp({ position, isOn }) {
  return (
    <group position={position}>
      <mesh position={[0, 1, 0]}>
        <cylinderGeometry args={[0.05, 0.1, 2]} />
        <meshStandardMaterial color="#2c3e50" />
      </mesh>
      <mesh position={[0, 2, 0]}>
        <sphereGeometry args={[0.25, 16, 16]} />
        <meshStandardMaterial 
          color={isOn ? "#f1c40f" : "#7f8c8d"} 
          emissive={isOn ? "#f1c40f" : "black"}
          emissiveIntensity={isOn ? 3 : 0}
        />
      </mesh>
      {isOn && <pointLight position={[0, 2.2, 0]} distance={10} intensity={3} color="#f1c40f" />}
    </group>
  );
}

// --- 3. BIỂN BÁO (BẢO MẬT: CHỈ BROKER ĐƯỢC BẤM) ---
function StatusSign({ position, role }) {
  const [status, setStatus] = useState("FOR SALE");

  useEffect(() => {
    socket.on("updateHouseStatus", (s) => setStatus(s));
    return () => socket.off("updateHouseStatus");
  }, []);

  const handleClick = (e) => {
    e.stopPropagation();
    if (role !== "broker") {
      alert("⚠️ BẠN LÀ KHÁCH - KHÔNG ĐƯỢC PHÉP ĐỔI TRẠNG THÁI!");
      return;
    }
    const newStatus = status === "FOR SALE" ? "SOLD" : "FOR SALE";
    socket.emit("changeStatus", newStatus);
  };

  const isSold = status === "SOLD";
  return (
    <group position={position} onClick={handleClick}
           onPointerOver={() => document.body.style.cursor = role==='broker'?'pointer':'not-allowed'}
           onPointerOut={() => document.body.style.cursor = 'auto'}>
      <mesh position={[0, 1, 0]}><cylinderGeometry args={[0.05, 0.05, 2]} /><meshStandardMaterial color="#333" /></mesh>
      <mesh position={[0, 2, 0]}><boxGeometry args={[1.5, 0.8, 0.1]} /><meshStandardMaterial color={isSold ? "#c0392b" : "#27ae60"} /></mesh>
      <Text position={[0, 2, 0.06]} fontSize={0.35} color="white" fontWeight="bold">{status}</Text>
    </group>
  );
}

// --- 4. NGÔI NHÀ + HOTSPOT GIÁ TIỀN ---
function SmartHouse() {
  const { scene } = useGLTF("/nha.glb");
  const [showInfo, setShowInfo] = useState(false);

  return (
    <group position={[0, 1.6, 0]}>
      <primitive object={scene} scale={[0.8, 0.8, 0.8]} />
      
      {/* NÚT ĐỎ (HOTSPOT) - Để xem giá tiền */}
      <mesh position={[2, 2.5, 2]} onClick={() => setShowInfo(!showInfo)}
            onPointerOver={() => document.body.style.cursor = 'pointer'}
            onPointerOut={() => document.body.style.cursor = 'auto'}>
        <sphereGeometry args={[0.25, 16, 16]} />
        <meshBasicMaterial color="#ff4757" transparent opacity={0.8} />
        {/* Vòng tròn hiệu ứng */}
        <mesh scale={[1.5, 1.5, 1.5]}><ringGeometry args={[0.2, 0.25, 32]} /><meshBasicMaterial color="white" side={2} /></mesh>
      </mesh>

      {/* POPUP GIÁ TIỀN */}
      {showInfo && (
        <Html position={[2, 3.5, 2]} center>
          <div style={{
            background: "rgba(255, 255, 255, 0.95)", padding: "15px", borderRadius: "12px", width: "200px",
            boxShadow: "0 10px 30px rgba(0,0,0,0.3)", textAlign: "center", fontFamily: "Arial"
          }}>
            <h3 style={{margin: "0 0 5px", color: "#333"}}>Biệt Thự Vườn</h3>
            <p style={{margin: "0 0 10px", fontSize: "12px", color: "#666"}}>Full nội thất Smart Home</p>
            <div style={{color: "#27ae60", fontWeight: "bold", fontSize: "18px", marginBottom: "10px"}}>$500,000</div>
            <button onClick={() => setShowInfo(false)} style={{
              background: "#ff4757", color:"white", border:"none", padding:"6px 15px", borderRadius:"20px", cursor:"pointer"
            }}>Đóng</button>
          </div>
        </Html>
      )}
    </group>
  );
}

// --- 5. AVATAR ---
function Human({ position, color, name, role }) {
  const isBroker = role === "broker";
  return (
    <group position={position}>
      <Billboard position={[0, 2.6, 0]}>
        <Text fontSize={isBroker?0.4:0.3} color={isBroker?"#d35400":"white"} outlineWidth={0.03} outlineColor="black">{name}</Text>
      </Billboard>
      <mesh position={[0, 1.6, 0]}><boxGeometry args={[0.5, 0.5, 0.5]} /><meshStandardMaterial color={isBroker?"#f1c40f":color} /></mesh>
      <mesh position={[0, 0.75, 0]}><boxGeometry args={[0.6, 1, 0.3]} /><meshStandardMaterial color={color} /></mesh>
      {isBroker && <mesh position={[0, 1, 0.16]}><boxGeometry args={[0.1, 0.4, 0.05]} /><meshStandardMaterial color="red" /></mesh>}
    </group>
  );
}

// --- APP CHÍNH ---
export default function App() {
  const [players, setPlayers] = useState({});
  const [envPreset, setEnvPreset] = useState("city");
  const [lightsOn, setLightsOn] = useState(false);
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
    socket.on("updateLights", (status) => setLightsOn(status));
    return () => { socket.off("updatePlayers"); socket.off("receiveMessage"); socket.off("updateEnvironment"); socket.off("updateLights"); };
  }, []);

  const changeMode = (mode) => socket.emit("changeEnvironment", mode);
  const toggleLights = () => socket.emit("toggleLights");
  const sendMessage = () => { if(message.trim()){ socket.emit("sendMessage", { text: message }); setMessage(""); }};

  const isNight = envPreset === "night";

  return (
    <div style={{ width: "100vw", height: "100vh", position: "relative", fontFamily: "Segoe UI", background: "#111" }}>
      
      {/* NÚT ĐIỀU KHIỂN */}
      <div style={{ position: "absolute", top: "20px", left: "20px", zIndex: 10, display: "flex", gap: "10px" }}>
        <button onClick={() => changeMode(isNight ? "city" : "night")} 
            style={{padding: "10px 15px", background: isNight?"#2c3e50":"#f1c40f", color: "white", borderRadius: "8px", cursor:"pointer", border:"none", fontWeight:"bold"}}>
            {isNight ? "🌙 Đang là Ban Đêm" : "☀️ Đang là Ban Ngày"}
        </button>

        <button onClick={toggleLights} 
            style={{padding: "10px 15px", background: lightsOn?"#e67e22":"#7f8c8d", color: "white", borderRadius: "8px", cursor:"pointer", border:"none", fontWeight:"bold"}}>
            💡 {lightsOn ? "Tắt Đèn Vườn" : "Bật Đèn Vườn"}
        </button>
      </div>

      <Canvas camera={{ position: [5, 5, 15], fov: 50 }} shadows>
        {/* Môi trường */}
        <Environment preset={envPreset} background blur={0.6} />
        
        {/* Component Mặt Trời / Mặt Trăng */}
        <CelestialBody isNight={isNight} />

        {/* Ánh sáng */}
        <ambientLight intensity={isNight ? 0.2 : 0.6} />
        <pointLight position={[10, 20, 10]} intensity={isNight ? 0.2 : 1} castShadow />

        <OrbitControls maxPolarAngle={Math.PI / 2 - 0.05} />

        {/* Sàn nhà */}
        <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.01, 0]}>
          <planeGeometry args={[60, 60]} />
          <meshStandardMaterial color={isNight ? "#2c3e50" : "#7f8c8d"} />
        </mesh>

        <SmartHouse />
        <StatusSign position={[-3, 0, 4]} role={myInfo.role} />

        {/* 4 Cột đèn */}
        <GardenLamp position={[16, 0, 8]} isOn={lightsOn} />
        <GardenLamp position={[-5, 0, 8]} isOn={lightsOn} />
        <GardenLamp position={[16, 0, -8]} isOn={lightsOn} />
        <GardenLamp position={[-5, 0, -8]} isOn={lightsOn} />

        {Object.keys(players).map((key) => (
            <Human key={key} position={players[key].position} color={players[key].color} 
                   name={players[key].name} role={players[key].role} />
        ))}
      </Canvas>

      {/* CHAT BOX - Giao diện mới rõ ràng hơn */}
      <div style={{
        position: "absolute", bottom: "20px", left: "20px", width: "350px", height: "450px",
        background: "rgba(255,255,255,0.95)", borderRadius: "16px", padding: "20px", display: "flex", flexDirection: "column",
        boxShadow: "0 10px 40px rgba(0,0,0,0.3)"
      }}>
        <div style={{borderBottom: "1px solid #ddd", paddingBottom: "10px", marginBottom: "15px"}}>
          <h3 style={{margin: 0, color: "#2c3e50"}}>Phòng Giao Dịch</h3>
          <small>Vai trò: <b style={{color: myInfo.role==='broker'?"#e67e22":"#2980b9"}}>{myInfo.name}</b></small>
        </div>

        <div style={{flex: 1, overflowY:"auto", paddingRight: "5px", display: "flex", flexDirection: "column", gap: "10px"}}>
           {chatList.map((msg, i) => {
             const isMe = msg.id === socket.id;
             const isSystem = msg.role === 'system';
             const isBroker = msg.role === 'broker';

             // Nếu là tin nhắn hệ thống (SOLD)
             if (isSystem) return (
                <div key={i} style={{textAlign:"center", margin: "10px 0"}}>
                   <span style={{background:"#e74c3c", color:"white", padding:"5px 10px", borderRadius:"20px", fontSize:"12px", fontWeight:"bold"}}>
                     {msg.text}
                   </span>
                </div>
             );

             return (
               <div key={i} style={{alignSelf: isMe ? "flex-end" : "flex-start", maxWidth: "85%"}}>
                   {/* TÊN NGƯỜI NHẮN (Môi giới màu cam, Khách màu xám) */}
                   {!isMe && (
                     <div style={{
                       fontSize: "11px", marginBottom: "2px", marginLeft: "8px", fontWeight: "bold",
                       color: isBroker ? "#d35400" : "#7f8c8d"
                     }}>
                       {msg.name} {isBroker && "⭐"}
                     </div>
                   )}
                   
                   {/* BONG BÓNG CHAT */}
                   <div style={{
                       background: isMe ? "#007bff" : (isBroker ? "#fcf8e3" : "#f1f2f6"),
                       border: isBroker && !isMe ? "1px solid #faebcc" : "none",
                       color: isMe ? "white" : (isBroker ? "#8a6d3b" : "#2f3542"),
                       padding: "8px 12px", borderRadius: "16px", fontSize: "14px",
                       borderBottomRightRadius: isMe ? "4px" : "16px",
                       borderBottomLeftRadius: isMe ? "16px" : "4px"
                   }}>
                       {msg.text}
                   </div>
               </div>
             )
           })}
        </div>
        
        <div style={{display:"flex", gap:"8px", marginTop:"15px"}}>
            <input value={message} onChange={e=>setMessage(e.target.value)} onKeyDown={e=>e.key==="Enter"&&sendMessage()} 
                   placeholder="Nhập tin nhắn..." 
                   style={{flex:1, padding:"12px", borderRadius:"25px", border:"1px solid #ddd", outline:"none", background: "#f8f9fa"}} />
            <button onClick={sendMessage} style={{background:"#2ecc71", color:"white", border:"none", borderRadius:"25px", padding:"0 20px", cursor:"pointer", fontWeight:"bold"}}>
              Gửi
            </button>
        </div>
      </div>
    </div>
  );
}