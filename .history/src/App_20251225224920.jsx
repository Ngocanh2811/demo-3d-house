import React, { useEffect, useState, useRef } from "react";
import io from "socket.io-client";
import { Canvas, useFrame } from "@react-three/fiber";
import { OrbitControls, useGLTF, Text, Billboard, Environment, Html, Stars } from "@react-three/drei";

const socket = io.connect("http://localhost:3001");

// --- 1. LOGIC DI CHUYỂN NHÂN VẬT (WASD) ---
function usePersonControls() {
  const [movement, setMovement] = useState({ forward: false, backward: false, left: false, right: false });
  useEffect(() => {
    const handleKeyDown = (e) => {
      switch(e.key.toLowerCase()) {
        case "w": setMovement(m => ({ ...m, forward: true })); break;
        case "s": setMovement(m => ({ ...m, backward: true })); break;
        case "a": setMovement(m => ({ ...m, left: true })); break;
        case "d": setMovement(m => ({ ...m, right: true })); break;
      }
    };
    const handleKeyUp = (e) => {
      switch(e.key.toLowerCase()) {
        case "w": setMovement(m => ({ ...m, forward: false })); break;
        case "s": setMovement(m => ({ ...m, backward: false })); break;
        case "a": setMovement(m => ({ ...m, left: false })); break;
        case "d": setMovement(m => ({ ...m, right: false })); break;
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    window.addEventListener("keyup", handleKeyUp);
    return () => { window.removeEventListener("keydown", handleKeyDown); window.removeEventListener("keyup", handleKeyUp); };
  }, []);
  return movement;
}

// Hàm xác định phòng dựa trên toạ độ (Bạn có thể chỉnh số cho khớp model nha.glb của bạn)
const getRoomName = (x, z) => {
  if (z > 4) return "Sân Vườn";
  if (x >= -1.5 && x <= 1.5 && z >= -2 && z <= 4) return "Phòng Khách";
  if (x < -1.5 && z < 2) return "Nhà Bếp";
  if (x > 1.5 && z < 2) return "Phòng Ngủ";
  return "Hành lang";
};

// --- 2. MODEL & COMPONENT PHỤ ---
function CelestialBody({ isNight }) {
  return (
    <group>
      {isNight && <Stars radius={100} depth={50} count={5000} factor={4} saturation={0} fade speed={1} />}
      <mesh position={[20, 20, -40]}><sphereGeometry args={[4, 32, 32]} /><meshBasicMaterial color={isNight ? "#f5f6fa" : "#f0932b"} /><pointLight intensity={isNight ? 0.5 : 2} distance={100} color={isNight ? "#dcdde1" : "#ffbe76"} /></mesh>
    </group>
  );
}

function SmartHouse() {
  const { scene } = useGLTF("/nha.glb");
  // Model gốc của bạn, không chỉnh màu gì cả
  return <primitive object={scene} scale={[0.8, 0.8, 0.8]} position={[0, 1.6, 0]} />;
}

// --- 3. PLAYER CONTROLLER (QUAN TRỌNG) ---
// Component xử lý logic di chuyển của chính mình và gửi lên server
function MyAvatar({ position, color, setMyRoom }) {
  const { forward, backward, left, right } = usePersonControls();
  const ref = useRef();
  const speed = 0.1;

  useFrame(() => {
    if (!ref.current) return;
    
    // Tính toán vị trí mới
    let x = ref.current.position.x;
    let z = ref.current.position.z;

    if (forward) z -= speed;
    if (backward) z += speed;
    if (left) x -= speed;
    if (right) x += speed;

    // Giới hạn không cho đi quá xa (Map boundary)
    x = Math.max(-10, Math.min(10, x));
    z = Math.max(-10, Math.min(10, z));

    // Cập nhật vị trí mesh
    ref.current.position.x = x;
    ref.current.position.z = z;

    // Check phòng & Gửi Server (Throttling nhẹ để đỡ lag)
    const room = getRoomName(x, z);
    setMyRoom(room); // Update state để hiển thị UI
    
    // Chỉ gửi socket khi đang di chuyển
    if (forward || backward || left || right) {
        socket.emit("playerMove", { position: [x, 0, z], currentRoom: room });
    }
  });

  return (
    <group ref={ref} position={position}>
       {/* Mũi tên chỉ hướng cho dễ nhìn */}
       <mesh position={[0, 0.1, 0]} rotation={[-Math.PI/2,0,0]}><ringGeometry args={[0.3, 0.4, 32]} /><meshBasicMaterial color="white" opacity={0.5} transparent /></mesh>
    </group>
  );
}

// Hiển thị người chơi khác
function OtherPlayer({ position, color, name, role, currentRoom }) {
  const isBroker = role === "broker";
  return (
    <group position={position}>
      <Billboard position={[0, 2.8, 0]}>
        <Text fontSize={0.3} color={isBroker?"#d35400":"white"} outlineWidth={0.03} outlineColor="black">{name}</Text>
        <Text position={[0, -0.35, 0]} fontSize={0.18} color="#f1c40f">({currentRoom || "..."})</Text>
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
  const [myInfo, setMyInfo] = useState({ name: "", role: "client", room: "Sân Vườn" });
  
  // State Chat & Tài Chính
  const [targetChatId, setTargetChatId] = useState(""); 
  const [showFinance, setShowFinance] = useState(false);
  const [loanAmount, setLoanAmount] = useState(500000);
  const [isSigned, setIsSigned] = useState(false);

  const chatEndRef = useRef(null);

  useEffect(() => {
    socket.on("updatePlayers", (p) => { 
        setPlayers(p); 
        if(p[socket.id]) setMyInfo(prev => ({...prev, name: p[socket.id].name, role: p[socket.id].role }));
    });
    socket.on("receiveMessage", (data) => setChatList((prev) => [...prev, data]));
    socket.on("updateEnvironment", (p) => setEnvPreset(p));
    socket.on("updateLights", (l) => setLightsOn(l));
    return () => { socket.off("updatePlayers"); socket.off("receiveMessage"); socket.off("updateEnvironment"); socket.off("updateLights"); };
  }, []);

  useEffect(() => { chatEndRef.current?.scrollIntoView({ behavior: "smooth" }); }, [chatList]);

  const sendMessage = () => { 
      if(message.trim()){ 
          socket.emit("sendMessage", { text: message, toId: targetChatId }); 
          setMessage(""); 
      }
  };

  const isNight = envPreset === "night";

  return (
    <div style={{ width: "100vw", height: "100vh", position: "relative", fontFamily: "Segoe UI", background: "#111" }}>
      
      {/* HUD TRÊN CÙNG */}
      <div style={{ position: "absolute", top: "20px", left: "20px", zIndex: 10, display: "flex", gap: "10px", alignItems:"center" }}>
        <button onClick={() => socket.emit("changeEnvironment", isNight ? "city" : "night")} style={{padding: "8px 12px", background: isNight?"#2c3e50":"#f1c40f", color: "white", borderRadius: "8px", border:"none", cursor:"pointer", fontWeight:"bold"}}>
            {isNight ? "🌙 Đêm" : "☀️ Ngày"}
        </button>
        <button onClick={() => socket.emit("toggleLights")} style={{padding: "8px 12px", background: lightsOn?"#e67e22":"#7f8c8d", color: "white", borderRadius: "8px", border:"none", cursor:"pointer", fontWeight:"bold"}}>
            💡 Đèn
        </button>
        <button onClick={() => setShowFinance(!showFinance)} style={{padding: "8px 12px", background: "#27ae60", color: "white", borderRadius: "8px", border:"none", cursor:"pointer", fontWeight:"bold"}}>
            💰 Vay & Hợp Đồng
        </button>
        {/* INFO PHÒNG HIỆN TẠI */}
        <div style={{background: "rgba(0,0,0,0.6)", color:"white", padding:"8px 15px", borderRadius:"20px", display:"flex", alignItems:"center", gap:"5px"}}>
            <span>📍 Bạn đang ở:</span>
            <span style={{color: "#f1c40f", fontWeight:"bold", textTransform:"uppercase"}}>{myInfo.room}</span>
        </div>
      </div>
      
      <div style={{position: "absolute", top: "70px", left: "20px", color: "white", fontSize: "12px", opacity: 0.8}}>
         Dùng phím <b>W A S D</b> để đi bộ khám phá nhà
      </div>

      <Canvas camera={{ position: [0, 8, 12], fov: 50 }} shadows>
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

        {/* LOGIC HIỂN THỊ NGƯỜI CHƠI */}
        {Object.keys(players).map((key) => {
            const p = players[key];
            if (key === socket.id) {
                // Render chính mình (Logic điều khiển WASD nằm ở đây)
                return <MyAvatar key={key} position={p.position} color={p.color} setMyRoom={(r)=>setMyInfo(prev=>({...prev, room:r}))} />
            }
            // Render người khác
            return <OtherPlayer key={key} position={p.position} color={p.color} name={p.name} role={p.role} currentRoom={p.currentRoom} />
        })}
      </Canvas>

      {/* MODAL TÀI CHÍNH */}
      {showFinance && (
          <div style={{position: "absolute", top: "100px", left: "20px", width: "300px", background: "white", padding: "20px", borderRadius: "10px", zIndex: 90, boxShadow: "0 5px 15px rgba(0,0,0,0.3)"}}>
              <h3 style={{color: "#27ae60", marginTop: 0}}>📜 Hợp Đồng Mua Bán</h3>
              <p>Trạng thái: {isSigned ? <b style={{color:"green"}}>ĐÃ KÝ (Verified)</b> : <b style={{color:"red"}}>Chưa ký</b>}</p>
              
              <div style={{background: "#f1f2f6", padding: "10px", borderRadius: "5px", marginBottom: "10px"}}>
                  <label>Số tiền vay ($):</label>
                  <input type="number" value={loanAmount} onChange={e=>setLoanAmount(e.target.value)} style={{width:"100%", marginBottom:"5px"}}/>
                  <small>Lãi suất: 8%/năm</small><br/>
                  <b>Trả hàng tháng: ${ ((loanAmount * 0.08/12) / (1 - Math.pow(1 + 0.08/12, -240))).toFixed(2) }</b>
              </div>

              {!isSigned && <button onClick={()=>setIsSigned(true)} style={{width:"100%", background:"#2980b9", color:"white", padding:"10px", border:"none", cursor:"pointer"}}>✍️ Ký Ngay</button>}
              <button onClick={()=>setShowFinance(false)} style={{width:"100%", background:"#ccc", marginTop:"5px", padding:"5px", border:"none", cursor:"pointer"}}>Đóng</button>
          </div>
      )}

      {/* CHAT BOX (Giữ nguyên style cũ + tính năng Chat riêng) */}
      <div style={{
        position: "absolute", bottom: "20px", left: "20px", width: "350px", height: "450px",
        background: "rgba(255,255,255,0.95)", borderRadius: "16px", padding: "20px", display: "flex", flexDirection: "column",
        boxShadow: "0 10px 40px rgba(0,0,0,0.3)"
      }}>
        <div style={{borderBottom: "1px solid #ddd", paddingBottom: "10px", marginBottom: "15px", display:"flex", justifyContent:"space-between", alignItems:"center"}}>
          <div>
              <h3 style={{margin: 0, color: "#2c3e50"}}>Tư Vấn Trực Tuyến</h3>
              <small>Xin chào: <b style={{color: myInfo.role==='broker'?"#e67e22":"#2980b9"}}>{myInfo.name}</b></small>
          </div>
          {/* MENU CHỌN NGƯỜI CHAT RIÊNG */}
          <select onChange={(e)=>setTargetChatId(e.target.value)} style={{maxWidth: "100px", fontSize:"11px"}}>
              <option value="">Chat Tổng</option>
              {Object.values(players).filter(p => p.id !== socket.id).map(p => (
                  <option key={p.id} value={p.id}>{p.name}</option>
              ))}
          </select>
        </div>

        <div style={{flex: 1, overflowY:"auto", paddingRight: "5px", display: "flex", flexDirection: "column", gap: "10px"}}>
           {chatList.map((msg, i) => {
             const isMe = msg.id === socket.id;
             const isPrivate = msg.isPrivate;
             
             return (
               <div key={i} style={{alignSelf: isMe ? "flex-end" : "flex-start", maxWidth: "85%"}}>
                   {!isMe && <div style={{fontSize: "10px", fontWeight: "bold", marginLeft:"5px", color: isPrivate ? "#e67e22" : "#7f8c8d"}}>{msg.name} {isPrivate && "(Riêng tư)"}</div>}
                   <div style={{
                       background: isMe ? (isPrivate?"#d35400":"#007bff") : (isPrivate?"#fceaa7":"#f1f2f6"),
                       color: isMe ? "white" : "black",
                       padding: "8px 12px", borderRadius: "16px", fontSize: "14px",
                       borderBottomRightRadius: isMe ? "4px" : "16px", borderBottomLeftRadius: isMe ? "16px" : "4px",
                       border: isPrivate ? "1px solid #f39c12" : "none"
                   }}>
                       {msg.text}
                   </div>
               </div>
             )
           })}
           <div ref={chatEndRef} />
        </div>
        
        <div style={{display:"flex", gap:"8px", marginTop:"15px"}}>
            <input value={message} onChange={e=>setMessage(e.target.value)} onKeyDown={e=>e.key==="Enter"&&sendMessage()} 
                   placeholder={targetChatId ? "Đang chat riêng..." : "Nhập tin nhắn..."}
                   style={{flex:1, padding:"12px", borderRadius:"25px", border:"1px solid #ddd", outline:"none", background: "#f8f9fa"}} />
            <button onClick={sendMessage} style={{background:"#2ecc71", color:"white", border:"none", borderRadius:"25px", padding:"0 20px", cursor:"pointer", fontWeight:"bold"}}>Gửi</button>
        </div>
      </div>
    </div>
  );
}