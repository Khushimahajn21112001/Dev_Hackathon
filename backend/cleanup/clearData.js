// backend/cleanup/clearData.js
const mongoose = require('mongoose');
const Ticket = require('../src/models/Ticket');
const ResolutionKB = require('../src/models/ResolutionKB');
const dbUrl = process.env.MONGODB_URI || 'mongodb://localhost:27017/ai_ticket_management';

mongoose.connect(process.env.MONGO_URI || 'mongodb://localhost:27017/ai_ticket_management')
  .then(async () => {
    console.log('Connected to DB');
    const issueKBResult = await IssueKB.deleteMany({});
    console.log(`Deleted ${issueKBResult.deletedCount} issue KB entries`);
    process.exit(0);
  })
  .catch(err => {
    console.error('DB connection error:', err);
    process.exit(1);
  });
