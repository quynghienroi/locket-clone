import React, { useState } from 'react';
import { Trash2, MessageCircle } from 'lucide-react';
import { useToast } from '../Shared/Toast';

// Unused interface Photo removed

interface VerticalFeedProps {
  feed: any[];
  username: string;
  socket: any;
  onOpenChat: (receiver: string) => void;
}

const getEmotion = (caption: string, music?: any) => {
  let textToAnalyze = caption || '';
  if (music && music.title) {
    textToAnalyze += ' ' + music.title;
  }
  if (!textToAnalyze.trim()) return 'default';
  const lower = textToAnalyze.toLowerCase();
  
  const fireWords = ['tức', 'giận', 'ghét', 'bực', 'cáu', 'cay', 'điên', 'cháy', 'lửa', 'đù', 'đệt'];
  if (fireWords.some(w => lower.includes(w))) return 'fire';
  
  const thunderWords = ['buồn', 'chán', 'tồi tệ', 'khóc', 'đau', 'mệt', 'nản', 'thất vọng', 'xui', 'sầu'];
  if (thunderWords.some(w => lower.includes(w))) return 'thunder';
  
  const loveWords = ['yêu', 'thương', 'nhớ', 'thích', 'tình', 'crush', 'cưng', 'bé', 'tuyệt', 'đẹp'];
  if (loveWords.some(w => lower.includes(w))) return 'love';
  
  const creativeWords = ['sáng tạo', 'thơ', 'hay', 'đỉnh', 'chất', 'ngầu', 'nghệ', 'vui', 'haha', 'hihi'];
  if (creativeWords.some(w => lower.includes(w))) return 'creative';
  
  return 'default';
};

