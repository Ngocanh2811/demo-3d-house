import React, { useEffect, useState, useRef } from "react";
import io from "socket.io-client";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { OrbitControls, useGLTF, Text, Billboard, Environment, Html, Stars } from "@react-three/drei";

const socket = io.connect("http://localhost:3001");

// --- 1. MẶT TRỜI / SAO ---
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

// --- 2. ĐÈN SÂN VƯỜN ---
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

// --- 3. BIỂN BÁO (BLOCKCHAIN TRIGGER) ---
function StatusSign({ position, role, status }) {
  const handleClick = (e) => {
    e.stopPropagation();
    if (role !== "broker") {
      alert("⚠️ CHỈ MÔI GIỚI (ADMIN) MỚI ĐƯỢC CHỐT ĐƠN!");
      return;
    }
    const newStatus = status === "FOR SALE" ? "SOLD" : "FOR SALE";
    socket.emit("changeStatus", newStatus);
  };

  return (
    <group position={position} onClick={handleClick} onPointerOver={()=>document.body.style.cursor='pointer'} onPointerOut={()=>document.body.style.cursor='auto'}>
      <mesh position={[0, 1, 0]}><cylinderGeometry args={[0.05, 0.05, 2]} /><meshStandardMaterial color="#333" /></mesh>
      <mesh position={[0, 2, 0]}><boxGeometry args={[1.5, 0.8, 0.1]} /><meshStandardMaterial color={status==="SOLD" ? "#c0392b" : "#27ae60"} /></mesh>
      <Text position={[0, 2, 0.06]} fontSize={0.35} color="white" fontWeight="bold">{status}</Text>
    </group>
  );
}

// --- 4. NGÔI NHÀ ---
function SmartHouse() {
  const { scene } = useGLTF("/nha.glb");
  return <primitive object={scene} position={[0, 1.6, 0]} scale={[0.8, 0.8, 0.8]} />;
}

// --- 5. AVATAR (NGƯỜI KHÁC) ---
function Human({ position, color, name, role }) {
  return (
    <group position={position}>
      <Billboard position={[0, 2.6, 0]}>
        <Text fontSize={0.4} color={role==="broker"?"#e67e22":"white"} outlineWidth={0.04} outlineColor="black">{name}</Text>
      </Billboard>
      {/* Vẽ cái đầu đại diện cho Camera */}
      <mesh position={[0, 1.8, 0]}>
        <boxGeometry args={[0.6, 0.6, 0.6]} />
        <meshStandardMaterial color={role==="broker"?"#f1c40f":color} />
      </mesh>
      {/* Vẽ tia nhìn (để biết họ đang nhìn hướng nào) */}
      <mesh position={[0, 1.8, 0.4]}>
        <boxGeometry args={[0.2, 0.2, 0.5]} />
        <meshStandardMaterial color="white" />
      </mesh>
    </group>
  );
}

