require('dotenv').config();
const mongoose = require('mongoose');

const Ticket = require('./src/models/Ticket');
const ResolutionKB = require('./src/models/ResolutionKB');
const Notification = require('./src/models/Notification');
const TicketLog = require('./src/models/TicketLog');

async function cleanDB() {
  try {
    console.log('Connecting to MongoDB...');
    await mongoose.connect(process.env.MONGO_URI);
    console.log('Connected. Deleting tickets and notifications...');
    
    // Delete all tickets, ticket logs, and notifications
    await Ticket.deleteMany({});
    await TicketLog.deleteMany({});
    await Notification.deleteMany({});
    
    // Delete only KBs that were generated from a ticket (keeping the baseline ones if they have no createdFromTicketId, wait, baseline ones in seedData have no createdFromTicketId)
    // If the user wants to delete ALL KBs, we can do ResolutionKB.deleteMany({}) but they'd lose the baseline. Let's delete KBs created from tickets.
    const result = await ResolutionKB.deleteMany({ createdFromTicketId: { $exists: true } });
    
    console.log(`✅ Success! Deleted all tickets, notifications, logs, and ${result.deletedCount} user-created KB articles.`);
    console.log('You can now start completely fresh.');
    process.exit(0);
  } catch (error) {
    console.error('Error cleaning DB:', error);
    process.exit(1);
  }
}

cleanDB();
