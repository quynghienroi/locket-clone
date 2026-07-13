import { useState } from 'react';
import '../Landscape.css';

export const LandscapeFeed = ({ feed, themeColor }: { feed: any[], userName: string | null, themeColor: string, onReaction: any, onDelete: any }) => {
  const [selectedIndex, setSelectedIndex] = useState(0);
  
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
             <span className="landscape-sender-name">{currentPhoto.sender}</span>
           </div>
           {currentPhoto.caption && <div className="landscape-caption">{currentPhoto.caption}</div>}
        </div>
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
