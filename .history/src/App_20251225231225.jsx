import React, { useEffect, useState, useRef } from "react";
import io from "socket.io-client";
import { Canvas, useThree, useFrame } from "@react-three/fiber";
import { PointerLockControls, useGLTF, Text, Billboard, Environment, Html, Stars } from "@react-three/drei";
import * as THREE from "three";

// Kết nối Socket
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

// --- 3. BIỂN BÁO & BLOCKCHAIN TRIGGER ---
function StatusSign({ position, role, status }) {
  const handleClick = (e) => {
    e.stopPropagation();
    if (role !== "broker") {
      alert("⚠️ CHỈ MÔI GIỚI (ADMIN) MỚI ĐƯỢC MỞ BÁN!");
      return;
    }
    // Nếu chưa bán thì bán, nếu bán rồi thì mở bán lại
    const newStatus = status === "FOR SALE" ? "SOLD" : "FOR SALE";
    socket.emit("changeStatus", newStatus);
  };

  const isSold = status === "SOLD";
  return (
    <group position={position} onClick={handleClick}
      onPointerOver={() => document.body.style.cursor = role === 'broker' ? 'pointer' : 'not-allowed'}
      onPointerOut={() => document.body.style.cursor = 'auto'}>
      <mesh position={[0, 1, 0]}><cylinderGeometry args={[0.05, 0.05, 2]} /><meshStandardMaterial color="#333" /></mesh>
      <mesh position={[0, 2, 0]}><boxGeometry args={[1.5, 0.8, 0.1]} /><meshStandardMaterial color={isSold ? "#c0392b" : "#27ae60"} /></mesh>
      <Text position={[0, 2, 0.06]} fontSize={0.35} color="white" fontWeight="bold">{status}</Text>
    </group>
  );
}

// --- 4. NGÔI NHÀ + BẢNG CHI TIẾT ---
function SmartHouse() {
  const { scene } = useGLTF("/nha.glb"); // Đảm bảo file nha.glb có trong folder public
  const [showInfo, setShowInfo] = useState(false);

  return (
    <group position={[0, 1.6, 0]}>
      <primitive object={scene} scale={[0.8, 0.8, 0.8]} />
      
      {/* Nút Info */}
      <mesh position={[2, 3, 2]} onClick={() => setShowInfo(!showInfo)}
            onPointerOver={() => document.body.style.cursor = 'pointer'}
            onPointerOut={() => document.body.style.cursor = 'auto'}>
        <sphereGeometry args={[0.3, 16, 16]} />
        <meshBasicMaterial color="#ff4757" transparent opacity={0.9} />
        <Billboard position={[0, 0.6, 0]}>
            <Text fontSize={0.3} color="white" outlineWidth={0.05} outlineColor="#ff4757">Info</Text>
        </Billboard>
      </mesh>

      {/* Popup Thông tin */}
      {showInfo && (
        <Html position={[2, 4, 2]} center>
          <div style={{ background: "rgba(255, 255, 255, 0.95)", padding: "15px", borderRadius: "10px", width: "250px", textAlign: "left", border: "1px solid #ccc", fontFamily: "sans-serif" }}>
            <h3 style={{margin: "0 0 10px 0", color: "#2c3e50"}}>🏡 Biệt Thự Phố</h3>
            <p><b>Diện tích:</b> 200m² (10x20)</p>
            <p><b>Giá bán:</b> <span style={{color: "#c0392b", fontWeight: "bold"}}>$500,000</span></p>
            <p style={{fontSize: "12px", color: "#7f8c8d"}}>Hỗ trợ vay ngân hàng lãi suất 0%</p>
            <button onClick={() => setShowInfo(false)} style={{marginTop: "10px", width: "100%", padding: "5px", cursor: "pointer"}}>Đóng</button>
          </div>
        </Html>
      )}
    </group>
  );
}

// --- 5. AVATAR ---
function Human({ position, color, name, role }) {
  const isBroker = role === "broker";
  return (
    <group position={position}>
      <Billboard position={[0, 2.6, 0]}>
        <Text fontSize={0.3} color={isBroker ? "#d35400" : "white"} outlineWidth={0.03} outlineColor="black">{name}</Text>
      </Billboard>
      <mesh position={[0, 1.6, 0]}><boxGeometry args={[0.5, 0.5, 0.5]} /><meshStandardMaterial color={isBroker ? "#f1c40f" : color} /></mesh>
      <mesh position={[0, 0.75, 0]}><boxGeometry args={[0.6, 1, 0.3]} /><meshStandardMaterial color={color} /></mesh>
    </group>
  );
}

