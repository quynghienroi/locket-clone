const mongoose = require('mongoose');

const photoSchema = new mongoose.Schema({
  sender: {
    type: String,
    required: true
  },
  targets: [{
    type: String
  }],
  photoBase64: {
    type: String,
    required: true
  },
  caption: {
    type: String,
    default: ''
  },
  reactions: {
    type: Map,
    of: String, // username -> emoji
    default: {}
  },
}, { timestamps: true });

module.exports = mongoose.model('Photo', photoSchema);
