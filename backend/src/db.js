// db.js - MongoDB connection using Mongoose
require('dotenv').config();
const mongoose = require('mongoose');

const connectDB = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log('MongoDB connected');

    // Bootstrap: ensure Credential Access Team and Credential Admin user exist
    await bootstrapCredentialAccess();
  } catch (err) {
    console.error('MongoDB connection error:', err);
    process.exit(1);
  }
};

async function bootstrapCredentialAccess() {
  try {
    const Team = require('./models/Team');
    const User = require('./models/User');

    const TEAM_NAME = 'Credential Access Team';
    const ADMIN_USERNAME = 'credential_admin';

    // 1. Ensure the system team exists
    let team = await Team.findOne({ name: TEAM_NAME });
    if (!team) {
      team = await Team.create({
        name: TEAM_NAME,
        teamName: TEAM_NAME,
        description: 'System team that handles access requests and credential provisioning.',
        status: 'Active',
        isSystemTeam: true
      });
      console.log('[Bootstrap] Created Credential Access Team');
    }

    // 2. Ensure the system user exists
    let adminUser = await User.findOne({ username: ADMIN_USERNAME });
    if (!adminUser) {
      adminUser = await User.create({
        username: ADMIN_USERNAME,
        password: 'CredAdmin@123', // plain text, per project spec
        name: 'Credential Admin',
        email: 'credential.admin@company.com',
        role: 'Credential Admin',
        team: team._id,
        status: 'Active',
        isSystemUser: true
      });
      console.log('[Bootstrap] Created Credential Admin user (username: credential_admin, password: CredAdmin@123)');
    }

    // 3. Link user to team if not already linked
    if (!team.teamLead || String(team.teamLead) !== String(adminUser._id)) {
      await Team.findByIdAndUpdate(team._id, { teamLead: adminUser._id });
    }
  } catch (err) {
    console.error('[Bootstrap] Error during credential access bootstrap:', err.message);
  }
}

module.exports = connectDB;

