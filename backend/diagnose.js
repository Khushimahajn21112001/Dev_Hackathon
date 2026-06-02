const mongoose = require('mongoose');
async function main() {
  await mongoose.connect('mongodb://127.0.0.1:27017/ai-ticket-management');
  const KB = require('./src/models/ResolutionKB');
  const Team = require('./src/models/Team');
  const User = require('./src/models/User');
  
  const kbs = await KB.find({}).populate('assignedTeam', 'name');
  console.log('=== ResolutionKB Records:', kbs.length);
  kbs.forEach(kb => {
    console.log('---');
    console.log('Title:', kb.issueTitle);
    console.log('Embedding Length:', kb.embedding ? kb.embedding.length : 0);
    console.log('Problem Family:', kb.problemFamily);
    console.log('Root Cause:', kb.rootCause);
    console.log('knownFixSteps count:', kb.knownFixSteps ? kb.knownFixSteps.length : 0);
  });
  
  const teams = await Team.find({});
  console.log('\n=== Teams:', teams.length);
  teams.forEach(t => console.log(' -', t.name, '|', t.status));
  
  const users = await User.find({ role: 'Corporate User' }, 'username email');
  console.log('\n=== Corporate Users:', users.length);
  users.forEach(u => console.log(' -', u.username, u.email));
  
  process.exit(0);
}
main().catch(console.error);
