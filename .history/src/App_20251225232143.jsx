import React, { useEffect, useState, useRef } from "react";
import io from "socket.io-client";
import { Canvas, useThree, useFrame } from "@react-three/fiber";
import { PointerLockControls, useGLTF, Text, Billboard, Environment, Html } from "@react-three/drei";
import * as THREE from "three";

const socket = io.connect("http://localhost:3001");

// --- COMPONENT AVATAR (Để nhìn thấy người khác) ---
function OtherPlayer({ position, color, name, role }) {
  return (
    <group position={position}>
      <Billboard position={[0, 2.5, 0]}>
        <Text fontSize={0.3} color={role === "broker" ? "gold" : "white"}>{name}</Text>
      </Billboard>
      <mesh position={[0, 1, 0]}><boxGeometry args={[0.5, 2, 0.5]} /><meshStandardMaterial color={color} /></mesh>
    </group>
  );
}

// --- CONTROLLER NÂNG CẤP: DI CHUYỂN + ZOOM + SYNC REALTIME ---
function ImprovedController() {
  const { camera } = useThree();
  const move = useRef({ w: false, a: false, s: false, d: false });
  const [isLocked, setIsLocked] = useState(false);

  useEffect(() => {
    const handleKey = (e, val) => {
      if (e.code === "KeyW") move.current.w = val;
      if (e.code === "KeyS") move.current.s = val;
      if (e.code === "KeyA") move.current.a = val;
      if (e.code === "KeyD") move.current.d = val;
    };
    
    // Xử lý ZOOM bằng lăn chuột
    const handleWheel = (e) => {
        camera.fov = Math.max(20, Math.min(90, camera.fov + e.deltaY * 0.05));
        camera.updateProjectionMatrix();
    };

    window.addEventListener("keydown", (e) => handleKey(e, true));
    window.addEventListener("keyup", (e) => handleKey(e, false));
    window.addEventListener("wheel", handleWheel);
    return () => {
        window.removeEventListener("keydown", handleKey);
        window.removeEventListener("keyup", handleKey);
        window.removeEventListener("wheel", handleWheel);
    };
  }, [camera]);

  useFrame((state, delta) => {
    const speed = 8 * delta;
    if (move.current.w) camera.translateZ(-speed);
    if (move.current.s) camera.translateZ(speed);
    if (move.current.a) camera.translateX(-speed);
    if (move.current.d) camera.translateX(speed);

    // Gửi vị trí liên tục lên server để người khác thấy mình mượt mà
    if (move.current.w || move.current.s || move.current.a || move.current.d) {
        socket.emit("move", [camera.position.x, 0, camera.position.z]);
    }
  });

  return <PointerLockControls onLock={() => setIsLocked(true)} onUnlock={() => setIsLocked(false)} />;
}

// --- NGÔI NHÀ ---
function SmartHouse() {
    const { scene } = useGLTF("/nha.glb");
    return <primitive object={scene} scale={1} position={[0, 0, 0]} />;
}

// --- APP CHÍNH ---
export default function App() {
  const [players, setPlayers] = useState({});
  const [chatList, setChatList] = useState([]);
  const [message, setMessage] = useState("");
  const [targetId, setTargetId] = useState("all");
  const [myInfo, setMyInfo] = useState({ role: "client" });
  const [showLoan, setShowLoan] = useState(false);
  const chatEndRef = useRef(null);

  useEffect(() => {
    socket.on("updatePlayers", (p) => setPlayers(p));
    socket.on("receiveMessage", (data) => setChatList(prev => [...prev, data]));
    return () => socket.off();
  }, []);

  useEffect(() => { chatEndRef.current?.scrollIntoView({ behavior: "smooth" }); }, [chatList]);

  const sendMessage = () => {
    if(message.trim()){
        socket.emit("sendMessage", { text: message, to: targetId });
        setMessage("");
    }
  };

  return (
    <div style={{ width: "100vw", height: "100vh", position: "relative", background: "#000" }}>
      
      {/* HUD THÔNG TIN */}
      <div style={{ position: "absolute", top: 20, left: 20, zIndex: 10, color: "white", pointerEvents: "none" }}>
        <h2 style={{margin:0}}>NHÀ ĐẤT METAVERSE</h2>
        <p>Vai trò: <b>{players[socket.id]?.role === "broker" ? "👔 SALES ADMIN" : "👤 KHÁCH HÀNG"}</b></p>
        <small>🖱️ Lăn chuột để Zoom In/Out | W-A-S-D để đi bộ</small>
      </div>

      {/* BẢNG VAY NỢ & HỢP ĐỒNG */}
      <div style={{ position: "absolute", top: 20, right: 20, zIndex: 10 }}>
        <button onClick={() => setShowLoan(!showLoan)} style={{padding: "10px", background: "#f39c12", color: "white", border: "none", cursor: "pointer", borderRadius: "5px"}}>
            💰 Hợp đồng & Vay vốn
        </button>
        {showLoan && (
            <div style={{ background: "white", padding: "15px", marginTop: "10px", borderRadius: "8px", width: "220px", color: "black" }}>
                <b>📊 Tài chính</b>
                <div style={{fontSize: "12px", marginTop: "5px"}}>Giá: $500,000 | Lãi: 8%</div>
                <button onClick={() => socket.emit("changeStatus", "SOLD")} style={{width:"100%", marginTop:"10px", background:"#27ae60", color:"white", border:"none", padding:"5px", cursor:"pointer"}}>KÝ HỢP ĐỒNG</button>
            </div>
        )}
      </div>

      <Canvas camera={{ position: [0, 5, 20], fov: 60 }}>
        <Environment preset="city" background />
        <ambientLight intensity={0.5} />
        
        {/* Mặt đất */}
        <mesh rotation={[-Math.PI / 2, 0, 0]}>
          <planeGeometry args={[100, 100]} />
          <meshStandardMaterial color="#444" />
        </mesh>

        <SmartHouse />
        <ImprovedController />

        {/* Hiển thị những người chơi khác REAL-TIME */}
        {Object.keys(players).map((id) => (
          id !== socket.id && (
            <OtherPlayer 
                key={id} 
                position={players[id].position} 
                color={players[id].color} 
                name={players[id].name} 
                role={players[id].role} 
            />
          )
        ))}
      </Canvas>

      {/* BOX CHAT NÂNG CAO */}
      <div style={{ position: "absolute", bottom: 20, left: 20, width: "300px", height: "350px", background: "rgba(255,255,255,0.9)", borderRadius: "10px", padding: "10px", display: "flex", flexDirection: "column" }}>
        <div style={{ flex: 1, overflowY: "auto", marginBottom: "5px" }}>
          {chatList.map((msg, i) => (
            <div key={i} style={{ fontSize: "12px", marginBottom: "3px", color: msg.isPrivate ? "purple" : "black" }}>
              <b>{msg.name}:</b> {msg.text}
            </div>
          ))}
          <div ref={chatEndRef} />
        </div>
        
        <select value={targetId} onChange={e => setTargetId(e.target.value)} style={{fontSize:"11px", marginBottom:"5px"}}>
            <option value="all">Gửi tất cả</option>
            {Object.keys(players).map(id => id !== socket.id && <option key={id} value={id}>Chat riêng: {players[id].name}</option>)}
        </select>

        <div style={{ display: "flex", gap: "5px" }}>
          <input value={message} onChange={e => setMessage(e.target.value)} onKeyDown={e => e.key === "Enter" && sendMessage()} placeholder="Nhắn tin..." style={{ flex: 1 }} />
          <button onClick={sendMessage}>Gửi</button>
        </div>
      </div>
    </div>
  );
}