export const VerticalFeed: React.FC<VerticalFeedProps> = ({ feed, username, socket, onOpenChat }) => {
  const { showToast } = useToast();
  const [playingAudio, setPlayingAudio] = useState<string | null>(null);
  const [photoToSave, setPhotoToSave] = useState<any | null>(null);

  const handleDelete = (photo: any) => {
    if (window.confirm('Bạn có chắc muốn gỡ bài viết này?')) {
      socket.emit('delete_photo', photo.id);
      showToast('Đã gỡ bài viết');
      setPhotoToSave(photo);
    }
  };

  const handleReact = (photoId: string, emoji: string) => {
    socket.emit('add_reaction', { photoId, emoji });
  };

  const handleNoteClick = (previewUrl?: string) => {
    if (!previewUrl) return;
    if (playingAudio === previewUrl) {
      setPlayingAudio(null); // Stop
    } else {
      setPlayingAudio(previewUrl);
    }
  };

  return (
    <div className="swipe-screen" style={{ position: 'relative' }}>
      {playingAudio && (
        <audio src={playingAudio} autoPlay onEnded={() => setPlayingAudio(null)} style={{ display: 'none' }} />
      )}

      {/* Download Photo Popup Overlay */}
      {photoToSave && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.85)', zIndex: 9999, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '1rem' }}>
          <img src={photoToSave.photo_url || photoToSave.photoBase64} alt="Save" style={{ maxWidth: '100%', maxHeight: '60vh', borderRadius: '16px', filter: photoToSave.filter || 'none', objectFit: 'contain' }} />
          <h3 style={{ color: 'white', margin: '1.5rem 0 1rem', textAlign: 'center', fontSize: '1.1rem' }}>Đã gỡ ảnh! Bạn có muốn tải về máy không?</h3>
          <div style={{ display: 'flex', gap: '15px' }}>
            <button onClick={() => setPhotoToSave(null)} style={{ padding: '12px 24px', borderRadius: '24px', background: '#333', color: 'white', border: 'none', fontWeight: 'bold', fontSize: '1rem', cursor: 'pointer' }}>Bỏ qua</button>
            <button 
              onClick={() => {
                const a = document.createElement('a');
                a.href = photoToSave.photo_url || photoToSave.photoBase64;
                a.download = `inntech_${Date.now()}.png`;
                a.click();
                setPhotoToSave(null);
              }} 
              className="neon-btn"
              style={{ padding: '12px 24px', borderRadius: '24px', border: 'none', fontWeight: 'bold', fontSize: '1rem', cursor: 'pointer' }}
            >
              Lưu về máy
            </button>
          </div>
        </div>
      )}

      <div className="screen-header">Bảng Tin</div>
      <div className="feed-container">
        {feed.length === 0 ? (
          <div style={{ textAlign: 'center', color: '#a1a1aa', marginTop: 50 }}>
            Chưa có bài viết nào.<br/>Hãy sang tab Camera để gửi ảnh!
          </div>
        ) : (
          feed.map((photo) => {
            const sColor = photo.senderColor || '#00f2fe';
            const sNote = photo.senderNote;
            const sMusic = photo.senderMusic;
            const emotion = getEmotion(sNote || '', sMusic);
            const showNote = sNote || sMusic;

            return (
              <div key={photo.id} className="feed-card" style={{ borderTop: `4px solid ${sColor}` }}>
                <div className="feed-card-header">
                  <div className="fb-avatar-container" style={{ position: 'relative', marginRight: 15 }}>
                    {showNote && (
                      <div 
                        className={`avatar-note-bubble note-emotion-${emotion}`}
                        onClick={() => handleNoteClick(sMusic?.previewUrl)}
                        style={{ 
                          cursor: sMusic ? 'pointer' : 'default', 
                          overflow: 'visible',
                          position: 'absolute',
                          top: -30,
                          left: '50%',
                          transform: 'translateX(-50%)',
                          backgroundColor: 'rgba(0,0,0,0.7)',
                          padding: '4px 10px',
                          borderRadius: '12px',
                          whiteSpace: 'nowrap',
                          zIndex: 10,
                          fontSize: '0.8rem',
                          border: `1px solid ${sColor}`
                        }}
                      >
                        {emotion === 'fire' && <div className="particle particle-fire" style={{position:'absolute', top:-15, right:-10, fontSize:'1.2rem'}}>🔥</div>}
                        {emotion === 'thunder' && <><div className="particle particle-rain-1" style={{position:'absolute', top:-15, right:-5, fontSize:'1rem'}}>💧</div></>}
                        {emotion === 'love' && <><div className="particle particle-love-1" style={{position:'absolute', top:-15, right:-10, fontSize:'1.2rem'}}>❤️</div></>}
                        {emotion === 'creative' && <><div className="particle particle-creative-1" style={{position:'absolute', top:-15, right:-10, fontSize:'1.2rem'}}>✨</div></>}
                        
                        {sNote && <div style={{marginBottom: sMusic ? '4px' : '0'}}>{sNote}</div>}
                        {sMusic && (
                          <div className="avatar-music-player">
                            <div style={{fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '4px'}}>
                              <span className={playingAudio === sMusic.previewUrl ? 'music-icon-spin' : ''}>🎵</span>
                              <div style={{maxWidth: '120px', overflow: 'hidden', textOverflow: 'ellipsis'}}>
                                <span>{sMusic.title}</span>
                              </div>
                            </div>
                          </div>
                        )}
                      </div>
                    )}
                    <div className="feed-avatar" style={{ background: sColor }}>
                      {photo.sender.substring(0, 1).toUpperCase()}
                    </div>
                  </div>

                  <div className="feed-meta">
                    <span className="feed-sender" style={{ color: sColor, fontWeight: 'bold' }}>{photo.sender}</span>
                    <span className="feed-time">{new Date(photo.created_at || photo.timestamp || Date.now()).toLocaleString()}</span>
                  </div>
                  {(photo.sender === username || username === 'admin') && (
                    <button className="feed-delete-btn" onClick={() => handleDelete(photo)}>
                      <Trash2 size={16} /> Gỡ
                    </button>
                  )}
                </div>

                <div className="feed-photo-container">
                  <img src={photo.photo_url || photo.photoBase64} alt="Post" className="feed-photo" loading="lazy" style={{ filter: photo.filter || 'none' }} />
                  {photo.caption && (
                    <div className="feed-caption">{photo.caption}</div>
                  )}
                </div>

                <div style={{ padding: '12px 16px', display: 'flex', gap: 10, background: 'rgba(0,0,0,0.2)', alignItems: 'center' }}>
                  <button className="fb-reaction-btn" onClick={() => handleReact(photo.id, '❤️')} style={{ background: 'transparent', border: 'none', cursor: 'pointer', fontSize: '1.2rem' }}>❤️</button>
                  <button className="fb-reaction-btn" onClick={() => handleReact(photo.id, '😂')} style={{ background: 'transparent', border: 'none', cursor: 'pointer', fontSize: '1.2rem' }}>😂</button>
                  <button className="fb-reaction-btn" onClick={() => handleReact(photo.id, '😮')} style={{ background: 'transparent', border: 'none', cursor: 'pointer', fontSize: '1.2rem' }}>😮</button>
                  
                  <div style={{ marginLeft: '10px', display: 'flex', gap: '0.5rem', alignItems: 'center', fontSize: '0.9rem' }}>
                    {photo.reactions && Object.entries(photo.reactions).map(([user, emoji]) => (
                      <span key={user} title={user}>{emoji as string}</span>
                    ))}
                  </div>

                  <button 
                    style={{ background: 'transparent', border: 'none', color: '#fff', cursor: 'pointer', marginLeft: 'auto' }}
                    onClick={() => onOpenChat(photo.sender)}
                  >
                    <MessageCircle size={24} />
                  </button>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};
