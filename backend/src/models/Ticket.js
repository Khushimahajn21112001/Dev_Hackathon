// backend/src/models/Ticket.js
const mongoose = require('mongoose');

const TicketSchema = new mongoose.Schema({
  // ── Core Identifiers ──────────────────────────────────────────────────────
  ticketNumber:   { type: String, required: true, unique: true },
  ticketTitle:    { type: String, required: true },
  issueDescription: { type: String, required: true },
  originalUserInput: { type: String },
  extractedEntities: { type: mongoose.Schema.Types.Mixed, default: {} },
  category:       { type: String },

  // ── Assignment ────────────────────────────────────────────────────────────
  assignedTeam: { type: mongoose.Schema.Types.ObjectId, ref: 'Team' },
  assignedTo:   { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  assignedBy:   { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  assignedAt:   { type: Date },

  // ── Priority & Status ─────────────────────────────────────────────────────
  priority: {
    type: String,
    enum: ['Low', 'Medium', 'High'],
    default: 'Medium',
  },
  status: {
    type: String,
    enum: ['Open', 'Assigned', 'In Progress', 'Pending User Confirmation', 'Closed'],
    default: 'Open',
  },

  // ── Raised By ─────────────────────────────────────────────────────────────
  raisedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },

  // ── Resolution Details (filled by Support User) ───────────────────────────
  rootCause:        { type: String, default: '' },
  resolutionSteps:  { type: String, default: '' },
  reusableFix:      { type: Boolean, default: false },
  internalNote:     { type: String, default: '' },

  // ── Pending User Confirmation ─────────────────────────────────────────────
  pendingUserConfirmationAt: { type: Date },       // when support submitted resolution
  userConfirmationStatus: {
    type: String,
    enum: ['pending', 'confirmed', 'reopened'],
    default: 'pending',
  },
  userReopenRemarks: { type: String, default: '' }, // corporate user's reopen remarks

  // ── Close Details ─────────────────────────────────────────────────────────
  closedAt:         { type: Date },
  closedBy:         { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  forceClosed:      { type: Boolean, default: false },
  forceCloseReason: { type: String, default: '' },

  // ── KB Suggestion Tracking (chatbot flow) ─────────────────────────────────
  attemptedKbId:           { type: mongoose.Schema.Types.ObjectId, ref: 'ResolutionKB' },
  attemptedResolutionSteps:{ type: String, default: '' },
  userSaidKbFailed:        { type: Boolean, default: false },
  matchedKbId:             { type: mongoose.Schema.Types.ObjectId, ref: 'ResolutionKB' },
  kbSimilarityScore:       { type: Number },

  // ── Timestamps ────────────────────────────────────────────────────────────
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now },
});

module.exports = mongoose.model('Ticket', TicketSchema);
