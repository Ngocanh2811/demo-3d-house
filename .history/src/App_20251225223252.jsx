import React, { useEffect, useState, useRef } from "react";
import io from "socket.io-client";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { useGLTF, Text, Billboard, Environment, Stars, OrbitControls } from "@react-three/drei";
import * as THREE from "three";

const socket = io.connect("http://localhost:3001");

// --- 1. LOGIC DI CHUYỂN (WASD) ---
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

// --- 2. CONTROLLER GÓC NHÌN THỨ NHẤT (WALK MODE) ---
function FirstPersonController({ onMove }) {
  const { camera } = useThree();
  const { forward, backward, left, right } = usePlayerControls();
  const speed = 0.15;

  useFrame(() => {
    const direction = new THREE.Vector3();
    const frontVector = new THREE.Vector3(0, 0, (backward ? 1 : 0) - (forward ? 1 : 0));
    const sideVector = new THREE.Vector3((left ? 1 : 0) - (right ? 1 : 0), 0, 0);

    direction.subVectors(frontVector, sideVector).normalize().multiplyScalar(speed).applyEuler(camera.rotation);

    camera.position.x += direction.x;
    camera.position.z += direction.z;
    camera.position.y = 1.7; // Giữ độ cao tầm mắt người

    if (forward || backward || left || right) {
      onMove([camera.position.x, camera.position.y, camera.position.z], camera.rotation.y);
    }
  });
  return null;
}

// --- 3. AVATAR NGƯỜI KHÁC ---
function OtherPlayer({ position, color, name, role }) {
  return (
    <group position={position}>
      <Billboard position={[0, 2.3, 0]}>
        <Text fontSize={0.25} color={role==="broker"?"#e67e22":"white"} outlineWidth={0.02} outlineColor="black">
          {name} {role==="broker" && "⭐"}
        </Text>
      </Billboard>
      <mesh position={[0, 0.9, 0]}>
        <capsuleGeometry args={[0.3, 1, 4]} />
        <meshStandardMaterial color={color} />
      </mesh>
      <mesh position={[0, 1.2, 0.25]}>
        <boxGeometry args={[0.4, 0.1, 0.1]} />
        <meshStandardMaterial color="black" />
      </mesh>
    </group>
  );
}

