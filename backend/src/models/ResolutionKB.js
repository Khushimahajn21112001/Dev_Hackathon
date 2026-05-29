// backend/src/models/ResolutionKB.js
const mongoose = require('mongoose');

const ResolutionKBSchema = new mongoose.Schema({
  // ── Issue Identity ────────────────────────────────────────────────────────
  issueTitle:   { type: String, required: true },
  category:     { type: String, default: '' },          // e.g. 'VPN / Remote Access'
  keywords:     [{ type: String }],                     // used for KB search matching

  // ── Resolution Content ────────────────────────────────────────────────────
  symptoms:      [{ type: String }],
  knownFixSteps: [{ type: String }],                    // array of step strings
  rootCause:     { type: String, default: '' },
  entities:      { type: mongoose.Schema.Types.Mixed, default: {} },
  embedding:     [{ type: Number }],

  // ── Routing ───────────────────────────────────────────────────────────────
  assignedTeam: { type: mongoose.Schema.Types.ObjectId, ref: 'Team' },

  // ── Metrics ───────────────────────────────────────────────────────────────
  solvedCount:   { type: Number, default: 0 },          // total times resolved
  successCount:  { type: Number, default: 0 },          // user confirmed resolved
  failedCount:   { type: Number, default: 0 },          // user said still facing issue
  successRate:   { type: Number, default: 0 },          // successCount / solvedCount * 100

  // ── Traceability ──────────────────────────────────────────────────────────
  createdFromTicketId: { type: mongoose.Schema.Types.ObjectId, ref: 'Ticket' },
  lastUpdatedAt:       { type: Date, default: Date.now },
});

module.exports = mongoose.model('ResolutionKB', ResolutionKBSchema);
