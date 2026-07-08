const broadcastFeed = async (Photo, User, io) => {
  const latestPhotos = await Photo.find().sort({ createdAt: -1 }).limit(50);
  const allUsers = await User.find({}, 'username statusNote themeColor statusMusic');
  const userMap = {};
  allUsers.forEach(u => { 
    let music = u.statusMusic;
    // Fix: Mongoose might return an empty object {} for statusMusic if fields are undefined
    if (music && !music.title && !music.previewUrl) {
      music = null;
    }
    userMap[u.username] = { note: u.statusNote, color: u.themeColor, music }; 
  });
  
  try {
    const globalFeed = latestPhotos.map(p => {
      let reactionsObj = {};
      if (p.reactions) {
        if (p.reactions instanceof Map) {
          reactionsObj = Object.fromEntries(p.reactions);
        } else {
          reactionsObj = p.reactions;
        }
      }
      return {
        id: p._id.toString(),
        sender: p.sender,
        targets: p.targets,
        photoBase64: p.photoBase64,
        caption: p.caption,
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
