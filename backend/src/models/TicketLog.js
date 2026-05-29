// backend/src/models/TicketLog.js
const mongoose = require('mongoose');

const TicketLogSchema = new mongoose.Schema({
  // Which ticket this log entry belongs to
  ticketId:    { type: mongoose.Schema.Types.ObjectId, ref: 'Ticket', required: true },

  // Human-readable action label e.g. 'Status Changed', 'Resolution Submitted'
  action:      { type: String, required: true },

  // Status before and after the action
  oldStatus:   { type: String, default: '' },
  newStatus:   { type: String, default: '' },

  // Who performed the action (optional for system-triggered events)
  performedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },

  // Optional remarks or notes attached to this log entry
  remarks:     { type: String, default: '' },

  createdAt:   { type: Date, default: Date.now },
});

module.exports = mongoose.model('TicketLog', TicketLogSchema);
