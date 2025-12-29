import React, { useEffect, useState, useRef } from "react";
import io from "socket.io-client";
import { Canvas } from "@react-three/fiber";
import { OrbitControls, useGLTF, Text, Billboard, Environment, Html, Stars } from "@react-three/drei";

const socket = io.connect("http://localhost:3001");

// --- 1. MẶT TRỜI / MẶT TRĂNG ---
function CelestialBody({ isNight }) {
  return (
    <group>
      {isNight && <Stars radius={100} depth={50} count={5000} factor={4} saturation={0} fade speed={1} />}
      <mesh position={[20, 20, -40]}>
        <sphereGeometry args={[4, 32, 32]} />
        <meshBasicMaterial color={isNight ? "#f5f6fa" : "#f0932b"} />
        <pointLight intensity={isNight ? 0.5 : 2} distance={100} color={isNight ? "#dcdde1" : "#ffbe76"} />
      </mesh>
    </group>
  );
}

// --- 2. ĐÈN SÂN VƯỜN ---
function GardenLamp({ position, isOn }) {
  return (
    <group position={position}>
      <mesh position={[0, 1, 0]}>
        <cylinderGeometry args={[0.05, 0.1, 2]} />
        <meshStandardMaterial color="#2c3e50" />
      </mesh>
      <mesh position={[0, 2, 0]}>
        <sphereGeometry args={[0.25, 16, 16]} />
        <meshStandardMaterial color={isOn ? "#f1c40f" : "#7f8c8d"} emissive={isOn ? "#f1c40f" : "black"} emissiveIntensity={isOn ? 3 : 0}/>
      </mesh>
      {isOn && <pointLight position={[0, 2.2, 0]} distance={10} intensity={3} color="#f1c40f" />}
    </group>
  );
}

