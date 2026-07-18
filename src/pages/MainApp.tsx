import React, { useState, useEffect, useRef, useCallback } from 'react';
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
import { MessengerChat } from '../components/MessengerChat';
import { NoteChat } from '../components/NoteChat';
import { LandscapeFeed } from '../components/LandscapeFeed';
import { MessageSquare } from 'lucide-react';
import { ToastProvider, useToast } from '../components/Shared/Toast';
import '../Locket.css';

interface ReceivedPhotoData {
  sender: string;
  photoBase64: string;
  caption?: string;
  senderColor?: string;
}

const MainAppContent: React.FC = () => {
  const { token, username, themeColor, statusNote, points, isLoading, login, logout, updateSettings } = useAuth();
  const { socket } = useSocket(token);
  
  const [currentTab, setCurrentTab] = useState(1); // Default to Camera (index 1)
  const [feed, setFeed] = useState<any[]>([]);
  const [showSettings, setShowSettings] = useState(false);
  const [chatReceiver, setChatReceiver] = useState<string | null>(null);

  const friends = Array.from(new Set(feed.filter((f: any) => f.sender !== username).map((f: any) => f.sender))) as string[];

  // NoteChat FAB state
  const [showNoteChat, setShowNoteChat] = useState(false);
  const [chatHeadPos, setChatHeadPos] = useState({ x: 20, y: 20 }); // Bottom-right offset
  const isDraggingChat = useRef(false);
  const dragStartPos = useRef({ x: 0, y: 0, initialBottom: 20, initialRight: 20 });

  // Received photo popup state
  const [receivedPhoto, setReceivedPhoto] = useState<ReceivedPhotoData | null>(null);

  // Landscape state
  const [isLandscape, setIsLandscape] = useState(window.innerWidth > window.innerHeight);

  // Swipe container ref
  const containerRef = useRef<HTMLDivElement>(null);

  const { showToast } = useToast();

  // --- Drag handlers for NoteChat FAB ---
  const handlePointerDownChat = (e: React.PointerEvent) => {
    isDraggingChat.current = true;
    dragStartPos.current = {
      x: e.clientX,
      y: e.clientY,
      initialBottom: chatHeadPos.y,
      initialRight: chatHeadPos.x
    };
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
  };

  const handlePointerMoveChat = (e: React.PointerEvent) => {
    if (!isDraggingChat.current) return;
    const dx = dragStartPos.current.x - e.clientX;
    const dy = dragStartPos.current.y - e.clientY;

    const newRight = Math.max(0, Math.min(window.innerWidth - 60, dragStartPos.current.initialRight + dx));
    const newBottom = Math.max(0, Math.min(window.innerHeight - 60, dragStartPos.current.initialBottom + dy));

    setChatHeadPos({ x: newRight, y: newBottom });
  };

  const handlePointerUpChat = (e: React.PointerEvent) => {
    isDraggingChat.current = false;
    (e.target as HTMLElement).releasePointerCapture(e.pointerId);
  };

  // --- Swipe scroll handler ---
  const handleSwipeScroll = useCallback(() => {
    if (containerRef.current) {
      const scrollLeft = containerRef.current.scrollLeft;
      const width = containerRef.current.clientWidth;
      const tab = Math.round(scrollLeft / width);
      if (currentTab !== tab) setCurrentTab(tab);
    }
  }, [currentTab]);

  // --- Tab change handler (scrollTo on tab click) ---
  const handleTabChange = useCallback((index: number) => {
    setCurrentTab(index);
    if (containerRef.current) {
      containerRef.current.scrollTo({ left: containerRef.current.clientWidth * index, behavior: 'smooth' });
    }
  }, []);

  // Scroll to default tab on mount
  useEffect(() => {
    if (username?.startsWith('user_')) {
      logout();
      return;
    }

    if (containerRef.current) {
      containerRef.current.scrollTo({ left: containerRef.current.clientWidth * currentTab, behavior: 'auto' });
    }
    
    const handleResize = () => {
      setIsLandscape(window.innerWidth > window.innerHeight);
    };
    window.addEventListener('resize', handleResize);
    
    return () => window.removeEventListener('resize', handleResize);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (socket) {
      // Backend emits 'feed_updated' (confirmed in broadcastHelper.js)
      socket.on('feed_updated', (newFeed: any[]) => {
        setFeed(newFeed);
      });

      // Received photo popup - show when someone else sends a photo
      socket.on('receive_photo', (data: ReceivedPhotoData) => {
        if (data.sender !== username) {
          setReceivedPhoto(data);
        }
      });

      socket.on('error_msg', (msg: string) => {
        showToast(msg);
      });

      return () => {
        socket.off('feed_updated');
        socket.off('receive_photo');
        socket.off('error_msg');
      };
    }
  }, [socket, username, showToast]);

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

  if (isLandscape && token && username) {
    return (
      <LandscapeFeed 
        feed={feed} 
        userName={username} 
        themeColor={themeColor} 
        onReaction={(photoId: string, emoji: string) => socket?.emit('add_reaction', { photoId, emoji })} 
        onDelete={(photo: any) => {
          if (window.confirm('Bạn có chắc muốn gỡ bài viết này?')) {
            socket?.emit('delete_photo', photo.id);
            showToast('Đã gỡ bài viết');
          }
        }} 
      />
    );
  }

  return (
    <div className="main-container">
      <div className="mobile-frame">
        {/* Swipe container with scroll-snap */}
        <div 
          className="swipe-container" 
          ref={containerRef}
          onScroll={handleSwipeScroll}
        >
          <div className="swipe-screen"><HistoryScreen token={token} /></div>
          <div className="swipe-screen"><CameraScreen username={username} onOpenSettings={() => setShowSettings(true)} socket={socket} userPoints={points} friends={friends} /></div>
          <div className="swipe-screen"><VerticalFeed feed={feed} username={username} socket={socket} onOpenChat={setChatReceiver} /></div>
          <div className="swipe-screen"><EventsScreen token={token} username={username} /></div>
          <div className="swipe-screen"><ReposScreen token={token} username={username} /></div>
        </div>

        <BottomNavBar currentTab={currentTab} onTabChange={handleTabChange} />

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
          <MessengerChat 
            isOpen={!!chatReceiver}
            onClose={() => setChatReceiver(null)}
            token={token}
            currentUser={username}
            initialReceiver={chatReceiver}
          />
        )}

        {/* Received Photo Popup Overlay */}
        <div className={`received-popup ${receivedPhoto ? 'show' : ''}`}>
          {receivedPhoto && (
            <>
              <h3 style={{ color: receivedPhoto.senderColor || '#2563eb', marginBottom: '1rem', letterSpacing: '1px', fontSize: '1.5rem', fontWeight: 800 }}>
                NEW INNTECH
              </h3>
              <div className="received-widget">
                <img src={receivedPhoto.photoBase64} alt="Ảnh nhận được" />
              </div>
              <div className="received-info">Từ: {receivedPhoto.sender}</div>
              {receivedPhoto.caption && (
                <div style={{ marginTop: '1rem', fontSize: '1.2rem', fontStyle: 'italic' }}>{receivedPhoto.caption}</div>
              )}
              <button className="close-popup-btn" onClick={() => setReceivedPhoto(null)}>
                Tuyệt vời!
              </button>
            </>
          )}
        </div>
      </div>

      {/* Draggable Floating Action Button for NoteChat (ÁDUUUU) */}
      {username && (
        <button 
          onPointerDown={handlePointerDownChat}
          onPointerMove={handlePointerMoveChat}
          onPointerUp={handlePointerUpChat}
          onClick={(e) => {
            const dx = dragStartPos.current.x - e.clientX;
            const dy = dragStartPos.current.y - e.clientY;
            if (Math.hypot(dx, dy) < 5) {
              setShowNoteChat(true);
            }
          }}
          style={{
            position: 'fixed',
            bottom: `${chatHeadPos.y}px`,
            right: `${chatHeadPos.x}px`,
            width: '60px',
            height: '60px',
            borderRadius: '50%',
            backgroundColor: themeColor,
            color: '#000',
            border: 'none',
            boxShadow: '0 4px 15px rgba(0,0,0,0.5)',
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            cursor: 'pointer',
            zIndex: 900,
            touchAction: 'none'
          }}
        >
          <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path></svg>
        </button>
      )}

      {showNoteChat && (
        <NoteChat 
          isOpen={showNoteChat} 
          onClose={() => setShowNoteChat(false)} 
          token={token} 
        />
      )}
    </div>
  );
};

export const MainApp = () => (
  <ToastProvider>
    <MainAppContent />
  </ToastProvider>
);
