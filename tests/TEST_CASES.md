# Musashi One HR Agent — E2E Test Cases

Automated Playwright tests covering the full application: navigation flow, chat UI, citations, and backend API.

---

## Prerequisites

| Service | Command | Port |
|---------|---------|------|
| Frontend server | `python -m http.server 8080 --directory frontend` | 8080 |
| Backend API | `.venv\Scripts\python.exe -m uvicorn api:app --app-dir backend --port 8501 --reload` | 8501 |

> **UI tests (01–03) use a mocked `/chat` endpoint** — they run without the backend. API tests (04) require the backend on port 8501.

---

## How to Run

```powershell
# Install dependencies (first time only)
npm install
npx playwright install chromium

# Run all tests
npx playwright test

# Run UI tests only (no backend needed)
npx playwright test --project=ui

# Run API tests only (backend must be running)
npx playwright test --project=api

# View HTML report after a run
npx playwright show-report
```

---

## 01 — Navigation Flow

**File:** `tests/e2e/01_navigation.spec.js`  
**Requires:** Frontend on port 8080. No backend needed.

| ID | Test Case | Action | Expected Result |
|----|-----------|--------|-----------------|
| N-01 | Page loads | Navigate to `/Musashi%20One%20GPT.html` | Page title = "Musashi One GPT"; `.m1-root` is visible |
| N-02 | Enter app | Click landing screen | Scope selection cards (`.m1-scope-card`) appear |
| N-03 | Select Local Policies | Click card labelled "Local Policies" | Function tiles appear |
| N-04 | Select HR function | Click the live HR card (`.m1-func-card.live`) | Method tiles appear |
| N-05 | Select By Region | Click card labelled "By Region" | Region tiles (`.m1-region-tile`) appear |
| N-06 | Select Americas | Click region tile with text "Americas" | Connecting animation starts |
| N-07 | Chat UI loads | Wait for `.chat-app` after connecting | Full chat interface rendered; `.sidebar` is visible |
| N-08 | Back from chat | Click back button in chat topbar | `.chat-app` is gone; region panel returns |

---

## 02 — Chat Agent UI

**File:** `tests/e2e/02_chat_ui.spec.js`  
**Requires:** Frontend on port 8080. The `/chat` endpoint is **mocked** — no real backend needed.

**Mock SSE response used in these tests:**
```
data: {"sources":[{"document_name":"HR-VAC-2025","section_title":"Carryover Provisions"}]}

data: {"text":"According to the vacation policy [[1]], you may carry up to 5 days."}

data: [DONE]
```

| ID | Test Case | Action | Expected Result |
|----|-----------|--------|-----------------|
| C-01 | Welcome screen | Navigate to chat | `.welcome` visible; contains "Hi, Guest" |
| C-02 | Template tabs | Click each category tab (Leave, Manager, General, Policy) | Template grid updates for each tab |
| C-03 | Template click | Click first template tile in the grid | Composer `textarea` is pre-filled with the template prompt |
| C-04 | Send message | Type text in `textarea`, press Enter | User message appears in `.messages`; `.thinking-row` visible |
| C-05 | Streaming completes | Wait after send | `.thinking-row` disappears; assistant message in `.messages` |
| C-06 | Stop streaming button | Observe streaming state | `.send-btn.stop` is visible while streaming |
| C-07 | New chat | Click "New chat" in sidebar | `.messages` list cleared; `.welcome` screen reappears |
| C-08 | Sidebar collapse | Click panel-l toggle in topbar | `.sidebar-collapsed` class added to root `.chat-app` |
| C-09 | Sidebar expand | Click panel-l toggle again | `.sidebar-collapsed` class removed |
| C-10 | Theme toggle | Open profile dropdown; click light/dark mode option | `data-theme` attribute flips between `"dark"` and `"light"` |
| C-11 | Shortcuts modal | Press `?` key (focus outside textarea) | Shortcuts modal overlay appears |
| C-12 | Close modal with Escape | Press Escape while modal is open | Modal disappears |
| C-13 | Ctrl+K new chat | Press Ctrl+K | New chat triggered (welcome screen shows) |

