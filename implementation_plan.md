# Integrate Google Gemini into AI IT Support Agent

This plan outlines the integration of the Google Gemini API into the existing Node.js backend. The goal is to use Gemini for complex reasoning tasks (ticket preview generation, KB article summarization) while preserving the fast, local `@xenova/transformers` model for semantic similarity matching and duplicate detection.

## User Review Required

> [!IMPORTANT]
> The thresholds you requested for the Xenova semantic search (`>= 0.90` for strong, `0.75-0.89` for possible) are quite high for the `all-MiniLM-L6-v2` model, which naturally produces lower scores (around `0.60-0.70`) for short IT queries. 
> I recently adjusted the live thresholds to `0.65` (strong) and `0.50` (possible), along with a keyword boost, to make it work correctly in your previous testing. 
> **Question:** Should I revert the thresholds back to your requested `0.90 / 0.75` in this update, or keep the realistic `0.65 / 0.50` thresholds that are currently working?

> [!NOTE]
> The Gemini API integration requires a `GEMINI_API_KEY`. You will need to provide this key in the `.env` file after this plan is implemented.

## Proposed Changes

### Dependencies

#### [NEW] `package.json`
- Install `@google/generative-ai` package via npm.

---

### Prompts & AI Services

#### [NEW] `backend/src/services/geminiService.js`
- Initialize the Google Generative AI client using `process.env.GEMINI_API_KEY`.
- Create a `analyzeTicketIssue` function to process user issues and return a JSON structured preview.
- Create a `summarizeResolutionForKB` function to convert raw support notes into a clean KB article format.

#### [NEW] `backend/src/prompts/ticketAnalysisPrompt.js`
- System prompt for analyzing corporate user issues.
- Instructions to return exact JSON (title, description, category, priority, assigned team).
- Rules to preserve URLs, domains, and app names exactly, without over-generalizing (e.g. not turning a specific URL issue into a generic Wi-Fi issue).
- Injects the list of available database Teams so Gemini always suggests a valid team name.

#### [NEW] `backend/src/prompts/resolutionSummaryPrompt.js`
- System prompt for summarizing raw resolution steps from IT agents.
- Instructions to return clean JSON (issueTitle, rootCauseSummary, cleanResolutionSteps array, keywords).

---

### Route Updates

#### [MODIFY] `backend/src/routes/corporateRoutes.js`
- **POST `/api/corporate/analyze-issue`**:
  - Keep the existing Xenova entity extraction and embedding generation.
  - Inject the Gemini call to generate the `ticketPreview`.
  - Perform the Xenova cosine similarity search against `ResolutionKB`.
  - Apply the requested thresholds and entity safety checks.
  - Return either the `matchedKb` (if similarity crosses the threshold) OR the Gemini-generated `ticketPreview` (if no strong KB matches).
  - Use the Gemini-suggested team name to look up the exact `Team` ID from the database for accurate routing.

---

### Utilities

#### [MODIFY] `backend/src/utils/kbHelper.js`
- Update `upsertResolutionKB` to call `geminiService.summarizeResolutionForKB`.
- Instead of just saving the raw ticket `rootCause` and `resolutionSteps`, it will pass them to Gemini to get a clean, reusable KB summary format.
- Generate the Xenova embedding on the newly summarized text.

#### [MODIFY] `README.md`
- Add instructions on setting up `GEMINI_API_KEY`.
- Document the dual-model architecture: Gemini (reasoning, rephrasing) + Xenova (similarity matching).

## Verification Plan

### Automated/Manual Testing
- Start the backend server and ensure it connects to Gemini without errors.
- Send the test payload: `"graqa url is not opening on company wifi"` to `/api/corporate/analyze-issue`.
- Verify the response contains a Gemini-structured ticket preview preserving the "GRAQA URL" instead of a generic Wi-Fi issue.
- Verify that a known issue (e.g. "VPN is not connecting") still successfully returns the Xenova KB match instead of a new ticket preview.
- Resolve a test ticket and verify the resulting KB article in the database contains clean, Gemini-formatted arrays for `knownFixSteps` instead of raw text.
