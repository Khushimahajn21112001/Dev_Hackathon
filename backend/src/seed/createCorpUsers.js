const mongoose = require('mongoose');
const dotenv = require('dotenv');
const User = require('../models/User');

dotenv.config();

const MONGO_URI = process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/ai_ticket_management';

async function createCorpUsers() {
  try {
    await mongoose.connect(MONGO_URI);
    console.log('Connected to MongoDB');

    await User.create({
      username: 'nanda',
      password: 'Pass@123',
      name: 'Nanda',
      email: 'nanda@company.com',
      role: 'Corporate User',
      status: 'Active'
    });

    await User.create({
      username: 'ash',
      password: 'Pass@123',
      name: 'Ash',
      email: 'ash@company.com',
      role: 'Corporate User',
      status: 'Active'
    });

    console.log('Successfully created corporate users Nanda and Ash.');
    process.exit(0);
  } catch (error) {
    console.error('Error creating users:', error);
    process.exit(1);
  }
}

createCorpUsers();
