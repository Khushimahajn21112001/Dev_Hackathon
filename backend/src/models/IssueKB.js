// backend/src/models/IssueKB.js
const mongoose = require('mongoose');

const IssueKBSchema = new mongoose.Schema({
  title: { type: String, required: true },
  category: { type: String, required: true }, // e.g. 'VPN / Remote Access'
  keywords: [{ type: String }],
  assignedTeam: { type: mongoose.Schema.Types.ObjectId, ref: 'Team' }, // renamed field
  default_priority: {
    type: String,
    enum: ['Low', 'Medium', 'High'],
    default: 'Medium',
  },
});

module.exports = mongoose.model('IssueKB', IssueKBSchema);
