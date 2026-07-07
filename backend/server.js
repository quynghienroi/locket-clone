const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');
const nodemailer = require('nodemailer');
const jwt = require('jsonwebtoken');
const mongoose = require('mongoose');
const { getLinkPreview } = require('link-preview-js');
require('dotenv').config();

const User = require('./models/User');
const Photo = require('./models/Photo');
const Event = require('./models/Event');
const Repo = require('./models/Repo');

const app = express();
app.use(cors());
app.use(express.json({ limit: '10mb' }));

const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"]
  }
});

const JWT_SECRET = process.env.JWT_SECRET || 'locket_super_secret_key';

// Connect to MongoDB
if (process.env.MONGODB_URI) {
  mongoose.connect(process.env.MONGODB_URI)
    .then(() => console.log('✅ MongoDB Connected'))
    .catch(err => console.error('❌ MongoDB Connection Error:', err));
} else {
  console.log('⚠️ WARNING: MONGODB_URI not set. Application will not work properly.');
}

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

// API: Request OTP
app.post('/api/auth/request-otp', async (req, res) => {
  const { email } = req.body;
  if (!email) return res.status(400).json({ error: 'Email is required' });

  let otp = Math.floor(100000 + Math.random() * 900000).toString(); // 6 digits

  if (!process.env.GMAIL_USER || !process.env.GMAIL_PASS) {
    otp = '123456'; // Default hardcoded OTP for testing
    otpStore.set(email, { otp, expires: Date.now() + 5 * 60 * 1000 }); // 5 mins
    console.log(`[DEV MODE] OTP for ${email} is: ${otp}`);
    return res.json({ success: true, message: 'OTP logged to console (Dev Mode)' });
  }

  otpStore.set(email, { otp, expires: Date.now() + 5 * 60 * 1000 }); // 5 mins

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

// API: Verify OTP
app.post('/api/auth/verify-otp', async (req, res) => {
  const { email, otp } = req.body;
  const record = otpStore.get(email);

  if (!record || record.otp !== otp || Date.now() > record.expires) {
    return res.status(400).json({ error: 'Invalid or expired OTP' });
  }

  otpStore.delete(email);

  try {
    let user = await User.findOne({ email });
    let isNewUser = false;

    if (!user) {
      user = new User({ email });
      await user.save();
      isNewUser = true;
    }

    const token = jwt.sign({ email: user.email }, JWT_SECRET, { expiresIn: '30d' });

    res.json({ 
      success: true, 
      token, 
      isNewUser, 
      username: user.username,
      points: user.points,
      themeColor: user.themeColor,
      statusNote: user.statusNote
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Database error' });
  }
});

// API: Get current user info
app.get('/api/user/me', async (req, res) => {
  const token = req.headers.authorization?.split(' ')[1];
  if (!token) return res.status(401).json({ error: 'No token' });
  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    const user = await User.findOne({ email: decoded.email });
    if (!user) return res.status(404).json({ error: 'User not found' });
    res.json({ success: true, points: user.points, themeColor: user.themeColor, statusNote: user.statusNote });
  } catch (err) {
    res.status(401).json({ error: 'Invalid token' });
  }
});

// API: Update User Settings (Theme & Note)
app.put('/api/user/settings', async (req, res) => {
  const token = req.headers.authorization?.split(' ')[1];
  const { themeColor, statusNote } = req.body;
  if (!token) return res.status(401).json({ error: 'No token' });
  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    const user = await User.findOneAndUpdate(
      { email: decoded.email },
      { themeColor, statusNote },
      { new: true }
    );
    if (!user) return res.status(404).json({ error: 'User not found' });
    res.json({ success: true, themeColor: user.themeColor, statusNote: user.statusNote });
  } catch (err) {
    res.status(500).json({ error: 'Failed to update settings' });
  }
});

// API: Add Note to History (ÁDUUUU Chat)
app.post('/api/user/note', async (req, res) => {
  const token = req.headers.authorization?.split(' ')[1];
  const { statusNote, statusMusic } = req.body;
  if (!token) return res.status(401).json({ error: 'No token' });
  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    const user = await User.findOne({ email: decoded.email });
    if (!user) return res.status(404).json({ error: 'User not found' });
    
    user.statusNote = statusNote || '';
    user.statusMusic = statusMusic || null;
    if (statusNote || statusMusic) {
      user.noteHistory.push({
        text: statusNote || '',
        music: statusMusic || null,
        createdAt: new Date()
      });
    }
    await user.save();
    res.json({ success: true, statusNote: user.statusNote, statusMusic: user.statusMusic, noteHistory: user.noteHistory });
  } catch (err) {
    res.status(500).json({ error: 'Failed to add note' });
  }
});

// API: Get Note History
app.get('/api/user/notes', async (req, res) => {
  const token = req.headers.authorization?.split(' ')[1];
  if (!token) return res.status(401).json({ error: 'No token' });
  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    const user = await User.findOne({ email: decoded.email });
    if (!user) return res.status(404).json({ error: 'User not found' });
    res.json({ success: true, noteHistory: user.noteHistory });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch notes' });
  }
});

