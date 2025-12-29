import React, { useEffect, useState, useRef } from "react";
import io from "socket.io-client";
import { Canvas, useThree, useFrame } from "@react-three/fiber";
import { PointerLockControls, useGLTF, Text, Billboard, Environment, Html, Stars } from "@react-three/drei";
import * as THREE from "three";

const socket = io.connect("http://localhost:3001");

// --- 1. MÔI TRƯỜNG ---
function CelestialBody({ isNight }) {
  return (
    <group>
      {isNight && <Stars radius={100} depth={50} count={5000} factor={4} fade speed={1} />}
      <mesh position={[20, 20, -40]}>
        <sphereGeometry args={[4, 32, 32]} />
        <meshBasicMaterial color={isNight ? "#f5f6fa" : "#f0932b"} />
        <pointLight intensity={isNight ? 0.5 : 2} distance={100} color={isNight ? "#dcdde1" : "#ffbe76"} />
      </mesh>
    </group>
  );
}

// --- 2. ĐÈN ---
function GardenLamp({ position, isOn }) {
  return (
    <group position={position}>
      <mesh position={[0, 1, 0]}>
        <cylinderGeometry args={[0.05, 0.1, 2]} />
        <meshStandardMaterial color="#2c3e50" />
      </mesh>
      <mesh position={[0, 2, 0]}>
        <sphereGeometry args={[0.25, 16, 16]} />
        <meshStandardMaterial color={isOn ? "#f1c40f" : "#7f8c8d"} emissive={isOn ? "#f1c40f" : "black"} emissiveIntensity={isOn ? 3 : 0} />
      </mesh>
      {isOn && <pointLight position={[0, 2.2, 0]} distance={10} intensity={3} color="#f1c40f" />}
    </group>
  );
}

// --- 3. BIỂN BÁO (KÍCH HOẠT HỢP ĐỒNG THÔNG MINH) ---
function StatusSign({ position, role, status }) {
  const handleClick = (e) => {
    e.stopPropagation(); // Ngừng sự kiện mặc định để không bị lan truyền

    // Kiểm tra quyền của người nhấn
    if (role !== "broker") {
      alert("⚠️ CHỈ MÔI GIỚI (SALES) MỚI ĐƯỢC CHỐT ĐƠN!");
      return;
    }

    // Chuyển đổi trạng thái nhà
    const newStatus = status === "FOR SALE" ? "SOLD" : "FOR SALE";
    socket.emit("changeStatus", newStatus); // Gửi trạng thái mới đến server
  };

  return (
    <group position={position} onClick={handleClick}
      onPointerOver={() => document.body.style.cursor = role === 'broker' ? 'pointer' : 'not-allowed'}
      onPointerOut={() => document.body.style.cursor = 'auto'}>
      <mesh position={[0, 1, 0]}>
        <cylinderGeometry args={[0.05, 0.05, 2]} />
        <meshStandardMaterial color="#333" />
      </mesh>
      <mesh position={[0, 2, 0]}>
        <boxGeometry args={[1.5, 0.8, 0.1]} />
        <meshStandardMaterial color={status === "SOLD" ? "#c0392b" : "#27ae60"} />
      </mesh>
      <Text position={[0, 2, 0.06]} fontSize={0.35} color="white" fontWeight="bold">{status}</Text>
    </group>
  );
}

