const mongoose = require('mongoose');
async function main() {
  await mongoose.connect('mongodb://127.0.0.1:27017/ai-ticket-management');
  const User = require('./src/models/User');
  const u = await User.findOne({ username: 'nanda' });
  console.log('User:', JSON.stringify(u, null, 2));
  process.exit(0);
}
main().catch(console.error);
