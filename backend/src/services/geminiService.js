// backend/src/services/geminiService.js
const { GoogleGenerativeAI } = require('@google/generative-ai');
const { getTicketAnalysisPrompt } = require('../prompts/ticketAnalysisPrompt');
const { getResolutionSummaryPrompt } = require('../prompts/resolutionSummaryPrompt');
const { getMetadataExtractionPrompt } = require('../prompts/metadataExtractionPrompt');

// Initialize Gemini API
// It will gracefully fail if the key is not present (fallback mechanisms should be in place in the routes)
let genAI = null;
if (process.env.GEMINI_API_KEY) {
  genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
}

const GEMINI_TIMEOUT_MS = 5000;

/**
 * Race a Gemini content generation call against a timeout
 */
async function generateContentWithTimeout(model, prompt, timeoutMs = GEMINI_TIMEOUT_MS) {
  const geminiPromise = model.generateContent(prompt);
  const timeoutPromise = new Promise((_, reject) =>
    setTimeout(() => reject(new Error('Gemini timeout')), timeoutMs)
  );
  return Promise.race([geminiPromise, timeoutPromise]);
}

/**
 * Helper to clean JSON string from markdown formatting
 * @param {string} text - Raw text from Gemini
 * @returns {string} Clean JSON string
 */
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
 * Uses Gemini to analyze a user issue and return a structured ticket preview.
 * @param {string} issueText - The raw issue entered by the user
 * @param {string[]} availableTeams - List of valid team names from the DB
 * @returns {Promise<Object>} The parsed structured JSON object
 */
async function analyzeTicketIssue(issueText, availableTeams, selectedCategory) {
  if (!genAI) {
    throw new Error('GEMINI_API_KEY is not configured in .env');
  }

  const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash-lite' });
  const systemPrompt = getTicketAnalysisPrompt(availableTeams, selectedCategory);

  const prompt = `${systemPrompt}\n\nUSER ISSUE: "${issueText}"\n\nGenerate the JSON output:`;

  let result;
  try {
    result = await generateContentWithTimeout(model, prompt);
  } catch (genErr) {
    console.error('Gemini generation error (timeout/failure):', genErr.message || genErr);
    // Fallback: indicate no match due to Gemini failure
    return null;
  }
  const responseText = result.response.text();
  
  try {
    return JSON.parse(cleanJsonString(responseText));
  } catch (error) {
    console.error('Failed to parse Gemini ticket analysis response:', responseText);
    // Fallback: treat as no match
    return null;
  }
}

/**
 * Uses Gemini to summarize raw IT support resolution notes into a clean KB format.
 * @param {Object} data - The raw ticket data
 * @param {string} data.ticketTitle - Ticket title
 * @param {string} data.originalUserInput - Original user issue
 * @param {string} data.category - Issue category
 * @param {string} data.rootCause - Raw root cause from support
 * @param {string} data.resolutionSteps - Raw resolution steps from support
 * @returns {Promise<Object>} The parsed structured JSON object
 */
async function summarizeResolutionForKB(data) {
  if (!genAI) {
    throw new Error('GEMINI_API_KEY is not configured in .env');
  }

  const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash-lite' });
  const systemPrompt = getResolutionSummaryPrompt();

  const prompt = `${systemPrompt}

TICKET DETAILS:
Title: ${data.ticketTitle}
Original User Issue: ${data.originalUserInput || 'N/A'}
Category: ${data.category || 'N/A'}

RAW SUPPORT NOTES:
Root Cause: ${data.rootCause}
Resolution Steps:
${data.resolutionSteps}

Generate the clean JSON output for the Knowledge Base:`;

  const result = await generateContentWithTimeout(model, prompt, 10000);
  const responseText = result.response.text();

  try {
    return JSON.parse(cleanJsonString(responseText));
  } catch (error) {
    console.error('Failed to parse Gemini KB summary response:', responseText);
    throw new Error('Gemini returned invalid JSON');
  }
}

/**
 * Extracts structured metadata from a user issue for hybrid RAG matching.
 * @param {string} issueText - The raw issue entered by the user
 * @returns {Promise<Object>} The parsed structured JSON object
 */
async function extractIssueMetadata(issueText) {
  if (!genAI) {
    console.warn('GEMINI_API_KEY is not configured in .env. Skipping metadata extraction.');
    return null;
  }

  const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash-lite' });
  const systemPrompt = getMetadataExtractionPrompt();
  const prompt = `${systemPrompt}\n\nUSER ISSUE: "${issueText}"\n\nGenerate the JSON output:`;

  try {
    const result = await generateContentWithTimeout(model, prompt);
    const responseText = result.response.text();
    return JSON.parse(cleanJsonString(responseText));
  } catch (error) {
    console.error('Failed to extract Gemini issue metadata (timeout/failure):', error.message || error);
    return null;
  }
}

module.exports = {
  analyzeTicketIssue,
  extractIssueMetadata,
  summarizeResolutionForKB
};
