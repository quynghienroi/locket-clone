import { useState } from 'react';
import { 
  Users, 
  Camera, 
  LayoutDashboard, 
  Bell, 
  Search,
  TrendingUp,
  Image as ImageIcon,
  Calendar,
  Plus
} from 'lucide-react';
import '../App.css';

// Mock Data
const recentActivity = [
  { id: 1, user: 'Alex', action: 'shared a photo with', target: 'Sarah', time: '2 mins ago', color: '#fbbf24' },
  { id: 2, user: 'John', action: 'added a new friend', target: 'Mike', time: '15 mins ago', color: '#10b981' },
];

function App() {
  const [eventForm, setEventForm] = useState({ title: '', description: '', date: '', pointsReward: 50 });
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');

  const BACKEND_URL = import.meta.env.VITE_BACKEND_URL || 'http://localhost:3001';

  const handleCreateEvent = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setMessage('');
    try {
      const res = await fetch(`${BACKEND_URL}/api/events`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(eventForm)
      });
      const data = await res.json();
      if (data.success) {
        setMessage('🎉 Event created successfully!');
        setEventForm({ title: '', description: '', date: '', pointsReward: 50 });
      } else {
        setMessage('Error creating event');
      }
    } catch (err) {
      setMessage('Network error');
    }
    setLoading(false);
  };

  return (
    <div className="dashboard-container">
      {/* Sidebar */}
      <aside className="sidebar">
        <div className="sidebar-logo">
          <Camera size={28} strokeWidth={2.5} />
          <span>LocketAdmin</span>
        </div>
        
        <nav className="sidebar-nav">
          <a href="#" className="nav-item active">
            <LayoutDashboard size={20} />
            <span>Overview</span>
          </a>
          <a href="#" className="nav-item">
            <Calendar size={20} />
            <span>Events</span>
          </a>
          <a href="#" className="nav-item">
            <Users size={20} />
            <span>Users</span>
          </a>
          <a href="#" className="nav-item">
            <ImageIcon size={20} />
            <span>Photos</span>
          </a>
        </nav>

        <div className="sidebar-footer">
          <div className="user-profile">
            <div className="user-avatar">A</div>
            <div className="user-info">
              <span className="user-name">Admin User</span>
              <span className="user-role">Superadmin</span>
            </div>
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <main className="main-content" style={{ overflowY: 'auto' }}>
        <header className="header">
          <h1 className="header-title">Dashboard Overview</h1>
          <div className="header-actions">
            <button className="icon-btn">
              <Search size={18} />
            </button>
            <button className="icon-btn">
              <Bell size={18} />
            </button>
          </div>
        </header>

        <div className="dashboard-content">
          {/* Metrics Grid */}
          <div className="metrics-grid">
            <div className="metric-card animate-fade-in" style={{ animationDelay: '0s' }}>
              <div className="metric-header">
                <span>Total Users</span>
                <Users size={20} color="#3b82f6" />
              </div>
              <div className="metric-value">145.2K</div>
              <div className="metric-trend trend-up">
                <TrendingUp size={14} />
                <span>+12.5% from last week</span>
              </div>
            </div>
            
            <div className="metric-card animate-fade-in" style={{ animationDelay: '0.1s' }}>
              <div className="metric-header">
                <span>Photos Shared</span>
                <Camera size={20} color="#fbbf24" />
              </div>
              <div className="metric-value">1.2M</div>
              <div className="metric-trend trend-up">
                <TrendingUp size={14} />
                <span>+24.8% from last week</span>
              </div>
            </div>
          </div>

          <div className="dashboard-grid" style={{ marginTop: '24px' }}>
            {/* Event Creation Form */}
            <div className="chart-card animate-fade-in" style={{ animationDelay: '0.2s', padding: '24px' }}>
              <div className="card-title" style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '20px' }}>
                <Calendar size={20} color="#10b981" /> 
                Create Club Event
              </div>
              
              <form onSubmit={handleCreateEvent} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                <div>
                  <label style={{ display: 'block', marginBottom: '8px', color: '#a1a1aa' }}>Event Title</label>
                  <input 
                    type="text" 
                    required
                    value={eventForm.title}
                    onChange={(e) => setEventForm({...eventForm, title: e.target.value})}
                    style={{ width: '100%', padding: '12px', borderRadius: '8px', border: '1px solid #3f3f46', background: '#27272a', color: 'white' }}
                    placeholder="e.g. Hackathon 2026"
                  />
                </div>
                
                <div>
                  <label style={{ display: 'block', marginBottom: '8px', color: '#a1a1aa' }}>Description</label>
                  <textarea 
                    required
                    value={eventForm.description}
                    onChange={(e) => setEventForm({...eventForm, description: e.target.value})}
                    style={{ width: '100%', padding: '12px', borderRadius: '8px', border: '1px solid #3f3f46', background: '#27272a', color: 'white', minHeight: '100px' }}
                    placeholder="What is this event about?"
                  />
                </div>

                <div style={{ display: 'flex', gap: '16px' }}>
                  <div style={{ flex: 1 }}>
                    <label style={{ display: 'block', marginBottom: '8px', color: '#a1a1aa' }}>Date</label>
                    <input 
                      type="date" 
                      required
                      value={eventForm.date}
                      onChange={(e) => setEventForm({...eventForm, date: e.target.value})}
                      style={{ width: '100%', padding: '12px', borderRadius: '8px', border: '1px solid #3f3f46', background: '#27272a', color: 'white' }}
                    />
                  </div>
                  <div style={{ flex: 1 }}>
                    <label style={{ display: 'block', marginBottom: '8px', color: '#a1a1aa' }}>Points Reward</label>
                    <input 
                      type="number" 
                      required
                      value={eventForm.pointsReward}
                      onChange={(e) => setEventForm({...eventForm, pointsReward: parseInt(e.target.value)})}
                      style={{ width: '100%', padding: '12px', borderRadius: '8px', border: '1px solid #3f3f46', background: '#27272a', color: 'white' }}
                    />
                  </div>
                </div>

                {message && <div style={{ color: message.includes('Error') ? '#ef4444' : '#10b981', marginTop: '8px' }}>{message}</div>}

                <button 
                  type="submit" 
                  disabled={loading}
                  style={{ 
                    marginTop: '8px', 
                    padding: '12px', 
                    borderRadius: '8px', 
                    background: '#fbbf24', 
                    color: 'black', 
                    fontWeight: 'bold', 
                    border: 'none', 
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '8px'
                  }}
                >
                  <Plus size={20} />
                  {loading ? 'Creating...' : 'Create Event'}
                </button>
              </form>
            </div>

            {/* Recent Activity */}
            <div className="activity-card animate-fade-in" style={{ animationDelay: '0.3s' }}>
              <div className="card-title">Live Activity Feed</div>
              <div className="activity-list">
                {recentActivity.map((activity) => (
                  <div key={activity.id} className="activity-item">
                    <div className="activity-avatar" style={{ backgroundColor: `${activity.color}20`, display: 'flex', alignItems: 'center', justifyContent: 'center', color: activity.color, fontWeight: 'bold' }}>
                      {activity.user.charAt(0)}
                    </div>
                    <div className="activity-content">
                      <div className="activity-text">
                        <strong>{activity.user}</strong> {activity.action} <strong>{activity.target}</strong>
                      </div>
                      <div className="activity-time">{activity.time}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}

export default App;
