import React, { useEffect, useState, useRef } from "react";
import io from "socket.io-client";
import { Canvas, useThree, useFrame } from "@react-three/fiber";
import { PointerLockControls, useGLTF, Text, Billboard, Environment, Html, Stars } from "@react-three/drei";
import * as THREE from "three";

const socket = io.connect("http://localhost:3001");

// --- 1. MẶT TRỜI / MẶT TRĂNG ---
function CelestialBody({ isNight }) {
  return (
    <group>
      {isNight && <Stars radius={100} depth={50} count={5000} factor={4} saturation={0} fade speed={1} />}
      <mesh position={[20, 20, -40]}>
        <sphereGeometry args={[4, 32, 32]} />
        <meshBasicMaterial color={isNight ? "#f5f6fa" : "#f0932b"} />
        <pointLight intensity={isNight ? 0.5 : 2} distance={100} color={isNight ? "#dcdde1" : "#ffbe76"} />
      </mesh>
    </group>
  );
}

// --- 2. ĐÈN SÂN VƯỜN ---
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

// --- 3. BIỂN BÁO ---
function StatusSign({ position, role, status }) {
  const handleClick = (e) => {
    e.stopPropagation();
    if (role !== "broker") {
      alert("⚠️ CHỈ SALES (ADMIN) MỚI ĐƯỢC THAY ĐỔI TRẠNG THÁI!");
      return;
    }
    const newStatus = status === "FOR SALE" ? "SOLD" : "FOR SALE";
    socket.emit("changeStatus", newStatus);
  };

  return (
    <group position={position} onClick={handleClick}>
      <mesh position={[0, 1, 0]}><cylinderGeometry args={[0.05, 0.05, 2]} /><meshStandardMaterial color="#333" /></mesh>
      <mesh position={[0, 2, 0]}><boxGeometry args={[1.5, 0.8, 0.1]} /><meshStandardMaterial color={status === "SOLD" ? "#c0392b" : "#27ae60"} /></mesh>
      <Text position={[0, 2, 0.06]} fontSize={0.3} color="white" fontWeight="bold">{status}</Text>
    </group>
  );
}

// --- 4. NGÔI NHÀ ---
function SmartHouse() {
  const { scene } = useGLTF("/nha.glb");
  const [showInfo, setShowInfo] = useState(false);

  return (
    <group position={[0, 1.6, 0]}>
      <primitive object={scene} scale={[0.8, 0.8, 0.8]} />
      <mesh position={[2, 3, 2]} onClick={() => setShowInfo(!showInfo)}>
        <sphereGeometry args={[0.3, 16, 16]} />
        <meshBasicMaterial color="#ff4757" />
        <Billboard position={[0, 0.6, 0]}><Text fontSize={0.3} color="white">Info</Text></Billboard>
      </mesh>

      {showInfo && (
        <Html position={[2, 4, 2]} center>
          <div style={{ background: "white", padding: "10px", borderRadius: "8px", width: "180px", border: "2px solid #2980b9" }}>
            <h4 style={{margin:0}}>🏡 Biệt Thự</h4>
            <p style={{fontSize:"12px"}}>Giá: $500,000</p>
            <button onClick={() => setShowInfo(false)}>Đóng</button>
          </div>
        </Html>
      )}
    </group>
  );
}

// --- 5. AVATAR ---
function Human({ position, color, name, role }) {
  return (
    <group position={position}>
      <Billboard position={[0, 2.6, 0]}>
        <Text fontSize={0.3} color={role === "broker" ? "#f1c40f" : "white"} outlineWidth={0.03} outlineColor="black">{name}</Text>
      </Billboard>
      <mesh position={[0, 1.6, 0]}><boxGeometry args={[0.5, 0.5, 0.5]} /><meshStandardMaterial color={role === "broker" ? "#f1c40f" : color} /></mesh>
      <mesh position={[0, 0.75, 0]}><boxGeometry args={[0.6, 1, 0.3]} /><meshStandardMaterial color={color} /></mesh>
    </group>
  );
}

