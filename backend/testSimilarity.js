const { generateEmbedding } = require('./src/utils/aiMatching');

// cosine similarity
function cosine(A, B) {
  let dot = 0, normA = 0, normB = 0;
  for(let i=0; i<A.length; i++) {
    dot += A[i]*B[i];
    normA += A[i]*A[i];
    normB += B[i]*B[i];
  }
  return dot / (Math.sqrt(normA)*Math.sqrt(normB));
}

async function test() {
  const kbText = "Power BI Application Fails to Launch Due Application Support 1)Powerbi is blocked dur to manage engine policy being pushed 1)raise a elevation request and get it appoved from manager Powerbi application is not opening";
  const eKB = await generateEmbedding(kbText);

  const q1 = "Powerbi application is not opening";
  const e1 = await generateEmbedding(q1);
  console.log(`"${q1}" vs KB =`, cosine(e1, eKB).toFixed(3));

  const q2 = "Powerbi is not opening";
  const e2 = await generateEmbedding(q2);
  console.log(`"${q2}" vs KB =`, cosine(e2, eKB).toFixed(3));

  const q3 = "Power BI application is blocked";
  const e3 = await generateEmbedding(q3);
  console.log(`"${q3}" vs KB =`, cosine(e3, eKB).toFixed(3));
}
test().catch(console.error);
