// backend/src/seed/checkDB.js
require('dotenv').config();
const mongoose = require('mongoose');

const User = require('../models/User');
const Team = require('../models/Team');
const IssueKB = require('../models/IssueKB');
const ResolutionKB = require('../models/ResolutionKB');
const Ticket = require('../models/Ticket');
const Notification = require('../models/Notification');
const TicketLog = require('../models/TicketLog');

const check = async () => {
  console.log('Connecting to MongoDB...');
  await mongoose.connect(process.env.MONGO_URI);
  console.log('✅ Connected successfully!\n');

  console.log('--- DATABASE SCHEMAS & DOCUMENT COUNTS ---');
  
  const usersCount = await User.countDocuments();
  console.log(`• Users collection: ${usersCount} users`);
  
  const teamsCount = await Team.countDocuments();
  console.log(`• Teams collection: ${teamsCount} teams`);
  
  const issueKBCount = await IssueKB.countDocuments();
  console.log(`• Issue Knowledge Base: ${issueKBCount} items`);
  
  const resolutionKBCount = await ResolutionKB.countDocuments();
  console.log(`• Resolution Knowledge Base: ${resolutionKBCount} resolutions`);
  
  const ticketsCount = await Ticket.countDocuments();
  console.log(`• Total Tickets raised: ${ticketsCount} tickets`);

  const notificationsCount = await Notification.countDocuments();
  console.log(`• Total Notifications: ${notificationsCount} notifications`);

  const ticketLogsCount = await TicketLog.countDocuments();
  console.log(`• Total Ticket Logs: ${ticketLogsCount} logs\n`);

  console.log('--- DETAILED TEAMS LIST ---');
  const teams = await Team.find({}).populate('teamLead');
  for (const team of teams) {
    const memberCount = await User.countDocuments({ team: team._id });
    console.log(`  - Team: "${team.name}" (Status: ${team.status})`);
    console.log(`    Synonym/teamName: "${team.teamName || 'N/A'}"`);
    console.log(`    Description: ${team.description || 'No description'}`);
    console.log(`    Team Lead: ${team.teamLead ? team.teamLead.username : 'None'}`);
    console.log(`    Members Count: ${memberCount}`);
  }

  console.log('\n--- DETAILED USERS LIST ---');
  const users = await User.find({}).populate('team');
  users.forEach(u => {
    console.log(`  - Username: "${u.username}" | Name: "${u.name || 'N/A'}" | Role: "${u.role}" | Team: "${u.team?.name || 'None'}" | Status: ${u.status}`);
  });

  console.log('\n--- DETAILED TICKETS LIST ---');
  const tickets = await Ticket.find({}).populate('assignedTeam').populate('raisedBy').populate('assignedTo');
  tickets.forEach(t => {
    console.log(`  - Ticket: "${t.ticketNumber}" | Title: "${t.ticketTitle}"`);
    console.log(`    Status: ${t.status} | Priority: ${t.priority} | Raised By: ${t.raisedBy?.username || 'Unknown'}`);
    console.log(`    Assigned Team: ${t.assignedTeam?.name || 'Unassigned'} | Assigned To: ${t.assignedTo?.username || 'Unassigned'}`);
  });

  console.log('\n--- DETAILED TICKET LOGS ---');
  const logs = await TicketLog.find({}).populate('ticketId').populate('performedBy');
  if (logs.length === 0) {
    console.log('  No ticket logs found.');
  } else {
    logs.forEach(log => {
      console.log(`  - Log: Action: "${log.action}" on Ticket: "${log.ticketId?.ticketNumber || 'Unknown'}"`);
      console.log(`    Performed By: "${log.performedBy?.username || 'Unknown'}"`);
      console.log(`    Old Value: "${log.oldValue || 'N/A'}" | New Value: "${log.newValue || 'N/A'}"`);
      console.log(`    Timestamp: ${log.createdAt}`);
    });
  }

  console.log('\n--- KNOWLEDGE BASE ---');
  
  console.log('\n[1] Issue Scanners (Keyword triggers):');
  const issueKBs = await IssueKB.find({}).populate('assigned_team');
  issueKBs.forEach(kb => {
    console.log(`  - Issue: "${kb.title}"`);
    console.log(`    Category: ${kb.category}`);
    console.log(`    Keywords: [${kb.keywords.join(', ')}]`);
    console.log(`    Default Priority: ${kb.default_priority}`);
    console.log(`    Squad Route: "${kb.assigned_team?.name || 'Unassigned'}"`);
  });

  console.log('\n[2] Resolution Database (Instantly served resolutions):');
  const resolutionKBs = await ResolutionKB.find({});
  resolutionKBs.forEach(kb => {
    console.log(`  - Resolved Issue: "${kb.issueTitle}"`);
    console.log(`    Known Fixes:`);
    kb.steps.forEach((step, idx) => console.log(`      ${idx + 1}. ${step}`));
    console.log(`    Times Solved: ${kb.solvedCount}`);
  });

  console.log('\n----------------------------------------');
  mongoose.disconnect();
};

check().catch(err => {
  console.error('❌ Connection or query error', err);
  process.exit(1);
});