// API: Delete Note (Revoke)
app.delete('/api/user/note/:id', async (req, res) => {
  const token = req.headers.authorization?.split(' ')[1];
  if (!token) return res.status(401).json({ error: 'No token' });
  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    const user = await User.findOne({ email: decoded.email });
    if (!user) return res.status(404).json({ error: 'User not found' });
    
    user.noteHistory = user.noteHistory.filter(n => n._id.toString() !== req.params.id);
    
    // Update status to latest note if exists, else empty
    if (user.noteHistory.length > 0) {
      const latest = user.noteHistory[user.noteHistory.length - 1];
      user.statusNote = latest.text || '';
      user.statusMusic = latest.music || null;
    } else {
      user.statusNote = '';
      user.statusMusic = null;
    }
    
    await user.save();
    res.json({ success: true, statusNote: user.statusNote, statusMusic: user.statusMusic, noteHistory: user.noteHistory });
  } catch (err) {
    res.status(500).json({ error: 'Failed to delete note' });
  }
});

// API: Set Username
app.post('/api/auth/set-username', async (req, res) => {
  const { token, username } = req.body;
  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    
    // Check if username is taken
    const existingUser = await User.findOne({ username });
    if (existingUser && existingUser.email !== decoded.email) {
      return res.status(400).json({ error: 'Username already taken' });
    }

    const user = await User.findOneAndUpdate(
      { email: decoded.email },
      { username },
      { new: true }
    );
    
    if (!user) return res.status(404).json({ error: 'User not found' });
    
    res.json({ success: true, username: user.username });
  } catch (err) {
    res.status(401).json({ error: 'Invalid token' });
  }
});


// --- EVENT MANAGEMENT (PHASE 2) ---

// API: Get all upcoming events
app.get('/api/events', async (req, res) => {
  try {
    const events = await Event.find().sort({ date: 1 });
    res.json({ success: true, events });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch events' });
  }
});

// API: Create new event (Admin)
app.post('/api/events', async (req, res) => {
  const { title, description, date, pointsReward, formLink } = req.body;
  try {
    let thumbnailUrl = '';
    if (formLink) {
      try {
        const preview = await getLinkPreview(formLink, { timeout: 3000 });
        if (preview && preview.images && preview.images.length > 0) {
          thumbnailUrl = preview.images[0].url;
        }
      } catch (e) {
        console.error('Failed to fetch event thumbnail:', e.message);
      }
    }
    const newEvent = new Event({ title, description, date, pointsReward, formLink, thumbnailUrl });
    await newEvent.save();
    res.json({ success: true, event: newEvent });
  } catch (err) {
    res.status(500).json({ error: 'Failed to create event' });
  }
});

