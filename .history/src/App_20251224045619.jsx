import React, { useEffect, useState } from "react";
import io from "socket.io-client";
import { Canvas } from "@react-three/fiber";
import { OrbitControls, useGLTF, Text, Billboard, Environment, Html } from "@react-three/drei";

const socket = io.connect("http://localhost:3001");

// --- 1. ĐÈN SÂN VƯỜN IOT (Thay thế sàn đổi màu) ---
// Một cây đèn gồm: Cột + Bóng đèn + Ánh sáng tỏa ra
function GardenLamp({ position, isOn }) {
  return (
    <group position={position}>
      {/* Cột đèn */}
      <mesh position={[0, 1, 0]}>
        <cylinderGeometry args={[0.05, 0.1, 2]} />
        <meshStandardMaterial color="#2c3e50" />
      </mesh>
      {/* Bóng đèn (Phát sáng nếu isOn = true) */}
      <mesh position={[0, 2, 0]}>
        <sphereGeometry args={[0.2, 16, 16]} />
        <meshStandardMaterial 
          color={isOn ? "#f1c40f" : "#95a5a6"} 
          emissive={isOn ? "#f1c40f" : "black"}
          emissiveIntensity={isOn ? 2 : 0}
        />
      </mesh>
      {/* Ánh sáng thực tế tỏa ra */}
      {isOn && <pointLight position={[0, 2.2, 0]} distance={8} intensity={5} color="#f1c40f" />}
    </group>
  );
}

// --- 2. BIỂN BÁO (CÓ BẢO MẬT) ---
function StatusSign({ position, role }) {
  const [status, setStatus] = useState("FOR SALE");

  useEffect(() => {
    socket.on("updateHouseStatus", (s) => setStatus(s));
    return () => socket.off("updateHouseStatus");
  }, []);

  const handleClick = (e) => {
    e.stopPropagation();
    
    // --- LOGIC BẢO MẬT TẠI ĐÂY ---
    if (role !== "broker") {
      alert("⚠️ CHỈ CÓ MÔI GIỚI MỚI ĐƯỢC QUYỀN CHỐT ĐƠN!");
      return;
    }
    
    const newStatus = status === "FOR SALE" ? "SOLD" : "FOR SALE";
    socket.emit("changeStatus", newStatus);
  };

  const isSold = status === "SOLD";
  // Nếu là Broker thì trỏ chuột thành hình bàn tay, Khách thì cấm
  const cursorStyle = role === "broker" ? "pointer" : "not-allowed";

  return (
    <group position={position} onClick={handleClick}
           onPointerOver={() => document.body.style.cursor = cursorStyle}
           onPointerOut={() => document.body.style.cursor = 'auto'}>
      <mesh position={[0, 1, 0]}>
        <cylinderGeometry args={[0.05, 0.05, 2]} />
        <meshStandardMaterial color="#333" />
      </mesh>
      <mesh position={[0, 2, 0]}>
        <boxGeometry args={[1.5, 0.8, 0.1]} />
        <meshStandardMaterial color={isSold ? "#c0392b" : "#27ae60"} />
      </mesh>
      <Text position={[0, 2, 0.06]} fontSize={0.35} color="white" fontWeight="bold">
        {status}
      </Text>
      {/* Chỉ hiện dòng hướng dẫn cho Môi giới */}
      {role === "broker" && (
        <Text position={[0, 1.5, 0.06]} fontSize={0.1} color="black">(Click để đổi)</Text>
      )}
    </group>
  );
}

// --- 3. CÁC COMPONENT CƠ BẢN ---
function Floor() {
  return (
    <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.01, 0]}>
      <planeGeometry args={[50, 50]} />
      <meshStandardMaterial color="#34495e" /> {/* Sàn màu tối cho đèn nổi bật */}
    </mesh>
  );
}

function SmartHouse() {
  const { scene } = useGLTF("/nha.glb");
  return <primitive object={scene} scale={[0.8, 0.8, 0.8]} position={[0,1.6,0]} />;
}

function Human({ position, color, name, role }) {
  const isBroker = role === "broker";
  return (
    <group position={position}>
      <Billboard position={[0, 2.6, 0]}>
        <Text fontSize={isBroker?0.4:0.3} color={isBroker?"#d35400":"white"} outlineWidth={0.03} outlineColor="black">{name}</Text>
      </Billboard>
      <mesh position={[0, 1.6, 0]}>
        <boxGeometry args={[0.5, 0.5, 0.5]} />
        <meshStandardMaterial color={isBroker?"#f1c40f":color} />
      </mesh>
      <mesh position={[0, 0.75, 0]}>
        <boxGeometry args={[0.6, 1, 0.3]} />
        <meshStandardMaterial color={color} />
      </mesh>
      {isBroker && <mesh position={[0, 1, 0.16]}><boxGeometry args={[0.1, 0.4, 0.05]} /><meshStandardMaterial color="red" /></mesh>}
    </group>
  );
}

