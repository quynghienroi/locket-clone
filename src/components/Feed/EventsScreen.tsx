import React, { useState, useEffect } from 'react';
import { useToast } from '../Shared/Toast';

interface Event {
  id: string;
  title: string;
  notes: string;
  date: string;
  cover_url: string;
  participants: string[];
}

interface EventsScreenProps {
  token: string;
}

export const EventsScreen: React.FC<EventsScreenProps> = ({ token }) => {
  const [events, setEvents] = useState<Event[]>([]);
  const { showToast } = useToast();

  useEffect(() => {
    fetchEvents();
  }, []);

  const fetchEvents = async () => {
    try {
      const res = await fetch(`${import.meta.env.VITE_BACKEND_URL}/api/events`);
      const data = await res.json();
      if (data.success) {
        setEvents(data.events || []);
      }
    } catch (e) {
      console.error(e);
    }
  };

  const handleJoin = async (id: string) => {
    try {
      const res = await fetch(`${import.meta.env.VITE_BACKEND_URL}/api/events/${id}/join`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` }
      });
      const data = await res.json();
      if (data.success) {
        showToast('Tham gia sự kiện thành công!');
        fetchEvents();
      } else {
        showToast(data.error || 'Lỗi tham gia');
      }
    } catch (e) {
      showToast('Lỗi kết nối');
    }
  };

  return (
    <div className="swipe-screen">
      <div className="screen-header">Sự Kiện Inntech</div>
      <div className="feed-container">
        {events.map((event) => (
          <div key={event.id} className="feed-card">
            {event.cover_url && (
              <img src={event.cover_url} alt="Cover" style={{ width: '100%', height: 200, objectFit: 'cover' }} />
            )}
            <div style={{ padding: 16 }}>
              <h3 style={{ marginBottom: 8, color: 'var(--neon-primary)' }}>{event.title}</h3>
              <p style={{ color: '#a1a1aa', fontSize: 14, marginBottom: 8 }}>{new Date(event.date).toLocaleDateString()}</p>
              <p style={{ marginBottom: 16 }}>{event.notes}</p>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: 12, color: '#a1a1aa' }}>{event.participants?.length || 0} người tham gia</span>
                <button className="neon-btn" style={{ padding: '8px 16px', width: 'auto' }} onClick={() => handleJoin(event.id)}>
                  Tham gia
                </button>
              </div>
            </div>
          </div>
        ))}
        {events.length === 0 && (
          <div style={{ textAlign: 'center', color: '#a1a1aa', marginTop: 50 }}>
            Không có sự kiện nào sắp diễn ra.
          </div>
        )}
      </div>
    </div>
  );
};
