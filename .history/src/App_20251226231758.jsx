import React, { useEffect, useState, useRef } from "react";
import io from "socket.io-client";
import { Canvas, useThree, useFrame } from "@react-three/fiber";
import { PointerLockControls, useGLTF, Text, Billboard, Environment, Html, Stars } from "@react-three/drei";
import * as THREE from "three";

const socket = io.connect("http://localhost:3001");

// --- MÔI TRƯỜNG & ĐÈN ---
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

function GardenLamp({ position, isOn }) {
  return (
    <group position={position}>
      <mesh position={[0, 1, 0]}><cylinderGeometry args={[0.05, 0.1, 2]} /><meshStandardMaterial color="#2c3e50" /></mesh>
      <mesh position={[0, 2, 0]}>
        <sphereGeometry args={[0.25, 16, 16]} />
        <meshStandardMaterial color={isOn ? "#f1c40f" : "#7f8c8d"} emissive={isOn ? "#f1c40f" : "black"} emissiveIntensity={isOn ? 3 : 0} />
      </mesh>
      {isOn && <pointLight position={[0, 2.2, 0]} distance={10} intensity={3} color="#f1c40f" />}
    </group>
  );
}

// --- BIỂN BÁO (SMART CONTRACT) ---
function StatusSign({ position, role, status }) {
  const handleClick = (e) => {
    e.stopPropagation(); 
    if (role !== "broker") {
      alert("⛔ KHÔNG CÓ QUYỀN: Chỉ 'SALES ADMIN' mới được đổi trạng thái bán!");
      return;
    }
    const newStatus = status === "FOR SALE" ? "SOLD" : "FOR SALE";
    socket.emit("changeStatus", newStatus); 
  };

  return (
    <group position={position} onClick={handleClick}>
      <mesh position={[0, 1, 0]}><cylinderGeometry args={[0.05, 0.05, 2]} /><meshStandardMaterial color="#333" /></mesh>
      <mesh position={[0, 2, 0]}><boxGeometry args={[1.5, 0.8, 0.1]} /><meshStandardMaterial color={status === "SOLD" ? "#c0392b" : "#27ae60"} /></mesh>
      <Text position={[0, 2, 0.06]} fontSize={0.35} color="white" fontWeight="bold">{status}</Text>
    </group>
  );
}

// --- TÍNH VAY ---
function LoanCalculator() {
  const [downPayment, setDownPayment] = useState(30); 
  const [years, setYears] = useState(20); 
  const price = 500000;
  const interestRate = 0.08; 
  const loanAmount = price * (1 - downPayment / 100);
  const monthlyRate = interestRate / 12;
  const numPayments = years * 12;
  const monthlyPayment = (loanAmount * monthlyRate * Math.pow(1 + monthlyRate, numPayments)) / (Math.pow(1 + monthlyRate, numPayments) - 1);

  return (
    <div style={{ marginTop: "10px", paddingTop: "10px", borderTop: "1px dashed #ccc" }} onMouseDown={(e) => e.stopPropagation()}>
      <h4 style={{ margin: "5px 0", color: "#2980b9" }}>🏦 Ước Tính Trả Góp</h4>
      <div style={{ fontSize: "12px", marginBottom: "5px" }}>
        <label>Trả trước: {downPayment}% (${(price * downPayment / 100).toLocaleString()})</label>
        <input type="range" min="10" max="90" value={downPayment} onChange={e => setDownPayment(e.target.value)} style={{ width: "100%" }} />
      </div>
      <div style={{ fontSize: "12px", marginBottom: "5px" }}>
        <label>Thời hạn: {years} năm</label>
        <input type="range" min="5" max="30" value={years} onChange={e => setYears(e.target.value)} style={{ width: "100%" }} />
      </div>
      <div style={{ background: "#ecf0f1", padding: "8px", borderRadius: "5px", textAlign: "center" }}>
        <small>Trả hàng tháng:</small>
        <div style={{ color: "#c0392b", fontWeight: "bold", fontSize: "16px" }}>${monthlyPayment.toFixed(2)}</div>
      </div>
    </div>
  );
}

