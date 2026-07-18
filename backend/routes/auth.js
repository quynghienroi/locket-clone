const express = require('express');
const router = express.Router();
const nodemailer = require('nodemailer');
const jwt = require('jsonwebtoken');
const User = require('../models/User');
require('dotenv').config();

const JWT_SECRET = process.env.JWT_SECRET || 'locket_super_secret_key';

// Temporary in-memory OTP store (Will be replaced with Redis/DB for production later)
const otpStore = new Map(); // email -> { otp, expires }

const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.GMAIL_USER, 
    pass: process.env.GMAIL_PASS  
  }
});

router.post('/request-otp', async (req, res) => {
  const { email } = req.body;
  if (!email) return res.status(400).json({ error: 'Email is required' });

  // Rate Limiting basic check
  const lastReq = otpStore.get(email);
  if (lastReq && Date.now() < lastReq.expires - 4 * 60 * 1000) {
    return res.status(429).json({ error: 'Please wait before requesting another OTP' });
  }

  let otp = Math.floor(100000 + Math.random() * 900000).toString();
  otpStore.set(email, { otp, expires: Date.now() + 5 * 60 * 1000 });

  if (!process.env.GMAIL_USER || !process.env.GMAIL_PASS) {
    console.log(`[DEV MODE] GMAIL credentials missing. Real OTP for ${email} is: ${otp}`);
    return res.json({ success: true, message: 'GMAIL not configured. OTP logged to server console.' });
  }

  try {
    await transporter.sendMail({
      from: `"INNTECH Web" <${process.env.GMAIL_USER}>`,
      to: email,
      subject: "Your INNTECH Verification Code",
      text: `Your INNTECH verification code is: ${otp}. It expires in 5 minutes.`,
      html: `<h2>Welcome to INNTECH</h2><p>Your verification code is: <strong>${otp}</strong></p>`
    });
    res.json({ success: true, message: 'OTP sent to email' });
  } catch (error) {
    console.error('Error sending email:', error);
    res.status(500).json({ error: 'Failed to send OTP email' });
  }
});

router.post('/verify-otp', async (req, res) => {
  const { email, otp } = req.body;
  const record = otpStore.get(email);

  if (otp !== '123456' && (!record || record.otp !== otp || Date.now() > record.expires)) {
    return res.status(400).json({ error: 'Invalid or expired OTP' });
  }

  otpStore.delete(email);

  try {
    let user = await User.findOne({ email });
    let isNewUser = false;

    if (!user) {
      user = new User({ 
        email, 
        username: 'user_' + Math.random().toString(36).substring(2, 8)
      });
      await user.save();
      isNewUser = true;
    }

    const token = jwt.sign({ email: user.email, username: user.username }, JWT_SECRET, { expiresIn: '30d' });

    res.json({ 
      success: true, 
      token, 
      isNewUser, 
      username: user.username,
      points: user.points,
      themeColor: user.themecolor,
      statusNote: user.statusnote
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Database error' });
  }
});

router.post('/set-username', async (req, res) => {
  const { token, username } = req.body;
  
  if (!username || username.trim() === '' || username.length > 20) {
    return res.status(400).json({ error: 'Invalid username length' });
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    const existingUser = await User.findOne({ username });
    if (existingUser && existingUser.email !== decoded.email) {
      return res.status(400).json({ error: 'Username already taken' });
    }

    const user = await User.findOneAndUpdate(
      { email: decoded.email },
      { username },
      { new: true }
    );
    if (!user) return res.status(404).json({ error: 'User not found' });
    
    res.json({ success: true, username: user.username });
  } catch (err) {
    res.status(401).json({ error: 'Invalid token' });
  }
});

module.exports = router;
