const broadcastFeed = async (supabase, io) => {
  try {
    const { data: latestPhotos, error: photoError } = await supabase.from('photos').select('*').order('created_at', { ascending: false }).limit(50);
    if (photoError) throw photoError;

    const { data: allUsers, error: userError } = await supabase.from('users').select('username, statusnote, themecolor, statusmusic');
    if (userError) throw userError;

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
      let reactionsObj = p.reactions || {};
      
      return {
        id: p.id,
        sender: p.sender,
        targets: p.targets || [],
        photoBase64: p.photo_url, // Maps to the new storage URL
        caption: p.caption || '',
        filter: p.filter || 'none',
        reactions: reactionsObj,
        timestamp: p.created_at,
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
