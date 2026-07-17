const express = require('express');
const router = express.Router();
const supabase = require('../utils/supabase');
const authMiddleware = require('../middlewares/authMiddleware');
const { getLinkPreview } = require('link-preview-js');

// Everyone can view events
router.get('/', async (req, res) => {
  try {
    const { data: events, error } = await supabase.from('events').select('*').order('date', { ascending: true });
    res.json({ success: true, events: events || [] });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch events' });
  }
});

// Require Auth to create event
router.post('/', authMiddleware, async (req, res) => {
  const { title, description, date, formLink } = req.body;
  try {
    let cover_url = '';
    if (formLink) {
      try {
        const preview = await getLinkPreview(formLink, { timeout: 3000 });
        if (preview && preview.images && preview.images.length > 0) {
          cover_url = preview.images[0].url;
        }
      } catch (e) {}
    }
    const { data: newEvent } = await supabase.from('events').insert([{
      title, notes: description, date, cover_url, participants: [], created_by: req.user.username
    }]).select().single();
    res.json({ success: true, event: newEvent });
  } catch (err) {
    res.status(500).json({ error: 'Failed to create event' });
  }
});

// Require Auth + Ownership to delete event
router.delete('/:id', authMiddleware, async (req, res) => {
  try {
    const { data: event } = await supabase.from('events').select('*').eq('id', req.params.id).single();
    if (!event) return res.status(404).json({ error: 'Event not found' });
    
    // Allow if they created it OR if they are the admin
    if (event.created_by !== req.user.username && req.user.username !== 'admin') {
      return res.status(403).json({ error: 'Unauthorized to delete this event' });
    }

    await supabase.from('events').delete().eq('id', req.params.id);
    res.json({ success: true, message: 'Event deleted' });
  } catch (err) {
    res.status(500).json({ error: 'Failed to delete event' });
  }
});

router.post('/:id/join', authMiddleware, async (req, res) => {
  const eventId = req.params.id;
  try {
    const { data: user } = await supabase.from('users').select('*').eq('email', req.user.email).single();
    if (!user) return res.status(404).json({ error: 'User not found' });

    const { data: event } = await supabase.from('events').select('*').eq('id', eventId).single();
    if (!event) return res.status(404).json({ error: 'Event not found' });

    let participants = event.participants || [];
    if (participants.includes(user.username)) {
      return res.status(400).json({ error: 'Already joined' });
    }

    participants.push(user.username);
    await supabase.from('events').update({ participants }).eq('id', eventId);

    res.json({ success: true, message: 'Joined successfully', points: 0, event: { ...event, participants } });
  } catch (err) {
    res.status(500).json({ error: 'Failed to join event' });
  }
});

module.exports = router;
