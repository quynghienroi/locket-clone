import React, { useRef, useState, useEffect } from 'react';
import { Camera, Settings, RefreshCcw, Zap, Link } from 'lucide-react';
import { supabase } from '../../supabaseClient';
import { useToast } from '../Shared/Toast';

interface CameraScreenProps {
  username: string;
  onOpenSettings: () => void;
  socket: any;
}

export const CameraScreen: React.FC<CameraScreenProps> = ({ username, onOpenSettings, socket }) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [facingMode, setFacingMode] = useState<'user' | 'environment'>('user');
  const [flash, setFlash] = useState(false);
  const [capturedPhoto, setCapturedPhoto] = useState<string | null>(null);
  const [caption, setCaption] = useState('');
  const [uploading, setUploading] = useState(false);
  
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
        const dataUrl = canvas.toDataURL('image/jpeg', 0.8); // Compress slightly
        setCapturedPhoto(dataUrl);
        stopCamera();
      }
    }
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

      // 2. Upload to Supabase Storage
      const fileName = `${username}_${Date.now()}.jpg`;
      const { data, error } = await supabase.storage.from('photos').upload(fileName, blob, { contentType: 'image/jpeg' });
      
      if (error) throw error;

      // 3. Get Public URL
      const { data: publicUrlData } = supabase.storage.from('photos').getPublicUrl(fileName);
      const photoUrl = publicUrlData.publicUrl;

      // 4. Emit socket event with URL
      socket.emit('send_photo', {
        targets: ['global'],
        photoUrl,
        caption,
        filter: 'none'
      });

      showToast('Đã gửi ảnh!');
      setCapturedPhoto(null);
      setCaption('');
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
    startCamera();
  };

  return (
    <div className="swipe-screen">
      <div className="screen-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <span>Camera</span>
        <button className="icon-btn" onClick={onOpenSettings} style={{ width: 36, height: 36 }}>
          <Settings size={20} />
        </button>
      </div>

      {!capturedPhoto ? (
        <div className="camera-view">
          <video 
            ref={videoRef} 
            autoPlay 
            playsInline 
            className="camera-video"
            style={{ transform: facingMode === 'user' ? 'scaleX(-1)' : 'none' }}
          />
          {flash && <div style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(255,255,255,0.3)', pointerEvents: 'none' }} />}
          
          <div className="camera-controls">
            <button className="icon-btn" onClick={() => setFlash(!flash)}>
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
          <img src={capturedPhoto} alt="Captured" className="camera-video" />
          
          <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, padding: 20, background: 'linear-gradient(to top, rgba(0,0,0,0.8), transparent)' }}>
            <input 
              type="text" 
              className="glass-input" 
              placeholder="Thêm tin nhắn..." 
              value={caption}
              onChange={e => setCaption(e.target.value)}
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