// --- NGÔI NHÀ + INFO CHI TIẾT ---
function SmartHouse({ setIsLocked }) {
  const { scene } = useGLTF("/nha.glb");
  const [showInfo, setShowInfo] = useState(false);

  const handleInfoClick = (e) => {
    e.stopPropagation(); 
    const nextState = !showInfo;
    setShowInfo(nextState);
    if (nextState) { document.exitPointerLock(); setIsLocked(false); }
  };

  return (
    <group position={[0, 1.6, 0]}>
      <primitive object={scene} scale={[0.8, 0.8, 0.8]} />
      
      {/* Nút Info */}
      <mesh position={[2, 3, 2]} onClick={handleInfoClick}>
        <sphereGeometry args={[0.3, 16, 16]} />
        <meshBasicMaterial color="#ff4757" transparent opacity={0.9} />
        <Billboard position={[0, 0.6, 0]}>
          <Text fontSize={0.3} color="white" outlineWidth={0.05} outlineColor="#ff4757">INFO NHÀ</Text>
        </Billboard>
      </mesh>

      {/* Popup HTML - THÔNG TIN CHI TIẾT */}
      {showInfo && (
        <Html position={[2, 4, 2]} center zIndexRange={[100, 0]}>
          <div style={{ background: "white", padding: "20px", borderRadius: "12px", width: "320px", textAlign: "left", boxShadow: "0 20px 50px rgba(0,0,0,0.5)", fontFamily: "Segoe UI", pointerEvents:"auto" }}
               onMouseDown={(e) => e.stopPropagation()}>
            
            <div style={{display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:"10px", borderBottom:"1px solid #eee", paddingBottom:"10px"}}>
                <h3 style={{ margin: 0, color: "#2c3e50", fontSize:"18px" }}>🏡 Biệt Thự SmartHome</h3>
                <button onClick={() => setShowInfo(false)} style={{border:"none", background:"#eee", borderRadius:"50%", width:"24px", height:"24px", cursor:"pointer", fontWeight:"bold"}}>✕</button>
            </div>

            {/* Thông tin chi tiết nhà */}
            <div style={{display:"grid", gridTemplateColumns:"1fr 1fr", gap:"10px", fontSize:"13px", color:"#444", marginBottom:"15px"}}>
                <div>📐 <b>Diện tích:</b><br/>200m² (10x20)</div>
                <div>🧭 <b>Hướng:</b><br/>Đông Nam</div>
                <div>🛋️ <b>Kết cấu:</b><br/>4 PN, 5 WC</div>
                <div>📅 <b>Năm xây:</b><br/>2024 (Mới)</div>
            </div>

            <p style={{ margin: "10px 0", fontSize: "14px", background:"#fff3cd", padding:"5px", borderRadius:"4px", border:"1px solid #ffeeba" }}>
                💵 Giá niêm yết: <b style={{ color: "#c0392b", fontSize:"16px" }}>$500,000</b>
            </p>

            <LoanCalculator />
          </div>
        </Html>
      )}
    </group>
  );
}

// --- NHÂN VẬT (ĐÃ HẠ ĐỘ CAO) ---
function Human({ position, color, name, role }) {
  const isBroker = role === "broker";
  // Giải thích: position nhận vào là [x, 0, z] (mặt đất)
  // Box thân cao 0.5 (y scale=1), tâm ở 0. => cần nâng lên 0.5 để chân chạm đất
  return (
    <group position={position}>
      {/* Tên người chơi */}
      <Billboard position={[0, 1.8, 0]}>
        <Text fontSize={0.25} color={isBroker ? "#f1c40f" : "white"} outlineWidth={0.03} outlineColor="black">
          {isBroker ? "⭐ " + name : name}
        </Text>
      </Billboard>

      {/* Đầu */}
      <mesh position={[0, 1.25, 0]}>
        <boxGeometry args={[0.3, 0.3, 0.3]} />
        <meshStandardMaterial color={isBroker ? "#f39c12" : color} />
      </mesh>

      {/* Thân - Chân chạm đất (y=0) */}
      <mesh position={[0, 0.5, 0]}>
        <boxGeometry args={[0.5, 1, 0.3]} />
        <meshStandardMaterial color={isBroker ? "#e67e22" : color} />
      </mesh>
    </group>
  );
}

// --- ĐIỀU KHIỂN (FIX VỊ TRÍ GỬI LÊN SERVER) ---
function FirstPersonController({ socket, isLocked, setIsLocked }) {
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
    if (!isLocked) return;

    const speed = 8.0;
    direction.current.z = Number(moveForward.current) - Number(moveBackward.current);
    direction.current.x = Number(moveRight.current) - Number(moveLeft.current);
    direction.current.normalize();

    if (moveForward.current || moveBackward.current) velocity.current.z = direction.current.z * speed * delta; else velocity.current.z = 0;
    if (moveLeft.current || moveRight.current) velocity.current.x = direction.current.x * speed * delta; else velocity.current.x = 0;

    camera.translateX(velocity.current.x);
    camera.translateZ(-velocity.current.z);
    
    // Camera luôn giữ độ cao mắt người (1.6m)
    camera.position.y = 1.6; 

    // Gửi vị trí CHÂN (y=0) lên server để render avatar chạm đất
    if (velocity.current.x !== 0 || velocity.current.z !== 0) {
      socket.emit("move", [camera.position.x, 0, camera.position.z]);
    }
  });

  return <PointerLockControls onLock={() => setIsLocked(true)} onUnlock={() => setIsLocked(false)} />;
}