// --- 4. CÔNG CỤ TÍNH LÃI SUẤT (FINTECH) ---
function LoanCalculator() {
  const [downPayment, setDownPayment] = useState(30); // Trả trước %
  const [years, setYears] = useState(20); // Số năm vay
  const price = 500000;
  const interestRate = 0.08; // 8% năm

  const loanAmount = price * (1 - downPayment / 100);
  const monthlyRate = interestRate / 12;
  const numPayments = years * 12;
  // Công thức EMI
const monthlyPayment = (loanAmount * monthlyRate * Math.pow(1 + monthlyRate, numPayments)) / (Math.pow(1 + monthlyRate, numPayments) - 1);

  return (
    <div style={{ marginTop: "10px", paddingTop: "10px", borderTop: "1px dashed #ccc" }}>
      <h4 style={{ margin: "5px 0", color: "#2980b9" }}>🏦 Tính Toán Vay Mua Nhà</h4>
      <div style={{ fontSize: "12px", marginBottom: "5px" }}>
        <label>Trả trước: {downPayment}% (${(price * downPayment / 100).toLocaleString()})</label>
        <input type="range" min="10" max="90" value={downPayment} onChange={e => setDownPayment(e.target.value)} style={{ width: "100%" }} />
      </div>
      <div style={{ fontSize: "12px", marginBottom: "5px" }}>
        <label>Thời hạn vay: {years} năm</label>
        <input type="range" min="5" max="30" value={years} onChange={e => setYears(e.target.value)} style={{ width: "100%" }} />
      </div>
      <div style={{ background: "#ecf0f1", padding: "8px", borderRadius: "5px", textAlign: "center" }}>
        <small>Gốc + Lãi hàng tháng:</small>
        <div style={{ color: "#c0392b", fontWeight: "bold", fontSize: "16px" }}>${monthlyPayment.toFixed(2)}</div>
      </div>
    </div>
  );
}

// --- 5. NGÔI NHÀ + POPUP ---
function SmartHouse() {
  const { scene } = useGLTF("/nha.glb");
  const [showInfo, setShowInfo] = useState(false);

  const handleInfoClick = (e) => {
    // Ngừng sự kiện mặc định khi nhấn vào nút Info
    e.stopPropagation();
    setShowInfo(prev => !prev); // Toggle hiển thị thông tin
  };

  return (
    <group position={[0, 1.6, 0]}>
      <primitive object={scene} scale={[0.8, 0.8, 0.8]} />
      {/* Nút Info */}
      <mesh position={[2, 3, 2]} onClick={handleInfoClick}
            onPointerOver={() => document.body.style.cursor = 'pointer'}
            onPointerOut={() => document.body.style.cursor = 'auto'}>
        <sphereGeometry args={[0.3, 16, 16]} />
        <meshBasicMaterial color="#ff4757" transparent opacity={0.9} />
        <Billboard position={[0, 0.6, 0]}>
          <Text fontSize={0.3} color="white" outlineWidth={0.05} outlineColor="#ff4757">Info</Text>
        </Billboard>
      </mesh>

      {/* Popup Thông tin & Vay nợ */}
      {showInfo && (
        <Html position={[2, 4, 2]} center>
          <div style={{ background: "rgba(255, 255, 255, 0.98)", padding: "15px", borderRadius: "10px", width: "280px", textAlign: "left", boxShadow: "0 10px 30px rgba(0,0,0,0.3)", fontFamily: "Segoe UI" }}>
            <div style={{display:"flex", justifyContent:"space-between"}}>
                <h3 style={{ margin: 0, color: "#2c3e50" }}>🏡 Biệt Thự Phố</h3>
                <button onClick={() => setShowInfo(false)} style={{border:"none", background:"transparent", cursor:"pointer", fontWeight:"bold"}}>✕</button>
            </div>
            <p style={{ margin: "5px 0", fontSize: "13px" }}>Diện tích: <b>200m²</b></p>
            <p style={{ margin: "5px 0", fontSize: "13px" }}>Giá niêm yết: <b style={{ color: "#e74c3c" }}>$500,000</b></p>
            
            {/* Component Tính Vay */}
            <LoanCalculator />
          </div>
        </Html>
      )}
    </group>
  );
}

// --- 6. AVATAR ---
function Human({ position, color, name, role }) {
  const isBroker = role === "broker";
  return (
    <group position={position}>
      <Billboard position={[0, 2.6, 0]}>
        <Text fontSize={0.3} color={isBroker ? "#f1c40f" : "white"} outlineWidth={0.03} outlineColor="black">
          {isBroker ? "⭐ " + name : name}
        </Text>
      </Billboard>
      <mesh position={[0, 1.6, 0]}><boxGeometry args={[0.5, 0.5, 0.5]} /><meshStandardMaterial color={isBroker ? "#f39c12" : color} /></mesh>
      <mesh position={[0, 0.75, 0]}><boxGeometry args={[0.6, 1, 0.3]} /><meshStandardMaterial color={isBroker ? "#f39c12" : color} /></mesh>
    </group>
  );
}

