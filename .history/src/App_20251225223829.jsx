import React, { useEffect, useState, useRef } from "react";
import io from "socket.io-client";
import { Canvas, useFrame } from "@react-three/fiber";
import { OrbitControls, useGLTF, Text, Billboard, Environment, Html, Stars } from "@react-three/drei";
import { HexColorPicker } from "react-colorful"; // Cần cài thư viện này
import * as THREE from "three";

const socket = io.connect("http://localhost:3001");

// --- CẤU HÌNH VỊ TRÍ CAMERA CHO TỪNG PHÒNG ---
const ROOMS = {
  Outside: { pos: [5, 5, 15], target: [0, 0, 0] },
  LivingRoom: { pos: [0, 2, 4], target: [0, 1, 0] },
  Kitchen: { pos: [-3, 2, -1], target: [-3, 1, -3] },
  Bedroom: { pos: [3, 3, -1], target: [3, 2, -3] }
};

// --- COMPONENT: ĐIỀU KHIỂN CAMERA ---
function CameraController({ targetRoom }) {
  const vec = new THREE.Vector3();
  useFrame((state) => {
    const desired = ROOMS[targetRoom];
    // Hiệu ứng zoom mượt (Linear Interpolation)
    state.camera.position.lerp(vec.set(...desired.pos), 0.05);
    state.camera.lookAt(desired.target[0], desired.target[1], desired.target[2]);
  });
  return null;
}

// --- COMPONENT: PHÒNG TÙY CHỈNH MÀU ---
function EditableRoom({ name, position, size, design, onSelect }) {
  // design = { wall: color, floor: color }
  return (
    <group position={position}>
      {/* SÀN NHÀ */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.05, 0]} 
            onClick={(e) => { e.stopPropagation(); onSelect(name, 'floor'); }}>
        <planeGeometry args={[size[0], size[1]]} />
        <meshStandardMaterial color={design?.floor || "#ccc"} />
      </mesh>
      
      {/* TƯỜNG SAU */}
      <mesh position={[0, size[2]/2, -size[1]/2]} 
            onClick={(e) => { e.stopPropagation(); onSelect(name, 'wall'); }}>
        <boxGeometry args={[size[0], size[2], 0.1]} />
        <meshStandardMaterial color={design?.wall || "#fff"} />
      </mesh>

      {/* LABEL TÊN PHÒNG */}
      <Text position={[0, 2.5, 0]} fontSize={0.3} color="black">{name.toUpperCase()}</Text>
    </group>
  );
}

// --- COMPONENT: AVATAR NGƯỜI CHƠI (Cập nhật hiển thị phòng) ---
function Human({ p }) {
  return (
    <group position={p.position}>
      <Billboard position={[0, 2.8, 0]}>
        <Text fontSize={0.25} color="black" outlineWidth={0.02} outlineColor="white">
          {p.name}
        </Text>
        <Text position={[0, -0.3, 0]} fontSize={0.15} color="#555">
          ({p.currentRoom})
        </Text>
      </Billboard>
      <mesh position={[0, 1, 0]}><cylinderGeometry args={[0.3, 0.3, 2]} /><meshStandardMaterial color={p.color} /></mesh>
    </group>
  );
}

