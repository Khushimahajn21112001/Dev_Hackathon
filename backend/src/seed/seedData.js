// backend/src/seed/seedData.js
require('dotenv').config();
const mongoose = require('mongoose');

const User = require('../models/User');
const Team = require('../models/Team');
const IssueKB = require('../models/IssueKB');
const ResolutionKB = require('../models/ResolutionKB');
const Ticket = require('../models/Ticket');
const Notification = require('../models/Notification');
const TicketLog = require('../models/TicketLog');
const { generateEmbedding, extractEntities } = require('../utils/aiMatching');

const seed = async () => {
  console.log('Connecting to MongoDB...');
  await mongoose.connect(process.env.MONGO_URI);
  console.log('Connected successfully. Cleaning database collections...');

  // Clear existing data from all relevant collections
  await User.deleteMany({});
  await Team.deleteMany({});
  await IssueKB.deleteMany({});
  await ResolutionKB.deleteMany({});
  await Ticket.deleteMany({});
  await Notification.deleteMany({});
  await TicketLog.deleteMany({});
  console.log('✅ All collections cleared.');

  // 1. Create Admin and Corporate Users
  console.log('Seeding baseline Admin and Corporate users...');
  const adminUser = await User.create({
    username: 'admin',
    password: 'Pass@123',
    name: 'Admin User',
    email: 'admin@company.com',
    role: 'Admin',
    status: 'Active'
  });

  const corporateUser = await User.create({
    username: 'corporate',
    password: 'Pass@123',
    name: 'Corporate User',
    email: 'corporate@company.com',
    role: 'Corporate User',
    status: 'Active'
  });

  // 2. Create the 4 Teams
  console.log('Creating 4 standard teams...');
  const teamsData = [
    { name: 'VPN Team', description: 'Handles Cisco AnyConnect VPN, MFA, and remote connection issues' },
    { name: 'Application Support Team', description: 'Handles Jira, Confluence, Bitbucket, and custom corporate applications' },
    { name: 'Desktop Support Team', description: 'Handles laptop configuration, local software issues, and system slowness' },
    { name: 'Network Team', description: 'Handles office Wi-Fi, Ethernet, DNS, switch configurations, and internet lines' }
  ];

  const teams = await Team.insertMany(teamsData);
  const vpnTeam = teams.find(t => t.name === 'VPN Team');
  const appTeam = teams.find(t => t.name === 'Application Support Team');
  const desktopTeam = teams.find(t => t.name === 'Desktop Support Team');
  const networkTeam = teams.find(t => t.name === 'Network Team');

  // 3. For each team, insert 1 Team Lead and 3 Support Users
  console.log('Creating Team Leads and Support Users for each team...');

  // --- VPN Team ---
  const vpnLead = await User.create({
    username: 'vpnlead',
    password: 'Pass@123',
    name: 'VPN Team Lead',
    email: 'vpnlead@company.com',
    role: 'Team Lead',
    team: vpnTeam._id,
    status: 'Active'
  });
  await User.insertMany([
    { username: 'vpnuser1', password: 'Pass@123', name: 'VPN Support 1', email: 'vpnuser1@company.com', role: 'Support User', team: vpnTeam._id, status: 'Active' },
    { username: 'vpnuser2', password: 'Pass@123', name: 'VPN Support 2', email: 'vpnuser2@company.com', role: 'Support User', team: vpnTeam._id, status: 'Active' },
    { username: 'vpnuser3', password: 'Pass@123', name: 'VPN Support 3', email: 'vpnuser3@company.com', role: 'Support User', team: vpnTeam._id, status: 'Active' }
  ]);

  // --- Application Support Team ---
  const appLead = await User.create({
    username: 'applead',
    password: 'Pass@123',
    name: 'App Support Lead',
    email: 'applead@company.com',
    role: 'Team Lead',
    team: appTeam._id,
    status: 'Active'
  });
  await User.insertMany([
    { username: 'appuser1', password: 'Pass@123', name: 'App Support 1', email: 'appuser1@company.com', role: 'Support User', team: appTeam._id, status: 'Active' },
    { username: 'appuser2', password: 'Pass@123', name: 'App Support 2', email: 'appuser2@company.com', role: 'Support User', team: appTeam._id, status: 'Active' },
    { username: 'appuser3', password: 'Pass@123', name: 'App Support 3', email: 'appuser3@company.com', role: 'Support User', team: appTeam._id, status: 'Active' }
  ]);

  // --- Desktop Support Team ---
  const desktopLead = await User.create({
    username: 'desktoplead',
    password: 'Pass@123',
    name: 'Desktop Lead',
    email: 'desktoplead@company.com',
    role: 'Team Lead',
    team: desktopTeam._id,
    status: 'Active'
  });
  await User.insertMany([
    { username: 'desktopuser1', password: 'Pass@123', name: 'Desktop Support 1', email: 'desktopuser1@company.com', role: 'Support User', team: desktopTeam._id, status: 'Active' },
    { username: 'desktopuser2', password: 'Pass@123', name: 'Desktop Support 2', email: 'desktopuser2@company.com', role: 'Support User', team: desktopTeam._id, status: 'Active' },
    { username: 'desktopuser3', password: 'Pass@123', name: 'Desktop Support 3', email: 'desktopuser3@company.com', role: 'Support User', team: desktopTeam._id, status: 'Active' }
  ]);

  // --- Network Team ---
  const networkLead = await User.create({
    username: 'networklead',
    password: 'Pass@123',
    name: 'Network Lead',
    email: 'networklead@company.com',
    role: 'Team Lead',
    team: networkTeam._id,
    status: 'Active'
  });
  await User.insertMany([
    { username: 'networkuser1', password: 'Pass@123', name: 'Network Support 1', email: 'networkuser1@company.com', role: 'Support User', team: networkTeam._id, status: 'Active' },
    { username: 'networkuser2', password: 'Pass@123', name: 'Network Support 2', email: 'networkuser2@company.com', role: 'Support User', team: networkTeam._id, status: 'Active' },
    { username: 'networkuser3', password: 'Pass@123', name: 'Network Support 3', email: 'networkuser3@company.com', role: 'Support User', team: networkTeam._id, status: 'Active' }
  ]);

  // 4. Update the Team documents to set their teamLead field to their created Team Lead's ObjectId!
  console.log('Associating team leads to respective team configurations...');
  vpnTeam.teamLead = vpnLead._id;
  await vpnTeam.save();

  appTeam.teamLead = appLead._id;
  await appTeam.save();

  desktopTeam.teamLead = desktopLead._id;
  await desktopTeam.save();

  networkTeam.teamLead = networkLead._id;
  await networkTeam.save();

  // 5. Seed baseline IssueKB
  console.log('Seeding baseline Issue Knowledge Base (IssueKB)...');
  await IssueKB.insertMany([
    {
      title: 'VPN not connecting',
      category: 'VPN / Remote Access',
      keywords: ['vpn', 'remote access', 'mfa', 'timeout', 'cisco', 'connect'],
      assigned_team: vpnTeam._id,
      default_priority: 'High',
    },
    {
      title: 'Jira not opening',
      category: 'Application Support',
      keywords: ['jira', 'confluence', 'application', 'browser issue', 'jira login', 'bitbucket'],
      assigned_team: appTeam._id,
      default_priority: 'Medium',
    },
    {
      title: 'Laptop performance issues',
      category: 'Desktop Support',
      keywords: ['laptop', 'slow', 'blue screen', 'freeze', 'restart', 'boot', 'performance', 'hang'],
      assigned_team: desktopTeam._id,
      default_priority: 'Medium',
    },
    {
      title: 'Network connectivity issues',
      category: 'Network',
      keywords: ['wifi', 'wi-fi', 'internet', 'dns', 'network', 'ethernet', 'ip address', 'proxy'],
      assigned_team: networkTeam._id,
      default_priority: 'High',
    },
  ]);

  // 6. Seed baseline ResolutionKB with comprehensive IT issues
  console.log('Seeding baseline Resolution Knowledge Base (ResolutionKB)...');
  const kbData = [
    // ── APPLICATION SUPPORT ──────────────────────────────────────────────────
    {
      issueTitle: 'Jira not accessible or not opening',
      category: 'Application Support',
      symptoms: ['Jira page not loading', 'Jira 502 bad gateway', 'Jira login not working', 'Cannot open Jira'],
      knownFixSteps: [
        'Clear browser cache and cookies',
        'Try opening Jira in incognito/private mode',
        'Ensure you are connected to VPN',
        'Try a different browser (Chrome/Firefox)',
        'If still failing, contact App Support Team',
      ],
      rootCause: 'Browser cache corruption or VPN connectivity issue',
      assignedTeam: appTeam._id,
      solvedCount: 12,
      successCount: 10,
      successRate: 83,
    },
    {
      issueTitle: 'Confluence login not working or cannot access Confluence',
      category: 'Application Support',
      symptoms: [
        'Confluence login failed',
        'Cannot login to Confluence',
        'Confluence not opening',
        'Confluence credentials not working',
        'Confluence access denied',
        'Confluence not accessible',
        'Unable to login Confluence',
        'Confluence authentication error',
      ],
      knownFixSteps: [
        'Check if you are using the correct Confluence URL provided by IT',
        'Try clearing browser cache and cookies, then retry login',
        'Open Confluence in an incognito/private browser window',
        'Verify you are connected to the company VPN',
        'Try resetting your Confluence password via the Forgot Password link',
        'If SSO is used, ensure your Active Directory account is not locked',
        'Try a different browser (Chrome/Firefox/Edge)',
        'Contact Application Support Team if the issue persists',
      ],
      rootCause: 'Expired credentials, browser cache, VPN disconnection, or SSO token issue',
      assignedTeam: appTeam._id,
      solvedCount: 8,
      successCount: 7,
      successRate: 88,
    },
    {
      issueTitle: 'Outlook not syncing or not receiving emails',
      category: 'Application Support',
      symptoms: [
        'Outlook not syncing emails',
        'Emails not coming in Outlook',
        'Outlook not receiving mails',
        'Outlook mail sync issue',
        'Outlook emails not updating',
        'Outlook inbox not refreshing',
      ],
      knownFixSteps: [
        'Restart Microsoft Outlook application',
        'Click Send/Receive → Update Folder',
        'Check your internet connection and VPN status',
        'Go to File → Account Settings → Repair your email account',
        'Ensure Outlook is not in Offline Mode (look for "Work Offline" in the Send/Receive tab)',
        'If using Exchange, check with IT if the mail server is reachable',
        'Try restarting and signing back in if issue persists',
      ],
      rootCause: 'Outlook offline mode enabled, cached credentials expired, or Exchange connectivity issue',
      assignedTeam: appTeam._id,
      solvedCount: 18,
      successCount: 16,
      successRate: 89,
    },
    {
      issueTitle: 'Microsoft Teams not loading or crashing',
      category: 'Application Support',
      symptoms: [
        'Teams not loading',
        'Teams crashing',
        'Teams app not opening',
        'MS Teams black screen',
        'Teams keeps disconnecting',
      ],
      knownFixSteps: [
        'Close Teams completely and reopen',
        'Clear Teams cache: %appdata%\\Microsoft\\Teams → delete cache folder',
        'Sign out and sign back in to Teams',
        'Update Microsoft Teams to the latest version',
        'If on web, try a different browser',
      ],
      rootCause: 'Corrupted Teams cache or outdated application version',
      assignedTeam: appTeam._id,
      solvedCount: 9,
      successCount: 8,
      successRate: 89,
    },
    {
      issueTitle: 'Password reset or account locked out',
      category: 'Application Support',
      symptoms: [
        'Forgot password',
        'Account locked',
        'Cannot login',
        'Password expired',
        'Login not working',
        'Account disabled',
      ],
      knownFixSteps: [
        'Use the self-service password reset portal',
        'Contact IT helpdesk with your employee ID for manual reset',
        'Wait 15 minutes if account is temporarily locked due to failed attempts',
        'After reset, change password immediately and update it in all connected apps',
      ],
      rootCause: 'Multiple failed login attempts or password expiry policy',
      assignedTeam: appTeam._id,
      solvedCount: 25,
      successCount: 24,
      successRate: 96,
    },

    // ── VPN / REMOTE ACCESS ──────────────────────────────────────────────────
    {
      issueTitle: 'VPN not connecting or timeout error',
      category: 'VPN / Remote Access',
      symptoms: [
        'VPN not connecting',
        'VPN timeout',
        'Cisco AnyConnect not working',
        'MFA not triggering for VPN',
        'VPN dropping frequently',
        'Remote access not working',
      ],
      knownFixSteps: [
        'Restart the Cisco AnyConnect VPN client',
        'Check your internet connection first',
        'Approve the MFA push notification on your phone',
        'Try connecting from a different network (e.g., mobile hotspot)',
        'Reinstall AnyConnect if issue persists',
        'Contact VPN Team if server-side issue suspected',
      ],
      rootCause: 'Network instability or MFA authentication failure',
      assignedTeam: vpnTeam._id,
      solvedCount: 22,
      successCount: 20,
      successRate: 91,
    },
    {
      issueTitle: 'VPN software not installed or missing',
      category: 'VPN / Remote Access',
      symptoms: [
        'VPN not installed',
        'AnyConnect missing',
        'Need VPN software',
        'Cannot find VPN application',
      ],
      knownFixSteps: [
        'Download Cisco AnyConnect from the company software portal',
        'Run the installer as Administrator',
        'Use the VPN gateway address provided by IT',
        'Contact VPN Team if you do not have access to the software portal',
      ],
      rootCause: 'VPN client not deployed on device',
      assignedTeam: vpnTeam._id,
      solvedCount: 6,
      successCount: 6,
      successRate: 100,
    },

    // ── DESKTOP SUPPORT ──────────────────────────────────────────────────────
    {
      issueTitle: 'Laptop running slow or freezing',
      category: 'Desktop Support',
      symptoms: [
        'Laptop slow',
        'Computer freezing',
        'System hanging',
        'Blue screen',
        'Laptop restart randomly',
        'PC performance issues',
        'System very slow',
      ],
      knownFixSteps: [
        'Restart the laptop and check if it improves',
        'Open Task Manager and check for high CPU or RAM usage',
        'Close unnecessary browser tabs and background applications',
        'Run Disk Cleanup to free up space',
        'Check if Windows Update is running in the background',
        'If issue persists, contact Desktop Support for a hardware check',
      ],
      rootCause: 'High resource usage, insufficient disk space, or pending system updates',
      assignedTeam: desktopTeam._id,
      solvedCount: 14,
      successCount: 11,
      successRate: 79,
    },

    // ── NETWORK ──────────────────────────────────────────────────────────────
    {
      issueTitle: 'Office Wi-Fi not working or internet not accessible',
      category: 'Network',
      symptoms: [
        'Wifi not working',
        'No internet in office',
        'WiFi keeps disconnecting',
        'Cannot connect to office network',
        'Internet slow in office',
        'Network not available',
      ],
      knownFixSteps: [
        'Disconnect and reconnect to the office Wi-Fi network',
        'Forget the Wi-Fi network and reconnect with fresh credentials',
        'Restart your laptop\'s network adapter (Settings → Network → Disable/Enable)',
        'Try connecting to the wired Ethernet port if available',
        'If the entire office is affected, escalate to Network Team',
      ],
      rootCause: 'Wi-Fi driver issue, DHCP failure, or access point malfunction',
      assignedTeam: networkTeam._id,
      solvedCount: 16,
      successCount: 13,
      successRate: 81,
    },
  ];

  // Generate embeddings and extract entities for the seed KB data
  // IMPORTANT: We include symptoms in the embedding text so the AI can match
  // against common ways users describe the issue (not just the formal title).
  for (const kb of kbData) {
    const symptomsText = (kb.symptoms || []).join(' ');
    const textToEmbed = [
      kb.issueTitle,
      kb.category,
      symptomsText,
      kb.rootCause || '',
      kb.knownFixSteps.join(' '),
    ].join(' ');
    kb.embedding = await generateEmbedding(textToEmbed);
    kb.entities = extractEntities(textToEmbed);
  }

  await ResolutionKB.insertMany(kbData);

  // 7. Create sample tickets raised by Corporate user
  console.log('Seeding sample open tickets for each team...');
  await Ticket.insertMany([
    {
      ticketNumber: 'TKT-VPN-001',
      ticketTitle: 'VPN not connecting',
      issueDescription: 'Cannot connect to Cisco AnyConnect VPN, getting an MFA timeout error.',
      originalUserInput: 'vpn is not connecting, times out on mfa',
      category: 'VPN / Remote Access',
      assignedTeam: vpnTeam._id,
      priority: 'High',
      status: 'Open',
      raisedBy: corporateUser._id
    },
    {
      ticketNumber: 'TKT-APP-001',
      ticketTitle: 'Jira not opening',
      issueDescription: 'Getting a 502 bad gateway when trying to access Jira board.',
      originalUserInput: 'jira page is not loading 502 bad gateway',
      category: 'Application Support',
      assignedTeam: appTeam._id,
      priority: 'Medium',
      status: 'Open',
      raisedBy: corporateUser._id
    },
    {
      ticketNumber: 'TKT-DSK-001',
      ticketTitle: 'Laptop performance issues',
      issueDescription: 'Laptop is extremely slow and freezing frequently.',
      originalUserInput: 'my system is super slow and freezing',
      category: 'Desktop Support',
      assignedTeam: desktopTeam._id,
      priority: 'Medium',
      status: 'Open',
      raisedBy: corporateUser._id
    },
    {
      ticketNumber: 'TKT-NET-001',
      ticketTitle: 'Network connectivity issues',
      issueDescription: 'Office wifi is dropping every few minutes.',
      originalUserInput: 'wifi keeps disconnecting',
      category: 'Network',
      assignedTeam: networkTeam._id,
      priority: 'High',
      status: 'Open',
      raisedBy: corporateUser._id
    }
  ]);

  console.log('✅ Seed data successfully inserted!');
  mongoose.disconnect();
};

seed().catch(err => {
  console.error('❌ Seed error:', err);
  process.exit(1);
});
