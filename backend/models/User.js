const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
  email: { type: String, required: true, unique: true },
  username: { type: String, sparse: true, unique: true },
  points: { type: Number, default: 0 },
  themecolor: { type: String, default: '#000000' },
  statusnote: { type: String, default: '' },
  statusmusic: { type: Object, default: {} },
  notehistory: { type: Array, default: [] }
}, { timestamps: true });

module.exports = mongoose.model('User', userSchema);
