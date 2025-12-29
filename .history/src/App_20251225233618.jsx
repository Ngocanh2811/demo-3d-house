import React, { useEffect, useState, useRef } from "react";
import io from "socket.io-client";
import { Canvas, useThree, useFrame } from "@react-three/fiber";
import { PointerLockControls, useGLTF, Text, Billboard, Environment, Html, Stars } from "@react-three/drei";
import * as THREE from "three";

// Kết nối server
const socket = io.connect("http://localhost:3001");

// --- COMPONENT: NGƯỜI CHƠI KHÁC (Di chuyển mượt) ---
function InterpolatedHuman({ position, rotation, color, name, role }) {
  const groupRef = useRef();
  
  useFrame(() => {
    if (groupRef.current) {
      // Dùng lerp để làm mượt chuyển động (tránh giật lag)
      groupRef.current.position.lerp(new THREE.Vector3(...position), 0.1);
      // Xoay nhân vật nhẹ nhàng
      // groupRef.current.rotation.y = THREE.MathUtils.lerp(groupRef.current.rotation.y, rotation, 0.1);
    }
  });

  const isBroker = role === "broker";

  return (
    <group ref={groupRef}>
      <Billboard position={[0, 2.8, 0]}>
        <Text fontSize={0.25} color={isBroker ? "#f1c40f" : "white"} outlineWidth={0.02} outlineColor="black" fontWeight="bold">
          {isBroker ? "⭐ " + name : name}
        </Text>
      </Billboard>
      {/* Body */}
      <mesh position={[0, 1.5, 0]}>
        <capsuleGeometry args={[0.3, 1, 4, 8]} />
        <meshStandardMaterial color={isBroker ? "#f39c12" : color} roughness={0.3} />
      </mesh>
      {/* Head */}
      <mesh position={[0, 2.2, 0]}>
        <sphereGeometry args={[0.25, 16, 16]} />
        <meshStandardMaterial color="#ecf0f1" />
      </mesh>
    </group>
  );
}

// --- LOGIC DI CHUYỂN CỦA BẢN THÂN ---
function PlayerController({ socket }) {
  const { camera } = useThree();
  const moveForward = useRef(false);
  const moveBackward = useRef(false);
  const moveLeft = useRef(false);
  const moveRight = useRef(false);
  const velocity = useRef(new THREE.Vector3());
  const direction = useRef(new THREE.Vector3());

  useEffect(() => {
    const onKeyDown = (e) => { switch (e.code) { case "KeyW": moveForward.current = true; break; case "KeyA": moveLeft.current = true; break; case "KeyS": moveBackward.current = true; break; case "KeyD": moveRight.current = true; break; } };
    const onKeyUp = (e) => { switch (e.code) { case "KeyW": moveForward.current = false; break; case "KeyA": moveLeft.current = false; break; case "KeyS": moveBackward.current = false; break; case "KeyD": moveRight.current = false; break; } };
    document.addEventListener("keydown", onKeyDown); document.addEventListener("keyup", onKeyUp);
    return () => { document.removeEventListener("keydown", onKeyDown); document.removeEventListener("keyup", onKeyUp); };
  }, []);

  useFrame((state, delta) => {
    const speed = 8.0;
    
    // Xử lý logic vật lý đơn giản
    direction.current.z = Number(moveForward.current) - Number(moveBackward.current);
    direction.current.x = Number(moveRight.current) - Number(moveLeft.current);
    direction.current.normalize();

    if (moveForward.current || moveBackward.current) velocity.current.z = direction.current.z * speed * delta; else velocity.current.z = 0;
    if (moveLeft.current || moveRight.current) velocity.current.x = direction.current.x * speed * delta; else velocity.current.x = 0;

    camera.translateX(velocity.current.x);
    camera.translateZ(-velocity.current.z);
    
    // QUAN TRỌNG: Giữ độ cao camera phù hợp (mắt người)
    // Nếu bạn muốn đi lên cầu thang, cần logic va chạm (physics), ở đây tôi giữ cơ bản là lock Y ở mức mắt hoặc cho phép bay nhẹ nếu cần
    // Để fix lỗi "Admin thấy ở ngoài", ta phải gửi đúng vị trí hiện tại
    camera.position.y = 1.7; // Cố định chiều cao tầm mắt

    // Gửi vị trí liên tục nếu có di chuyển
    if (velocity.current.x !== 0 || velocity.current.z !== 0) {
      socket.emit("move", {
          pos: [camera.position.x, camera.position.y - 1.7, camera.position.z], // Trừ 1.7 để lấy vị trí chân
          rot: camera.rotation.y
      });
    }
  });
  
  return <PointerLockControls />;
}

