const mongoose = require('mongoose');
require('dotenv').config();
const ResolutionKB = require('./src/models/ResolutionKB');
const Team = require('./src/models/Team');

async function fixKBs() {
  await mongoose.connect(process.env.MONGO_URI);
  console.log('Connected.');
  
  const vpnTeam = await Team.findOne({ name: 'VPN Team' });
  const appTeam = await Team.findOne({ name: 'Application Support Team' });
  const deskTeam = await Team.findOne({ name: 'Desktop Support Team' });
  const netTeam = await Team.findOne({ name: 'Network Team' });

  // Update existing KB records with correct teams
  if (appTeam) await ResolutionKB.updateMany({ category: 'Application Support' }, { $set: { assignedTeam: appTeam._id } });
  if (vpnTeam) await ResolutionKB.updateMany({ category: 'VPN / Remote Access' }, { $set: { assignedTeam: vpnTeam._id } });
  if (deskTeam) await ResolutionKB.updateMany({ category: 'Desktop Support' }, { $set: { assignedTeam: deskTeam._id } });
  if (netTeam) await ResolutionKB.updateMany({ category: 'Network' }, { $set: { assignedTeam: netTeam._id } });

  console.log('Updated ResolutionKBs.');
  process.exit();
}
fixKBs();
