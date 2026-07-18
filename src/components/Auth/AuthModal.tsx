import React, { useState } from 'react';
import { useToast } from '../Shared/Toast';

interface AuthModalProps {
  onLoginSuccess: (token: string, username: string, themeColor: string, statusNote: string) => void;
}

export const AuthModal: React.FC<AuthModalProps> = ({ onLoginSuccess }) => {
  const [email, setEmail] = useState('');
  const [otp, setOtp] = useState('');
  const [newUsername, setNewUsername] = useState('');
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const { showToast } = useToast();

  // Store token/themeColor/statusNote between OTP verify and username setup
  const [pendingToken, setPendingToken] = useState('');
  const [pendingThemeColor, setPendingThemeColor] = useState('');
  const [pendingStatusNote, setPendingStatusNote] = useState('');

  const handleRequestOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await fetch(`${import.meta.env.VITE_BACKEND_URL}/api/auth/request-otp`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email })
      });
      const data = await res.json();
      if (data.success) {
        setStep(2);
        showToast('Đã gửi mã OTP tới email!');
      } else {
        showToast(data.error || 'Lỗi gửi OTP');
      }
    } catch (err) {
      showToast('Lỗi kết nối server');
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await fetch(`${import.meta.env.VITE_BACKEND_URL}/api/auth/verify-otp`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, otp })
      });
      const data = await res.json();
      if (data.success) {
        if (data.isNewUser || !data.username || data.username.startsWith('user_')) {
          // New user or hasn't completed username setup — go to username setup step
          setPendingToken(data.token);
          setPendingThemeColor(data.themeColor || '');
          setPendingStatusNote(data.statusNote || '');
          setStep(3);
        } else {
          // Existing user with username — login complete
          onLoginSuccess(data.token, data.username, data.themeColor || '', data.statusNote || '');
        }
      } else {
        showToast(data.error || 'Mã OTP không hợp lệ');
      }
    } catch (err) {
      showToast('Lỗi kết nối server');
    } finally {
      setLoading(false);
    }
  };

  const handleSetUsername = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await fetch(`${import.meta.env.VITE_BACKEND_URL}/api/auth/set-username`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token: pendingToken, username: newUsername })
      });
      const data = await res.json();
      if (data.success) {
        onLoginSuccess(pendingToken, data.username, pendingThemeColor, pendingStatusNote);
      } else {
        showToast(data.error || 'Lỗi đặt tên');
      }
    } catch (err) {
      showToast('Lỗi kết nối server');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="overlay-full" style={{ background: '#0a0a0c', justifyContent: 'center' }}>
      <div style={{ textAlign: 'center', marginBottom: 40, display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
        <img src="/logo.png" alt="INNTECH Logo" style={{ width: '120px', height: '120px', borderRadius: '50%', marginBottom: '1rem', objectFit: 'cover', border: '3px solid #00f2fe', boxShadow: '0 0 20px rgba(0, 242, 254, 0.5)' }} />
        <h1 style={{ fontSize: '48px', fontWeight: '900', background: 'linear-gradient(to right, #00f2fe, #4facfe)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', marginBottom: '10px' }}>
          INNTECH
        </h1>
        <p style={{ color: '#a1a1aa' }}>Đăng nhập để chia sẻ khoảnh khắc</p>
      </div>

      <div className="glass-panel" style={{ padding: '30px', width: '100%', maxWidth: '350px', margin: '0 auto' }}>
        {step === 1 && (
          <form onSubmit={handleRequestOtp}>
            <input 
              type="email" 
              className="glass-input" 
              placeholder="Email của bạn"
              value={email}
              onChange={e => setEmail(e.target.value)}
              required
            />
            <button type="submit" className="neon-btn" disabled={loading}>
              {loading ? 'Đang gửi...' : 'Gửi mã OTP'}
            </button>
          </form>
        )}

        {step === 2 && (
          <form onSubmit={handleVerifyOtp}>
            <p style={{ color: '#fff', marginBottom: 15, textAlign: 'center', fontSize: 14 }}>
              Nhập mã gồm 6 chữ số gửi tới <br/> <b>{email}</b>
            </p>
            <input 
              type="text" 
              className="glass-input" 
              placeholder="123456"
              value={otp}
              onChange={e => setOtp(e.target.value)}
              required
              maxLength={6}
              style={{ textAlign: 'center', letterSpacing: '5px', fontSize: 24, fontWeight: 'bold' }}
            />
            <button type="submit" className="neon-btn" disabled={loading}>
              {loading ? 'Đang xác thực...' : 'Xác thực OTP'}
            </button>
            <button 
              type="button" 
              onClick={() => setStep(1)}
              style={{ background: 'transparent', border: 'none', color: '#a1a1aa', marginTop: 15, width: '100%', cursor: 'pointer' }}
            >
              Quay lại
            </button>
          </form>
        )}

        {step === 3 && (
          <form onSubmit={handleSetUsername}>
            <p style={{ color: '#fff', marginBottom: 15, textAlign: 'center', fontSize: 14 }}>
              Chọn tên hiển thị của bạn
            </p>
            <input 
              type="text" 
              className="glass-input" 
              placeholder="e.g. alex123"
              value={newUsername}
              onChange={e => setNewUsername(e.target.value)}
              autoFocus
              required
            />
            <button type="submit" className="neon-btn" disabled={loading || !newUsername}>
              {loading ? 'Đang lưu...' : 'Bắt đầu sử dụng'}
            </button>
            <button 
              type="button" 
              onClick={() => setStep(2)}
              style={{ background: 'transparent', border: 'none', color: '#a1a1aa', marginTop: 15, width: '100%', cursor: 'pointer' }}
            >
              Quay lại
            </button>
          </form>
        )}
      </div>
    </div>
  );
};
