import { useState, useEffect } from 'react';
import { FileText, Folder, ArrowLeft, Star, Code } from 'lucide-react';

const BACKEND_URL = import.meta.env.VITE_BACKEND_URL || 'http://localhost:3001';

export function RichMediaEmbed({ repo }: { repo: any }) {
  const url = repo.url || repo.formLink || repo;
  if (!url || typeof url !== 'string') return null;

  // 1. YouTube Detection
  const ytMatch = url.match(/(?:youtube\.com\/(?:[^\/]+\/.+\/|(?:v|e(?:mbed)?)\/|.*[?&]v=)|youtu\.be\/)([^"&?\/\s]{11})/i);
  if (ytMatch && ytMatch[1]) {
    return (
      <div style={{ marginTop: '12px', borderRadius: '12px', overflow: 'hidden' }}>
        <iframe
          width="100%"
          height="250"
          src={`https://www.youtube.com/embed/${ytMatch[1]}`}
          title="YouTube video player"
          frameBorder="0"
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
          allowFullScreen
        ></iframe>
      </div>
    );
  }

  // 2. Facebook Detection
  const fbMatch = url.match(/facebook\.com\/.*\/posts\/|facebook\.com\/.*\/videos\/|facebook\.com\/photo|facebook\.com\/.*\/activity\//i);
  if (fbMatch) {
    return (
      <div style={{ marginTop: '12px', borderRadius: '12px', overflow: 'hidden', background: '#fff', padding: '4px' }}>
        <iframe
          src={`https://www.facebook.com/plugins/post.php?href=${encodeURIComponent(url)}&show_text=true&width=500`}
          width="100%"
          height="400"
          style={{ border: 'none', overflow: 'hidden' }}
          scrolling="yes"
          frameBorder="0"
          allowFullScreen={true}
          allow="autoplay; clipboard-write; encrypted-media; picture-in-picture; web-share"
        ></iframe>
      </div>
    );
  }

  // 3. GitHub Detection
  const ghMatch = url.match(/github\.com\/([^\/]+)\/([^\/]+)/i);
  if (ghMatch && ghMatch[1] && ghMatch[2]) {
    return <GitHubRepoViewer owner={ghMatch[1]} repoName={ghMatch[2]} />;
  }

  // Fallback to standard Link Preview
  if (!repo || typeof repo === 'string') return null;

  const displayUrl = repo.url || repo.formLink;
  const displayImage = repo.imageUrl || repo.thumbnailUrl;
  
  if (!displayUrl) return null;

  return (
    <a href={displayUrl} target="_blank" rel="noreferrer" className="link-preview-card">
      {displayImage && (
        <img src={displayImage} alt="Preview" className="link-preview-image" />
      )}
      <div className="link-preview-content">
        <div className="link-preview-domain">{repo.siteName || repo.domain || 'LINK'}</div>
        <h3 className="link-preview-title">
          {repo.title || repo.name || repo.url}
        </h3>
        {repo.description && (
          <p className="link-preview-desc">
            {repo.description}
          </p>
        )}
        
        {/* GitHub Specific Stats (Fallback if not viewed as interactive) */}
        {(repo.language || repo.stars !== undefined) && (
          <div style={{ display: 'flex', gap: '16px', alignItems: 'center', marginTop: '8px' }}>
            {repo.language && (
              <div style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '0.8rem', color: '#3b82f6' }}>
                <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#3b82f6' }}></span>
                {repo.language}
              </div>
            )}
            {repo.stars !== undefined && repo.stars > 0 && (
              <div style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '0.8rem', color: '#a1a1aa' }}>
                <Star size={14} />
                {repo.stars}
              </div>
            )}
          </div>
        )}
      </div>
    </a>
  );
}

