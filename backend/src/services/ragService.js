// backend/src/services/ragService.js
const { GoogleGenerativeAI } = require('@google/generative-ai');
const { generateEmbedding, cosineSimilarity } = require('../utils/aiMatching');
const ResolutionKB = require('../models/ResolutionKB');
const { getRagPrompt } = require('../prompts/ragPrompt');
const { extractIssueMetadata } = require('./geminiService');

const KNOWN_APPS = [
  'powerbi', 'power bi', 'vpn', 'outlook', 'excel', 'word', 'teams',
  'wifi', 'internet', 'printer', 'jira', 'confluence', 'bitbucket',
  'chrome', 'arcon', 'arcon authenticator', 'authenticator'
];

let genAI = null;
if (process.env.GEMINI_API_KEY) {
  genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
}

// ─────────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────────
function cleanJsonString(text) {
  let cleaned = text.trim();
  if (cleaned.startsWith('```json')) {
    cleaned = cleaned.substring(7);
  } else if (cleaned.startsWith('```')) {
    cleaned = cleaned.substring(3);
  }
  if (cleaned.endsWith('```')) {
    cleaned = cleaned.substring(0, cleaned.length - 3);
  }
  return cleaned.trim();
}

/**
 * Deduplicate and limit recommended steps to at most maxSteps.
 * - Strips exact duplicates (case-insensitive, whitespace-normalized).
 * - Truncates overly long steps (>120 chars).
 */
function deduplicateSteps(steps, maxSteps = 4) {
  if (!Array.isArray(steps)) return [];
  const seen = new Set();
  const deduped = [];
  for (let step of steps) {
    const normalized = step.trim().replace(/\s+/g, ' ').toLowerCase();
    if (normalized.length === 0) continue;
    if (!seen.has(normalized)) {
      seen.add(normalized);
      if (step.length > 120) {
        step = step.slice(0, 117) + '...';
      }
      deduped.push(step.trim());
    }
    if (deduped.length >= maxSteps) break;
  }
  return deduped;
}

