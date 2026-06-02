/**
 * Full Database Seed Script
 * Run: node seed.js
 * This seeds teams, users, team routing rules, and sample KB entries with proper embeddings.
 */
require('dotenv').config();
const mongoose = require('mongoose');

const Team = require('./src/models/Team');
const User = require('./src/models/User');
const ResolutionKB = require('./src/models/ResolutionKB');
const TeamRoutingRule = require('./src/models/TeamRoutingRule');
const { generateEmbedding } = require('./src/utils/aiMatching');
const { extractKbMetadata } = require('./src/services/ragService');

async function main() {
  const mongoUri = process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/ai_ticket';
  await mongoose.connect(mongoUri);
  console.log('MongoDB connected to:', mongoUri);

  // ─────────────────────────────────────────────────────────────
  // 1. Clear existing data
  // ─────────────────────────────────────────────────────────────
  await Team.deleteMany({});
  await User.deleteMany({});
  await ResolutionKB.deleteMany({});
  await TeamRoutingRule.deleteMany({});
  console.log('Cleared existing data');

  // ─────────────────────────────────────────────────────────────
  // 2. Create Teams
  // ─────────────────────────────────────────────────────────────
  const teamDefs = [
    { name: 'IT Support Team',       description: 'General IT support for hardware and software issues' },
    { name: 'Network Team',          description: 'Network, VPN, connectivity, and infrastructure issues' },
    { name: 'Desktop Support Team',  description: 'Desktop hardware, OS, and local software support' },
    { name: 'Security Team',         description: 'Security policies, access control, and endpoint protection' },
    { name: 'Application Team',      description: 'Business application support (Jira, Confluence, SAP, etc.)' },
    { name: 'Email & Collaboration', description: 'Outlook, Teams, SharePoint, and collaboration tools' },
    { name: 'Service Desk',          description: 'Front-line service desk and ticket triage' },
  ];

  const teams = await Team.insertMany(teamDefs.map(t => ({ ...t, teamName: t.name, status: 'Active' })));
  const teamMap = {};
  teams.forEach(t => { teamMap[t.name] = t; });
  console.log('Teams created:', teams.map(t => t.name).join(', '));

  // ─────────────────────────────────────────────────────────────
  // 3. Create Users
  // ─────────────────────────────────────────────────────────────
  const userDefs = [
    // Admin
    { username: 'admin',   password: 'admin123',   name: 'Admin User',      email: 'admin@company.com',   role: 'Admin' },
    // Corporate Users
    { username: 'nanda',   password: 'nanda123',   name: 'Nanda Kumar',     email: 'nanda@company.com',   role: 'Corporate User' },
    { username: 'ash',     password: 'ash123',     name: 'Ash Sharma',      email: 'ash@company.com',     role: 'Corporate User' },
    { username: 'priya',   password: 'priya123',   name: 'Priya Patel',     email: 'priya@company.com',   role: 'Corporate User' },
    // Support Users
    { username: 'support1', password: 'support123', name: 'Ravi IT Support',  email: 'ravi@company.com',   role: 'Support User', team: 'IT Support Team' },
    { username: 'support2', password: 'support123', name: 'Sneha Network',    email: 'sneha@company.com',  role: 'Support User', team: 'Network Team' },
    { username: 'support3', password: 'support123', name: 'Kiran Desktop',   email: 'kiran@company.com',  role: 'Support User', team: 'Desktop Support Team' },
    // Team Leads
    { username: 'lead_it',      password: 'lead123', name: 'Lead IT',      email: 'lead_it@company.com',      role: 'Team Lead', team: 'IT Support Team' },
    { username: 'lead_network', password: 'lead123', name: 'Lead Network', email: 'lead_network@company.com', role: 'Team Lead', team: 'Network Team' },
  ];

  const createdUsers = [];
  for (const ud of userDefs) {
    const teamRef = ud.team ? teamMap[ud.team]?._id : undefined;
    const user = await User.create({
      username: ud.username,
      password: ud.password,
      name: ud.name,
      email: ud.email,
      role: ud.role,
      team: teamRef || null,
      status: 'Active'
    });
    createdUsers.push(user);
    console.log(`Created user: ${user.username} (${user.role})`);
  }

  // ─────────────────────────────────────────────────────────────
  // 4. Create Team Routing Rules (keyword-based)
  // ─────────────────────────────────────────────────────────────
  const routingRules = [
    {
      teamName: 'Network Team',
      teamId: teamMap['Network Team']._id,
      keywords: ['vpn', 'network', 'routing', 'connectivity', 'wifi', 'internet', 'dns', 'firewall', 'bandwidth', 'connection', 'ip', 'proxy', 'gateway', 'timeout', 'latency', 'ping'],
      status: 'Active'
    },
    {
      teamName: 'Desktop Support Team',
      teamId: teamMap['Desktop Support Team']._id,
      keywords: ['laptop', 'desktop', 'printer', 'monitor', 'keyboard', 'mouse', 'blue screen', 'bsod', 'freeze', 'slow', 'crash', 'driver', 'hardware'],
      status: 'Active'
    },
    {
      teamName: 'Security Team',
      teamId: teamMap['Security Team']._id,
      keywords: ['access denied', 'blocked', 'permission', 'policy', 'manageengine', 'antivirus', 'malware', 'security', 'unauthorized', 'locked', 'whitelist'],
      status: 'Active'
    },
    {
      teamName: 'Application Team',
      teamId: teamMap['Application Team']._id,
      keywords: ['jira', 'confluence', 'bitbucket', 'sap', 'application', 'app', 'software', 'error', 'power bi', 'powerbi', 'cmd'],
      status: 'Active'
    },
    {
      teamName: 'Email & Collaboration',
      teamId: teamMap['Email & Collaboration']._id,
      keywords: ['email', 'outlook', 'teams', 'sharepoint', 'onedrive', 'calendar', 'meeting', 'mailbox', 'smtp'],
      status: 'Active'
    },
    {
      teamName: 'IT Support Team',
      teamId: teamMap['IT Support Team']._id,
      keywords: ['password', 'reset', 'account', 'login', 'cannot login', 'locked out', 'credentials'],
      status: 'Active'
    },
  ];

  await TeamRoutingRule.insertMany(routingRules);
  console.log('\nTeam routing rules created:', routingRules.map(r => r.teamName).join(', '));

  // ─────────────────────────────────────────────────────────────
  // 5. Seed Sample Knowledge Base Records with Real Embeddings
  // ─────────────────────────────────────────────────────────────
  console.log('\nSeeding Knowledge Base records with embeddings...');

  const kbItems = [
    {
      issueTitle: 'Application blocked by ManageEngine security policy',
      rootCause: 'ManageEngine new endpoint policies were pushed by Security team that blocked specific applications from running.',
      knownFixSteps: [
        'Raise a request with the Security Team to whitelist the specific application in ManageEngine.',
        'Provide the application name and business justification to the Security Team.',
        'Security Team will update the ManageEngine policy to allow the application.',
        'Once whitelisted, restart the machine and verify the application opens.',
      ],
      category: 'Application Support',
      assignedTeamName: 'Security Team',
    },
    {
      issueTitle: 'VPN connection failure and routing issues',
      rootCause: 'VPN client configuration issue or network firewall blocking VPN traffic on port 443/UDP.',
      knownFixSteps: [
        'Disconnect from VPN and restart the VPN client (AnyConnect or GlobalProtect).',
        'Check if the VPN gateway address is correct in the client settings.',
        'Try connecting from a different network (e.g., mobile hotspot) to rule out local network firewall.',
        'If issue persists, contact Network Team with your VPN logs from %appdata%/Cisco/Cisco AnyConnect.',
        'Network team will check firewall rules and VPN gateway health.',
      ],
      category: 'VPN / Remote Access',
      assignedTeamName: 'Network Team',
    },
    {
      issueTitle: 'Internet not accessible on company network',
      rootCause: 'Proxy settings misconfigured or DNS resolution failing on the corporate network.',
      knownFixSteps: [
        'Check your proxy settings: Settings > Network > Proxy > make sure "Automatic" is selected.',
        'Flush DNS: Open CMD as admin and run "ipconfig /flushdns".',
        'Try accessing the internet using an IP directly (e.g., http://8.8.8.8) to check if DNS is the issue.',
        'If no internet at all, restart your network adapter: Device Manager > Network Adapters > Disable/Enable.',
        'Contact Network Team if the issue persists.',
      ],
      category: 'Network',
      assignedTeamName: 'Network Team',
    },
    {
      issueTitle: 'Outlook email not working or not syncing',
      rootCause: 'Outlook profile corrupted or Exchange server connectivity issue.',
      knownFixSteps: [
        'Close Outlook completely.',
        'Open Control Panel > Mail > Show Profiles > Remove the existing profile.',
        'Re-add the profile with your company email and let Outlook auto-configure.',
        'If profile repair fails, run: outlook.exe /resetnavpane',
        'Contact Email & Collaboration team if the issue persists after profile reset.',
      ],
      category: 'Email',
      assignedTeamName: 'Email & Collaboration',
    },
    {
      issueTitle: 'Password reset or account locked out',
      rootCause: 'Multiple failed login attempts triggered account lockout policy in Active Directory.',
      knownFixSteps: [
        'Contact IT Support Team immediately - they have admin access to unlock your account.',
        'Provide your employee ID and manager\'s name for verification.',
        'IT Support will unlock your account in Active Directory.',
        'After unlock, change your password immediately using Ctrl+Alt+Del > Change Password.',
        'Ensure Caps Lock is off when entering your new password.',
      ],
      category: 'Account Management',
      assignedTeamName: 'IT Support Team',
    },
    {
      issueTitle: 'Laptop running slow or freezing',
      rootCause: 'High memory/CPU usage due to background processes or insufficient RAM for running applications.',
      knownFixSteps: [
        'Open Task Manager (Ctrl+Shift+Esc) and identify high CPU/Memory processes.',
        'End any unnecessary background processes.',
        'Disable startup programs: Task Manager > Startup tab > Disable non-essential apps.',
        'Run Disk Cleanup: Search for "Disk Cleanup" and clean temporary files.',
        'Restart the laptop and check if performance improves.',
        'If still slow, contact Desktop Support for RAM assessment.',
      ],
      category: 'Desktop Support',
      assignedTeamName: 'Desktop Support Team',
    },
  ];

  for (const item of kbItems) {
    const team = teamMap[item.assignedTeamName];
    const textForEmbedding = `${item.issueTitle} ${item.rootCause}`;
    
    let embedding = [];
    let metadata = null;
    
    try {
      embedding = await generateEmbedding(textForEmbedding);
      console.log(`  - Embedding generated for: "${item.issueTitle.substring(0, 40)}..." (${embedding.length} dims)`);
    } catch (err) {
      console.error(`  - Failed embedding for: ${item.issueTitle}`, err.message);
    }

    try {
      metadata = await extractKbMetadata(
        item.issueTitle,
        item.rootCause,
        item.knownFixSteps,
        item.category,
        item.assignedTeamName
      );
      console.log(`  - Metadata extracted: problemFamily="${metadata?.problemFamily}"`);
    } catch (err) {
      console.error(`  - Failed metadata for: ${item.issueTitle}`, err.message);
    }

    await ResolutionKB.create({
      issueTitle: item.issueTitle,
      knownFixSteps: item.knownFixSteps,
      rootCause: item.rootCause,
      category: item.category,
      assignedTeam: team?._id || null,
      solvedCount: 1,
      successRate: 90,
      embedding: embedding,
      applicationNames: metadata?.applicationNames || [],
      errorMessages: metadata?.errorMessages || [],
      rootCauseCategory: metadata?.rootCauseCategory || '',
      problemFamily: metadata?.problemFamily || '',
      policyTool: metadata?.policyTool || '',
      affectedLayer: metadata?.affectedLayer || '',
      symptoms: metadata?.symptoms || [],
      resolutionType: metadata?.resolutionType || '',
      tags: metadata?.tags || [],
    });

    console.log(`  ✓ KB record created: ${item.issueTitle}`);
  }

  console.log('\n✅ Seed complete!');
  console.log('  Teams:', teams.length);
  console.log('  Users:', createdUsers.length);
  console.log('  Routing Rules:', routingRules.length);
  console.log('  KB Records:', kbItems.length);
  console.log('\nLogin credentials:');
  console.log('  Admin:         admin / admin123');
  console.log('  Corporate:     nanda / nanda123  |  ash / ash123');
  console.log('  Support:       support1 / support123  |  support2 / support123');
  console.log('  Team Lead:     lead_it / lead123  |  lead_network / lead123');

  process.exit(0);
}

main().catch(err => {
  console.error('Seed failed:', err);
  process.exit(1);
});
