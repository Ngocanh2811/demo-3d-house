import React, { useEffect, useState, useRef } from "react";
import io from "socket.io-client";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { OrbitControls, useGLTF, Text, Billboard, Environment, Html, Stars } from "@react-three/drei";
import { HexColorPicker } from "react-colorful";
import * as THREE from "three";

const socket = io.connect("http://localhost:3001");

// --- 1. CÁC COMPONENT CŨ (GIỮ NGUYÊN) ---
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

function GardenLamp({ position, isOn }) {
  return (
    <group position={position}>
      <mesh position={[0, 1, 0]}><cylinderGeometry args={[0.05, 0.1, 2]} /><meshStandardMaterial color="#2c3e50" /></mesh>
      <mesh position={[0, 2, 0]}><sphereGeometry args={[0.25, 16, 16]} /><meshStandardMaterial color={isOn ? "#f1c40f" : "#7f8c8d"} emissive={isOn ? "#f1c40f" : "black"} emissiveIntensity={isOn ? 3 : 0}/></mesh>
      {isOn && <pointLight position={[0, 2.2, 0]} distance={10} intensity={3} color="#f1c40f" />}
    </group>
  );
}

function StatusSign({ position, role }) {
  const [status, setStatus] = useState("FOR SALE");
  useEffect(() => { socket.on("updateHouseStatus", (s) => setStatus(s)); return () => socket.off("updateHouseStatus"); }, []);
  const handleClick = () => { if (role === "broker") socket.emit("changeStatus", status === "FOR SALE" ? "SOLD" : "FOR SALE"); };
  return (
    <group position={position} onClick={handleClick}>
      <mesh position={[0, 1, 0]}><cylinderGeometry args={[0.05, 0.05, 2]} /><meshStandardMaterial color="#333" /></mesh>
      <mesh position={[0, 2, 0]}><boxGeometry args={[1.5, 0.8, 0.1]} /><meshStandardMaterial color={status === "SOLD" ? "#c0392b" : "#27ae60"} /></mesh>
      <Text position={[0, 2, 0.06]} fontSize={0.35} color="white" fontWeight="bold">{status}</Text>
    </group>
  );
}

// --- 2. XỬ LÝ CAMERA THÔNG MINH (MỚI) ---
// Di chuyển camera đến vị trí định sẵn khi bấm phím, nhưng vẫn cho phép xoay
function CameraHandler({ targetView }) {
  const { camera, controls } = useThree();
  const vec = new THREE.Vector3();
  const targetVec = new THREE.Vector3();

  useFrame(() => {
    if (!targetView) return;
    
    // Định nghĩa toạ độ cho từng phòng
    let dest = [5, 5, 15]; // Default: Ngoài sân
    let look = [0, 0, 0];
    
    if (targetView === "Living") { dest = [0, 2, 5]; look = [0, 1, 0]; }
    else if (targetView === "Kitchen") { dest = [-3, 2, 2]; look = [-3, 1, -2]; }
    else if (targetView === "Bedroom") { dest = [3, 3, 2]; look = [3, 1, -2]; }

    // Hiệu ứng bay từ từ (Lerp)
    camera.position.lerp(vec.set(...dest), 0.05);
    if(controls?.current) {
        controls.current.target.lerp(targetVec.set(...look), 0.05);
        controls.current.update();
    }
  });
  return null;
}

// --- 3. SÀN NHÀ TƯƠNG TÁC (MỚI) ---
// Phủ một lớp sàn mỏng lên model glb để đổi màu
function InteractiveFloor({ position, size, color, onClick }) {
    return (
        <mesh rotation={[-Math.PI / 2, 0, 0]} position={position} onClick={onClick} receiveShadow>
            <planeGeometry args={size} />
            <meshStandardMaterial color={color} transparent opacity={0.9} />
             {/* Hiệu ứng khi hover/click: Bạn có thể thêm border nếu thích */}
        </mesh>
    )
}