// --- 3. BIỂN BÁO ---
function StatusSign({ position, role }) {
  const [status, setStatus] = useState("FOR SALE");

  useEffect(() => {
    socket.on("updateHouseStatus", (s) => setStatus(s));
    return () => socket.off("updateHouseStatus");
  }, []);

  const handleClick = (e) => {
    e.stopPropagation();
    if (role !== "broker") {
      alert("⚠️ CHỈ MÔI GIỚI MỚI ĐƯỢC ĐỔI TRẠNG THÁI!");
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

// --- 4. NGÔI NHÀ + BẢNG CHI TIẾT (ĐÃ NÂNG CẤP) ---
function SmartHouse() {
  const { scene } = useGLTF("/nha.glb");
  const [showInfo, setShowInfo] = useState(false);

  return (
    <group position={[0, 1.6, 0]}>
      <primitive object={scene} scale={[0.8, 0.8, 0.8]} />
      
      {/* NÚT TRÒN ĐỎ (HOTSPOT) */}
      <mesh position={[2, 3, 2]} onClick={() => setShowInfo(!showInfo)}
            onPointerOver={() => document.body.style.cursor = 'pointer'}
            onPointerOut={() => document.body.style.cursor = 'auto'}>
        <sphereGeometry args={[0.3, 16, 16]} />
        <meshBasicMaterial color="#ff4757" transparent opacity={0.9} />
        {/* Hiệu ứng vòng tròn tỏa ra */}
        <mesh scale={[1.5, 1.5, 1.5]}><ringGeometry args={[0.2, 0.25, 32]} /><meshBasicMaterial color="white" side={2} /></mesh>
        {/* Label lơ lửng */}
        <Billboard position={[0, 0.6, 0]}>
            <Text fontSize={0.3} color="white" outlineWidth={0.05} outlineColor="#ff4757">Info</Text>
        </Billboard>
      </mesh>

      {/* POPUP THÔNG TIN CHI TIẾT */}
      {showInfo && (
        <Html position={[2, 4, 2]} center>
          <div style={{ 
            background: "rgba(255, 255, 255, 0.98)", 
            padding: "20px", 
            borderRadius: "15px", 
            width: "280px", 
            textAlign: "left", 
            boxShadow: "0 15px 40px rgba(0,0,0,0.4)",
            border: "1px solid #eee",
            fontFamily: "Segoe UI, sans-serif"
          }}>
            <div style={{display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "10px", borderBottom: "1px solid #ddd", paddingBottom: "5px"}}>
                <h3 style={{margin: 0, color: "#2c3e50"}}>🏡 Biệt Thự Phố</h3>
                <span style={{background: "#27ae60", color:"white", padding: "2px 8px", borderRadius: "10px", fontSize: "10px", fontWeight:"bold"}}>VIP</span>
            </div>

            <table style={{width: "100%", fontSize: "13px", color: "#444", borderCollapse: "collapse"}}>
                <tbody>
                    <tr style={{borderBottom: "1px dashed #eee"}}>
                        <td style={{padding: "5px 0", color: "#7f8c8d"}}>Diện tích đất:</td>
                        <td style={{padding: "5px 0", fontWeight: "bold", textAlign: "right"}}>10m x 20m (200m²)</td>
                    </tr>
                    <tr style={{borderBottom: "1px dashed #eee"}}>
                        <td style={{padding: "5px 0", color: "#7f8c8d"}}>Kết cấu:</td>
                        <td style={{padding: "5px 0", fontWeight: "bold", textAlign: "right"}}>1 Trệt, 2 Lầu</td>
                    </tr>
                    <tr style={{borderBottom: "1px dashed #eee"}}>
                        <td style={{padding: "5px 0", color: "#7f8c8d"}}>Phòng ngủ:</td>
                        <td style={{padding: "5px 0", fontWeight: "bold", textAlign: "right"}}>4 PN Master</td>
                    </tr>
                    <tr style={{borderBottom: "1px dashed #eee"}}>
                        <td style={{padding: "5px 0", color: "#7f8c8d"}}>Hướng:</td>
                        <td style={{padding: "5px 0", fontWeight: "bold", textAlign: "right"}}>Đông Nam</td>
                    </tr>
                    <tr>
                        <td style={{padding: "10px 0", fontSize: "14px", fontWeight: "bold", color: "#c0392b"}}>Giá bán:</td>
                        <td style={{padding: "10px 0", fontSize: "18px", fontWeight: "bold", color: "#c0392b", textAlign: "right"}}>$500,000</td>
                    </tr>
                </tbody>
            </table>

            <div style={{marginTop: "15px", textAlign: "center"}}>
                <button onClick={() => setShowInfo(false)} style={{
                    background: "#e74c3c", color:"white", border:"none", padding:"8px 25px", 
                    borderRadius:"20px", cursor:"pointer", fontWeight: "bold", boxShadow: "0 4px 6px rgba(231, 76, 60, 0.3)"
                }}>
                    Đóng lại
                </button>
            </div>
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
        <Text fontSize={0.3} color={isBroker?"#d35400":"white"} outlineWidth={0.03} outlineColor="black">{name}</Text>
      </Billboard>
      <mesh position={[0, 1.6, 0]}><boxGeometry args={[0.5, 0.5, 0.5]} /><meshStandardMaterial color={isBroker?"#f1c40f":color} /></mesh>
      <mesh position={[0, 0.75, 0]}><boxGeometry args={[0.6, 1, 0.3]} /><meshStandardMaterial color={color} /></mesh>
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
  
  // Ref để auto scroll chat
  const chatEndRef = useRef(null);

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

  // Effect riêng để scroll xuống cuối khi có chat mới
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [chatList]);

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
            {isNight ? "🌙 Chế độ Đêm" : "☀️ Chế độ Ngày"}
        </button>
        <button onClick={toggleLights} 
            style={{padding: "10px 15px", background: lightsOn?"#e67e22":"#7f8c8d", color: "white", borderRadius: "8px", cursor:"pointer", border:"none", fontWeight:"bold"}}>
            💡 {lightsOn ? "Tắt Đèn" : "Bật Đèn"}
        </button>
      </div>

      <Canvas camera={{ position: [5, 5, 15], fov: 50 }} shadows>
        <Environment preset={envPreset} background blur={0.6} />
        <CelestialBody isNight={isNight} />
        <ambientLight intensity={isNight ? 0.2 : 0.6} />
        <pointLight position={[10, 20, 10]} intensity={isNight ? 0.2 : 1} castShadow />
        <OrbitControls maxPolarAngle={Math.PI / 2 - 0.05} />

        <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.01, 0]}>
          <planeGeometry args={[60, 60]} />
          <meshStandardMaterial color={isNight ? "#2c3e50" : "#7f8c8d"} />
        </mesh>

        <SmartHouse />
        <StatusSign position={[-3, 0, 7]} role={myInfo.role} />

        <GardenLamp position={[16, 0, 8]} isOn={lightsOn} />
        <GardenLamp position={[-5, 0, 8]} isOn={lightsOn} />
        <GardenLamp position={[16, 0, -8]} isOn={lightsOn} />
        <GardenLamp position={[-5, 0, -8]} isOn={lightsOn} />

        {Object.keys(players).map((key) => (
            <Human key={key} position={players[key].position} color={players[key].color} 
                   name={players[key].name} role={players[key].role} />
        ))}
      </Canvas>

      {/* CHAT BOX */}
      <div style={{
        position: "absolute", bottom: "20px", left: "20px", width: "350px", height: "450px",
        background: "rgba(255,255,255,0.95)", borderRadius: "16px", padding: "20px", display: "flex", flexDirection: "column",
        boxShadow: "0 10px 40px rgba(0,0,0,0.3)"
      }}>
        <div style={{borderBottom: "1px solid #ddd", paddingBottom: "10px", marginBottom: "15px"}}>
          <h3 style={{margin: 0, color: "#2c3e50"}}>Tư Vấn Trực Tuyến</h3>
          <small>Xin chào: <b style={{color: myInfo.role==='broker'?"#e67e22":"#2980b9"}}>{myInfo.name}</b></small>
        </div>

        <div style={{flex: 1, overflowY:"auto", paddingRight: "5px", display: "flex", flexDirection: "column", gap: "10px"}}>
           {chatList.map((msg, i) => {
             const isMe = msg.id === socket.id;
             const isSystem = msg.role === 'system';
             const isBot = msg.role === 'bot';
             const isBroker = msg.role === 'broker';

             if (isSystem) return (
                <div key={i} style={{textAlign:"center", margin: "10px 0"}}>
                   <span style={{background:"#e74c3c", color:"white", padding:"5px 10px", borderRadius:"20px", fontSize:"12px", fontWeight:"bold"}}>{msg.text}</span>
                </div>
             );

             return (
               <div key={i} style={{alignSelf: isMe ? "flex-end" : "flex-start", maxWidth: "85%"}}>
                   {!isMe && (
                     <div style={{fontSize: "11px", marginBottom: "2px", marginLeft: "8px", fontWeight: "bold", color: isBot ? "#8e44ad" : (isBroker ? "#d35400" : "#7f8c8d")}}>
                       {msg.name} {isBroker && "⭐"} {isBot && "🤖"}
                     </div>
                   )}
                   <div style={{
                       background: isMe ? "#007bff" : (isBot ? "#e8daf1" : (isBroker ? "#fcf8e3" : "#f1f2f6")),
                       color: isMe ? "white" : (isBot ? "#4a235a" : (isBroker ? "#8a6d3b" : "#2f3542")),
                       padding: "8px 12px", borderRadius: "16px", fontSize: "14px",
                       borderBottomRightRadius: isMe ? "4px" : "16px", borderBottomLeftRadius: isMe ? "16px" : "4px"
                   }}>
                       <span style={{whiteSpace: "pre-line"}}>{msg.text}</span>
                   </div>
               </div>
             )
           })}
           <div ref={chatEndRef} />
        </div>
        
        <div style={{display:"flex", gap:"8px", marginTop:"15px"}}>
            <input value={message} onChange={e=>setMessage(e.target.value)} onKeyDown={e=>e.key==="Enter"&&sendMessage()} 
                   placeholder="Nhập: giá, diện tích,..." 
                   style={{flex:1, padding:"12px", borderRadius:"25px", border:"1px solid #ddd", outline:"none", background: "#f8f9fa"}} />
            <button onClick={sendMessage} style={{background:"#2ecc71", color:"white", border:"none", borderRadius:"25px", padding:"0 20px", cursor:"pointer", fontWeight:"bold"}}>
              Gửi
            </button>
        </div>
      </div>
    </div>
  );
}