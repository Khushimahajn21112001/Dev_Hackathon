# AI IT Support Agent

An intelligent IT Helpdesk solution that leverages a dual-model AI architecture to automatically analyze, route, and resolve corporate IT issues.

## AI Architecture Overview

This project uses a powerful dual-model AI approach combining Google Gemini's advanced reasoning with Xenova's local embedding models.

### Google Gemini (via `@google/generative-ai`)
Gemini acts as the "brain" of the system, handling complex reasoning and unstructured text tasks:
- **Ticket Rephrasing & Preview:** Understands messy user input and converts it into a clean, professional IT ticket format.
- **Entity Preservation:** Intelligently preserves critical technical entities (like specific URLs, ports, domains, and app names) without over-generalizing the issue.
- **Resolution Summarization:** Converts raw, messy IT agent notes into clean, reusable Knowledge Base (KB) articles formatted for future semantic search.

### Xenova Transformers (`@xenova/transformers`)
Xenova runs a local embedding model (`all-MiniLM-L6-v2`) inside the Node.js backend. It acts as the "search engine" of the system:
- **Semantic Similarity Matching:** Compares the mathematical meaning of a user's new issue against historical KB articles to find similar known fixes.
- **KB Retrieval:** Quickly fetches the exact known fix steps without needing an expensive API call for every search.
- **Duplicate Detection:** Prevents users from spamming the helpdesk by detecting if an identical issue is already open.

### MongoDB
The database handles state and memory:
- **Tickets:** Stores active and historical IT tickets.
- **Users:** Manages Corporate and Support user authentication.
- **Knowledge Base (ResolutionKB):** Stores historical fixes, including their AI vector embeddings, for fast retrieval.
- **Resolution History:** Tracks success rates to dynamically rank the best fixes for a given issue.

## Environment Variables

To run the AI models, you will need to add the following to your `backend/.env` file:
```
GEMINI_API_KEY=your_gemini_api_key_here
```
