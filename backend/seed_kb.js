require('dotenv').config();
const mongoose = require('mongoose');
require('./src/models/ResolutionKB');
const { generateEmbedding } = require('./src/utils/aiMatching');

async function seedKB() {
  const mongoUri = process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/ai_ticket';
  console.log("Connecting to:", mongoUri);
  await mongoose.connect(mongoUri);
  const ResolutionKB = mongoose.model('ResolutionKB');

  const issueText = "I am not able to login 10.10.1.5 server, Please check and resolved it asap.";
  const description = "User reported: I am not able to login 10.10.1.5 server, Please check and resolved it asap.";
  
  const combinedText = `${issueText}. ${description}`;
  const embedding = await generateEmbedding(combinedText);

  // Clear any existing matching KB to avoid duplicates
  await ResolutionKB.deleteMany({ issueTitle: issueText });

  const kbEntry = new ResolutionKB({
    issueTitle: issueText,
    category: "Server Support",
    problemFamily: "Server Access/Login Issue",
    rootCauseCategory: "Server Access Policy",
    rootCause: "Active Directory policy or firewall blocking IP address 10.10.1.5",
    knownFixSteps: [
      "Verify that the user has VPN connected if accessing an internal server.",
      "Check if the server 10.10.1.5 is up and running by pinging it.",
      "Verify the user's Active Directory account is not locked.",
      "Check the server's local firewall rules to ensure SSH/RDP port is open."
    ],
    ipAddresses: ["10.10.1.5"],
    tags: ["login", "server", "10.10.1.5", "access"],
    solvedCount: 1,
    successCount: 1,
    successRate: 100,
    embedding: embedding
  });

  await kbEntry.save();
  console.log("Seed KB entry created successfully in target database.");
  process.exit(0);
}

seedKB().catch(console.error);
