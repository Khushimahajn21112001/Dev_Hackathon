const mongoose = require('mongoose');

async function main() {
  await mongoose.connect(process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/ai_ticket');
  
  const User = require('./src/models/User');
  const Ticket = require('./src/models/Ticket');
  const ResolutionKB = require('./src/models/ResolutionKB');

  console.log('\n=== USERS ===');
  const users = await User.find({});
  users.forEach(u => console.log(`ID: ${u._id} | Username: ${u.username} | Role: ${u.role}`));

  console.log('\n=== TICKETS ===');
  const tickets = await Ticket.find({}).populate('raisedBy', 'username');
  tickets.forEach(t => {
    console.log(`Num: ${t.ticketNumber} | Title: "${t.ticketTitle}" | User: ${t.raisedBy?.username} | Status: ${t.status}`);
  });

  console.log('\n=== KB ARTICLES ===');
  const kbs = await ResolutionKB.find({});
  kbs.forEach(k => {
    console.log(`Title: "${k.issueTitle}" | ProblemFamily: "${k.problemFamily}" | Steps: ${JSON.stringify(k.knownFixSteps)}`);
  });

  process.exit(0);
}

main().catch(console.error);
