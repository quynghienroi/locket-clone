import { useState } from 'react';
import { MoreHorizontal } from 'lucide-react';
import '../Landscape.css';

export const LandscapeFeed = ({ feed, userName, themeColor, onReaction, onDelete }: { feed: any[], userName: string | null, themeColor: string, onReaction: any, onDelete: any }) => {
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [showKebab, setShowKebab] = useState(false);
  
  const handleWheel = (e: React.WheelEvent) => {
    if (e.deltaY > 0) {
      setSelectedIndex(prev => Math.min(prev + 1, feed.length - 1));
    } else if (e.deltaY < 0) {
      setSelectedIndex(prev => Math.max(prev - 1, 0));
    }
  };

  let touchStartY = 0;
  const handleTouchStart = (e: React.TouchEvent) => {
    touchStartY = e.touches[0].clientY;
  };
  
  const handleTouchMove = (e: React.TouchEvent) => {
    if (!touchStartY) return;
    const touchEndY = e.touches[0].clientY;
    const diff = touchStartY - touchEndY;
    if (Math.abs(diff) > 50) {
      if (diff > 0) setSelectedIndex(prev => Math.min(prev + 1, feed.length - 1));
      else setSelectedIndex(prev => Math.max(prev - 1, 0));
      touchStartY = touchEndY; // Reset for continuous scroll
    }
  };

  if (feed.length === 0) return <div className="landscape-feed-empty">No photos yet.</div>;
  const currentPhoto = feed[selectedIndex];

  return (
    <div 
      className="landscape-feed-container" 
      onWheel={handleWheel}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
    >
      <div className="landscape-main-display">
        <img src={currentPhoto.photoBase64} alt="main" className="landscape-main-img" />
        <div className="landscape-main-overlay">
           <div className="landscape-sender-info">
             <div className="landscape-avatar" style={{backgroundColor: themeColor}}>{currentPhoto.sender.charAt(0).toUpperCase()}</div>
             <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end' }}>
               <span className="landscape-sender-name">{currentPhoto.sender}</span>
               {currentPhoto.senderNote && <span style={{ fontSize: '0.8rem', color: 'rgba(255,255,255,0.7)' }}>{currentPhoto.senderNote}</span>}
               {currentPhoto.senderMusic && (
                 <div style={{ fontSize: '0.75rem', fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '4px', background: 'rgba(0,0,0,0.5)', padding: '2px 8px', borderRadius: '10px', marginTop: '4px' }}>
                   <span>🎵</span>
                   <span>{currentPhoto.senderMusic.title}</span>
                 </div>
               )}
             </div>
           </div>
           {currentPhoto.caption && <div className="landscape-caption">{currentPhoto.caption}</div>}
        </div>

        <div className="landscape-reactions" style={{ position: 'absolute', bottom: '30px', left: '40px', zIndex: 10, display: 'flex', gap: '10px' }}>
          {['❤️', '🔥', '😂', '😢', '😮'].map(emoji => (
            <button
              key={emoji}
              onClick={() => onReaction(currentPhoto.id, emoji)}
              style={{ background: 'rgba(0,0,0,0.5)', border: 'none', fontSize: '1.5rem', borderRadius: '50%', width: '40px', height: '40px', cursor: 'pointer', transition: 'transform 0.2s' }}
              onMouseOver={(e) => e.currentTarget.style.transform = 'scale(1.2)'}
              onMouseOut={(e) => e.currentTarget.style.transform = 'scale(1)'}
            >
              {emoji}
            </button>
          ))}
        </div>

        {userName === currentPhoto.sender && (
          <div className="landscape-kebab" style={{ position: 'absolute', top: '30px', right: '40px', zIndex: 10 }}>
            <button 
              onClick={() => setShowKebab(!showKebab)} 
              style={{ background: 'rgba(0,0,0,0.5)', border: 'none', color: 'white', borderRadius: '50%', width: '40px', height: '40px', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}
            >
              <MoreHorizontal size={24} />
            </button>
            {showKebab && (
              <div style={{ position: 'absolute', top: '50px', right: '0', background: 'white', borderRadius: '12px', padding: '10px', boxShadow: '0 4px 12px rgba(0,0,0,0.3)', width: '120px' }}>
                <button 
                  onClick={() => {
                    onDelete(currentPhoto);
                    setShowKebab(false);
                  }}
                  style={{ width: '100%', padding: '8px', border: 'none', background: '#fee2e2', color: '#dc2626', borderRadius: '8px', cursor: 'pointer', fontWeight: 'bold' }}
                >
                  Gỡ bài
                </button>
              </div>
            )}
          </div>
        )}
      </div>
      
      <div className="landscape-rotary-dial">
        {feed.map((photo: any, i: number) => {
          const diff = i - selectedIndex;
          // Math for rotary 3D effect on a vertical wheel on the left side
          const angle = diff * 25; // degrees
          const zOffset = Math.abs(diff) * -50;
          const scale = 1 - Math.abs(diff) * 0.15;
          const opacity = 1 - Math.abs(diff) * 0.3;
          
          if (Math.abs(diff) > 4) return null; // Only render nearby items
          
          return (
            <div 
              key={photo.id} 
              className={`rotary-item ${diff === 0 ? 'active' : ''}`}
              style={{
                transform: `rotateX(${angle}deg) translateZ(${zOffset}px) scale(${scale})`,
                opacity: opacity,
                zIndex: 100 - Math.abs(diff)
              }}
              onClick={() => setSelectedIndex(i)}
            >
              <img src={photo.photoBase64} alt="thumbnail" />
            </div>
          )
        })}
      </div>
    </div>
  );
};
