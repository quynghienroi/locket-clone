import React, { useState } from 'react';

interface SettingsModalProps {
  onClose: () => void;
  currentTheme: string;
  currentNote: string;
  onSave: (theme: string, note: string) => void;
  onLogout: () => void;
}

export const SettingsModal: React.FC<SettingsModalProps> = ({ onClose, currentTheme, currentNote, onSave, onLogout }) => {
  const [theme, setTheme] = useState(currentTheme);
  const [note, setNote] = useState(currentNote);

  const handleSave = () => {
    onSave(theme, note);
    onClose();
  };

  return (
    <div className="overlay-full" style={{ background: 'rgba(0,0,0,0.8)' }}>
      <div className="glass-panel" style={{ width: '100%', maxWidth: '400px', margin: 'auto', padding: 24, position: 'relative' }}>
        <button 
          onClick={onClose} 
          style={{ position: 'absolute', top: 15, right: 15, background: 'transparent', border: 'none', color: '#fff', fontSize: 24, cursor: 'pointer' }}
        >
          &times;
        </button>
        <h2 style={{ marginBottom: 20 }}>Cài đặt cá nhân</h2>
        
        <div style={{ marginBottom: 20 }}>
          <label style={{ display: 'block', marginBottom: 8, color: '#a1a1aa' }}>Màu chủ đề</label>
          <input 
            type="color" 
            value={theme}
            onChange={e => setTheme(e.target.value)}
            style={{ width: '100%', height: 40, border: 'none', borderRadius: 8, background: 'transparent', cursor: 'pointer' }}
          />
        </div>

        <div style={{ marginBottom: 24 }}>
          <label style={{ display: 'block', marginBottom: 8, color: '#a1a1aa' }}>Ghi chú trạng thái</label>
          <input 
            type="text"
            className="glass-input"
            value={note}
            onChange={e => setNote(e.target.value)}
            placeholder="Đang làm gì đó..."
          />
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <button className="neon-btn" onClick={handleSave}>
            Lưu thay đổi
          </button>
          <button 
            className="neon-btn" 
            style={{ background: 'rgba(239, 68, 68, 0.1)', color: '#ef4444', boxShadow: 'none' }}
            onClick={onLogout}
          >
            Đăng xuất
          </button>
        </div>
      </div>
    </div>
  );
};
