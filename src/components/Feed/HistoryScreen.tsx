import React, { useState, useEffect } from 'react';
import { useToast } from '../Shared/Toast';

interface HistoryScreenProps {
  token: string;
}

export const HistoryScreen: React.FC<HistoryScreenProps> = ({ token }) => {
  const [history, setHistory] = useState<any[]>([]);
  const { showToast } = useToast();

  useEffect(() => {
    fetchHistory();
  }, []);

  const fetchHistory = async () => {
    try {
      const res = await fetch(`${import.meta.env.VITE_BACKEND_URL}/api/user/notes`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await res.json();
      if (data.success) {
        setHistory(data.noteHistory || []);
      }
    } catch (e) {
      console.error(e);
    }
  };

  const deleteNote = async (id: string) => {
    if (!window.confirm("Bạn muốn xoá ghi chú này?")) return;
    try {
      const res = await fetch(`${import.meta.env.VITE_BACKEND_URL}/api/user/note/${id}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await res.json();
      if (data.success) {
        setHistory(data.noteHistory || []);
        showToast('Đã xoá ghi chú');
      }
    } catch (e) {
      showToast('Lỗi khi xoá ghi chú');
    }
  };

  return (
    <div className="swipe-screen">
      <div className="screen-header">Lịch Sử Của Bạn</div>
      <div className="feed-container">
        {history.length === 0 ? (
          <div style={{ textAlign: 'center', color: '#a1a1aa', marginTop: 50 }}>
            Bạn chưa có ghi chú nào.
          </div>
        ) : (
          history.slice().reverse().map(note => (
            <div key={note.id || note._id} className="feed-card" style={{ padding: 16 }}>
              <div style={{ color: '#a1a1aa', fontSize: 12, marginBottom: 8 }}>
                {new Date(note.createdAt).toLocaleString()}
              </div>
              <div style={{ fontSize: 16, fontWeight: 500, marginBottom: 12 }}>
                {note.text}
              </div>
              <button className="feed-delete-btn" onClick={() => deleteNote(note.id || note._id)}>
                Xoá ghi chú
              </button>
            </div>
          ))
        )}
      </div>
    </div>
  );
};
