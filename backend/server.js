const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');
require('dotenv').config();

const app = express();
app.use(cors());

const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"]
  }
});

// In-memory Database mockup
let globalFeed = [];
let photoIdCounter = 1;

io.on('connection', (socket) => {
  console.log('A user connected:', socket.id);

  socket.on('join', (deviceType) => {
    socket.join(deviceType); // join personal room
    console.log(`Socket ${socket.id} joined room ${deviceType}`);
    
    // Send current feed to newly joined user
    socket.emit('feed_updated', globalFeed);
  });

  socket.on('send_photo', (data) => {
    // data: { sender, targets: [], photoBase64, caption }
    const { sender, targets, photoBase64, caption } = data;
    
    const newPhoto = {
      id: photoIdCounter++,
      sender,
      targets, // Array of target usernames, or ['ALL']
      photoBase64,
      caption: caption || '',
      reactions: {}, // { 'username': '❤️' }
      timestamp: new Date().toISOString()
    };
    
    globalFeed.unshift(newPhoto); // Add to beginning of feed
    // Keep only last 50 for memory
    if (globalFeed.length > 50) globalFeed.pop();

    // Broadcast to global feed
    io.emit('feed_updated', globalFeed);

    // Also emit specific 'receive_photo' for the popup to the specific targets
    if (targets.includes('ALL')) {
      socket.broadcast.emit('receive_photo', newPhoto);
    } else {
      targets.forEach(target => {
        io.to(target).emit('receive_photo', newPhoto);
      });
    }
  });

  socket.on('add_reaction', (data) => {
    const { photoId, emoji, user } = data;
    const photo = globalFeed.find(p => p.id === photoId);
    if (photo) {
      photo.reactions[user] = emoji;
      io.emit('feed_updated', globalFeed);
    }
  });

  socket.on('disconnect', () => {
    console.log('User disconnected:', socket.id);
  });
});

const PORT = process.env.PORT || 3001;
server.listen(PORT, () => {
  console.log(`Locket Backend listening on port ${PORT}`);
});
