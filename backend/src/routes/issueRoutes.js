// backend/src/routes/issueRoutes.js
const express = require('express');
const router = express.Router();
const IssueKB = require('../models/IssueKB');
const ResolutionKB = require('../models/ResolutionKB');
const Ticket = require('../models/Ticket');
const Team = require('../models/Team');

// Helper: simple keyword match
const findIssueMatch = async (text) => {
  const lower = text.toLowerCase();
  const issues = await IssueKB.find({}).populate('assignedTeam');
  for (const issue of issues) {
    const keywords = Array.isArray(issue.keywords) ? issue.keywords : [];
    for (const kw of keywords) {
      if (lower.includes(kw.toLowerCase())) {
        return issue;
      }
    }
  }
  return null;
};

router.post('/analyze', async (req, res) => {
  const { description, raisedBy } = req.body; // raisedBy is userId
  if (!description || !raisedBy) {
    return res.status(400).json({ message: 'description and raisedBy required' });
  }
  try {
    const issue = await findIssueMatch(description);
    if (issue) {
      // find resolution
      const resolution = await ResolutionKB.findOne({ issueTitle: new RegExp(issue.title, 'i') });
      // Safely get team name – fallback to assigned_team if present
      const teamName = (issue.assignedTeam && issue.assignedTeam.name) || (issue.assigned_team && issue.assigned_team.name) || 'Unassigned';
      return res.json({ match: true, issueTitle: issue.title, resolution: resolution ? resolution.steps : [], assignedTeam: teamName, issueId: issue._id });
    }
    // No match – create a ticket fallback
    const defaultTeam = await Team.findOne({ name: 'Support Team' }) || await Team.findOne();
    const ticketNumber = 'TICK-' + Date.now();
    const ticket = await Ticket.create({
      ticketNumber,
      raisedBy,
      issueDescription: description,
      assignedTeam: defaultTeam ? defaultTeam._id : undefined,
      status: 'Open',
    });
    return res.json({ match: false, ticketNumber: ticket.ticketNumber, assignedTeam: defaultTeam ? defaultTeam.name : null, ticketId: ticket._id });
  } catch (err) {
    console.error('Issue analysis error', err);
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;