// --- BIỂN BÁO SALES ---
function StatusSign({ position, role, status }) {
  const [hovered, setHover] = useState(false);
  
  const handleClick = (e) => {
    e.stopPropagation(); // Ngăn click xuyên qua
    if (role !== "broker") {
      alert("⚠️ CHỈ ADMIN MỚI ĐƯỢC ĐỔI TRẠNG THÁI!");
      return;
    }
    const newStatus = status === "FOR SALE" ? "SOLD" : "FOR SALE";
    socket.emit("changeStatus", newStatus);
  };

  return (
    <group position={position} onClick={handleClick}
           onPointerOver={() => setHover(true)} onPointerOut={() => setHover(false)}>
      <mesh position={[0, 1.5, 0]}>
        <boxGeometry args={[1.8, 0.8, 0.1]} />
        <meshStandardMaterial color={status === "SOLD" ? "#c0392b" : (hovered ? "#2ecc71" : "#27ae60")} />
      </mesh>
      <mesh position={[0, 0.75, 0]}><cylinderGeometry args={[0.05, 0.05, 1.5]} /><meshStandardMaterial color="#333" /></mesh>
      <Text position={[0, 1.5, 0.06]} fontSize={0.35} color="white" fontWeight="bold">
        {status}
      </Text>
      {hovered && role === 'broker' && <Text position={[0, 2.1, 0]} fontSize={0.15} color="yellow">Click để đổi trạng thái</Text>}
    </group>
  );
}

// --- NGÔI NHÀ + INFO ---
function SmartHouse() {
  const { scene } = useGLTF("/nha.glb"); // Đảm bảo file nha.glb có trong folder public
  const [showInfo, setShowInfo] = useState(false);
  const [hovered, setHover] = useState(false);

  return (
    <group>
      <primitive object={scene} scale={[0.8, 0.8, 0.8]} position={[0, 0, 0]} />
      
      {/* Nút Info cầu tròn */}
      <mesh position={[2, 2.5, 3]} onClick={(e) => { e.stopPropagation(); setShowInfo(!showInfo); }}
            onPointerOver={() => setHover(true)} onPointerOut={() => setHover(false)}>
        <sphereGeometry args={[0.3, 32, 32]} />
        <meshStandardMaterial color={hovered ? "#ff6b81" : "#ff4757"} emissive="#ff4757" emissiveIntensity={0.5} />
        <Billboard position={[0, 0.5, 0]}><Text fontSize={0.25} color="white" outlineWidth={0.02}>Info</Text></Billboard>
      </mesh>

      {/* Popup HTML - Sử dụng pointerEvents để cho phép click */}
      {showInfo && (
        <Html position={[2, 3.5, 3]} center zIndexRange={[100, 0]}>
            <div className="glass-panel" style={{ width: "300px", padding: "20px", borderRadius: "12px", background: "rgba(255, 255, 255, 0.9)", backdropFilter: "blur(10px)", boxShadow: "0 8px 32px rgba(0,0,0,0.3)" }}>
                <div style={{display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:"10px"}}>
                    <h3 style={{margin:0, color:"#2c3e50"}}>🏡 Villa Cao Cấp</h3>
                    <button onClick={() => setShowInfo(false)} style={{border:"none", background:"transparent", fontSize:"18px", cursor:"pointer"}}>✕</button>
                </div>
                <img src="https://images.unsplash.com/photo-1580587771525-78b9dba3b91d?auto=format&fit=crop&w=300&q=80" style={{width:"100%", borderRadius:"8px", marginBottom:"10px"}} />
                <p><b>Diện tích:</b> 200m²</p>
                <p><b>Giá:</b> <span style={{color:"#e74c3c", fontWeight:"bold"}}>$500,000</span></p>
                <button style={{width:"100%", padding:"8px", background:"#3498db", color:"white", border:"none", borderRadius:"5px", cursor:"pointer", marginTop:"10px"}}>📞 Liên hệ vay vốn</button>
            </div>
        </Html>
      )}
    </group>
  );
}

