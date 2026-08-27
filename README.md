# Reflect - Journaling Companion & Reflection Coach

Reflect is an empathetic, insightful, and grounded journaling companion and personal reflection coach powered by Google Gemini models via the `@google/genai` SDK. It empowers individuals to unpack tangled thoughts, deconstruct emotional states, identify implicit assumptions, and uncover constructive, actionable life insights.

---

## 🛡️ Agentic Threat Modeling & Security Architecture

In compliance with Production Directives and OWASP Top 10 / OWASP Top 10 for LLM Applications:

| Threat Zone | Potential Vulnerability / Vector | Implemented Security Countermeasure |
| :--- | :--- | :--- |
| **1. Input Surfaces** | Prompt injection, malicious control characters, oversized text payloads (>500KB) | Strict schema validation, character capping (20,000 chars), defensive destructuring, payload sanitization |
| **2. Planning & Reasoning** | Hallucinations, schema drift, ungrounded advice | Rigid JSON `responseSchema` validation via `@google/genai`, structured parsing fallback, strict system instructions |
| **3. Tool Execution** | API rate limits (429), model unavailability (503/404), latency spikes | **Resilient Model Fallback Ladder** (`gemini-3.6-flash` → `gemini-3.1-flash-lite` → `gemini-flash-latest` → `gemini-3.7-flash`) with error matrix handling |
| **4. Memory & State** | Corrupted states, `undefined` serialization exceptions, data loss on network drops | Defensive undefined stripping (`sanitizePayload`), transaction verification, local storage persistence with export/import backup |
| **5. Inter-System Communication**| Gemini API key leakage to client or web browsers | Full-stack server proxy (`/api/reflect`), zero client-side SDK imports, environment secrets injection via Secret Manager |

---

## 🚀 Key Features

- 🌿 **Empathetic & Grounded Reflection Coach**: Delivers non-judgmental, warm feedback that validates emotions without toxic positivity or therapy clichés.
- 🎯 **Structured Synthesis Metadata**: Automatic generation of concise 3–6 word session titles, dominant emotional mood tags, thematic tags, and 1–2 sentence executive realization summaries.
- 💬 **Interactive Deepening Threads**: Multi-turn dialogue allowing users to answer the coach's open-ended introspective questions and explore realizations in depth.
- 🎙️ **Voice Introspection**: Integrated audio reflection reader using speech synthesis with grounded pacing.
- 🧭 **Guided Frameworks & Bespoke Prompts**: Pre-built frameworks (*Emotional Unpacking*, *Decision Crossroad*, *Grounded Gratitude*, *Facing Resistance*, *Values Alignment*) plus an AI-powered custom prompt generator.
- 📊 **Emotional & Thematic Trends**: Visual insights dashboard tracking dominant moods over time, recurring thematic patterns, and journaling streaks.
- 📦 **Data Portability**: Full JSON backup and Markdown archive export (compatible with Obsidian, Notion, or Logseq), plus one-click JSON restore.

---

## 🔒 Cloud Firestore Security Rules

Cloud Firestore is enabled with owner-bound data isolation and fine-grained subcollection rules:

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // Helper functions
    function isAuthenticated() {
      return request.auth != null;
    }
    
    function isOwner(userId) {
      return isAuthenticated() && request.auth.uid == userId;
    }

    // User document
    match /users/{userId} {
      allow read, write: if isOwner(userId);
    }

    // User journal reflections
    match /users/{userId}/entries/{entryId} {
      allow read, delete: if isOwner(userId);
      allow create: if isOwner(userId) && request.resource.data.userId == userId;
      allow update: if isOwner(userId) && request.resource.data.userId == userId;
    }
  }
}
```

---

## 🔑 Secret Manager & Cloud Configuration

### 1. Create and populate the secret
```bash
gcloud secrets create GEMINI_API_KEY --replication-policy="automatic"
echo -n "YOUR_API_KEY" | gcloud secrets versions add GEMINI_API_KEY --data-file=-
```

### 2. Grant Cloud Run Service Account Access
```bash
gcloud secrets add-iam-policy-binding GEMINI_API_KEY \
  --member="serviceAccount:YOUR_PROJECT_NUMBER-compute@developer.gserviceaccount.com" \
  --role="roles/secretmanager.secretAccessor"
```

---

## 🚢 Google Cloud Run Deployment

Deploy the container to Cloud Run with required environment bindings and challenge verification labeling:

```bash
# 1. Build and deploy to Cloud Run
gcloud run deploy reflect-journal-coach \
  --source . \
  --region asia-southeast1 \
  --allow-unauthenticated \
  --set-secrets GEMINI_API_KEY=GEMINI_API_KEY:latest

# 2. Apply mandatory campaign verification label
gcloud run services update reflect-journal-coach \
  --update-labels=dev-tutorial=cloud-run-ai-challenge \
  --region asia-southeast1
```

---

## 🧪 Functional Stability & Test Walkthrough

Below are the step-by-step test verification procedures covering all interactive user flows:

### Test Case 1: Initial Reflection Submission & Coach Response
1. Navigate to the **Reflection Studio** tab.
2. Select a starting mood chip (e.g. `Overwhelmed` or `Restless`).
3. Click on the **Decision Crossroad** template chip to populate starter text.
4. Add specific reflections into the textarea and click **Unpack & Reflect with Coach**.
5. **Expected Result**: The editor submits to `/api/reflect`, loading spinner activates, and the Coach Card renders with:
   - Formatted Markdown feedback with 1–2 open-ended thought exercises.
   - Dominant mood badge matching user state.
   - Thematic tags list.
   - Core Realization highlight block.
   - Entry is automatically saved to local storage.

### Test Case 2: Deepening Follow-up Dialogue
1. On an active reflection card, scroll to the **Deepen the Reflection** input area.
2. Type an answer to the coach's open-ended question.
3. Click **Send Follow-up**.
4. **Expected Result**: The message appears in the conversation thread, the coach provides grounded follow-up insight, and the session updates in history.

### Test Case 3: Audio Reflection Reading
1. Click the **Listen** button on any coach reflection card.
2. **Expected Result**: Speech synthesis begins reading the insight at a calm, grounded pace. The button updates to **Stop Voice** and pauses when clicked.

### Test Case 4: Bespoke Prompt Generation
1. In the Reflection Studio, click **Tailor Prompt**.
2. Enter custom mood (e.g., `Career burnout`) and topic (`Setting boundaries with manager`).
3. Click **Generate Prompt**.
4. **Expected Result**: AI coach crafts a bespoke prompt and automatically populates the journal editor.

### Test Case 5: History Search, Filter & Bookmark
1. Switch to the **History** tab.
2. Type a keyword into the search bar.
3. Filter by mood (e.g. `Grateful`) or click **Bookmarked**.
4. Click **Open Session** on any card to view the complete thread in the Studio.
5. Click the trash icon to test deletion with confirmation dialog.

### Test Case 6: Trends & Insights Visualization
1. Switch to the **Trends & Insights** tab.
2. Verify that total reflection count, active streak, word count, and top mood state calculate accurately.
3. Observe emotional landscape percentages and recurring thematic tag chips.

### Test Case 7: Data Export & Restore Backup
1. Click the top-right **DownloadCloud** icon.
2. Click **Markdown Archive** to download `.md` file; inspect Obsidian/Notion formatting.
3. Click **Full JSON Backup** to export structured JSON.
4. Clear data or import the JSON file to verify lossless recovery of all reflection sessions.
