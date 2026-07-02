import { useState, useEffect, useRef } from 'react';
import { Users, Camera as CameraIcon, ArrowUp, Zap, RotateCcw, Plus, Image as ImageIcon } from 'lucide-react';
import { io, Socket } from 'socket.io-client';
import '../Locket.css';

interface PhotoData {
  id: number;
  sender: string;
  targets: string[];
  photoBase64: string;
  caption: string;
  reactions: Record<string, string>;
  timestamp: string;
}

export default function LocketApp() {
  const [userName, setUserName] = useState<string | null>(null);
  const [inputValue, setInputValue] = useState('');
  
  const [socket, setSocket] = useState<Socket | null>(null);
  const [feed, setFeed] = useState<PhotoData[]>([]);
  const [friends, setFriends] = useState<string[]>([]);
  const [receivedPhoto, setReceivedPhoto] = useState<PhotoData | null>(null);
  const [permissionDenied, setPermissionDenied] = useState(false);
  
  // Swipe Container & Camera Refs
  const containerRef = useRef<HTMLDivElement>(null);
  const centerScreenRef = useRef<HTMLDivElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  // Post-Capture State
  const [capturedPhoto, setCapturedPhoto] = useState<string | null>(null);
  const [caption, setCaption] = useState('');
  const [selectedTargets, setSelectedTargets] = useState<string[]>(['ALL']);

  // Scroll to center screen on mount
  useEffect(() => {
    if (userName && centerScreenRef.current) {
      setTimeout(() => {
        centerScreenRef.current?.scrollIntoView({ behavior: 'auto', inline: 'center' });
      }, 100);
    }
  }, [userName]);

  // Socket Connection
  useEffect(() => {
    if (userName) {
      const BACKEND_URL = import.meta.env.VITE_BACKEND_URL || 'http://localhost:3001';
      const newSocket = io(BACKEND_URL);
      setSocket(newSocket);

      newSocket.on('connect', () => {
        newSocket.emit('join', userName);
      });

      newSocket.on('feed_updated', (updatedFeed: PhotoData[]) => {
        setFeed(updatedFeed);
        
        // Auto extract friends from feed
        const newFriends = new Set<string>();
        updatedFeed.forEach(p => {
          if (p.sender !== userName) newFriends.add(p.sender);
        });
        setFriends(Array.from(newFriends));
      });

      newSocket.on('receive_photo', (data: PhotoData) => {
        if (data.sender !== userName) {
          setReceivedPhoto(data);
        }
      });

      return () => { newSocket.disconnect(); };
    }
  }, [userName]);

  // Initialize Camera
  useEffect(() => {
    if (!userName) return; 
    let stream: MediaStream | null = null;
    
    const startCamera = async () => {
      try {
        stream = await navigator.mediaDevices.getUserMedia({ 
          video: { facingMode: 'user', width: { ideal: 720 }, height: { ideal: 720 } },
          audio: false 
        });
        if (videoRef.current) videoRef.current.srcObject = stream;
      } catch (err) {
        console.error("Error accessing camera:", err);
        setPermissionDenied(true);
      }
    };
    startCamera();
    return () => stream?.getTracks().forEach(track => track.stop());
  }, [userName, capturedPhoto]); // Restart camera if we cancel post-capture

  const handleCapture = () => {
    if (videoRef.current && canvasRef.current) {
      const video = videoRef.current;
      const canvas = canvasRef.current;
      
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.translate(canvas.width, 0);
        ctx.scale(-1, 1);
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
        
        const imageDataUrl = canvas.toDataURL('image/jpeg', 0.8);
        setCapturedPhoto(imageDataUrl);
        setCaption(''); // Reset caption
        
        const flash = document.createElement('div');
        flash.className = 'camera-flash';
        document.body.appendChild(flash);
        setTimeout(() => document.body.removeChild(flash), 150);
      }
    }
  };

  const handleSend = () => {
    if (socket && capturedPhoto) {
      socket.emit('send_photo', {
        sender: userName,
        targets: selectedTargets,
        photoBase64: capturedPhoto,
        caption: caption
      });
      setCapturedPhoto(null);
      // Auto scroll to Right Screen (Feed) to see the sent photo
      const container = containerRef.current;
      if (container) {
        container.scrollTo({ left: container.scrollWidth, behavior: 'smooth' });
      }
    }
  };

  const toggleTarget = (target: string) => {
    if (target === 'ALL') {
      setSelectedTargets(['ALL']);
      return;
    }
    
    let newTargets = selectedTargets.filter(t => t !== 'ALL');
    if (newTargets.includes(target)) {
      newTargets = newTargets.filter(t => t !== target);
      if (newTargets.length === 0) newTargets = ['ALL'];
    } else {
      newTargets.push(target);
    }
    setSelectedTargets(newTargets);
  };

  const handleAddFriend = () => {
    const friendName = prompt("Enter your friend's username:");
    if (friendName && friendName.trim() !== '') {
      const name = friendName.trim();
      if (!friends.includes(name)) setFriends([...friends, name]);
    }
  };

  const handleAddReaction = (photoId: number, emoji: string) => {
    if (socket && userName) {
      socket.emit('add_reaction', { photoId, emoji, user: userName });
    }
  };

  // ---------------- ONBOARDING ----------------
  if (!userName) {
    return (
      <div className="locket-container">
        <div className="mobile-frame">
          <div className="login-overlay">
            <div className="locket-logo-text">LOCKET</div>
            <p className="login-subtitle">What's your name?</p>
            <form onSubmit={(e) => {
              e.preventDefault();
              if (inputValue.trim()) setUserName(inputValue.trim());
            }} style={{ width: '100%', maxWidth: '300px' }}>
              <input 
                type="text" 
                className="name-input"
                placeholder="Enter your name" 
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                autoFocus
              />
              <button type="submit" className="continue-btn" disabled={!inputValue.trim()}>
                Continue
              </button>
            </form>
          </div>
        </div>
      </div>
    );
  }

  // ---------------- MAIN APP ----------------
  return (
    <div className="locket-container">
      <div className="mobile-frame">
        
        {/* Swipeable Container */}
        <div className="swipe-container" ref={containerRef}>
          
          {/* LEFT SCREEN: History & Friends */}
          <div className="swipe-screen">
            <div className="screen-header">History</div>
            <div className="feed-container">
              {feed.filter(p => p.sender === userName || p.targets.includes(userName) || p.targets.includes('ALL')).length === 0 && (
                <p style={{textAlign: 'center', color: '#666', marginTop: '2rem'}}>No history yet.</p>
              )}
              {/* Simplified History View - reusing feed items for now */}
              {feed.filter(p => p.sender === userName || p.targets.includes(userName) || p.targets.includes('ALL')).map(photo => (
                <div key={photo.id} className="feed-item" style={{transform: 'scale(0.95)', opacity: 0.8}}>
                  <div className="feed-image-container">
                    <img src={photo.photoBase64} alt="History" />
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* CENTER SCREEN: Camera */}
          <div className="swipe-screen" ref={centerScreenRef}>
            <header className="locket-header">
              <button className="locket-icon-btn" onClick={() => containerRef.current?.scrollTo({left: 0, behavior: 'smooth'})}>
                <Users size={20} />
              </button>
              
              <div style={{ display: 'flex', gap: '0.5rem' }}>
                <div className="friend-bubble" title="Add Friend" onClick={handleAddFriend} style={{backgroundColor: '#fbbf24', color: 'black'}}>
                  <Plus size={16} />
                </div>
              </div>
              
              <button className="locket-icon-btn" onClick={() => containerRef.current?.scrollTo({left: 9999, behavior: 'smooth'})}>
                <ImageIcon size={20} />
              </button>
            </header>

            <main className="camera-view">
              {permissionDenied ? (
                <div className="camera-placeholder">
                  <CameraIcon size={48} />
                  <p>Camera access denied</p>
                </div>
              ) : (
                <video ref={videoRef} autoPlay playsInline muted className="live-video" />
              )}
              <canvas ref={canvasRef} style={{ display: 'none' }} />
            </main>

            <footer className="locket-footer">
              <div style={{display: 'flex', justifyContent: 'space-between', width: '100%', padding: '0 2rem', marginBottom: '-1rem'}}>
                <button className="locket-icon-btn" style={{backgroundColor: 'transparent'}}><Zap size={24}/></button>
                <button className="locket-icon-btn" style={{backgroundColor: 'transparent'}}><RotateCcw size={24}/></button>
              </div>
              
              <div className="capture-btn-outer" onClick={handleCapture}>
                <div className="capture-btn-inner"></div>
              </div>
            </footer>
          </div>

          {/* RIGHT SCREEN: World / Feed */}
          <div className="swipe-screen">
            <div className="screen-header">Feed</div>
            <div className="feed-container">
              {feed.length === 0 && (
                <p style={{textAlign: 'center', color: '#666', marginTop: '2rem'}}>No photos in feed yet.</p>
              )}
              {feed.map(photo => (
                <div key={photo.id} className="feed-item">
                  <div className="feed-header">
                    <div className="feed-avatar">{photo.sender.charAt(0).toUpperCase()}</div>
                    <div className="feed-meta">
                      <span className="feed-sender">{photo.sender}</span>
                      <span className="feed-time">Just now</span>
                    </div>
                  </div>
                  
                  <div className="feed-image-container">
                    <img src={photo.photoBase64} alt="Feed" />
                    {photo.caption && (
                      <div className="feed-caption-overlay">{photo.caption}</div>
                    )}
                  </div>
                  
                  <div className="feed-reactions">
                    <button className="reaction-btn" onClick={() => handleAddReaction(photo.id, '❤️')}>❤️</button>
                    <button className="reaction-btn" onClick={() => handleAddReaction(photo.id, '😂')}>😂</button>
                    <button className="reaction-btn" onClick={() => handleAddReaction(photo.id, '😮')}>😮</button>
                    <div style={{marginLeft: 'auto', display: 'flex', gap: '0.5rem', alignItems: 'center'}}>
                      {Object.entries(photo.reactions).map(([user, emoji]) => (
                        <span key={user} title={user}>{emoji}</span>
                      ))}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

        </div> {/* End Swipe Container */}

        {/* POST-CAPTURE UI OVERLAY */}
        {capturedPhoto && (
          <div className="post-capture-overlay">
            <div className="post-capture-preview">
              <img src={capturedPhoto} alt="Captured" />
              <div className="post-capture-caption">
                <input 
                  type="text" 
                  className="caption-input" 
                  placeholder="Add a caption..." 
                  value={caption}
                  onChange={(e) => setCaption(e.target.value)}
                  maxLength={50}
                />
              </div>
            </div>
            
            <div className="post-capture-controls">
              <div className="send-friends-list">
                <div 
                  className={`send-friend-bubble ${selectedTargets.includes('ALL') ? 'selected' : ''}`}
                  onClick={() => toggleTarget('ALL')}
                >
                  ALL
                </div>
                {friends.map(friend => (
                  <div 
                    key={friend}
                    className={`send-friend-bubble ${selectedTargets.includes(friend) ? 'selected' : ''}`}
                    onClick={() => toggleTarget(friend)}
                  >
                    {friend.substring(0, 2).toUpperCase()}
                  </div>
                ))}
              </div>
              
              <div className="send-actions">
                <button className="cancel-btn" onClick={() => setCapturedPhoto(null)}>Cancel</button>
                <button className="send-btn" onClick={handleSend}>
                  <ArrowUp size={24} strokeWidth={3} />
                </button>
              </div>
            </div>
          </div>
        )}

        {/* RECEIVED POPUP OVERLAY */}
        <div className={`received-popup ${receivedPhoto ? 'show' : ''}`}>
          {receivedPhoto && (
            <>
              <h3 style={{ color: '#fbbf24', marginBottom: '1rem', letterSpacing: '1px' }}>NEW LOCKET</h3>
              <div className="received-widget">
                <img src={receivedPhoto.photoBase64} alt="Received from friend" />
              </div>
              <div className="received-info">From: {receivedPhoto.sender}</div>
              {receivedPhoto.caption && (
                <div style={{marginTop: '1rem', fontSize: '1.2rem', fontStyle: 'italic'}}>{receivedPhoto.caption}</div>
              )}
              <button className="close-popup-btn" onClick={() => setReceivedPhoto(null)}>
                Awesome!
              </button>
            </>
          )}
        </div>

      </div>
    </div>
  );
}