// API: Delete a repo
app.delete('/api/repos/:id', async (req, res) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader) return res.status(401).json({ error: 'No token' });
    const token = authHeader.split(' ')[1];
    const decoded = jwt.verify(token, JWT_SECRET);
    const user = await User.findOne({ email: decoded.email });
    
    const repo = await Repo.findById(req.params.id);
    if (!repo) return res.status(404).json({ error: 'Repo not found' });
    
    // Check if the user deleting is the sender
    if (repo.sender !== user.username) {
      return res.status(403).json({ error: 'Unauthorized' });
    }
    
    await Repo.findByIdAndDelete(req.params.id);
    res.json({ success: true, message: 'Repo deleted' });
  } catch (err) {
    res.status(500).json({ error: 'Failed to delete repo' });
  }
});

// API: Join an event
app.post('/api/events/:id/join', async (req, res) => {
  const { token } = req.body;
  const eventId = req.params.id;
  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    const user = await User.findOne({ email: decoded.email });
    if (!user || !user.username) return res.status(404).json({ error: 'User not found' });

    const event = await Event.findById(eventId);
    if (!event) return res.status(404).json({ error: 'Event not found' });

    // Check if already joined
    if (event.participants.includes(user.username)) {
      return res.status(400).json({ error: 'Already joined' });
    }

    // Add user to event participants
    event.participants.push(user.username);
    await event.save();

    // Award points and add event to user's history
    user.points += (event.pointsReward || 50);
    user.eventsJoined.push(event._id);
    await user.save();

    res.json({ success: true, message: 'Joined successfully', points: user.points, event });
  } catch (err) {
    res.status(500).json({ error: 'Failed to join event' });
  }
});

// API: Delete an event
app.delete('/api/events/:id', async (req, res) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader) return res.status(401).json({ error: 'No token' });
    const token = authHeader.split(' ')[1];
    jwt.verify(token, JWT_SECRET); // Basic verification
    
    await Event.findByIdAndDelete(req.params.id);
    res.json({ success: true, message: 'Event deleted' });
  } catch (err) {
    res.status(500).json({ error: 'Failed to delete event' });
  }
});


// --- GITHUB REPOS (PHASE 3) ---

app.get('/api/repos', async (req, res) => {
  try {
    const repos = await Repo.find().sort({ createdAt: -1 });
    res.json({ success: true, repos });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch repos' });
  }
});

app.post('/api/repos', async (req, res) => {
  const { token, url, customMessage } = req.body;
  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    const user = await User.findOne({ email: decoded.email });
    if (!user || !user.username) return res.status(404).json({ error: 'User not found' });

    let title = '';
    let description = '';
    let imageUrl = '';
    let siteName = '';
    let owner = '';
    let name = '';
    let language = '';
    let stars = 0;
    let forks = 0;
    
    // Parse domain
    let domain = '';
    try {
      const parsedUrl = new URL(url);
      domain = parsedUrl.hostname.replace('www.', '');
    } catch (e) {
      return res.status(400).json({ error: 'Invalid URL' });
    }

    try {
      const preview = await getLinkPreview(url, { timeout: 4000 });
      if (preview) {
        title = preview.title || '';
        description = preview.description || '';
        siteName = preview.siteName || domain;
        if (preview.images && preview.images.length > 0) {
          imageUrl = preview.images[0].url;
        }
      }
    } catch (e) {
      console.log("Could not fetch link preview for", url);
    }

    // If it's a GitHub link, fetch extra GitHub stats
    if (domain === 'github.com') {
      const urlParts = url.replace('https://github.com/', '').replace('http://github.com/', '').split('/');
      if (urlParts.length >= 2) {
        owner = urlParts[0];
        name = urlParts[1];
        try {
          const ghRes = await fetch(`https://api.github.com/repos/${owner}/${name}`);
          if (ghRes.ok) {
            const ghData = await ghRes.json();
            title = title || ghData.name;
            description = description || ghData.description;
            language = ghData.language;
            stars = ghData.stargazers_count;
            forks = ghData.forks_count;
            siteName = 'GitHub';
          }
        } catch (e) {
          console.log("GitHub API failed");
        }
      }
    }

    const newRepo = new Repo({
      sender: user.username,
      url,
      title,
      owner,
      name,
      description,
      customMessage: customMessage || '',
      imageUrl,
      siteName,
      domain,
      language,
      stars,
      forks
    });
    await newRepo.save();

    // Award points (+10 for sharing a repo)
    user.points += 10;
    await user.save();

    res.json({ success: true, repo: newRepo, points: user.points });
  } catch (err) {
    console.error(err);
    res.status(401).json({ error: 'Authentication failed' });
  }
});

