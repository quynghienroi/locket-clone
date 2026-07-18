import { useState, useEffect, useRef } from 'react';
import { X, Send, Users, User } from 'lucide-react';
import { io, Socket } from 'socket.io-client';
import './NoteChat.css'; // Reuse glassmorphism styles

const BACKEND_URL = import.meta.env.VITE_BACKEND_URL || '';

interface Message {
  id: string;
  sender: string;
  receiver: string;
  text: string;
  created_at: string;
}

export const MessengerChat = ({ isOpen, onClose, token, currentUser, initialReceiver = 'global' }: { isOpen: boolean, onClose: () => void, token: string, currentUser: string, initialReceiver?: string }) => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputText, setInputText] = useState('');
  const [activeChat, setActiveChat] = useState<string>(initialReceiver);
  const [friends, setFriends] = useState<string[]>([]);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const socketRef = useRef<Socket | null>(null);

  useEffect(() => {
    // Fetch users for 1-on-1 chat
    fetch(`${BACKEND_URL}/api/users`, {
      headers: { Authorization: `Bearer ${token}` }
    })
    .then(res => res.json())
    .then(data => {
      if (data.users) {
        setFriends(data.users.map((u: any) => u.username).filter((u: string) => u !== currentUser));
      }
    });

    // Connect to Socket
    const newSocket = io(BACKEND_URL, {
      auth: { token }
    });
    socketRef.current = newSocket;

    newSocket.on('chat_history', (history: Message[]) => {
      setMessages(history);
    });

    newSocket.on('chat_message', (msg: Message) => {
      setMessages(prev => [...prev, msg]);
    });

    // Request history for the current active chat
    newSocket.emit('join_chat', activeChat);

    return () => {
      newSocket.disconnect();
    };
  }, [token, currentUser, activeChat]);

  useEffect(() => {
    setActiveChat(initialReceiver);
  }, [initialReceiver, isOpen]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSend = async () => {
    if (!inputText.trim() || !socketRef.current) return;
    socketRef.current.emit('send_chat_message', {
      receiver: activeChat,
      text: inputText.trim()
    });
    setInputText('');
  };

  return (
    <div className={`note-chat-overlay ${isOpen ? 'open' : ''}`}>
      <div className="note-chat-container" style={{ width: '100%', height: '80vh', maxWidth: '600px', display: 'flex', flexDirection: 'column' }}>
        
        {/* Header */}
        <div className="note-chat-header" style={{ justifyContent: 'space-between', padding: '15px 20px', borderBottom: '1px solid rgba(255,255,255,0.1)' }}>
          <div style={{ display: 'flex', gap: '15px', overflowX: 'auto', paddingBottom: '5px' }}>
            <button 
              onClick={() => setActiveChat('global')}
              style={{
                background: activeChat === 'global' ? 'rgba(255,255,255,0.2)' : 'transparent',
                border: 'none', color: 'white', padding: '8px 12px', borderRadius: '15px', cursor: 'pointer',
                display: 'flex', alignItems: 'center', gap: '5px', whiteSpace: 'nowrap'
              }}
            >
              <Users size={16} /> Nhóm Tổng
            </button>
            {friends.map(friend => (
              <button 
                key={friend}
                onClick={() => setActiveChat(friend)}
                style={{
                  background: activeChat === friend ? 'rgba(255,255,255,0.2)' : 'transparent',
                  border: 'none', color: 'white', padding: '8px 12px', borderRadius: '15px', cursor: 'pointer',
                  display: 'flex', alignItems: 'center', gap: '5px', whiteSpace: 'nowrap'
                }}
              >
                <User size={16} /> {friend}
              </button>
            ))}
          </div>
          <button onClick={onClose} style={{ background: 'transparent', border: 'none', color: 'white', cursor: 'pointer' }}>
            <X size={24} />
          </button>
        </div>

        {/* Chat Area */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '20px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
          {messages.map((m) => {
            const isMe = m.sender === currentUser;
            return (
              <div key={m.id} style={{
                alignSelf: isMe ? 'flex-end' : 'flex-start',
                background: isMe ? '#2563eb' : 'rgba(255,255,255,0.1)',
                padding: '10px 15px',
                borderRadius: isMe ? '20px 20px 0 20px' : '20px 20px 20px 0',
                maxWidth: '80%',
                boxShadow: '0 4px 6px rgba(0,0,0,0.1)'
              }}>
                {!isMe && activeChat === 'global' && (
                  <div style={{ fontSize: '0.7rem', color: '#fbbf24', marginBottom: '4px', fontWeight: 'bold' }}>
                    {m.sender}
                  </div>
                )}
                <div style={{ color: 'white', fontSize: '1rem', wordBreak: 'break-word' }}>
                  {m.text}
                </div>
              </div>
            );
          })}
          <div ref={messagesEndRef} />
        </div>

        {/* Input Area */}
        <div style={{ padding: '15px', borderTop: '1px solid rgba(255,255,255,0.1)', display: 'flex', gap: '10px' }}>
          <input 
            type="text"
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSend()}
            placeholder={activeChat === 'global' ? "Nhắn tin cho cả nhóm..." : `Nhắn tin cho ${activeChat}...`}
            style={{
              flex: 1, background: 'rgba(255,255,255,0.1)', border: 'none', color: 'white',
              padding: '12px 20px', borderRadius: '20px', outline: 'none'
            }}
          />
          <button 
            onClick={handleSend}
            style={{
              background: '#2563eb', border: 'none', color: 'white', width: '45px', height: '45px',
              borderRadius: '50%', display: 'flex', justifyContent: 'center', alignItems: 'center', cursor: 'pointer'
            }}
          >
            <Send size={18} />
          </button>
        </div>

      </div>
    </div>
  );
};
