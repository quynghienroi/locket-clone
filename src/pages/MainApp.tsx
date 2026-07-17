import React, { useState, useEffect } from 'react';
import { useAuth } from '../hooks/useAuth';
import { useSocket } from '../hooks/useSocket';
import { AuthModal } from '../components/Auth/AuthModal';
import { SettingsModal } from '../components/Settings/SettingsModal';
import { CameraScreen } from '../components/Camera/CameraScreen';
import { VerticalFeed } from '../components/Feed/VerticalFeed';
import { HistoryScreen } from '../components/Feed/HistoryScreen';
import { EventsScreen } from '../components/Feed/EventsScreen';
import { ReposScreen } from '../components/Feed/ReposScreen';
import { BottomNavBar } from '../components/Navigation/BottomNavBar';
import { ChatOverlay } from '../components/Shared/ChatOverlay';
import { MessageSquare } from 'lucide-react';
import { ToastProvider, useToast } from '../components/Shared/Toast';
import '../Locket.css';

const MainAppContent: React.FC = () => {
  const { token, username, themeColor, statusNote, isLoading, login, logout, updateSettings } = useAuth();
  const { socket, isConnected } = useSocket(token);
  
  const [currentTab, setCurrentTab] = useState(1); // Default to Camera (index 1)
  const [feed, setFeed] = useState<any[]>([]);
  const [showSettings, setShowSettings] = useState(false);
  const [chatReceiver, setChatReceiver] = useState<string | null>(null);

  const { showToast } = useToast();

  useEffect(() => {
    if (socket) {
      socket.on('feed_update', (newFeed: any[]) => {
        setFeed(newFeed);
      });
      socket.on('error_msg', (msg: string) => {
        showToast(msg);
      });

      return () => {
        socket.off('feed_update');
        socket.off('error_msg');
      };
    }
  }, [socket, showToast]);

  if (isLoading) return <div className="main-container">Loading...</div>;

  if (!token || !username) {
    return (
      <div className="main-container">
        <div className="mobile-frame">
          <AuthModal onLoginSuccess={login} />
        </div>
      </div>
    );
  }

  const renderScreen = () => {
    switch (currentTab) {
      case 0: return <HistoryScreen token={token} />;
      case 1: return <CameraScreen username={username} onOpenSettings={() => setShowSettings(true)} socket={socket} />;
      case 2: return <VerticalFeed feed={feed} username={username} socket={socket} onOpenChat={setChatReceiver} />;
      case 3: return <EventsScreen token={token} />;
      case 4: return <ReposScreen token={token} username={username} />;
      default: return null;
    }
  };

  return (
    <div className="main-container">
      <div className="mobile-frame">
        {/* Swipe wrapper - using active tab for translation */}
        <div 
          className="swipe-screens-wrapper"
          style={{ transform: `translateX(-${currentTab * 100}vw)` }}
        >
          <div className="swipe-screen"><HistoryScreen token={token} /></div>
          <div className="swipe-screen"><CameraScreen username={username} onOpenSettings={() => setShowSettings(true)} socket={socket} /></div>
          <div className="swipe-screen"><VerticalFeed feed={feed} username={username} socket={socket} onOpenChat={setChatReceiver} /></div>
          <div className="swipe-screen"><EventsScreen token={token} /></div>
          <div className="swipe-screen"><ReposScreen token={token} username={username} /></div>
        </div>

        <BottomNavBar currentTab={currentTab} onTabChange={setCurrentTab} />

        {/* Global Chat FAB */}
        <button className="floating-action-btn fab-right" onClick={() => setChatReceiver('global')}>
          <MessageSquare size={24} />
        </button>

        {showSettings && (
          <SettingsModal 
            onClose={() => setShowSettings(false)}
            currentTheme={themeColor}
            currentNote={statusNote}
            onSave={updateSettings}
            onLogout={logout}
          />
        )}

        {chatReceiver && (
          <ChatOverlay 
            socket={socket} 
            receiver={chatReceiver} 
            username={username}
            onClose={() => setChatReceiver(null)} 
          />
        )}
      </div>
    </div>
  );
};

export const MainApp = () => (
  <ToastProvider>
    <MainAppContent />
  </ToastProvider>
);
