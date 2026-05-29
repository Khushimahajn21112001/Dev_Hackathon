const express = require('express');
const router = express.Router();
const TeamRoutingRule = require('../models/TeamRoutingRule');
const { generateEmbedding } = require('../utils/aiMatching'); // utility to embed example issues

// Helper to compute embeddings for example issues array
async function computeExampleEmbeddings(exampleIssues) {
  const embeddings = [];
  for (const issue of exampleIssues) {
    try {
      const emb = await generateEmbedding(issue);
      embeddings.push(emb);
    } catch (e) {
      console.error('Embedding error for issue:', issue, e);
      embeddings.push([]);
    }
  }
  return embeddings;
}

// GET all routing rules (admin view)
router.get('/', async (req, res) => {
  try {
    const rules = await TeamRoutingRule.find({}).populate('teamId', 'name');
    res.json({ success: true, rules });
  } catch (err) {
    console.error('GET team-routing-rules error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// CREATE new routing rule
router.post('/', async (req, res) => {
  try {
    const { teamId, teamName, description, keywords, exampleIssues, status } = req.body;
    const exampleEmbeddings = await computeExampleEmbeddings(exampleIssues || []);
    const newRule = new TeamRoutingRule({
      teamId,
      teamName,
      description,
      keywords,
      exampleIssues,
      exampleEmbeddings,
      status: status || 'Active',
    });
    await newRule.save();
    res.status(201).json({ success: true, rule: newRule });
  } catch (err) {
    console.error('POST team-routing-rules error:', err);
    res.status(500).json({ error: 'Failed to create routing rule' });
  }
});

// UPDATE existing rule
router.put('/:id', async (req, res) => {
  try {
    const { teamId, teamName, description, keywords, exampleIssues, status } = req.body;
    const update = { teamId, teamName, description, keywords, exampleIssues, status };
    // Re‑compute embeddings if exampleIssues are provided/changed
    if (exampleIssues) {
      const exampleEmbeddings = await computeExampleEmbeddings(exampleIssues);
      update.exampleEmbeddings = exampleEmbeddings;
    }
    const updated = await TeamRoutingRule.findByIdAndUpdate(req.params.id, update, { new: true });
    if (!updated) return res.status(404).json({ error: 'Rule not found' });
    res.json({ success: true, rule: updated });
  } catch (err) {
    console.error('PUT team-routing-rules error:', err);
    res.status(500).json({ error: 'Failed to update routing rule' });
  }
});

// DELETE (or deactivate) rule
router.delete('/:id', async (req, res) => {
  try {
    // Soft delete: set status to Inactive
    const rule = await TeamRoutingRule.findByIdAndUpdate(req.params.id, { status: 'Inactive' }, { new: true });
    if (!rule) return res.status(404).json({ error: 'Rule not found' });
    res.json({ success: true, rule });
  } catch (err) {
    console.error('DELETE team-routing-rules error:', err);
    res.status(500).json({ error: 'Failed to delete routing rule' });
  }
});

module.exports = router;
