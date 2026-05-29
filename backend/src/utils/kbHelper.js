// backend/src/utils/kbHelper.js
// Shared utility: upsert a ResolutionKB entry from a closed ticket.
// Called by both confirm-resolution and force-close endpoints.

const ResolutionKB = require('../models/ResolutionKB');
const { generateEmbedding, extractEntities } = require('./aiMatching');
const { summarizeResolutionForKB } = require('../services/geminiService');

/**
 * Upsert a ResolutionKB entry from a closed ticket.
 * - Uses Gemini to clean and format the raw support notes into a professional KB.
 * - Generates an embedding for the clean KB so AI can find it.
 *
 * @param {Object} ticket - Mongoose Ticket document (populated)
 */
async function upsertResolutionKB(ticket) {
  // Guard: only save if rootCause and resolutionSteps are present
  if (!ticket.rootCause || !ticket.resolutionSteps) {
    return null;
  }

  let cleanData;
  try {
    // Pass raw data to Gemini for professional formatting
    cleanData = await summarizeResolutionForKB({
      ticketTitle: ticket.ticketTitle,
      originalUserInput: ticket.originalUserInput,
      category: ticket.category,
      rootCause: ticket.rootCause,
      resolutionSteps: ticket.resolutionSteps
    });
  } catch (err) {
    console.warn('[kbHelper] Gemini summarization failed, falling back to raw data:', err.message);
    cleanData = {
      issueTitle: ticket.ticketTitle,
      rootCauseSummary: ticket.rootCause,
      cleanResolutionSteps: typeof ticket.resolutionSteps === 'string' 
        ? ticket.resolutionSteps.split('\n').map(s => s.trim()).filter(Boolean)
        : ticket.resolutionSteps,
      keywords: ticket.ticketTitle.split(' '),
      category: ticket.category || 'General IT Support',
      reusableKbSummary: ticket.rootCause
    };
  }

  // Build a rich searchable text for the embedding based on the CLEANED data
  const embedText = [
    cleanData.issueTitle,
    cleanData.category || '',
    cleanData.rootCauseSummary,
    cleanData.cleanResolutionSteps.join(' '),
    (cleanData.keywords || []).join(' '),
    ticket.originalUserInput || ''
  ].join(' ');

  // Generate embedding vector so AI semantic search can find this KB entry
  let embedding = [];
  let entities = {};
  try {
    embedding = await generateEmbedding(embedText);
    entities = extractEntities(embedText);
  } catch (err) {
    console.warn('[kbHelper] Embedding generation failed, saving KB without embedding:', err.message);
  }

  // Look for an existing KB entry with the same original title (case-insensitive)
  // We use the original ticket title to find existing ones, not the Gemini rephrased one to avoid duplicate mismatch
  const existing = await ResolutionKB.findOne({
    issueTitle: { $regex: new RegExp(ticket.ticketTitle.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i') },
  });

  if (existing) {
    // UPDATE existing entry with latest clean resolution data
    existing.solvedCount += 1;
    existing.rootCause = cleanData.rootCauseSummary || existing.rootCause;

    // Merge steps — add new steps that aren't already stored
    const currentSteps = new Set(existing.knownFixSteps);
    cleanData.cleanResolutionSteps.forEach((s) => currentSteps.add(s));
    existing.knownFixSteps = [...currentSteps];
    
    // Update keywords
    const currentKeywords = new Set(existing.keywords || []);
    (cleanData.keywords || []).forEach(k => currentKeywords.add(k));
    existing.keywords = [...currentKeywords];

    existing.lastUpdatedAt = new Date();

    // Always refresh embedding so it reflects the latest resolution data
    if (embedding.length > 0) {
      existing.embedding = embedding;
      existing.entities = entities;
    }

    // Recompute successRate
    if (existing.solvedCount > 0) {
      existing.successRate = Math.round((existing.successCount / existing.solvedCount) * 100);
    }

    await existing.save();
    return existing;
  } else {
    // CREATE new KB entry
    const newKb = await ResolutionKB.create({
      issueTitle:          cleanData.issueTitle || ticket.ticketTitle,
      category:            cleanData.category || ticket.category || 'General IT Support',
      keywords:            cleanData.keywords || [],
      knownFixSteps:       cleanData.cleanResolutionSteps,
      rootCause:           cleanData.rootCauseSummary,
      assignedTeam:        ticket.assignedTeam || null,
      embedding,       
      entities,
      solvedCount:         1,
      successCount:        0,
      failedCount:         0,
      successRate:         0,
      createdFromTicketId: ticket._id,
      lastUpdatedAt:       new Date(),
    });
    return newKb;
  }
}

module.exports = { upsertResolutionKB };
