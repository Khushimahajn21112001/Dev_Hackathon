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
const ActivityLog = require('../models/ActivityLog');
const { retrieveRelevantResolutions, buildRagContext, buildOfflineFallback, generateRagAnswer, updateRagSuccess, updateRagFailure, RAG_MATCH_THRESHOLD, deduplicateSteps } = require('../services/ragService');

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

async function notifyAdmins(message, ticketId) {
  const User = require('../models/User');
  const admins = await User.find({ role: 'Admin' });
  for (const admin of admins) {
    await notify(admin._id, message, ticketId);
  }
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
  // VPN / Remote Access
  vpn:            { title: 'VPN Connection Failing or Unable to Connect',         description: 'User is unable to establish a VPN connection to the corporate network.', category: 'Network / Connectivity' },
  'remote access':{ title: 'Remote Access Connection Not Working',                description: 'User is experiencing issues connecting via remote access tools.', category: 'Network / Connectivity' },

  // Applications
  jira:           { title: 'Jira Application Not Accessible or Responding',       description: 'User is unable to access or use the Jira application.', category: 'Application Support' },
  confluence:     { title: 'Confluence Page Not Loading or Inaccessible',          description: 'User is unable to access or use the Confluence application.', category: 'Application Support' },
  bitbucket:      { title: 'Bitbucket Repository Access or Connectivity Issue',   description: 'User is unable to access or use the Bitbucket application.', category: 'Application Support' },
  'power bi':     { title: 'Power BI Application Fails to Launch',                description: 'User is unable to open the Power BI application on their device.', category: 'Application Support' },
  powerbi:        { title: 'Power BI Application Fails to Launch',                description: 'User is unable to open the Power BI application on their device.', category: 'Application Support' },
  outlook:        { title: 'Outlook Email Client Not Working or Not Syncing',      description: 'User is unable to send/receive emails or Outlook is not syncing properly.', category: 'Application Support' },
  teams:          { title: 'Microsoft Teams Not Loading or Crashing',              description: 'User is experiencing issues with Microsoft Teams — it is not loading or keeps crashing.', category: 'Application Support' },
  chrome:         { title: 'Chrome Browser Not Opening or Blocked',                description: 'User is unable to open or use the Chrome browser on their device.', category: 'Desktop / Endpoint Support' },
  excel:          { title: 'Excel Application Not Responding or Crashing',         description: 'User is experiencing issues with Microsoft Excel — it is not responding or crashing.', category: 'Application Support' },

  // Endpoint / Desktop
  laptop:         { title: 'Laptop Running Slow or Not Responding Properly',       description: 'User is experiencing slow laptop performance — applications are taking longer to open and system response is delayed.', category: 'Desktop / Endpoint Support' },
  'blue screen':  { title: 'Blue Screen of Death (BSOD) Error on Workstation',     description: 'User is encountering blue screen (BSOD) errors on their workstation, causing unexpected reboots.', category: 'Desktop / Endpoint Support' },
  slow:           { title: 'System Running Slow and Delayed Response',             description: 'User reports that their system is running significantly slower than expected, affecting daily work.', category: 'Desktop / Endpoint Support' },
  freeze:         { title: 'System Freezing Intermittently During Use',             description: 'User reports that their system is freezing intermittently during regular work, requiring forced restarts.', category: 'Desktop / Endpoint Support' },
  hang:           { title: 'System Hanging and Becoming Unresponsive',             description: 'User reports that their system hangs and becomes unresponsive, requiring a restart.', category: 'Desktop / Endpoint Support' },

  // Network
  wifi:           { title: 'Unable to Connect to Company Wi-Fi Network',           description: 'User is unable to connect to the corporate wireless network on their device.', category: 'Network / Connectivity' },
  'wi-fi':        { title: 'Unable to Connect to Company Wi-Fi Network',           description: 'User is unable to connect to the corporate wireless network on their device.', category: 'Network / Connectivity' },
  internet:       { title: 'Internet or Website Not Accessible on Corporate Network', description: 'User is unable to access an internet resource or website while on the corporate network.', category: 'Network / Connectivity' },
  network:        { title: 'Network Connection Dropping or Not Working',           description: 'User is experiencing network connectivity problems — connection is intermittent or unavailable.', category: 'Network / Connectivity' },
  dns:            { title: 'DNS Resolution Failing for Specific Domains',          description: 'User is experiencing DNS resolution failures — certain websites or services are not resolving.', category: 'Network / Connectivity' },

  // Identity & Access
  password:       { title: 'Password Reset or Account Unlock Required',            description: 'User requires assistance with resetting their password or unlocking their account.', category: 'Identity & Access' },
  'access denied':{ title: 'Access Denied Error When Opening Application or Resource', description: 'User is receiving an Access Denied error when trying to open an application or access a resource.', category: 'Identity & Access' },
  locked:         { title: 'User Account Locked Out',                              description: 'User account has been locked out and they are unable to log in to their system.', category: 'Identity & Access' },

  // Peripherals
  email:          { title: 'Email Not Sending or Receiving Messages',              description: 'User is unable to send or receive emails through their email client.', category: 'Application Support' },
  printer:        { title: 'Printer Not Responding or Unable to Print',            description: 'User is unable to print documents — the printer is not responding or not detected by the system.', category: 'Desktop / Endpoint Support' },
};

