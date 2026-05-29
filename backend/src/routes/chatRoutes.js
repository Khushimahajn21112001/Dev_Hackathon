// backend/src/routes/chatRoutes.js
const express = require('express');
const router = express.Router();
const Chat = require('../models/Chat');

// Send a chat message
router.post('/send', async (req, res) => {
  const { ticketId, senderId, receiverId, message } = req.body;
  if (!ticketId || !senderId || !receiverId || !message) {
    return res.status(400).json({ message: 'All fields required' });
  }
  try {
    const chat = await Chat.create({ ticketId, senderId, receiverId, message });
    res.json({ chat });
  } catch (err) {
    console.error('Chat send error', err);
    res.status(500).json({ message: 'Server error' });
  }
});

// Get all messages for a ticket
router.get('/:ticketId', async (req, res) => {
  const { ticketId } = req.params;
  try {
    const chats = await Chat.find({ ticketId })
      .populate('senderId', 'username')
      .populate('receiverId', 'username')
      .sort({ createdAt: 1 });
    res.json({ chats });
  } catch (err) {
    console.error('Chat get error', err);
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;
