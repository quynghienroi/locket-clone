const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
  email: {
    type: String,
    required: true,
    unique: true
  },
  username: {
    type: String,
    sparse: true,
    unique: true
  },
  themeColor: {
    type: String,
    default: '#fbbf24'
  },
  statusNote: {
    type: String,
    default: ''
  },
  statusMusic: {
    title: String,
    artist: String,
    previewUrl: String
  },
  noteHistory: [{
    text: String,
    music: {
      title: String,
      artist: String,
      previewUrl: String
    },
    createdAt: { type: Date, default: Date.now }
  }],
  points: {
    type: Number,
    default: 0
  },
  eventsJoined: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Event'
  }]
}, { timestamps: true });

module.exports = mongoose.model('User', userSchema);