// --- MAIN APP ---
export default function App() {
  const [players, setPlayers] = useState({});
  const [envPreset, setEnvPreset] = useState("city");
  const [lightsOn, setLightsOn] = useState(false);
  const [chatList, setChatList] = useState([]);
  const [message, setMessage] = useState("");
  const [myInfo, setMyInfo] = useState({ name: "", role: "client" });
  const [houseStatus, setHouseStatus] = useState("FOR SALE");
  const [isPrivate, setIsPrivate] = useState(false);
  const chatEndRef = useRef(null);

  useEffect(() => {
    socket.on("updatePlayers", (p) => { setPlayers(p); if (p[socket.id]) setMyInfo({ name: p[socket.id].name, role: p[socket.id].role }); });
    socket.on("receiveMessage", (data) => setChatList((prev) => [...prev, data]));
    socket.on("updateEnvironment", (p) => setEnvPreset(p));
    socket.on("updateLights", (s) => setLightsOn(s));
    socket.on("updateHouseStatus", (s) => setHouseStatus(s));
    return () => { socket.off("updatePlayers"); socket.off("receiveMessage"); socket.off("updateEnvironment"); socket.off("updateLights"); socket.off("updateHouseStatus"); };
  }, []);

  useEffect(() => { chatEndRef.current?.scrollIntoView({ behavior: "smooth" }); }, [chatList]);
  const sendMessage = () => { if (message.trim()) { socket.emit("sendMessage", { text: message, isPrivate: isPrivate }); setMessage(""); } };
  
  const isNight = envPreset === "night";

  return (
    <div style={{ width: "100vw", height: "100vh", background: "#111", fontFamily: "'Segoe UI', sans-serif" }}>
      
      {/* 1. CROSSHAIR (TÂM NGẮM) */}
      <div style={{position:"absolute", top:"50%", left:"50%", width:"10px", height:"10px", background:"white", borderRadius:"50%", transform:"translate(-50%, -50%)", border:"2px solid rgba(0,0,0,0.5)", zIndex: 99, pointerEvents:"none"}}></div>
      
      {/* 2. HUD CONTROL */}
      <div style={{ position: "absolute", top: "20px", left: "20px", zIndex: 10, display: "flex", gap: "10px" }}>
        <button className="btn-glass" onClick={() => socket.emit("changeEnvironment", isNight ? "city" : "night")}>
            {isNight ? "🌙 Chế độ: Đêm" : "☀️ Chế độ: Ngày"}
        </button>
        <button className="btn-glass" onClick={() => socket.emit("toggleLights")}>💡 Đèn Sân Vườn</button>
      </div>

      <div style={{ position: "absolute", bottom: "30px", width: "100%", textAlign: "center", pointerEvents: "none", color: "white", textShadow: "0 2px 4px black", zIndex:5 }}>
        <p style={{fontSize:"14px", opacity:0.8}}>NHẤN <b>ESC</b> ĐỂ HIỆN CHUỘT VÀ CLICK TƯƠNG TÁC | <b>WASD</b> ĐỂ DI CHUYỂN</p>
      </div>

      <Canvas camera={{ position: [0, 1.7, 10], fov: 60 }} shadows>
        <Environment preset={envPreset} background blur={0.5} />
        {isNight && <Stars radius={100} depth={50} count={5000} factor={4} fade speed={1} />}
        <ambientLight intensity={isNight ? 0.3 : 0.7} />
        <pointLight position={[10, 10, 10]} intensity={1} castShadow />

        {/* NỀN ĐẤT */}
        <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.1, 0]} receiveShadow>
          <planeGeometry args={[100, 100]} />
          <meshStandardMaterial color={isNight ? "#2c3e50" : "#7f8c8d"} />
        </mesh>

        <PlayerController socket={socket} />
        <SmartHouse />
        
        {/* Biển Báo */}
        <StatusSign position={[-3, 0, 7]} role={myInfo.role} status={houseStatus} />
        
        {/* Đèn */}
        {[[-5, 8], [5, 8], [0, 10]].map((pos, i) => (
             <group key={i} position={[pos[0], 0, pos[1]]}>
                <mesh position={[0, 1, 0]}><cylinderGeometry args={[0.05, 0.05, 2]} /><meshStandardMaterial color="#222"/></mesh>
                <mesh position={[0, 2, 0]}><sphereGeometry args={[0.2]} /><meshStandardMaterial color={lightsOn ? "#f1c40f" : "#555"} emissive={lightsOn ? "#f1c40f" : "black"} emissiveIntensity={2}/></mesh>
                {lightsOn && <pointLight position={[0, 2, 0]} distance={15} intensity={5} color="#f1c40f" />}
             </group>
        ))}

        {/* Render Players Khác */}
        {Object.keys(players).map((key) => {
            if (key === socket.id) return null;
            return <InterpolatedHuman key={key} {...players[key]} />
        })}
      </Canvas>

      {/* 3. CHAT BOX - UI MỚI */}
      <div className="glass-panel" style={{ 
            position: "absolute", bottom: "20px", left: "20px", 
            width: "350px", height: "450px", 
            display: "flex", flexDirection: "column", padding: "15px", zIndex: 100 
      }} onKeyDown={(e) => e.stopPropagation()}> {/* StopPropagation để gõ không bị di chuyển */}
        
        <div style={{borderBottom:"1px solid rgba(0,0,0,0.1)", paddingBottom:"10px", marginBottom:"10px", display:"flex", justifyContent:"space-between", alignItems:"center"}}>
            <div>
                <b style={{color:"#2c3e50"}}>{myInfo.name}</b>
                <span style={{fontSize:"11px", display:"block", color:"#7f8c8d"}}>{myInfo.role === 'broker' ? 'QUẢN TRỊ VIÊN' : 'KHÁCH HÀNG'}</span>
            </div>
            <div style={{width:"10px", height:"10px", background:"#27ae60", borderRadius:"50%"}}></div>
        </div>
        
        <div style={{ flex: 1, overflowY: "auto", paddingRight:"5px", display:"flex", flexDirection:"column", gap:"8px" }}>
          {chatList.map((msg, i) => {
             const isMe = msg.id === socket.id;
             const isBot = msg.role === 'bot';
             const isSystem = msg.role === 'system';
             
             if(isSystem) return <div key={i} style={{textAlign:"center", fontSize:"11px", color:"#e74c3c", fontWeight:"bold"}}>---- {msg.text} ----</div>

             return (
               <div key={i} style={{ alignSelf: isMe ? "flex-end" : "flex-start", maxWidth:"85%" }}>
                 {!isMe && <div style={{fontSize:"10px", color:"#7f8c8d", marginBottom:"2px", marginLeft:"5px"}}>{msg.name}</div>}
                 <div style={{ 
                     background: msg.isPrivate ? "linear-gradient(135deg, #f1c40f 0%, #f39c12 100%)" : 
                                 (isMe ? "linear-gradient(135deg, #3498db 0%, #2980b9 100%)" : 
                                 (isBot ? "linear-gradient(135deg, #8e44ad 0%, #9b59b6 100%)" : "#ecf0f1")), 
                     color: (isMe || isBot || msg.isPrivate) ? "white" : "#2c3e50", 
                     padding: "8px 12px", borderRadius: "12px", 
                     borderBottomRightRadius: isMe ? "2px" : "12px",
                     borderBottomLeftRadius: isMe ? "12px" : "2px",
                     boxShadow: "0 2px 5px rgba(0,0,0,0.05)", fontSize:"13px", lineHeight:"1.4"
                 }}>
                   {msg.isPrivate && <b>🔒 [RIÊNG TƯ] </b>}
                   {isBot && <span>🤖 </span>}
                   {msg.text}
                 </div>
               </div>
             )
          })}
          <div ref={chatEndRef} />
        </div>

        <div style={{ marginTop: "10px" }}>
          {myInfo.role !== 'broker' && (
              <label style={{display:"flex", alignItems:"center", fontSize:"12px", marginBottom:"8px", cursor:"pointer", color:"#d35400", fontWeight:"bold"}}>
                  <input type="checkbox" checked={isPrivate} onChange={e=>setIsPrivate(e.target.checked)} style={{marginRight:"5px"}}/>
                  🤫 Chat riêng với Sales Admin
              </label>
          )}

          <div style={{ display: "flex", gap: "8px" }}>
            <input value={message} onChange={e => setMessage(e.target.value)} onKeyDown={e => e.key === "Enter" && sendMessage()} 
                   placeholder={isPrivate ? "Nhập tin nhắn mật..." : "Nhập tin nhắn..."} 
                   style={{ flex: 1, padding: "10px", border:"1px solid #ddd", borderRadius:"8px", outline:"none" }} />
            <button onClick={sendMessage} style={{ padding: "0 15px", background:"#2c3e50", color:"white", border:"none", borderRadius:"8px", cursor:"pointer", fontWeight:"bold" }}>➤</button>
          </div>
        </div>
      </div>
      
      {/* GLOBAL CSS STYLE */}
      <style>{`
        .glass-panel {
            background: rgba(255, 255, 255, 0.85);
            backdrop-filter: blur(12px);
            border: 1px solid rgba(255, 255, 255, 0.3);
            border-radius: 16px;
            box-shadow: 0 8px 32px 0 rgba(31, 38, 135, 0.37);
        }
        .btn-glass {
            background: rgba(255, 255, 255, 0.2);
            backdrop-filter: blur(5px);
            border: 1px solid rgba(255, 255, 255, 0.3);
            color: white;
            padding: 8px 16px;
            border-radius: 8px;
            cursor: pointer;
            transition: all 0.2s;
            font-weight: bold;
            text-shadow: 0 1px 2px black;
        }
        .btn-glass:hover { background: rgba(255, 255, 255, 0.4); }
      `}</style>
    </div>
  );
}