// --- 4. NGÔI NHÀ CŨ + TÍNH NĂNG MỚI ---
function SmartHouse({ floorColors, onFloorClick }) {
  const { scene } = useGLTF("/nha.glb");
  const [showInfo, setShowInfo] = useState(false);

  return (
    <group position={[0, 1.6, 0]}>
      {/* MODEL NHÀ GỐC CỦA BẠN */}
      <primitive object={scene} scale={[0.8, 0.8, 0.8]} />
      
      {/* SÀN TƯƠNG TÁC (Đắp thêm vào đúng vị trí các phòng trong nhà) */}
      {/* Phòng khách (Giữa) */}
      <InteractiveFloor position={[0, 0.05, 0]} size={[3, 4]} color={floorColors.living} onClick={(e)=>{e.stopPropagation(); onFloorClick('living')}} />
      {/* Bếp (Trái) */}
      <InteractiveFloor position={[-3, 0.05, -1]} size={[2.5, 3]} color={floorColors.kitchen} onClick={(e)=>{e.stopPropagation(); onFloorClick('kitchen')}} />
      {/* Ngủ (Phải) */}
      <InteractiveFloor position={[3, 0.05, -1]} size={[2.5, 3]} color={floorColors.bedroom} onClick={(e)=>{e.stopPropagation(); onFloorClick('bedroom')}} />

      {/* NÚT INFO CŨ */}
      <mesh position={[2, 3, 2]} onClick={() => setShowInfo(!showInfo)}>
        <sphereGeometry args={[0.3, 16, 16]} />
        <meshBasicMaterial color="#ff4757" transparent opacity={0.9} />
        <Billboard position={[0, 0.6, 0]}><Text fontSize={0.3} color="white">Info</Text></Billboard>
      </mesh>

      {showInfo && (
        <Html position={[2, 4, 2]} center>
          <div style={{ background: "rgba(255,255,255,0.95)", padding: "15px", borderRadius: "10px", width: "200px", textAlign: "left", border: "1px solid #ccc" }}>
            <h4 style={{margin: "0 0 10px 0"}}>🏡 Biệt Thự Phố</h4>
            <p style={{margin: "5px 0", fontSize: "13px"}}>Giá: <b>$500,000</b></p>
            <p style={{margin: "5px 0", fontSize: "13px"}}>Diện tích: 200m2</p>
            <button onClick={() => setShowInfo(false)} style={{marginTop:"5px", background:"red", color:"white", border:"none", borderRadius:"5px", padding:"5px 10px", cursor:"pointer"}}>Đóng</button>
          </div>
        </Html>
      )}
    </group>
  );
}