// --- 4. NGÔI NHÀ (ĐÃ FIX ĐỘ CAO SÀN) ---
function CustomizableHouse({ config, onToggleLight, onChangeStatus, isBroker }) {
  const { scene } = useGLTF("/nha.glb"); 
  
  return (
    <group>
      {/* Model gốc */}
      <primitive object={scene} scale={[0.8, 0.8, 0.8]} position={[0, 0, 0]} />

      {/* SÀN NHÀ (Nâng nhẹ y=0.02 để đè lên nền đất, nhưng thấp hơn tường) */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.02, 0]}>
        <planeGeometry args={[10, 15]} />
        <meshStandardMaterial color={config.floorColor} roughness={0.5} />
      </mesh>

      {/* TƯỜNG DEMO */}
      <mesh position={[0, 2.5, -7]}>
        <boxGeometry args={[10, 5, 0.2]} />
        <meshStandardMaterial color={config.wallColor} />
      </mesh>

      {/* ĐÈN */}
      <pointLight position={[0, 4, 0]} intensity={config.lights ? 2 : 0} distance={15} color="#f1c40f" />
      <mesh position={[0, 4.2, 0]} onClick={onToggleLight} 
            onPointerOver={()=>document.body.style.cursor='pointer'} onPointerOut={()=>document.body.style.cursor='auto'}>
        <sphereGeometry args={[0.3]} />
        <meshBasicMaterial color={config.lights ? "#f1c40f" : "#555"} />
      </mesh>

      {/* BIỂN BÁO */}
      <group position={[-3, 1.5, 6]} onClick={isBroker ? onChangeStatus : null}
             onPointerOver={()=>isBroker && (document.body.style.cursor='pointer')} onPointerOut={()=>document.body.style.cursor='auto'}>
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

// --- 5. UI HỢP ĐỒNG ---
function ContractModal({ onClose }) {
  return (
    <div style={{
      position: "fixed", top: "50%", left: "50%", transform: "translate(-50%, -50%)",
      background: "white", padding: "30px", borderRadius: "15px", boxShadow: "0 20px 50px rgba(0,0,0,0.5)",
      zIndex: 1000, width: "400px", fontFamily: "Segoe UI"
    }}>
      <h2 style={{color: "#27ae60", textAlign: "center", margin: 0}}>🎉 CHỐT ĐƠN!</h2>
      <p style={{textAlign: "center", color: "#555"}}>Hợp đồng thông minh đã được khởi tạo.</p>
      
      <div style={{display: "flex", gap: "10px", marginTop: "20px"}}>
        <button style={{flex: 1, padding: "10px", background:"#eee", border: "none", borderRadius: "5px"}}>Vay 12T (0%)</button>
        <button style={{flex: 1, padding: "10px", background:"#d4e6f1", border: "1px solid #2980b9", borderRadius: "5px", fontWeight:"bold"}}>Vay 24T (7%)</button>
      </div>
      <button onClick={onClose} style={{width: "100%", marginTop: "15px", padding: "10px", background: "#2c3e50", color: "white", border: "none", borderRadius: "5px", cursor: "pointer"}}>Xác nhận</button>
    </div>
  );
}

// --- MAIN APP ---
export default function App() {
  const [players, setPlayers] = useState({});
  const [myId, setMyId] = useState(null);
  const [config, setConfig] = useState({ status: "FOR SALE", env: "city", lights: false, wallColor: "#fff", floorColor: "#777" });
  
  // State Camera
  const [viewMode, setViewMode] = useState("orbit"); // 'orbit' (Sa bàn) hoặc 'walk' (Đi bộ)

  // Chat State
  const [chatList, setChatList] = useState([]);
  const [msgText, setMsgText] = useState("");
  const [activeTab, setActiveTab] = useState("public");
  const [showContract, setShowContract] = useState(false);

  useEffect(() => {
    socket.on("connect", () => setMyId(socket.id));
    socket.on("initHouse", (cfg) => setConfig(cfg));
    socket.on("syncHouseConfig", (cfg) => { setConfig(cfg); if(cfg.status === "SOLD") setShowContract(true); });
    socket.on("updatePlayers", (p) => setPlayers(p));
    socket.on("playerMoved", ({ id, position, rotation }) => {
      setPlayers(prev => ({ ...prev, [id]: { ...prev[id], position, rotation } }));
    });
    socket.on("receiveMessage", (msg) => setChatList(prev => [...prev, msg]));
    return () => { socket.off("connect"); socket.off("updatePlayers"); socket.off("playerMoved"); socket.off("receiveMessage"); socket.off("syncHouseConfig"); };
  }, []);

  const handleMove = (pos, rot) => socket.emit("playerMove", { position: pos, rotation: rot });
  
  const sendMessage = () => {
    if (!msgText.trim()) return;
    const toId = activeTab === "public" ? null : activeTab;
    socket.emit("sendMessage", { text: msgText, toId });
    setMsgText("");
  };

  const updateHouse = (key, value) => {
    if (key === 'status' && players[myId]?.role !== 'broker') return alert("Chỉ Sale mới được chốt đơn!");
    socket.emit("updateHouseConfig", { [key]: value });
  };

  const filteredChat = chatList.filter(msg => {
    if (activeTab === "public") return !msg.isPrivate;
    return (msg.id === activeTab || (msg.id === myId && msg.isPrivate));
  });

  const brokerId = Object.keys(players).find(key => players[key].role === 'broker');
  const isBroker = players[myId]?.role === 'broker';

  return (
    <div style={{ width: "100vw", height: "100vh", background: "#111", fontFamily: "Segoe UI", overflow: "hidden" }}>
      
      {/* NÚT CHUYỂN CHẾ ĐỘ CAMERA */}
      <div style={{ position: "absolute", top: 20, left: 20, zIndex: 100 }}>
        <button 
            onClick={() => setViewMode(prev => prev === "orbit" ? "walk" : "orbit")}
            style={{
                padding: "12px 20px", 
                background: viewMode === "orbit" ? "#3498db" : "#e67e22", 
                color: "white", border: "none", borderRadius: "30px", 
                fontWeight: "bold", cursor: "pointer", boxShadow: "0 4px 10px rgba(0,0,0,0.3)",
                display: "flex", alignItems: "center", gap: "8px"
            }}>
            {viewMode === "orbit" ? "🚁 Chế độ Sa Bàn (Zoom/Xoay)" : "🚶 Chế độ Đi Bộ (WASD)"}
        </button>
        <div style={{marginTop: "5px", color: "white", fontSize: "12px", textShadow: "1px 1px 2px black"}}>
            {viewMode === "orbit" ? "Dùng chuột để xoay & lăn chuột để zoom" : "Dùng phím W A S D để di chuyển"}
        </div>
      </div>

      {/* 3D SCENE */}
      <Canvas shadows camera={{ position: [8, 8, 15], fov: 50 }}>
        <Environment preset={config.env === 'city' ? 'city' : 'night'} background blur={0.5} />
        {config.env === 'night' && <Stars />}
        <ambientLight intensity={0.5} />
        <directionalLight position={[10, 20, 10]} intensity={1} castShadow />
        
        {/* ĐIỀU KHIỂN CAMERA */}
        {viewMode === "orbit" ? (
            // Cho phép xoay vòng tròn, zoom in/out thoải mái
            <OrbitControls 
                enableZoom={true} 
                maxPolarAngle={Math.PI / 2 - 0.05} // Không cho chui xuống đất
                minDistance={2} 
                maxDistance={50} 
            />
        ) : (
            // Đi bộ góc nhìn thứ nhất
            <FirstPersonController onMove={handleMove} />
        )}

        {/* NỀN ĐẤT (ĐÃ HẠ THẤP XUỐNG -0.5 ĐỂ KHÔNG BỊ LẸM) */}
        <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.5, 0]} receiveShadow>
          <planeGeometry args={[100, 100]} />
          <meshStandardMaterial color="#34495e" />
        </mesh>

        {/* LƯỚI TỌA ĐỘ (Giúp dễ nhìn không gian hơn) */}
        <gridHelper args={[100, 100, 0xffffff, 0x555555]} position={[0, -0.49, 0]} />

        <CustomizableHouse 
            config={config} 
            onToggleLight={() => updateHouse('lights', !config.lights)}
            onChangeStatus={() => updateHouse('status', config.status === "FOR SALE" ? "SOLD" : "FOR SALE")}
            isBroker={isBroker}
        />

        {Object.values(players).map(p => {
          if (p.id === myId) return null;
          return <OtherPlayer key={p.id} {...p} />;
        })}
      </Canvas>

      {showContract && <ContractModal onClose={() => setShowContract(false)} />}

      {/* DESIGN PANEL */}
      <div style={{ position: "absolute", top: 20, right: 20, background: "rgba(255,255,255,0.9)", padding: "15px", borderRadius: "10px" }}>
        <h4 style={{margin: "0 0 10px 0"}}>🎨 Thiết kế</h4>
        <div style={{marginBottom: "5px"}}>
            <small>Tường:</small>
            {["#f5f6fa", "#f1c40f", "#e74c3c", "#3498db"].map(c => (
                <button key={c} onClick={() => updateHouse('wallColor', c)} style={{width: 20, height: 20, background: c, border: "1px solid #ccc", margin: "2px", cursor: "pointer"}} />
            ))}
        </div>
        <div>
            <small>Sàn:</small>
            {["#7f8c8d", "#8e44ad", "#27ae60", "#d35400"].map(c => (
                <button key={c} onClick={() => updateHouse('floorColor', c)} style={{width: 20, height: 20, background: c, border: "1px solid #ccc", margin: "2px", cursor: "pointer"}} />
            ))}
        </div>
        <button onClick={() => updateHouse('env', config.env==='city'?'night':'city')} style={{marginTop: "10px", width: "100%", cursor:"pointer"}}>
            {config.env==='city' ? '🌙 Chế độ Đêm' : '☀️ Chế độ Ngày'}
        </button>
      </div>

      {/* CHAT BOX */}
      <div style={{ position: "absolute", bottom: 20, left: 20, width: 300, height: 350, background: "rgba(255,255,255,0.95)", borderRadius: "10px", display: "flex", flexDirection: "column", boxShadow: "0 10px 30px rgba(0,0,0,0.3)" }}>
        <div style={{display: "flex", borderBottom: "1px solid #ddd"}}>
            <div onClick={() => setActiveTab("public")} style={{flex: 1, padding: "10px", textAlign: "center", cursor: "pointer", background: activeTab==="public"?"#fff":"#f1f2f6", fontWeight: "bold"}}>💬 Chung</div>
            {!isBroker && brokerId && (
                <div onClick={() => setActiveTab(brokerId)} style={{flex: 1, padding: "10px", textAlign: "center", cursor: "pointer", background: activeTab===brokerId?"#fff":"#f1f2f6", color: "#d35400", fontWeight: "bold"}}>⭐ Sale</div>
            )}
        </div>
        <div style={{flex: 1, overflowY: "auto", padding: "10px"}}>
            {filteredChat.map((msg, i) => (
                <div key={i} style={{marginBottom: "8px", textAlign: msg.id === myId ? "right" : "left"}}>
                    <div style={{fontSize: "10px", color: "#888"}}>{msg.name}</div>
                    <span style={{background: msg.id === myId ? "#3498db" : "#ecf0f1", color: msg.id === myId ? "white" : "black", padding: "5px 10px", borderRadius: "10px", display: "inline-block", fontSize: "13px"}}>
                        {msg.text}
                    </span>
                </div>
            ))}
        </div>
        <div style={{padding: "10px", borderTop: "1px solid #ddd", display: "flex"}}>
            <input value={msgText} onChange={e => setMsgText(e.target.value)} onKeyDown={e => e.key === 'Enter' && sendMessage()} placeholder="..." style={{flex: 1, padding: "5px", borderRadius: "15px", border: "1px solid #ccc", outline: "none"}} />
        </div>
      </div>

    </div>
  );
}