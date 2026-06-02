require('dotenv').config();
const mongoose = require('mongoose');
async function main() {
  await mongoose.connect(process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/ai_ticket');
  const ResolutionKB = require('./src/models/ResolutionKB');
  const kb = await ResolutionKB.find({ issueTitle: /Power BI/i }, { embedding: 0 });
  console.log(JSON.stringify(kb, null, 2));
  process.exit(0);
}
main().catch(console.error);
