import React, { useEffect, useState, useRef } from "react";
import io from "socket.io-client";
import { Canvas, useThree, useFrame } from "@react-three/fiber";
import { PointerLockControls, useGLTF, Text, Billboard, Environment, Html, Stars } from "@react-three/drei";
import * as THREE from "three";

const socket = io.connect("http://localhost:3001");

// --- 1. SMART CONTRACT & LOAN UI (HTML OVERLAY) ---
function FinancePanel({ houseStatus, onContractSign }) {
  const [loanAmount, setLoanAmount] = useState(400000);
  const interest = 0.08; // 8% per year
  const monthly = (loanAmount * (1 + interest)) / 120; // Giả định vay 10 năm

  return (
    <div style={{ background: "rgba(0, 0, 0, 0.85)", color: "white", padding: "20px", borderRadius: "10px", width: "300px", fontFamily: "sans-serif" }}>
      <h3 style={{ borderBottom: "1px solid gold", color: "gold" }}>📄 Hợp đồng & Vay vốn</h3>
      <p>Trạng thái: <b>{houseStatus}</b></p>
      
      <div style={{ marginTop: "10px" }}>
        <label>Khoản vay dự kiến ($):</label>
        <input type="range" min="100000" max="500000" step="10000" value={loanAmount} onChange={(e) => setLoanAmount(e.target.value)} style={{ width: "100%" }} />
        <p style={{ fontSize: "14px" }}>Vay: ${Number(loanAmount).toLocaleString()}</p>
        <p style={{ fontSize: "12px", color: "#2ecc71" }}>Trả góp: ~${monthly.toFixed(0)}/tháng (Lãi 8%)</p>
      </div>

      <button 
        onClick={onContractSign}
        disabled={houseStatus === "SOLD"}
        style={{ width: "100%", padding: "10px", marginTop: "10px", background: houseStatus === "SOLD" ? "grey" : "#e67e22", color: "white", border: "none", borderRadius: "5px", cursor: "pointer" }}
      >
        {houseStatus === "SOLD" ? "ĐÃ KÝ HỢP ĐỒNG" : "✍️ KÝ HỢP ĐỒNG THÔNG MINH"}
      </button>
    </div>
  );
}

// --- 2. AVATAR & POSITIONS ---
function Human({ position, color, name, role }) {
  return (
    <group position={position}>
      <Billboard position={[0, 2.6, 0]}>
        <Text fontSize={0.3} color={role === "broker" ? "#f1c40f" : "white"}>{name} {role === "broker" ? "(SALES)" : ""}</Text>
      </Billboard>
      <mesh position={[0, 1.6, 0]}><boxGeometry args={[0.5, 0.5, 0.5]} /><meshStandardMaterial color={role === "broker" ? "#f1c40f" : color} /></mesh>
      <mesh position={[0, 0.75, 0]}><boxGeometry args={[0.6, 1, 0.3]} /><meshStandardMaterial color={color} /></mesh>
    </group>
  );
}

function FirstPersonController({ setLocationName }) {
  const { camera } = useThree();
  const moveKeys = useRef({ w: false, a: false, s: false, d: false });
  const lastLocation = useRef("");

  useEffect(() => {
    const handleKey = (e, val) => {
      if (e.code === "KeyW") moveKeys.current.w = val;
      if (e.code === "KeyA") moveKeys.current.a = val;
      if (e.code === "KeyS") moveKeys.current.s = val;
      if (e.code === "KeyD") moveKeys.current.d = val;
    };
    window.addEventListener("keydown", (e) => handleKey(e, true));
    window.addEventListener("keyup", (e) => handleKey(e, false));
  }, []);

  useFrame((_, delta) => {
    const speed = 8 * delta;
    if (moveKeys.current.w) camera.translateZ(-speed);
    if (moveKeys.current.s) camera.translateZ(speed);
    if (moveKeys.current.a) camera.translateX(-speed);
    if (moveKeys.current.d) camera.translateX(speed);
    camera.position.y = 1.6;

    // Kiểm tra vị trí
    let currentLocation = "Sân vườn";
    const distToHouse = camera.position.distanceTo(new THREE.Vector3(0, 0, 0));
    if (distToHouse < 5) currentLocation = "Đang ở trong Nhà";
    else if (camera.position.z > 8) currentLocation = "Đang ở Cổng";

    if (currentLocation !== lastLocation.current) {
      lastLocation.current = currentLocation;
      setLocationName(currentLocation);
      socket.emit("updateLocation", currentLocation);
    }
    
    socket.emit("move", [camera.position.x, 0, camera.position.z]);
  });

  return <PointerLockControls />;
}

