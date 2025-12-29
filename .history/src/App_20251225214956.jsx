import React, { useEffect, useState, useRef } from "react";
import io from "socket.io-client";
import { Canvas, useThree, useFrame } from "@react-three/fiber";
import { PointerLockControls, useGLTF, Text, Billboard, Environment, Html, Stars } from "@react-three/drei";
import * as THREE from "three";

const socket = io.connect("http://localhost:3001");

// --- CÁC COMPONENT CƠ BẢN (GIỮ NGUYÊN) ---
function CelestialBody({ isNight }) {
  return (
    <group>
      {isNight && <Stars radius={100} depth={50} count={5000} factor={4} fade speed={1} />}
      <mesh position={[20, 20, -40]}>
        <sphereGeometry args={[4, 32, 32]} />
        <meshBasicMaterial color={isNight ? "#f5f6fa" : "#f0932b"} />
        <pointLight intensity={isNight ? 0.5 : 2} distance={100} />
      </mesh>
    </group>
  );
}

function GardenLamp({ position, isOn }) {
  return (
    <group position={position}>
      <mesh position={[0, 1, 0]}><cylinderGeometry args={[0.05, 0.1, 2]} /><meshStandardMaterial color="#2c3e50" /></mesh>
      <mesh position={[0, 2, 0]}><sphereGeometry args={[0.25, 16, 16]} />
        <meshStandardMaterial color={isOn ? "#f1c40f" : "#7f8c8d"} emissive={isOn ? "#f1c40f" : "black"} emissiveIntensity={isOn?3:0}/>
      </mesh>
      {isOn && <pointLight position={[0, 2.2, 0]} distance={10} intensity={3} color="#f1c40f" />}
    </group>
  );
}

// --- BIỂN BÁO + LOGIC BLOCKCHAIN ---
function StatusSign({ position, role, status }) {
  const handleClick = (e) => {
    e.stopPropagation();
    if (role !== "broker") {
      alert("⚠️ CHỈ MÔI GIỚI MỚI ĐƯỢC CHỐT ĐƠN!");
      return;
    }
    const newStatus = status === "FOR SALE" ? "SOLD" : "FOR SALE";
    socket.emit("changeStatus", newStatus);
  };

  return (
    <group position={position} onClick={handleClick} onPointerOver={()=>document.body.style.cursor='pointer'} onPointerOut={()=>document.body.style.cursor='auto'}>
      <mesh position={[0, 1, 0]}><cylinderGeometry args={[0.05, 0.05, 2]} /><meshStandardMaterial color="#333" /></mesh>
      <mesh position={[0, 2, 0]}><boxGeometry args={[1.5, 0.8, 0.1]} /><meshStandardMaterial color={status==="SOLD" ? "#c0392b" : "#27ae60"} /></mesh>
      <Text position={[0, 2, 0.06]} fontSize={0.35} color="white">{status}</Text>
    </group>
  );
}

function Human({ position, color, name, role }) {
  return (
    <group position={position}>
      <Billboard position={[0, 2.6, 0]}><Text fontSize={0.3} color={role==="broker"?"#e67e22":"white"} outlineWidth={0.03}>{name}</Text></Billboard>
      <mesh position={[0, 1.6, 0]}><boxGeometry args={[0.5, 0.5, 0.5]} /><meshStandardMaterial color={color} /></mesh>
      <mesh position={[0, 0.75, 0]}><boxGeometry args={[0.6, 1, 0.3]} /><meshStandardMaterial color={color} /></mesh>
    </group>
  );
}

function SmartHouse() {
  const { scene } = useGLTF("/nha.glb");
  return <primitive object={scene} position={[0, 1.6, 0]} scale={[0.8, 0.8, 0.8]} />;
}

