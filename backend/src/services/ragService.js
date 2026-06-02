// backend/src/services/ragService.js
const { GoogleGenerativeAI } = require('@google/generative-ai');
const { generateEmbedding, cosineSimilarity } = require('../utils/aiMatching');
const ResolutionKB = require('../models/ResolutionKB');
const { getRagPrompt } = require('../prompts/ragPrompt');
const { extractIssueMetadata } = require('./geminiService');

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
    const model = genAI.getGenerativeModel({ model: 'gemini-flash-latest' });
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
    const result = await model.generateContent(prompt);
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
const RAG_MATCH_THRESHOLD = 0.60;  // Only send to Gemini if score >= this
const MAX_KB_CANDIDATES = 3;       // Limit context sent to Gemini

async function retrieveRelevantResolutions(issueText) {
  const t0 = Date.now();
  
  // Run embedding and metadata extraction concurrently
  const [userEmbedding, userMetadata] = await Promise.all([
    generateEmbedding(issueText),
    extractIssueMetadata(issueText)
  ]);
  const embeddingMs = Date.now() - t0;

  if (!userEmbedding || userEmbedding.length === 0) {
    return { records: [], embeddingMs, kbSearchMs: 0 };
  }

  const t1 = Date.now();
  const allKbs = await ResolutionKB.find({ knownFixSteps: { $not: { $size: 0 } } }).populate('assignedTeam', 'name');
  
  const scoredRecords = [];
  console.log(`[RAG] Searching KB: ${allKbs.length} records. Metadata extracted:`, userMetadata ? 'Yes' : 'No');
  
  for (const kb of allKbs) {
    if (!kb.embedding || kb.embedding.length === 0) continue;

    // 1. Semantic Score (25%)
    const semanticScore = cosineSimilarity(userEmbedding, kb.embedding);
    let cosineSimilarityScore = semanticScore * 0.25;
    
    // Default to fallback logic if metadata extraction failed (e.g. rate limit)
    if (!userMetadata) {
      let keywordBoost = 0;
      const lowerQuery = issueText.toLowerCase();
      const apps = ['powerbi', 'power bi', 'vpn', 'outlook', 'excel', 'word', 'teams', 'wifi', 'internet', 'printer', 'jira', 'confluence', 'bitbucket'];
      for (const app of apps) {
        if (lowerQuery.includes(app) && kb.issueTitle.toLowerCase().replace(/\\s+/g, '').includes(app.replace(/\\s+/g, ''))) {
          keywordBoost = 0.25; break;
        }
      }
      const finalScore = semanticScore + keywordBoost;
      if (finalScore >= 0.30) {
        scoredRecords.push({ kb, score: finalScore, semanticScore, matchedReason: 'Fallback (no metadata)' });
      }
      continue;
    }

    // 2. Entity Match Score (35%)
    let entityMatchScore = 0;
    const arrayIntersect = (arr1, arr2) => arr1.some(i => arr2.some(j => i.toLowerCase() === j.toLowerCase()));
    
    const matchedEntities = [];
    if (userMetadata.ipAddresses?.length && arrayIntersect(userMetadata.ipAddresses, kb.ipAddresses || [])) { entityMatchScore = 0.35; matchedEntities.push('IP'); }
    else if (userMetadata.urls?.length && arrayIntersect(userMetadata.urls, kb.urls || [])) { entityMatchScore = 0.35; matchedEntities.push('URL'); }
    else if (userMetadata.deviceIds?.length && arrayIntersect(userMetadata.deviceIds, kb.deviceIds || [])) { entityMatchScore = 0.35; matchedEntities.push('DeviceID'); }
    else if (userMetadata.applicationNames?.length && arrayIntersect(userMetadata.applicationNames, kb.applicationNames || [])) { 
      entityMatchScore = 0.25; // Partial boost for app name, requires problem family for full match
      matchedEntities.push('Application'); 
    }
    
    // 3. Problem Family Match (25%)
    let problemFamilyMatchScore = 0;
    if (userMetadata.problemFamily && kb.problemFamily && userMetadata.problemFamily.toLowerCase() === kb.problemFamily.toLowerCase()) {
      problemFamilyMatchScore = 0.25;
      matchedEntities.push('ProblemFamily');
    }

    // 4. Category Match (10%)
    let categoryMatchScore = 0;
    if (userMetadata.category && kb.category && userMetadata.category.toLowerCase() === kb.category.toLowerCase()) {
      categoryMatchScore = 0.10;
    }

    // 5. Error Message Match (5%)
    let errorMessageMatchScore = 0;
    if (userMetadata.errorMessages?.length && arrayIntersect(userMetadata.errorMessages, kb.errorMessages || [])) {
      errorMessageMatchScore = 0.05;
      matchedEntities.push('ErrorMessage');
    }

    // Combine Scores
    let finalScore = entityMatchScore + problemFamilyMatchScore + cosineSimilarityScore + categoryMatchScore + errorMessageMatchScore;

    // --- Negative Mismatch Rules (Penalties) ---
    let penalty = 0;
    let penaltyReason = '';
    
    const appsDiffer = userMetadata.applicationNames?.length && kb.applicationNames?.length && !arrayIntersect(userMetadata.applicationNames, kb.applicationNames);
    const familiesDiffer = userMetadata.problemFamily && kb.problemFamily && userMetadata.problemFamily.toLowerCase() !== kb.problemFamily.toLowerCase();
    
    if (appsDiffer && familiesDiffer) {
      penalty += 0.30;
      penaltyReason += 'Apps&FamilyDiffer ';
    }
    
    const family1 = userMetadata.problemFamily?.toLowerCase() || '';
    const family2 = kb.problemFamily?.toLowerCase() || '';
    if ((family1.includes('session') && family2.includes('policy')) || (family1.includes('policy') && family2.includes('session'))) {
      penalty += 0.40;
      penaltyReason += 'SessionVsPolicy ';
    }
    
    if ((family1.includes('vpn') && family2.includes('permission')) || (family1.includes('permission') && family2.includes('vpn'))) {
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

  return {
    ragAnswerAvailable: true,
    summary: `We found a matching Knowledge Base solution: "${bestKb.issueTitle}".`,
    recommendedSteps: cleanSteps.length > 0 ? cleanSteps : ['Contact IT Support for assistance.'],
    possibleRootCauses: [bestKb.rootCause || 'Configuration or policy issue'],
    recommendedTeam: bestKb.assignedTeam?.name || 'Service Desk',
    confidence: records[0].score >= 0.80 ? 'High' : 'Medium'
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

  const model = genAI.getGenerativeModel({ model: 'gemini-flash-latest' });
  const systemPrompt = getRagPrompt();

  const prompt = `${systemPrompt}
  
USER ISSUE:
"${issueText}"

RETRIEVED CONTEXT:
${context}

Use only the retrieved KB context above. Do not invent unsupported steps. Create one concise user-friendly response. Deduplicate repeated actions. Return maximum 4 recommended steps. Preserve application names, URLs, domains, ports, and error messages from the user issue. Do not suggest unsafe steps like disabling security policy directly. Recommend validation by IT Support if policy/security is involved.

Respond strictly in JSON format:
{
  "ragAnswerAvailable": true,
  "summary": "...",
  "recommendedSteps": ["step1", "step2"],
  "possibleRootCauses": ["cause1"],
  "recommendedTeam": "...",
  "confidence": "High | Medium | Low"
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
    if (Array.isArray(parsed.recommendedSteps)) {
      parsed.recommendedSteps = deduplicateSteps(parsed.recommendedSteps, 4);
    }

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