// --- APP MAIN ---
export default function App() {
  const [players, setPlayers] = useState({});
  const [envPreset, setEnvPreset] = useState("city");
  const [lightsOn, setLightsOn] = useState(false);
  const [chatList, setChatList] = useState([]);
  const [message, setMessage] = useState("");
  const [myInfo, setMyInfo] = useState({ name: "", role: "client", id: "" });
  const [houseStatus, setHouseStatus] = useState("FOR SALE");
  
  // Chat State
  const [isPrivateMode, setIsPrivateMode] = useState(false); // Checkbox cho khách
  const [selectedRecipient, setSelectedRecipient] = useState(""); // Dropdown cho Sale
  
  const [isLocked, setIsLocked] = useState(false);
  const chatEndRef = useRef(null);

  useEffect(() => {
    socket.on("updatePlayers", (p) => { 
        setPlayers(p); 
        if (p[socket.id]) setMyInfo({ ...p[socket.id], id: socket.id }); 
    });
    socket.on("receiveMessage", (data) => setChatList((prev) => [...prev, data]));
    socket.on("updateEnvironment", (p) => setEnvPreset(p));
    socket.on("updateLights", (s) => setLightsOn(s));
    socket.on("updateHouseStatus", (s) => {
      setHouseStatus(s);
      if (s === "SOLD") alert(`🎉 HỢP ĐỒNG THÀNH CÔNG! ĐÃ GHI BLOCKCHAIN.`);
    });
    return () => { socket.off("updatePlayers"); socket.off("receiveMessage"); socket.off("updateEnvironment"); socket.off("updateLights"); socket.off("updateHouseStatus"); };
  }, []);

  useEffect(() => { chatEndRef.current?.scrollIntoView({ behavior: "smooth" }); }, [chatList]);
  
  const sendMessage = () => { 
    if (!message.trim()) return;
    
    let targetId = null;

    if (myInfo.role === 'broker') {
        // Nếu là Sale: Gửi cho người được chọn trong dropdown (nếu có)
        if (selectedRecipient !== "") targetId = selectedRecipient;
    } else {
        // Nếu là Khách: Nếu tick chọn private -> Tìm ông Sale để gửi
        if (isPrivateMode) {
            const saleId = Object.keys(players).find(key => players[key].role === 'broker');
            targetId = saleId || null;
        }
    }

    socket.emit("sendMessage", { text: message, targetId: targetId }); 
    setMessage(""); 
  };
  
  const isNight = envPreset === "night";

  return (
    <div style={{ width: "100vw", height: "100vh", position: "relative", fontFamily: "Segoe UI", background: "#111" }}>
      
      {/* Tâm ngắm */}
      {isLocked && <div style={{position: "absolute", top: "50%", left: "50%", width: "8px", height: "8px", background: "transparent", border: "2px solid white", borderRadius: "50%", transform: "translate(-50%, -50%)", zIndex: 1000, pointerEvents: "none"}}><div style={{width:"2px", height:"2px", background:"red", margin:"2px auto"}}></div></div>}

      {/* HUD Trên */}
      <div style={{ position: "absolute", top: "20px", left: "20px", zIndex: 10, display: "flex", gap: "10px" }}>
        <button onClick={() => socket.emit("changeEnvironment", isNight ? "city" : "night")} style={{ padding: "8px 12px", cursor: "pointer", borderRadius:"6px", border:"none" }}>{isNight ? "🌙 Chế độ: Đêm" : "☀️ Chế độ: Ngày"}</button>
        <button onClick={() => socket.emit("toggleLights")} style={{ padding: "8px 12px", cursor: "pointer", borderRadius:"6px", border:"none" }}>💡 Bật/Tắt Đèn</button>
      </div>

      <Canvas camera={{ position: [0, 1.6, 10], fov: 60 }} shadows>
        <Environment preset={envPreset} background blur={0.6} />
        <CelestialBody isNight={isNight} />
        <ambientLight intensity={isNight ? 0.2 : 0.6} />
        <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.01, 0]}>
          <planeGeometry args={[100, 100]} /><meshStandardMaterial color={isNight ? "#2c3e50" : "#95a5a6"} />
        </mesh>

        <FirstPersonController socket={socket} isLocked={isLocked} setIsLocked={setIsLocked} />
        <SmartHouse setIsLocked={setIsLocked} />
        <StatusSign position={[-3, 0, 7]} role={myInfo.role} status={houseStatus} />
        <GardenLamp position={[16, 0, 8]} isOn={lightsOn} /><GardenLamp position={[-5, 0, 8]} isOn={lightsOn} />

        {Object.keys(players).map((key) => {
            if (key === socket.id) return null;
            return <Human key={key} position={players[key].position} color={players[key].color} name={players[key].name} role={players[key].role} />
        })}
      </Canvas>

      {/* CHAT BOX */}
      <div style={{ position: "absolute", bottom: "20px", left: "20px", width: "350px", height: "450px", background: "rgba(255,255,255,0.95)", borderRadius: "12px", padding: "15px", display: "flex", flexDirection: "column", zIndex: 20, boxShadow: "0 5px 15px rgba(0,0,0,0.2)" }} onKeyDown={(e) => e.stopPropagation()}>
        <div style={{borderBottom:"1px solid #ddd", paddingBottom:"10px", marginBottom:"10px", display:"flex", justifyContent:"space-between", alignItems:"center"}}>
            <div>
                <b style={{color: "#2c3e50"}}>{myInfo.name}</b> 
                <span style={{fontSize:"11px", color:"white", background: myInfo.role==='broker'?"#f1c40f":"#3498db", padding:"2px 6px", borderRadius:"4px", marginLeft:"5px"}}>{myInfo.role.toUpperCase()}</span>
            </div>
            <div style={{fontSize:"11px", color:"#7f8c8d"}}>Online: {Object.keys(players).length}</div>
        </div>
        
        <div style={{ flex: 1, overflowY: "auto", fontSize: "13px", paddingRight:"5px" }}>
          {chatList.map((msg, i) => {
             const isMe = msg.id === socket.id;
             const isSystem = msg.role === 'system';
             if(isSystem) return <div key={i} style={{textAlign:"center", margin:"10px 0"}}><span style={{background:"#27ae60", color:"white", padding:"4px 10px", borderRadius:"12px", fontSize:"11px", fontWeight:"bold"}}>{msg.text}</span></div>
             
             return (
               <div key={i} style={{ marginBottom: "8px", textAlign: isMe ? "right" : "left" }}>
                 <div style={{ 
                     background: msg.isPrivate ? "#fff3cd" : (isMe ? "#3498db" : (msg.role==='bot'?"#9b59b6":"#ecf0f1")), 
                     color: isMe ? "white" : "black", 
                     padding: "8px 12px", borderRadius: "12px", display: "inline-block", maxWidth: "85%",
                     border: msg.isPrivate ? "1px solid #e67e22" : "none",
                     textAlign: "left"
                 }}>
                   {msg.isPrivate && <div style={{fontSize:"10px", fontWeight:"bold", color:"#e67e22", marginBottom:"2px"}}>🔒 RIÊNG TƯ {msg.recipientName ? `(tới ${msg.recipientName})` : ""}</div>}
                   {!isMe && <div style={{fontSize:"10px", fontWeight:"bold", marginBottom:"2px", color: isMe?"white":"#555"}}>{msg.name}</div>}
                   {msg.text}
                 </div>
               </div>
             )
          })}
          <div ref={chatEndRef} />
        </div>

        {/* Khu vực nhập liệu & Chọn người nhận */}
        <div style={{ marginTop: "10px", background:"#f9f9f9", padding:"10px", borderRadius:"8px" }}>
          
          {/* LOGIC CHỌN NGƯỜI NHẬN: SALE THÌ DROPDOWN, KHÁCH THÌ CHECKBOX */}
          {myInfo.role === 'broker' ? (
              <select 
                value={selectedRecipient} 
                onChange={(e) => setSelectedRecipient(e.target.value)}
                style={{width: "100%", padding: "5px", marginBottom: "8px", borderRadius: "4px", border: "1px solid #ccc", fontSize: "12px"}}
              >
                  <option value="">📢 Gửi tất cả (Public)</option>
                  {Object.values(players).filter(p => p.id !== socket.id).map(p => (
                      <option key={p.id} value={p.id}>👤 Nhắn riêng: {p.name}</option>
                  ))}
              </select>
          ) : (
            <label style={{display:"flex", alignItems:"center", fontSize:"12px", marginBottom:"8px", cursor:"pointer", color:"#d35400", fontWeight:"bold"}}>
                  <input type="checkbox" checked={isPrivateMode} onChange={e=>setIsPrivateMode(e.target.checked)} style={{marginRight:"5px"}}/>
                  🔒 Nhắn riêng cho Admin (Sales)
            </label>
          )}

          <div style={{ display: "flex", gap: "5px" }}>
            <input value={message} onChange={e => setMessage(e.target.value)} onKeyDown={e => e.key === "Enter" && sendMessage()} 
                   placeholder={isPrivateMode || selectedRecipient ? "Nhập tin mật..." : "Nhập tin nhắn..."} 
                   style={{ flex: 1, padding: "8px", border:"1px solid #ddd", borderRadius:"4px", outline:"none" }} />
            <button onClick={sendMessage} style={{ padding: "8px 15px", background:"#2980b9", color:"white", border:"none", borderRadius:"4px", cursor:"pointer", fontWeight:"bold" }}>Gửi</button>
          </div>
        </div>
      </div>
    </div>
  );
}