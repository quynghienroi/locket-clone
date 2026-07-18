import React, { useState, useEffect } from 'react';
import { useToast } from '../Shared/Toast';
import { RichMediaEmbed } from '../RichMediaEmbed';

interface Repo {
  _id: string;
  id?: string;
  sender: string;
  created_by?: string;
  url: string;
  title?: string;
  owner?: string;
  name?: string;
  description?: string;
  customMessage?: string;
  imageUrl?: string;
  preview_image?: string;
  siteName?: string;
  domain?: string;
  language?: string;
  stars?: number;
}

interface ReposScreenProps {
  token: string;
  username: string;
}

export const ReposScreen: React.FC<ReposScreenProps> = ({ token, username }) => {
  const [repos, setRepos] = useState<Repo[]>([]);
  const { showToast } = useToast();

  // Share form state
  const [repoUrlInput, setRepoUrlInput] = useState('');
  const [repoDescInput, setRepoDescInput] = useState('');
  const [sharingRepo, setSharingRepo] = useState(false);

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

  const handleShareRepo = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!repoUrlInput) return;
    setSharingRepo(true);
    try {
      const res = await fetch(`${import.meta.env.VITE_BACKEND_URL}/api/repos`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, url: repoUrlInput, customMessage: repoDescInput })
      });
      const data = await res.json();
      if (data.success) {
        setRepos([data.repo, ...repos]);
        setRepoUrlInput('');
        setRepoDescInput('');
        showToast('Chia sẻ thành công! Bạn nhận được 10 điểm.');
      } else {
        showToast(data.error || 'Lỗi chia sẻ');
      }
    } catch (err) {
      showToast('Lỗi kết nối');
    }
    setSharingRepo(false);
  };

  const handleDeleteRepo = async (id: string) => {
    if (!window.confirm("Bạn có chắc chắn muốn gỡ Link này không?")) return;
    try {
      const res = await fetch(`${import.meta.env.VITE_BACKEND_URL}/api/repos/${id}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await res.json();
      if (data.success) {
        setRepos(repos.filter(r => (r._id || r.id) !== id));
        showToast('Đã gỡ link');
      } else {
        showToast(data.error || 'Không có quyền gỡ');
      }
    } catch (e) {
      showToast('Lỗi khi gỡ');
    }
  };

  return (
    <div className="swipe-screen" style={{ padding: '1rem', overflowY: 'auto' }}>
      <div className="screen-header">Tài Liệu & Repos</div>

      {/* Share form with caption */}
      <form onSubmit={handleShareRepo} style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginTop: '1rem' }}>
        <input
          type="url"
          value={repoUrlInput}
          onChange={(e) => setRepoUrlInput(e.target.value)}
          placeholder="https://... (GitHub, YouTube, Facebook)"
          style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid #3f3f46', background: '#27272a', color: 'white', boxSizing: 'border-box' }}
          required
        />
        <textarea
          value={repoDescInput}
          onChange={(e) => setRepoDescInput(e.target.value)}
          maxLength={150}
          placeholder="Caption (tối đa 150 ký tự)..."
          style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid #3f3f46', background: '#27272a', color: 'white', minHeight: '60px', boxSizing: 'border-box' }}
        />
        <button
          type="submit"
          disabled={sharingRepo}
          style={{ padding: '10px', borderRadius: '8px', border: 'none', background: 'var(--neon-primary, #3b82f6)', color: 'white', fontWeight: 'bold', cursor: sharingRepo ? 'not-allowed' : 'pointer' }}
        >
          {sharingRepo ? '...' : 'Chia sẻ'}
        </button>
      </form>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', marginTop: '1.5rem', paddingBottom: '4rem' }}>
        {repos.length === 0 && (
          <div style={{ textAlign: 'center', color: '#a1a1aa', marginTop: 50 }}>
            Chưa có tài liệu nào.
          </div>
        )}
        {repos.map(repo => {
          const repoId = repo._id || repo.id || '';
          const repoSender = repo.sender || repo.created_by || '';
          return (
            <div key={repoId} style={{ background: '#27272a', padding: '1rem', borderRadius: '1rem', border: '1px solid #3f3f46' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
                <div style={{ width: '24px', height: '24px', borderRadius: '50%', background: 'var(--neon-primary, #3b82f6)', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 'bold', fontSize: '10px', flexShrink: 0 }}>
                  {repoSender.charAt(0).toUpperCase()}
                </div>
                <span style={{ color: 'var(--neon-primary, #3b82f6)', fontSize: '0.8rem', fontWeight: 'bold' }}>{repoSender} đã chia sẻ:</span>

                {(repoSender === username || username === 'admin') && (
                  <button
                    onClick={() => handleDeleteRepo(repoId)}
                    style={{ marginLeft: 'auto', background: 'transparent', color: '#ef4444', border: 'none', cursor: 'pointer', fontSize: '0.7rem', fontWeight: 'bold', padding: '2px 6px' }}
                  >
                    Gỡ
                  </button>
                )}
              </div>

              {repo.customMessage && (
                <p style={{ color: 'white', fontSize: '1rem', marginBottom: '12px' }}>
                  {repo.customMessage}
                </p>
              )}

              <RichMediaEmbed repo={repo} />
            </div>
          );
        })}
      </div>
    </div>
  );
};
