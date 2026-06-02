# Goal Description
Enhance the AI IT Support Agent's RAG (Retrieval-Augmented Generation) and Knowledge Base matching logic. The system will be upgraded to identify related issue families and abstract root causes, rather than relying solely on semantic embedding similarity (which fails when application names differ). The flow includes metadata extraction when tickets are closed, advanced metadata extraction when a new issue is analyzed, hybrid matching logic, and Gemini-generated RAG answers for the end user.

## Proposed Changes

### 1. Database Schema Updates
- **ResolutionKnowledgeBase (`backend/src/models/ResolutionKB.js`)**: Add optional fields: `applicationNames`, `errorMessages`, `rootCauseCategory`, `problemFamily`, `policyTool`, `affectedLayer`, `resolutionType`, `tags`.
- **Ticket (`backend/src/models/Ticket.js`)**: Add RAG metrics to track performance: `attemptedRag`, `attemptedRagKbIds`, `attemptedRagSteps`, `ragFinalScore`, `extractedMetadata`, `userSaidRagFailed`.

### 2. AI Metadata Extraction on Ticket Closure
- **`backend/src/routes/ticketRoutes.js`**: Update the `PATCH /close/:id` route. When a support user marks a ticket with `reusableFix: true`, we will call the Gemini API to extract structured JSON metadata (e.g., `applicationNames`, `rootCauseCategory`, `problemFamily`, `policyTool`, `affectedLayer`, `resolutionType`, `tags`) based on the ticket's title, issue description, root cause, and resolution steps. The resulting extracted metadata will be saved directly into the newly created Knowledge Base record. 

### 3. User Issue Metadata Extraction & Hybrid RAG Logic
- **`backend/src/routes/corporateRoutes.js` (`/analyze-issue`)**: 
  - Before running Xenova embedding similarity, run a Gemini call to extract structured metadata from the user's issue text.
  - Fetch existing KB records and calculate the Xenova semantic similarity score.
  - Apply Hybrid Scoring Logic: 
    - `Final Score = (semantic * 0.45) + (problemFamilyMatch * 0.25) + (rootCauseCategoryMatch * 0.15) + (tagOverlapScore * 0.10) + (categoryMatch * 0.05)`
  - Evaluate thresholds:
    - `>= 0.80`: Strong match.
    - `>= 0.65` and `< 0.80`: Possible match.
    - `< 0.65`: No match.
  - If a match is found (`>= 0.65`), use Gemini to generate a response combining the top 3 KBs. It will explain why the issue may be related without claiming it is the exact same issue if applications differ.
  
- **`backend/src/routes/corporateRoutes.js` (`/create-ticket`)**: Update this route to accept and store the newly introduced RAG attempt metadata in the `Ticket` database if the user says the RAG response did not resolve their issue.

### 4. Frontend UI Updates
- **`frontend/src/components/Corporate/RaiseRequest.jsx`**: Modify the component to accept the new `/analyze-issue` response structure. If `ragAnswerAvailable` is true, render a new "Possible Related Resolution Found" card displaying the RAG summary, why it may be related, possible root causes, recommended steps, and buttons to either confirm it worked or proceed to create a ticket. Show a dynamic disclaimer note when the applications differ.
- **`frontend/src/components/Dashboard/ResolutionKBPage.jsx`**: Update the Admin KB view to include the newly added columns (Problem Family, Root Cause Category, Applications, Tags) and add filtering capability for Problem Family, Root Cause Category, and Assigned Team.

## Open Questions
- Is there a specific Gemini model version (e.g. `gemini-1.5-pro` or `gemini-1.5-flash`) that you prefer using for the structured metadata extraction to balance latency and accuracy?
- For the Admin KB view, do you want the filters to be simple text inputs, or should they be dropdowns aggregating the unique values dynamically from the backend?

## Verification Plan
### Automated Tests
- Post an issue to `/analyze-issue` and verify the hybrid score calculation when problem families overlap but application names do not.
- Verify `PATCH /close/:id` returns a successfully populated KB object with AI-extracted metadata.

### Manual Verification
- Simulate Test Case 1: Close a ticket for Chrome blocked by ManageEngine. Then raise an issue for CMD blocked by ManageEngine and verify the "Possible Related Resolution" card appears in the UI with a strong hybrid score.
- Ensure the normal ticket flow still succeeds if the Hybrid RAG score falls below 0.65.
