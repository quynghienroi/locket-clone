const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');
const nodemailer = require('nodemailer');
const jwt = require('jsonwebtoken');
const { getLinkPreview } = require('link-preview-js');
require('dotenv').config();

const { createClient } = require('@supabase/supabase-js');
const broadcastFeed = require('./broadcastHelper');

const app = express();
app.use(cors());
app.use(express.json({ limit: '10mb' }));

const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"]
  },
  maxHttpBufferSize: 1e8 // 100 MB
});

const JWT_SECRET = process.env.JWT_SECRET || 'locket_super_secret_key';
const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_KEY);

console.log('✅ Supabase initialized');

// Temporary in-memory OTP store
const otpStore = new Map(); // email -> { otp, expires }

// Nodemailer Transporter
const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.GMAIL_USER, 
    pass: process.env.GMAIL_PASS  
  }
});

app.post('/api/auth/request-otp', async (req, res) => {
  const { email } = req.body;
  if (!email) return res.status(400).json({ error: 'Email is required' });

  let otp = Math.floor(100000 + Math.random() * 900000).toString();

  if (!process.env.GMAIL_USER || !process.env.GMAIL_PASS) {
    otp = '123456';
    otpStore.set(email, { otp, expires: Date.now() + 5 * 60 * 1000 });
    console.log(`[DEV MODE] OTP for ${email} is: ${otp}`);
    return res.json({ success: true, message: 'OTP logged to console (Dev Mode)' });
  }

  otpStore.set(email, { otp, expires: Date.now() + 5 * 60 * 1000 });

  try {
    await transporter.sendMail({
      from: `"Locket Web" <${process.env.GMAIL_USER}>`,
      to: email,
      subject: "Your Locket Verification Code",
      text: `Your Locket verification code is: ${otp}. It expires in 5 minutes.`,
      html: `<h2>Welcome to Locket</h2><p>Your verification code is: <strong>${otp}</strong></p>`
    });
    res.json({ success: true, message: 'OTP sent to email' });
  } catch (error) {
    console.error('Error sending email:', error);
    res.status(500).json({ error: 'Failed to send OTP email' });
  }
});

app.post('/api/auth/verify-otp', async (req, res) => {
  const { email, otp } = req.body;
  const record = otpStore.get(email);

  if (!record || record.otp !== otp || Date.now() > record.expires) {
    return res.status(400).json({ error: 'Invalid or expired OTP' });
  }

  otpStore.delete(email);

  try {
    let { data: user, error } = await supabase.from('users').select('*').eq('email', email).maybeSingle();
    let isNewUser = false;

    if (!user) {
      const { data: newUser, error: insertError } = await supabase.from('users').insert([{ 
        email, 
        username: 'user_' + Math.random().toString(36).substring(2, 8),
        password: 'otp_auth'
      }]).select().single();
      if (insertError) throw insertError;
      user = newUser;
      isNewUser = true;
    }

    const token = jwt.sign({ email: user.email }, JWT_SECRET, { expiresIn: '30d' });

    res.json({ 
      success: true, 
      token, 
      isNewUser, 
      username: user.username,
      points: 0,
      themeColor: user.themecolor,
      statusNote: user.statusnote
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Database error' });
  }
});

app.get('/api/user/me', async (req, res) => {
  const token = req.headers.authorization?.split(' ')[1];
  if (!token) return res.status(401).json({ error: 'No token' });
  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    const { data: user, error } = await supabase.from('users').select('*').eq('email', decoded.email).maybeSingle();
    if (error || !user) return res.status(404).json({ error: 'User not found' });
    res.json({ success: true, points: 0, themeColor: user.themecolor, statusNote: user.statusnote });
  } catch (err) {
    res.status(401).json({ error: 'Invalid token' });
  }
});

app.put('/api/user/settings', async (req, res) => {
  const token = req.headers.authorization?.split(' ')[1];
  const { themeColor, statusNote } = req.body;
  if (!token) return res.status(401).json({ error: 'No token' });
  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    const { data: user, error } = await supabase.from('users').update({
      themecolor: themeColor,
      statusnote: statusNote
    }).eq('email', decoded.email).select().single();
    
    if (error || !user) return res.status(404).json({ error: 'User not found' });
    res.json({ success: true, themeColor: user.themecolor, statusNote: user.statusnote });
  } catch (err) {
    res.status(500).json({ error: 'Failed to update settings' });
  }
});

