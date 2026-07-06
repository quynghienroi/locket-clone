const mongoose = require('mongoose');

const eventSchema = new mongoose.Schema({
  title: {
    type: String,
    required: true
  },
  description: {
    type: String,
    required: true
  },
  date: {
    type: Date,
    required: true
  },
  formLink: String,
  thumbnailUrl: String,
  pointsReward: {
    type: Number,
    default: 50
  },
  participants: [{
    type: String // usernames of participants
  }]
}, { timestamps: true });

module.exports = mongoose.model('Event', eventSchema);
