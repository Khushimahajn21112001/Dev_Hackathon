// backend/src/routes/corporateRoutes.js
const express  = require('express');
const router   = express.Router();
const mongoose = require('mongoose');

const Ticket       = require('../models/Ticket');
const IssueKB      = require('../models/IssueKB');
const ResolutionKB = require('../models/ResolutionKB');
const Team         = require('../models/Team');
const Notification = require('../models/Notification');
const TicketLog    = require('../models/TicketLog');
const { upsertResolutionKB } = require('../utils/kbHelper');
const { generateEmbedding, extractEntities, cosineSimilarity, checkEntitySafety } = require('../utils/aiMatching');
const { analyzeTicketIssue } = require('../services/geminiService');

// ─────────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────────
async function logTicketAction({ ticketId, action, oldStatus, newStatus, performedBy, remarks }) {
  await TicketLog.create({ ticketId, action, oldStatus: oldStatus || '', newStatus: newStatus || '', performedBy, remarks: remarks || '' });
}

async function notify(userId, message, ticketId) {
  if (!userId) return;
  await Notification.create({ userId, message, ticketId });
}

// ─────────────────────────────────────────────────────────────────────────────
// Keyword / text helpers
// ─────────────────────────────────────────────────────────────────────────────

const STOPWORDS = new Set([
  'the','a','an','is','it','in','on','at','to','for','of','and','or','but',
  'not','can','i','my','me','we','our','this','that','with','from','are',
  'was','be','been','have','has','had','do','does','did','will','would',
  'could','should','may','might','shall','get','got','want','need','make',
  'use','used','using','via','over','under','about','since','just','also',
  'its','their','there','here','how','why','what','when','which','who',
  'no','yes','up','down','out','if','as','by','so','than','too','very',
  'internet','accessible','access','available','working','work',
]);

/** Used for duplicate-ticket detection (strict — strips stopwords) */
function extractWords(text) {
  const words = text.toLowerCase().replace(/[^a-z0-9\s\-]/g, '').split(/\s+/).filter(Boolean)
    .filter(w => !STOPWORDS.has(w) && w.length > 2);
  const bigrams = [];
  for (let i = 0; i < words.length - 1; i++) bigrams.push(words[i] + ' ' + words[i + 1]);
  return [...words, ...bigrams];
}

/** Used for KB matching (raw — keeps all meaningful words including 'internet', 'network') */
function extractRawWords(text) {
  const words = text.toLowerCase().replace(/[^a-z0-9\s\-]/g, '').split(/\s+/).filter(Boolean)
    .filter(w => w.length > 2);
  const bigrams = [];
  for (let i = 0; i < words.length - 1; i++) bigrams.push(words[i] + ' ' + words[i + 1]);
  return [...words, ...bigrams];
}

// ─────────────────────────────────────────────────────────────────────────────
// Professional ticket title/description mapping
// ─────────────────────────────────────────────────────────────────────────────
const ISSUE_TITLE_MAP = {
  vpn:            { title: 'VPN Connectivity Issue',                  description: 'User is unable to connect to VPN / remote access service.' },
  'remote access':{ title: 'Remote Access Issue',                     description: 'User is experiencing issues with remote access connectivity.' },
  jira:           { title: 'Jira Application Issue',                  description: 'User is unable to access or use Jira application.' },
  confluence:     { title: 'Confluence Application Issue',            description: 'User is unable to access or use Confluence application.' },
  bitbucket:      { title: 'Bitbucket Application Issue',             description: 'User is unable to access or use Bitbucket application.' },
  laptop:         { title: 'Laptop Performance Issue',                description: 'User is experiencing performance issues with their laptop.' },
  'blue screen':  { title: 'Blue Screen of Death (BSOD) Issue',       description: 'User is encountering blue screen errors on their workstation.' },
  slow:           { title: 'System Performance Degradation',          description: 'User reports that their system is running slower than expected.' },
  freeze:         { title: 'System Freeze Issue',                     description: 'User reports that their system is freezing intermittently.' },
  wifi:           { title: 'Wi-Fi Connectivity Issue',                description: 'User is unable to connect to the wireless network.' },
  'wi-fi':        { title: 'Wi-Fi Connectivity Issue',                description: 'User is unable to connect to the wireless network.' },
  internet:       { title: 'Internet / Website Accessibility Issue',   description: 'User is unable to access an internet resource or website.' },
  accessible:     { title: 'Resource Accessibility Issue',            description: 'User is unable to access a specific resource or service over the network.' },
  network:        { title: 'Network Connectivity Issue',              description: 'User is experiencing general network connectivity problems.' },
  dns:            { title: 'DNS Resolution Issue',                    description: 'User is experiencing DNS resolution failures.' },
  email:          { title: 'Email Service Issue',                     description: 'User is unable to send or receive emails.' },
  password:       { title: 'Password Reset Request',                  description: 'User requires assistance with password reset.' },
  printer:        { title: 'Printer Issue',                           description: 'User is unable to print or connect to the printer.' },
};