// ─────────────────────────────────────────────────────────────────────────────
// KB Metadata Extraction (used only at ticket-closure time, NOT on hot path)
// ─────────────────────────────────────────────────────────────────────────────
async function extractKbMetadata(issueTitle, rootCause, resolutionSteps, category, assignedTeamName) {
  if (!genAI) return null;
  try {
    const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash-lite' });
    const prompt = `You are an IT Support AI. Extract structured metadata from a closed ticket to power a Knowledge Base RAG system.
      
Original Issue: ${issueTitle}
Root Cause: ${rootCause}
Resolution Steps: ${Array.isArray(resolutionSteps) ? resolutionSteps.join(' ') : resolutionSteps}
Category: ${category}
Assigned Team: ${assignedTeamName}

Respond strictly in JSON format matching this schema:
{
  "applicationNames": ["app1", "app2"],
  "errorMessages": ["error1"],
  "rootCauseCategory": "e.g. Endpoint Policy Restriction, Network Outage",
  "problemFamily": "e.g. Application Blocked By Security Policy",
  "policyTool": "e.g. ManageEngine, Active Directory",
  "affectedLayer": "e.g. Endpoint Device, Network, Server",
  "symptoms": ["Application not opening", "Access Denied error"],
  "resolutionType": "e.g. Policy Whitelist / Access Restore",
  "tags": ["tag1", "tag2", "tag3"]
}`;
    const geminiPromise = model.generateContent(prompt);
    const timeoutPromise = new Promise((_, reject) =>
      setTimeout(() => reject(new Error('Gemini timeout')), 10000)
    );
    const result = await Promise.race([geminiPromise, timeoutPromise]);
    const responseText = result.response.text();
    return JSON.parse(cleanJsonString(responseText));
  } catch (error) {
    console.error('Failed to extract KB metadata:', error);
    return null;
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Retrieve Relevant Resolutions – Xenova + keyword hybrid (NO Gemini)
// ─────────────────────────────────────────────────────────────────────────────
const RAG_MATCH_THRESHOLD = 0.50;  // Only send to Gemini if score >= this
const MAX_KB_CANDIDATES = 3;       // Limit context sent to Gemini

async function retrieveRelevantResolutions(issueText) {
  const t0 = Date.now();
  
  // Run embedding and metadata extraction concurrently
  let [userEmbedding, userMetadata] = await Promise.all([
    generateEmbedding(issueText),
    extractIssueMetadata(issueText)
  ]);
  const embeddingMs = Date.now() - t0;

  if (!userEmbedding || userEmbedding.length === 0) {
    return { records: [], embeddingMs, kbSearchMs: 0 };
  }

  // Robust offline metadata extractor fallback if Gemini fails (e.g., rate limits)
  if (!userMetadata) {
    console.log('[RAG] Gemini metadata extraction failed/timed out. Using offline regex/keyword extractor.');
    const ipRegex = /\b(?:[0-9]{1,3}\.){3}[0-9]{1,3}\b/g;
    const extractedIps = issueText.match(ipRegex) || [];
    
    const extractedApps = [];
    const lowerIssue = issueText.toLowerCase();
    for (const app of KNOWN_APPS) {
      if (lowerIssue.includes(app)) {
        let name = app;
        if (app === 'powerbi' || app === 'power bi') name = 'Power BI';
        if (app === 'vpn') name = 'VPN';
        if (app === 'chrome') name = 'Chrome';
        if (app === 'jira') name = 'Jira';
        if (app === 'outlook') name = 'Outlook';
        if (app === 'teams') name = 'Teams';
        if (app.includes('arcon')) name = 'Arcon Authenticator';
        if (app === 'authenticator' && !extractedApps.includes('Arcon Authenticator')) name = 'Arcon Authenticator';
        if (!extractedApps.includes(name)) extractedApps.push(name);
      }
    }
    
    userMetadata = {
      ipAddresses: extractedIps,
      applicationNames: extractedApps,
      urls: [],
      deviceIds: [],
      errorMessages: [],
      problemFamily: '',
      category: ''
    };
  }

  const t1 = Date.now();
  const allKbs = await ResolutionKB.find({ knownFixSteps: { $not: { $size: 0 } } }).populate('assignedTeam', 'name');
  
  const scoredRecords = [];
  console.log(`[RAG] Searching KB: ${allKbs.length} records. Metadata extracted:`, userMetadata ? 'Yes' : 'No');
  
  for (const kb of allKbs) {
    if (!kb.embedding || kb.embedding.length === 0) continue;

    // 1. Semantic Score (35% weight)
    const semanticScore = cosineSimilarity(userEmbedding, kb.embedding);
    let cosineSimilarityScore = semanticScore * 0.35;
    
    // Offline / fallback metadata parsing on the KB side for older/unpopulated records
    const kbIps = kb.ipAddresses?.length ? kb.ipAddresses : (kb.issueTitle.match(/\b(?:[0-9]{1,3}\.){3}[0-9]{1,3}\b/g) || []);
    
    const kbApps = kb.applicationNames?.length ? kb.applicationNames : (() => {
      const apps = [];
      const kbText = `${kb.issueTitle} ${kb.rootCause} ${(kb.knownFixSteps || []).join(' ')}`.toLowerCase();
      for (const app of KNOWN_APPS) {
        if (kbText.includes(app)) {
          let name = app;
          if (app === 'powerbi' || app === 'power bi') name = 'Power BI';
          if (app === 'vpn') name = 'VPN';
          if (app === 'chrome') name = 'Chrome';
          if (app === 'jira') name = 'Jira';
          if (app === 'outlook') name = 'Outlook';
          if (app === 'teams') name = 'Teams';
          if (app.includes('arcon')) name = 'Arcon Authenticator';
          if (app === 'authenticator' && !apps.includes('Arcon Authenticator')) name = 'Arcon Authenticator';
          if (!apps.includes(name)) apps.push(name);
        }
      }
      return apps;
    })();

    // 2. Entity Match Score (35% weight)
    let entityMatchScore = 0;
    const arrayIntersect = (arr1, arr2) => arr1.some(i => arr2.some(j => i.toLowerCase() === j.toLowerCase()));
    
    const matchedEntities = [];
    if (userMetadata.ipAddresses?.length && arrayIntersect(userMetadata.ipAddresses, kbIps)) { 
      entityMatchScore += 0.45; // Technical key (IP)
      matchedEntities.push('IP'); 
    }
    if (userMetadata.urls?.length && arrayIntersect(userMetadata.urls, kb.urls || [])) { 
      entityMatchScore += 0.45; // Technical key (URL)
      matchedEntities.push('URL'); 
    }
    if (userMetadata.deviceIds?.length && arrayIntersect(userMetadata.deviceIds, kb.deviceIds || [])) { 
      entityMatchScore += 0.45; // Technical key (DeviceID)
      matchedEntities.push('DeviceID'); 
    }
    if (userMetadata.applicationNames?.length && arrayIntersect(userMetadata.applicationNames, kbApps)) { 
      entityMatchScore += 0.40; // Increased boost for application matching
      matchedEntities.push('Application'); 
    }
    // Cap the entity match score at 0.50 to maintain relative weights
    entityMatchScore = Math.min(0.50, entityMatchScore);
    
    // 3. Problem Family Match (25% weight)
    let problemFamilyMatchScore = 0;
    const userFamily = userMetadata.problemFamily?.toLowerCase() || '';
    const kbFamily = kb.problemFamily?.toLowerCase() || '';
    if (userFamily && kbFamily && userFamily === kbFamily) {
      problemFamilyMatchScore = 0.25;
      matchedEntities.push('ProblemFamily');
    }

    // 4. Category Match (5% weight)
    let categoryMatchScore = 0;
    if (userMetadata.category && kb.category && userMetadata.category.toLowerCase() === kb.category.toLowerCase()) {
      categoryMatchScore = 0.05;
    }

    // 5. Error Message Match (5% weight)
    let errorMessageMatchScore = 0;
    if (userMetadata.errorMessages?.length && arrayIntersect(userMetadata.errorMessages, kb.errorMessages || [])) {
      errorMessageMatchScore = 0.05;
      matchedEntities.push('ErrorMessage');
    }

    // High Semantic Similarity Boost (safety net for near-identical texts)
    let semanticBoost = 0;
    if (semanticScore >= 0.80) {
      semanticBoost = 0.35;
    } else if (semanticScore >= 0.70) {
      semanticBoost = 0.20;
    } else if (semanticScore >= 0.60) {
      semanticBoost = 0.15;
    } else if (semanticScore >= 0.50) {
      semanticBoost = 0.10;
    }

    // Combine Scores
    let finalScore = entityMatchScore + problemFamilyMatchScore + cosineSimilarityScore + categoryMatchScore + errorMessageMatchScore + semanticBoost;

    // --- Negative Mismatch Rules (Penalties) ---
    let penalty = 0;
    let penaltyReason = '';
    
    const appsDiffer = userMetadata.applicationNames?.length && kbApps.length && !arrayIntersect(userMetadata.applicationNames, kbApps);
    const familiesDiffer = userFamily && kbFamily && userFamily !== kbFamily;
    
    if (appsDiffer && familiesDiffer) {
      penalty += 0.30;
      penaltyReason += 'Apps&FamilyDiffer ';
    }
    
    if ((userFamily.includes('session') && kbFamily.includes('policy')) || (userFamily.includes('policy') && kbFamily.includes('session'))) {
      penalty += 0.40;
      penaltyReason += 'SessionVsPolicy ';
    }
    
    if ((userFamily.includes('vpn') && kbFamily.includes('permission')) || (userFamily.includes('permission') && kbFamily.includes('vpn'))) {
      penalty += 0.40;
      penaltyReason += 'NetworkVsLocal ';
    }

    finalScore = Math.max(0, finalScore - penalty);

    console.log(`[RAG] Hybrid Score for "${kb.issueTitle.substring(0,30)}": semantic=${cosineSimilarityScore.toFixed(2)} entity=${entityMatchScore.toFixed(2)} family=${problemFamilyMatchScore.toFixed(2)} category=${categoryMatchScore.toFixed(2)} error=${errorMessageMatchScore.toFixed(2)} penalty=${penalty.toFixed(2)} final=${finalScore.toFixed(2)}`);

    if (finalScore >= 0.30 || semanticScore >= 0.50) { // Keep semantic >=0.5 as safety net
      scoredRecords.push({ 
        kb, 
        score: finalScore, 
        semanticScore,
        hybridDetails: { cosineSimilarityScore, entityMatchScore, problemFamilyMatchScore, categoryMatchScore, errorMessageMatchScore, penalty, penaltyReason }
      });
    }
  }

  scoredRecords.sort((a, b) => b.score - a.score);
  const kbSearchMs = Date.now() - t1;
  
  return {
    records: scoredRecords.slice(0, MAX_KB_CANDIDATES),
    embeddingMs,
    kbSearchMs
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// Build RAG Context (text context for Gemini, limited to top 3)
// ─────────────────────────────────────────────────────────────────────────────
function buildRagContext(records) {
  let contextStr = '';
  records.forEach((record, index) => {
    contextStr += `Retrieved Resolution ${index + 1}:
Issue Title: ${record.kb.issueTitle}
Root Cause: ${record.kb.rootCause || 'N/A'}
Resolution Steps: ${(record.kb.knownFixSteps || []).join('\n')}
Success Rate: ${record.kb.successRate}%
Match Score: ${record.score.toFixed(4)}\n\n`;
  });
  return contextStr.trim();
}

// ─────────────────────────────────────────────────────────────────────────────
// Build Offline Fallback Response (from raw KB, no Gemini)
// ─────────────────────────────────────────────────────────────────────────────
function buildOfflineFallback(records) {
  const bestKb = records[0].kb;
  // Merge and deduplicate steps from top KB records
  const allSteps = [];
  for (const r of records) {
    if (r.kb.knownFixSteps && r.kb.knownFixSteps.length > 0) {
      allSteps.push(...r.kb.knownFixSteps);
    }
  }
  const cleanSteps = deduplicateSteps(allSteps, 4);

  // Determine if it is a maintenance/vendor/administrative case
  const textToCheck = `${bestKb.issueTitle} ${bestKb.rootCause || ''}`.toLowerCase();
  const isMaintenance = /vendor|license|maintenance|upgrade|backend|admin|dependency/i.test(textToCheck);

  return {
    ragAnswerAvailable: true,
    kbIssueTitle: bestKb.issueTitle,
    kbProvidedRootCause: bestKb.rootCause || 'Configuration or policy issue',
    kbProvidedResolutionSteps: cleanSteps,
    aiGeneratedSuggestions: [],
    userActionRequired: isMaintenance ? 'No' : 'Yes',
    resolutionType: isMaintenance ? 'Maintenance / Vendor / Administrative Resolution' : 'Troubleshooting',
    aiAddedExtraSteps: false,
    additionalNote: bestKb.internalNote || '',
    expectedAvailability: isMaintenance ? 'Refer to description' : '',
    currentStatus: isMaintenance ? (bestKb.rootCause || 'Maintenance in progress') : '',
    recommendedSteps: cleanSteps.length > 0 ? cleanSteps : ['Contact IT Support for assistance.'],
    possibleRootCauses: [bestKb.rootCause || 'Configuration or policy issue'],
    recommendedTeam: bestKb.assignedTeam?.name || 'Service Desk',
    confidence: records[0].score >= 0.80 ? 'High' : 'Medium',
    summary: `We found a matching Knowledge Base solution: "${bestKb.issueTitle}".`
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// Generate RAG Answer via Gemini (with 5-second timeout)
// ─────────────────────────────────────────────────────────────────────────────
const GEMINI_TIMEOUT_MS = 5000;

async function generateRagAnswer(issueText, context) {
  if (!genAI) {
    return null; // Caller will use offline fallback
  }

  const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash-lite' });
  const systemPrompt = getRagPrompt();

  const prompt = `${systemPrompt}
  
USER ISSUE:
"${issueText}"

RETRIEVED CONTEXT:
${context}

Respond strictly in JSON format:
{
  "ragAnswerAvailable": true,
  "kbIssueTitle": "...",
  "kbProvidedRootCause": "...",
  "kbProvidedResolutionSteps": ["step1", "step2"],
  "aiGeneratedSuggestions": [],
  "userActionRequired": "Yes | No",
  "resolutionType": "Troubleshooting | Maintenance / Vendor / Administrative Resolution",
  "aiAddedExtraSteps": false,
  "additionalNote": "...",
  "expectedAvailability": "...",
  "currentStatus": "...",
  "confidence": "High | Medium | Low",
  "recommendedTeam": "..."
}`;

  try {
    // Race Gemini against a timeout
    const geminiPromise = model.generateContent(prompt);
    const timeoutPromise = new Promise((_, reject) =>
      setTimeout(() => reject(new Error('Gemini timeout')), GEMINI_TIMEOUT_MS)
    );

    const result = await Promise.race([geminiPromise, timeoutPromise]);
    const responseText = result.response.text();
    const parsed = JSON.parse(cleanJsonString(responseText));

    // Post-process: deduplicate and limit steps
    if (Array.isArray(parsed.kbProvidedResolutionSteps)) {
      parsed.kbProvidedResolutionSteps = deduplicateSteps(parsed.kbProvidedResolutionSteps, 4);
    }
    if (Array.isArray(parsed.aiGeneratedSuggestions)) {
      parsed.aiGeneratedSuggestions = deduplicateSteps(parsed.aiGeneratedSuggestions, 4);
    }

    // Ensure fallback properties are defined
    parsed.aiAddedExtraSteps = parsed.aiAddedExtraSteps || false;
    parsed.aiGeneratedSuggestions = parsed.aiGeneratedSuggestions || [];
    parsed.kbProvidedRootCause = parsed.kbProvidedRootCause || '';
    parsed.kbProvidedResolutionSteps = parsed.kbProvidedResolutionSteps || [];
    parsed.userActionRequired = parsed.userActionRequired || 'Yes';
    parsed.resolutionType = parsed.resolutionType || 'Troubleshooting';

    // Legacy fields for backward compatibility
    parsed.recommendedSteps = parsed.kbProvidedResolutionSteps;
    parsed.possibleRootCauses = parsed.kbProvidedRootCause ? [parsed.kbProvidedRootCause] : [];
    parsed.summary = parsed.summary || `We found a matching Knowledge Base solution: "${parsed.kbIssueTitle || 'Details below'}".`;

    return parsed;
  } catch (error) {
    console.error('[RAG] Gemini call failed (timeout/rate-limit/error):', error.message || error);
    return null; // Caller will use offline fallback
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// KB Stats Updates
// ─────────────────────────────────────────────────────────────────────────────
async function updateRagSuccess(kbIds) {
  await ResolutionKB.updateMany(
    { _id: { $in: kbIds } },
    { 
      $inc: { ragSuccessCount: 1, usedInRagCount: 1 },
      $set: { lastUsedInRagAt: new Date() }
    }
  );
}

async function updateRagFailure(kbIds) {
  await ResolutionKB.updateMany(
    { _id: { $in: kbIds } },
    { 
      $inc: { ragFailureCount: 1, usedInRagCount: 1 },
      $set: { lastUsedInRagAt: new Date() }
    }
  );
}

module.exports = {
  extractKbMetadata,
  retrieveRelevantResolutions,
  buildRagContext,
  buildOfflineFallback,
  generateRagAnswer,
  updateRagSuccess,
  updateRagFailure,
  RAG_MATCH_THRESHOLD,
  deduplicateSteps
};