// --- 6. CAMERA CONTROLLER & SYNC VỊ TRÍ ---
function OrbitControllerWithSync() {
  const { camera } = useThree();
  const lastPos = useRef([0, 0, 0]);

  useFrame(() => {
    // Chỉ gửi vị trí nếu thay đổi đáng kể để đỡ lag server
    if (
      Math.abs(camera.position.x - lastPos.current[0]) > 0.1 ||
      Math.abs(camera.position.z - lastPos.current[2]) > 0.1 ||
      Math.abs(camera.position.y - lastPos.current[1]) > 0.1
    ) {
      lastPos.current = [camera.position.x, camera.position.y, camera.position.z];
      socket.emit("move", lastPos.current);
    }
  });

  return (
    <OrbitControls 
      enableDamping={true} // Xoay mượt
      dampingFactor={0.05}
      minDistance={2}      // Không zoom xuyên qua nhà
      maxDistance={50}     // Không zoom quá xa
      maxPolarAngle={Math.PI / 2 - 0.05} // Không chui xuống đất
    />
  );
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
            const hash = "0x" + Math.random().toString(16).slice(2).toUpperCase();
            alert(`🎉 GIAO DỊCH THÀNH CÔNG!\n\n🔗 Smart Contract (Hợp đồng thông minh) đã được ghi nhận.\n🔑 Blockchain Hash: ${hash}`);
        }
    });

    return () => { socket.off("updatePlayers"); socket.off("receiveMessage"); socket.off("updateEnvironment"); socket.off("updateLights"); socket.off("updateHouseStatus"); };
  }, []);

  useEffect(() => { chatEndRef.current?.scrollIntoView({ behavior: "smooth" }); }, [chatList]);

  const sendMessage = () => { 
    if(message.trim()){ 
        socket.emit("sendMessage", { text: message, isPrivate: isPrivate }); 
        setMessage(""); 
    }
  };

  const isNight = envPreset === "night";

  return (
    <div style={{ width: "100vw", height: "100vh", background: "#111", fontFamily: "Segoe UI" }}>
      
      {/* Nút điều khiển */}
      <div style={{ position: "absolute", top: "20px", left: "20px", zIndex: 10, display: "flex", gap: "10px" }}>
        <button onClick={() => socket.emit("changeEnvironment", isNight ? "city" : "night")} style={{padding:"10px", cursor:"pointer", borderRadius:"5px", border:"none", background:"#34495e", color:"white"}}>
          {isNight ? "🌙 Chế độ Đêm" : "☀️ Chế độ Ngày"}
        </button>
        <button onClick={() => socket.emit("toggleLights")} style={{padding:"10px", cursor:"pointer", borderRadius:"5px", border:"none", background:"#f1c40f", color:"#333", fontWeight:"bold"}}>
          💡 Bật/Tắt Đèn
        </button>
      </div>

      {/* Hướng dẫn điều khiển chuột */}
      <div style={{position: "absolute", top: "20px", right: "20px", color: "white", zIndex: 5, textAlign:"right", textShadow:"1px 1px 2px black"}}>
        <div style={{fontSize:"14px", fontWeight:"bold", marginBottom:"5px"}}>🎮 HƯỚNG DẪN</div>
        <div style={{fontSize:"12px"}}>🖱️ Chuột TRÁI: Xoay</div>
        <div style={{fontSize:"12px"}}>🖱️ Chuột PHẢI: Di chuyển (Pan)</div>
        <div style={{fontSize:"12px"}}>🖱️ Lăn chuột: Zoom</div>
      </div>

      {/* CANVAS 3D */}
      <Canvas camera={{ position: [10, 8, 15], fov: 50 }} shadows>
        <Environment preset={envPreset} background blur={0.6} />
        <CelestialBody isNight={isNight} />
        <ambientLight intensity={isNight ? 0.3 : 0.7} />
        
        {/* Sàn nhà */}
        <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.01, 0]}>
          <planeGeometry args={[100, 100]} />
          <meshStandardMaterial color={isNight ? "#34495e" : "#bdc3c7"} />
        </mesh>

        {/* CONTROLLER MỚI: ZOOM, XOAY, PAN */}
        <OrbitControllerWithSync />

        <SmartHouse />
        <StatusSign position={[-3, 0, 7]} role={myInfo.role} status={houseStatus} />
        
        <GardenLamp position={[16, 0, 8]} isOn={lightsOn} />
        <GardenLamp position={[-5, 0, 8]} isOn={lightsOn} />
        <GardenLamp position={[16, 0, -8]} isOn={lightsOn} />
        <GardenLamp position={[-5, 0, -8]} isOn={lightsOn} />

        {/* Hiển thị người chơi khác */}
        {Object.keys(players).map((key) => {
            if (key === socket.id) return null;
            return <Human key={key} position={players[key].position} color={players[key].color} name={players[key].name} role={players[key].role} />
        })}
      </Canvas>

      {/* CHAT BOX */}
      <div style={{
        position: "absolute", bottom: "20px", left: "20px", width: "320px", height: "400px",
        background: "rgba(255,255,255,0.95)", borderRadius: "10px", padding: "15px", display: "flex", flexDirection: "column",
        boxShadow: "0 10px 30px rgba(0,0,0,0.5)"
      }} onKeyDown={(e) => e.stopPropagation()}>
        
        <div style={{borderBottom:"1px solid #ddd", paddingBottom:"5px", marginBottom:"5px", display:"flex", justifyContent:"space-between", alignItems:"center"}}>
            <div>
              <b style={{color: "#2c3e50"}}>Tư Vấn Trực Tuyến</b><br/>
              <span style={{fontSize:"11px", color:"#7f8c8d"}}>Bạn là: {myInfo.role === 'broker' ? '⭐ Admin' : 'Khách hàng'}</span>
            </div>
            {houseStatus === "SOLD" && <span style={{fontSize:"10px", background:"#c0392b", color:"white", padding:"3px 6px", borderRadius:"4px"}}>ĐÃ BÁN</span>}
        </div>

        <div style={{flex: 1, overflowY:"auto", fontSize: "13px"}}>
           {chatList.map((msg, i) => {
               const isMe = msg.id === socket.id;
               const isPrivateMsg = msg.isPrivate;
               const isSystem = msg.role === 'system';
               
               if (isSystem) return (
                 <div key={i} style={{textAlign:"center", margin:"10px 0"}}>
                   <span style={{fontSize:"11px", background:"#e74c3c", color:"white", padding:"4px 8px", borderRadius:"10px"}}>{msg.text}</span>
                 </div>
               );

               return (
                <div key={i} style={{marginBottom: "8px", textAlign: isMe ? "right" : "left"}}>
                   <div style={{
                       background: isPrivateMsg ? "#ffeaa7" : (isMe ? "#3498db" : (msg.role==='broker'?"#f1c40f":"#ecf0f1")), 
                       color: isPrivateMsg ? "#d35400" : (isMe ? "white" : "black"),
                       padding: "6px 12px", borderRadius: "15px", display: "inline-block", maxWidth: "85%",
                       border: isPrivateMsg ? "1px dashed #d35400" : "none",
                       boxShadow: "0 1px 2px rgba(0,0,0,0.1)"
                   }}>
                       {isPrivateMsg && <b>🔒 [Mật] </b>}
                       {!isMe && <b style={{fontSize:"11px", display:"block", marginBottom:"2px"}}>{msg.name}</b>}
                       {msg.text}
                   </div>
                </div>
               )
           })}
           <div ref={chatEndRef} />
        </div>
        
        {/* INPUT CHAT */}
        <div style={{marginTop: "5px"}}>
            {myInfo.role !== 'broker' && (
                <label style={{display:"block", fontSize:"12px", marginBottom:"5px", cursor:"pointer", color: "#d35400", userSelect:"none"}}>
                    <input type="checkbox" checked={isPrivate} onChange={e => setIsPrivate(e.target.checked)} style={{marginRight:"5px"}} /> 
                    🤫 Nhắn riêng cho Sales
                </label>
            )}
            <div style={{display:"flex", gap:"5px"}}>
                <input value={message} onChange={e=>setMessage(e.target.value)} onKeyDown={e=>e.key==="Enter"&&sendMessage()} 
                    placeholder={isPrivate ? "Đang chat riêng..." : "Nhập tin nhắn..."}
                    style={{flex:1, padding:"10px", border:"1px solid #ddd", borderRadius:"20px", outline:"none", background:"#f9f9f9"}} />
                <button onClick={sendMessage} style={{padding:"0 20px", background:"#2980b9", color:"white", border:"none", borderRadius:"20px", cursor:"pointer", fontWeight:"bold"}}>Gửi</button>
            </div>
        </div>
      </div>
    </div>
  );
}