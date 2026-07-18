import React, { useState, useEffect } from 'react';
import { useToast } from '../Shared/Toast';
import { RichMediaEmbed } from '../RichMediaEmbed';

interface Event {
  _id: string;
  id?: string;
  title: string;
  description: string;
  notes?: string;
  date: string;
  cover_url?: string;
  pointsReward: number;
  participants: string[];
  formLink?: string;
  thumbnailUrl?: string;
}

interface EventsScreenProps {
  token: string;
  username: string;
}

export const EventsScreen: React.FC<EventsScreenProps> = ({ token, username }) => {
  const [events, setEvents] = useState<Event[]>([]);
  const { showToast } = useToast();

  // Create Event form state
  const [showEventForm, setShowEventForm] = useState(false);
  const [eventTitle, setEventTitle] = useState('');
  const [eventDesc, setEventDesc] = useState('');
  const [eventLink, setEventLink] = useState('');
  const [eventReward, setEventReward] = useState(50);

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

  const handleCreateEvent = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!eventTitle || !eventDesc) return;
    try {
      const res = await fetch(`${import.meta.env.VITE_BACKEND_URL}/api/events`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: eventTitle,
          description: eventDesc,
          date: new Date().toISOString(),
          pointsReward: eventReward,
          formLink: eventLink
        })
      });
      const data = await res.json();
      if (data.success) {
        setEvents([...events, data.event]);
        setEventTitle('');
        setEventDesc('');
        setEventLink('');
        setShowEventForm(false);
        showToast('Tạo sự kiện thành công!');
      } else {
        showToast('Lỗi tạo sự kiện');
      }
    } catch (err) {
      showToast('Lỗi kết nối');
    }
  };

  const handleDeleteEvent = async (id: string) => {
    if (!window.confirm("Bạn có chắc chắn muốn gỡ sự kiện này không?")) return;
    try {
      const res = await fetch(`${import.meta.env.VITE_BACKEND_URL}/api/events/${id}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await res.json();
      if (data.success) {
        setEvents(events.filter(e => e._id !== id));
        showToast('Đã gỡ sự kiện');
      } else {
        showToast(data.error || 'Lỗi gỡ sự kiện');
      }
    } catch (e) {
      console.error(e);
    }
  };

  const handleJoinEvent = async (eventId: string) => {
    try {
      const res = await fetch(`${import.meta.env.VITE_BACKEND_URL}/api/events/${eventId}/join`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token })
      });
      const data = await res.json();
      if (data.success) {
        setEvents(events.map(e => e._id === eventId ? data.event : e));
        showToast(`Tham gia thành công! Bạn nhận được ${data.event.pointsReward} điểm.`);
      } else {
        showToast(data.error || 'Lỗi tham gia');
      }
    } catch (err) {
      showToast('Lỗi kết nối');
    }
  };

  return (
    <div className="swipe-screen" style={{ padding: '1rem', overflowY: 'auto' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div className="screen-header" style={{ marginBottom: 0 }}>Sự Kiện Inntech</div>
        <button
          onClick={() => setShowEventForm(!showEventForm)}
          style={{ background: '#3b82f6', border: 'none', color: 'white', padding: '6px 12px', borderRadius: '16px', fontWeight: 'bold', fontSize: '0.8rem', cursor: 'pointer' }}
        >
          + Tạo mới
        </button>
      </div>

      {showEventForm && (
        <form onSubmit={handleCreateEvent} style={{ background: '#18181b', padding: '1rem', borderRadius: '1rem', marginTop: '1rem', border: '1px solid #3f3f46' }}>
          <input type="text" placeholder="Tên sự kiện" value={eventTitle} onChange={e => setEventTitle(e.target.value)} required style={{ width: '100%', padding: '8px', marginBottom: '8px', borderRadius: '8px', border: '1px solid #3f3f46', background: '#27272a', color: 'white', boxSizing: 'border-box' }} />
          <textarea placeholder="Mô tả sự kiện..." value={eventDesc} onChange={e => setEventDesc(e.target.value)} required style={{ width: '100%', padding: '8px', marginBottom: '8px', borderRadius: '8px', border: '1px solid #3f3f46', background: '#27272a', color: 'white', minHeight: '60px', boxSizing: 'border-box' }} />
          <input type="url" placeholder="Link Form (Facebook/Google)..." value={eventLink} onChange={e => setEventLink(e.target.value)} style={{ width: '100%', padding: '8px', marginBottom: '8px', borderRadius: '8px', border: '1px solid #3f3f46', background: '#27272a', color: 'white', boxSizing: 'border-box' }} />
          <div style={{ display: 'flex', gap: '8px', alignItems: 'center', marginBottom: '12px' }}>
            <span style={{ fontSize: '0.9rem', color: '#a1a1aa' }}>Reward PTS:</span>
            <input type="number" value={eventReward} onChange={e => setEventReward(Number(e.target.value))} min={10} max={500} style={{ width: '80px', padding: '4px 8px', borderRadius: '8px', border: '1px solid #3f3f46', background: '#27272a', color: 'white' }} />
          </div>
          <button type="submit" style={{ width: '100%', background: '#2563eb', border: 'none', color: 'white', padding: '8px', borderRadius: '8px', fontWeight: 'bold', cursor: 'pointer' }}>Đăng sự kiện</button>
        </form>
      )}

      <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', marginTop: '1rem', paddingBottom: '4rem' }}>
        {events.length === 0 && (
          <div style={{ textAlign: 'center', color: '#a1a1aa', marginTop: 50 }}>
            Không có sự kiện nào sắp diễn ra.
          </div>
        )}
        {events.map(event => {
          const eventId = event._id || event.id || '';
          const isJoined = event.participants?.includes(username || '');
          return (
            <div key={eventId} style={{ background: '#27272a', padding: '1rem', borderRadius: '1rem', border: '1px solid #3f3f46' }}>
              <RichMediaEmbed repo={event} />

              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '8px', marginTop: '12px' }}>
                <h3 style={{ margin: 0, color: 'white', fontSize: '1.1rem', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  {event.title}
                  <button
                    onClick={() => handleDeleteEvent(eventId)}
                    style={{ background: 'transparent', color: '#ef4444', border: 'none', cursor: 'pointer', fontSize: '0.7rem', fontWeight: 'bold', padding: '2px 6px' }}
                  >
                    Gỡ
                  </button>
                </h3>
                {event.pointsReward > 0 && (
                  <span style={{ background: 'var(--neon-primary, #3b82f6)', color: 'white', padding: '2px 8px', borderRadius: '12px', fontSize: '0.8rem', fontWeight: 'bold', whiteSpace: 'nowrap' }}>
                    +{event.pointsReward} pts
                  </span>
                )}
              </div>
              <p style={{ color: '#a1a1aa', fontSize: '0.9rem', marginBottom: '12px', lineHeight: 1.4 }}>{event.description || event.notes}</p>

              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div style={{ color: '#3b82f6', fontSize: '0.8rem' }}>
                  📅 {new Date(event.date).toLocaleDateString()}
                </div>
                <div style={{ color: '#666', fontSize: '0.8rem' }}>
                  👥 {event.participants?.length || 0} người tham gia
                </div>
              </div>

              <button
                onClick={() => {
                  if (event.formLink && !isJoined) {
                    window.open(event.formLink, '_blank');
                  }
                  handleJoinEvent(eventId);
                }}
                disabled={isJoined}
                style={{
                  width: '100%',
                  marginTop: '12px',
                  padding: '10px',
                  borderRadius: '8px',
                  border: 'none',
                  background: isJoined ? '#3f3f46' : '#10b981',
                  color: isJoined ? '#a1a1aa' : 'white',
                  fontWeight: 'bold',
                  cursor: isJoined ? 'not-allowed' : 'pointer'
                }}
              >
                {isJoined ? 'Đã tham gia ✓' : (event.formLink ? 'Mở Form Đăng Ký' : 'Tham gia')}
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
};
