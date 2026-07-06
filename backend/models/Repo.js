const mongoose = require('mongoose');

const repoSchema = new mongoose.Schema({
  sender: {
    type: String,
    required: true
  },
  url: {
    type: String,
    required: true
  },
  owner: String,
  name: String,
  description: String,
  customMessage: String,
  language: String,
  stars: Number,
  forks: Number
}, { timestamps: true });

module.exports = mongoose.model('Repo', repoSchema);
