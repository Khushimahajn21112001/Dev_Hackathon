const mongoose = require('mongoose');

async function main() {
  await mongoose.connect('mongodb://127.0.0.1:27017/ai-ticket-management');
  const KB = require('./backend/src/models/ResolutionKB');
  const kbs = await KB.find({});
  console.log(JSON.stringify(kbs, null, 2));
  process.exit(0);
}

main().catch(console.error);
