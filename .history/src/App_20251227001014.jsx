import React, { useEffect, useState, useRef } from "react";
import io from "socket.io-client";
import { Canvas, useThree, useFrame } from "@react-three/fiber";
import { PointerLockControls, useGLTF, Text, Billboard, Environment, Html, Stars } from "@react-three/drei";
import * as THREE from "three";

// Kết nối server
const socket = io.connect("http://localhost:3001");

// --- COMPONENT: SỔ HỒNG SỐ (CHỈ HIỆN CHO NGƯỜI MUA & BÁN) ---
function DigitalCertificate({ data, onClose }) {
  if (!data) return null;
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
            <small style={{textTransform: "uppercase", letterSpacing: "5px", color: "#555"}}>NFT Real Estate Certificate - PRIVATE COPY</small>
        </div>
        
        <div style={{display: "flex", justifyContent: "space-between", alignItems: "flex-start"}}>
            <div style={{flex: 1, paddingRight: "20px"}}>
                <p style={{fontSize: "18px", margin:"0"}}>Chứng nhận quyền sở hữu cho:</p>
                <h1 style={{color: "#2c3e50", margin: "10px 0", fontStyle: "italic"}}>{data?.buyerName || "Khách hàng"}</h1>
                <div style={{marginTop: "20px", fontSize: "15px", lineHeight: "1.6"}}>
                    <div>📍 <b>Tài sản:</b> Biệt thự Phố Metaverse (Lô A1)</div>
                    <div>💰 <b>Giá trị:</b> <span style={{color: "#c0392b", fontWeight: "bold"}}>${data?.price?.toLocaleString()}</span></div>
                    <div>🕒 <b>Thời gian:</b> {data?.timestamp}</div>
                    <div style={{marginTop:"10px", color:"#27ae60"}}>✔ Đã xác thực trên Blockchain (Private Mode)</div>
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

// --- COMPONENT: MODAL CHỌN NGƯỜI MUA (Dành cho Broker) ---
function BuyerSelector({ players, onClose, onSelect }) {
    const buyerList = Object.values(players).filter(p => p.role !== 'broker');

    return (
        <div style={{
            position: "fixed", top: "0", left: "0", width: "100%", height: "100%",
            background: "rgba(0,0,0,0.6)", zIndex: 9998, display: "flex", justifyContent: "center", alignItems: "center"
        }} onMouseDown={(e) => e.stopPropagation()}>
            <div style={{background: "white", padding: "20px", borderRadius: "8px", width: "300px", boxShadow: "0 10px 25px rgba(0,0,0,0.3)"}}>
                <h3 style={{marginTop: 0, color: "#2c3e50"}}>📝 Chọn Khách Chốt Đơn</h3>
                <p style={{fontSize: "12px", color: "#7f8c8d"}}>Chọn khách hàng để ký hợp đồng và chuyển sổ hồng.</p>
                
                <div style={{maxHeight: "200px", overflowY: "auto", margin: "10px 0", border: "1px solid #eee"}}>
                    {buyerList.length === 0 ? (
                        <div style={{padding: "10px", textAlign: "center", color: "#999"}}>Không có khách Online</div>
                    ) : (
                        buyerList.map(player => (
                            <div key={player.id} onClick={() => onSelect(player.id)} 
                                 style={{padding: "10px", borderBottom: "1px solid #f1f1f1", cursor: "pointer", display:"flex", alignItems:"center", gap:"10px", transition: "background 0.2s"}}
                                 onMouseEnter={(e) => e.currentTarget.style.background = "#f8f9fa"}
                                 onMouseLeave={(e) => e.currentTarget.style.background = "white"}>
                                <div style={{width:"30px", height:"30px", borderRadius:"50%", background: player.color}}></div>
                                <b>{player.name}</b>
                            </div>
                        ))
                    )}
                </div>
                <button onClick={onClose} style={{width: "100%", padding: "10px", background: "#95a5a6", color: "white", border: "none", borderRadius: "4px", cursor: "pointer"}}>Hủy bỏ</button>
            </div>
        </div>
    )
}

// --- TÍNH TOÁN VAY VỐN ---
function LoanCalculator() {
  const [downPayment, setDownPayment] = useState(30); 
  const [years, setYears] = useState(20); 
  const price = 500000;
  const interestRate = 0.08; 
  const monthlyPayment = (price * (1 - downPayment/100) * (interestRate/12)) / (1 - Math.pow(1 + interestRate/12, -years*12));

  return (
    <div style={{ marginTop: "15px", paddingTop: "15px", borderTop: "1px dashed #ccc" }} onMouseDown={(e) => e.stopPropagation()}>
      <h4 style={{ margin: "0 0 10px 0", color: "#2980b9" }}>🏦 Bảng Tính Vay Ngân Hàng</h4>
      <div style={{ fontSize: "12px", marginBottom: "8px" }}>
        <div style={{display:"flex", justifyContent:"space-between"}}><label>Trả trước ({downPayment}%):</label><span style={{color:"#27ae60"}}>${(price * downPayment / 100).toLocaleString()}</span></div>
        <input type="range" min="10" max="90" value={downPayment} onChange={e => setDownPayment(e.target.value)} style={{ width: "100%" }} />
      </div>
      <div style={{ fontSize: "12px", marginBottom: "8px" }}>
        <div style={{display:"flex", justifyContent:"space-between"}}><label>Thời hạn: {years} năm</label></div>
        <input type="range" min="5" max="30" value={years} onChange={e => setYears(e.target.value)} style={{ width: "100%" }} />
      </div>
      <div style={{ background: "#ecf0f1", padding: "10px", borderRadius: "8px", textAlign: "center", marginTop:"10px" }}>
        <small>Gốc + Lãi hàng tháng:</small>
        <div style={{ color: "#c0392b", fontWeight: "bold", fontSize: "18px" }}>${monthlyPayment.toFixed(2)}</div>
      </div>
    </div>
  );
}

// --- SMART HOUSE ---
function SmartHouse({ setIsLocked }) {
  const { scene } = useGLTF("/nha.glb"); // Đảm bảo file nha.glb có trong folder public
  const [showInfo, setShowInfo] = useState(false);

  const handleInfoClick = (e) => {
    e.stopPropagation(); 
    setShowInfo(!showInfo);
    if (!showInfo) { document.exitPointerLock(); setIsLocked(false); }
  };

  return (
    <group position={[0, 1.6, 0]}>
      <primitive object={scene} scale={[0.8, 0.8, 0.8]} />
      <mesh position={[2, 3, 2]} onClick={handleInfoClick}>
        <sphereGeometry args={[0.3, 16, 16]} />
        <meshBasicMaterial color="#ff4757" transparent opacity={0.9} />
        <Billboard position={[0, 0.6, 0]}><Text fontSize={0.3} color="white">INFO CHI TIẾT</Text></Billboard>
      </mesh>
      {showInfo && (
        <Html position={[2, 4, 2]} center zIndexRange={[100, 0]}>
          <div style={{ background: "white", padding: "20px", borderRadius: "12px", width: "350px", textAlign: "left", boxShadow: "0 20px 50px rgba(0,0,0,0.5)", fontFamily: "Segoe UI", pointerEvents:"auto" }} onMouseDown={(e) => e.stopPropagation()}>
            <div style={{display:"flex", justifyContent:"space-between"}}><h3 style={{ margin: 0 }}>🏡 Biệt Thự Phố</h3><button onClick={() => setShowInfo(false)}>✕</button></div>
            <p>Diện tích: 200m² | 4 PN | Sổ hồng riêng</p>
            <LoanCalculator />
          </div>
        </Html>
      )}
    </group>
  );
}

// --- BIỂN BÁO TRẠNG THÁI ---
function StatusSign({ position, role, status, onBrokerClick }) {
  const handleClick = (e) => {
    e.stopPropagation(); 
    if (role === "broker") {
        onBrokerClick();
    } else {
        // Nếu là khách, click vào chỉ để xem, không làm gì (hoặc hiện thông báo)
        if(status === 'FOR SALE') alert("Liên hệ Sales Admin để mua căn này!");
    }
  };

  return (
    <group position={position} onClick={handleClick}>
      <mesh position={[0, 1, 0]}><cylinderGeometry args={[0.05, 0.05, 2]} /><meshStandardMaterial color="#333" /></mesh>
      <mesh position={[0, 2, 0]}><boxGeometry args={[1.5, 0.8, 0.1]} /><meshStandardMaterial color={status === "SOLD" ? "#c0392b" : "#27ae60"} /></mesh>
      <Text position={[0, 2, 0.06]} fontSize={0.35} color="white" fontWeight="bold">{status}</Text>
    </group>
  );
}

// --- NHÂN VẬT & MÔI TRƯỜNG ---
function Human({ position, color, name, role }) {
  return (
    <group position={position}>
      <Billboard position={[0, 1.8, 0]}><Text fontSize={0.25} color={role==="broker"?"#f1c40f":"white"} outlineWidth={0.03}>{role==="broker" ? "⭐ "+name : name}</Text></Billboard>
      <mesh position={[0, 1.25, 0]}><boxGeometry args={[0.3, 0.3, 0.3]} /><meshStandardMaterial color={color} /></mesh>
      <mesh position={[0, 0.5, 0]}><boxGeometry args={[0.5, 1, 0.3]} /><meshStandardMaterial color={color} /></mesh>
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
    document.addEventListener("keydown", (e)=>onKey(e,true)); document.addEventListener("keyup", (e)=>onKey(e,false));
    return () => { document.removeEventListener("keydown", (e)=>onKey(e,true)); document.removeEventListener("keyup", (e)=>onKey(e,false)); };
  }, []);

  useFrame((state, delta) => {
    if (!isLocked) return;
    direction.current.z = Number(moveForward.current) - Number(moveBackward.current);
    direction.current.x = Number(moveRight.current) - Number(moveLeft.current);
    direction.current.normalize();
    velocity.current.z = (moveForward.current || moveBackward.current) ? direction.current.z * 8.0 * delta : 0;
    velocity.current.x = (moveLeft.current || moveRight.current) ? direction.current.x * 8.0 * delta : 0;
    camera.translateX(velocity.current.x); camera.translateZ(-velocity.current.z); camera.position.y = 1.6;
    if (velocity.current.x !== 0 || velocity.current.z !== 0) socket.emit("move", [camera.position.x, 0, camera.position.z]);
  });
  return <PointerLockControls onLock={() => setIsLocked(true)} onUnlock={() => setIsLocked(false)} />;
}

