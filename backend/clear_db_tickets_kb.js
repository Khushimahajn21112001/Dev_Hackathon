const mongoose = require('mongoose');

const MONGO_URI = 'mongodb://localhost:27017/ai-ticket-management';

async function clearDatabase() {
  console.log('Connecting to database...');
  await mongoose.connect(MONGO_URI);
  console.log('Connected.');

  try {
    // We register mock schemas just to delete all documents in the collections
    const collectionsToClear = [
      { name: 'tickets', modelName: 'Ticket' },
      { name: 'ticketlogs', modelName: 'TicketLog' },
      { name: 'resolutionkbs', modelName: 'ResolutionKB' },
      { name: 'activitylogs', modelName: 'ActivityLog' },
      { name: 'notifications', modelName: 'Notification' }
    ];

    for (const col of collectionsToClear) {
      console.log(`Clearing collection: ${col.name}...`);
      let Model;
      try {
        Model = mongoose.model(col.modelName);
      } catch {
        Model = mongoose.model(col.modelName, new mongoose.Schema({}, { strict: false, collection: col.name }));
      }
      const res = await Model.deleteMany({});
      console.log(`Cleared ${res.deletedCount} documents from ${col.name}.`);
    }

    console.log('Database cleanup completed successfully.');
  } catch (error) {
    console.error('Error during cleanup:', error);
  } finally {
    await mongoose.disconnect();
    console.log('Disconnected.');
  }
}

clearDatabase();
