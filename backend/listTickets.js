require('dotenv').config();
const mongoose = require('mongoose');
async function main() {
  await mongoose.connect(process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/ai_ticket');
  const Ticket = require('./src/models/Ticket');
  const tickets = await Ticket.find();
  console.log(JSON.stringify(tickets, null, 2));
  process.exit(0);
}
main().catch(console.error);
