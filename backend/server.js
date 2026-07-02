const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');
const nodemailer = require('nodemailer');
const jwt = require('jsonwebtoken');
require('dotenv').config();

const app = express();
app.use(cors());
app.use(express.json());

const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"]
  }
});

// Mock Database (Replace with MongoDB later)
let globalFeed = [];
let photoIdCounter = 1;
let users = []; // { email, username }
const otpStore = new Map(); // email -> { otp, expires }

const JWT_SECRET = process.env.JWT_SECRET || 'locket_super_secret_key';

// Nodemailer Transporter
const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.GMAIL_USER, // e.g. your_email@gmail.com
    pass: process.env.GMAIL_PASS  // Gmail App Password
  }
});

// API: Request OTP
app.post('/api/auth/request-otp', async (req, res) => {
  const { email } = req.body;
  if (!email) return res.status(400).json({ error: 'Email is required' });

  const otp = Math.floor(100000 + Math.random() * 900000).toString(); // 6 digits
  otpStore.set(email, { otp, expires: Date.now() + 5 * 60 * 1000 }); // 5 mins

  // If GMAIL_USER is not set, just print to console for testing
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
app.post('/api/auth/verify-otp', (req, res) => {
  const { email, otp } = req.body;
  const record = otpStore.get(email);

  if (!record || record.otp !== otp || Date.now() > record.expires) {
    return res.status(400).json({ error: 'Invalid or expired OTP' });
  }

  otpStore.delete(email);

  let user = users.find(u => u.email === email);
  let isNewUser = false;

  if (!user) {
    user = { email, username: null }; // Username to be set later
    users.push(user);
    isNewUser = true;
  }

  const token = jwt.sign({ email: user.email }, JWT_SECRET, { expiresIn: '30d' });

  res.json({ 
    success: true, 
    token, 
    isNewUser, 
    username: user.username 
  });
});

// API: Set Username
app.post('/api/auth/set-username', (req, res) => {
  const { token, username } = req.body;
  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    const user = users.find(u => u.email === decoded.email);
    if (!user) return res.status(404).json({ error: 'User not found' });
    
    // Check if username is taken
    if (users.some(u => u.username === username)) {
      return res.status(400).json({ error: 'Username already taken' });
    }

    user.username = username;
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

io.on('connection', (socket) => {
  const user = users.find(u => u.email === socket.userEmail);
  const username = user ? user.username : 'Unknown';
  console.log(`A user connected: ${username} (${socket.userEmail})`);

  if (username) {
    socket.join(username);
    socket.emit('feed_updated', globalFeed);
  }

  socket.on('send_photo', (data) => {
    const { targets, photoBase64, caption } = data;
    
    const newPhoto = {
      id: photoIdCounter++,
      sender: username,
      targets, 
      photoBase64,
      caption: caption || '',
      reactions: {},
      timestamp: new Date().toISOString()
    };
    
    globalFeed.unshift(newPhoto);
    if (globalFeed.length > 50) globalFeed.pop();

    io.emit('feed_updated', globalFeed);

    if (targets.includes('ALL')) {
      socket.broadcast.emit('receive_photo', newPhoto);
    } else {
      targets.forEach(target => {
        io.to(target).emit('receive_photo', newPhoto);
      });
    }
  });

  socket.on('add_reaction', (data) => {
    const { photoId, emoji } = data;
    const photo = globalFeed.find(p => p.id === photoId);
    if (photo) {
      photo.reactions[username] = emoji;
      io.emit('feed_updated', globalFeed);
    }
  });

  socket.on('disconnect', () => {
    console.log(`User disconnected: ${username}`);
  });
});

const PORT = process.env.PORT || 3001;
server.listen(PORT, () => {
  console.log(`Locket Backend listening on port ${PORT}`);
});
