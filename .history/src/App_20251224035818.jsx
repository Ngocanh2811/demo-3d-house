import React, { useEffect, useState } from "react";
import io from "socket.io-client";
import { Canvas } from "@react-three/fiber";
import { 
  OrbitControls, 
  useGLTF, 
  Text, 
  Billboard, 
  Environment, 
  ContactShadows,
  MeshReflectorMaterial 
} from "@react-three/drei";

const socket = io.connect("http://localhost:3001");

// --- 1. SÀN NHÀ (GƯƠNG MỜ SANG TRỌNG) ---
// Sàn này sẽ phản chiếu bóng ngôi nhà, nhìn rất thực
function Floor() {
  return (
    <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.01, 0]}>
      <planeGeometry args={[50, 50]} />
      <MeshReflectorMaterial
        blur={[300, 100]}
        resolution={1024}
        mixBlur={1}
        mixStrength={40}
        roughness={1}
        depthScale={1.2}
        minDepthThreshold={0.4}
        maxDepthThreshold={1.4}
        color="#101010"
        metalness={0.5}
      />
    </mesh>
  );
}

// --- 2. CĂN NHÀ (ĐÃ CHỈNH VỊ TRÍ) ---
function House() {
  const { scene } = useGLTF("/nha.glb");
  // LƯU Ý: position={[0, 0, 0]} 
  // Nếu nhà vẫn bị chìm, hãy tăng số ở giữa lên. Ví dụ: [0, 2.5, 0]
  return <primitive object={scene} scale={[0.8, 0.8, 0.8]} position={[0, 2.5, 0]} />;
}

// --- 3. AVATAR ROBOT ---
function Human({ position, color, name }) {
  return (
    <group position={position}>
      <Billboard position={[0, 2.5, 0]}>
        <Text fontSize={0.3} color="white" outlineWidth={0.02} outlineColor="black">
          {name}
        </Text>
      </Billboard>
      {/* Robot đơn giản */}
      <mesh position={[0, 1.5, 0]}>
        <boxGeometry args={[0.5, 0.5, 0.5]} />
        <meshStandardMaterial color={color} />
      </mesh>
      <mesh position={[0, 0.75, 0]}>
        <boxGeometry args={[0.6, 1, 0.3]} />
        <meshStandardMaterial color={color} />
      </mesh>
      <ContactShadows opacity={0.7} scale={2} blur={2} far={1} />
    </group>
  );
}

// --- 4. APP CHÍNH ---
export default function App() {
  const [players, setPlayers] = useState({});
  const [message, setMessage] = useState("");
  const [chatList, setChatList] = useState([]);
  const [myName, setMyName] = useState("");

  useEffect(() => {
    socket.on("updatePlayers", (backendPlayers) => {
      setPlayers(backendPlayers);
      if(backendPlayers[socket.id]) setMyName(backendPlayers[socket.id].name);
    });
    socket.on("receiveMessage", (data) => setChatList((prev) => [...prev, data]));
    return () => { socket.off("updatePlayers"); socket.off("receiveMessage"); };
  }, []);

  const sendMessage = () => {
    if (message.trim()) {
      socket.emit("sendMessage", { text: message });
      setMessage("");
    }
  };

  return (
    <div style={{ width: "100vw", height: "100vh", position: "relative", background: "#111" }}>
      
      {/* 3D SCENE */}
      <Canvas shadows camera={{ position: [8, 8, 15], fov: 50 }}>
        {/* Môi trường: Chọn 'city' hoặc 'sunset' hoặc 'park' */}
        <Environment preset="city" background blur={0.6} />
        
        <ambientLight intensity={0.5} />
        <pointLight position={[10, 10, 10]} intensity={1} castShadow />

        {/* Điều khiển Camera */}
        <OrbitControls 
          maxPolarAngle={Math.PI / 2 - 0.05} // Không cho chui xuống đất
          minDistance={5} // Không cho zoom quá gần
          maxDistance={30} // Không cho zoom quá xa
        />

        <Floor />
        
        {/* Nâng nhà lên một chút nếu bị chìm */}
        <group position={[0, 0, 0]}>
           <House />
        </group>

        {/* Người chơi */}
        {Object.keys(players).map((key) => (
          <Human 
            key={key} 
            position={players[key].position} 
            color={players[key].color} 
            name={players[key].name} 
          />
        ))}
      </Canvas>

      {/* CHAT UI - Giao diện tối (Dark Mode) cho ngầu */}
      <div style={{
        position: "absolute", bottom: "20px", left: "20px",
        width: "350px", height: "400px",
        backgroundColor: "rgba(0, 0, 0, 0.8)", 
        backdropFilter: "blur(10px)",
        borderRadius: "16px", padding: "20px",
        display: "flex", flexDirection: "column", color: "white",
        boxShadow: "0 8px 32px rgba(0,0,0,0.5)",
        fontFamily: "Segoe UI, sans-serif", border: "1px solid rgba(255,255,255,0.1)"
      }}>
        <div style={{ borderBottom: "1px solid rgba(255,255,255,0.2)", paddingBottom: "10px", marginBottom: "10px"}}>
          <h3 style={{margin: 0, background: "linear-gradient(45deg, #FE6B8B 30%, #FF8E53 90%)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent"}}>
            Phòng Chat 3D
          </h3>
          <small style={{color: "#aaa"}}>Bạn là: {myName}</small>
        </div>

        <div style={{ flex: 1, overflowY: "auto", marginBottom: "15px", paddingRight: "5px" }}>
          {chatList.map((msg, index) => {
            const isMe = msg.id === socket.id;
            return (
              <div key={index} style={{ marginBottom: "10px", textAlign: isMe ? "right" : "left" }}>
                {!isMe && <div style={{fontSize: "11px", color: "#bbb", marginBottom: "2px", marginLeft: "8px"}}>{msg.name}</div>}
                <span style={{
                  background: isMe ? "linear-gradient(135deg, #667eea 0%, #764ba2 100%)" : "rgba(255,255,255,0.1)",
                  color: "white",
                  padding: "8px 14px", borderRadius: "12px", fontSize: "14px", display: "inline-block",
                  borderBottomRightRadius: isMe ? "2px" : "12px",
                  borderBottomLeftRadius: isMe ? "12px" : "2px"
                }}>
                  {msg.text}
                </span>
              </div>
            );
          })}
        </div>

        <div style={{ display: "flex", gap: "10px" }}>
          <input 
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && sendMessage()}
            placeholder="Nhập tin nhắn..."
            style={{ 
              flex: 1, padding: "12px", borderRadius: "30px", border: "none", outline: "none",
              background: "rgba(255,255,255,0.1)", color: "white"
            }}
          />
          <button onClick={sendMessage} style={{ 
            padding: "0 20px", borderRadius: "30px", border: "none", 
            background: "linear-gradient(45deg, #FE6B8B 30%, #FF8E53 90%)", color: "white", cursor: "pointer", fontWeight: "bold"
          }}>➤</button>
        </div>
      </div>
    </div>
  );
}