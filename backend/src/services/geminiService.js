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
async function analyzeTicketIssue(issueText, availableTeams) {
  if (!genAI) {
    throw new Error('GEMINI_API_KEY is not configured in .env');
  }

  const model = genAI.getGenerativeModel({ model: 'gemini-flash-latest' });
  const systemPrompt = getTicketAnalysisPrompt(availableTeams);

  const prompt = `${systemPrompt}\n\nUSER ISSUE: "${issueText}"\n\nGenerate the JSON output:`;

  let result;
  try {
    result = await model.generateContent(prompt);
  } catch (genErr) {
    console.error('Gemini generation error:', genErr);
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

  const model = genAI.getGenerativeModel({ model: 'gemini-flash-latest' });
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

  const result = await model.generateContent(prompt);
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
    throw new Error('GEMINI_API_KEY is not configured in .env');
  }

  const model = genAI.getGenerativeModel({ model: 'gemini-flash-latest' });
  const systemPrompt = getMetadataExtractionPrompt();
  const prompt = `${systemPrompt}\n\nUSER ISSUE: "${issueText}"\n\nGenerate the JSON output:`;

  try {
    const result = await model.generateContent(prompt);
    const responseText = result.response.text();
    return JSON.parse(cleanJsonString(responseText));
  } catch (error) {
    console.error('Failed to extract Gemini issue metadata:', error.message);
    return null;
  }
}

module.exports = {
  analyzeTicketIssue,
  extractIssueMetadata,
  summarizeResolutionForKB
};