// --- APP CHÍNH ---
export default function App() {
  const [players, setPlayers] = useState({});
  const [chatList, setChatList] = useState([]);
  const [message, setMessage] = useState("");
  const [targetId, setTargetId] = useState("all"); // Để nhắn tin riêng
  const [myInfo, setMyInfo] = useState({ id: "", role: "client", name: "" });
  const [locationName, setLocationName] = useState("Sân vườn");
  const [houseStatus, setHouseStatus] = useState("FOR SALE");
  const [showFinance, setShowFinance] = useState(false);

  useEffect(() => {
    socket.on("updatePlayers", (p) => {
      setPlayers(p);
      if (p[socket.id]) setMyInfo(p[socket.id]);
    });
    socket.on("receiveMessage", (data) => setChatList((prev) => [...prev, data]));
    socket.on("updateHouseStatus", (s) => setHouseStatus(s));

    return () => socket.off();
  }, []);

  const sendMessage = () => {
    if (!message.trim()) return;
    socket.emit("sendMessage", { text: message, to: targetId });
    setMessage("");
  };

  const handleSignContract = () => {
    if (myInfo.role === "broker") {
      alert("Bạn là Sales, hãy đợi khách hàng ký!");
    } else {
      socket.emit("changeStatus", "SOLD");
      setShowFinance(false);
    }
  };

  return (
    <div style={{ width: "100vw", height: "100vh", position: "relative", background: "#000" }}>
      
      {/* HUD Thông tin */}
      <div style={{ position: "absolute", top: 20, right: 20, zIndex: 10, color: "white", textAlign: "right", pointerEvents: "none" }}>
        <h2 style={{ margin: 0 }}>{myInfo.role === "broker" ? "🏆 BẠN LÀ SALES" : "👤 KHÁCH HÀNG"}</h2>
        <p>Vị trí: <b style={{ color: "#f1c40f" }}>{locationName}</b></p>
      </div>

      {/* Panel Tài chính/Hợp đồng */}
      <div style={{ position: "absolute", top: 20, left: 20, zIndex: 10 }}>
        <button onClick={() => setShowFinance(!showFinance)} style={{ padding: "10px", cursor: "pointer", background: "gold" }}>
          {showFinance ? "✖ Đóng Panel" : "💰 Hợp đồng & Vay"}
        </button>
        {showFinance && <FinancePanel houseStatus={houseStatus} onContractSign={handleSignContract} />}
      </div>

      <Canvas shadows camera={{ position: [0, 1.6, 10] }}>
        <Environment preset="city" background />
        <ambientLight intensity={0.5} />
        <mesh rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
          <planeGeometry args={[100, 100]} />
          <meshStandardMaterial color="#333" />
        </mesh>

        <FirstPersonController setLocationName={setLocationName} />
        
        {/* Render những người chơi khác */}
        {Object.entries(players).map(([id, p]) => (
          id !== socket.id && <Human key={id} position={p.position} color={p.color} name={p.name} role={p.role} />
        ))}

        {/* Ngôi nhà giả định */}
        <mesh position={[0, 1, 0]}>
          <boxGeometry args={[4, 2, 4]} />
          <meshStandardMaterial color="white" opacity={0.5} transparent />
        </mesh>
      </Canvas>

      {/* BOX CHAT NÂNG CAO */}
      <div style={{ position: "absolute", bottom: 20, left: 20, width: "350px", height: "450px", background: "rgba(255,255,255,0.9)", borderRadius: "10px", display: "flex", flexDirection: "column", padding: "10px", boxShadow: "0 0 20px rgba(0,0,0,0.5)" }}>
        <div style={{ flex: 1, overflowY: "auto", fontSize: "13px" }}>
          {chatList.map((msg, i) => (
            <div key={i} style={{ marginBottom: "8px", color: msg.isPrivate ? "#8e44ad" : "black" }}>
              <b>{msg.name} {msg.isPrivate ? "[Riêng]" : ""}:</b> {msg.text}
              <div style={{ fontSize: "10px", color: "grey" }}>{msg.location}</div>
            </div>
          ))}
        </div>
        
        <div style={{ display: "flex", flexDirection: "column", gap: "5px" }}>
          <select value={targetId} onChange={(e) => setTargetId(e.target.value)} style={{ padding: "5px" }}>
            <option value="all">Gửi tất cả mọi người</option>
            {Object.entries(players).map(([id, p]) => (
              id !== socket.id && <option key={id} value={id}>Nhắn riêng: {p.name}</option>
            ))}
          </select>
          <div style={{ display: "flex", gap: "5px" }}>
            <input value={message} onChange={(e) => setMessage(e.target.value)} onKeyDown={(e) => e.key === "Enter" && sendMessage()} placeholder="Nhập tin nhắn..." style={{ flex: 1, padding: "8px" }} />
            <button onClick={sendMessage} style={{ padding: "8px", background: "#2980b9", color: "white", border: "none" }}>Gửi</button>
          </div>
        </div>
      </div>
    </div>
  );
}