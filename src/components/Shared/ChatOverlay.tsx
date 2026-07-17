import React, { useState, useEffect, useRef } from 'react';
import { Send, X } from 'lucide-react';

interface ChatOverlayProps {
  socket: any;
  receiver: string;
  onClose: () => void;
  username: string;
}

export const ChatOverlay: React.FC<ChatOverlayProps> = ({ socket, receiver, onClose, username }) => {
  const [messages, setMessages] = useState<any[]>([]);
  const [text, setText] = useState('');
  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    socket.emit('join_chat', receiver);

    const onHistory = (history: any[]) => setMessages(history);
    const onMessage = (msg: any) => setMessages(prev => [...prev, msg]);

    socket.on('chat_history', onHistory);
    socket.on('chat_message', onMessage);

    return () => {
      socket.off('chat_history', onHistory);
      socket.off('chat_message', onMessage);
    };
  }, [socket, receiver]);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const send = (e: React.FormEvent) => {
    e.preventDefault();
    if (!text.trim()) return;
    socket.emit('send_chat_message', { receiver, text });
    setText('');
  };

  return (
    <div className="overlay-full" style={{ background: 'rgba(0,0,0,0.85)', padding: 0 }}>
      <div className="glass-panel" style={{ width: '100%', height: '100%', display: 'flex', flexDirection: 'column', borderRadius: 0 }}>
        
        <div style={{ padding: '20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid var(--glass-border)' }}>
          <h3 style={{ margin: 0 }}>Chat: {receiver === 'global' ? 'Nhóm chung' : receiver}</h3>
          <button onClick={onClose} style={{ background: 'transparent', border: 'none', color: '#fff', cursor: 'pointer' }}>
            <X size={24} />
          </button>
        </div>

        <div style={{ flex: 1, overflowY: 'auto', padding: 20, display: 'flex', flexDirection: 'column', gap: 10 }}>
          {messages.map((m, idx) => (
            <div key={idx} style={{ alignSelf: m.sender === username ? 'flex-end' : 'flex-start', maxWidth: '80%' }}>
              <div style={{ fontSize: 12, color: '#a1a1aa', marginBottom: 4 }}>{m.sender}</div>
              <div style={{ 
                background: m.sender === username ? 'var(--neon-primary)' : 'rgba(255,255,255,0.1)', 
                color: m.sender === username ? '#000' : '#fff', 
                padding: '10px 15px', 
                borderRadius: 20 
              }}>
                {m.text}
              </div>
            </div>
          ))}
          <div ref={endRef} />
        </div>

        <form onSubmit={send} style={{ padding: 20, borderTop: '1px solid var(--glass-border)', display: 'flex', gap: 10 }}>
          <input 
            className="glass-input" 
            style={{ margin: 0, flex: 1, borderRadius: 20 }} 
            placeholder="Nhắn tin..."
            value={text}
            onChange={e => setText(e.target.value)}
          />
          <button type="submit" className="icon-btn" style={{ background: 'var(--neon-primary)', color: '#000' }}>
            <Send size={20} />
          </button>
        </form>

      </div>
    </div>
  );
};
