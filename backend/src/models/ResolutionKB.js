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

  // 🤖 AI Extracted Metadata Fields for Hybrid RAG Matching
  applicationNames:     [{ type: String }],
  ipAddresses:          [{ type: String }],
  hostnames:            [{ type: String }],
  urls:                 [{ type: String }],
  domains:              [{ type: String }],
  deviceIds:            [{ type: String }],
  errorMessages:        [{ type: String }],
  authenticationMethod: { type: String, default: '' },
  policyTool:           { type: String, default: '' },
  problemFamily:        { type: String, default: '' },
  issueIntent:          { type: String, default: '' },
  rootCauseCategory:    { type: String, default: '' },
  affectedLayer:        { type: String, default: '' },
  resolutionType:       { type: String, default: '' },
  tags:                 [{ type: String }],

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

  // ── RAG Metrics ───────────────────────────────────────────────────────────
  usedInRagCount:  { type: Number, default: 0 },
  ragSuccessCount: { type: Number, default: 0 },
  ragFailureCount: { type: Number, default: 0 },
  lastUsedInRagAt: { type: Date },

  // ── Traceability ──────────────────────────────────────────────────────────
  createdFromTicketId: { type: mongoose.Schema.Types.ObjectId, ref: 'Ticket' },
  lastUpdatedAt:       { type: Date, default: Date.now },
});

module.exports = mongoose.model('ResolutionKB', ResolutionKBSchema);
