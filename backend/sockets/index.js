const jwt = require('jsonwebtoken');
const supabase = require('../utils/supabase');
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
      const { data: user } = await supabase.from('users').select('username').eq('email', socket.userEmail).maybeSingle();
      const username = user ? user.username : 'Unknown';
      console.log(`A user connected: ${username}`);

      if (username !== 'Unknown') {
        socket.join(username);
        await broadcastFeed(supabase, io);
      }

      socket.on('send_photo', async (data) => {
        // Now photoUrl is sent directly from the client, preventing Base64 overload on the server
        const { targets, photoUrl, caption, filter } = data;
        try {
          if (!photoUrl) throw new Error("Photo URL is required");

          const { data: newPhotoDoc, error: insertError } = await supabase.from('photos').insert([{
            sender: username,
            targets: targets || [],
            photo_url: photoUrl,
            caption: caption || '',
            filter: filter || 'none',
            reactions: {}
          }]).select().single();
          if (insertError) throw insertError;

          await broadcastFeed(supabase, io);
        } catch (err) {
          console.error("Error saving photo:", err);
          socket.emit('error_msg', "Error saving photo: " + (err.message || err));
        }
      });

      socket.on('delete_photo', async (photoId) => {
        try {
          const { data: photo } = await supabase.from('photos').select('*').eq('id', photoId).single();
          if (photo && (photo.sender === username || username === 'admin')) {
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
          console.error("add_reaction error:", err);
        }
      });

      socket.on('join_chat', async (receiver) => {
        try {
          let query = supabase.from('messages').select('*').order('created_at', { ascending: true });
          
          if (receiver === 'global') {
            query = query.eq('receiver', 'global');
          } else {
            query = query.or(`and(sender.eq.${username},receiver.eq.${receiver}),and(sender.eq.${receiver},receiver.eq.${username})`);
          }
          
          const { data: history } = await query;
          if (history) {
            socket.emit('chat_history', history);
          }
          socket.join(receiver === 'global' ? 'chat_global' : [username, receiver].sort().join('_'));
        } catch (err) {
          console.error("join_chat error:", err);
        }
      });

      socket.on('send_chat_message', async (data) => {
        try {
          const { receiver, text } = data;
          
          // Basic validation
          if (!text || text.trim() === '') return;

          const { data: newMsg, error } = await supabase.from('messages').insert([{
            sender: username,
            receiver,
            text
          }]).select().single();
          
          if (!error && newMsg) {
            const roomName = receiver === 'global' ? 'chat_global' : [username, receiver].sort().join('_');
            io.to(roomName).emit('chat_message', newMsg);
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
