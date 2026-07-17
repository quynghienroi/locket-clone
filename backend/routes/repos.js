const express = require('express');
const router = express.Router();
const supabase = require('../utils/supabase');
const authMiddleware = require('../middlewares/authMiddleware');
const { getLinkPreview } = require('link-preview-js');

router.get('/', async (req, res) => {
  try {
    const { data: repos } = await supabase.from('repos').select('*').order('created_at', { ascending: false });
    res.json({ success: true, repos: repos || [] });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch repos' });
  }
});

router.post('/', authMiddleware, async (req, res) => {
  const { url, customMessage } = req.body;
  try {
    const { data: user } = await supabase.from('users').select('*').eq('email', req.user.email).single();
    if (!user) return res.status(404).json({ error: 'User not found' });

    let title = '';
    let description = '';
    let imageUrl = '';
    
    try {
      const preview = await getLinkPreview(url, { timeout: 4000 });
      if (preview) {
        title = preview.title || '';
        description = preview.description || customMessage || '';
        if (preview.images && preview.images.length > 0) {
          imageUrl = preview.images[0].url;
        }
      }
    } catch (e) {}

    const { data: newRepo } = await supabase.from('repos').insert([{
      created_by: user.username,
      url,
      title,
      description,
      preview_image: imageUrl
    }]).select().single();

    res.json({ success: true, repo: newRepo, points: 0 });
  } catch (err) {
    res.status(401).json({ error: 'Authentication failed' });
  }
});

router.delete('/:id', authMiddleware, async (req, res) => {
  try {
    const { data: user } = await supabase.from('users').select('*').eq('email', req.user.email).single();
    
    const { data: repo } = await supabase.from('repos').select('*').eq('id', req.params.id).single();
    if (!repo) return res.status(404).json({ error: 'Repo not found' });
    
    if (repo.created_by !== user.username && user.username !== 'admin') {
      return res.status(403).json({ error: 'Unauthorized' });
    }
    
    await supabase.from('repos').delete().eq('id', req.params.id);
    res.json({ success: true, message: 'Repo deleted' });
  } catch (err) {
    res.status(500).json({ error: 'Failed to delete repo' });
  }
});

module.exports = router;
