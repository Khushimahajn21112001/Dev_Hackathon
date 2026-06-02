const http = require('http');

function post(path, body) {
  return new Promise((resolve, reject) => {
    const data = JSON.stringify(body);
    const opts = {
      hostname: 'localhost', port: 5000, path,
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(data) }
    };
    const req = http.request(opts, res => {
      let raw = '';
      res.on('data', d => raw += d);
      res.on('end', () => {
        try { resolve(JSON.parse(raw)); } catch(e) { resolve(raw); }
      });
    });
    req.on('error', reject);
    req.write(data);
    req.end();
  });
}

function postAuth(path, body, token) {
  return new Promise((resolve, reject) => {
    const data = JSON.stringify(body);
    const opts = {
      hostname: 'localhost', port: 5000, path,
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(data), 'Authorization': `Bearer ${token}` }
    };
    const req = http.request(opts, res => {
      let raw = '';
      res.on('data', d => raw += d);
      res.on('end', () => {
        try { resolve(JSON.parse(raw)); } catch(e) { resolve(raw); }
      });
    });
    req.on('error', reject);
    req.write(data);
    req.end();
  });
}

async function main() {
  // Login
  console.log('Logging in...');
  const loginResp = await post('/api/auth/login', { username: 'nanda', password: 'Pass@123' });
  if (!loginResp.token) { console.error('Login failed:', loginResp); process.exit(1); }
  const { token, userId } = loginResp;
  console.log('Login OK. User ID:', userId);

  // Test 1: VPN routing issue -> should map to Network Team
  console.log('\n=== Test 1: VPN routing ===');
  const test1 = await postAuth('/api/corporate/analyze-issue',
    { userId: userId, issueText: 'My VPN routing is not connecting. I cannot access the company network remotely.' },
    token
  );
  if (test1.ragAnswerAvailable) {
    console.log('RAG FOUND! Match type:', test1.matchType, '| Score:', test1.finalScore);
    console.log('Summary:', test1.ragResponse?.summary);
    console.log('Recommended Team:', test1.ragResponse?.recommendedTeam);
  } else if (test1.ticketPreview) {
    console.log('Ticket Preview -> Team:', test1.ticketPreview.assignedTeam, '| Title:', test1.ticketPreview.ticketTitle);
  } else {
    console.log('Full Response:', JSON.stringify(test1, null, 2));
  }

  // Test 2: Blocked application -> should suggest Security Team + show ManageEngine resolution
  console.log('\n=== Test 2: Application blocked (CMD, Power BI) ===');
  const test2 = await postAuth('/api/corporate/analyze-issue',
    { userId: userId, issueText: 'Applications like CMD and Power BI are not opening on my machine. It is showing Access Denied.' },
    token
  );
  if (test2.ragAnswerAvailable) {
    console.log('RAG FOUND! Match type:', test2.matchType, '| Score:', test2.finalScore);
    console.log('Summary:', test2.ragResponse?.summary);
    console.log('Recommended Team:', test2.ragResponse?.recommendedTeam);
  } else if (test2.ticketPreview) {
    console.log('Ticket Preview -> Team:', test2.ticketPreview.assignedTeam, '| Title:', test2.ticketPreview.ticketTitle);
  } else {
    console.log('Response:', JSON.stringify(test2, null, 2));
  }
}

main().catch(e => { console.error('Test failed:', e); process.exit(1); });
