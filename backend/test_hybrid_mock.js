require('dotenv').config();
const mongoose = require('mongoose');
const ResolutionKB = require('./src/models/ResolutionKB');
const { generateEmbedding } = require('./src/utils/aiMatching');
const ragService = require('./src/services/ragService');

// Mock geminiService extractIssueMetadata
const geminiService = require('./src/services/geminiService');

async function run() {
  await mongoose.connect(process.env.MONGO_URI);
  
  // Case 1: IP Access
  geminiService.extractIssueMetadata = async () => ({
    ipAddresses: ['10.10.1.5'],
    problemFamily: 'Server Access/Login Issue',
    category: 'Identity & Access'
  });
  console.log('\\n--- CASE 1: Same IP ---');
  await ragService.retrieveRelevantResolutions('10.10.1.5 server not able to access');

  // Case 2: ManageEngine vs PowerBI
  geminiService.extractIssueMetadata = async () => ({
    applicationNames: ['Power BI'],
    problemFamily: 'Application Blocked By Endpoint Policy',
    errorMessages: ['Access Denied']
  });
  console.log('\\n--- CASE 2: Same Problem Family, Different App ---');
  await ragService.retrieveRelevantResolutions('Power BI Access Denied');

  // Case 3: MFA Partial
  geminiService.extractIssueMetadata = async () => ({
    problemFamily: 'MFA / OTP Delivery Failure',
    tags: ['mfa']
  });
  console.log('\\n--- CASE 3: MFA Partial ---');
  await ragService.retrieveRelevantResolutions('CIAM MFA failure');

  // Case 4: Jira mismatch
  geminiService.extractIssueMetadata = async () => ({
    applicationNames: ['Power BI'],
    problemFamily: 'Application Blocked By Endpoint Policy',
    errorMessages: ['Access Denied']
  });
  console.log('\\n--- CASE 4: Total mismatch ---');
  await ragService.retrieveRelevantResolutions('VPN not connecting');

  await mongoose.disconnect();
}

run().catch(console.error);
