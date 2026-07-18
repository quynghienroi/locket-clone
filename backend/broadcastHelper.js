const Photo = require('./models/Photo');
const User = require('./models/User');

const broadcastFeed = async (supabase, io) => {
  try {
    const latestPhotos = await Photo.find().sort({ createdAt: -1 }).limit(50);
    const allUsers = await User.find().select('username statusnote themecolor statusmusic');

    const userMap = {};
    if (allUsers) {
      allUsers.forEach(u => { 
        let music = u.statusmusic;
        if (music && !music.title && !music.previewUrl) {
          music = null;
        }
        userMap[u.username] = { note: u.statusnote, color: u.themecolor, music }; 
      });
    }
    
    const globalFeed = (latestPhotos || []).map(p => {
      let reactionsObj = p.reactions ? Object.fromEntries(p.reactions) : {};
      
      return {
        id: p._id,
        sender: p.sender,
        targets: p.targets || [],
        photoBase64: p.photoUrl, // Send as photoBase64 to maintain compatibility with frontend
        caption: p.caption || '',
        filter: p.filter || 'none',
        reactions: reactionsObj,
        timestamp: p.createdAt,
        senderNote: userMap[p.sender]?.note || '',
        senderColor: userMap[p.sender]?.color || '#fbbf24', 
        senderMusic: userMap[p.sender]?.music || null
      };
    });

    io.emit('feed_updated', globalFeed);
  } catch (err) {
    console.error("broadcastFeed error:", err);
  }
};
module.exports = broadcastFeed;
