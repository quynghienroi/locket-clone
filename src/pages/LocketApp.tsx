import { useState, useEffect, useRef } from 'react';
import { Camera as CameraIcon, ArrowUp, Zap, RotateCcw, Image as ImageIcon, Code, Star } from 'lucide-react';
import { io, Socket } from 'socket.io-client';
import { RichMediaEmbed } from '../components/RichMediaEmbed';
import '../Locket.css';

const getEmotion = (caption: string) => {
  if (!caption) return 'default';
  const lower = caption.toLowerCase();
  
  const fireWords = ['tức', 'giận', 'ghét', 'bực', 'cáu', 'cay', 'điên', 'cháy', 'lửa', 'đù', 'đệt'];
  if (fireWords.some(w => lower.includes(w))) return 'fire';
  
  const thunderWords = ['buồn', 'chán', 'tồi tệ', 'khóc', 'đau', 'mệt', 'nản', 'thất vọng', 'xui'];
  if (thunderWords.some(w => lower.includes(w))) return 'thunder';
  
  const loveWords = ['yêu', 'thương', 'nhớ', 'thích', 'tình', 'crush', 'cưng', 'bé', 'tuyệt', 'đẹp'];
  if (loveWords.some(w => lower.includes(w))) return 'love';
  
  const creativeWords = ['sáng tạo', 'thơ', 'hay', 'đỉnh', 'chất', 'ngầu', 'nghệ', 'vui', 'haha', 'hihi'];
  if (creativeWords.some(w => lower.includes(w))) return 'creative';
  
  return 'default';
};

interface PhotoData {
  id: string;
  sender: string;
  targets: string[];
  photoBase64: string;
  caption: string;
  filter?: string;
  reactions: Record<string, string>;
  timestamp: string;
}
interface EventData {
  _id: string;
  title: string;
  description: string;
  date: string;
  pointsReward: number;
  participants: string[];
  formLink?: string;
  thumbnailUrl?: string;
}
interface RepoData {
  _id: string;
  sender: string;
  url: string;
  title?: string;
  owner?: string;
  name?: string;
  description?: string;
  customMessage?: string;
  imageUrl?: string;
  siteName?: string;
  domain?: string;
  language?: string;
  stars?: number;
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
  const [events, setEvents] = useState<EventData[]>([]);
  const [repos, setRepos] = useState<RepoData[]>([]);
  const [userPoints, setUserPoints] = useState<number>(0);
  const [repoUrlInput, setRepoUrlInput] = useState('');
  const [repoDescInput, setRepoDescInput] = useState('');
  const [sharingRepo, setSharingRepo] = useState(false);
  const [showEventForm, setShowEventForm] = useState(false);
  const [eventTitle, setEventTitle] = useState('');
  const [eventDesc, setEventDesc] = useState('');
  const [eventLink, setEventLink] = useState('');
  const [eventReward, setEventReward] = useState(50);
  
  // New features
  const [themeColor, setThemeColor] = useState('#2563eb');
  const [statusNote, setStatusNote] = useState('');
  const [showSettings, setShowSettings] = useState(false);
  const [cameraFilter, setCameraFilter] = useState('none');
  const [facingMode, setFacingMode] = useState<'user' | 'environment'>('user');
  const [flashEnabled, setFlashEnabled] = useState(false);
  const [activeTab, setActiveTab] = useState(1);
  const streamRef = useRef<MediaStream | null>(null);
  
  const [photoToSave, setPhotoToSave] = useState<PhotoData | null>(null);
  
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
          if (data.themeColor) setThemeColor(data.themeColor === '#fbbf24' ? '#2563eb' : data.themeColor);
          if (data.statusNote) setStatusNote(data.statusNote);
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
    const fetchEventsAndPoints = async () => {
      try {
        const res = await fetch(`${BACKEND_URL}/api/events`);
        const data = await res.json();
        if (data.success) setEvents(data.events);

        const repoRes = await fetch(`${BACKEND_URL}/api/repos`);
        const repoData = await repoRes.json();
        if (repoData.success) setRepos(repoData.repos);

        if (token) {
          const userRes = await fetch(`${BACKEND_URL}/api/user/me`, {
            headers: { 'Authorization': `Bearer ${token}` }
          });
          const userData = await userRes.json();
          if (userData.success) {
            setUserPoints(userData.points);
            if (userData.themeColor) setThemeColor(userData.themeColor === '#fbbf24' ? '#2563eb' : userData.themeColor);
            if (userData.statusNote) setStatusNote(userData.statusNote);
          }
        }
      } catch (err) {
        console.error("Failed to fetch data");
      }
    };
    if (userName) fetchEventsAndPoints();
    
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

