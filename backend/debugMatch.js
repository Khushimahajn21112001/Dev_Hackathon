require('dotenv').config();
const mongoose = require('mongoose');
const { generateEmbedding, cosineSimilarity, extractEntities, checkEntitySafety } = require('./src/utils/aiMatching');

async function debugMatch(issueText) {
  await mongoose.connect(process.env.MONGO_URI);
  console.log('\n=== AI Matching Debug (with keyword boost) ===');
  console.log('Input:', issueText);

  const userEmbedding = await generateEmbedding(issueText);
  const userEntities = extractEntities(issueText);
  console.log('Entities:', JSON.stringify(userEntities));

  const schema = new mongoose.Schema({
    issueTitle: String, category: String, embedding: [Number],
    entities: mongoose.Schema.Types.Mixed, symptoms: [String], keywords: [String],
  });
  let ResolutionKB;
  try { ResolutionKB = mongoose.model('ResolutionKB'); }
  catch(e) { ResolutionKB = mongoose.model('ResolutionKB', schema, 'resolutionkbs'); }

  const allKbs = await ResolutionKB.find({}, 'issueTitle category embedding entities symptoms keywords');
  console.log(`\nFound ${allKbs.length} KB entries\n`);

  const userWords = issueText.toLowerCase().split(/\s+/);
  const results = [];

  for (const kb of allKbs) {
    const hasEmbedding = kb.embedding && kb.embedding.length > 0;
    let rawScore = hasEmbedding ? cosineSimilarity(userEmbedding, kb.embedding) : 0;

    const stopwords = new Set([
      'the', 'and', 'is', 'not', 'cannot', 'can', 'cant', 'able', 'unable', 'to', 'in', 'into', 'on', 'at', 'with', 'it', 'shows', 
      'site', 'be', 'reached', 'opening', 'application', 'url', 'issue', 'error', 'network', 'login', 'access', 
      'working', 'credentials', 'portal', 'check', 'please', 'after', 'even', 'entering', 'correct', 'am', 'i', 'my'
    ]);
    const kbSearchText = [kb.issueTitle, kb.category, ...(kb.symptoms||[]), ...(kb.keywords||[])].join(' ').toLowerCase();
    const matchingWords = userWords.filter(w => w.length > 2 && !stopwords.has(w) && kbSearchText.includes(w));
    const keywordBoost = Math.min(matchingWords.length * 0.08, 0.25);
    let boostedScore = rawScore + keywordBoost;

    const isSafe = checkEntitySafety(userEntities, kb.entities || {});
    if (!isSafe) boostedScore -= 0.3;

    results.push({ title: kb.issueTitle, raw: rawScore.toFixed(3), boosted: boostedScore.toFixed(3), boost: keywordBoost.toFixed(2), matchingWords, hasEmbedding });
  }

  results.sort((a, b) => b.boosted - a.boosted);
  results.forEach(r => {
    const s = parseFloat(r.boosted);
    const flag = s >= 0.65 ? '✅ STRONG' : s >= 0.50 ? '⚠️  POSSIBLE' : '❌ NO MATCH';
    console.log(`${flag} raw:${r.raw} boost:+${r.boost} final:${r.boosted} | "${r.title}" | matched words:[${r.matchingWords.join(',')}]`);
  });

  process.exit(0);
}

debugMatch(process.argv[2] || 'vpn is not working').catch(e => { console.error(e.message); process.exit(1); });
