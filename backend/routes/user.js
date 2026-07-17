const express = require('express');
const router = express.Router();
const supabase = require('../utils/supabase');
const authMiddleware = require('../middlewares/authMiddleware');
const broadcastFeed = require('../broadcastHelper');

router.get('/me', authMiddleware, async (req, res) => {
  try {
    const { data: user, error } = await supabase.from('users').select('*').eq('email', req.user.email).maybeSingle();
    if (error || !user) return res.status(404).json({ error: 'User not found' });
    res.json({ success: true, points: 0, themeColor: user.themecolor, statusNote: user.statusnote });
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

router.put('/settings', authMiddleware, async (req, res) => {
  const { themeColor, statusNote } = req.body;
  try {
    const { data: user, error } = await supabase.from('users').update({
      themecolor: themeColor,
      statusnote: statusNote
    }).eq('email', req.user.email).select().single();
    
    if (error || !user) return res.status(404).json({ error: 'User not found' });
    res.json({ success: true, themeColor: user.themecolor, statusNote: user.statusnote });
  } catch (err) {
    res.status(500).json({ error: 'Failed to update settings' });
  }
});

router.post('/note', authMiddleware, async (req, res) => {
  const { statusNote, statusMusic } = req.body;
  try {
    const { data: user, error } = await supabase.from('users').select('*').eq('email', req.user.email).single();
    if (error || !user) return res.status(404).json({ error: 'User not found' });
    
    let history = user.notehistory || [];
    if (statusNote || statusMusic) {
      history.push({
        id: Math.random().toString(36).substr(2, 9),
        text: statusNote || '',
        music: statusMusic || null,
        createdAt: new Date()
      });
    }
    
    const { data: updatedUser, error: updateError } = await supabase.from('users').update({
      statusnote: statusNote || '',
      statusmusic: statusMusic || {},
      notehistory: history
    }).eq('email', req.user.email).select().single();

    if (updateError) throw updateError;
    
    const io = req.app.get('io');
    if (io) {
      await broadcastFeed(supabase, io);
    }
    
    res.json({ success: true, statusNote: updatedUser.statusnote, statusMusic: updatedUser.statusmusic, noteHistory: updatedUser.notehistory });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to add note' });
  }
});

router.get('/notes', authMiddleware, async (req, res) => {
  try {
    const { data: user, error } = await supabase.from('users').select('notehistory').eq('email', req.user.email).single();
    if (error || !user) return res.status(404).json({ error: 'User not found' });
    res.json({ success: true, noteHistory: user.notehistory || [] });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch notes' });
  }
});

router.delete('/note/:id', authMiddleware, async (req, res) => {
  try {
    const { data: user, error } = await supabase.from('users').select('*').eq('email', req.user.email).single();
    if (error || !user) return res.status(404).json({ error: 'User not found' });
    
    let history = user.notehistory || [];
    history = history.filter(n => n.id !== req.params.id && n._id !== req.params.id);
    
    let newStatusNote = '';
    let newStatusMusic = {};
    if (history.length > 0) {
      const latest = history[history.length - 1];
      newStatusNote = latest.text || '';
      newStatusMusic = latest.music || {};
    }
    
    const { data: updatedUser } = await supabase.from('users').update({
      notehistory: history,
      statusnote: newStatusNote,
      statusmusic: newStatusMusic
    }).eq('email', req.user.email).select().single();
    
    const io = req.app.get('io');
    if (io) {
      await broadcastFeed(supabase, io);
    }
    
    res.json({ success: true, statusNote: updatedUser.statusnote, statusMusic: updatedUser.statusmusic, noteHistory: updatedUser.notehistory });
  } catch (err) {
    res.status(500).json({ error: 'Failed to delete note' });
  }
});

module.exports = router;
