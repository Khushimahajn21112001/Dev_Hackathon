require('dotenv').config();
const mongoose = require('mongoose');
const ResolutionKB = require('./src/models/ResolutionKB');
const { extractIssueMetadata } = require('./src/services/geminiService');
const { generateEmbedding } = require('./src/utils/aiMatching');

// We'll just run a quick logic check locally instead of importing ragService 
// because ragService has side-effects (like Mongoose connections).
// Actually, it's easier to just call it directly.
const ragService = require('./src/services/ragService');

async function run() {
  await mongoose.connect(process.env.MONGO_URI);
  console.log('Connected to DB');

  await ResolutionKB.deleteMany({});
  
  // Case 1: IP Access
  const kb1 = new ResolutionKB({
    issueTitle: '10.10.1.5 server not able to login',
    category: 'Identity & Access',
    problemFamily: 'Server Access/Login Issue',
    knownFixSteps: ['Check AD permissions'],
    ipAddresses: ['10.10.1.5'],
    errorMessages: ['Access Denied'],
    embedding: await generateEmbedding('10.10.1.5 server not able to login')
  });
  await kb1.save();

  // Case 2: ManageEngine vs PowerBI
  const kb2 = new ResolutionKB({
    issueTitle: 'Chrome blocked due to ManageEngine policy',
    category: 'Security',
    problemFamily: 'Application Blocked By Endpoint Policy',
    knownFixSteps: ['Approve exception'],
    applicationNames: ['Chrome'],
    policyTool: 'ManageEngine',
    embedding: await generateEmbedding('Chrome blocked due to ManageEngine policy')
  });
  await kb2.save();

  // Case 3: MFA
  const kb3 = new ResolutionKB({
    issueTitle: 'CIAM MFA email OTP not received',
    category: 'Identity & Access',
    problemFamily: 'MFA / OTP Delivery Failure',
    knownFixSteps: ['Check spam folder'],
    tags: ['ciam', 'mfa'],
    embedding: await generateEmbedding('CIAM MFA email OTP not received')
  });
  await kb3.save();

  // Case 4: Jira
  const kb4 = new ResolutionKB({
    issueTitle: 'Jira session expired after login',
    category: 'Application Support',
    problemFamily: 'Browser Session / Cookie Issue',
    knownFixSteps: ['Clear cookies'],
    applicationNames: ['Jira'],
    errorMessages: ['session expired'],
    embedding: await generateEmbedding('Jira session expired after login')
  });
  await kb4.save();

  console.log('\\n--- CASE 1: Same IP ---');
  await ragService.retrieveRelevantResolutions('10.10.1.5 server not able to access');

  console.log('\\n--- CASE 2: Same Problem Family, Different App ---');
  await ragService.retrieveRelevantResolutions('Power BI Access Denied');

  console.log('\\n--- CASE 3: MFA Partial ---');
  await ragService.retrieveRelevantResolutions('CIAM MFA failure');

  console.log('\\n--- CASE 4: Total mismatch ---');
  await ragService.retrieveRelevantResolutions('VPN not connecting');

  await mongoose.disconnect();
}

run().catch(console.error);
