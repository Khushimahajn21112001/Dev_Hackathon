const mongoose = require('mongoose');
require('dotenv').config();

// Load models to prevent Schema registration errors on population
require('./src/models/Team');
require('./src/models/User');
require('./src/models/Ticket');

async function main() {
  await mongoose.connect('mongodb://127.0.0.1:27017/ai-ticket-management');
  console.log('Connected to MongoDB');
  
  const { retrieveRelevantResolutions } = require('./src/services/ragService');
  
  const testCases = [
    "Arcon Authenticator application is not working. Because which i am not able t...",
    "Arcon Authenticator application is not working. Because which i am not able to access",
    "Arcon Authenticator application is not working",
    "10.10.1.1 server is not accesible",
    "10.10.1.1 server not working",
    "authenticator not working",
    "Arcon MFA issue"
  ];
  
  for (const issueText of testCases) {
    console.log(`\n==================================================`);
    console.log(`Analyzing issue: "${issueText}"`);
    
    const result = await retrieveRelevantResolutions(issueText);
    console.log(`Found ${result.records.length} records:`);
    result.records.forEach((r, idx) => {
      console.log(`\n  [Record ${idx + 1}] Title: "${r.kb.issueTitle}"`);
      console.log(`      Final Score: ${r.score.toFixed(4)}`);
      console.log(`      Semantic Score: ${r.semanticScore.toFixed(4)}`);
      console.log(`      Hybrid details:`, JSON.stringify(r.hybridDetails || r.matchedReason || {}, null, 2));
    });
  }
  
  process.exit(0);
}

main().catch(console.error);
