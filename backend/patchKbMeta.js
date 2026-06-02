/**
 * Patch KB metadata — adds hardcoded problemFamily/tags/etc without calling Gemini.
 * Run: node patchKbMeta.js
 */
require('dotenv').config();
const mongoose = require('mongoose');
const ResolutionKB = require('./src/models/ResolutionKB');

const metadataMap = [
  {
    titleContains: 'manageengine',
    meta: {
      problemFamily: 'Application Blocked By Security Policy',
      rootCauseCategory: 'Endpoint Policy Restriction',
      affectedLayer: 'Endpoint Device',
      policyTool: 'ManageEngine',
      applicationNames: ['Chrome', 'CMD', 'Power BI', 'Any Application'],
      tags: ['application blocked', 'policy restriction', 'manageengine', 'access denied', 'endpoint'],
      resolutionType: 'Policy Whitelist / Access Restore',
    }
  },
  {
    titleContains: 'vpn',
    meta: {
      problemFamily: 'VPN Connectivity Failure',
      rootCauseCategory: 'Network Infrastructure Issue',
      affectedLayer: 'Network',
      policyTool: 'Cisco AnyConnect',
      applicationNames: ['VPN', 'AnyConnect'],
      tags: ['vpn', 'connectivity', 'network', 'routing', 'remote access', 'tunnel'],
      resolutionType: 'VPN Reconnect / Configuration Fix',
    }
  },
  {
    titleContains: 'internet',
    meta: {
      problemFamily: 'Network Connectivity Issue',
      rootCauseCategory: 'Network / DNS Failure',
      affectedLayer: 'Network',
      policyTool: '',
      applicationNames: [],
      tags: ['internet', 'network', 'dns', 'proxy', 'connectivity', 'no internet'],
      resolutionType: 'DNS Flush / Proxy Reset',
    }
  },
  {
    titleContains: 'outlook',
    meta: {
      problemFamily: 'Email Client Not Working',
      rootCauseCategory: 'Exchange Connectivity / Profile Corruption',
      affectedLayer: 'Application',
      policyTool: 'Microsoft Exchange',
      applicationNames: ['Outlook'],
      tags: ['outlook', 'email', 'exchange', 'not syncing', 'mailbox', 'profile'],
      resolutionType: 'Outlook Profile Rebuild',
    }
  },
  {
    titleContains: 'password',
    meta: {
      problemFamily: 'Account Lockout',
      rootCauseCategory: 'Active Directory Policy',
      affectedLayer: 'Identity & Access',
      policyTool: 'Active Directory',
      applicationNames: [],
      tags: ['password', 'account locked', 'login', 'active directory', 'credentials', 'reset'],
      resolutionType: 'Account Unlock / Password Reset',
    }
  },
  {
    titleContains: 'laptop',
    meta: {
      problemFamily: 'Device Performance Degradation',
      rootCauseCategory: 'Resource Exhaustion',
      affectedLayer: 'Endpoint Device',
      policyTool: '',
      applicationNames: [],
      tags: ['laptop', 'slow', 'performance', 'freeze', 'cpu', 'memory', 'hardware'],
      resolutionType: 'Performance Optimization / Hardware Check',
    }
  },
];

async function main() {
  await mongoose.connect(process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/ai_ticket');
  console.log('Connected. Patching KB metadata...');

  const kbs = await ResolutionKB.find({});
  for (const kb of kbs) {
    const titleLower = kb.issueTitle.toLowerCase();
    for (const mapping of metadataMap) {
      if (titleLower.includes(mapping.titleContains)) {
        await ResolutionKB.findByIdAndUpdate(kb._id, { $set: mapping.meta });
        console.log(`✓ Patched: "${kb.issueTitle}" → problemFamily="${mapping.meta.problemFamily}"`);
        break;
      }
    }
  }

  console.log('\nAll KB records patched!');
  process.exit(0);
}
main().catch(err => { console.error(err); process.exit(1); });