app.post('/api/user/note', async (req, res) => {
  const token = req.headers.authorization?.split(' ')[1];
  const { statusNote, statusMusic } = req.body;
  if (!token) return res.status(401).json({ error: 'No token' });
  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    const { data: user, error } = await supabase.from('users').select('*').eq('email', decoded.email).single();
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
    }).eq('email', decoded.email).select().single();

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

app.get('/api/user/notes', async (req, res) => {
  const token = req.headers.authorization?.split(' ')[1];
  if (!token) return res.status(401).json({ error: 'No token' });
  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    const { data: user, error } = await supabase.from('users').select('notehistory').eq('email', decoded.email).single();
    if (error || !user) return res.status(404).json({ error: 'User not found' });
    res.json({ success: true, noteHistory: user.notehistory || [] });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch notes' });
  }
});

app.delete('/api/user/note/:id', async (req, res) => {
  const token = req.headers.authorization?.split(' ')[1];
  if (!token) return res.status(401).json({ error: 'No token' });
  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    const { data: user, error } = await supabase.from('users').select('*').eq('email', decoded.email).single();
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
    }).eq('email', decoded.email).select().single();
    
    const io = req.app.get('io');
    if (io) {
      await broadcastFeed(supabase, io);
    }
    
    res.json({ success: true, statusNote: updatedUser.statusnote, statusMusic: updatedUser.statusmusic, noteHistory: updatedUser.notehistory });
  } catch (err) {
    res.status(500).json({ error: 'Failed to delete note' });
  }
});

app.post('/api/auth/set-username', async (req, res) => {
  const { token, username } = req.body;
  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    const { data: existingUser } = await supabase.from('users').select('*').eq('username', username).maybeSingle();
    if (existingUser && existingUser.email !== decoded.email) {
      return res.status(400).json({ error: 'Username already taken' });
    }

    const { data: user, error } = await supabase.from('users').update({ username }).eq('email', decoded.email).select().single();
    if (error || !user) return res.status(404).json({ error: 'User not found' });
    
    res.json({ success: true, username: user.username });
  } catch (err) {
    res.status(401).json({ error: 'Invalid token' });
  }
});

// EVENTS
app.get('/api/events', async (req, res) => {
  try {
    const { data: events, error } = await supabase.from('events').select('*').order('date', { ascending: true });
    res.json({ success: true, events: events || [] });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch events' });
  }
});

app.post('/api/events', async (req, res) => {
  const { title, description, date, pointsReward, formLink } = req.body;
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
      title, notes: description, date, cover_url, participants: []
    }]).select().single();
    res.json({ success: true, event: newEvent });
  } catch (err) {
    res.status(500).json({ error: 'Failed to create event' });
  }
});

app.delete('/api/events/:id', async (req, res) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader) return res.status(401).json({ error: 'No token' });
    const token = authHeader.split(' ')[1];
    jwt.verify(token, JWT_SECRET); 
    await supabase.from('events').delete().eq('id', req.params.id);
    res.json({ success: true, message: 'Event deleted' });
  } catch (err) {
    res.status(500).json({ error: 'Failed to delete event' });
  }
});