// --- MAIN APP ---
export default function App() {
  const [players, setPlayers] = useState({});
  const [myInfo, setMyInfo] = useState({ name: "", role: "client", id: "" });
  const [chatList, setChatList] = useState([]);
  const [message, setMessage] = useState("");
  const [houseStatus, setHouseStatus] = useState("FOR SALE");
  const [envPreset, setEnvPreset] = useState("city");
  
  // UI States
  const [certificateData, setCertificateData] = useState(null);
  const [showBuyerSelector, setShowBuyerSelector] = useState(false);
  const [isLocked, setIsLocked] = useState(false);
  const chatEndRef = useRef(null);

  useEffect(() => {
    socket.on("updatePlayers", (p) => { setPlayers(p); if (p[socket.id]) setMyInfo({ ...p[socket.id], id: socket.id }); });
    socket.on("receiveMessage", (data) => setChatList((prev) => [...prev, data]));
    socket.on("updateEnvironment", (p) => setEnvPreset(p));
    
    // 1. Cập nhật biển báo (PUBLIC)
    socket.on("updateHouseStatus", (status) => {
        setHouseStatus(status);
        // Nếu reset về FOR SALE thì ẩn sổ hồng (nếu đang xem)
        if(status === 'FOR SALE') setCertificateData(null);
    });

    // 2. Nhận sổ hồng riêng (PRIVATE - Chỉ Buyer & Broker nhận được)
    socket.on("receiveCertificate", (data) => {
        setCertificateData(data);
        document.exitPointerLock();
        setIsLocked(false);
        // Play sound effect could be here
    });

    return () => { socket.off("updatePlayers"); socket.off("receiveMessage"); socket.off("updateEnvironment"); socket.off("updateHouseStatus"); socket.off("receiveCertificate"); };
  }, []);

  useEffect(() => { chatEndRef.current?.scrollIntoView({ behavior: "smooth" }); }, [chatList]);
  
  const sendMessage = () => { 
    if (!message.trim()) return;
    socket.emit("sendMessage", { text: message }); 
    setMessage(""); 
  };

  const handleBrokerClickSign = () => {
      if (houseStatus === "FOR SALE") {
          // Mở modal chọn khách
          document.exitPointerLock();
          setIsLocked(false);
          setShowBuyerSelector(true);
      } else {
          // Nếu đang SOLD -> Reset lại (cho phép bán lại)
          if(window.confirm("Bạn muốn mở bán lại căn này (Reset status)?")) {
              socket.emit("resetHouseStatus");
          }
      }
  };

  const confirmSale = (buyerId) => {
      setShowBuyerSelector(false);
      // Gửi lệnh chốt đơn lên server kèm ID người mua
      socket.emit("confirmTransaction", { buyerId: buyerId });
  };

  return (
    <div style={{ width: "100vw", height: "100vh", position: "relative", fontFamily: "Segoe UI", background: "#111" }}>
      
      {/* 1. SỔ HỒNG (Private) */}
      {certificateData && <DigitalCertificate data={certificateData} onClose={() => setCertificateData(null)} />}

      {/* 2. MODAL CHỌN KHÁCH (Broker Only) */}
      {showBuyerSelector && (
          <BuyerSelector 
              players={players} 
              onClose={() => setShowBuyerSelector(false)} 
              onSelect={confirmSale} 
          />
      )}

      {isLocked && <div style={{position: "absolute", top: "50%", left: "50%", width: "10px", height: "10px", border: "2px solid white", borderRadius: "50%", transform: "translate(-50%, -50%)", zIndex: 1000, pointerEvents: "none"}}><div style={{width:"2px", height:"2px", background:"red", margin:"2px auto"}}></div></div>}

      <div style={{ position: "absolute", top: "20px", left: "20px", zIndex: 10 }}>
        <button onClick={() => socket.emit("changeEnvironment", envPreset === "city" ? "night" : "city")} style={{ padding: "8px 12px", cursor: "pointer", borderRadius:"6px" }}>{envPreset === "city" ? "🌙 Night" : "☀️ Day"}</button>
      </div>

      <Canvas camera={{ position: [0, 1.6, 10], fov: 60 }} shadows>
        <Environment preset={envPreset} background blur={0.6} />
        <ambientLight intensity={0.5} />
        <pointLight position={[10, 10, 10]} intensity={1} />
        <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.01, 0]}><planeGeometry args={[100, 100]} /><meshStandardMaterial color="#95a5a6" /></mesh>

        <FirstPersonController socket={socket} isLocked={isLocked} setIsLocked={setIsLocked} />
        <SmartHouse setIsLocked={setIsLocked} />
        
        {/* Biển báo nhận event click của broker */}
        <StatusSign position={[-3, 0, 7]} role={myInfo.role} status={houseStatus} onBrokerClick={handleBrokerClickSign} />

        {Object.keys(players).map((key) => {
            if (key === socket.id) return null;
            return <Human key={key} position={players[key].position} color={players[key].color} name={players[key].name} role={players[key].role} />
        })}
      </Canvas>

      <div style={{ position: "absolute", bottom: "20px", left: "20px", width: "350px", height: "300px", background: "rgba(0,0,0,0.5)", borderRadius: "12px", padding: "15px", display: "flex", flexDirection: "column", zIndex: 20 }}>
        <div style={{color:"white", borderBottom:"1px solid #555", paddingBottom:"5px"}}>Chat Room ({Object.keys(players).length} Online)</div>
        <div style={{ flex: 1, overflowY: "auto", fontSize: "13px", marginTop:"10px" }}>
          {chatList.map((msg, i) => (
             <div key={i} style={{ marginBottom: "5px", color: msg.role === 'system' ? "#2ecc71" : "white" }}>
                {msg.role !== 'system' && <b style={{color: msg.role==='broker' ? '#f1c40f' : '#3498db'}}>{msg.name}: </b>}
                {msg.text}
             </div>
          ))}
          <div ref={chatEndRef} />
        </div>
        <div style={{ display: "flex", gap: "5px", marginTop:"10px" }}>
            <input value={message} onChange={e => setMessage(e.target.value)} onKeyDown={e => e.key === "Enter" && sendMessage()} placeholder="Nhập tin..." style={{ flex: 1, padding: "8px", borderRadius:"4px", border:"none" }} />
        </div>
      </div>
    </div>
  );
}