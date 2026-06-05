// backend/src/models/AccessRequest.js
const mongoose = require('mongoose');

const AccessRequestSchema = new mongoose.Schema({
  requestNumber: { type: String, unique: true }, // e.g. AR-20240604-001

  raisedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },

  // Type of access being requested
  accessType: {
    type: String,
    enum: [
      'Server Credentials',
      'Database Access',
      'Admin Rights',
      'Shared Folder Access',
      'Power BI / Analytics Tool',
      'Production / Privileged Access',
      'Temporary Access',
      'VPN / Remote Access',
      'Other'
    ],
    required: true
  },

  // Short title / description
  title: { type: String, required: true },
  description: { type: String, required: true },

  // Target system / resource (e.g. "Server 10.10.1.5", "HR DB", "Finance BI Workspace")
  targetResource: { type: String },

  // Business justification
  justification: { type: String },

  // Urgency
  urgency: {
    type: String,
    enum: ['Low', 'Medium', 'High'],
    default: 'Medium'
  },

  // Lifecycle status
  status: {
    type: String,
    enum: ['Pending', 'In Review', 'Approved', 'Rejected', 'Fulfilled'],
    default: 'Pending'
  },

  // Credential Admin who handled it
  handledBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },

  // Notes / remarks by the Credential Admin (visible to corporate user)
  adminRemarks: { type: String },

  // Internal resolution notes (NOT shared with corporate user — do not store raw passwords here)
  internalNotes: { type: String },

  // Timestamps for audit trail
  reviewedAt: { type: Date },
  approvedAt: { type: Date },
}, { timestamps: true });

// Auto-generate requestNumber before saving
AccessRequestSchema.pre('save', async function () {
  if (!this.requestNumber) {
    const today = new Date();
    const dateStr = today.toISOString().slice(0, 10).replace(/-/g, '');
    const count = await mongoose.model('AccessRequest').countDocuments() + 1;
    this.requestNumber = `AR-${dateStr}-${String(count).padStart(3, '0')}`;
  }
});

module.exports = mongoose.model('AccessRequest', AccessRequestSchema);
