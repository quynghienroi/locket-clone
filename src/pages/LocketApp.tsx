import { useState, useEffect, useRef } from 'react';
import { Camera as CameraIcon, ArrowUp, Zap, RotateCcw, Plus, Image as ImageIcon } from 'lucide-react';
import { io, Socket } from 'socket.io-client';
import '../Locket.css';

interface PhotoData {
  id: string;
  sender: string;
  targets: string[];
  photoBase64: string;
  caption: string;
  reactions: Record<string, string>;
  timestamp: string;
}

export default function LocketApp() {
  // Auth State
  const [token, setToken] = useState<string | null>(localStorage.getItem('locket_token'));
  const [userName, setUserName] = useState<string | null>(localStorage.getItem('locket_username'));
  const [authStep, setAuthStep] = useState<'EMAIL' | 'OTP' | 'USERNAME'>('EMAIL');
  const [email, setEmail] = useState('');
  const [otp, setOtp] = useState('');
  const [newUsername, setNewUsername] = useState('');
  const [loading, setLoading] = useState(false);
  
  // App State
  const [socket, setSocket] = useState<Socket | null>(null);
  const [feed, setFeed] = useState<PhotoData[]>([]);
  const [friends, setFriends] = useState<string[]>([]);
  const [receivedPhoto, setReceivedPhoto] = useState<PhotoData | null>(null);
  const [permissionDenied, setPermissionDenied] = useState(false);
  
  const containerRef = useRef<HTMLDivElement>(null);
  const centerScreenRef = useRef<HTMLDivElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const [capturedPhoto, setCapturedPhoto] = useState<string | null>(null);
  const [caption, setCaption] = useState('');
  const [selectedTargets, setSelectedTargets] = useState<string[]>(['ALL']);

  const BACKEND_URL = import.meta.env.VITE_BACKEND_URL || 'http://localhost:3001';

  // --- Auth Flow ---
  const handleRequestOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await fetch(`${BACKEND_URL}/api/auth/request-otp`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email })
      });
      const data = await res.json();
      if (data.success) {
        setAuthStep('OTP');
      } else {
        alert(data.error);
      }
    } catch (err) {
      alert("Network error");
    }
    setLoading(false);
  };

  const handleVerifyOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await fetch(`${BACKEND_URL}/api/auth/verify-otp`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, otp })
      });
      const data = await res.json();
      if (data.success) {
        setToken(data.token);
        localStorage.setItem('locket_token', data.token);
        if (data.isNewUser || !data.username) {
          setAuthStep('USERNAME');
        } else {
          setUserName(data.username);
          localStorage.setItem('locket_username', data.username);
        }
      } else {
        alert(data.error);
      }
    } catch (err) {
      alert("Network error");
    }
    setLoading(false);
  };

  const handleSetUsername = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await fetch(`${BACKEND_URL}/api/auth/set-username`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, username: newUsername })
      });
      const data = await res.json();
      if (data.success) {
        setUserName(data.username);
        localStorage.setItem('locket_username', data.username);
      } else {
        alert(data.error);
      }
    } catch (err) {
      alert("Network error");
    }
    setLoading(false);
  };

  // --- App Logic ---
  useEffect(() => {
    if (userName && centerScreenRef.current) {
      setTimeout(() => {
        centerScreenRef.current?.scrollIntoView({ behavior: 'auto', inline: 'center' });
      }, 100);
    }
  }, [userName]);

  useEffect(() => {
    if (token && userName) {
      const newSocket = io(BACKEND_URL, {
        auth: { token }
      });
      setSocket(newSocket);

      newSocket.on('feed_updated', (updatedFeed: PhotoData[]) => {
        setFeed(updatedFeed);
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

      newSocket.on('connect_error', (err) => {
        console.error("Socket error:", err.message);
        if (err.message === "Authentication error") {
          // Token expired or invalid
          setToken(null);
          setUserName(null);
          localStorage.removeItem('locket_token');
          localStorage.removeItem('locket_username');
        }
      });

      return () => { newSocket.disconnect(); };
    }
  }, [token, userName]);

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
  }, [userName, capturedPhoto]);

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
        setCapturedPhoto(canvas.toDataURL('image/jpeg', 0.8));
        setCaption('');
        
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
        targets: selectedTargets,
        photoBase64: capturedPhoto,
        caption: caption
      });
      setCapturedPhoto(null);
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

  const handleAddReaction = (photoId: string, emoji: string) => {
    if (socket) {
      socket.emit('add_reaction', { photoId, emoji });
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('locket_token');
    localStorage.removeItem('locket_username');
    setToken(null);
    setUserName(null);
    setAuthStep('EMAIL');
  }

  // ---------------- ONBOARDING / AUTH ----------------
  if (!token || !userName) {
    return (
      <div className="locket-container">
        <div className="mobile-frame">
          <div className="login-overlay">
            <div className="locket-logo-text">LOCKET</div>
            
            {authStep === 'EMAIL' && (
              <>
                <p className="login-subtitle">Enter your email</p>
                <form onSubmit={handleRequestOtp} style={{ width: '100%', maxWidth: '300px' }}>
                  <input 
                    type="email" 
                    className="name-input"
                    placeholder="hello@example.com" 
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    autoFocus
                    required
                  />
                  <button type="submit" className="continue-btn" disabled={loading || !email}>
                    {loading ? 'Sending...' : 'Continue'}
                  </button>
                </form>
              </>
            )}

            {authStep === 'OTP' && (
              <>
                <p className="login-subtitle">Enter the code sent to<br/>{email}</p>
                <form onSubmit={handleVerifyOtp} style={{ width: '100%', maxWidth: '300px' }}>
                  <input 
                    type="text" 
                    className="name-input"
                    placeholder="6-digit code" 
                    value={otp}
                    onChange={(e) => setOtp(e.target.value)}
                    autoFocus
                    maxLength={6}
                    required
                  />
                  <button type="submit" className="continue-btn" disabled={loading || otp.length < 6}>
                    {loading ? 'Verifying...' : 'Verify'}
                  </button>
                </form>
              </>
            )}

            {authStep === 'USERNAME' && (
              <>
                <p className="login-subtitle">Pick a username</p>
                <form onSubmit={handleSetUsername} style={{ width: '100%', maxWidth: '300px' }}>
                  <input 
                    type="text" 
                    className="name-input"
                    placeholder="e.g. alex123" 
                    value={newUsername}
                    onChange={(e) => setNewUsername(e.target.value)}
                    autoFocus
                    required
                  />
                  <button type="submit" className="continue-btn" disabled={loading || !newUsername}>
                    {loading ? 'Saving...' : 'Start using Locket'}
                  </button>
                </form>
              </>
            )}
          </div>
        </div>
      </div>
    );
  }

  // ---------------- MAIN APP ----------------
  return (
    <div className="locket-container">
      <div className="mobile-frame">
        <div className="swipe-container" ref={containerRef}>
          
          {/* LEFT SCREEN */}
          <div className="swipe-screen">
            <div className="screen-header">History</div>
            <div className="feed-container">
              {feed.filter(p => p.sender === userName || p.targets.includes(userName) || p.targets.includes('ALL')).length === 0 && (
                <p style={{textAlign: 'center', color: '#666', marginTop: '2rem'}}>No history yet.</p>
              )}
              {feed.filter(p => p.sender === userName || p.targets.includes(userName) || p.targets.includes('ALL')).map(photo => (
                <div key={photo.id} className="feed-item" style={{transform: 'scale(0.95)', opacity: 0.8}}>
                  <div className="feed-image-container">
                    <img src={photo.photoBase64} alt="History" />
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* CENTER SCREEN */}
          <div className="swipe-screen" ref={centerScreenRef}>
            <header className="locket-header">
              <button className="locket-icon-btn" onClick={handleLogout} title="Logout">
                <span style={{fontWeight: 'bold'}}>{userName.charAt(0).toUpperCase()}</span>
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

          {/* RIGHT SCREEN */}
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

        </div>

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
