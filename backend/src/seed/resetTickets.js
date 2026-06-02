const mongoose = require('mongoose');
const dotenv = require('dotenv');
const Ticket = require('../models/Ticket');
const ResolutionKB = require('../models/ResolutionKB');
const TicketLog = require('../models/TicketLog');
const Notification = require('../models/Notification');
const ActivityLog = require('../models/ActivityLog');

dotenv.config();

const MONGO_URI = process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/ai_ticket_management';

async function resetTickets() {
  try {
    await mongoose.connect(MONGO_URI);
    console.log('Connected to MongoDB');

    await Ticket.deleteMany({});
    console.log('Deleted all tickets.');

    await ResolutionKB.deleteMany({});
    console.log('Cleared Knowledge Base (ResolutionKB).');

    await TicketLog.deleteMany({});
    console.log('Cleared Ticket Logs.');

    await Notification.deleteMany({});
    console.log('Cleared Notifications.');

    await ActivityLog.deleteMany({});
    console.log('Cleared Activity Logs.');

    console.log('Successfully reset all ticket data and KB.');
    process.exit(0);
  } catch (error) {
    console.error('Error resetting tickets:', error);
    process.exit(1);
  }
}

resetTickets();
