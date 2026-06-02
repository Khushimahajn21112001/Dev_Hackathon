const mongoose = require('mongoose');
async function main() {
  await mongoose.connect('mongodb://127.0.0.1:27017/ai-ticket-management');
  const TRR = require('./src/models/TeamRoutingRule');
  const rules = await TRR.find({});
  console.log(JSON.stringify(rules.map(r => ({teamName: r.teamName, keywords: r.keywords})), null, 2));
  process.exit(0);
}
main().catch(console.error);
