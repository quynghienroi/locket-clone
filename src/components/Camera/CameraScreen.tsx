import React, { useRef, useState, useEffect } from 'react';
import { Settings, RefreshCcw, Zap } from 'lucide-react';
import { useToast } from '../Shared/Toast';

interface CameraScreenProps {
  username: string;
  onOpenSettings: () => void;
  socket: any;
  friends?: string[];
  userPoints?: number;
}

const FILTERS = [
  'none',
  'grayscale(100%)',
  'sepia(100%)',
  'saturate(200%)',
  'invert(100%)',
];

export const CameraScreen: React.FC<CameraScreenProps> = ({ username, onOpenSettings, socket, friends = [], userPoints = 0 }) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [facingMode, setFacingMode] = useState<'user' | 'environment'>('user');
  const [flash, setFlash] = useState(false);
  const [capturedPhoto, setCapturedPhoto] = useState<string | null>(null);
  const [caption, setCaption] = useState('');
  const [uploading, setUploading] = useState(false);
  const [cameraFilter, setCameraFilter] = useState('none');
  const [selectedTargets, setSelectedTargets] = useState<string[]>(['ALL']);
  
  const { showToast } = useToast();

  useEffect(() => {
    startCamera();
    return () => {
      stopCamera();
    };
  }, [facingMode]);

  const startCamera = async () => {
    stopCamera();
    try {
      const newStream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode },
        audio: false
      });
      setStream(newStream);
      if (videoRef.current) {
        videoRef.current.srcObject = newStream;
      }
    } catch (err) {
      console.error('Camera access denied:', err);
      showToast('Không thể truy cập camera');
    }
  };

  const stopCamera = () => {
    if (stream) {
      stream.getTracks().forEach(track => track.stop());
    }
  };

  const toggleCamera = () => {
    setFacingMode(prev => prev === 'user' ? 'environment' : 'user');
  };

  const toggleFlash = () => {
    const nextFlash = !flash;
    setFlash(nextFlash);
    if (stream) {
      const track = stream.getVideoTracks()[0];
      const capabilities = track.getCapabilities && track.getCapabilities();
      if (capabilities && (capabilities as any).torch) {
        track.applyConstraints({ advanced: [{ torch: nextFlash }] } as any).catch(console.error);
      }
    }
  };

  const capturePhoto = () => {
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
        const dataUrl = canvas.toDataURL('image/jpeg', 0.8);
        setCapturedPhoto(dataUrl);
        stopCamera();

        // Flash effect overlay
        if (flash) {
          const flashEl = document.createElement('div');
          flashEl.className = 'camera-flash';
          document.body.appendChild(flashEl);
          setTimeout(() => document.body.removeChild(flashEl), 150);
        }
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

  const handleSend = async () => {
    if (!capturedPhoto || !socket) return;
    setUploading(true);
    
    try {
      // 1. Convert base64 to Blob
      const base64Data = capturedPhoto.replace(/^data:image\/\w+;base64,/, "");
      const byteCharacters = atob(base64Data);
      const byteArrays = [];
      for (let offset = 0; offset < byteCharacters.length; offset += 512) {
        const slice = byteCharacters.slice(offset, offset + 512);
        const byteNumbers = new Array(slice.length);
        for (let i = 0; i < slice.length; i++) {
          byteNumbers[i] = slice.charCodeAt(i);
        }
        const byteArray = new Uint8Array(byteNumbers);
        byteArrays.push(byteArray);
      }
      const blob = new Blob(byteArrays, { type: 'image/jpeg' });

      // 2. Upload to new REST API
      const formData = new FormData();
      formData.append('photo', blob, `${username}_${Date.now()}.jpg`);
      
      const token = localStorage.getItem('locket_token');
      const uploadRes = await fetch(`${import.meta.env.VITE_BACKEND_URL}/api/upload`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` },
        body: formData
      });
      const uploadData = await uploadRes.json();
      
      if (!uploadData.success) throw new Error(uploadData.error || 'Upload failed');

      // 3. Emit socket event with URL, targets, and filter
      socket.emit('send_photo', {
        targets: selectedTargets,
        photoUrl: uploadData.photoUrl,
        caption,
        filter: cameraFilter
      });

      showToast('Đã gửi ảnh!');
      setCapturedPhoto(null);
      setCaption('');
      setCameraFilter('none');
      setSelectedTargets(['ALL']);
      startCamera();
    } catch (err: any) {
      console.error(err);
      showToast(err.message || 'Lỗi khi gửi ảnh');
    } finally {
      setUploading(false);
    }
  };

  const retakePhoto = () => {
    setCapturedPhoto(null);
    setCaption('');
    setSelectedTargets(['ALL']);
    startCamera();
  };

  return (
    <div className="swipe-screen">
      <div className="screen-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <span>Camera</span>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          {userPoints > 0 && (
            <span className="points-badge">{userPoints} PTS</span>
          )}
          <button className="icon-btn" onClick={onOpenSettings} style={{ width: 36, height: 36 }}>
            <Settings size={20} />
          </button>
        </div>
      </div>

      {!capturedPhoto ? (
        <div className="camera-view">
          <video 
            ref={videoRef} 
            autoPlay 
            playsInline 
            className="camera-video"
            style={{ 
              transform: facingMode === 'user' ? 'scaleX(-1)' : 'none',
              filter: cameraFilter
            }}
          />

          {/* Filter Selector */}
          <div className="filter-selector">
            {FILTERS.map(f => (
              <button 
                key={f} 
                className={`filter-btn ${cameraFilter === f ? 'active' : ''}`}
                onClick={() => setCameraFilter(f)}
                style={{ filter: f }}
              />
            ))}
          </div>
          
          <div className="camera-controls">
            <button className="icon-btn" onClick={toggleFlash}>
              <Zap size={24} color={flash ? '#fbbf24' : '#fff'} />
            </button>
            <button className="capture-btn" onClick={capturePhoto} />
            <button className="icon-btn" onClick={toggleCamera}>
              <RefreshCcw size={24} />
            </button>
          </div>
        </div>
      ) : (
        <div className="camera-view">
          <img 
            src={capturedPhoto} 
            alt="Captured" 
            className="camera-video" 
            style={{ filter: cameraFilter }}
          />
          
          <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, padding: 20, background: 'linear-gradient(to top, rgba(0,0,0,0.8), transparent)' }}>
            {/* Target Friends Selection */}
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

            <input 
              type="text" 
              className="glass-input" 
              placeholder="Thêm tin nhắn..." 
              value={caption}
              onChange={e => setCaption(e.target.value)}
              maxLength={50}
              style={{ marginBottom: 15 }}
            />
            <div style={{ display: 'flex', gap: 10 }}>
              <button className="neon-btn" style={{ flex: 1, background: 'rgba(255,255,255,0.1)', color: '#fff' }} onClick={retakePhoto}>
                Chụp lại
              </button>
              <button className="neon-btn" style={{ flex: 2 }} onClick={handleSend} disabled={uploading}>
                {uploading ? 'Đang gửi...' : 'Gửi'}
              </button>
            </div>
          </div>
        </div>
      )}
      <canvas ref={canvasRef} style={{ display: 'none' }} />
    </div>
  );
};