// Socket.io Logic
io.use((socket, next) => {
  const token = socket.handshake.auth.token;
  if (!token) return next(new Error("Authentication error"));
  
  jwt.verify(token, JWT_SECRET, (err, decoded) => {
    if (err) return next(new Error("Authentication error"));
    socket.userEmail = decoded.email;
    next();
  });
});

app.get('/api/github/proxy', async (req, res) => {
  const { path } = req.query;
  if (!path) return res.status(400).json({ error: 'Missing GitHub API path' });
  
  try {
    const headers = { 'User-Agent': 'Inntech-App' };
    if (process.env.GITHUB_TOKEN) {
      headers['Authorization'] = `Bearer ${process.env.GITHUB_TOKEN}`;
    }
    
    const response = await fetch(`https://api.github.com${path}`, { headers });
    if (!response.ok) {
      return res.status(response.status).json({ error: 'GitHub API Error' });
    }
    
    const data = await response.json();
    res.json(data);
  } catch (err) {
    console.error("GitHub Proxy Error:", err);
    res.status(500).json({ error: 'Failed to fetch from GitHub' });
  }
});

app.get('/api/admin/clean-db', async (req, res) => {
  try {
    await Event.deleteMany({});
    await Repo.deleteMany({});
    await User.deleteMany({ username: { $exists: false } });
    await User.updateMany({ themeColor: '#fbbf24' }, { $set: { themeColor: '#2563eb' } });
    res.json({ success: true, message: 'Database cleaned. Photos and valid users kept.' });
  } catch (err) {
    res.status(500).json({ error: 'Failed to clean DB' });
  }
});

