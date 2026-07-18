import { useState, useEffect } from 'react';
import { useToast } from '../components/Shared/Toast';

export const useAuth = () => {
  const [token, setToken] = useState(localStorage.getItem('locket_token'));
  const [username, setUsername] = useState(localStorage.getItem('locket_username'));
  const [themeColor, setThemeColor] = useState(localStorage.getItem('locket_themecolor') || '#000000');
  const [statusNote, setStatusNote] = useState('');
  const [points, setPoints] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  
  const { showToast } = useToast();

  useEffect(() => {
    if (token) {
      fetch(`${import.meta.env.VITE_BACKEND_URL}/api/user/me`, {
        headers: { 'Authorization': `Bearer ${token}` }
      })
      .then(res => res.json())
      .then(data => {
        if (data.success) {
          if (data.themeColor) setThemeColor(data.themeColor);
          if (data.statusNote) setStatusNote(data.statusNote);
          if (data.points !== undefined) setPoints(data.points);
        } else {
          // Token invalid or expired
          logout();
        }
      })
      .catch(() => logout())
      .finally(() => setIsLoading(false));
    } else {
      setIsLoading(false);
    }
  }, [token]);

  const login = (newToken: string, newUsername: string, newTheme?: string, newNote?: string) => {
    localStorage.setItem('locket_token', newToken);
    localStorage.setItem('locket_username', newUsername);
    setToken(newToken);
    setUsername(newUsername);
    if (newTheme) {
      localStorage.setItem('locket_themecolor', newTheme);
      setThemeColor(newTheme);
    }
    if (newNote) {
      setStatusNote(newNote);
    }
  };

  const logout = () => {
    localStorage.removeItem('locket_token');
    localStorage.removeItem('locket_username');
    localStorage.removeItem('locket_themecolor');
    setToken(null);
    setUsername(null);
  };

  const updateSettings = async (color: string, note: string) => {
    try {
      const res = await fetch(`${import.meta.env.VITE_BACKEND_URL}/api/user/settings`, {
        method: 'PUT',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ themeColor: color, statusNote: note })
      });
      const data = await res.json();
      if (data.success) {
        setThemeColor(data.themeColor);
        setStatusNote(data.statusNote);
        localStorage.setItem('locket_themecolor', data.themeColor);
        showToast('Đã lưu cài đặt');
      }
    } catch (e) {
      showToast('Lỗi khi lưu cài đặt');
    }
  };

  return { token, username, themeColor, statusNote, points, setPoints, isLoading, login, logout, updateSettings };
};
