const mongoose = require('mongoose');

async function main() {
  await mongoose.connect('mongodb://127.0.0.1:27017/ai-ticket-management');
  
  const ResolutionKB = require('./src/models/ResolutionKB');

  const kbs = await ResolutionKB.find({});
  console.log(`Total KB count in DB: ${kbs.length}`);
  kbs.forEach((k, idx) => {
    console.log(`[${idx + 1}] Title: "${k.issueTitle}"`);
    console.log(`    Category: "${k.category}"`);
    console.log(`    ProblemFamily: "${k.problemFamily}"`);
    console.log(`    Embedding present: ${k.embedding && k.embedding.length > 0 ? 'YES (' + k.embedding.length + ')' : 'NO'}`);
    console.log(`    knownFixSteps: ${JSON.stringify(k.knownFixSteps)}`);
    console.log(`    rootCause: "${k.rootCause}"`);
  });

  process.exit(0);
}

main().catch(console.error);
