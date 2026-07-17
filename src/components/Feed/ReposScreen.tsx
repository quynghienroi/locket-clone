import React, { useState, useEffect } from 'react';
import { useToast } from '../Shared/Toast';

interface Repo {
  id: string;
  created_by: string;
  url: string;
  title: string;
  description: string;
  preview_image: string;
}

interface ReposScreenProps {
  token: string;
  username: string;
}

export const ReposScreen: React.FC<ReposScreenProps> = ({ token, username }) => {
  const [repos, setRepos] = useState<Repo[]>([]);
  const { showToast } = useToast();

  useEffect(() => {
    fetchRepos();
  }, []);

  const fetchRepos = async () => {
    try {
      const res = await fetch(`${import.meta.env.VITE_BACKEND_URL}/api/repos`);
      const data = await res.json();
      if (data.success) {
        setRepos(data.repos || []);
      }
    } catch (e) {
      console.error(e);
    }
  };

  const deleteRepo = async (id: string) => {
    if (!window.confirm("Bạn muốn xoá link này?")) return;
    try {
      const res = await fetch(`${import.meta.env.VITE_BACKEND_URL}/api/repos/${id}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await res.json();
      if (data.success) {
        showToast('Đã xoá link');
        fetchRepos();
      } else {
        showToast('Không có quyền xoá');
      }
    } catch (e) {
      showToast('Lỗi khi xoá');
    }
  };

  return (
    <div className="swipe-screen">
      <div className="screen-header">Tài Liệu & Repos</div>
      <div className="feed-container">
        {repos.map((repo) => (
          <div key={repo.id} className="feed-card" style={{ padding: 16 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 12 }}>
              <span style={{ fontWeight: 'bold', color: 'var(--neon-primary)' }}>{repo.created_by}</span>
              {(repo.created_by === username || username === 'admin') && (
                <button className="feed-delete-btn" onClick={() => deleteRepo(repo.id)}>Xoá</button>
              )}
            </div>
            
            {repo.preview_image && (
              <img src={repo.preview_image} alt="Preview" style={{ width: '100%', height: 150, objectFit: 'cover', borderRadius: 12, marginBottom: 12 }} />
            )}
            
            <h4 style={{ marginBottom: 4 }}>{repo.title || 'No Title'}</h4>
            <p style={{ fontSize: 14, color: '#a1a1aa', marginBottom: 12 }}>{repo.description}</p>
            
            <a href={repo.url} target="_blank" rel="noopener noreferrer" style={{ color: 'var(--neon-secondary)', textDecoration: 'none', fontWeight: 'bold' }}>
              Mở liên kết ↗
            </a>
          </div>
        ))}
        {repos.length === 0 && (
          <div style={{ textAlign: 'center', color: '#a1a1aa', marginTop: 50 }}>
            Chưa có tài liệu nào.
          </div>
        )}
      </div>
    </div>
  );
};