      newSocket.on('points_updated', (points: number) => {
        setUserPoints(points);
      });

      return () => { newSocket.disconnect(); };
    }
  }, [token, userName]);

  useEffect(() => {
    if (!userName) return; 
    
    const startCamera = async () => {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop());
      }
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ 
          video: { facingMode, width: { ideal: 720 }, height: { ideal: 720 } },
          audio: false 
        });
        streamRef.current = stream;
        if (videoRef.current) videoRef.current.srcObject = stream;
        
        // Attempt to apply torch if flashEnabled
        if (flashEnabled) {
          const track = stream.getVideoTracks()[0];
          const capabilities = track.getCapabilities && track.getCapabilities();
          if (capabilities && (capabilities as any).torch) {
             track.applyConstraints({ advanced: [{ torch: true }] } as any).catch(() => {});
          }
        }
      } catch (err) {
        console.error("Error accessing camera:", err);
        setPermissionDenied(true);
      }
    };
    startCamera();
    
    return () => {
      if (streamRef.current) streamRef.current.getTracks().forEach(track => track.stop());
    };
  }, [userName, facingMode]);

  const toggleFlash = () => {
    const nextFlash = !flashEnabled;
    setFlashEnabled(nextFlash);
    if (streamRef.current) {
      const track = streamRef.current.getVideoTracks()[0];
      const capabilities = track.getCapabilities && track.getCapabilities();
      if (capabilities && (capabilities as any).torch) {
        track.applyConstraints({ advanced: [{ torch: nextFlash }] } as any).catch(console.error);
      }
    }
  };

  const toggleCamera = () => {
    setFacingMode(prev => prev === 'user' ? 'environment' : 'user');
  };

  const handleCapture = () => {
    if (videoRef.current && canvasRef.current) {
      const video = videoRef.current;
      const canvas = canvasRef.current;
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        if (facingMode === 'user') {
          ctx.translate(canvas.width, 0);
          ctx.scale(-1, 1);
        }
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
        setCapturedPhoto(canvas.toDataURL('image/jpeg', 0.8));
        setCaption('');
        
        if (flashEnabled) {
          const flash = document.createElement('div');
          flash.className = 'camera-flash';
          document.body.appendChild(flash);
          setTimeout(() => document.body.removeChild(flash), 150);
        }
      }
    }
  };

  const handleDeletePhoto = (photo: PhotoData) => {
    if (socket) {
      socket.emit('delete_photo', photo.id);
    }
    setPhotoToSave(photo);
  };

  const handleSend = () => {
    if (socket && capturedPhoto) {
      socket.emit('send_photo', {
        targets: selectedTargets,
        photoBase64: capturedPhoto,
        caption: caption,
        filter: cameraFilter
      });
      setCapturedPhoto(null);
      const container = containerRef.current;
      if (container) {
        container.scrollTo({ left: container.clientWidth * 2, behavior: 'smooth' });
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

  const handleJoinEvent = async (eventId: string) => {
    try {
      const res = await fetch(`${BACKEND_URL}/api/events/${eventId}/join`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token })
      });
      const data = await res.json();
      if (data.success) {
        setUserPoints(data.points);
        setEvents(events.map(e => e._id === eventId ? data.event : e));
        alert(`Successfully joined! You earned ${data.event.pointsReward} points.`);
      } else {
        alert(data.error);
      }
    } catch (err) {
      alert("Error joining event");
    }
  };

  const handleShareRepo = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!repoUrlInput) return;
    setSharingRepo(true);
    try {
      const res = await fetch(`${BACKEND_URL}/api/repos`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, url: repoUrlInput, customMessage: repoDescInput })
      });
      const data = await res.json();
      if (data.success) {
        setRepos([data.repo, ...repos]);
        setUserPoints(data.points);
        setRepoUrlInput('');
        setRepoDescInput('');
        alert(`Repo shared! You earned 10 points.`);
      } else {
        alert(data.error || 'Failed to share repo');
      }
    } catch (err) {
      alert("Error sharing repo");
    }
    setSharingRepo(false);
  };

  const handleCreateEvent = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!eventTitle || !eventDesc) return;
    try {
      const res = await fetch(`${BACKEND_URL}/api/events`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: eventTitle, description: eventDesc, date: new Date().toISOString(), pointsReward: eventReward, formLink: eventLink })
      });
      const data = await res.json();
      if (data.success) {
        setEvents([...events, data.event]);
        setEventTitle('');
        setEventDesc('');
        setEventLink('');
        setShowEventForm(false);
      } else {
        alert('Failed to create event');
      }
    } catch (err) {
      alert("Error creating event");
    }
  };

  const handleSaveSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await fetch(`${BACKEND_URL}/api/user/settings`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({ themeColor, statusNote })
      });
      const data = await res.json();
      if (data.success) {
        setShowSettings(false);
      }
    } catch (err) {
      alert("Error saving settings");
    }
  };

  // ---------------- ONBOARDING / AUTH ----------------
  if (!token || !userName) {
    return (
      <div className="locket-container">
        <div className="mobile-frame">
          <div className="login-overlay">
            <img src="/logo.png" alt="INNTECH" className="locket-logo-img" style={{ width: '120px', height: '120px', borderRadius: '50%', marginBottom: '1rem', objectFit: 'cover', border: '3px solid #3b82f6' }} />
            <div className="locket-logo-text" style={{ fontSize: '1.5rem', marginBottom: '2rem' }}>INNTECH</div>
            
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
      {photoToSave && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.85)', zIndex: 9999, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '1rem' }}>
          <img src={photoToSave.photoBase64} alt="Save" style={{ maxWidth: '100%', maxHeight: '60vh', borderRadius: '16px', filter: photoToSave.filter || 'none', objectFit: 'contain' }} />
          <h3 style={{ color: 'white', margin: '1.5rem 0 1rem', textAlign: 'center', fontSize: '1.1rem' }}>Đã gỡ ảnh! Bạn có muốn tải về máy không?</h3>
          <div style={{ display: 'flex', gap: '15px' }}>
            <button onClick={() => setPhotoToSave(null)} style={{ padding: '12px 24px', borderRadius: '24px', background: '#333', color: 'white', border: 'none', fontWeight: 'bold', fontSize: '1rem', cursor: 'pointer' }}>Bỏ qua</button>
            <button 
              onClick={() => {
                const a = document.createElement('a');
                a.href = photoToSave.photoBase64;
                a.download = `inntech_${Date.now()}.png`;
                a.click();
                setPhotoToSave(null);
              }} 
              style={{ padding: '12px 24px', borderRadius: '24px', background: themeColor, color: 'black', border: 'none', fontWeight: 'bold', fontSize: '1rem', cursor: 'pointer' }}
            >
              Lưu về máy
            </button>
          </div>
        </div>
      )}
      <div className="mobile-frame">
        <div 
          className="swipe-container" 
          ref={containerRef}
          onScroll={() => {
            if (containerRef.current) {
              const scrollLeft = containerRef.current.scrollLeft;
              const width = containerRef.current.clientWidth;
              const tab = Math.round(scrollLeft / width);
              if (activeTab !== tab) setActiveTab(tab);
            }
          }}
        >
          
          {/* LEFT SCREEN */}
          <div className="swipe-screen">
            <div className="screen-header">History</div>
            <div className="feed-container">
              {feed.filter(p => p.sender === userName).length === 0 && (
                <p style={{textAlign: 'center', color: '#666', marginTop: '2rem'}}>No history yet.</p>
              )}
              {feed.filter(p => p.sender === userName).map(photo => (
                <div key={photo.id} className="feed-item" style={{transform: 'scale(0.95)', opacity: 0.8}}>
                  <div className="feed-image-container">
                    <img src={photo.photoBase64} alt="History" style={{ filter: photo.filter || 'none' }} />
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* CENTER SCREEN */}
          <div className="swipe-screen" ref={centerScreenRef}>
            <header className="locket-header">
              <button className="locket-icon-btn" onClick={() => setShowSettings(true)} title="Settings" style={{ border: `2px solid ${themeColor}` }}>
                <span style={{fontWeight: 'bold', color: themeColor}}>{userName.charAt(0).toUpperCase()}</span>
              </button>
              
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                <div style={{ fontSize: '10px', color: themeColor, fontWeight: 'bold' }}>{userPoints} PTS</div>
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
                <video ref={videoRef} autoPlay playsInline muted className="live-video" style={{ filter: cameraFilter, transform: facingMode === 'user' ? 'scaleX(-1)' : 'scaleX(1)' }} />
              )}
              <canvas ref={canvasRef} style={{ display: 'none' }} />
              
              <div className="filter-selector">
                {['none', 'grayscale(100%)', 'sepia(100%)', 'saturate(200%)', 'invert(100%)'].map(f => (
                  <button 
                    key={f} 
                    className={`filter-btn ${cameraFilter === f ? 'active' : ''}`}
                    onClick={() => setCameraFilter(f)}
                    style={{ filter: f }}
                  ></button>
                ))}
              </div>
            </main>

            <footer className="locket-footer">
              <div style={{display: 'flex', justifyContent: 'space-between', width: '100%', padding: '0 2rem', marginBottom: '-1rem'}}>
                <button className="locket-icon-btn" onClick={toggleFlash} style={{backgroundColor: flashEnabled ? themeColor : 'transparent', color: flashEnabled ? 'black' : 'white'}}>
                  <Zap size={24}/>
                </button>
                <button className="locket-icon-btn" onClick={toggleCamera} style={{backgroundColor: 'transparent'}}>
                  <RotateCcw size={24}/>
                </button>
              </div>
              <div className="capture-btn-outer" onClick={handleCapture} style={{ borderColor: themeColor }}>
                <div className="capture-btn-inner" style={{ backgroundColor: themeColor }}></div>
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
              {feed.map(photo => {
                // Determine if photo has custom sender props
                const sColor = (photo as any).senderColor || '#2563eb';
                const sNote = (photo as any).senderNote || '';
                return (
                <div key={photo.id} className="fb-post" style={{ borderTop: `4px solid ${sColor}` }}>
                  <div className="fb-post-header">
                    <div className="fb-avatar-container">
                      { (photo.caption || sNote) && (
                        <div className={`avatar-note-bubble note-emotion-${getEmotion(photo.caption || sNote)}`}>
                          {photo.caption || sNote}
                        </div>
                      )}
                      <div className="fb-avatar" style={{ backgroundColor: sColor }}>{photo.sender.charAt(0).toUpperCase()}</div>
                    </div>
                    <div className="fb-meta">
                      <span className="fb-sender" style={{ color: sColor }}>{photo.sender}</span>
                      <span className="fb-time">Just now</span>
                    </div>
                    {photo.sender === userName && (
                      <button 
                        onClick={() => handleDeletePhoto(photo)}
                        style={{ marginLeft: 'auto', background: 'transparent', color: '#ef4444', border: 'none', cursor: 'pointer', fontSize: '0.7rem', fontWeight: 'bold', padding: '2px 6px' }}
                      >
                        Gỡ
                      </button>
                    )}
                  </div>
                  <div className="fb-image-container">
                    <img src={photo.photoBase64} alt="Feed" style={{ filter: photo.filter || 'none' }} />
                  </div>
                  
                  <div className="fb-reactions">
                    <button className="fb-reaction-btn" onClick={() => handleAddReaction(photo.id, '❤️')}>❤️</button>
                    <button className="fb-reaction-btn" onClick={() => handleAddReaction(photo.id, '😂')}>😂</button>
                    <button className="fb-reaction-btn" onClick={() => handleAddReaction(photo.id, '😮')}>😮</button>
                    <div style={{marginLeft: 'auto', display: 'flex', gap: '0.5rem', alignItems: 'center'}}>
                      {Object.entries(photo.reactions).map(([user, emoji]) => (
                        <span key={user} title={user}>{emoji}</span>
                      ))}
                    </div>
                  </div>
                </div>
              )})}
            </div>
          </div>

          {/* SCREEN 4: CLUB EVENTS */}
          <div className="swipe-screen" style={{ padding: '1rem', overflowY: 'auto' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div className="screen-header" style={{ marginBottom: 0 }}>Club Events</div>
              <button 
                onClick={() => setShowEventForm(!showEventForm)}
                style={{ background: '#3b82f6', border: 'none', color: 'white', padding: '6px 12px', borderRadius: '16px', fontWeight: 'bold', fontSize: '0.8rem', cursor: 'pointer' }}
              >
                + Create
              </button>
            </div>

            {showEventForm && (
              <form onSubmit={handleCreateEvent} style={{ background: '#18181b', padding: '1rem', borderRadius: '1rem', marginTop: '1rem', border: '1px solid #3f3f46' }}>
                <input type="text" placeholder="Event Title" value={eventTitle} onChange={e => setEventTitle(e.target.value)} required style={{ width: '100%', padding: '8px', marginBottom: '8px', borderRadius: '8px', border: '1px solid #3f3f46', background: '#27272a', color: 'white' }} />
                <textarea placeholder="Event Description..." value={eventDesc} onChange={e => setEventDesc(e.target.value)} required style={{ width: '100%', padding: '8px', marginBottom: '8px', borderRadius: '8px', border: '1px solid #3f3f46', background: '#27272a', color: 'white', minHeight: '60px' }} />
                <input type="url" placeholder="Link Form (Facebook/Google)..." value={eventLink} onChange={e => setEventLink(e.target.value)} style={{ width: '100%', padding: '8px', marginBottom: '8px', borderRadius: '8px', border: '1px solid #3f3f46', background: '#27272a', color: 'white' }} />
                <div style={{ display: 'flex', gap: '8px', alignItems: 'center', marginBottom: '12px' }}>
                  <span style={{ fontSize: '0.9rem', color: '#a1a1aa' }}>Reward PTS:</span>
                  <input type="number" value={eventReward} onChange={e => setEventReward(Number(e.target.value))} min={10} max={500} style={{ width: '80px', padding: '4px 8px', borderRadius: '8px', border: '1px solid #3f3f46', background: '#27272a', color: 'white' }} />
                </div>
                <button type="submit" style={{ width: '100%', background: '#2563eb', border: 'none', color: 'white', padding: '8px', borderRadius: '8px', fontWeight: 'bold', cursor: 'pointer' }}>Post Event</button>
              </form>
            )}

            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', marginTop: '1rem', paddingBottom: '4rem' }}>
              {events.length === 0 && (
                <p style={{textAlign: 'center', color: '#666', marginTop: '2rem'}}>No upcoming events.</p>
              )}
              {events.map(event => {
                const isJoined = event.participants.includes(userName || '');
                return (
                  <div key={event._id} style={{ background: '#27272a', padding: '1rem', borderRadius: '1rem', border: '1px solid #3f3f46' }}>
                    <RichMediaEmbed repo={event} />
                    
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '8px', marginTop: '12px' }}>
                      <h3 style={{ margin: 0, color: 'white', fontSize: '1.1rem' }}>{event.title}</h3>
                      <span style={{ background: themeColor, color: 'white', padding: '2px 8px', borderRadius: '12px', fontSize: '0.8rem', fontWeight: 'bold' }}>
                        +{event.pointsReward} pts
                      </span>
                    </div>
                    <p style={{ color: '#a1a1aa', fontSize: '0.9rem', marginBottom: '12px', lineHeight: 1.4 }}>{event.description}</p>
                    
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <div style={{ color: '#3b82f6', fontSize: '0.8rem' }}>
                        📅 {new Date(event.date).toLocaleDateString()}
                      </div>
                      <div style={{ color: '#666', fontSize: '0.8rem' }}>
                        👥 {event.participants.length} joining
                      </div>
                    </div>
                    
                    <button 
                      onClick={() => {
                        if (event.formLink && !isJoined) {
                          window.open(event.formLink, '_blank');
                        }
                        handleJoinEvent(event._id);
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
                      {isJoined ? 'Joined ✓' : (event.formLink ? 'Mở Form Đăng Ký' : 'Join Event')}
                    </button>
                  </div>
                );
              })}
            </div>
          </div>

          {/* SCREEN 5: TECH REPOS */}
          <div className="swipe-screen" style={{ padding: '1rem', overflowY: 'auto' }}>
            <div className="screen-header">Shared Links</div>
            
            <form onSubmit={handleShareRepo} style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginTop: '1rem' }}>
              <input 
                type="url" 
                value={repoUrlInput}
                onChange={(e) => setRepoUrlInput(e.target.value)}
                placeholder="https://... (GitHub, YouTube, Facebook)"
                style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid #3f3f46', background: '#27272a', color: 'white' }}
                required
              />
              <textarea 
                value={repoDescInput}
                onChange={(e) => setRepoDescInput(e.target.value)}
                maxLength={150}
                placeholder="Caption (tối đa 150 ký tự)..."
                style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid #3f3f46', background: '#27272a', color: 'white', minHeight: '60px' }}
              />
              <button 
                type="submit" 
                disabled={sharingRepo}
                style={{ padding: '10px', borderRadius: '8px', border: 'none', background: themeColor, color: 'black', fontWeight: 'bold', cursor: sharingRepo ? 'not-allowed' : 'pointer' }}
              >
                {sharingRepo ? '...' : 'Share'}
              </button>
            </form>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', marginTop: '1.5rem', paddingBottom: '4rem' }}>
              {repos.length === 0 && (
                <p style={{textAlign: 'center', color: '#666', marginTop: '2rem'}}>No links shared yet.</p>
              )}
              {repos.map(repo => (
                <div key={repo._id} style={{ background: '#27272a', padding: '1rem', borderRadius: '1rem', border: '1px solid #3f3f46' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
                    <div style={{ width: '24px', height: '24px', borderRadius: '50%', background: themeColor, color: 'black', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 'bold', fontSize: '10px' }}>
                      {repo.sender.charAt(0).toUpperCase()}
                    </div>
                    <span style={{ color: themeColor, fontSize: '0.8rem', fontWeight: 'bold' }}>{repo.sender} shared a link:</span>
                  </div>
                  
                  {repo.customMessage && (
                    <p style={{ color: 'white', fontSize: '1rem', marginBottom: '12px' }}>
                      {repo.customMessage}
                    </p>
                  )}
                  
                  <RichMediaEmbed repo={repo} />
                </div>
              ))}
            </div>
          </div>

        </div>

        {/* POST-CAPTURE UI OVERLAY */}
        {capturedPhoto && (
          <div className="post-capture-overlay">
            <div className="post-capture-preview">
              <img src={capturedPhoto} alt="Captured" style={{ filter: cameraFilter }} />
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
              <div className="send-friends-list" style={{ display: 'none' }}>
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
                <button className="send-btn" onClick={handleSend} style={{ backgroundColor: themeColor }}>
                  <ArrowUp size={24} strokeWidth={3} />
                </button>
              </div>
            </div>
          </div>
        )}

        {/* BOTTOM NAVIGATION TAB BAR */}
        {!capturedPhoto && (
          <div className="bottom-nav-bar" style={{ display: 'flex', justifyContent: 'space-around', padding: '12px 0', background: '#000', borderTop: '1px solid #333', position: 'absolute', bottom: 0, width: '100%', zIndex: 10 }}>
            <button onClick={() => containerRef.current?.scrollTo({left: 0, behavior: 'smooth'})} style={{background:'transparent', border:'none', color: activeTab === 0 ? themeColor : '#a1a1aa', fontSize:'10px', display:'flex', flexDirection:'column', alignItems:'center', gap:'4px', cursor: 'pointer', transition: 'color 0.2s'}}>
              <RotateCcw size={20} /> History
            </button>
            <button onClick={() => containerRef.current?.scrollTo({left: containerRef.current.clientWidth, behavior: 'smooth'})} style={{background:'transparent', border:'none', color: activeTab === 1 ? themeColor : '#a1a1aa', fontSize:'10px', display:'flex', flexDirection:'column', alignItems:'center', gap:'4px', cursor: 'pointer', transition: 'color 0.2s'}}>
              <CameraIcon size={20} /> Camera
            </button>
            <button onClick={() => containerRef.current?.scrollTo({left: containerRef.current.clientWidth * 2, behavior: 'smooth'})} style={{background:'transparent', border:'none', color: activeTab === 2 ? themeColor : '#a1a1aa', fontSize:'10px', display:'flex', flexDirection:'column', alignItems:'center', gap:'4px', cursor: 'pointer', transition: 'color 0.2s'}}>
              <ImageIcon size={20} /> Feed
            </button>
            <button onClick={() => containerRef.current?.scrollTo({left: containerRef.current.clientWidth * 3, behavior: 'smooth'})} style={{background:'transparent', border:'none', color: activeTab === 3 ? themeColor : '#a1a1aa', fontSize:'10px', display:'flex', flexDirection:'column', alignItems:'center', gap:'4px', cursor: 'pointer', transition: 'color 0.2s'}}>
              <Star size={20} /> Events
            </button>
            <button onClick={() => containerRef.current?.scrollTo({left: containerRef.current.clientWidth * 4, behavior: 'smooth'})} style={{background:'transparent', border:'none', color: activeTab === 4 ? themeColor : '#a1a1aa', fontSize:'10px', display:'flex', flexDirection:'column', alignItems:'center', gap:'4px', cursor: 'pointer', transition: 'color 0.2s'}}>
              <Code size={20} /> Repos
            </button>
          </div>
        )}

        {/* RECEIVED POPUP OVERLAY */}
        <div className={`received-popup ${receivedPhoto ? 'show' : ''}`}>
          {receivedPhoto && (
            <>
              <h3 style={{ color: (receivedPhoto as any).senderColor || '#2563eb', marginBottom: '1rem', letterSpacing: '1px' }}>NEW LOCKET</h3>
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

        {/* SETTINGS OVERLAY */}
        {showSettings && (
          <div className="login-overlay" style={{ zIndex: 1000 }}>
            <h2 style={{ marginBottom: '2rem' }}>Personal Settings</h2>
            
            <form onSubmit={handleSaveSettings} style={{ width: '100%', maxWidth: '300px', display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
              <div>
                <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 'bold' }}>Your Note (Status)</label>
                <input 
                  type="text" 
                  className="name-input"
                  placeholder="e.g. Studying..." 
                  value={statusNote}
                  onChange={(e) => setStatusNote(e.target.value)}
                  maxLength={30}
                  style={{ marginBottom: 0 }}
                />
              </div>

              <div>
                <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 'bold' }}>Theme Color</label>
                <div style={{ display: 'flex', gap: '10px', justifyContent: 'center', flexWrap: 'wrap' }}>
                  {['#2563eb', '#06b6d4', '#ec4899', '#8b5cf6', '#10b981', '#f97316', '#ff4d4f'].map(color => (
                    <div 
                      key={color} 
                      onClick={() => setThemeColor(color)}
                      style={{ 
                        width: '40px', height: '40px', borderRadius: '50%', backgroundColor: color, 
                        cursor: 'pointer', border: themeColor === color ? '3px solid white' : '3px solid transparent',
                        boxShadow: themeColor === color ? `0 0 10px ${color}` : 'none'
                      }} 
                    />
                  ))}
                </div>
              </div>

              <div style={{ display: 'flex', gap: '10px', marginTop: '1rem' }}>
                <button type="button" onClick={() => setShowSettings(false)} className="continue-btn" style={{ background: '#333', color: 'white' }}>Cancel</button>
                <button type="submit" className="continue-btn" style={{ background: themeColor, color: 'black' }}>Save</button>
              </div>
              
              <button type="button" onClick={handleLogout} style={{ background: 'transparent', color: '#ff4d4f', border: 'none', fontWeight: 'bold', marginTop: '2rem', cursor: 'pointer' }}>
                Logout
              </button>
            </form>
          </div>
        )}

      </div>
    </div>
  );
}
