require('dotenv').config();
const mongoose = require('mongoose');

async function main() {
  await mongoose.connect(process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/ai_ticket');
  const User = require('./src/models/User');
  const Team = require('./src/models/Team');

  const teams = await Team.find({ status: 'Active' });
  console.log('Teams found:', teams.map(t => t.name).join(', '));

  // Naming map: team name → short prefix
  const prefixMap = {
    'IT Support Team':       'itsupport',
    'Network Team':          'network',
    'Desktop Support Team':  'desktop',
    'Security Team':         'security',
    'Application Team':      'application',
    'Email & Collaboration': 'email',
    'Service Desk':          'servicedesk',
  };

  const created = [];

  for (const team of teams) {
    const prefix = prefixMap[team.name] || team.name.toLowerCase().replace(/[^a-z0-9]/g, '');

    const tlUsername   = `${prefix}tl`;
    const sup1Username = `${prefix}1`;
    const sup2Username = `${prefix}2`;

    // Create Team Lead
    let tl = await User.findOne({ username: tlUsername });
    if (!tl) {
      tl = await User.create({
        username: tlUsername,
        password: 'Pass@123',
        name: `${team.name} Lead`,
        email: `${tlUsername}@company.com`,
        role: 'Team Lead',
        team: team._id,
        status: 'Active',
      });
      console.log(`✓ Created TL:      ${tlUsername}`);
    } else {
      await User.findByIdAndUpdate(tl._id, { team: team._id, password: 'Pass@123' });
      console.log(`~ Updated TL:      ${tlUsername}`);
    }

    // Assign team lead to the team
    await Team.findByIdAndUpdate(team._id, { teamLead: tl._id });

    // Create Support User 1
    if (!await User.findOne({ username: sup1Username })) {
      await User.create({
        username: sup1Username,
        password: 'Pass@123',
        name: `${team.name} Agent 1`,
        email: `${sup1Username}@company.com`,
        role: 'Support User',
        team: team._id,
        status: 'Active',
      });
      console.log(`✓ Created Support: ${sup1Username}`);
    } else {
      await User.findOneAndUpdate({ username: sup1Username }, { team: team._id, password: 'Pass@123' });
      console.log(`~ Updated Support: ${sup1Username}`);
    }

    // Create Support User 2
    if (!await User.findOne({ username: sup2Username })) {
      await User.create({
        username: sup2Username,
        password: 'Pass@123',
        name: `${team.name} Agent 2`,
        email: `${sup2Username}@company.com`,
        role: 'Support User',
        team: team._id,
        status: 'Active',
      });
      console.log(`✓ Created Support: ${sup2Username}`);
    } else {
      await User.findOneAndUpdate({ username: sup2Username }, { team: team._id, password: 'Pass@123' });
      console.log(`~ Updated Support: ${sup2Username}`);
    }

    created.push({ team: team.name, tl: tlUsername, sup1: sup1Username, sup2: sup2Username });
  }

  console.log('\n====== SUMMARY ======');
  console.log('All passwords: Pass@123\n');
  created.forEach(c => {
    console.log(`Team: ${c.team}`);
    console.log(`  Team Lead:   ${c.tl}`);
    console.log(`  Support 1:   ${c.sup1}`);
    console.log(`  Support 2:   ${c.sup2}`);
    console.log('');
  });

  process.exit(0);
}
main().catch(console.error);
