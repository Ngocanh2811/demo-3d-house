// src/App.jsx
import React, { useState, useEffect, useRef } from 'react';
import { Canvas } from '@react-three/fiber';
import { OrbitControls, useGLTF, Environment } from '@react-three/drei';
import io from 'socket.io-client';
import './App.css'; // File CSS cho chat box

// Kết nối tới server (đổi localhost thành IP server khi deploy)
const socket = io('http://100.127.255.253:3000'); 

// Component hiển thị Nhà 3D
function Model({ url }) {
  const { scene } = useGLTF(url);
  return <primitive object={scene} scale={1} />;
}

export default function App() {
  // State cho Chat
  const [message, setMessage] = useState('');
  const [chatHistory, setChatHistory] = useState([]);

  useEffect(() => {
    // Lắng nghe tin nhắn từ server
    socket.on('receive_message', (data) => {
      setChatHistory((prev) => [...prev, data]);
    });
    // Cleanup
    return () => socket.off('receive_message');
  }, []);

  const sendMessage = () => {
    if (message !== '') {
      const msgData = { text: message, id: socket.id };
      socket.emit('send_message', msgData); // Gửi lên server
      setChatHistory((prev) => [...prev, msgData]); // Hiện ở máy mình luôn
      setMessage('');
    }
  };

  return (
    <div style={{ width: '100vw', height: '100vh', position: 'relative' }}>
      
      {/* PHẦN 1: KHÔNG GIAN 3D */}
      <Canvas camera={{ position: [5, 5, 5], fov: 50 }}>
        {/* Ánh sáng môi trường */}
        <ambientLight intensity={0.5} />
        <Environment preset="sunset" />
        
        {/* Load Model Nhà (Để file house.glb vào thư mục public) */}
        <Model url="/nha.glb" />

        {/* Điều khiển chuột: Xoay, Zoom in/out */}
        <OrbitControls enableDamping={true} /> 
      </Canvas>

      {/* PHẦN 2: GIAO DIỆN CHAT (Overlay) */}
      <div className="chat-container">
        <div className="chat-box">
          {chatHistory.map((msg, index) => (
            <div key={index} className={msg.id === socket.id ? "my-msg" : "other-msg"}>
              {msg.text}
            </div>
          ))}
        </div>
        <div className="chat-input">
          <input 
            value={message} 
            onChange={(e) => setMessage(e.target.value)}
            onKeyPress={(e) => e.key === 'Enter' && sendMessage()}
            placeholder="Nhập tin nhắn..." 
          />
          <button onClick={sendMessage}>Gửi</button>
        </div>
      </div>
    </div>
  );
}