function generateTicketDetails(issueText) {
  const lowerText = issueText.toLowerCase();
  const sortedKeys = Object.keys(ISSUE_TITLE_MAP).sort((a, b) => b.length - a.length);
  for (const key of sortedKeys) {
    if (lowerText.includes(key)) {
      const entry = ISSUE_TITLE_MAP[key];
      return {
        title: entry.title,
        description: entry.description,
        category: entry.category || 'Service Desk',
      };
    }
  }
  // Smart fallback: capitalize and clean user input as the title
  const cleaned = issueText.trim().replace(/\s+/g, ' ');
  const capitalized = cleaned.charAt(0).toUpperCase() + cleaned.slice(1);
  const title = capitalized.length > 80 ? capitalized.substring(0, 77) + '...' : capitalized;
  return {
    title,
    description: `User reported: "${cleaned}". Please investigate and assist the user.`,
    category: 'Service Desk',
  };
}

// GET /api/corporate/teams - Get active teams for dropdown
router.get('/teams', async (req, res) => {
  try {
    const teams = await Team.find({ status: 'Active' }, 'name _id');
    return res.json({ teams });
  } catch (err) {
    return res.status(500).json({ error: 'Failed to fetch teams.' });
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// POST /api/corporate/analyze-issue
// OPTIMIZED FLOW:
//   1. Duplicate open-ticket check (no AI)
//   2. Xenova embedding → MongoDB KB search (no Gemini)
//   3. If score >= 0.65 → send top 3 KB records to Gemini for summarization
//   4. If Gemini fails/times out → offline KB fallback
//   5. If no KB match → Gemini ticket preview (lazy, only when needed)
// Gemini is ONLY used as a "response writer", never for searching.
// ─────────────────────────────────────────────────────────────────────────────
router.post('/analyze-issue', async (req, res) => {
  const totalStart = Date.now();
  const timing = { duplicateCheckMs: 0, embeddingMs: 0, kbSearchMs: 0, geminiMs: 0, totalMs: 0 };

  try {
    const { userId, issueText, forceDuplicate } = req.body;
    if (!userId || !issueText) return res.status(400).json({ error: 'userId and issueText are required.' });

    const cleanWords = extractWords(issueText);
    const userEntities = extractEntities(issueText);

    // ── Step 1: Duplicate open-ticket detection (no AI) ────────────────────
    const dupStart = Date.now();
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
          timing.duplicateCheckMs = Date.now() - dupStart;
          timing.totalMs = Date.now() - totalStart;
          console.log(`[PERF] analyze-issue: duplicate found`, timing);
          return res.json({
            duplicateFound: true,
            ragUsed: false,
            geminiUsed: false,
            aiFallbackUsed: false,
            message: 'A similar ticket has already been raised.',
            ticketNumber: ticket.ticketNumber,
            ticketTitle:  ticket.ticketTitle,
            status:       ticket.status,
            assignedTo:   ticket.assignedTo?.username || 'Unassigned',
            createdAt:    ticket.createdAt,
            timing
          });
        }
      }
    }
    timing.duplicateCheckMs = Date.now() - dupStart;

    // ── Step 2: Xenova Semantic Search + KB Retrieval (NO Gemini) ───────────
    let ragUsed = false;
    let geminiUsed = false;
    let aiFallbackUsed = false;
    let matchScore = 0;

    if (!forceDuplicate) {
      const searchResult = await retrieveRelevantResolutions(issueText);
      const relevantRecords = searchResult.records;
      timing.embeddingMs = searchResult.embeddingMs;
      timing.kbSearchMs = searchResult.kbSearchMs;

      // Check if top match meets threshold
      if (relevantRecords.length > 0 && relevantRecords[0].score >= RAG_MATCH_THRESHOLD) {
        ragUsed = true;
        matchScore = relevantRecords[0].score;

        // Determine match strength
        const matchType = matchScore >= 0.80 ? 'strong' : 'possible';
        let ragResponse = null;

        if (matchType === 'strong') {
          // ── Step 3: Gemini summarization (ONLY role: writer) ─────────────────
          const geminiStart = Date.now();
          const context = buildRagContext(relevantRecords);
          ragResponse = await generateRagAnswer(issueText, context);
          timing.geminiMs = Date.now() - geminiStart;

          if (ragResponse && ragResponse.ragAnswerAvailable) {
            geminiUsed = true;
          } else {
            // ── Step 4: Offline KB fallback (Gemini failed/timed out) ──────────
            console.log('[RAG] Gemini failed/timed out. Using offline KB fallback.');
            ragResponse = buildOfflineFallback(relevantRecords);
            aiFallbackUsed = true;
          }
        } else {
          // Possible Match (0.60 - 0.79) - Ask for confirmation
          console.log('[RAG] Possible match detected. Asking for user confirmation.');
          ragResponse = {
            ragAnswerAvailable: true,
            summary: `We found a known issue that might be related: "${relevantRecords[0].kb.issueTitle}". Is this what you are experiencing?`,
            recommendedSteps: deduplicateSteps(relevantRecords[0].kb.knownFixSteps || []),
            possibleRootCauses: [relevantRecords[0].kb.rootCause || relevantRecords[0].kb.rootCauseCategory || 'Unknown'],
            recommendedTeam: relevantRecords[0].kb.assignedTeam?.name || '',
            confidence: 'Medium',
            requiresConfirmation: true
          };
        }

        // Fetch team info for the response
        let fallbackTeam = await Team.findOne({ name: /service desk/i, status: 'Active' });
        if (!fallbackTeam) fallbackTeam = await Team.findOne({ status: 'Active' });
        const finalTeamName = fallbackTeam?.name || 'Service Desk';

        timing.totalMs = Date.now() - totalStart;
        console.log(`[PERF] analyze-issue: RAG response`, { ragUsed, geminiUsed, aiFallbackUsed, matchScore: matchScore.toFixed(3), ...timing });

        return res.json({
          duplicateFound: false,
          ragUsed,
          geminiUsed,
          aiFallbackUsed,
          ragAnswerAvailable: true,
          matchType,
          matchScore,
          ragResponse: {
            ...ragResponse,
            recommendedTeam: ragResponse.recommendedTeam || finalTeamName
          },
          ragContext: relevantRecords.map(r => ({
            kbId: r.kb._id,
            issueTitle: r.kb.issueTitle,
            similarityScore: r.semanticScore,
            finalScore: r.score,
            problemFamily: r.kb.problemFamily,
            rootCauseCategory: r.kb.rootCauseCategory
          })),
          timing
        });
      }
    }

    // ── Step 5: No KB match → Ticket Preview ────────────────────────────────
    // Only now call Gemini for ticket classification (lazy — avoids Gemini if RAG handled it)
    const allTeams = await Team.find({ status: 'Active' }, 'name');
    const availableTeamNames = allTeams.map(t => t.name);

    let geminiAnalysis = null;
    const geminiStart = Date.now();
    try {
      geminiAnalysis = await analyzeTicketIssue(issueText, availableTeamNames);
      geminiUsed = true;
    } catch (err) {
      console.error('[PERF] Gemini ticket analysis failed:', err.message);
    }
    timing.geminiMs = Date.now() - geminiStart;

    // Fallback if Gemini failed
    if (!geminiAnalysis) {
      const fallbackTeam = await Team.findOne({ name: 'Support Team', status: 'Active' }) || await Team.findOne({ status: 'Active' });
      const generated = generateTicketDetails(issueText);
      geminiAnalysis = {
        assignedTeamSuggestion: fallbackTeam ? fallbackTeam.name : 'Support Team',
        ticketTitle: generated.title,
        ticketDescription: generated.description,
        category: generated.category || 'Service Desk',
        priority: 'Medium',
      };
      aiFallbackUsed = true;
    }

    // Team routing: keyword rules → semantic rules → Gemini suggestion → fallback
    const TeamRoutingRule = require('../models/TeamRoutingRule');
    const activeRules = await TeamRoutingRule.find({ status: 'Active' });

    const normalize = txt => txt.toLowerCase().replace(/[^a-z0-9\s]/g, ' ');
    const issueWords = normalize(issueText).split(/\s+/).filter(Boolean);

    let bestKeywordScore = 0;
    let bestKeywordRule = null;
    for (const rule of activeRules) {
      const ruleKeywords = (rule.keywords || []).map(k => k.toLowerCase());
      const mc = issueWords.filter(w => ruleKeywords.includes(w)).length;
      if (mc > bestKeywordScore) {
        bestKeywordScore = mc;
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
      // Generate embedding only if we don't already have one from RAG search
      let userEmbedding;
      try {
        userEmbedding = await generateEmbedding(issueText);
      } catch (e) {
        userEmbedding = null;
      }
      if (userEmbedding) {
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
        if (matchedRule) confidenceScore = bestSim;
      }
    }

    let fallbackTeam = await Team.findOne({ name: /service desk/i, status: 'Active' });
    if (!fallbackTeam) fallbackTeam = await Team.findOne({ status: 'Active' });

    // Map Gemini's suggested team to a real Team ID
    let matchedTeamId = null;
    let matchedTeamName = null;
    if (geminiAnalysis.assignedTeamSuggestion) {
      const matchedTeam = allTeams.find(t => t.name.toLowerCase() === geminiAnalysis.assignedTeamSuggestion.toLowerCase());
      if (matchedTeam) {
        matchedTeamId = matchedTeam._id;
        matchedTeamName = matchedTeam.name;
      }
    }
    if (!matchedTeamId) {
      const fb = allTeams.find(t => t.name === 'Desktop Support Team') || allTeams[0];
      matchedTeamId = fb ? fb._id : null;
      matchedTeamName = fb ? fb.name : 'Unassigned';
    }

    const assignedTeamToUse = matchedRule ? matchedRule.teamName : matchedTeamName;
    const assignedTeamIdToUse = matchedRule ? matchedRule.teamId : matchedTeamId;

    // Build ticket preview
    const ticketPreview = {
      ticketTitle:       geminiAnalysis.ticketTitle,
      ticketDescription: geminiAnalysis.ticketDescription,
      category:          geminiAnalysis.category,
      assignedTeam:      assignedTeamToUse,
      assignedTeamId:    assignedTeamIdToUse,
      priority:          geminiAnalysis.priority,
      originalUserInput: issueText,
      extractedEntities: userEntities,
      matchedKeywords:   matchedKeywords,
      confidenceScore:   confidenceScore
    };

    timing.totalMs = Date.now() - totalStart;
    console.log(`[PERF] analyze-issue: ticket preview`, { ragUsed, geminiUsed, aiFallbackUsed, ...timing });

    return res.json({
      duplicateFound: false,
      ragUsed,
      geminiUsed,
      aiFallbackUsed,
      kbMatchFound: false,
      ticketPreview,
      timing
    });
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
    const { userId, ticketTitle, ticketDescription, originalUserInput, category, assignedTeamId, priority, extractedEntities, matchedKbId, kbSimilarityScore, userEditedTitle, userEditedDescription, userEditedCategory, userEditedTeam, userEditedPriority, additionalComments, aiPreviewEdited, reanalysisRequested, routingConfidence, routingReason } = req.body;
    
    console.log('[create-ticket] received:', { userId, ticketTitle: ticketTitle?.substring(0, 50), ticketDescription: ticketDescription?.substring(0, 50), category, priority });
    
    if (!userId || !ticketTitle || !ticketDescription) {
      console.log('[create-ticket] missing required fields:', { userId: !!userId, ticketTitle: !!ticketTitle, ticketDescription: !!ticketDescription });
      return res.status(400).json({ error: 'userId, ticketTitle, and ticketDescription are required.' });
    }

    // Sanitize priority to valid enum values
    const validPriorities = ['Low', 'Medium', 'High', 'Critical'];
    const sanitizedPriority = validPriorities.includes(priority) ? priority : 'Medium';

    const ticket = await Ticket.create({
      ticketNumber:     'TICK-' + Date.now(),
      ticketTitle,
      raisedBy:         userId,
      issueDescription: ticketDescription,
      originalUserInput: originalUserInput || '',
      extractedEntities: extractedEntities || {},
      matchedKbId:      matchedKbId || null,
      kbSimilarityScore:kbSimilarityScore || null,
      userEditedTitle:       userEditedTitle || '',
      userEditedDescription: userEditedDescription || '',
      userEditedCategory:    userEditedCategory || '',
      userEditedTeam:        userEditedTeam || '',
      userEditedPriority:    userEditedPriority || '',
      additionalComments:    additionalComments || '',
      aiPreviewEdited:       aiPreviewEdited || false,
      reanalysisRequested:   reanalysisRequested || false,
      routingConfidence:     routingConfidence || '',
      routingReason:         routingReason || '',
      category:         category || 'General IT Support',
      assignedTeam:     assignedTeamId || null,
      assignedTo:       null,
      priority:         sanitizedPriority,
      status:           'Open',
    });

    console.log('[create-ticket] SUCCESS - ticketNumber:', ticket.ticketNumber);

    const User = require('../models/User');
    const corporateUser = await User.findById(userId);
    const corpName = corporateUser ? (corporateUser.name || corporateUser.username) : 'Corporate User';
    await notifyAdmins(`New ticket created by ${corpName} - Ticket #${ticket.ticketNumber}`, ticket._id);

    return res.status(201).json({ success: true, ticket });
  } catch (err) {
    console.error('create-ticket error:', err.message, err.errors ? JSON.stringify(err.errors) : '');
    return res.status(500).json({ error: 'Internal server error.', details: err.message });
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// POST /api/corporate/reanalyze-ticket-preview
// Re-analyze an edited ticket preview using AI before creation
// ─────────────────────────────────────────────────────────────────────────────
router.post('/reanalyze-ticket-preview', async (req, res) => {
  try {
    const { userId, originalUserInput, ticketTitle, ticketDescription, category, assignedTeam, priority, additionalComments } = req.body;
    if (!userId) return res.status(400).json({ error: 'userId is required.' });

    // Combine context for re-analysis
    const combinedText = [
      ticketTitle || '',
      ticketDescription || '',
      additionalComments || '',
      originalUserInput || ''
    ].filter(Boolean).join('. ');

    const allTeams = await Team.find({ status: 'Active' }, 'name _id');
    const availableTeamNames = allTeams.map(t => t.name);

    // Call Gemini for re-analysis
    let geminiAnalysis = null;
    try {
      geminiAnalysis = await analyzeTicketIssue(combinedText, availableTeamNames);
    } catch (err) {
      console.error('[reanalyze] Gemini re-analysis failed:', err.message);
    }

    if (!geminiAnalysis) {
      // If AI fails, return user's edited values as-is
      return res.json({
        ticketTitle: ticketTitle || 'IT Support Request',
        ticketDescription: ticketDescription || originalUserInput || '',
        category: category || 'Service Desk',
        assignedTeam: assignedTeam || 'Service Desk',
        assignedTeamId: null,
        priority: priority || 'Medium',
        confidenceScore: 0,
        routingReason: 'AI re-analysis was unavailable. User-edited values preserved.',
        aiFailed: true
      });
    }

    // Map suggested team to real Team ID
    let matchedTeamId = null;
    let matchedTeamName = geminiAnalysis.assignedTeamSuggestion || assignedTeam || 'Service Desk';
    const matchedTeam = allTeams.find(t => t.name.toLowerCase() === matchedTeamName.toLowerCase());
    if (matchedTeam) {
      matchedTeamId = matchedTeam._id;
      matchedTeamName = matchedTeam.name;
    } else {
      const fb = allTeams.find(t => t.name === 'Desktop Support Team') || allTeams[0];
      if (fb) { matchedTeamId = fb._id; matchedTeamName = fb.name; }
    }

    return res.json({
      ticketTitle: geminiAnalysis.ticketTitle || ticketTitle,
      ticketDescription: geminiAnalysis.ticketDescription || ticketDescription,
      category: geminiAnalysis.category || category || 'Service Desk',
      assignedTeam: matchedTeamName,
      assignedTeamId: matchedTeamId,
      priority: geminiAnalysis.priority || priority || 'Medium',
      confidenceScore: geminiAnalysis.confidence || 'Medium',
      routingReason: geminiAnalysis.reason || 'Re-analyzed by AI based on updated issue details.',
      aiFailed: false
    });
  } catch (err) {
    console.error('reanalyze-ticket-preview error:', err);
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

    const User = require('../models/User');
    const corporateUser = await User.findById(userId);
    const corpName = corporateUser ? (corporateUser.name || corporateUser.username) : 'Corporate User';
    await notifyAdmins(`New ticket created by ${corpName} - Ticket #${ticket.ticketNumber}`, ticket._id);

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

    // Notify corporate user
    await notify(
      ticket.raisedBy,
      `Your ticket #${ticket.ticketNumber} has been closed successfully.`,
      ticket._id
    );

    // Notify admins
    const User = require('../models/User');
    const assignedUserObj = ticket.assignedTo ? await User.findById(ticket.assignedTo) : null;
    const supportName = assignedUserObj ? (assignedUserObj.name || assignedUserObj.username) : 'Unassigned';
    await notifyAdmins(`Ticket #${ticket.ticketNumber} has been closed by ${supportName}`, ticket._id);


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

// ─────────────────────────────────────────────────────────────────────────────
// POST /api/corporate/rag-success
// Called when corporate user says RAG steps worked
// ─────────────────────────────────────────────────────────────────────────────
router.post('/rag-success', async (req, res) => {
  try {
    const { userId, issueText, ragContextIds, recommendedSteps } = req.body;
    
    // Log success
    await ActivityLog.create({
      userId,
      action: 'RAG Success',
      issueText: issueText || '',
      ragUsed: true,
      ragResult: 'success',
    });

    if (ragContextIds && ragContextIds.length > 0) {
      await updateRagSuccess(ragContextIds);
    }

    return res.json({ success: true, message: 'RAG success recorded.' });
  } catch (err) {
    console.error('rag-success error:', err);
    return res.status(500).json({ error: 'Internal server error.' });
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// POST /api/corporate/create-ticket-after-rag-failed
// Called when corporate user says RAG steps did not work
// ─────────────────────────────────────────────────────────────────────────────
router.post('/create-ticket-after-rag-failed', async (req, res) => {
  try {
    const {
      userId, issueText, ticketTitle, ticketDescription, category,
      ragContextIds, attemptedRagSteps, recommendedTeamId
    } = req.body;

    if (!userId || !issueText) {
      return res.status(400).json({ error: 'userId and issueText are required.' });
    }

    let teamId = null;
    if (recommendedTeamId) {
      if (mongoose.Types.ObjectId.isValid(recommendedTeamId)) {
        teamId = recommendedTeamId;
      } else {
        // Look up team by name (case-insensitive)
        const team = await Team.findOne({ name: { $regex: new RegExp('^' + recommendedTeamId.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '$', 'i') } });
        if (team) {
          teamId = team._id;
        } else {
          // Smart fallback: try to find Desktop Support Team or first active team
          const fallbackTeam = await Team.findOne({ name: /desktop support/i, status: 'Active' }) || await Team.findOne({ status: 'Active' });
          if (fallbackTeam) teamId = fallbackTeam._id;
        }
      }
    } else {
      // Default fallback if no team recommended
      const fallbackTeam = await Team.findOne({ name: /desktop support/i, status: 'Active' }) || await Team.findOne({ status: 'Active' });
      if (fallbackTeam) teamId = fallbackTeam._id;
    }

    let computedTitle = ticketTitle;
    if (!computedTitle || computedTitle === 'Issue reported via RAG') {
      const cleaned = (issueText || '').trim().replace(/\s+/g, ' ');
      const capitalized = cleaned.charAt(0).toUpperCase() + cleaned.slice(1);
      computedTitle = capitalized.length > 80 ? capitalized.substring(0, 77) + '...' : capitalized;
    }

    const ticket = await Ticket.create({
      ticketNumber:             'TICK-' + Date.now(),
      ticketTitle:              computedTitle || 'Issue reported via RAG',
      raisedBy:                 userId,
      issueDescription:         ticketDescription || issueText,
      originalUserInput:        issueText,
      category:                 category || 'General IT Support',
      assignedTeam:             teamId,
      priority:                 'Medium',
      status:                   'Open',
      
      // RAG Tracking Fields
      attemptedRag:             true,
      attemptedRagKbIds:        ragContextIds || [],
      attemptedRagSteps:        attemptedRagSteps || [],
      ragFinalScore:            req.body.ragFinalScore || null,
      extractedMetadata:        req.body.extractedMetadata || {},
      userSaidRagFailed:        true
    });

    // Update KB failure stats
    if (ragContextIds && ragContextIds.length > 0) {
      await updateRagFailure(ragContextIds);
    }
    
    // Log Activity
    await ActivityLog.create({
      userId,
      action: 'RAG Failed, Ticket Created',
      issueText: issueText || '',
      ragUsed: true,
      ragResult: 'failed',
    });

    const User = require('../models/User');
    const corporateUser = await User.findById(userId);
    const corpName = corporateUser ? (corporateUser.name || corporateUser.username) : 'Corporate User';
    await notifyAdmins(`New ticket created by ${corpName} - Ticket #${ticket.ticketNumber}`, ticket._id);

    return res.status(201).json({ success: true, ticket });
  } catch (err) {
    console.error('create-ticket-after-rag-failed error:', err);
    return res.status(500).json({ error: 'Internal server error.' });
  }
});

module.exports = router;
