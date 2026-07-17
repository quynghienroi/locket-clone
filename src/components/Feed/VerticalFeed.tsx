import React from 'react';
import { Trash2, Heart, MessageCircle } from 'lucide-react';
import { useToast } from '../Shared/Toast';

interface Photo {
  id: string;
  sender: string;
  photo_url: string;
  caption: string;
  created_at: string;
  reactions: Record<string, string>;
}

interface VerticalFeedProps {
  feed: Photo[];
  username: string;
  socket: any;
  onOpenChat: (receiver: string) => void;
}

export const VerticalFeed: React.FC<VerticalFeedProps> = ({ feed, username, socket, onOpenChat }) => {
  const { showToast } = useToast();

  const handleDelete = (photoId: string) => {
    if (window.confirm('Bạn có chắc muốn gỡ bài viết này?')) {
      socket.emit('delete_photo', photoId);
      showToast('Đã gỡ bài viết');
    }
  };

  const handleReact = (photoId: string, emoji: string) => {
    socket.emit('add_reaction', { photoId, emoji });
  };

  return (
    <div className="swipe-screen">
      <div className="screen-header">Bảng Tin</div>
      <div className="feed-container">
        {feed.length === 0 ? (
          <div style={{ textAlign: 'center', color: '#a1a1aa', marginTop: 50 }}>
            Chưa có bài viết nào.<br/>Hãy sang tab Camera để gửi ảnh!
          </div>
        ) : (
          feed.map((photo) => {
            const hasReacted = photo.reactions && photo.reactions[username];
            const reactionCount = photo.reactions ? Object.keys(photo.reactions).length : 0;

            return (
              <div key={photo.id} className="feed-card">
                <div className="feed-card-header">
                  <div className="feed-avatar" style={{ background: 'linear-gradient(135deg, #00f2fe, #4facfe)' }}>
                    {photo.sender.substring(0, 1).toUpperCase()}
                  </div>
                  <div className="feed-meta">
                    <span className="feed-sender">{photo.sender}</span>
                    <span className="feed-time">{new Date(photo.created_at).toLocaleString()}</span>
                  </div>
                  {(photo.sender === username || username === 'admin') && (
                    <button className="feed-delete-btn" onClick={() => handleDelete(photo.id)}>
                      <Trash2 size={16} /> Gỡ
                    </button>
                  )}
                </div>

                <div className="feed-photo-container">
                  <img src={photo.photo_url} alt="Post" className="feed-photo" loading="lazy" />
                  {photo.caption && (
                    <div className="feed-caption">{photo.caption}</div>
                  )}
                </div>

                <div style={{ padding: '12px 16px', display: 'flex', gap: 15, background: 'rgba(0,0,0,0.2)' }}>
                  <button 
                    style={{ background: 'transparent', border: 'none', color: hasReacted ? '#ef4444' : '#fff', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6 }}
                    onClick={() => handleReact(photo.id, '❤️')}
                  >
                    <Heart size={24} fill={hasReacted ? '#ef4444' : 'none'} />
                    <span>{reactionCount > 0 ? reactionCount : ''}</span>
                  </button>
                  <button 
                    style={{ background: 'transparent', border: 'none', color: '#fff', cursor: 'pointer' }}
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