io.on('connection', async (socket) => {
  try {
    const user = await User.findOne({ email: socket.userEmail });
    const username = user ? user.username : 'Unknown';
    console.log(`A user connected: ${username} (${socket.userEmail})`);

    if (username) {
      socket.join(username);
      // Fetch latest 50 photos and all users for notes/colors
      const latestPhotos = await Photo.find().sort({ createdAt: -1 }).limit(50);
      const allUsers = await User.find({}, 'username statusNote themeColor');
      const userMap = {};
      allUsers.forEach(u => { userMap[u.username] = { note: u.statusNote, color: u.themeColor, music: u.statusMusic }; });
      
      // Convert to format expected by frontend
      const globalFeed = latestPhotos.map(p => ({
        id: p._id.toString(),
        sender: p.sender,
        targets: p.targets,
        photoBase64: p.photoBase64,
        caption: p.caption,
        filter: p.filter || 'none',
        reactions: p.reactions ? Object.fromEntries(p.reactions) : {},
        timestamp: p.createdAt,
        senderNote: userMap[p.sender]?.note || '',
        senderColor: userMap[p.sender]?.color || '#fbbf24', senderMusic: userMap[p.sender]?.music || null
      }));
      
      socket.emit('feed_updated', globalFeed);
    }

    socket.on('send_photo', async (data) => {
      const { targets, photoBase64, caption, filter } = data;
      
      try {
        const newPhotoDoc = new Photo({
          sender: username,
          targets,
          photoBase64,
          caption: caption || '',
          filter: filter || 'none'
        });
        await newPhotoDoc.save();

        // Award points (+5 for posting photo)
        await User.updateOne({ email: socket.userEmail }, { $inc: { points: 5 } });
        const updatedUser = await User.findOne({ email: socket.userEmail });
        socket.emit('points_updated', updatedUser.points);

        const newPhoto = {
          id: newPhotoDoc._id.toString(),
          sender: newPhotoDoc.sender,
          targets: newPhotoDoc.targets, 
          photoBase64: newPhotoDoc.photoBase64,
          caption: newPhotoDoc.caption,
          filter: newPhotoDoc.filter,
          reactions: {},
          timestamp: newPhotoDoc.createdAt,
          senderNote: updatedUser.statusNote || '',
          senderColor: updatedUser.themeColor || '#fbbf24'
        };
        
        // Fetch feed again to broadcast
        const latestPhotos = await Photo.find().sort({ createdAt: -1 }).limit(50);
        const allUsers = await User.find({}, 'username statusNote themeColor');
        const userMap = {};
        allUsers.forEach(u => { userMap[u.username] = { note: u.statusNote, color: u.themeColor, music: u.statusMusic }; });
        
        const globalFeed = latestPhotos.map(p => ({
          id: p._id.toString(),
          sender: p.sender,
          targets: p.targets,
          photoBase64: p.photoBase64,
          caption: p.caption,
          filter: p.filter || 'none',
          reactions: p.reactions ? Object.fromEntries(p.reactions) : {},
          timestamp: p.createdAt,
          senderNote: userMap[p.sender]?.note || '',
          senderColor: userMap[p.sender]?.color || '#fbbf24', senderMusic: userMap[p.sender]?.music || null
        }));

        io.emit('feed_updated', globalFeed);

        if (targets.includes('ALL')) {
          socket.broadcast.emit('receive_photo', newPhoto);
        } else {
          targets.forEach(target => {
            io.to(target).emit('receive_photo', newPhoto);
          });
        }
      } catch (err) {
        console.error("Error saving photo:", err);
      }
    });

    socket.on('delete_photo', async (photoId) => {
      try {
        const photo = await Photo.findById(photoId);
        if (photo && photo.sender === username) {
          await Photo.findByIdAndDelete(photoId);
          
          // Broadcast updated feed
          const latestPhotos = await Photo.find().sort({ createdAt: -1 }).limit(50);
          const allUsers = await User.find({}, 'username statusNote themeColor');
          const userMap = {};
          allUsers.forEach(u => { userMap[u.username] = { note: u.statusNote, color: u.themeColor, music: u.statusMusic }; });
          
          const globalFeed = latestPhotos.map(p => ({
            id: p._id.toString(),
            sender: p.sender,
            targets: p.targets,
            photoBase64: p.photoBase64,
            caption: p.caption,
            filter: p.filter || 'none',
            reactions: p.reactions ? Object.fromEntries(p.reactions) : {},
            timestamp: p.createdAt,
            senderNote: userMap[p.sender]?.note || '',
            senderColor: userMap[p.sender]?.color || '#fbbf24', senderMusic: userMap[p.sender]?.music || null
          }));

          io.emit('feed_updated', globalFeed);
        }
      } catch (err) {
        console.error("Error deleting photo:", err);
      }
    });

    socket.on('add_reaction', async (data) => {
      const { photoId, emoji } = data;
      try {
        const photo = await Photo.findById(photoId);
        if (photo) {
          if (!photo.reactions) photo.reactions = new Map();
          photo.reactions.set(username, emoji);
          await photo.save();

          // Award points (+1 for reacting)
          await User.updateOne({ email: socket.userEmail }, { $inc: { points: 1 } });
          const updatedUser = await User.findOne({ email: socket.userEmail });
          socket.emit('points_updated', updatedUser.points);

          // Broadcast updated feed
          const latestPhotos = await Photo.find().sort({ createdAt: -1 }).limit(50);
          const allUsers = await User.find({}, 'username statusNote themeColor');
          const userMap = {};
          allUsers.forEach(u => { userMap[u.username] = { note: u.statusNote, color: u.themeColor, music: u.statusMusic }; });
          
          const globalFeed = latestPhotos.map(p => ({
            id: p._id.toString(),
            sender: p.sender,
            targets: p.targets,
            photoBase64: p.photoBase64,
            caption: p.caption,
            filter: p.filter || 'none',
            reactions: p.reactions ? Object.fromEntries(p.reactions) : {},
            timestamp: p.createdAt,
            senderNote: userMap[p.sender]?.note || '',
            senderColor: userMap[p.sender]?.color || '#fbbf24', senderMusic: userMap[p.sender]?.music || null
          }));
          io.emit('feed_updated', globalFeed);
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
server.listen(PORT, () => {
  console.log(`Locket Backend listening on port ${PORT}`);
});
