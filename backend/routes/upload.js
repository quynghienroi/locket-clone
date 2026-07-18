const express = require('express');
const router = express.Router();
const { upload } = require('../utils/cloudinary');
const authMiddleware = require('../middlewares/authMiddleware');

router.post('/', authMiddleware, upload.single('photo'), (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }
    
    // Cloudinary returns the secure URL
    res.json({ success: true, photoUrl: req.file.path });
  } catch (err) {
    console.error('Upload error:', err);
    res.status(500).json({ error: 'Upload failed' });
  }
});

module.exports = router;
