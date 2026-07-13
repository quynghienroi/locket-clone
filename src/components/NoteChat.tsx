import { useState, useEffect, useRef } from 'react';
import { X, Send, Music, Search } from 'lucide-react';
import './NoteChat.css';

const BACKEND_URL = import.meta.env.VITE_BACKEND_URL || 'http://localhost:3001';

export const NoteChat = ({ isOpen, onClose, token }: { isOpen: boolean, onClose: () => void, token: string }) => {
  const [messages, setMessages] = useState<any[]>([]);
  const [inputText, setInputText] = useState('');
  const [showMusicSearch, setShowMusicSearch] = useState(false);
  const [musicQuery, setMusicQuery] = useState('');
  const [musicResults, setMusicResults] = useState<any[]>([]);
  const [selectedMusic, setSelectedMusic] = useState<any | null>(null);
  
  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (isOpen) {
      fetch(`${BACKEND_URL}/api/user/notes`, {
        headers: { 'Authorization': `Bearer ${token}` }
      })
      .then(r => r.json())
      .then(d => {
        if (d.success) setMessages(d.noteHistory || []);
      })
      .catch(e => console.error(e));
    }
  }, [isOpen, token]);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isOpen]);

  const searchMusic = async () => {
    if (!musicQuery) return;
    try {
      const res = await fetch(`https://itunes.apple.com/search?term=${encodeURIComponent(musicQuery)}&entity=song&limit=5`);
      const data = await res.json();
      setMusicResults(data.results.map((r: any) => ({
        title: r.trackName,
        artist: r.artistName,
        previewUrl: r.previewUrl,
        artwork: r.artworkUrl100
      })));
    } catch (e) {
      console.error(e);
    }
  };

  const handleSend = async () => {
    if (!inputText.trim() && !selectedMusic) return;
    try {
      const res = await fetch(`${BACKEND_URL}/api/user/note`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({ statusNote: inputText, statusMusic: selectedMusic })
      });
      const data = await res.json();
      if (data.success) {
        setMessages(data.noteHistory || []);
        setInputText('');
        setSelectedMusic(null);
        setShowMusicSearch(false);
      }
    } catch (e) {
      console.error(e);
    }
  };

  const handleDeleteNote = async (id: string) => {
    if (!window.confirm("Bạn có chắc chắn muốn thu hồi (xóa) ghi chú này không?")) return;
    try {
      const res = await fetch(`${BACKEND_URL}/api/user/note/${id}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await res.json();
      if (data.success) {
        setMessages(data.noteHistory || []);
      }
    } catch (e) {
      console.error(e);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="note-chat-overlay">
      <div className="note-chat-container">
        <div className="note-chat-header">
          <h3>ÁDUUUU</h3>
          <button onClick={onClose}><X size={20}/></button>
        </div>
        
        <div className="note-chat-messages">
          {messages.length === 0 && (
            <div style={{textAlign: 'center', color: '#999', marginTop: '2rem'}}>Chưa có ghi chú nào. Gửi ngay!</div>
          )}
          {messages.map((m, i) => (
            <div key={i} className="note-message-wrapper" style={{alignSelf: 'flex-end', display: 'flex', alignItems: 'center', gap: '10px'}}>
              <button 
                onClick={() => handleDeleteNote(m.id || m._id)}
                style={{background: 'transparent', border: 'none', color: '#ff4d4f', cursor: 'pointer', fontSize: '1.2rem', padding: '0'}}
                title="Thu hồi ghi chú"
              >
                &times;
              </button>
              <div className="note-message">
                {m.text && <div className="note-text">{m.text}</div>}
                {m.music && (
                  <div className="note-music">
                    <div style={{display: 'flex', alignItems: 'center', gap: '5px', marginBottom: '5px'}}>
                      <span>🎵</span>
                      <strong>{m.music.title}</strong>
                      <span style={{fontSize: '0.8rem', color: '#eee'}}>- {m.music.artist}</span>
                    </div>
                    <audio controls src={m.music.previewUrl} style={{height: '30px', width: '220px'}}/>
                  </div>
                )}
                <div className="note-time">{new Date(m.createdAt).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</div>
              </div>
            </div>
          ))}
          <div ref={endRef} />
        </div>

        {showMusicSearch && (
          <div className="music-search-panel">
            <div className="music-search-bar">
              <input 
                value={musicQuery} 
                onChange={e => setMusicQuery(e.target.value)} 
                onKeyDown={e => e.key === 'Enter' && searchMusic()}
                placeholder="Tên bài hát..." 
              />
              <button onClick={searchMusic}><Search size={16}/></button>
            </div>
            <div className="music-results">
              {musicResults.map((r, i) => (
                <div key={i} className="music-item" onClick={() => setSelectedMusic(r)}>
                  <img src={r.artwork} alt="art" />
                  <div>
                    <div style={{fontWeight: 'bold', fontSize: '0.9rem', color: '#000'}}>{r.title}</div>
                    <div style={{fontSize: '0.8rem', color: '#666'}}>{r.artist}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {selectedMusic && (
          <div className="selected-music-bar">
            <span>🎵 Đang chọn: {selectedMusic.title}</span>
            <button onClick={() => setSelectedMusic(null)}><X size={14}/></button>
          </div>
        )}

        <div className="note-chat-input">
          <button onClick={() => setShowMusicSearch(!showMusicSearch)} style={{color: showMusicSearch ? '#ff1493' : '#666', background: 'transparent', border: 'none', cursor: 'pointer'}}>
            <Music size={20}/>
          </button>
          <input 
            value={inputText} 
            onChange={e => setInputText(e.target.value)} 
            onKeyDown={e => e.key === 'Enter' && handleSend()}
            placeholder="Cập nhật ghi chú..." 
          />
          <button onClick={handleSend} style={{color: '#2563eb', background: 'transparent', border: 'none', cursor: 'pointer'}}><Send size={20}/></button>
        </div>
      </div>
    </div>
  );
};
