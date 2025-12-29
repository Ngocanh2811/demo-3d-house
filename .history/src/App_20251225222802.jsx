import React, { useEffect, useState, useRef, useMemo } from "react";
import io from "socket.io-client";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { useGLTF, Text, Billboard, Environment, Html, Stars, Plane } from "@react-three/drei";
import * as THREE from "three";

const socket = io.connect("http://localhost:3001");

// --- UTILS: Hỗ trợ di chuyển WASD ---
function usePlayerControls() {
  const [movement, setMovement] = useState({ forward: false, backward: false, left: false, right: false });
  useEffect(() => {
    const handleKeyDown = (e) => {
      switch(e.code) {
        case "KeyW": setMovement(m => ({ ...m, forward: true })); break;
        case "KeyS": setMovement(m => ({ ...m, backward: true })); break;
        case "KeyA": setMovement(m => ({ ...m, left: true })); break;
        case "KeyD": setMovement(m => ({ ...m, right: true })); break;
        default: break;
      }
    };
    const handleKeyUp = (e) => {
      switch(e.code) {
        case "KeyW": setMovement(m => ({ ...m, forward: false })); break;
        case "KeyS": setMovement(m => ({ ...m, backward: false })); break;
        case "KeyA": setMovement(m => ({ ...m, left: false })); break;
        case "KeyD": setMovement(m => ({ ...m, right: false })); break;
        default: break;
      }
    };
    document.addEventListener("keydown", handleKeyDown);
    document.addEventListener("keyup", handleKeyUp);
    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      document.removeEventListener("keyup", handleKeyUp);
    };
  }, []);
  return movement;
}

// --- COMPONENT: Camera Controller (Góc nhìn thứ nhất) ---
function FirstPersonController({ position, onMove }) {
  const { camera } = useThree();
  const { forward, backward, left, right } = usePlayerControls();
  const vec = new THREE.Vector3();
  const speed = 0.15;

  useFrame(() => {
    // Lấy hướng nhìn của camera
    const direction = new THREE.Vector3();
    const frontVector = new THREE.Vector3(0, 0, (backward ? 1 : 0) - (forward ? 1 : 0));
    const sideVector = new THREE.Vector3((left ? 1 : 0) - (right ? 1 : 0), 0, 0);

    direction.subVectors(frontVector, sideVector).normalize().multiplyScalar(speed).applyEuler(camera.rotation);

    // Chỉ di chuyển trên mặt phẳng XZ (không bay lên trời)
    camera.position.x += direction.x;
    camera.position.z += direction.z;
    
    // Giới hạn độ cao camera (giả lập chiều cao người)
    camera.position.y = 1.7; 

    // Gửi vị trí về server (Throttling đơn giản bằng frame check hoặc logic riêng nếu cần tối ưu)
    if (forward || backward || left || right) {
      onMove([camera.position.x, camera.position.y, camera.position.z], camera.rotation.y);
    }
  });
  return null;
}

// --- COMPONENT: Người chơi khác (Avatar) ---
function OtherPlayer({ position, color, name, role }) {
  // Lerp vị trí để mượt mà hơn (đơn giản hóa bằng cách gán trực tiếp cho demo)
  return (
    <group position={position}>
      <Billboard position={[0, 2.2, 0]}>
        <Text fontSize={0.25} color={role==="broker"?"#e67e22":"white"} outlineWidth={0.02} outlineColor="black">
          {name} {role==="broker" && "⭐"}
        </Text>
      </Billboard>
      {/* Body */}
      <mesh position={[0, 0.9, 0]}>
        <capsuleGeometry args={[0.3, 1, 4]} />
        <meshStandardMaterial color={color} />
      </mesh>
      {/* Eyes to see direction */}
      <mesh position={[0, 1.2, 0.25]}>
        <boxGeometry args={[0.4, 0.1, 0.1]} />
        <meshStandardMaterial color="black" />
      </mesh>
    </group>
  );
}

