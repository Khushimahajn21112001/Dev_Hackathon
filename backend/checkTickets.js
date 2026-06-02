const mongoose = require('mongoose');
async function main() {
  await mongoose.connect('mongodb://127.0.0.1:27017/ai-ticket-management');
  const Ticket = require('./src/models/Ticket');
  const t = await Ticket.find({});
  console.log(JSON.stringify(t.map(x=>x.ticketTitle), null, 2));
  process.exit(0);
}
main().catch(console.error);
