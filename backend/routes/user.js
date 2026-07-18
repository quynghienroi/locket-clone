const express = require('express');
const router = express.Router();
const User = require('../models/User');
const authMiddleware = require('../middlewares/authMiddleware');
const broadcastFeed = require('../broadcastHelper');

router.get('/me', authMiddleware, async (req, res) => {
  try {
    const user = await User.findOne({ email: req.user.email });
    if (!user) return res.status(404).json({ error: 'User not found' });
    res.json({ success: true, points: user.points, themeColor: user.themecolor, statusNote: user.statusnote });
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

router.put('/settings', authMiddleware, async (req, res) => {
  const { themeColor, statusNote } = req.body;
  try {
    const user = await User.findOneAndUpdate(
      { email: req.user.email },
      { themecolor: themeColor, statusnote: statusNote },
      { new: true }
    );
    
    if (!user) return res.status(404).json({ error: 'User not found' });
    res.json({ success: true, themeColor: user.themecolor, statusNote: user.statusnote });
  } catch (err) {
    res.status(500).json({ error: 'Failed to update settings' });
  }
});

router.post('/note', authMiddleware, async (req, res) => {
  const { statusNote, statusMusic } = req.body;
  try {
    const user = await User.findOne({ email: req.user.email });
    if (!user) return res.status(404).json({ error: 'User not found' });
    
    let history = user.notehistory || [];
    if (statusNote || statusMusic) {
      history.push({
        id: Math.random().toString(36).substr(2, 9),
        text: statusNote || '',
        music: statusMusic || null,
        createdAt: new Date()
      });
    }
    
    user.statusnote = statusNote || '';
    user.statusmusic = statusMusic || {};
    user.notehistory = history;
    await user.save();
    
    const io = req.app.get('io');
    if (io) {
      // Pass null for supabase, broadcastFeed should be updated to not rely on it
      await broadcastFeed(null, io); 
    }
    
    res.json({ success: true, statusNote: user.statusnote, statusMusic: user.statusmusic, noteHistory: user.notehistory });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to add note' });
  }
});

router.get('/notes', authMiddleware, async (req, res) => {
  try {
    const user = await User.findOne({ email: req.user.email }).select('notehistory');
    if (!user) return res.status(404).json({ error: 'User not found' });
    res.json({ success: true, noteHistory: user.notehistory || [] });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch notes' });
  }
});

router.delete('/note/:id', authMiddleware, async (req, res) => {
  try {
    const user = await User.findOne({ email: req.user.email });
    if (!user) return res.status(404).json({ error: 'User not found' });
    
    let history = user.notehistory || [];
    history = history.filter(n => n.id !== req.params.id && n._id !== req.params.id);
    
    let newStatusNote = '';
    let newStatusMusic = {};
    if (history.length > 0) {
      const latest = history[history.length - 1];
      newStatusNote = latest.text || '';
      newStatusMusic = latest.music || {};
    }
    
    user.notehistory = history;
    user.statusnote = newStatusNote;
    user.statusmusic = newStatusMusic;
    await user.save();
    
    const io = req.app.get('io');
    if (io) {
      await broadcastFeed(null, io);
    }
    
    res.json({ success: true, statusNote: user.statusnote, statusMusic: user.statusmusic, noteHistory: user.notehistory });
  } catch (err) {
    res.status(500).json({ error: 'Failed to delete note' });
  }
});

module.exports = router;