// --- COMPONENT: Ngôi nhà thông minh (Customizable) ---
function CustomizableHouse({ config, onToggleLight, onChangeStatus, isBroker }) {
  const { scene } = useGLTF("/nha.glb"); // Đảm bảo bạn có file nha.glb hoặc dùng box thay thế
  
  return (
    <group>
      {/* Nhà gốc (Model) */}
      <primitive object={scene} scale={[0.8, 0.8, 0.8]} position={[0, 0, 0]} />

      {/* SÀN NHÀ (Có thể đổi màu) - Giả lập sàn tầng 1 */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.05, 0]}>
        <planeGeometry args={[10, 15]} />
        <meshStandardMaterial color={config.floorColor} roughness={0.5} />
      </mesh>

      {/* TƯỜNG DEMO (Có thể đổi màu) */}
      <mesh position={[0, 2.5, -7]}>
        <boxGeometry args={[10, 5, 0.2]} />
        <meshStandardMaterial color={config.wallColor} />
      </mesh>

      {/* ĐÈN TRẦN (Smart Light) */}
      <pointLight position={[0, 4, 0]} intensity={config.lights ? 2 : 0} distance={10} color="#f1c40f" />
      <mesh position={[0, 4.2, 0]} onClick={onToggleLight} 
            onPointerOver={()=>document.body.style.cursor='pointer'} onPointerOut={()=>document.body.style.cursor='auto'}>
        <sphereGeometry args={[0.3]} />
        <meshBasicMaterial color={config.lights ? "#f1c40f" : "#555"} />
      </mesh>

      {/* BIỂN BÁO TRẠNG THÁI */}
      <group position={[-3, 1.5, 6]} onClick={isBroker ? onChangeStatus : null}>
        <mesh>
            <boxGeometry args={[1.5, 0.6, 0.1]} />
            <meshStandardMaterial color={config.status === "SOLD" ? "#c0392b" : "#27ae60"} />
        </mesh>
        <Text position={[0, 0, 0.06]} fontSize={0.25} color="white" fontWeight="bold">
            {config.status}
        </Text>
      </group>
    </group>
  );
}

// --- UI: Hợp đồng & Vay (Smart Contract) ---
function ContractModal({ onClose }) {
  return (
    <div style={{
      position: "fixed", top: "50%", left: "50%", transform: "translate(-50%, -50%)",
      background: "white", padding: "30px", borderRadius: "15px", boxShadow: "0 20px 50px rgba(0,0,0,0.5)",
      zIndex: 1000, width: "500px", fontFamily: "Segoe UI"
    }}>
      <h2 style={{color: "#27ae60", textAlign: "center"}}>🎉 GIAO DỊCH THÀNH CÔNG!</h2>
      <div style={{background: "#f8f9fa", padding: "15px", borderRadius: "8px", margin: "15px 0"}}>
        <h4 style={{margin: "0 0 10px 0"}}>📜 Smart Contract (Blockchain Mockup)</h4>
        <p style={{fontSize: "12px", fontFamily: "monospace", color: "#555", wordBreak: "break-all"}}>
          Hash: 0x8f3a2c...9d1e<br/>
          Block: #182934<br/>
          Status: <span style={{color: "green"}}>VERIFIED</span>
        </p>
      </div>

      <h4 style={{marginBottom: "10px"}}>💰 Gói Vay Ưu Đãi (Techcombank/VIB)</h4>
      <div style={{display: "flex", gap: "10px"}}>
        <button style={{flex: 1, padding: "10px", border: "1px solid #ddd", borderRadius: "5px", cursor: "pointer"}}>
            <b>12 Tháng</b><br/><small>LS 0%</small>
        </button>
        <button style={{flex: 1, padding: "10px", border: "1px solid #2980b9", background:"#eaf2f8", borderRadius: "5px", cursor: "pointer"}}>
            <b>24 Tháng</b><br/><small>LS 7.5%</small>
        </button>
        <button style={{flex: 1, padding: "10px", border: "1px solid #ddd", borderRadius: "5px", cursor: "pointer"}}>
            <b>35 Năm</b><br/><small>LS 10%</small>
        </button>
      </div>
      
      <button onClick={onClose} style={{
        width: "100%", marginTop: "20px", padding: "12px", background: "#2c3e50", color: "white", border: "none", borderRadius: "8px", cursor: "pointer", fontWeight: "bold"
      }}>Đóng & Nhận Nhà</button>
    </div>
  );
}