---

## 03 — Citations & Right Panel

**File:** `tests/e2e/03_citations.spec.js`  
**Requires:** Frontend on port 8080. Same `/chat` mock as above (includes `[[1]]` citation and `sources` event).

| ID | Test Case | Action | Expected Result |
|----|-----------|--------|-----------------|
| R-01 | Inline citation renders | Send message; wait for response | `.cite` span visible inside the assistant bubble |
| R-02 | Cite chip row appears | After response completes | `.cite-chips-row` div visible below composer |
| R-03 | Cite chip label | Inspect first `.cite-chip` | Contains text "HR-VAC-2025" |
| R-04 | Inline cite click opens panel | Click `.cite` span in message | `.right-open` class added to `.chat-app` root |
| R-05 | Right panel shows document | After R-04 | Right panel element visible; contains "HR-VAC-2025" |
| R-06 | Right panel tabs | Click "Metadata" tab | Metadata section becomes visible |
| R-07 | Close right panel | Click close button on right panel | `.right-open` class removed from root |
| R-08 | Cite chip opens panel | Click `.cite-chip` button in chips row | `.right-open` class added to root |
| R-09 | Ctrl+. toggles panel | Press Ctrl+. with panel closed | Panel opens (`.right-open` added) |

---

## 04 — Backend API

**File:** `tests/e2e/04_api.spec.js`  
**Requires:** Backend running on port 8501. No frontend needed.

| ID | Test Case | Request | Expected Result |
|----|-----------|---------|-----------------|
| A-01 | Health check | `GET /health` | HTTP 200; body contains `"ok": true` |
| A-02 | Chat endpoint accessible | `POST /chat` `{ query: "What is the vacation policy?", history: [], agent_label: "Americas HR" }` | HTTP 200; `Content-Type: text/event-stream` |
| A-03 | Sources event arrives first | Parse SSE stream from A-02 | First non-empty event payload contains `sources` array |
| A-04 | Text events present | Parse SSE stream from A-02 | At least one event payload contains a `text` string |
| A-05 | Stream terminates | Parse SSE stream from A-02 | Final event data line = `[DONE]` |
| A-06 | Empty query rejected | `POST /chat` `{ query: "", history: [], agent_label: "Americas HR" }` | HTTP 4xx error response |
| A-07 | List conversations | `GET /conversations?user_id=default` | HTTP 200; body is a JSON array |
| A-08 | Create conversation | `POST /conversations` `{ user_id: "playwright-test", title: "E2E test chat" }` | HTTP 200; body contains `{ "id": "..." }` |
| A-09 | Get messages | `GET /conversations/{id}/messages` (id from A-08) | HTTP 200; body is a JSON array |
| A-10 | CORS header present | `OPTIONS /health` with `Origin: http://localhost:8080` | Response includes `access-control-allow-origin` header |

---

## Test Count Summary

| Suite | File | Count |
|-------|------|-------|
| Navigation | 01_navigation.spec.js | 8 |
| Chat UI | 02_chat_ui.spec.js | 13 |
| Citations | 03_citations.spec.js | 9 |
| API | 04_api.spec.js | 10 |
| **Total** | | **40** |

---

## Notes

- **Babel compilation delay:** The frontend uses in-browser Babel (CDN). The first page load compiles ~12 JSX files. Tests wait up to 15 s for `.m1-root` to appear.
- **SSE mock:** UI tests intercept `**/chat` with `page.route()` and return a complete mock body. This ensures deterministic, fast tests without hitting the real Anthropic API.
- **API test isolation:** A-08 creates a conversation with `user_id: "playwright-test"`. Clean up manually in Supabase if needed.
- **Retries:** `playwright.config.js` sets `retries: 1` to handle transient timing flakiness.