// --- BỘ ĐIỀU KHIỂN WASD (MỚI) ---
function FirstPersonController() {
  const { camera } = useThree();
  const moveForward = useRef(false);
  const moveBackward = useRef(false);
  const moveLeft = useRef(false);
  const moveRight = useRef(false);
  const velocity = useRef(new THREE.Vector3());
  const direction = useRef(new THREE.Vector3());

  useEffect(() => {
    const onKeyDown = (e) => {
      switch(e.code) { case 'KeyW': moveForward.current=true; break; case 'KeyS': moveBackward.current=true; break; case 'KeyA': moveLeft.current=true; break; case 'KeyD': moveRight.current=true; break; }
    };
    const onKeyUp = (e) => {
      switch(e.code) { case 'KeyW': moveForward.current=false; break; case 'KeyS': moveBackward.current=false; break; case 'KeyA': moveLeft.current=false; break; case 'KeyD': moveRight.current=false; break; }
    };
    document.addEventListener('keydown', onKeyDown);
    document.addEventListener('keyup', onKeyUp);
    return () => { document.removeEventListener('keydown', onKeyDown); document.removeEventListener('keyup', onKeyUp); }
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
    
    // Giữ độ cao mắt người (1.6m) để đi dưới đất
    camera.position.y = 1.6;

    // Gửi vị trí
    if (velocity.current.x !== 0 || velocity.current.z !== 0) {
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
  const [isPrivate, setIsPrivate] = useState(false); // Checkbox chat riêng
  
  const chatEndRef = useRef(null);

  useEffect(() => {
    socket.on("updatePlayers", (p) => { setPlayers(p); if(p[socket.id]) setMyInfo({ name: p[socket.id].name, role: p[socket.id].role }); });
    socket.on("receiveMessage", (data) => setChatList((prev) => [...prev, data]));
    socket.on("updateEnvironment", (p) => setEnvPreset(p));
    socket.on("updateLights", (s) => setLightsOn(s));
    
    // Sự kiện Blockchain
    socket.on("updateHouseStatus", (s) => {
        setHouseStatus(s);
        if (s === "SOLD") {
            const hash = "0x" + Math.random().toString(16).slice(2);
            alert(`🎉 GIAO DỊCH THÀNH CÔNG!\n\n🔗 Hợp đồng thông minh (Smart Contract) đã được ghi nhận trên Blockchain.\n🔑 Mã Hash: ${hash}`);
        }
    });

    return () => { socket.off("updatePlayers"); socket.off("receiveMessage"); socket.off("updateEnvironment"); socket.off("updateLights"); socket.off("updateHouseStatus"); };
  }, []);

  useEffect(() => { chatEndRef.current?.scrollIntoView({ behavior: "smooth" }); }, [chatList]);

  const sendMessage = () => { 
    if(message.trim()){ 
        // Gửi cờ isPrivate nếu checkbox được chọn
        socket.emit("sendMessage", { text: message, isPrivate: isPrivate }); 
        setMessage(""); 
    }
  };

  const isNight = envPreset === "night";

  return (
    <div style={{ width: "100vw", height: "100vh", background: "#111", fontFamily: "Segoe UI" }}>
      
      {/* Nút điều khiển */}
      <div style={{ position: "absolute", top: "20px", left: "20px", zIndex: 10, display: "flex", gap: "10px" }}>
        <button onClick={() => socket.emit("changeEnvironment", isNight ? "city" : "night")} style={{padding:"10px", cursor:"pointer"}}>{isNight ? "🌙 Đêm" : "☀️ Ngày"}</button>
        <button onClick={() => socket.emit("toggleLights")} style={{padding:"10px", cursor:"pointer"}}>💡 Đèn</button>
      </div>

      {/* Hướng dẫn điều khiển */}
      <div style={{position: "absolute", top: "50%", left: "50%", transform: "translate(-50%,-50%)", color: "white", pointerEvents: "none", zIndex: 5, opacity: 0.6}}>
        <div style={{width: "8px", height: "8px", background: "white", borderRadius: "50%", margin: "0 auto 10px auto"}}></div>
        <small>Click để di chuyển | W-A-S-D để đi | ESC hiện chuột</small>
      </div>

      <Canvas camera={{ position: [0, 1.6, 12], fov: 60 }} shadows>
        <Environment preset={envPreset} background blur={0.6} />
        <CelestialBody isNight={isNight} />
        <ambientLight intensity={isNight ? 0.2 : 0.6} />
        
        {/* Sàn rộng để đi bao quát */}
        <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.01, 0]}>
          <planeGeometry args={[100, 100]} />
          <meshStandardMaterial color={isNight ? "#34495e" : "#bdc3c7"} />
        </mesh>

        <FirstPersonController />
        <SmartHouse />
        <StatusSign position={[-3, 0, 7]} role={myInfo.role} status={houseStatus} />
        
        <GardenLamp position={[16, 0, 8]} isOn={lightsOn} />
        <GardenLamp position={[-5, 0, 8]} isOn={lightsOn} />

        {Object.keys(players).map((key) => {
            if (key === socket.id) return null;
            return <Human key={key} position={players[key].position} color={players[key].color} name={players[key].name} role={players[key].role} />
        })}
      </Canvas>

      {/* CHAT BOX */}
      <div style={{
        position: "absolute", bottom: "20px", left: "20px", width: "320px", height: "400px",
        background: "rgba(255,255,255,0.95)", borderRadius: "10px", padding: "15px", display: "flex", flexDirection: "column"
      }} onKeyDown={(e) => e.stopPropagation()}>
        
        <div style={{borderBottom:"1px solid #ddd", paddingBottom:"5px", marginBottom:"5px"}}>
            <b>{myInfo.name}</b> <span style={{fontSize:"11px", color:"#7f8c8d"}}>({myInfo.role})</span>
        </div>

        <div style={{flex: 1, overflowY:"auto", fontSize: "13px"}}>
           {chatList.map((msg, i) => {
               const isMe = msg.id === socket.id;
               const isPrivateMsg = msg.isPrivate;
               return (
                <div key={i} style={{marginBottom: "8px", textAlign: isMe ? "right" : "left"}}>
                   <div style={{
                       background: isPrivateMsg ? "#ffeaa7" : (isMe ? "#3498db" : "#ecf0f1"), // Màu vàng nhạt cho tin riêng
                       color: isPrivateMsg ? "#d35400" : (isMe ? "white" : "black"),
                       padding: "6px 12px", borderRadius: "15px", display: "inline-block",
                       border: isPrivateMsg ? "1px dashed #d35400" : "none"
                   }}>
                       {isPrivateMsg && <b>[RIÊNG TƯ] 🔒 </b>}
                       {!isMe && <b>{msg.name}: </b>}
                       {msg.text}
                   </div>
                </div>
               )
           })}
           <div ref={chatEndRef} />
        </div>
        
        {/* Khu vực input chat */}
        <div style={{marginTop: "5px"}}>
            {myInfo.role !== 'broker' && (
                <label style={{display:"block", fontSize:"12px", marginBottom:"5px", cursor:"pointer", color: "#d35400"}}>
                    <input type="checkbox" checked={isPrivate} onChange={e => setIsPrivate(e.target.checked)} /> 
                    🤫 Chat riêng với Môi giới (Sales)
                </label>
            )}
            <div style={{display:"flex", gap:"5px"}}>
                <input value={message} onChange={e=>setMessage(e.target.value)} onKeyDown={e=>e.key==="Enter"&&sendMessage()} 
                    placeholder={isPrivate ? "Nhắn tin riêng..." : "Nhắn tin chung..."}
                    style={{flex:1, padding:"8px", border:"1px solid #ddd", borderRadius:"5px"}} />
                <button onClick={sendMessage} style={{padding:"8px 15px", background:"#2ecc71", color:"white", border:"none", borderRadius:"5px", cursor:"pointer"}}>Gửi</button>
            </div>
        </div>
      </div>
    </div>
  );
}