// --- 7. ĐIỀU KHIỂN WASD ---
function FirstPersonController({ socket }) {
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
    const speed = 10.0;
    direction.current.z = Number(moveForward.current) - Number(moveBackward.current);
    direction.current.x = Number(moveRight.current) - Number(moveLeft.current);
    direction.current.normalize();

    if (moveForward.current || moveBackward.current) velocity.current.z = direction.current.z * speed * delta; else velocity.current.z = 0;
    if (moveLeft.current || moveRight.current) velocity.current.x = direction.current.x * speed * delta; else velocity.current.x = 0;

    camera.translateX(velocity.current.x);
    camera.translateZ(-velocity.current.z);
    camera.position.y = 1.6;

    if (velocity.current.x !== 0 || velocity.current.z !== 0) {
      socket.emit("move", [camera.position.x, 0, camera.position.z]);
    }
  });
  return <PointerLockControls />;
}

// --- APP MAIN ---
export default function App() {
  const [players, setPlayers] = useState({});
  const [envPreset, setEnvPreset] = useState("city");
  const [lightsOn, setLightsOn] = useState(false);
  const [chatList, setChatList] = useState([]);
  const [message, setMessage] = useState("");
  const [myInfo, setMyInfo] = useState({ name: "", role: "client" });
  const [houseStatus, setHouseStatus] = useState("FOR SALE");
  const [isPrivate, setIsPrivate] = useState(false); // Checkbox nhắn riêng
  const [recipient, setRecipient] = useState(""); // Recipient khi gửi tin nhắn riêng

  const chatEndRef = useRef(null);

  useEffect(() => {
    socket.on("updatePlayers", (p) => { setPlayers(p); if (p[socket.id]) setMyInfo({ name: p[socket.id].name, role: p[socket.id].role }); });
    socket.on("receiveMessage", (data) => setChatList((prev) => [...prev, data]));
    socket.on("updateEnvironment", (p) => setEnvPreset(p));
    socket.on("updateLights", (s) => setLightsOn(s));
    
    // Sự kiện Blockchain
    socket.on("updateHouseStatus", (s) => {
      setHouseStatus(s);
      if (s === "SOLD") {
        const hash = "0x" + Math.random().toString(16).substr(2, 20).toUpperCase();
        alert(`🎉 SMART CONTRACT ACTIVATED! \n\nGiao dịch đã được ghi nhận vào Blockchain.\nMã Hash: ${hash}\n\nChúc mừng chủ nhân mới!`);
      }
    });

    return () => { socket.off("updatePlayers"); socket.off("receiveMessage"); socket.off("updateEnvironment"); socket.off("updateLights"); socket.off("updateHouseStatus"); };
  }, []);

  useEffect(() => { chatEndRef.current?.scrollIntoView({ behavior: "smooth" }); }, [chatList]);
  
  const sendMessage = () => { if (message.trim()) { socket.emit("sendMessage", { text: message, isPrivate: isPrivate, recipient: recipient }); setMessage(""); } };
  const isNight = envPreset === "night";

  return (
    <div style={{ width: "100vw", height: "100vh", position: "relative", fontFamily: "Segoe UI", background: "#111" }}>
      
      {/* HUD Điều khiển */}
      <div style={{ position: "absolute", top: "20px", left: "20px", zIndex: 10, display: "flex", gap: "10px" }}>
        <button onClick={() => socket.emit("changeEnvironment", isNight ? "city" : "night")} style={{ padding: "10px", borderRadius: "5px", cursor: "pointer" }}>{isNight ? "🌙 Mode: Đêm" : "☀️ Mode: Ngày"}</button>
        <button onClick={() => socket.emit("toggleLights")} style={{ padding: "10px", borderRadius: "5px", cursor: "pointer" }}>💡 Đèn</button>
      </div>

      <div style={{ position: "absolute", bottom: "30px", left: "50%", transform: "translateX(-50%)", color: "white", zIndex: 5, pointerEvents: "none", textShadow: "1px 1px 2px black", textAlign:"center" }}>
        <div style={{width:"8px", height:"8px", background:"white", borderRadius:"50%", margin:"0 auto 5px auto"}}></div>
        <small>CLICK ĐỂ DI CHUYỂN | WASD ĐỂ ĐI | ESC HIỆN CHUỘT</small>
      </div>

      <Canvas camera={{ position: [0, 1.6, 10], fov: 60 }} shadows>
        <Environment preset={envPreset} background blur={0.6} />
        <CelestialBody isNight={isNight} />
        <ambientLight intensity={isNight ? 0.2 : 0.6} />
        <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.01, 0]}>
          <planeGeometry args={[100, 100]} /><meshStandardMaterial color={isNight ? "#2c3e50" : "#95a5a6"} />
        </mesh>

        <FirstPersonController socket={socket} />
        <SmartHouse />
        <StatusSign position={[-3, 0, 7]} role={myInfo.role} status={houseStatus} />
        <GardenLamp position={[16, 0, 8]} isOn={lightsOn} /><GardenLamp position={[-5, 0, 8]} isOn={lightsOn} />

        {/* Render người chơi khác (trừ chính mình) */}
        {Object.keys(players).map((key) => {
            if (key === socket.id) return null;
            return <Human key={key} position={players[key].position} color={players[key].color} name={players[key].name} role={players[key].role} />
        })}
      </Canvas>

      {/* CHAT BOX */}
      <div style={{ position: "absolute", bottom: "20px", left: "20px", width: "320px", height: "420px", background: "rgba(255,255,255,0.95)", borderRadius: "10px", padding: "15px", display: "flex", flexDirection: "column" }} onKeyDown={(e) => e.stopPropagation()}>
        <div style={{borderBottom:"1px solid #ddd", paddingBottom:"5px", marginBottom:"5px"}}>
            <b>{myInfo.name}</b> <span style={{fontSize:"11px", color:"#7f8c8d"}}>({myInfo.role})</span>
        </div>
        
        <div style={{ flex: 1, overflowY: "auto", fontSize: "13px" }}>
          {chatList.map((msg, i) => {
             const isMe = msg.id === socket.id;
             const isSystem = msg.role === 'system';
             
             if(isSystem) return <div key={i} style={{textAlign:"center", margin:"10px 0"}}><span style={{background:"#27ae60", color:"white", padding:"3px 8px", borderRadius:"10px", fontSize:"11px"}}>{msg.text}</span></div>

             return (
               <div key={i} style={{ marginBottom: "5px", textAlign: isMe ? "right" : "left" }}>
                 <div style={{ 
                     background: msg.isPrivate ? "#f1c40f" : (isMe ? "#3498db" : (msg.role==='bot'?"#9b59b6":"#ecf0f1")), 
                     color: isMe ? "white" : (msg.isPrivate?"#333":"black"), 
                     padding: "6px 12px", borderRadius: "15px", display: "inline-block", maxWidth: "90%",
                     border: msg.isPrivate ? "2px solid #d35400" : "none"
                 }}>
                   {msg.isPrivate && <b>🔒 [MẬT] </b>}
                   {!isMe && <b>{msg.name}: </b>}{msg.text}
                 </div>
               </div>
             )
          })}
          <div ref={chatEndRef} />
        </div>

        <div style={{ marginTop: "5px" }}>
          {/* Checkbox Chat Riêng */}
          {myInfo.role !== 'broker' && (
            <label style={{display:"block", fontSize:"12px", marginBottom:"5px", cursor:"pointer", color:"#d35400", fontWeight:"bold"}}>
                  <input type="checkbox" checked={isPrivate} onChange={e=>setIsPrivate(e.target.checked)} style={{marginRight:"5px"}}/>
                  🤫 Nhắn riêng cho Sales
              </label>
          )}

          <div style={{ display: "flex", gap: "5px" }}>
            <input value={message} onChange={e => setMessage(e.target.value)} onKeyDown={e => e.key === "Enter" && sendMessage()} 
                   placeholder={isPrivate ? "Đang nhắn mật..." : "Nhập tin nhắn..."} 
                   style={{ flex: 1, padding: "8px", border:"1px solid #ddd", borderRadius:"4px" }} />
            <button onClick={sendMessage} style={{ padding: "8px 15px", background:"#2980b9", color:"white", border:"none", borderRadius:"4px", cursor:"pointer" }}>Gửi</button>
          </div>
        </div>
      </div>
    </div>
  );
}
