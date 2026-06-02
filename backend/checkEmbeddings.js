const mongoose = require('mongoose');
async function main() {
  await mongoose.connect('mongodb://127.0.0.1:27017/ai-ticket-management');
  const KB = require('./src/models/ResolutionKB');
  const kbs = await KB.find({});
  kbs.forEach(kb => {
    console.log('Title:', kb.issueTitle);
    console.log('Embedding Length:', kb.embedding ? kb.embedding.length : 0);
    console.log('Problem Family:', kb.problemFamily);
    console.log('---');
  });
  process.exit(0);
}
main().catch(console.error);
