require('dotenv').config();
const mongoose = require('mongoose');
async function main() {
  await mongoose.connect(process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/ai_ticket');
  const ResolutionKB = require('./src/models/ResolutionKB');
  const Ticket = require('./src/models/Ticket');
  
  const res = await ResolutionKB.deleteMany({ issueTitle: 'Generic Issue' });
  console.log('Deleted bad KBs:', res.deletedCount);
  
  const res2 = await Ticket.deleteMany({ ticketTitle: 'Generic Issue' });
  console.log('Deleted bad Tickets:', res2.deletedCount);

  process.exit(0);
}
main().catch(console.error);
