require('dotenv').config();
const mongoose = require('mongoose');
async function main() {
  await mongoose.connect(process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/ai_ticket');
  const User = require('./src/models/User');
  const r = await User.updateMany({}, { password: 'Pass@123' });
  console.log('Updated', r.modifiedCount, 'users — all passwords set to Pass@123');
  const users = await User.find({}, 'username role');
  users.forEach(u => console.log(' -', u.username, '|', u.role, '| Pass@123'));
  process.exit(0);
}
main().catch(console.error);
