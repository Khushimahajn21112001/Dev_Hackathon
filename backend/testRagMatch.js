require('dotenv').config();
const mongoose = require('mongoose');
const Team = require('./src/models/Team');
const { retrieveRelevantResolutions, generateRagAnswer, buildRagContext } = require('./src/services/ragService');

async function main() {
  await mongoose.connect(process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/ai_ticket');
  
  console.log('\n--- TESTING RAG SERVICE FOR "powerbi is not opening" ---');
  const issueText = "powerbi is not opening";
  
  const relevantRecords = await retrieveRelevantResolutions(issueText, null);
  console.log(`\nFound ${relevantRecords.length} matching KB records!`);
  
  relevantRecords.forEach((r, idx) => {
    console.log(`[Record ${idx + 1}] Title: "${r.kb.issueTitle}" | Final Score: ${r.score.toFixed(3)} | Semantic Score: ${r.semanticScore.toFixed(3)}`);
  });
  
  if (relevantRecords.length > 0) {
    const context = buildRagContext(relevantRecords);
    console.log(`\nGenerated RAG Context:\n${context.substring(0, 300)}...\n`);
    
    console.log('Generating RAG answer...');
    const answer = await generateRagAnswer(issueText, context);
    console.log('\nRAG Answer Object:', JSON.stringify(answer, null, 2));
  } else {
    console.log('No matching records found above threshold 0.30!');
  }
  
  process.exit(0);
}

main().catch(console.error);