function GitHubRepoViewer({ owner, repoName }: { owner: string, repoName: string }) {
  const [path, setPath] = useState('');
  const [contents, setContents] = useState<any[]>([]);
  const [fileContent, setFileContent] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const fetchPath = async (currentPath: string) => {
    setLoading(true);
    setError('');
    setFileContent(null);
    try {
      const res = await fetch(`${BACKEND_URL}/api/github/proxy?path=/repos/${owner}/${repoName}/contents/${currentPath}`);
      if (!res.ok) throw new Error('Failed to fetch from GitHub API');
      const data = await res.json();
      
      if (Array.isArray(data)) {
        // It's a directory
        data.sort((a, b) => {
          if (a.type === 'dir' && b.type !== 'dir') return -1;
          if (a.type !== 'dir' && b.type === 'dir') return 1;
          return a.name.localeCompare(b.name);
        });
        setContents(data);
      } else if (data.type === 'file') {
        // It's a file
        if (data.encoding === 'base64') {
          // Decode base64
          // UTF-8 base64 decoding correctly
          const decoded = decodeURIComponent(escape(window.atob(data.content)));
          setFileContent(decoded);
        } else {
          setFileContent('File cannot be displayed.');
        }
      }
    } catch (err) {
      setError('Error loading repository data.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPath('');
  }, [owner, repoName]);

  const handleNavigate = (newPath: string) => {
    setPath(newPath);
    fetchPath(newPath);
  };

  const goUp = () => {
    const parts = path.split('/').filter(Boolean);
    parts.pop();
    const newPath = parts.join('/');
    setPath(newPath);
    fetchPath(newPath);
  };

  return (
    <div style={{ marginTop: '12px', background: '#18181b', borderRadius: '12px', border: '1px solid #3f3f46', overflow: 'hidden' }}>
      {/* Header */}
      <div style={{ padding: '12px', background: '#27272a', borderBottom: '1px solid #3f3f46', display: 'flex', alignItems: 'center', gap: '8px' }}>
        <Code size={18} color="#3b82f6" />
        <span style={{ color: 'white', fontWeight: 'bold', fontSize: '0.95rem' }}>{owner}/{repoName}</span>
      </div>

      {/* Breadcrumb / Navigation */}
      <div style={{ padding: '8px 12px', background: '#202024', display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.85rem', color: '#a1a1aa' }}>
        {path !== '' && (
          <button onClick={goUp} style={{ background: 'none', border: 'none', color: '#3b82f6', cursor: 'pointer', display: 'flex', alignItems: 'center', padding: 0 }}>
            <ArrowLeft size={16} /> Back
          </button>
        )}
        <span>/{path}</span>
      </div>

      {/* Content */}
      <div style={{ padding: '12px', maxHeight: '300px', overflowY: 'auto' }}>
        {loading && <div style={{ color: '#a1a1aa', textAlign: 'center', padding: '1rem' }}>Loading...</div>}
        {error && <div style={{ color: '#ef4444', textAlign: 'center', padding: '1rem' }}>{error}</div>}
        
        {!loading && !error && fileContent !== null && (
          <pre style={{ margin: 0, padding: '12px', background: '#000', color: '#e5e7eb', fontSize: '0.8rem', overflowX: 'auto', borderRadius: '6px' }}>
            <code>{fileContent}</code>
          </pre>
        )}

        {!loading && !error && fileContent === null && contents.map(item => (
          <div 
            key={item.path}
            onClick={() => handleNavigate(item.path)}
            style={{ 
              display: 'flex', 
              alignItems: 'center', 
              gap: '8px', 
              padding: '8px', 
              cursor: 'pointer',
              borderRadius: '6px',
              transition: 'background 0.2s'
            }}
            onMouseOver={(e) => e.currentTarget.style.background = '#27272a'}
            onMouseOut={(e) => e.currentTarget.style.background = 'transparent'}
          >
            {item.type === 'dir' ? (
              <Folder size={16} color="#3b82f6" />
            ) : (
              <FileText size={16} color="#a1a1aa" />
            )}
            <span style={{ color: item.type === 'dir' ? '#3b82f6' : 'white', fontSize: '0.9rem' }}>
              {item.name}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
