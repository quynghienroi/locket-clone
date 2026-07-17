import React, { useState } from 'react';
import { useToast } from '../Shared/Toast';
import { supabase } from '../../supabaseClient';

interface AuthModalProps {
  onLoginSuccess: (token: string, username: string, themeColor: string, statusNote: string) => void;
}

export const AuthModal: React.FC<AuthModalProps> = ({ onLoginSuccess }) => {
  const [email, setEmail] = useState('');
  const [otp, setOtp] = useState('');
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const { showToast } = useToast();

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
        onLoginSuccess(data.token, data.username, data.themeColor, data.statusNote);
      } else {
        showToast(data.error || 'Mã OTP không hợp lệ');
      }
    } catch (err) {
      showToast('Lỗi kết nối server');
    } finally {
      setLoading(false);
    }
  };

  const handleLoginGoogle = async () => {
    try {
      const { data, error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: window.location.origin
        }
      });
      if (error) throw error;
    } catch (err: any) {
      showToast(err.message || 'Lỗi đăng nhập Google');
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
        {step === 1 ? (
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
            <div style={{ margin: '20px 0', textAlign: 'center', color: '#a1a1aa' }}>HOẶC</div>
            <button 
              type="button" 
              className="neon-btn" 
              style={{ background: '#fff', color: '#000', display: 'flex', justifyContent: 'center', alignItems: 'center', gap: 10 }}
              onClick={handleLoginGoogle}
            >
              <svg width="24" height="24" viewBox="0 0 24 24"><path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/><path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/><path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/><path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/></svg>
              Đăng nhập với Google
            </button>
          </form>
        ) : (
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
      </div>
    </div>
  );
};
