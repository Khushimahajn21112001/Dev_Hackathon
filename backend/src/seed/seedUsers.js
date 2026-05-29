// backend/src/seed/seedUsers.js
const mongoose = require('mongoose');
const User = require('../models/User');
require('dotenv').config();

const users = [
  { username: 'admin', password: 'Pass@123', role: 'Admin' },
  { username: 'corporate', password: 'Pass@123', role: 'Corporate User' },
  { username: 'support', password: 'Pass@123', role: 'Support User' },
];

const seed = async () => {
  await mongoose.connect(process.env.MONGO_URI);
  await User.deleteMany({});
  await User.insertMany(users);
  console.log('✅ Users seeded');
  mongoose.disconnect();
};

seed().catch(err => {
  console.error('❌ Seed error', err);
  process.exit(1);
});
