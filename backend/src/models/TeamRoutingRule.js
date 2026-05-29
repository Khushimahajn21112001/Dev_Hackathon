const mongoose = require('mongoose');

const TeamRoutingRuleSchema = new mongoose.Schema({
  teamId: { type: mongoose.Schema.Types.ObjectId, ref: 'Team', required: true },
  teamName: { type: String, required: true },
  description: { type: String },
  keywords: [{ type: String }],
  exampleIssues: [{ type: String }],
  // Store pre‑computed embeddings for each example issue (array of number arrays)
  exampleEmbeddings: [{ type: [Number] }],
  status: { type: String, enum: ['Active', 'Inactive'], default: 'Active' },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now },
});

TeamRoutingRuleSchema.pre('save', function(next) {
  this.updatedAt = Date.now();
  next();
});

module.exports = mongoose.model('TeamRoutingRule', TeamRoutingRuleSchema);