// --- 6. CONTROLLER ---
function FirstPersonController() {
  const { camera } = useThree();
  const move = useRef({ forward: false, backward: false, left: false, right: false });

  useEffect(() => {
    const down = (e) => {
        if(e.code === "KeyW") move.current.forward = true;
        if(e.code === "KeyS") move.current.backward = true;
        if(e.code === "KeyA") move.current.left = true;
        if(e.code === "KeyD") move.current.right = true;
    };
    const up = (e) => {
        if(e.code === "KeyW") move.current.forward = false;
        if(e.code === "KeyS") move.current.backward = false;
        if(e.code === "KeyA") move.current.left = false;
        if(e.code === "KeyD") move.current.right = false;
    };
    window.addEventListener("keydown", down); window.addEventListener("keyup", up);
    return () => { window.removeEventListener("keydown", down); window.removeEventListener("keyup", up); };
  }, []);

  useFrame((state, delta) => {
    const s = 10 * delta;
    if (move.current.forward) camera.translateZ(-s);
    if (move.current.backward) camera.translateZ(s);
    if (move.current.left) camera.translateX(-s);
    if (move.current.right) camera.translateX(s);
    camera.position.y = 1.6;
    if (move.current.forward || move.current.backward || move.current.left || move.current.right) {
        socket.emit("move", [camera.position.x, 0, camera.position.z]);
    }
  });

  return <PointerLockControls />;
}

