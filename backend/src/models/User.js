// backend/src/models/User.js
const mongoose = require('mongoose');

const UserSchema = new mongoose.Schema({
  username: { type: String, required: true, unique: true },
  password: { type: String, required: true }, // plain text as per project specifications
  name: { type: String },
  email: { type: String },
  role: {
    type: String,
    enum: ['Admin', 'Team Lead', 'Support User', 'Corporate User', 'Credential Admin'],
    required: true
  },
  team: { type: mongoose.Schema.Types.ObjectId, ref: 'Team' },
  status: { type: String, enum: ['Active', 'Inactive'], default: 'Active' },
  isSystemUser: { type: Boolean, default: false } // Marks auto-bootstrapped system users
}, { timestamps: true });

module.exports = mongoose.model('User', UserSchema);
