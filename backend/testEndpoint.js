const issueText = "graqa url is not opening on company wifi";

async function runTest() {
  try {
    const res = await fetch('http://localhost:5000/api/corporate/analyze-issue', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId: "60b8d295f1d29300155b9e54", issueText }) // dummy object ID
    });
    const data = await res.json();
    console.log("Response from server:");
    console.log(JSON.stringify(data, null, 2));
  } catch(e) {
    console.error("Error:", e.message);
  }
}

runTest();
