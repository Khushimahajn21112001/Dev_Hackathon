require('dotenv').config();
const mongoose = require('mongoose');
async function main() {
  await mongoose.connect(process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/ai_ticket');
  const User = require('./src/models/User');
  
  // Show all existing users and their passwords
  const users = await User.find({}, 'username password role status');
  console.log('=== All Users ===');
  users.forEach(u => console.log(`  ${u.username} | ${u.password} | ${u.role} | ${u.status}`));
  
  // Update admin password to Pass@123
  const result = await User.findOneAndUpdate(
    { role: 'Admin' },
    { password: 'Pass@123' },
    { new: true }
  );
  console.log('\n✓ Admin password updated to Pass@123 for:', result?.username);
  
  process.exit(0);
}
main().catch(console.error);
