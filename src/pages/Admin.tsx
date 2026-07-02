
import { 
  Users, 
  Camera, 
  Activity, 
  LayoutDashboard, 
  Settings, 
  Bell, 
  Search,
  TrendingUp,
  Image as ImageIcon
} from 'lucide-react';
import { 
  AreaChart, 
  Area, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer
} from 'recharts';
import '../App.css';

// Mock Data
const userGrowthData = [
  { name: 'Mon', users: 4000, active: 2400 },
  { name: 'Tue', users: 4500, active: 2800 },
  { name: 'Wed', users: 5200, active: 3100 },
  { name: 'Thu', users: 6100, active: 3900 },
  { name: 'Fri', users: 7000, active: 4800 },
  { name: 'Sat', users: 8500, active: 6500 },
  { name: 'Sun', users: 10000, active: 8000 },
];


const recentActivity = [
  { id: 1, user: 'Alex', action: 'shared a photo with', target: 'Sarah', time: '2 mins ago', color: '#fbbf24' },
  { id: 2, user: 'John', action: 'added a new friend', target: 'Mike', time: '15 mins ago', color: '#10b981' },
  { id: 3, user: 'Emma', action: 'reacted to a photo from', target: 'Alex', time: '1 hour ago', color: '#ef4444' },
  { id: 4, user: 'Sophia', action: 'shared a photo with', target: 'David', time: '2 hours ago', color: '#fbbf24' },
  { id: 5, user: 'Lucas', action: 'joined the app', target: '', time: '3 hours ago', color: '#3b82f6' },
];

function App() {
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
            <Users size={20} />
            <span>Users</span>
          </a>
          <a href="#" className="nav-item">
            <ImageIcon size={20} />
            <span>Photos</span>
          </a>
          <a href="#" className="nav-item">
            <Activity size={20} />
            <span>Analytics</span>
          </a>
          <a href="#" className="nav-item">
            <Settings size={20} />
            <span>Settings</span>
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
      <main className="main-content">
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
            
            <div className="metric-card animate-fade-in" style={{ animationDelay: '0.2s' }}>
              <div className="metric-header">
                <span>Active Now</span>
                <Activity size={20} color="#10b981" />
              </div>
              <div className="metric-value">8,432</div>
              <div className="metric-trend trend-up">
                <TrendingUp size={14} />
                <span>+5.2% from last hour</span>
              </div>
            </div>
          </div>

          {/* Charts and Activity */}
          <div className="dashboard-grid">
            {/* Chart Area */}
            <div className="chart-card animate-fade-in" style={{ animationDelay: '0.3s' }}>
              <div className="card-title">User Growth & Activity</div>
              <div style={{ width: '100%', height: 300 }}>
                <ResponsiveContainer>
                  <AreaChart data={userGrowthData} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
                    <defs>
                      <linearGradient id="colorUsers" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#fbbf24" stopOpacity={0.3}/>
                        <stop offset="95%" stopColor="#fbbf24" stopOpacity={0}/>
                      </linearGradient>
                      <linearGradient id="colorActive" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#10b981" stopOpacity={0.3}/>
                        <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="#27272a" vertical={false} />
                    <XAxis dataKey="name" stroke="#a1a1aa" fontSize={12} tickLine={false} axisLine={false} />
                    <YAxis stroke="#a1a1aa" fontSize={12} tickLine={false} axisLine={false} tickFormatter={(value) => `${value / 1000}k`} />
                    <Tooltip 
                      contentStyle={{ backgroundColor: '#18181b', borderColor: '#27272a', borderRadius: '8px' }}
                      itemStyle={{ color: '#fafafa' }}
                    />
                    <Area type="monotone" dataKey="users" stroke="#fbbf24" strokeWidth={2} fillOpacity={1} fill="url(#colorUsers)" />
                    <Area type="monotone" dataKey="active" stroke="#10b981" strokeWidth={2} fillOpacity={1} fill="url(#colorActive)" />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Recent Activity */}
            <div className="activity-card animate-fade-in" style={{ animationDelay: '0.4s' }}>
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