// --- MAIN APP ---
export default function App() {
  // State Socket
  const [players, setPlayers] = useState({});
  const [design, setDesign] = useState({});
  const [myRole, setMyRole] = useState("client");

  // State Logic
  const [currentRoom, setCurrentRoom] = useState("Outside");
  const [colorPicker, setColorPicker] = useState({ show: false, room: null, type: null });
  
  // State Chat & UI
  const [chatList, setChatList] = useState([]); // public chat
  const [privateChats, setPrivateChats] = useState([]); // danh sách tin riêng
  const [msgText, setMsgText] = useState("");
  const [selectedUserChat, setSelectedUserChat] = useState(null); // ID người đang chat riêng

  // State Tài Chính
  const [showFinance, setShowFinance] = useState(false);
  const [loanAmount, setLoanAmount] = useState(500000);
  const [loanYears, setLoanYears] = useState(20);
  const [contractSigned, setContractSigned] = useState(false);

  useEffect(() => {
    socket.on("updatePlayers", (p) => {
      setPlayers(p);
      if(p[socket.id]) setMyRole(p[socket.id].role);
    });
    socket.on("updateDesign", (d) => setDesign(d));
    socket.on("receiveMessage", (d) => setChatList(prev => [...prev, d]));
    
    // Nhận tin nhắn riêng
    socket.on("receivePrivateMessage", (d) => {
      setPrivateChats(prev => [...prev, d]);
      // Thông báo hoặc mở tab chat (đơn giản hóa ở đây)
      alert(`📩 Tin nhắn riêng từ ${d.from || "Bạn"}: ${d.text}`);
    });

    return () => { socket.off("updatePlayers"); socket.off("updateDesign"); };
  }, []);

  // --- XỬ LÝ LOGIC ---
  const handleMove = (room) => {
    setCurrentRoom(room);
    socket.emit("playerMove", room);
  };

  const handleColorChange = (color) => {
    if(colorPicker.room && colorPicker.type) {
      socket.emit("changeDesign", { room: colorPicker.room, type: colorPicker.type, color });
    }
  };

  const sendMsg = () => {
    if(!msgText) return;
    socket.emit("sendMessage", { text: msgText, toId: selectedUserChat });
    setMsgText("");
  };

  // Tính tiền trả hàng tháng (Mortgage)
  const calculateMonthly = () => {
    const r = 0.08 / 12; // Lãi 8%/năm
    const n = loanYears * 12;
    return (loanAmount * r * Math.pow(1+r, n)) / (Math.pow(1+r, n) - 1);
  };

  // WASD giả lập (Bắt sự kiện phím)
  useEffect(() => {
    const handleKey = (e) => {
      if(e.key === 'w' || e.key === 'W') handleMove("LivingRoom");
      if(e.key === 's' || e.key === 'S') handleMove("Outside");
      if(e.key === 'a' || e.key === 'A') handleMove("Kitchen");
      if(e.key === 'd' || e.key === 'D') handleMove("Bedroom");
    };
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, []);

  return (
    <div style={{ width: "100vw", height: "100vh", position: "relative", background: "#ecf0f1", fontFamily: "Arial" }}>
      
      {/* 1. HUD ĐIỀU KHIỂN TRÊN CÙNG */}
      <div style={{position: "absolute", top: 10, left: 10, zIndex: 100, display: "flex", gap: "10px"}}>
        <div style={{background: "white", padding: "10px", borderRadius: "8px", boxShadow: "0 2px 10px rgba(0,0,0,0.1)"}}>
          <b>🎮 Điều khiển (WASD):</b>
          <button onClick={()=>handleMove('Outside')}>[S] Ngoài sân</button>
          <button onClick={()=>handleMove('LivingRoom')}>[W] Phòng Khách</button>
          <button onClick={()=>handleMove('Kitchen')}>[A] Bếp</button>
          <button onClick={()=>handleMove('Bedroom')}>[D] Phòng Ngủ</button>
        </div>
        <button onClick={()=>setShowFinance(!showFinance)} style={{background: "#27ae60", color: "white", border: "none", borderRadius: "8px", fontWeight: "bold", padding: "0 15px"}}>
          💰 Ký Hợp Đồng & Vay
        </button>
      </div>

      {/* 2. KHUNG CẢNH 3D */}
      <Canvas shadows>
        <CameraController targetRoom={currentRoom} />
        <Environment preset="city" />
        <ambientLight intensity={0.5} />
        <pointLight position={[10, 10, 10]} />
        
        {/* Sàn đất chung */}
        <mesh rotation={[-Math.PI/2, 0, 0]} position={[0, -0.1, 0]} receiveShadow>
            <planeGeometry args={[50, 50]} />
            <meshStandardMaterial color="#34495e" />
        </mesh>

        {/* CÁC PHÒNG (Cho phép đổi màu) */}
        <group position={[0, 0, 0]}>
            {/* Phòng Khách (Giữa) */}
            <EditableRoom name="livingRoom" position={[0, 0, 0]} size={[4, 5, 3]} design={design.livingRoom}
                          onSelect={(r, t) => setColorPicker({show:true, room: r, type: t})} />
            
            {/* Bếp (Trái) */}
            <EditableRoom name="kitchen" position={[-4.5, 0, -2]} size={[3, 4, 3]} design={design.kitchen}
                          onSelect={(r, t) => setColorPicker({show:true, room: r, type: t})} />

            {/* Phòng Ngủ (Phải) */}
            <EditableRoom name="bedroom" position={[4.5, 0, -2]} size={[3, 4, 3]} design={design.bedroom}
                          onSelect={(r, t) => setColorPicker({show:true, room: r, type: t})} />
        </group>

        {/* NGƯỜI CHƠI */}
        {Object.values(players).map(p => (
            <Human key={p.id} p={p} />
        ))}
      </Canvas>

      {/* 3. BẢNG MÀU (Hiện khi click vào tường/sàn) */}
      {colorPicker.show && (
        <div style={{position: "absolute", top: "50%", left: "50%", transform: "translate(-50%, -50%)", background: "white", padding: "20px", borderRadius: "10px", zIndex: 200, boxShadow: "0 10px 30px rgba(0,0,0,0.3)"}}>
            <h3>🎨 Đổi màu {colorPicker.type === 'wall' ? 'Tường' : 'Sàn'} {colorPicker.room}</h3>
            <HexColorPicker onChange={handleColorChange} />
            <button onClick={()=>setColorPicker({show:false})} style={{marginTop: "10px", width: "100%", padding: "8px"}}>Xong</button>
        </div>
      )}

      {/* 4. MODAL TÀI CHÍNH & SMART CONTRACT */}
      {showFinance && (
          <div style={{position: "absolute", top: "10%", right: "350px", width: "300px", background: "white", padding: "20px", borderRadius: "10px", zIndex: 100, borderLeft: "5px solid #27ae60"}}>
              <h3 style={{color: "#27ae60"}}>📜 Smart Contract</h3>
              <p>Mã căn hộ: <b>METAVERSE_A1</b></p>
              <p>Trạng thái: {contractSigned ? <span style={{color:"green", fontWeight:"bold"}}>ĐÃ KÝ (Blockchain Verified)</span> : "Chưa ký"}</p>
              {!contractSigned && (
                  <button onClick={()=>setContractSigned(true)} style={{background:"#2980b9", color:"white", border:"none", width:"100%", padding:"10px", cursor:"pointer"}}>
                      ✍️ Ký hợp đồng kỹ thuật số
                  </button>
              )}
              
              <hr />
              <h4>🏦 Tính toán vay (Mortgage)</h4>
              <label>Vay ($): <input type="number" value={loanAmount} onChange={e=>setLoanAmount(e.target.value)} style={{width:"100%"}}/></label>
              <label>Số năm: <input type="number" value={loanYears} onChange={e=>setLoanYears(e.target.value)} style={{width:"100%"}}/></label>
              <div style={{marginTop: "10px", background: "#f1c40f", padding: "10px", fontWeight: "bold"}}>
                  Trả hàng tháng: ${calculateMonthly().toFixed(2)}
              </div>
          </div>
      )}

      {/* 5. CHAT SYSTEM (Nâng cấp) */}
      <div style={{position: "absolute", bottom: 20, right: 20, width: 320, height: 400, background: "white", borderRadius: "10px", display: "flex", flexDirection: "column", overflow: "hidden", boxShadow: "0 5px 20px rgba(0,0,0,0.2)"}}>
          {/* Header Chat */}
          <div style={{background: "#2c3e50", color: "white", padding: "10px"}}>
              <b>💬 Chat Box</b>
              <select onChange={e => setSelectedUserChat(e.target.value)} style={{float: "right", fontSize: "11px"}}>
                  <option value="">-- Chat Tổng --</option>
                  {Object.values(players).filter(p => p.id !== socket.id).map(p => (
                      <option key={p.id} value={p.id}>Chat với {p.name}</option>
                  ))}
              </select>
          </div>

          {/* Nội dung Chat */}
          <div style={{flex: 1, padding: "10px", overflowY: "auto", background: "#f7f9fc"}}>
            {/* Hiển thị tin riêng nếu đang chọn user, ngược lại tin tổng */}
            {(selectedUserChat ? privateChats : chatList).map((msg, i) => (
                <div key={i} style={{marginBottom: "8px", textAlign: msg.id === socket.id || msg.isSelf ? "right" : "left"}}>
                    <div style={{fontSize: "10px", color: "#888"}}>{msg.name || (msg.isSelf ? "Tôi" : msg.from)}</div>
                    <span style={{
                        background: selectedUserChat ? "#ffeaa7" : (msg.id === socket.id ? "#3498db" : "#ecf0f1"),
                        color: msg.id === socket.id ? "white" : "black",
                        padding: "5px 10px", borderRadius: "10px", display: "inline-block"
                    }}>
                        {msg.text}
                    </span>
                </div>
            ))}
          </div>

          {/* Input Chat */}
          <div style={{padding: "10px", borderTop: "1px solid #eee", display: "flex"}}>
              <input value={msgText} onChange={e=>setMsgText(e.target.value)} 
                     placeholder={selectedUserChat ? "Nhập tin nhắn riêng..." : "Nhập tin nhắn..."} 
                     style={{flex: 1, padding: "8px", border: "1px solid #ddd", borderRadius: "4px"}} />
              <button onClick={sendMsg} style={{marginLeft: "5px", background: "#2980b9", color: "white", border: "none", borderRadius: "4px"}}>➤</button>
          </div>
      </div>

    </div>
  );
}