// --- 5. HUMAN (Cập nhật hiển thị phòng đang đứng) ---
function Human({ position, color, name, role, currentRoom }) {
  const isBroker = role === "broker";
  return (
    <group position={position}>
      <Billboard position={[0, 3, 0]}>
        <Text fontSize={0.3} color={isBroker?"#d35400":"white"} outlineWidth={0.03} outlineColor="black">{name}</Text>
        <Text position={[0, -0.35, 0]} fontSize={0.18} color="#f1c40f">({currentRoom || "Sân"})</Text>
      </Billboard>
      <mesh position={[0, 1.6, 0]}><boxGeometry args={[0.5, 0.5, 0.5]} /><meshStandardMaterial color={isBroker?"#f1c40f":color} /></mesh>
      <mesh position={[0, 0.75, 0]}><boxGeometry args={[0.6, 1, 0.3]} /><meshStandardMaterial color={color} /></mesh>
    </group>
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
  
  // State mới
  const [floorColors, setFloorColors] = useState({ living: "#ccc", kitchen: "#ccc", bedroom: "#ccc" });
  const [cameraView, setCameraView] = useState(null); // 'Living', 'Kitchen'...
  const [colorPicker, setColorPicker] = useState({ show: false, room: null });
  const [targetChatId, setTargetChatId] = useState(""); // ID người muốn chat riêng
  
  // State Tài chính
  const [showFinance, setShowFinance] = useState(false);
  const [loanAmount, setLoanAmount] = useState(500000);
  const [isSigned, setIsSigned] = useState(false);

  const chatEndRef = useRef(null);

  useEffect(() => {
    socket.on("updatePlayers", (p) => { setPlayers(p); if(p[socket.id]) setMyInfo({name:p[socket.id].name, role:p[socket.id].role}); });
    socket.on("receiveMessage", (data) => setChatList((prev) => [...prev, data]));
    socket.on("updateEnvironment", (p) => setEnvPreset(p));
    socket.on("updateLights", (l) => setLightsOn(l));
    socket.on("updateFloors", (f) => setFloorColors(f)); // Nhận màu sàn
    
    return () => { socket.off("updatePlayers"); socket.off("receiveMessage"); socket.off("updateEnvironment"); socket.off("updateLights"); socket.off("updateFloors"); };
  }, []);

  useEffect(() => { chatEndRef.current?.scrollIntoView({ behavior: "smooth" }); }, [chatList]);

  // Handle Phím WASD để zoom phòng
  useEffect(() => {
    const handleKey = (e) => {
        let view = null;
        let roomName = "Sân Vườn";
        if(e.key === 'w' || e.key === 'W') { view = "Living"; roomName="P.Khách"; }
        if(e.key === 'a' || e.key === 'A') { view = "Kitchen"; roomName="Bếp"; }
        if(e.key === 'd' || e.key === 'D') { view = "Bedroom"; roomName="P.Ngủ"; }
        if(e.key === 's' || e.key === 'S') { view = null; roomName="Sân Vườn"; } // Reset view
        
        setCameraView(view);
        socket.emit("updateRoom", roomName);
    };
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, []);

  const sendMessage = () => { 
      if(message.trim()){ 
          socket.emit("sendMessage", { text: message, toId: targetChatId }); // Gửi kèm toId nếu có
          setMessage(""); 
      }
  };

  const handleFloorChange = (color) => {
      socket.emit("changeFloorColor", { room: colorPicker.room, color: color });
  };

  const isNight = envPreset === "night";

  return (
    <div style={{ width: "100vw", height: "100vh", position: "relative", fontFamily: "Segoe UI", background: "#111" }}>
      
      {/* 1. NÚT ĐIỀU KHIỂN TRÊN CÙNG (Thêm hướng dẫn WASD) */}
      <div style={{ position: "absolute", top: "20px", left: "20px", zIndex: 10, display: "flex", gap: "10px", alignItems:"center" }}>
        <button onClick={() => socket.emit("changeEnvironment", isNight ? "city" : "night")} style={{padding: "8px 12px", background: isNight?"#2c3e50":"#f1c40f", color: "white", borderRadius: "8px", border:"none", cursor:"pointer", fontWeight:"bold"}}>
            {isNight ? "🌙 Đêm" : "☀️ Ngày"}
        </button>
        <button onClick={() => socket.emit("toggleLights")} style={{padding: "8px 12px", background: lightsOn?"#e67e22":"#7f8c8d", color: "white", borderRadius: "8px", border:"none", cursor:"pointer", fontWeight:"bold"}}>
            💡 Đèn
        </button>
        <button onClick={() => setShowFinance(!showFinance)} style={{padding: "8px 12px", background: "#27ae60", color: "white", borderRadius: "8px", border:"none", cursor:"pointer", fontWeight:"bold"}}>
            💰 Vay & Hợp Đồng
        </button>
        <div style={{color: "white", background:"rgba(0,0,0,0.5)", padding: "5px 10px", borderRadius: "5px", fontSize: "12px"}}>
            Phím: <b>W</b> (Khách) - <b>A</b> (Bếp) - <b>D</b> (Ngủ) - <b>S</b> (Ra sân)
        </div>
      </div>

      {/* 2. CANVASS 3D */}
      <Canvas camera={{ position: [5, 5, 15], fov: 50 }} shadows>
        <CameraHandler targetView={cameraView} /> {/* Handle camera zoom */}
        <Environment preset={envPreset} background blur={0.6} />
        <CelestialBody isNight={isNight} />
        <ambientLight intensity={isNight ? 0.2 : 0.6} />
        <pointLight position={[10, 20, 10]} intensity={isNight ? 0.2 : 1} castShadow />
        <OrbitControls maxPolarAngle={Math.PI / 2 - 0.05} />

        <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.01, 0]}>
          <planeGeometry args={[60, 60]} />
          <meshStandardMaterial color={isNight ? "#2c3e50" : "#7f8c8d"} />
        </mesh>

        {/* Nhà Cũ + Sàn Mới */}
        <SmartHouse floorColors={floorColors} onFloorClick={(room) => setColorPicker({show:true, room})} />
        
        <StatusSign position={[-3, 0, 7]} role={myInfo.role} />
        <GardenLamp position={[16, 0, 8]} isOn={lightsOn} />
        <GardenLamp position={[-5, 0, 8]} isOn={lightsOn} />

        {Object.keys(players).map((key) => (
            <Human key={key} position={players[key].position} color={players[key].color} 
                   name={players[key].name} role={players[key].role} currentRoom={players[key].currentRoom} />
        ))}
      </Canvas>

      {/* 3. POPUP CHỌN MÀU SÀN */}
      {colorPicker.show && (
          <div style={{position:"absolute", top:"50%", left:"50%", transform:"translate(-50%,-50%)", background:"white", padding:"15px", borderRadius:"10px", zIndex:100}}>
              <h4>Đổi màu sàn {colorPicker.room}</h4>
              <HexColorPicker color={floorColors[colorPicker.room]} onChange={handleFloorChange} />
              <button onClick={()=>setColorPicker({show:false})} style={{width:"100%", marginTop:"10px", padding:"5px"}}>Đóng</button>
          </div>
      )}

      {/* 4. MODAL TÀI CHÍNH (SMART CONTRACT) */}
      {showFinance && (
          <div style={{position: "absolute", top: "100px", left: "20px", width: "300px", background: "white", padding: "20px", borderRadius: "10px", zIndex: 90, boxShadow: "0 5px 15px rgba(0,0,0,0.3)"}}>
              <h3 style={{color: "#27ae60", marginTop: 0}}>📜 Hợp Đồng Thông Minh</h3>
              <p>Trạng thái: {isSigned ? <b style={{color:"green"}}>ĐÃ KÝ (Blockchain)</b> : <b style={{color:"red"}}>Chưa ký</b>}</p>
              
              <div style={{background: "#f1f2f6", padding: "10px", borderRadius: "5px", marginBottom: "10px"}}>
                  <label>Số tiền vay ($):</label>
                  <input type="number" value={loanAmount} onChange={e=>setLoanAmount(e.target.value)} style={{width:"100%", marginBottom:"5px"}}/>
                  <small>Lãi suất: 8%/năm</small><br/>
                  <b>Trả hàng tháng: ${ ((loanAmount * 0.08/12) / (1 - Math.pow(1 + 0.08/12, -240))).toFixed(2) }</b>
              </div>

              {!isSigned && <button onClick={()=>setIsSigned(true)} style={{width:"100%", background:"#2980b9", color:"white", padding:"10px", border:"none", cursor:"pointer"}}>✍️ Ký Ngay</button>}
              <button onClick={()=>setShowFinance(false)} style={{width:"100%", background:"#ccc", marginTop:"5px", padding:"5px", border:"none", cursor:"pointer"}}>Đóng</button>
          </div>
      )}

      {/* 5. CHAT BOX CŨ (Đã thêm tính năng Chat Riêng) */}
      <div style={{
        position: "absolute", bottom: "20px", left: "20px", width: "350px", height: "450px",
        background: "rgba(255,255,255,0.95)", borderRadius: "16px", padding: "20px", display: "flex", flexDirection: "column",
        boxShadow: "0 10px 40px rgba(0,0,0,0.3)"
      }}>
        <div style={{borderBottom: "1px solid #ddd", paddingBottom: "10px", marginBottom: "15px", display:"flex", justifyContent:"space-between", alignItems:"center"}}>
          <div>
              <h3 style={{margin: 0, color: "#2c3e50"}}>Tư Vấn Trực Tuyến</h3>
              <small>Xin chào: <b style={{color: myInfo.role==='broker'?"#e67e22":"#2980b9"}}>{myInfo.name}</b></small>
          </div>
          {/* MENU CHỌN NGƯỜI CHAT RIÊNG */}
          <select onChange={(e)=>setTargetChatId(e.target.value)} style={{maxWidth: "100px", fontSize:"11px"}}>
              <option value="">Chat Tổng</option>
              {Object.values(players).filter(p => p.id !== socket.id).map(p => (
                  <option key={p.id} value={p.id}>{p.name}</option>
              ))}
          </select>
        </div>

        <div style={{flex: 1, overflowY:"auto", paddingRight: "5px", display: "flex", flexDirection: "column", gap: "10px"}}>
           {chatList.map((msg, i) => {
             const isMe = msg.id === socket.id;
             const isPrivate = msg.isPrivate; // Check xem có phải tin riêng không
             const isSystem = msg.role === 'system';
             
             if (isSystem) return <div key={i} style={{textAlign:"center"}}><span style={{background:"#e74c3c", color:"white", fontSize:"10px", padding:"3px 8px", borderRadius:"10px"}}>{msg.text}</span></div>;

             return (
               <div key={i} style={{alignSelf: isMe ? "flex-end" : "flex-start", maxWidth: "85%"}}>
                   {!isMe && <div style={{fontSize: "10px", fontWeight: "bold", marginLeft:"5px", color: isPrivate ? "#e67e22" : "#7f8c8d"}}>{msg.name} {isPrivate && "(Riêng tư)"}</div>}
                   <div style={{
                       background: isMe ? (isPrivate?"#d35400":"#007bff") : (isPrivate?"#fceaa7":"#f1f2f6"), // Màu khác nếu là tin riêng
                       color: isMe ? "white" : "black",
                       padding: "8px 12px", borderRadius: "16px", fontSize: "14px",
                       borderBottomRightRadius: isMe ? "4px" : "16px", borderBottomLeftRadius: isMe ? "16px" : "4px",
                       border: isPrivate ? "1px solid #f39c12" : "none"
                   }}>
                       {msg.text}
                   </div>
               </div>
             )
           })}
           <div ref={chatEndRef} />
        </div>
        
        <div style={{display:"flex", gap:"8px", marginTop:"15px"}}>
            <input value={message} onChange={e=>setMessage(e.target.value)} onKeyDown={e=>e.key==="Enter"&&sendMessage()} 
                   placeholder={targetChatId ? "Đang chat riêng..." : "Nhập tin nhắn..."}
                   style={{flex:1, padding:"12px", borderRadius:"25px", border:"1px solid #ddd", outline:"none", background: "#f8f9fa"}} />
            <button onClick={sendMessage} style={{background:"#2ecc71", color:"white", border:"none", borderRadius:"25px", padding:"0 20px", cursor:"pointer", fontWeight:"bold"}}>Gửi</button>
        </div>
      </div>
    </div>
  );
}