// --- MAIN APP ---
export default function App() {
  const [players, setPlayers] = useState({});
  const [myId, setMyId] = useState(null);
  const [config, setConfig] = useState({ status: "FOR SALE", env: "city", lights: false, wallColor: "#fff", floorColor: "#777" });
  
  // Chat State
  const [chatList, setChatList] = useState([]);
  const [msgText, setMsgText] = useState("");
  const [activeTab, setActiveTab] = useState("public"); // 'public' or socketID of broker/client
  const [showContract, setShowContract] = useState(false);

  useEffect(() => {
    socket.on("connect", () => setMyId(socket.id));
    
    socket.on("initHouse", (cfg) => setConfig(cfg));
    socket.on("syncHouseConfig", (cfg) => {
        setConfig(cfg);
        if(cfg.status === "SOLD") setShowContract(true);
    });

    socket.on("updatePlayers", (p) => setPlayers(p));
    
    socket.on("playerMoved", ({ id, position, rotation }) => {
      setPlayers(prev => ({
        ...prev,
        [id]: { ...prev[id], position, rotation }
      }));
    });

    socket.on("receiveMessage", (msg) => {
        setChatList(prev => [...prev, msg]);
    });

    return () => { socket.off("connect"); socket.off("updatePlayers"); socket.off("playerMoved"); socket.off("receiveMessage"); socket.off("syncHouseConfig"); };
  }, []);

  // Actions
  const handleMove = (pos, rot) => socket.emit("playerMove", { position: pos, rotation: rot });
  
  const sendMessage = () => {
    if (!msgText.trim()) return;
    const toId = activeTab === "public" ? null : activeTab;
    socket.emit("sendMessage", { text: msgText, toId });
    setMsgText("");
  };

  const updateHouse = (key, value) => {
    // Chỉ Broker mới được chỉnh, nhưng ở đây demo nên để client chỉnh màu sắc cho vui (trừ status)
    if (key === 'status' && players[myId]?.role !== 'broker') return alert("Chỉ Sale mới được chốt đơn!");
    socket.emit("updateHouseConfig", { [key]: value });
  };

  // Lọc tin nhắn theo Tab
  const filteredChat = chatList.filter(msg => {
    if (activeTab === "public") return !msg.isPrivate;
    // Tab riêng: Hiện tin nhắn của mình gửi cho họ HOẶC họ gửi cho mình
    return (msg.id === activeTab || (msg.id === myId && msg.isPrivate)); // Logic đơn giản hóa
  });

  // Tìm Broker ID để khách chat riêng
  const brokerId = Object.keys(players).find(key => players[key].role === 'broker');
  const isBroker = players[myId]?.role === 'broker';

  return (
    <div style={{ width: "100vw", height: "100vh", background: "#111", fontFamily: "Segoe UI" }}>
      
      {/* 3D SCENE */}
      <Canvas shadows camera={{ position: [0, 1.7, 5], fov: 60 }}>
        <Environment preset={config.env === 'city' ? 'city' : 'night'} background blur={0.5} />
        {config.env === 'night' && <Stars />}
        <ambientLight intensity={0.4} />
        
        {/* Controls: WASD */}
        <FirstPersonController onMove={handleMove} />

        {/* Sàn đất nền tổng thể */}
        <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.1, 0]}>
          <planeGeometry args={[100, 100]} />
          <meshStandardMaterial color="#34495e" />
        </mesh>

        <CustomizableHouse 
            config={config} 
            onToggleLight={() => updateHouse('lights', !config.lights)}
            onChangeStatus={() => updateHouse('status', config.status === "FOR SALE" ? "SOLD" : "FOR SALE")}
            isBroker={isBroker}
        />

        {/* Render các người chơi khác */}
        {Object.values(players).map(p => {
          if (p.id === myId) return null; // Không render chính mình
          return <OtherPlayer key={p.id} {...p} />;
        })}
      </Canvas>

      {/* UI: MODAL HỢP ĐỒNG */}
      {showContract && <ContractModal onClose={() => setShowContract(false)} />}

      {/* UI: DESIGN PANEL (Chuyển đổi số) */}
      <div style={{ position: "absolute", top: 20, right: 20, background: "rgba(255,255,255,0.9)", padding: "15px", borderRadius: "10px" }}>
        <h4 style={{margin: "0 0 10px 0"}}>🎨 Thiết kế căn hộ</h4>
        <div style={{marginBottom: "10px"}}>
            <small>Màu Tường:</small><br/>
            {["#f5f6fa", "#f1c40f", "#e74c3c", "#3498db"].map(c => (
                <button key={c} onClick={() => updateHouse('wallColor', c)} 
                    style={{width: 20, height: 20, background: c, border: "1px solid #ccc", margin: "2px", cursor: "pointer"}} />
            ))}
        </div>
        <div>
            <small>Màu Sàn:</small><br/>
            {["#7f8c8d", "#8e44ad", "#27ae60", "#d35400"].map(c => (
                <button key={c} onClick={() => updateHouse('floorColor', c)} 
                    style={{width: 20, height: 20, background: c, border: "1px solid #ccc", margin: "2px", cursor: "pointer"}} />
            ))}
        </div>
        <div style={{marginTop: "10px", borderTop: "1px solid #ccc", paddingTop: "5px"}}>
            <small>Môi trường:</small>
            <button onClick={() => updateHouse('env', config.env==='city'?'night':'city')} style={{marginLeft: 5, cursor:"pointer"}}>
                {config.env==='city' ? '🌙 Đêm' : '☀️ Ngày'}
            </button>
        </div>
      </div>

      {/* UI: CHAT & USERS */}
      <div style={{ position: "absolute", bottom: 20, left: 20, width: 320, height: 400, background: "rgba(255,255,255,0.95)", borderRadius: "10px", display: "flex", flexDirection: "column", boxShadow: "0 10px 30px rgba(0,0,0,0.3)" }}>
        
        {/* TABS */}
        <div style={{display: "flex", borderBottom: "1px solid #ddd"}}>
            <div onClick={() => setActiveTab("public")} 
                 style={{flex: 1, padding: "10px", textAlign: "center", cursor: "pointer", background: activeTab==="public"?"#fff":"#f1f2f6", fontWeight: "bold"}}>
                 💬 Chung
            </div>
            {/* Nếu là khách thì hiện tab chat với Sale, nếu là Sale thì hiện list khách (đơn giản hóa: Sale chat public hoặc chọn user cụ thể - ở đây demo khách chat với Sale) */}
            {!isBroker && brokerId && (
                <div onClick={() => setActiveTab(brokerId)} 
                     style={{flex: 1, padding: "10px", textAlign: "center", cursor: "pointer", background: activeTab===brokerId?"#fff":"#f1f2f6", color: "#d35400", fontWeight: "bold"}}>
                     ⭐ Chat Sale
                </div>
            )}
        </div>

        {/* LIST MESSAGES */}
        <div style={{flex: 1, overflowY: "auto", padding: "10px"}}>
            {filteredChat.map((msg, i) => (
                <div key={i} style={{marginBottom: "8px", textAlign: msg.id === myId ? "right" : "left"}}>
                    <div style={{fontSize: "10px", color: "#888"}}>{msg.name}</div>
                    <span style={{
                        background: msg.id === myId ? "#3498db" : (msg.role==='broker'?"#f39c12":"#ecf0f1"),
                        color: msg.id === myId ? "white" : "black",
                        padding: "5px 10px", borderRadius: "10px", display: "inline-block"
                    }}>
                        {msg.text}
                    </span>
                </div>
            ))}
        </div>

        {/* INPUT */}
        <div style={{padding: "10px", borderTop: "1px solid #ddd", display: "flex"}}>
            <input value={msgText} onChange={e => setMsgText(e.target.value)} onKeyDown={e => e.key === 'Enter' && sendMessage()}
                   placeholder={activeTab==="public" ? "Chat chung..." : "Chat riêng với Sale..."}
                   style={{flex: 1, padding: "8px", borderRadius: "20px", border: "1px solid #ccc", outline: "none"}} />
        </div>
        
        {/* HƯỚNG DẪN */}
        <div style={{padding: "5px 10px", background: "#2c3e50", color: "white", fontSize: "11px", borderBottomLeftRadius: "10px", borderBottomRightRadius: "10px"}}>
            🎮 <b>W A S D</b> để di chuyển | Click đèn để bật/tắt
        </div>
      </div>

    </div>
  );
}