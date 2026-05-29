// backend/src/models/Team.js
const mongoose = require('mongoose');

const TeamSchema = new mongoose.Schema({
  name: { type: String, required: true, unique: true },
  teamName: { type: String }, // optional, copy of name or synonymous
  description: { type: String },
  teamLead: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  status: { type: String, enum: ['Active', 'Inactive'], default: 'Active' },
  createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Team', TeamSchema);
