require('dotenv').config();
const mongoose = require('mongoose');
const Team = require('./src/models/Team');
const connectDB = require('./src/db');

(async () => {
  try {
    await connectDB();
    const result = await Team.deleteMany({});
    console.log('Deleted', result.deletedCount, 'team(s)');
    process.exit(0);
  } catch (err) {
    console.error('Error deleting teams:', err);
    process.exit(1);
  }
})();
