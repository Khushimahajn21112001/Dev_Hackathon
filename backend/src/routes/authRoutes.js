// backend/src/routes/authRoutes.js
const express = require('express');
const router = express.Router();
const User = require('../models/User');

router.post('/login', async (req, res) => {
  const { username, password } = req.body;
  console.log(`Login attempt - Username: "${username}", Password: "${password}"`);
  if (!username || !password) {
    return res.status(400).json({ message: 'Username and password required' });
  }
  try {
    const user = await User.findOne({ username, password }); // plain‑text check as requested
    console.log('User found in DB:', user ? `Yes (${user.username}, Role: ${user.role})` : 'No');
    if (!user) {
      return res.status(401).json({ message: 'Invalid username or password' });
    }
    if (user.status === 'Inactive') {
      return res.status(403).json({ message: 'Your account is deactivated. Please contact administrator.' });
    }
    // Simple token (could be JWT later). Here we just return username as token.
    const token = Buffer.from(`${user._id}`).toString('base64');
    res.json({ token, role: user.role, username: user.username, userId: user._id.toString(), team: user.team });
  } catch (err) {
    console.error('Login error', err);
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;