// --- APP CHÍNH ---
export default function App() {
  const [players, setPlayers] = useState({});
  const [envPreset, setEnvPreset] = useState("city");
  const [lightsOn, setLightsOn] = useState(false);
  const [chatList, setChatList] = useState([]);
  const [message, setMessage] = useState("");
  const [targetId, setTargetId] = useState("all");
  const [myInfo, setMyInfo] = useState({ name: "", role: "client" });
  const [houseStatus, setHouseStatus] = useState("FOR SALE");
  const [showLoan, setShowLoan] = useState(false);
  
  const chatEndRef = useRef(null);

  useEffect(() => {
    socket.on("updatePlayers", (p) => {
        setPlayers(p);
        if(p[socket.id]) setMyInfo(p[socket.id]);
    });
    socket.on("receiveMessage", (data) => setChatList((prev) => [...prev, data]));
    socket.on("updateEnvironment", (preset) => setEnvPreset(preset));
    socket.on("updateLights", (status) => setLightsOn(status));
    socket.on("updateHouseStatus", (s) => setHouseStatus(s));
    
    return () => socket.off();
  }, []);

  useEffect(() => { chatEndRef.current?.scrollIntoView({ behavior: "smooth" }); }, [chatList]);

  const sendMessage = () => {
    if(message.trim()){ 
        socket.emit("sendMessage", { text: message, to: targetId }); 
        setMessage(""); 
    }
  };

  const isNight = envPreset === "night";

  return (
    <div style={{ width: "100vw", height: "100vh", position: "relative", fontFamily: "sans-serif", background: "#111" }}>
      
      {/* UI BẢNG VAY NỢ & HỢP ĐỒNG (Yêu cầu bổ sung) */}
      <div style={{ position: "absolute", top: "20px", right: "20px", zIndex: 20 }}>
        <button onClick={() => setShowLoan(!showLoan)} style={{padding: "10px", background: "#e67e22", color: "white", border: "none", cursor:"pointer", borderRadius:"5px"}}>
            💰 Hợp đồng & Vay vốn
        </button>
        {showLoan && (
            <div style={{ background: "white", padding: "15px", marginTop: "10px", borderRadius: "8px", width: "250px", boxShadow: "0 5px 20px rgba(0,0,0,0.5)" }}>
                <h3 style={{margin:"0 0 10px 0", color:"#2c3e50"}}>Tài chính</h3>
                <p style={{fontSize:"13px"}}>Giá nhà: <b>$500,000</b></p>
                <p style={{fontSize:"13px"}}>Vay tối đa: <b>$400,000</b></p>
                <p style={{fontSize:"13px"}}>Lãi suất: <b>8%/năm</b></p>
                <hr/>
                <button onClick={() => { socket.emit("changeStatus", "SOLD"); setShowLoan(false); }} 
                        style={{ width: "100%", padding: "10px", background: "#27ae60", color: "white", border: "none", cursor: "pointer" }}>
                    ✍️ KÝ HỢP ĐỒNG NGAY
                </button>
            </div>
        )}
      </div>

      <div style={{ position: "absolute", top: "20px", left: "20px", zIndex: 10, display: "flex", gap: "10px" }}>
        <button onClick={() => socket.emit("changeEnvironment", isNight ? "city" : "night")}>
            {isNight ? "☀️ Ngày" : "🌙 Đêm"}
        </button>
        <button onClick={() => socket.emit("toggleLights")}>💡 Đèn</button>
        <div style={{background: "white", padding: "5px 10px", borderRadius: "5px", fontSize: "12px", fontWeight:"bold"}}>
            VAI TRÒ: {myInfo.role === "broker" ? "👔 SALES" : "👤 KHÁCH"}
        </div>
      </div>

      <Canvas camera={{ position: [0, 1.6, 10], fov: 60 }} shadows>
        <Environment preset={envPreset} background blur={0.6} />
        <CelestialBody isNight={isNight} />
        <ambientLight intensity={isNight ? 0.2 : 0.6} />
        <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.01, 0]}>
          <planeGeometry args={[100, 100]} />
          <meshStandardMaterial color={isNight ? "#2c3e50" : "#95a5a6"} />
        </mesh>
        <FirstPersonController />
        <SmartHouse />
        <StatusSign position={[-3, 0, 7]} role={myInfo.role} status={houseStatus} />
        <GardenLamp position={[16, 0, 8]} isOn={lightsOn} />
        <GardenLamp position={[-5, 0, 8]} isOn={lightsOn} />

        {Object.keys(players).map((key) => (
            key !== socket.id && <Human key={key} position={players[key].position} color={players[key].color} name={players[key].name} role={players[key].role} />
        ))}
      </Canvas>

      {/* CHAT BOX (Hỗ trợ Chat riêng + Chat AI) */}
      <div style={{ position: "absolute", bottom: "20px", left: "20px", width: "320px", height: "400px", background: "rgba(255,255,255,0.9)", borderRadius: "10px", padding: "15px", display: "flex", flexDirection: "column" }}>
        <div style={{flex: 1, overflowY:"auto", marginBottom: "10px"}}>
           {chatList.map((msg, i) => (
               <div key={i} style={{marginBottom: "5px", color: msg.isPrivate ? "purple" : "black"}}>
                   <b>{msg.name}:</b> {msg.text}
               </div>
           ))}
           <div ref={chatEndRef} />
        </div>
        
        <div style={{display:"flex", flexDirection: "column", gap: "5px"}}>
            <select value={targetId} onChange={e => setTargetId(e.target.value)} style={{padding:"5px", fontSize:"12px"}}>
                <option value="all">Gửi tất cả mọi người</option>
                {Object.keys(players).map(id => id !== socket.id && <option key={id} value={id}>Nhắn riêng: {players[id].name}</option>)}
            </select>
            <div style={{display:"flex", gap:"5px"}}>
                <input value={message} onChange={e=>setMessage(e.target.value)} onKeyDown={e=>e.key==="Enter"&&sendMessage()} placeholder="Tin nhắn..." style={{flex:1, padding:"8px"}} />
                <button onClick={sendMessage} style={{padding:"8px"}}>Gửi</button>
            </div>
        </div>
      </div>
    </div>
  );
}