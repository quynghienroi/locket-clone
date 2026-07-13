require('dotenv').config();
const mongoose = require('mongoose');
const User = require('./models/User');
mongoose.connect(process.env.MONGODB_URI).then(async () => {
  const users = await User.find({}, 'username statusMusic').lean();
  console.log(JSON.stringify(users, null, 2));
  process.exit(0);
});