function generateTicketDetails(issueText) {
  const lowerText = issueText.toLowerCase();
  const sortedKeys = Object.keys(ISSUE_TITLE_MAP).sort((a, b) => b.length - a.length);
  for (const key of sortedKeys) {
    if (lowerText.includes(key)) return ISSUE_TITLE_MAP[key];
  }
  const cleaned     = issueText.trim().replace(/\s+/g, ' ');
  const capitalized = cleaned.charAt(0).toUpperCase() + cleaned.slice(1);
  return {
    title:       capitalized.length > 60 ? capitalized.substring(0, 60) + '...' : capitalized,
    description: `User reported: ${cleaned}`,
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// POST /api/corporate/analyze-issue
// 1. Check ResolutionKB FIRST — if match found, return KB suggestion
// 2. Check for duplicate open tickets for this user
// 3. Fall back to IssueKB team routing → ticket preview
// ─────────────────────────────────────────────────────────────────────────────
router.post('/analyze-issue', async (req, res) => {
  try {
    const { userId, issueText, forceDuplicate } = req.body;
    if (!userId || !issueText) return res.status(400).json({ error: 'userId and issueText are required.' });

    const rawWords   = extractRawWords(issueText);
    const cleanWords = extractWords(issueText);
    const userEntities = extractEntities(issueText);
    
    // Fetch available teams for Gemini
    const allTeams = await Team.find({}, 'name');
    const availableTeamNames = allTeams.map(t => t.name);

    // Run Gemini and Xenova embedding concurrently for speed
    let userEmbedding;
    let geminiAnalysis;
    try {
      const results = await Promise.all([
        generateEmbedding(issueText),
        analyzeTicketIssue(issueText, availableTeamNames)
      ]);
      userEmbedding = results[0];
      geminiAnalysis = results[1];
    } catch (err) {
      console.error('AI Processing error:', err);
      // Set fallback Geminis analysis with minimal data
      geminiAnalysis = null;
    }
    // If Gemini failed, ensure we have a safe fallback object
    if (!geminiAnalysis) {
      // Fallback to generic fields
      const fallbackTeam = await Team.findOne({ name: 'Support Team' }) || await Team.findOne();
      geminiAnalysis = {
        assignedTeamSuggestion: fallbackTeam ? fallbackTeam.name : 'Support Team',
        ticketTitle: 'Generic Issue',
        ticketDescription: issueText,
        category: 'General',
        priority: 'Medium',
      };
    }

    // -------------------------------
    // New Team Routing Logic (Keyword + Semantic)
    // -------------------------------
    const TeamRoutingRule = require('../models/TeamRoutingRule');
    const activeRules = await TeamRoutingRule.find({ status: 'Active' });

    // Helper to normalize text
    const normalize = txt => txt.toLowerCase().replace(/[^a-z0-9\s]/g, ' ');
    const issueWords = normalize(issueText).split(/\s+/).filter(Boolean);

    // Keyword matching
    let bestKeywordScore = 0;
    let bestKeywordRule = null;
    for (const rule of activeRules) {
      const ruleKeywords = (rule.keywords || []).map(k => k.toLowerCase());
      const matchCount = issueWords.filter(w => ruleKeywords.includes(w)).length;
      if (matchCount > bestKeywordScore) {
        bestKeywordScore = matchCount;
        bestKeywordRule = rule;
      }
    }

    let matchedRule = null;
    let confidenceScore = 0;
    let matchedKeywords = [];

    if (bestKeywordRule && bestKeywordScore > 0) {
      matchedRule = bestKeywordRule;
      confidenceScore = bestKeywordScore / (bestKeywordRule.keywords?.length || 1);
      matchedKeywords = bestKeywordRule.keywords.filter(k => issueWords.includes(k.toLowerCase()));
    } else {
      // Semantic similarity fallback using example embeddings
      let bestSim = -1;
      for (const rule of activeRules) {
        if (!rule.exampleEmbeddings || rule.exampleEmbeddings.length === 0) continue;
        for (const emb of rule.exampleEmbeddings) {
          const sim = cosineSimilarity(userEmbedding, emb);
          if (sim > bestSim) {
            bestSim = sim;
            matchedRule = rule;
          }
        }
      }
      if (matchedRule) {
        confidenceScore = bestSim;
      }
    }

    // Fallback to Service Desk team if no rule matched
    let fallbackTeam = await Team.findOne({ name: /service desk/i });
    if (!fallbackTeam) fallbackTeam = await Team.findOne();

    const finalTeamId = matchedRule ? matchedRule.teamId : fallbackTeam?._id || null;
    const finalTeamName = matchedRule ? matchedRule.teamName : fallbackTeam?.name || 'Service Desk';

    // ── Step 1: Search ResolutionKB first using embeddings ──────────────────
    if (!forceDuplicate) {
      const allKbs = await ResolutionKB.find({ knownFixSteps: { $not: { $size: 0 } } })
        .populate('assignedTeam', 'name');

      let bestKb = null;
      let bestKbScore = -1;

      for (const kb of allKbs) {
        if (kb.embedding && kb.embedding.length > 0) {
          let score = cosineSimilarity(userEmbedding, kb.embedding);

          // ── Keyword boost ──────────────────────────────────────────────
          // MiniLM gives low scores (~0.60-0.65) for short phrases.
          // Boost when user words appear in KB title/category/symptoms.
          const stopwords = new Set([
            'the', 'and', 'is', 'not', 'cannot', 'can', 'cant', 'able', 'unable', 'to', 'in', 'into', 'on', 'at', 'with', 'it', 'shows', 
            'site', 'be', 'reached', 'opening', 'application', 'url', 'issue', 'error', 'network', 'login', 'access', 
            'working', 'credentials', 'portal', 'check', 'please', 'after', 'even', 'entering', 'correct', 'am', 'i', 'my'
          ]);
          const userWords = issueText.toLowerCase().replace(/[^a-z0-9\s]/g, '').split(/\s+/);
          const kbSearchText = [
            kb.issueTitle,
            kb.category,
            ...(kb.symptoms || []),
            ...(kb.keywords || []),
          ].join(' ').toLowerCase();
          const matchingWords = userWords.filter(w => w.length > 2 && !stopwords.has(w) && kbSearchText.includes(w));
          const keywordBoost = Math.min(matchingWords.length * 0.08, 0.25);
          score += keywordBoost;

          // ── Entity safety check ────────────────────────────────────────
          const isSafe = checkEntitySafety(userEntities, kb.entities || {});
          if (!isSafe) {
            score -= 0.3; // Penalize conflicting entities
          }

          if (score > bestKbScore) {
            bestKbScore = score;
            bestKb = kb;
          }
        }
      }

      // Thresholds adjusted for MiniLM short-text scores (boosted with keywords):
      // strong >= 0.65, possible >= 0.50
      if (bestKb) {
        const payload = {
          _id:          bestKb._id,
          issueTitle:   bestKb.issueTitle,
          category:     bestKb.category,
          rootCause:    bestKb.rootCause,
          knownFixSteps: bestKb.knownFixSteps,
          successRate:  bestKb.successRate,
          assignedTeam: bestKb.assignedTeam?.name || 'Support Team',
          assignedTeamId: bestKb.assignedTeam?._id || null,
        };

        if (bestKbScore >= 0.65) {
          return res.json({
            kbMatchFound: true,
            matchType: 'strong',
            similarityScore: bestKbScore,
            message: 'Strong similar issue found. Please try the below steps first.',
            matchedKb: payload,
            geminiAnalysis // Provide this so frontend can create the ticket easily if needed
          });
        } else if (bestKbScore >= 0.50) {
          return res.json({
            kbMatchFound: true,
            matchType: 'possible',
            similarityScore: bestKbScore,
            message: 'A possibly similar issue was found. Please confirm if this looks related.',
            matchedKb: payload,
            geminiAnalysis // Provide this so frontend can create the ticket easily if needed
          });
        }
      }
    }

    // ── Step 2: Duplicate open-ticket detection ────────────────────────────
    if (!forceDuplicate) {
      const userTickets = await Ticket.find({
        raisedBy: userId,
        status: { $in: ['Open', 'Assigned', 'In Progress', 'Pending User Confirmation'] },
      }).populate('assignedTo', 'username');

      for (const ticket of userTickets) {
        const ticketWords = extractWords(
          `${ticket.ticketTitle} ${ticket.issueDescription} ${ticket.originalUserInput || ''}`
        );
        const matchCount = cleanWords.filter(w => ticketWords.includes(w)).length;
        if (matchCount > 3) {
          return res.json({
            duplicateFound: true,
            message: 'A similar ticket has already been raised.',
            ticketNumber: ticket.ticketNumber,
            ticketTitle:  ticket.ticketTitle,
            status:       ticket.status,
            assignedTo:   ticket.assignedTo?.username || 'Unassigned',
            createdAt:    ticket.createdAt,
          });
        }
      }
    }

    // ── Step 3: Map Gemini's suggested team to a real Team ID ──────────────
    let matchedTeamId = null;
    if (geminiAnalysis.assignedTeamSuggestion) {
      const matchedTeam = allTeams.find(t => t.name.toLowerCase() === geminiAnalysis.assignedTeamSuggestion.toLowerCase());
      if (matchedTeam) {
        matchedTeamId = matchedTeam._id;
      }
    }
    
    // Fallback if Gemini suggested an invalid team
    if (!matchedTeamId) {
      const fallbackTeam = allTeams.find(t => t.name === 'Desktop Support Team') || allTeams[0];
      matchedTeamId = fallbackTeam ? fallbackTeam._id : null;
      geminiAnalysis.assignedTeamSuggestion = fallbackTeam ? fallbackTeam.name : 'Unassigned';
    }

    // ── Step 4: Build ticket preview from Gemini ───────────────────────────
    const ticketPreview = {
      ticketTitle:       geminiAnalysis.ticketTitle,
      ticketDescription: geminiAnalysis.ticketDescription,
      category:          geminiAnalysis.category,
      assignedTeam:      finalTeamName,
      assignedTeamId:    finalTeamId,
      priority:          geminiAnalysis.priority,
      originalUserInput: issueText,
      extractedEntities: userEntities,
      matchedKeywords:   matchedKeywords,
      confidenceScore:   confidenceScore
    };

    return res.json({ duplicateFound: false, kbMatchFound: false, ticketPreview });
  } catch (err) {
    console.error('analyze-issue error:', err);
    return res.status(500).json({ error: 'Internal server error.' });
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// POST /api/corporate/create-ticket
// Standard ticket creation (no KB attempt, or KB attempt failed)
// ─────────────────────────────────────────────────────────────────────────────
router.post('/create-ticket', async (req, res) => {
  try {
    const { userId, ticketTitle, ticketDescription, originalUserInput, category, assignedTeamId, priority, extractedEntities, matchedKbId, kbSimilarityScore } = req.body;
    if (!userId || !ticketTitle || !ticketDescription) {
      return res.status(400).json({ error: 'userId, ticketTitle, and ticketDescription are required.' });
    }

    const ticket = await Ticket.create({
      ticketNumber:     'TICK-' + Date.now(),
      ticketTitle,
      raisedBy:         userId,
      issueDescription: ticketDescription,
      originalUserInput: originalUserInput || '',
      extractedEntities: extractedEntities || {},
      matchedKbId:      matchedKbId || null,
      kbSimilarityScore:kbSimilarityScore || null,
      category:         category || 'General IT Support',
      assignedTeam:     assignedTeamId || null,
      assignedTo:       null,
      priority:         priority || 'Medium',
      status:           'Open',
    });

    return res.status(201).json({ success: true, ticket });
  } catch (err) {
    console.error('create-ticket error:', err);
    return res.status(500).json({ error: 'Internal server error.' });
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// POST /api/corporate/create-ticket-after-kb-failed
// Called when user says "Still Not Resolved" and clicks "Create Ticket"
// Body: { userId, ticketTitle, ticketDescription, category, assignedTeamId,
//         priority, attemptedKbId, attemptedResolutionSteps }
// ─────────────────────────────────────────────────────────────────────────────
router.post('/create-ticket-after-kb-failed', async (req, res) => {
  try {
    const {
      userId, ticketTitle, ticketDescription, originalUserInput,
      category, assignedTeamId, priority,
      attemptedKbId, attemptedResolutionSteps,
    } = req.body;

    if (!userId || !ticketTitle) {
      return res.status(400).json({ error: 'userId and ticketTitle are required.' });
    }

    const ticket = await Ticket.create({
      ticketNumber:             'TICK-' + Date.now(),
      ticketTitle,
      raisedBy:                 userId,
      issueDescription:         ticketDescription || ticketTitle,
      originalUserInput:        originalUserInput || '',
      category:                 category || 'General IT Support',
      assignedTeam:             assignedTeamId || null,
      priority:                 priority || 'Medium',
      status:                   'Open',
      attemptedKbId:            attemptedKbId || null,
      attemptedResolutionSteps: attemptedResolutionSteps || '',
      userSaidKbFailed:         true,
    });

    // Mark the KB entry as failed (+1 failedCount, recompute successRate)
    if (attemptedKbId) {
      const kb = await ResolutionKB.findById(attemptedKbId);
      if (kb) {
        kb.failedCount += 1;
        kb.solvedCount = Math.max(kb.solvedCount, kb.successCount + kb.failedCount);
        if (kb.solvedCount > 0) kb.successRate = Math.round((kb.successCount / kb.solvedCount) * 100);
        kb.lastUpdatedAt = new Date();
        await kb.save();
      }
    }

    return res.status(201).json({ success: true, ticket });
  } catch (err) {
    console.error('create-ticket-after-kb-failed error:', err);
    return res.status(500).json({ error: 'Internal server error.' });
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// POST /api/corporate/kb-resolution-success
// Called when corporate user clicks "Issue Resolved" on a KB suggestion
// Body: { userId, kbId }
// ─────────────────────────────────────────────────────────────────────────────
router.post('/kb-resolution-success', async (req, res) => {
  try {
    const { userId, kbId } = req.body;
    if (!kbId) return res.status(400).json({ error: 'kbId is required.' });

    const kb = await ResolutionKB.findById(kbId);
    if (!kb) return res.status(404).json({ error: 'KB entry not found.' });

    kb.successCount += 1;
    kb.solvedCount   = Math.max(kb.solvedCount, kb.successCount + kb.failedCount);
    if (kb.solvedCount > 0) kb.successRate = Math.round((kb.successCount / kb.solvedCount) * 100);
    kb.lastUpdatedAt = new Date();
    await kb.save();

    // Log activity (no ticketId for pure KB resolve)
    console.log(`[KB] User ${userId} resolved via KB ${kbId}. successRate: ${kb.successRate}%`);

    return res.json({ success: true, message: 'Knowledge base success recorded.', kb });
  } catch (err) {
    console.error('kb-resolution-success error:', err);
    return res.status(500).json({ error: 'Internal server error.' });
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// PATCH /api/corporate/tickets/:ticketId/confirm-resolution
// Corporate user confirms the issue is resolved → status: Closed
// Body: { userId }
// ─────────────────────────────────────────────────────────────────────────────
router.patch('/tickets/:ticketId/confirm-resolution', async (req, res) => {
  const { ticketId } = req.params;
  const { userId }   = req.body;

  try {
    const ticket = await Ticket.findById(ticketId);
    if (!ticket) return res.status(404).json({ message: 'Ticket not found' });

    const oldStatus = ticket.status;
    ticket.status                 = 'Closed';
    ticket.closedAt               = new Date();
    ticket.closedBy               = userId;
    ticket.userConfirmationStatus = 'confirmed';
    ticket.forceClosed            = false;
    ticket.updatedAt              = new Date();
    await ticket.save();

    // Log
    await logTicketAction({
      ticketId: ticket._id,
      action: 'Corporate user confirmed issue resolved',
      oldStatus,
      newStatus: 'Closed',
      performedBy: userId,
    });

    // Upsert resolution into KB if eligible
    await upsertResolutionKB(ticket);

    // Update KB successCount if upsert ran
    if (ticket.reusableFix && ticket.rootCause && ticket.resolutionSteps) {
      const kb = await ResolutionKB.findOne({
        issueTitle: { $regex: new RegExp(ticket.ticketTitle.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i') },
      });
      if (kb) {
        kb.successCount += 1;
        if (kb.solvedCount > 0) kb.successRate = Math.round((kb.successCount / kb.solvedCount) * 100);
        kb.lastUpdatedAt = new Date();
        await kb.save();
      }
    }

    // Notify support user
    if (ticket.assignedTo) {
      await notify(
        ticket.assignedTo,
        `Corporate user confirmed resolution on ticket ${ticket.ticketNumber}. Ticket is now Closed.`,
        ticket._id
      );
    }

    const populated = await Ticket.findById(ticket._id)
      .populate('raisedBy',     'username name')
      .populate('assignedTeam', 'name')
      .populate('assignedTo',   'username name')
      .populate('closedBy',     'username');

    res.json({ success: true, ticket: populated });
  } catch (err) {
    console.error('confirm-resolution error:', err);
    res.status(500).json({ message: 'Server error' });
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// PATCH /api/corporate/tickets/:ticketId/reopen
// Corporate user says "Still Facing Issue" → status back to In Progress
// Body: { userId, remarks }
// ─────────────────────────────────────────────────────────────────────────────
router.patch('/tickets/:ticketId/reopen', async (req, res) => {
  const { ticketId } = req.params;
  const { userId, remarks } = req.body;

  try {
    const ticket = await Ticket.findById(ticketId);
    if (!ticket) return res.status(404).json({ message: 'Ticket not found' });

    const oldStatus = ticket.status;
    ticket.status                 = 'In Progress';
    ticket.userConfirmationStatus = 'reopened';
    ticket.userReopenRemarks      = remarks || '';
    ticket.updatedAt              = new Date();
    await ticket.save();

    // Log
    await logTicketAction({
      ticketId: ticket._id,
      action: 'Corporate user reopened — issue still not resolved',
      oldStatus,
      newStatus: 'In Progress',
      performedBy: userId,
      remarks: remarks || '',
    });

    // Update KB failedCount
    if (ticket.reusableFix && ticket.rootCause) {
      const kb = await ResolutionKB.findOne({
        issueTitle: { $regex: new RegExp(ticket.ticketTitle.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i') },
      });
      if (kb) {
        kb.failedCount += 1;
        if (kb.solvedCount > 0) kb.successRate = Math.round((kb.successCount / kb.solvedCount) * 100);
        kb.lastUpdatedAt = new Date();
        await kb.save();
      }
    }

    // Notify assigned support user
    if (ticket.assignedTo) {
      await notify(
        ticket.assignedTo,
        `Corporate user said the issue is still not resolved on ticket ${ticket.ticketNumber}. Remarks: ${remarks || 'No remarks'}. Please investigate further.`,
        ticket._id
      );
    }

    const populated = await Ticket.findById(ticket._id)
      .populate('raisedBy',     'username name')
      .populate('assignedTeam', 'name')
      .populate('assignedTo',   'username name');

    res.json({ success: true, ticket: populated });
  } catch (err) {
    console.error('reopen error:', err);
    res.status(500).json({ message: 'Server error' });
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/corporate/my-tickets/:userId
// Paginated, filterable ticket list for corporate user
// ─────────────────────────────────────────────────────────────────────────────
router.get('/my-tickets/:userId', async (req, res) => {
  try {
    const { userId } = req.params;
    const { status, category, search, page = 1, limit = 10 } = req.query;

    const filter = { raisedBy: userId };
    if (status)   filter.status   = status;
    if (category) filter.category = category;
    if (search) {
      filter.$or = [
        { ticketNumber: { $regex: search, $options: 'i' } },
        { ticketTitle:  { $regex: search, $options: 'i' } },
      ];
    }

    const pageNum  = parseInt(page,  10) || 1;
    const limitNum = parseInt(limit, 10) || 10;
    const skip     = (pageNum - 1) * limitNum;

    const [tickets, total] = await Promise.all([
      Ticket.find(filter)
        .populate('raisedBy',     'username')
        .populate('assignedTeam', 'name')
        .populate('assignedTo',   'username name')
        .populate('closedBy',     'username')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limitNum),
      Ticket.countDocuments(filter),
    ]);

    return res.json({ tickets, total, page: pageNum, totalPages: Math.ceil(total / limitNum) });
  } catch (err) {
    console.error('my-tickets error:', err);
    return res.status(500).json({ error: 'Internal server error.' });
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/corporate/notifications/:userId
// ─────────────────────────────────────────────────────────────────────────────
router.get('/notifications/:userId', async (req, res) => {
  try {
    const notifications = await Notification.find({ userId: req.params.userId })
      .populate('ticketId', 'ticketNumber ticketTitle')
      .sort({ createdAt: -1 });
    return res.json({ notifications });
  } catch (err) {
    console.error('notifications error:', err);
    return res.status(500).json({ error: 'Internal server error.' });
  }
});

module.exports = router;