// --- 6. CONTROLLER ĐI BỘ (FIRST PERSON) ---
function FirstPersonController() {
  const { camera } = useThree();
  const moveForward = useRef(false);
  const moveBackward = useRef(false);
  const moveLeft = useRef(false);
  const moveRight = useRef(false);
  const velocity = useRef(new THREE.Vector3());
  const direction = useRef(new THREE.Vector3());

  useEffect(() => {
    const onKeyDown = (event) => {
      switch (event.code) {
        case "ArrowUp": case "KeyW": moveForward.current = true; break;
        case "ArrowLeft": case "KeyA": moveLeft.current = true; break;
        case "ArrowDown": case "KeyS": moveBackward.current = true; break;
        case "ArrowRight": case "KeyD": moveRight.current = true; break;
      }
    };
    const onKeyUp = (event) => {
      switch (event.code) {
        case "ArrowUp": case "KeyW": moveForward.current = false; break;
        case "ArrowLeft": case "KeyA": moveLeft.current = false; break;
        case "ArrowDown": case "KeyS": moveBackward.current = false; break;
        case "ArrowRight": case "KeyD": moveRight.current = false; break;
      }
    };
    document.addEventListener("keydown", onKeyDown);
    document.addEventListener("keyup", onKeyUp);
    return () => {
      document.removeEventListener("keydown", onKeyDown);
      document.removeEventListener("keyup", onKeyUp);
    };
  }, []);

  useFrame((state, delta) => {
    const speed = 10.0; 
    direction.current.z = Number(moveForward.current) - Number(moveBackward.current);
    direction.current.x = Number(moveRight.current) - Number(moveLeft.current);
    direction.current.normalize(); 

    if (moveForward.current || moveBackward.current) velocity.current.z = direction.current.z * speed * delta;
    else velocity.current.z = 0;

    if (moveLeft.current || moveRight.current) velocity.current.x = direction.current.x * speed * delta;
    else velocity.current.x = 0;

    camera.translateX(velocity.current.x);
    camera.translateZ(-velocity.current.z); 
    camera.position.y = 1.6; // Giữ độ cao tầm mắt

    // Gửi vị trí về server để người khác thấy mình di chuyển
    if (moveForward.current || moveBackward.current || moveLeft.current || moveRight.current) {
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
  const [myInfo, setMyInfo] = useState({ name: "", role: "client" });
  const [houseStatus, setHouseStatus] = useState("FOR SALE");
  
  const chatEndRef = useRef(null);

  useEffect(() => {
    socket.on("updatePlayers", (p) => {
        setPlayers(p);
        if(p[socket.id]) setMyInfo({ name: p[socket.id].name, role: p[socket.id].role });
    });
    socket.on("receiveMessage", (data) => setChatList((prev) => [...prev, data]));
    socket.on("updateEnvironment", (preset) => setEnvPreset(preset));
    socket.on("updateLights", (status) => setLightsOn(status));
    
    // Xử lý sự kiện Chuyển đổi số (Blockchain Alert)
    socket.on("updateHouseStatus", (s) => {
      setHouseStatus(s);
      if (s === "SOLD") {
        // Giả lập hiệu ứng Blockchain
        const hash = "0x" + Math.random().toString(16).substr(2, 20).toUpperCase();
        alert(`🎉 CHÚC MỪNG GIAO DỊCH THÀNH CÔNG!\n\n🔗 Hợp đồng thông minh (Smart Contract) đã được kích hoạt.\n💎 Mã giao dịch Blockchain: ${hash}`);
      }
    });
    
    return () => { 
      socket.off("updatePlayers"); socket.off("receiveMessage"); 
      socket.off("updateEnvironment"); socket.off("updateLights"); socket.off("updateHouseStatus");
    };
  }, []);

  useEffect(() => { chatEndRef.current?.scrollIntoView({ behavior: "smooth" }); }, [chatList]);

  const changeMode = (mode) => socket.emit("changeEnvironment", mode);
  const toggleLights = () => socket.emit("toggleLights");
  const sendMessage = () => { if(message.trim()){ socket.emit("sendMessage", { text: message }); setMessage(""); }};

  const isNight = envPreset === "night";

  return (
    <div style={{ width: "100vw", height: "100vh", position: "relative", fontFamily: "Segoe UI", background: "#111" }}>
      
      {/* NÚT ĐIỀU KHIỂN */}
      <div style={{ position: "absolute", top: "20px", left: "20px", zIndex: 10, display: "flex", gap: "10px" }}>
        <button onClick={() => changeMode(isNight ? "city" : "night")} style={{padding: "10px", borderRadius: "5px", cursor:"pointer"}}>
            {isNight ? "🌙 Mode: Đêm" : "☀️ Mode: Ngày"}
        </button>
        <button onClick={toggleLights} style={{padding: "10px", borderRadius: "5px", cursor:"pointer"}}>
            💡 {lightsOn ? "Tắt Đèn" : "Bật Đèn"}
        </button>
      </div>

      {/* TÂM NGẮM (CROSSHAIR) ĐỂ DỄ ĐI */}
      <div style={{position: "absolute", top: "50%", left: "50%", width: "10px", height: "10px", background: "white", borderRadius: "50%", transform: "translate(-50%, -50%)", zIndex: 5, pointerEvents: "none", opacity: 0.5}} />
      <div style={{position: "absolute", bottom: "30px", left: "50%", transform: "translateX(-50%)", color: "white", zIndex: 5, pointerEvents: "none", textShadow: "1px 1px 2px black"}}>
        <small>Click vào màn hình để di chuyển | W-A-S-D để đi | ESC để hiện chuột</small>
      </div>

      <Canvas camera={{ position: [0, 1.6, 10], fov: 60 }} shadows>
        <Environment preset={envPreset} background blur={0.6} />
        <CelestialBody isNight={isNight} />
        <ambientLight intensity={isNight ? 0.2 : 0.6} />
        
        {/* Sàn rộng ra để đi bộ */}
        <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.01, 0]}>
          <planeGeometry args={[100, 100]} />
          <meshStandardMaterial color={isNight ? "#2c3e50" : "#95a5a6"} />
        </mesh>

        <FirstPersonController />

        <SmartHouse />
        <StatusSign position={[-3, 0, 7]} role={myInfo.role} status={houseStatus} />

        <GardenLamp position={[16, 0, 8]} isOn={lightsOn} />
        <GardenLamp position={[-5, 0, 8]} isOn={lightsOn} />
        <GardenLamp position={[16, 0, -8]} isOn={lightsOn} />
        <GardenLamp position={[-5, 0, -8]} isOn={lightsOn} />

        {Object.keys(players).map((key) => {
            if(key === socket.id) return null; // Không render chính mình
            return (
                <Human key={key} position={players[key].position} color={players[key].color} 
                       name={players[key].name} role={players[key].role} />
            )
        })}
      </Canvas>

      {/* CHAT BOX */}
      <div style={{
        position: "absolute", bottom: "20px", left: "20px", width: "300px", height: "400px",
        background: "rgba(255,255,255,0.9)", borderRadius: "10px", padding: "15px", display: "flex", flexDirection: "column",
        boxShadow: "0 10px 40px rgba(0,0,0,0.5)"
      }} onKeyDown={(e) => e.stopPropagation()}> {/* Chặn sự kiện phím để không bị đi khi chat */}
        
        <div style={{flex: 1, overflowY:"auto", marginBottom: "10px"}}>
           {chatList.map((msg, i) => (
               <div key={i} style={{marginBottom: "5px", textAlign: msg.id === socket.id ? "right" : "left"}}>
                   <span style={{background: msg.id === socket.id ? "#3498db" : "#ecf0f1", padding: "5px 10px", borderRadius: "10px", display: "inline-block", fontSize: "13px", color: msg.id === socket.id ? "white" : "black"}}>
                       <b>{msg.name}:</b> {msg.text}
                   </span>
               </div>
           ))}
           <div ref={chatEndRef} />
        </div>
        
        <div style={{display:"flex", gap:"5px"}}>
            <input value={message} onChange={e=>setMessage(e.target.value)} onKeyDown={e=>e.key==="Enter"&&sendMessage()} 
                   placeholder="Nhập tin nhắn..." style={{flex:1, padding:"8px"}} />
            <button onClick={sendMessage} style={{padding:"8px"}}>Gửi</button>
        </div>
      </div>
    </div>
  );
}