import React, { useEffect, useState, useRef } from "react";
import io from "socket.io-client";
import { Canvas, useThree, useFrame } from "@react-three/fiber";
import { PointerLockControls, useGLTF, Text, Billboard, Environment, Html, Stars } from "@react-three/drei";
import * as THREE from "three";

// Kết nối server
const socket = io.connect("http://localhost:3001");

// --- COMPONENT: SỔ HỒNG SỐ (AN TOÀN - KHÔNG CRASH) ---
function DigitalCertificate({ data, onClose }) {
  if (!data) return null;
  // Sử dụng API tạo QR Code thay vì thư viện để tránh lỗi
  const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=SMART-CONTRACT:${data.hash}`;

  return (
    <div style={{
      position: "fixed", top: "0", left: "0", width: "100%", height: "100%",
      background: "rgba(0,0,0,0.85)", zIndex: 9999, display: "flex", justifyContent: "center", alignItems: "center",
      animation: "fadeIn 0.5s ease-out", fontFamily: "'Times New Roman', serif"
    }} onMouseDown={(e) => e.stopPropagation()}>
      
      <div style={{
        background: "#fff", width: "700px", padding: "40px", borderRadius: "8px",
        border: "15px solid #c0392b", position: "relative", boxShadow: "0 0 50px rgba(192, 57, 43, 0.5)"
      }}>
        <div style={{textAlign: "center", borderBottom: "2px solid #c0392b", paddingBottom: "20px", marginBottom: "20px"}}>
            <h2 style={{margin: 0, textTransform: "uppercase", color: "#c0392b", letterSpacing: "2px"}}>Giấy Chứng Nhận Sở Hữu Số</h2>
            <small style={{textTransform: "uppercase", letterSpacing: "5px", color: "#555"}}>NFT Real Estate Certificate</small>
        </div>
        
        <div style={{display: "flex", justifyContent: "space-between", alignItems: "flex-start"}}>
            <div style={{flex: 1, paddingRight: "20px"}}>
                <p style={{fontSize: "18px", margin:"0"}}>Chứng nhận quyền sở hữu cho:</p>
                <h1 style={{color: "#2c3e50", margin: "10px 0", fontStyle: "italic"}}>{data?.buyer || "User"}</h1>
                <div style={{marginTop: "20px", fontSize: "15px", lineHeight: "1.6"}}>
                    <div>📍 <b>Tài sản:</b> Biệt thự Phố Metaverse (Lô A1)</div>
                    <div>💰 <b>Giá trị:</b> <span style={{color: "#c0392b", fontWeight: "bold"}}>${data?.price?.toLocaleString()}</span></div>
                    <div>🕒 <b>Thời gian:</b> {data?.timestamp}</div>
                    <div style={{marginTop:"10px", color:"#27ae60"}}>✔ Đã xác thực trên Blockchain</div>
                </div>
                <div style={{marginTop: "15px", background: "#f1f2f6", padding: "8px", borderRadius: "4px", fontSize:"12px"}}>
                    <b>Hash Transaction:</b><br/>
                    <code style={{color: "#2980b9", wordBreak: "break-all"}}>{data?.hash}</code>
                </div>
            </div>

            <div style={{textAlign: "center", width: "150px"}}>
                <div style={{padding: "5px", background: "white", border: "1px solid #ddd"}}>
                    <img src={qrUrl} alt="QR Check" width="100%" />
                </div>
                <p style={{fontSize: "11px", marginTop: "5px", color: "#7f8c8d"}}>Quét để kiểm tra</p>
                <div style={{marginTop: "20px", border: "3px solid #c0392b", color: "#c0392b", borderRadius: "50%", width: "90px", height: "90px", display: "flex", flexDirection: "column", justifyContent: "center", alignItems: "center", fontSize: "10px", fontWeight: "bold", transform: "rotate(-15deg)", margin: "10px auto 0"}}>
                    <span>ĐÃ KÝ</span><span style={{fontSize: "14px"}}>APPROVED</span>
                </div>
            </div>
        </div>
        <button onClick={onClose} style={{position: "absolute", top: "10px", right: "10px", border: "none", background: "transparent", fontSize: "24px", cursor: "pointer", color: "#c0392b"}}>✕</button>
      </div>
    </div>
  );
}

// --- TÍNH TOÁN VAY VỐN (Loan Calculator) ---
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
    <div style={{ marginTop: "15px", paddingTop: "15px", borderTop: "1px dashed #ccc" }} onMouseDown={(e) => e.stopPropagation()}>
      <h4 style={{ margin: "0 0 10px 0", color: "#2980b9", display:"flex", alignItems:"center" }}>
        🏦 Bảng Tính Vay Ngân Hàng
      </h4>
      
      <div style={{display:"flex", justifyContent:"space-between", fontSize:"12px", marginBottom:"5px"}}>
        <span>Giá trị nhà:</span>
        <b>${price.toLocaleString()}</b>
      </div>
      
      <div style={{ fontSize: "12px", marginBottom: "8px" }}>
        <div style={{display:"flex", justifyContent:"space-between"}}>
            <label>Trả trước ({downPayment}%):</label>
            <span style={{color:"#27ae60"}}>${(price * downPayment / 100).toLocaleString()}</span>
        </div>
        <input type="range" min="10" max="90" value={downPayment} onChange={e => setDownPayment(e.target.value)} style={{ width: "100%", accentColor:"#27ae60" }} />
      </div>

      <div style={{ fontSize: "12px", marginBottom: "8px" }}>
        <div style={{display:"flex", justifyContent:"space-between"}}>
            <label>Thời hạn vay:</label>
            <span>{years} năm</span>
        </div>
        <input type="range" min="5" max="30" value={years} onChange={e => setYears(e.target.value)} style={{ width: "100%", accentColor:"#2980b9" }} />
      </div>

      <div style={{ background: "#ecf0f1", padding: "10px", borderRadius: "8px", textAlign: "center", marginTop:"10px" }}>
        <small style={{color:"#7f8c8d"}}>Gốc + Lãi hàng tháng:</small>
        <div style={{ color: "#c0392b", fontWeight: "bold", fontSize: "18px" }}>${monthlyPayment.toFixed(2)}</div>
        <small style={{fontSize:"10px", color:"#95a5a6"}}>(Lãi suất tạm tính: 8%/năm)</small>
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
    setShowInfo(!showInfo);
    if (!showInfo) { document.exitPointerLock(); setIsLocked(false); }
  };

  return (
    <group position={[0, 1.6, 0]}>
      <primitive object={scene} scale={[0.8, 0.8, 0.8]} />
      
      {/* Nút Info */}
      <mesh position={[2, 3, 2]} onClick={handleInfoClick}>
        <sphereGeometry args={[0.3, 16, 16]} />
        <meshBasicMaterial color="#ff4757" transparent opacity={0.9} />
        <Billboard position={[0, 0.6, 0]}>
          <Text fontSize={0.3} color="white" outlineWidth={0.05} outlineColor="#ff4757">INFO CHI TIẾT</Text>
        </Billboard>
      </mesh>

      {/* Popup HTML - INFO ĐẦY ĐỦ */}
      {showInfo && (
        <Html position={[2, 4, 2]} center zIndexRange={[100, 0]}>
          <div style={{ background: "white", padding: "20px", borderRadius: "12px", width: "350px", textAlign: "left", boxShadow: "0 20px 50px rgba(0,0,0,0.5)", fontFamily: "Segoe UI", pointerEvents:"auto", overflow:"hidden" }}
               onMouseDown={(e) => e.stopPropagation()}>
            
            <div style={{display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:"10px", borderBottom:"1px solid #eee", paddingBottom:"10px"}}>
                <h3 style={{ margin: 0, color: "#2c3e50", fontSize:"18px" }}>🏡 Biệt Thự Phố Metaverse</h3>
                <button onClick={() => setShowInfo(false)} style={{border:"none", background:"#eee", borderRadius:"50%", width:"24px", height:"24px", cursor:"pointer", fontWeight:"bold"}}>✕</button>
            </div>

            {/* THÔNG TIN NHÀ CHI TIẾT */}
            <div style={{display:"grid", gridTemplateColumns:"1fr 1fr", gap:"10px", fontSize:"13px", color:"#444", marginBottom:"15px"}}>
                <div style={{background:"#f8f9fa", padding:"5px", borderRadius:"4px"}}>📐 <b>Diện tích:</b><br/>200m² (10x20)</div>
                <div style={{background:"#f8f9fa", padding:"5px", borderRadius:"4px"}}>🧭 <b>Hướng:</b><br/>Đông Nam (Mát)</div>
                <div style={{background:"#f8f9fa", padding:"5px", borderRadius:"4px"}}>🛌 <b>Kết cấu:</b><br/>4 PN, 5 WC, 1 Garage</div>
                <div style={{background:"#f8f9fa", padding:"5px", borderRadius:"4px"}}>📅 <b>Năm xây:</b><br/>2024 (Mới 100%)</div>
                <div style={{background:"#f8f9fa", padding:"5px", borderRadius:"4px"}}>📜 <b>Pháp lý:</b><br/>Sổ hồng riêng</div>
                <div style={{background:"#f8f9fa", padding:"5px", borderRadius:"4px"}}>🏙️ <b>Vị trí:</b><br/>Quận 1, Metaverse</div>
            </div>

            {/* Component Tính Vay */}
            <LoanCalculator />
            
            <div style={{marginTop:"10px", textAlign:"center", fontSize:"11px", color:"#95a5a6"}}>
                <i>*Thông tin được xác thực bởi Blockchain</i>
            </div>
          </div>
        </Html>
      )}
    </group>
  );
}

// --- MÔI TRƯỜNG & VẬT THỂ PHỤ ---
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
      <mesh position={[0, 2, 0]}><sphereGeometry args={[0.25, 16, 16]} /><meshStandardMaterial color={isOn ? "#f1c40f" : "#7f8c8d"} emissive={isOn ? "#f1c40f" : "black"} emissiveIntensity={isOn ? 3 : 0} /></mesh>
      {isOn && <pointLight position={[0, 2.2, 0]} distance={10} intensity={3} color="#f1c40f" />}
    </group>
  );
}

function StatusSign({ position, role, status }) {
  const handleClick = (e) => {
    e.stopPropagation(); 
    if (role !== "broker") {
      alert("⛔ BẠN KHÔNG CÓ QUYỀN CHỐT ĐƠN! CHỈ SALES ADMIN MỚI ĐƯỢC.");
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

function Human({ position, color, name, role }) {
  const isBroker = role === "broker";
  return (
    <group position={position}>
      <Billboard position={[0, 1.8, 0]}><Text fontSize={0.25} color={isBroker ? "#f1c40f" : "white"} outlineWidth={0.03} outlineColor="black">{isBroker ? "⭐ " + name : name}</Text></Billboard>
      <mesh position={[0, 1.25, 0]}><boxGeometry args={[0.3, 0.3, 0.3]} /><meshStandardMaterial color={isBroker ? "#f39c12" : color} /></mesh>
      <mesh position={[0, 0.5, 0]}><boxGeometry args={[0.5, 1, 0.3]} /><meshStandardMaterial color={isBroker ? "#e67e22" : color} /></mesh>
    </group>
  );
}

function FirstPersonController({ socket, isLocked, setIsLocked }) {
  const { camera } = useThree();
  const moveForward = useRef(false);
  const moveBackward = useRef(false);
  const moveLeft = useRef(false);
  const moveRight = useRef(false);
  const velocity = useRef(new THREE.Vector3());
  const direction = useRef(new THREE.Vector3());

  useEffect(() => {
    const onKey = (e, v) => {
        if(e.code==="KeyW") moveForward.current = v;
        if(e.code==="KeyS") moveBackward.current = v;
        if(e.code==="KeyA") moveLeft.current = v;
        if(e.code==="KeyD") moveRight.current = v;
    };
    const down = (e) => onKey(e, true);
    const up = (e) => onKey(e, false);
    document.addEventListener("keydown", down); document.addEventListener("keyup", up);
    return () => { document.removeEventListener("keydown", down); document.removeEventListener("keyup", up); };
  }, []);

  useFrame((state, delta) => {
    if (!isLocked) return;
    const speed = 8.0;
    direction.current.z = Number(moveForward.current) - Number(moveBackward.current);
    direction.current.x = Number(moveRight.current) - Number(moveLeft.current);
    direction.current.normalize();
    velocity.current.z = (moveForward.current || moveBackward.current) ? direction.current.z * speed * delta : 0;
    velocity.current.x = (moveLeft.current || moveRight.current) ? direction.current.x * speed * delta : 0;
    camera.translateX(velocity.current.x);
    camera.translateZ(-velocity.current.z);
    camera.position.y = 1.6;
    if (velocity.current.x !== 0 || velocity.current.z !== 0) socket.emit("move", [camera.position.x, 0, camera.position.z]);
  });
  return <PointerLockControls onLock={() => setIsLocked(true)} onUnlock={() => setIsLocked(false)} />;
}

// --- MAIN APP ---
export default function App() {
  const [players, setPlayers] = useState({});
  const [envPreset, setEnvPreset] = useState("city");
  const [lightsOn, setLightsOn] = useState(false);
  const [chatList, setChatList] = useState([]);
  const [message, setMessage] = useState("");
  const [myInfo, setMyInfo] = useState({ name: "", role: "client", id: "" });
  const [houseStatus, setHouseStatus] = useState("FOR SALE");
  
  const [certificateData, setCertificateData] = useState(null);
  const [isPrivateMode, setIsPrivateMode] = useState(false);
  const [selectedRecipient, setSelectedRecipient] = useState("");
  const [isLocked, setIsLocked] = useState(false);
  const chatEndRef = useRef(null);

  useEffect(() => {
    socket.on("updatePlayers", (p) => { setPlayers(p); if (p[socket.id]) setMyInfo({ ...p[socket.id], id: socket.id }); });
    socket.on("receiveMessage", (data) => setChatList((prev) => [...prev, data]));
    socket.on("updateEnvironment", (p) => setEnvPreset(p));
    socket.on("updateLights", (s) => setLightsOn(s));
    
    socket.on("updateHouseStatus", (data) => {
      if (typeof data === 'string') {
          setHouseStatus(data);
          setCertificateData(null);
      } else {
          setHouseStatus(data.status);
          if (data.status === "SOLD" && data.txData) {
             setCertificateData(data.txData);
             document.exitPointerLock();
             setIsLocked(false);
          } else {
             setCertificateData(null);
          }
      }
    });

    return () => { socket.off("updatePlayers"); socket.off("receiveMessage"); socket.off("updateEnvironment"); socket.off("updateLights"); socket.off("updateHouseStatus"); };
  }, []);

  useEffect(() => { chatEndRef.current?.scrollIntoView({ behavior: "smooth" }); }, [chatList]);
  
  const sendMessage = () => { 
    if (!message.trim()) return;
    let targetId = null;
    if (myInfo.role === 'broker') {
        if (selectedRecipient !== "") targetId = selectedRecipient;
    } else {
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
      
      {certificateData && <DigitalCertificate data={certificateData} onClose={() => setCertificateData(null)} />}

      {isLocked && <div style={{position: "absolute", top: "50%", left: "50%", width: "10px", height: "10px", border: "2px solid white", borderRadius: "50%", transform: "translate(-50%, -50%)", zIndex: 1000, pointerEvents: "none"}}><div style={{width:"2px", height:"2px", background:"red", margin:"2px auto"}}></div></div>}

      <div style={{ position: "absolute", top: "20px", left: "20px", zIndex: 10, display: "flex", gap: "10px" }}>
        <button onClick={() => socket.emit("changeEnvironment", isNight ? "city" : "night")} style={{ padding: "8px 12px", cursor: "pointer", borderRadius:"6px" }}>{isNight ? "🌙 Night" : "☀️ Day"}</button>
        <button onClick={() => socket.emit("toggleLights")} style={{ padding: "8px 12px", cursor: "pointer", borderRadius:"6px" }}>💡 Light</button>
      </div>

      <Canvas camera={{ position: [0, 1.6, 10], fov: 60 }} shadows>
        <Environment preset={envPreset} background blur={0.6} />
        <CelestialBody isNight={isNight} />
        <ambientLight intensity={isNight ? 0.2 : 0.6} />
        <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.01, 0]}><planeGeometry args={[100, 100]} /><meshStandardMaterial color={isNight ? "#2c3e50" : "#95a5a6"} /></mesh>

        <FirstPersonController socket={socket} isLocked={isLocked} setIsLocked={setIsLocked} />
        <SmartHouse setIsLocked={setIsLocked} />
        <StatusSign position={[-3, 0, 7]} role={myInfo.role} status={houseStatus} />
        <GardenLamp position={[16, 0, 8]} isOn={lightsOn} /><GardenLamp position={[-5, 0, 8]} isOn={lightsOn} />

        {Object.keys(players).map((key) => {
            if (key === socket.id) return null;
            return <Human key={key} position={players[key].position} color={players[key].color} name={players[key].name} role={players[key].role} />
        })}
      </Canvas>

      <div style={{ position: "absolute", bottom: "20px", left: "20px", width: "350px", height: "450px", background: "rgba(135, 177, 212, 0.95)", borderRadius: "12px", padding: "15px", display: "flex", flexDirection: "column", zIndex: 20 }}>
        <div style={{borderBottom:"1px solid #ddd", paddingBottom:"10px", marginBottom:"10px", display:"flex", justifyContent:"space-between"}}>
            <div><b>{myInfo.name}</b> <span style={{fontSize:"11px", color:"white", background: myInfo.role==='broker'?"#f1c40f":"#3498db", padding:"2px 6px", borderRadius:"4px"}}>{myInfo.role.toUpperCase()}</span></div>
        </div>
        <div style={{ flex: 1, overflowY: "auto", fontSize: "13px" }}>
          {chatList.map((msg, i) => (
             <div key={i} style={{ marginBottom: "8px", textAlign: msg.id === socket.id ? "right" : "left" }}>
                {msg.role==='system' ? <div style={{textAlign:"center"}}><span style={{background:"#27ae60", color:"white", padding:"3px 8px", borderRadius:"10px", fontSize:"10px"}}>{msg.text}</span></div> :
                <div style={{ background: msg.isPrivate ? "#fff3cd" : (msg.id === socket.id ? "#3498db" : (msg.role==='bot'?"#9b59b6":"#d3b87dff")), color: msg.id === socket.id ? "white" : "black", padding: "8px 12px", borderRadius: "12px", display: "inline-block", maxWidth: "85%", border: msg.isPrivate ? "1px solid #e67e22" : "none", textAlign: "left" }}>
                   {msg.isPrivate && <div style={{fontSize:"10px", color:"#e67e22"}}>🔒 RIÊNG TƯ {msg.recipientName ? `(tới ${msg.recipientName})` : ""}</div>}
                   {msg.id !== socket.id && <div style={{fontSize:"10px", fontWeight:"bold", marginBottom:"2px"}}>{msg.name}</div>}{msg.text}
                </div>}
             </div>
          ))}
          <div ref={chatEndRef} />
        </div>
        <div style={{ marginTop: "10px", background:"#f9f9f9", padding:"10px", borderRadius:"8px" }}>
          {myInfo.role === 'broker' ? (
              <select value={selectedRecipient} onChange={(e) => setSelectedRecipient(e.target.value)} style={{width: "100%", padding: "5px", marginBottom: "8px"}}>
                  <option value="">📢 Gửi tất cả</option>
                  {Object.values(players).filter(p => p.id !== socket.id).map(p => <option key={p.id} value={p.id}>👤 {p.name}</option>)}
              </select>
          ) : (
            <label style={{display:"flex", fontSize:"12px", marginBottom:"8px", cursor:"pointer", color:"#d35400", fontWeight:"bold"}}>
                  <input type="checkbox" checked={isPrivateMode} onChange={e=>setIsPrivateMode(e.target.checked)} style={{marginRight:"5px"}}/>🔒 Nhắn riêng Admin
            </label>
          )}
          <div style={{ display: "flex", gap: "5px" }}>
            <input value={message} onChange={e => setMessage(e.target.value)} onKeyDown={e => e.key === "Enter" && sendMessage()} placeholder="Nhập tin..." style={{ flex: 1, padding: "8px" }} />
            <button onClick={sendMessage} style={{ padding: "8px 15px", background:"#2980b9", color:"white", border:"none", borderRadius:"4px" }}>Gửi</button>
          </div>
        </div>
      </div>
    </div>
  );
}