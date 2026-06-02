require('dotenv').config();
const mongoose = require('mongoose');
async function main() {
  await mongoose.connect(process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/ai_ticket');
  const Ticket = require('./src/models/Ticket');
  const ResolutionKB = require('./src/models/ResolutionKB');
  const t = await Ticket.find().sort({createdAt:-1}).limit(3);
  console.log('LATEST TICKETS:', JSON.stringify(t, null, 2));
  const kb = await ResolutionKB.find({}, { embedding: 0 }).sort({createdAt:-1}).limit(3);
  console.log('LATEST KBS:', JSON.stringify(kb, null, 2));
  process.exit(0);
}
main().catch(console.error);
