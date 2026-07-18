const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');
const mongoose = require('mongoose');
require('dotenv').config();

const authRoutes = require('./routes/auth');
const userRoutes = require('./routes/user');
const eventRoutes = require('./routes/events');
const repoRoutes = require('./routes/repos');
const uploadRoutes = require('./routes/upload');
const setupSockets = require('./sockets');

const app = express();

// Middlewares
app.use(cors());
app.use(express.json({ limit: '10mb' }));

// Connect to MongoDB
if (process.env.MONGODB_URI) {
  mongoose.connect(process.env.MONGODB_URI)
    .then(() => console.log('✅ MongoDB Connected'))
    .catch(err => console.error('❌ MongoDB Connection Error:', err));
}

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/user', userRoutes);
app.use('/api/events', eventRoutes);
app.use('/api/repos', repoRoutes);
app.use('/api/upload', uploadRoutes);

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', message: 'Backend is running.' });
});

// Admin endpoint (placeholder)
app.get('/api/admin/clean-db', (req, res) => {
  res.json({ success: true, message: 'Use MongoDB dashboard for admin tasks.' });
});

// GitHub Proxy
app.get('/api/github/proxy', async (req, res) => {
  const { path } = req.query;
  // Sanitize path to prevent SSRF
  if (!path || !path.startsWith('/')) return res.status(400).json({ error: 'Invalid path' });
  
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

const server = http.createServer(app);

// Sockets setup
const io = new Server(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"]
  },
  // We can leave this large enough for base64 if needed, but we will use cloudinary REST endpoint anyway.
  maxHttpBufferSize: 1e6 
});

app.set('io', io);
setupSockets(io);

const PORT = process.env.PORT || 3001;
// Listen on all interfaces for Render
server.listen(PORT, '0.0.0.0', () => {
  console.log(`INNTECH Backend listening on port ${PORT}`);
});