app.post('/api/events/:id/join', async (req, res) => {
  const { token } = req.body;
  const eventId = req.params.id;
  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    const { data: user } = await supabase.from('users').select('*').eq('email', decoded.email).single();
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

// REPOS
app.get('/api/repos', async (req, res) => {
  try {
    const { data: repos } = await supabase.from('repos').select('*').order('created_at', { ascending: false });
    res.json({ success: true, repos: repos || [] });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch repos' });
  }
});

app.post('/api/repos', async (req, res) => {
  const { token, url, customMessage } = req.body;
  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    const { data: user } = await supabase.from('users').select('*').eq('email', decoded.email).single();
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

app.delete('/api/repos/:id', async (req, res) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader) return res.status(401).json({ error: 'No token' });
    const token = authHeader.split(' ')[1];
    const decoded = jwt.verify(token, JWT_SECRET);
    const { data: user } = await supabase.from('users').select('*').eq('email', decoded.email).single();
    
    const { data: repo } = await supabase.from('repos').select('*').eq('id', req.params.id).single();
    if (!repo) return res.status(404).json({ error: 'Repo not found' });
    
    if (repo.created_by !== user.username) {
      return res.status(403).json({ error: 'Unauthorized' });
    }
    
    await supabase.from('repos').delete().eq('id', req.params.id);
    res.json({ success: true, message: 'Repo deleted' });
  } catch (err) {
    res.status(500).json({ error: 'Failed to delete repo' });
  }
});

app.get('/api/github/proxy', async (req, res) => {
  const { path } = req.query;
  if (!path) return res.status(400).json({ error: 'Missing GitHub API path' });
  try {
    const headers = { 'User-Agent': 'Inntech-App' };
    if (process.env.GITHUB_TOKEN) headers['Authorization'] = `Bearer ${process.env.GITHUB_TOKEN}`;
    const response = await fetch(`https://api.github.com${path}`, { headers });
    const data = await response.json();
    res.json(data);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch from GitHub' });
  }
});

app.get('/api/admin/clean-db', async (req, res) => {
  res.json({ success: true, message: 'Use Supabase dashboard for admin tasks.' });
});

io.use((socket, next) => {
  const token = socket.handshake.auth.token;
  if (!token) return next(new Error("Authentication error"));
  jwt.verify(token, JWT_SECRET, (err, decoded) => {
    if (err) return next(new Error("Authentication error"));
    socket.userEmail = decoded.email;
    next();
  });
});

io.on('connection', async (socket) => {
  try {
    const { data: user } = await supabase.from('users').select('username').eq('email', socket.userEmail).maybeSingle();
    const username = user ? user.username : 'Unknown';
    console.log(`A user connected: ${username}`);

    if (username !== 'Unknown') {
      socket.join(username);
      await broadcastFeed(supabase, io);
    }

    socket.on('send_photo', async (data) => {
      const { targets, photoBase64, caption, filter } = data;
      try {
        let photo_url = '';
        if (photoBase64) {
          const base64Data = photoBase64.replace(/^data:image\/\w+;base64,/, "");
          const buffer = Buffer.from(base64Data, 'base64');
          const fileName = `${username}_${Date.now()}.jpg`;
          
          const { data: uploadData, error: uploadError } = await supabase.storage.from('photos').upload(fileName, buffer, { contentType: 'image/jpeg' });
          if (uploadError) throw uploadError;
          
          const { data: publicUrlData } = supabase.storage.from('photos').getPublicUrl(fileName);
          photo_url = publicUrlData.publicUrl;
        }

        const { data: newPhotoDoc, error: insertError } = await supabase.from('photos').insert([{
          sender: username,
          targets: targets || [],
          photo_url: photo_url,
          caption: caption || '',
          filter: filter || 'none',
          reactions: {}
        }]).select().single();
        if (insertError) throw insertError;

        await broadcastFeed(supabase, io);

        // We only fetch feed for sender inside broadcastFeed, but let's also emit directly to save time for others
      } catch (err) {
        console.error("Error saving photo:", err);
      }
    });

    socket.on('delete_photo', async (photoId) => {
      try {
        const { data: photo } = await supabase.from('photos').select('*').eq('id', photoId).single();
        if (photo && photo.sender === username) {
          await supabase.from('photos').delete().eq('id', photoId);
          await broadcastFeed(supabase, io);
        }
      } catch (err) {
        console.error("Error deleting photo:", err);
      }
    });

    socket.on('add_reaction', async (data) => {
      const { photoId, emoji } = data;
      try {
        const { data: photo } = await supabase.from('photos').select('*').eq('id', photoId).single();
        if (photo) {
          const reactions = photo.reactions || {};
          reactions[username] = emoji;
          await supabase.from('photos').update({ reactions }).eq('id', photoId);
          await broadcastFeed(supabase, io);
        }
      } catch (err) {
        console.error("Error adding reaction:", err);
      }
    });

    socket.on('disconnect', () => {
      console.log(`User disconnected: ${username}`);
    });
  } catch (err) {
    console.error("Connection handler error:", err);
  }
});

const PORT = process.env.PORT || 3001;
app.set('io', io);
server.listen(PORT, () => {
  console.log(`Locket Backend listening on port ${PORT}`);
});
