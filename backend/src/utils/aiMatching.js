const { pipeline, env } = require('@xenova/transformers');

// Prevent downloading models into the root, use a cache dir
env.cacheDir = './.cache';

let extractor = null;

/**
 * Initialize the pipeline lazily.
 */
async function getExtractor() {
  if (!extractor) {
    // using all-MiniLM-L6-v2, a fast and lightweight model for sentence embeddings
    extractor = await pipeline('feature-extraction', 'Xenova/all-MiniLM-L6-v2', {
      quantized: true, // load quantized model for faster inference
    });
  }
  return extractor;
}

/**
 * Generate embedding for a given text
 */
async function generateEmbedding(text) {
  if (!text || text.trim() === '') return [];
  const model = await getExtractor();
  // Generate embeddings: output is a tensor
  const output = await model(text, { pooling: 'mean', normalize: true });
  // Convert Float32Array to standard JS array
  return Array.from(output.data);
}

/**
 * Compute cosine similarity between two vectors
 */
function cosineSimilarity(vecA, vecB) {
  if (!vecA || !vecB || vecA.length === 0 || vecB.length === 0 || vecA.length !== vecB.length) return 0;
  let dotProduct = 0;
  let normA = 0;
  let normB = 0;
  for (let i = 0; i < vecA.length; i++) {
    dotProduct += vecA[i] * vecB[i];
    normA += vecA[i] * vecA[i];
    normB += vecB[i] * vecB[i];
  }
  if (normA === 0 || normB === 0) return 0;
  return dotProduct / (Math.sqrt(normA) * Math.sqrt(normB));
}

/**
 * Extract basic entities using Regex for IT context
 */
function extractEntities(text) {
  const entities = {
    url: null,
    domain: null,
    port: null,
    appNames: []
  };

  if (!text) return entities;

  // Extract URL
  const urlMatch = text.match(/https?:\/\/[^\s]+/i);
  if (urlMatch) {
    entities.url = urlMatch[0];
    
    // Extract domain from URL
    try {
      const parsedUrl = new URL(entities.url);
      entities.domain = parsedUrl.hostname;
      if (parsedUrl.port) {
        entities.port = parsedUrl.port;
      }
    } catch (err) {
      // Ignore URL parse error
    }
  }

  // Fallback domain extraction if no protocol
  if (!entities.domain) {
    const domainMatch = text.match(/\b([a-z0-9]+(-[a-z0-9]+)*\.)+[a-z]{2,}\b/i);
    if (domainMatch) {
      entities.domain = domainMatch[0];
    }
  }

  // Extract IP if domain looks like IP
  const ipMatch = text.match(/\b\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}\b/);
  if (ipMatch) {
    entities.domain = ipMatch[0]; // Treat IP as domain/host
  }

  // Simple heuristic for common apps
  const commonApps = ['jira', 'confluence', 'bitbucket', 'vpn', 'anyconnect', 'outlook', 'teams', 'slack'];
  const lowerText = text.toLowerCase();
  
  for (const app of commonApps) {
    if (lowerText.includes(app)) {
      entities.appNames.push(app);
    }
  }

  return entities;
}

/**
 * Entity Safety Check
 * Returns true if safe to match, false if explicit conflict exists.
 */
function checkEntitySafety(userEntities, kbEntities) {
  // If KB has a domain and User has a domain, they MUST match or we reject
  if (userEntities.domain && kbEntities.domain) {
    if (userEntities.domain.toLowerCase() !== kbEntities.domain.toLowerCase()) {
      return false;
    }
  }

  // If KB requires an app and user specifies a completely different one (and not the KB one)
  // This is a simple heuristic: if they both define apps and have zero intersection, conflict
  if (userEntities.appNames.length > 0 && kbEntities.appNames && kbEntities.appNames.length > 0) {
    const intersection = userEntities.appNames.filter(app => kbEntities.appNames.includes(app));
    if (intersection.length === 0) {
      return false; // Conflicting apps
    }
  }

  return true;
}

module.exports = {
  getExtractor,
  generateEmbedding,
  cosineSimilarity,
  extractEntities,
  checkEntitySafety
};
