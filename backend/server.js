const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');
require('dotenv').config();

const authRoutes = require('./routes/auth');
const userRoutes = require('./routes/user');
const eventRoutes = require('./routes/events');
const repoRoutes = require('./routes/repos');
const setupSockets = require('./sockets');

const app = express();

// Middlewares
app.use(cors());
app.use(express.json({ limit: '10mb' }));

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/user', userRoutes);
app.use('/api/events', eventRoutes);
app.use('/api/repos', repoRoutes);

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', message: 'Backend is running.' });
});

// Admin endpoint (placeholder)
app.get('/api/admin/clean-db', (req, res) => {
  res.json({ success: true, message: 'Use Supabase dashboard for admin tasks.' });
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
  // maxHttpBufferSize reduced since photos are no longer base64 (just URLs)
  maxHttpBufferSize: 1e6 // 1MB is enough for any chat message or URL
});

app.set('io', io);
setupSockets(io);

const PORT = process.env.PORT || 3001;
server.listen(PORT, '192.168.1.11', () => {
  console.log(`INNTECH Backend listening on port ${PORT}`);
});