// --- 4. APP CHÍNH ---
export default function App() {
  const [players, setPlayers] = useState({});
  const [envPreset, setEnvPreset] = useState("city");
  const [lightsOn, setLightsOn] = useState(false); // State đèn sân vườn
  const [chatList, setChatList] = useState([]);
  const [message, setMessage] = useState("");
  const [myInfo, setMyInfo] = useState({ name: "", role: "client" });

  useEffect(() => {
    socket.on("updatePlayers", (p) => {
        setPlayers(p);
        if(p[socket.id]) setMyInfo({ name: p[socket.id].name, role: p[socket.id].role });
    });
    socket.on("receiveMessage", (data) => setChatList((prev) => [...prev, data]));
    socket.on("updateEnvironment", (preset) => setEnvPreset(preset));
    socket.on("updateLights", (status) => setLightsOn(status)); // Nghe lệnh bật đèn

    return () => { socket.off("updatePlayers"); socket.off("receiveMessage"); socket.off("updateEnvironment"); socket.off("updateLights"); };
  }, []);

  const changeMode = (mode) => socket.emit("changeEnvironment", mode);
  const toggleLights = () => socket.emit("toggleLights"); // Gửi lệnh bật đèn

  const sendMessage = () => {
    if (message.trim()) {
      socket.emit("sendMessage", { text: message });
      setMessage("");
    }
  };

  return (
    <div style={{ width: "100vw", height: "100vh", position: "relative", fontFamily: "Segoe UI", background: "#111" }}>
      
      {/* PANEL ĐIỀU KHIỂN (Góc trên trái) */}
      <div style={{ position: "absolute", top: "20px", left: "20px", zIndex: 10, display: "flex", gap: "10px" }}>
        {/* Nút Ngày / Đêm */}
        <button onClick={() => changeMode(envPreset==="city"?"night":"city")} 
            style={{padding: "10px 15px", background: "white", borderRadius: "8px", cursor:"pointer", fontWeight:"bold"}}>
            {envPreset==="city" ? "🌙 Chuyển sang Đêm" : "☀️ Chuyển sang Ngày"}
        </button>

        {/* Nút Bật Đèn IoT (Chỉ hiện cho vui hoặc ai cũng bấm được tùy bạn, ở đây để ai cũng bấm được để test) */}
        <button onClick={toggleLights} 
            style={{
                padding: "10px 15px", 
                background: lightsOn ? "#f1c40f" : "#95a5a6", 
                color: lightsOn ? "black" : "white",
                borderRadius: "8px", cursor:"pointer", fontWeight:"bold", border: "none"
            }}>
            💡 {lightsOn ? "Tắt Đèn Sân Vườn" : "Bật Đèn Sân Vườn"}
        </button>
      </div>

      <Canvas camera={{ position: [5, 5, 12], fov: 50 }} shadows>
        <Environment preset={envPreset} background blur={0.5} />
        
        {/* Nếu là đêm thì tối hẳn để đèn sân vườn nổi bật */}
        <ambientLight intensity={envPreset === "night" ? 0.1 : 0.7} />
        <pointLight position={[10, 10, 10]} intensity={envPreset === "night" ? 0.5 : 1} />

        <OrbitControls maxPolarAngle={Math.PI / 2 - 0.05} />

        <Floor />
        <SmartHouse />
        
        {/* Biển báo: Truyền vai trò (role) vào để kiểm tra */}
        <StatusSign position={[-3, 0, 4]} role={myInfo.role} />

        {/* HỆ THỐNG ĐÈN SÂN VƯỜN (Đặt 4 góc nhà) */}
        <GardenLamp position={[4, 0, 4]} isOn={lightsOn} />
        <GardenLamp position={[-4, 0, 4]} isOn={lightsOn} />
        <GardenLamp position={[4, 0, -4]} isOn={lightsOn} />
        <GardenLamp position={[-8, 0, -8]} isOn={lightsOn} />

        {Object.keys(players).map((key) => (
            <Human key={key} position={players[key].position} color={players[key].color} 
                   name={players[key].name} role={players[key].role} />
        ))}
      </Canvas>

      {/* CHAT BOX */}
      <div style={{
        position: "absolute", bottom: "20px", left: "20px", width: "320px", height: "400px",
        background: "rgba(255,255,255,0.95)", borderRadius: "12px", padding: "15px", display: "flex", flexDirection: "column"
      }}>
        <div style={{borderBottom: "1px solid #ddd", paddingBottom: "10px", marginBottom: "10px"}}>
          <h3 style={{margin: 0, color: "#333"}}>Live Chat</h3>
          <small>Bạn là: <b style={{color: myInfo.role==='broker'?"#d35400":"#2980b9"}}>{myInfo.name}</b></small>
        </div>
        <div style={{flex: 1, overflowY:"auto", paddingRight: "5px"}}>
           {chatList.map((msg, i) => {
             const isMe = msg.id === socket.id;
             let bg = isMe ? "#007bff" : "#f1f2f6";
             let color = isMe ? "white" : "#333";
             if (msg.role === 'system') { bg = "#e74c3c"; color = "white"; }
             if (msg.role === 'broker' && !isMe) { bg = "#fcf8e3"; color = "#8a6d3b"; }
             return (
               <div key={i} style={{marginBottom: "8px", textAlign: isMe ? "right" : "left"}}>
                   <span style={{background: bg, color: color, padding: "8px 12px", borderRadius: "15px", fontSize: "13px", display:"inline-block"}}>
                       {msg.text}
                   </span>
               </div>
             )
           })}
        </div>
        <div style={{display:"flex", gap:"5px", marginTop:"10px"}}>
            <input value={message} onChange={e=>setMessage(e.target.value)} onKeyDown={e=>e.key==="Enter"&&sendMessage()} placeholder="..." style={{flex:1, padding:"10px", borderRadius:"20px", border:"1px solid #ddd"}} />
            <button onClick={sendMessage} style={{background:"#2ecc71", color:"white", border:"none", borderRadius:"20px", padding:"0 15px"}}>Gửi</button>
        </div>
      </div>
    </div>
  );
}