const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');
const nodemailer = require('nodemailer');
const jwt = require('jsonwebtoken');
const mongoose = require('mongoose');
require('dotenv').config();

const User = require('./models/User');
const Photo = require('./models/Photo');

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

  const otp = Math.floor(100000 + Math.random() * 900000).toString(); // 6 digits
  otpStore.set(email, { otp, expires: Date.now() + 5 * 60 * 1000 }); // 5 mins

  if (!process.env.GMAIL_USER || !process.env.GMAIL_PASS) {
    console.log(`[DEV MODE] OTP for ${email} is: ${otp}`);
    return res.json({ success: true, message: 'OTP logged to console (Dev Mode)' });
  }

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
      username: user.username 
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Database error' });
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

io.on('connection', async (socket) => {
  try {
    const user = await User.findOne({ email: socket.userEmail });
    const username = user ? user.username : 'Unknown';
    console.log(`A user connected: ${username} (${socket.userEmail})`);

    if (username) {
      socket.join(username);
      // Fetch latest 50 photos
      const latestPhotos = await Photo.find().sort({ createdAt: -1 }).limit(50);
      
      // Convert to format expected by frontend
      const globalFeed = latestPhotos.map(p => ({
        id: p._id.toString(),
        sender: p.sender,
        targets: p.targets,
        photoBase64: p.photoBase64,
        caption: p.caption,
        reactions: p.reactions ? Object.fromEntries(p.reactions) : {},
        timestamp: p.createdAt
      }));
      
      socket.emit('feed_updated', globalFeed);
    }

    socket.on('send_photo', async (data) => {
      const { targets, photoBase64, caption } = data;
      
      try {
        const newPhotoDoc = new Photo({
          sender: username,
          targets,
          photoBase64,
          caption: caption || ''
        });
        await newPhotoDoc.save();

        // Award points (+5 for posting photo)
        await User.updateOne({ email: socket.userEmail }, { $inc: { points: 5 } });

        const newPhoto = {
          id: newPhotoDoc._id.toString(),
          sender: newPhotoDoc.sender,
          targets: newPhotoDoc.targets, 
          photoBase64: newPhotoDoc.photoBase64,
          caption: newPhotoDoc.caption,
          reactions: {},
          timestamp: newPhotoDoc.createdAt
        };
        
        // Fetch feed again to broadcast
        const latestPhotos = await Photo.find().sort({ createdAt: -1 }).limit(50);
        const globalFeed = latestPhotos.map(p => ({
          id: p._id.toString(),
          sender: p.sender,
          targets: p.targets,
          photoBase64: p.photoBase64,
          caption: p.caption,
          reactions: p.reactions ? Object.fromEntries(p.reactions) : {},
          timestamp: p.createdAt
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

          // Broadcast updated feed
          const latestPhotos = await Photo.find().sort({ createdAt: -1 }).limit(50);
          const globalFeed = latestPhotos.map(p => ({
            id: p._id.toString(),
            sender: p.sender,
            targets: p.targets,
            photoBase64: p.photoBase64,
            caption: p.caption,
            reactions: p.reactions ? Object.fromEntries(p.reactions) : {},
            timestamp: p.createdAt
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
