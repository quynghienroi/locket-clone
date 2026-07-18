const jwt = require('jsonwebtoken');
const User = require('../models/User');
const Photo = require('../models/Photo');
const Message = require('../models/Message');
const broadcastFeed = require('../broadcastHelper');
require('dotenv').config();

const JWT_SECRET = process.env.JWT_SECRET || 'locket_super_secret_key';

const setupSockets = (io) => {
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
      const user = await User.findOne({ email: socket.userEmail }).select('username');
      const username = user ? user.username : 'Unknown';
      console.log(`A user connected: ${username}`);

      if (username !== 'Unknown') {
        socket.join(username);
        await broadcastFeed(null, io);
      }

      socket.on('send_photo', async (data) => {
        const { targets, photoUrl, caption, filter } = data;
        try {
          if (!photoUrl) throw new Error("Photo URL is required");

          const newPhotoDoc = new Photo({
            sender: username,
            targets: targets || [],
            photoUrl: photoUrl,
            caption: caption || '',
            filter: filter || 'none',
            reactions: {}
          });
          await newPhotoDoc.save();

          await broadcastFeed(null, io);
        } catch (err) {
          console.error("Error saving photo:", err);
          socket.emit('error_msg', "Error saving photo: " + (err.message || err));
        }
      });

      socket.on('delete_photo', async (photoId) => {
        try {
          const photo = await Photo.findById(photoId);
          if (photo && (photo.sender === username || username === 'admin')) {
            await Photo.findByIdAndDelete(photoId);
            await broadcastFeed(null, io);
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
            await broadcastFeed(null, io);
          }
        } catch (err) {
          console.error("add_reaction error:", err);
        }
      });

      socket.on('join_chat', async (receiver) => {
        try {
          let history;
          if (receiver === 'global') {
            history = await Message.find({ receiver: 'global' }).sort({ createdAt: 1 });
          } else {
            history = await Message.find({
              $or: [
                { sender: username, receiver: receiver },
                { sender: receiver, receiver: username }
              ]
            }).sort({ createdAt: 1 });
          }
          
          if (history) {
            // Map MongoDB _id and createdAt to frontend expected format
            const formattedHistory = history.map(msg => ({
              id: msg._id,
              sender: msg.sender,
              receiver: msg.receiver,
              text: msg.text,
              created_at: msg.createdAt
            }));
            socket.emit('chat_history', formattedHistory);
          }
          socket.join(receiver === 'global' ? 'chat_global' : [username, receiver].sort().join('_'));
        } catch (err) {
          console.error("join_chat error:", err);
        }
      });

      socket.on('send_chat_message', async (data) => {
        try {
          const { receiver, text } = data;
          
          if (!text || text.trim() === '') return;

          const newMsg = new Message({
            sender: username,
            receiver,
            text
          });
          await newMsg.save();
          
          if (newMsg) {
            const formattedMsg = {
              id: newMsg._id,
              sender: newMsg.sender,
              receiver: newMsg.receiver,
              text: newMsg.text,
              created_at: newMsg.createdAt
            };
            const roomName = receiver === 'global' ? 'chat_global' : [username, receiver].sort().join('_');
            io.to(roomName).emit('chat_message', formattedMsg);
          }
        } catch (err) {
          console.error("send_chat_message error:", err);
        }
      });

      socket.on('disconnect', () => {
        console.log(`User disconnected: ${username}`);
      });
    } catch (err) {
      console.error("Connection handler error:", err);
    }
  });
};

module.exports = setupSockets;
