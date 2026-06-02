const mongoose = require('mongoose');
const dotenv = require('dotenv');
const User = require('../models/User');
const Team = require('../models/Team');

dotenv.config();

const MONGO_URI = process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/ai_ticket_management';

const teamsData = [
  { name: 'IT Support Team', prefix: 'itsupport' },
  { name: 'Network Team', prefix: 'network' },
  { name: 'Application Support Team', prefix: 'appsupport' },
  { name: 'Identity & Access Team', prefix: 'iam' },
  { name: 'Infrastructure Team', prefix: 'infra' },
  { name: 'Security Team', prefix: 'security' },
  { name: 'Service Desk Team', prefix: 'servicedesk' }
];

async function seedData() {
  try {
    await mongoose.connect(MONGO_URI);
    console.log('Connected to MongoDB');

    // 1. Delete all teams
    await Team.deleteMany({});
    console.log('Deleted all teams.');

    // 2. Delete all users except Admin
    await User.deleteMany({ role: { $ne: 'Admin' } });
    console.log('Deleted all non-admin users.');

    // 3. Create teams and users
    for (const teamInfo of teamsData) {
      // Create Team
      const team = await Team.create({
        name: teamInfo.name,
        teamName: teamInfo.name,
        description: `Handles tasks for ${teamInfo.name}`,
        status: 'Active'
      });

      // Create Team Lead
      const tl = await User.create({
        username: `${teamInfo.prefix}tl`,
        password: 'Pass@123',
        name: `${teamInfo.name} Lead`,
        email: `${teamInfo.prefix}tl@company.com`,
        role: 'Team Lead',
        team: team._id,
        status: 'Active'
      });

      // Update team with TL
      team.teamLead = tl._id;
      await team.save();

      // Create 2 Support Users
      await User.create({
        username: `${teamInfo.prefix}1`,
        password: 'Pass@123',
        name: `${teamInfo.name} Agent 1`,
        email: `${teamInfo.prefix}1@company.com`,
        role: 'Support User',
        team: team._id,
        status: 'Active'
      });

      await User.create({
        username: `${teamInfo.prefix}2`,
        password: 'Pass@123',
        name: `${teamInfo.name} Agent 2`,
        email: `${teamInfo.prefix}2@company.com`,
        role: 'Support User',
        team: team._id,
        status: 'Active'
      });
      
      console.log(`Created team ${teamInfo.name} with TL ${teamInfo.prefix}tl and 2 support agents.`);
    }

    // Also recreate one Corporate User so they can still raise tickets
    await User.create({
      username: 'corp_user',
      password: 'Pass@123',
      name: 'Corporate User',
      email: 'corp_user@company.com',
      role: 'Corporate User',
      status: 'Active'
    });
    console.log('Recreated default corp_user.');

    console.log('Data reset successfully.');
    process.exit(0);
  } catch (error) {
    console.error('Error seeding data:', error);
    process.exit(1);
  }
}

seedData();
