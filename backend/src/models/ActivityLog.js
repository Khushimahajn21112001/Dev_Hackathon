// backend/src/models/ActivityLog.js
const mongoose = require('mongoose');

const ActivityLogSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  action: { type: String, required: true },
  issueText: { type: String, default: '' },
  ragUsed: { type: Boolean, default: false },
  ragResult: { type: String, default: '' }, // e.g., 'success', 'failed'
  createdAt: { type: Date, default: Date.now },
});

module.exports = mongoose.model('ActivityLog', ActivityLogSchema);
