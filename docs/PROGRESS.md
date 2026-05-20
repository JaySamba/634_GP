# HR Agent — Project Progress Tracker
# Updated by Claude Code after every task

Last updated: 2026-05-20
Overall status: All phases complete + UI overhaul v2 + Chat Agent full-screen takeover implemented + Playwright E2E test suite created (30 UI tests, all passing)

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
PHASE 0 — Accounts & External Services         ✅ COMPLETE
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

  [✅] Anthropic account created, API key obtained
  [✅] Voyage AI account created, API key obtained
        - Upgraded to Pro (added payment card) to unlock rate limits
        - Free tier: 3 RPM / 10K TPM — not enough for ingest
        - Pro tier: 300 RPM — ingest completes in < 1 min
  [✅] Pinecone account created, API key obtained
        - Index name: hr-agent
        - Dimensions: 1024, Metric: cosine
  [✅] Supabase account created
        - Project ref: uzowatmilugjzgiknjtu
        - Region: us-east-2
        - Upgraded to Pro for IPv4 connection pooler access


━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
PHASE 1 — Project Scaffold & Smoke Test        ✅ COMPLETE
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

  Files created:
  [✅] hr-agent/ folder created on Desktop
  [✅] config.py          — settings singleton, reads .env, validates keys
  [✅] requirements.txt   — all Python dependencies
  [✅] smoke_test.py      — validates all 4 external services
  [✅] .env.example       — template for environment variables
  [✅] .gitignore
  [✅] README.md

  Package structure:
  [✅] hr_agent/__init__.py
  [✅] hr_agent/ingest/__init__.py
  [✅] hr_agent/retrieval/__init__.py
  [✅] hr_agent/chat/__init__.py

  Environment setup:
  [✅] Python virtual environment created (.venv)
        - Python version: 3.14.3
        - Activation: .venv\Scripts\Activate.ps1
  [✅] All dependencies installed (pip install -r requirements.txt)
        - 70 packages installed successfully
  [✅] .env file created and populated with real API keys

  Smoke test result — all 5 green:
  [✅] Anthropic API      — Claude responds correctly (3.4s)
  [✅] Voyage AI          — 1024-dim embeddings verified (2.5s)
  [✅] Pinecone           — hr-agent index found, 1024 dims confirmed (1.3s)
  [✅] Supabase API       — REST API + auth working (2.2s)
  [✅] Supabase Postgres  — psycopg2 connection via pooler (2.2s)
        - Pooler URL: aws-1-us-east-2.pooler.supabase.com:5432


━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
PHASE 2 — Ingest Pipeline                      ✅ COMPLETE
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

  Files created:
  [✅] migrations/001_chunks.sql
        - Creates chunks table in Supabase
        - Adds content_tsv GENERATED column (tsvector, 'simple' config)
        - GIN index on content_tsv for fast FTS
        - Index on document_name
        - chunks_recent convenience view
  [✅] hr_agent/ingest/loader.py
        - Reads PDF (pypdf), DOCX (python-docx), TXT/MD
        - Tags DOCX heading paragraphs with [HEADING] marker
        - Pulls table content from DOCX files
        - Skips unreadable files with warning
  [✅] hr_agent/ingest/chunker.py
        - Section-aware: splits on [HEADING], ## markdown, ALL-CAPS lines
        - Token-boundary splitting via tiktoken (cl100k_base)
        - 500-token chunks, 50-token overlap
        - Prepends section_title to each chunk for context
  [✅] hr_agent/ingest/embedder.py
        - Voyage AI voyage-3 model, 1024 dimensions
        - Batch size 128, input_type='document' for storage
        - input_type='query' for search queries
        - tenacity retry: 4 attempts, exponential backoff
  [✅] hr_agent/ingest/pipeline.py
        - Overwrite mode: wipes Pinecone + Supabase before re-ingesting
        - Rich progress bars for each stage
        - Steps: wipe → load → chunk → embed → write

  Migration:
  [✅] 001_chunks.sql run in Supabase SQL Editor — chunks table created

  Pipeline run result:
  [✅] Source folder: C:\Users\jaswanth.samba\Desktop\HR Chat Bot\Data\HR Files
  [✅] Documents processed: 139
  [✅] Chunks produced:     477
  [✅] Tokens embedded:     115,792
  [✅] Pinecone vectors:    477  ← matches
  [✅] Supabase rows:       477  ← matches


━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
PHASE 3 — Retrieval (Hybrid Search)            ✅ COMPLETE
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

  Files created:
  [✅] hr_agent/retrieval/retriever.py
        - retrieve(query, top_k=5) → list[RetrievedChunk]
        - Semantic leg: Pinecone cosine similarity search (top-20 candidates)
        - Keyword leg: Supabase plainto_tsquery FTS, ts_rank ordering (top-20)
        - Fusion: Reciprocal Rank Fusion (k=60, standard constant)
        - Returns: id, document_name, section_title, content, rrf_score
  [✅] test_retrieval.py
        - 4 test queries against live data
        - Prints top-3 results per query with RRF score + content preview

  Test results — all queries returning correct documents:
  [✅] "vacation days"         → HR-PP-58 Vacation Policy.docx (rrf=0.0164)
  [✅] "bereavement leave"     → BEREAVEMENT PAY RULES.pdf (rrf=0.0164)
  [✅] "harassment reporting"  → HS-PP-49 Harrassment Policy.docx (rrf=0.0328)
  [✅] "AODA accessibility"    → HR-PP-50B + HR-PP-50A AODA files (rrf=0.0325)

  Note: Higher RRF scores (0.032+) indicate the chunk appeared in BOTH
  semantic and keyword results — strongest signal of relevance.


━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
PHASE 4 — Chat Layer (Claude Integration)      ✅ COMPLETE
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

  Files created:
  [✅] migrations/002_conversations.sql
        - conversations table: id (UUID PK), user_id, title, created_at, updated_at
        - messages table: id (UUID PK), conversation_id (FK), role, content, sources (JSONB)
        - GIN indexes on conversation_id, updated_at, user_id
        - conversations_recent convenience view
        - ACTION REQUIRED: Run this in Supabase SQL Editor before launching app
  [✅] hr_agent/chat/prompts.py
        - Musashi Auto Parts Canada HR persona
        - 7 guardrails: cite sources, don't invent policy, escalate unknowns to hr@musashina.com
  [✅] hr_agent/chat/agent.py
        - create_conversation(user_id, title) → UUID str
        - load_history(conversation_id) → list[dict] (Claude messages format)
        - save_message(conversation_id, role, content, sources)
        - list_conversations(user_id, limit) → list[dict] (for sidebar)
        - stream_response(history, query, chunks) → generator yielding text chunks
        - chunks_to_sources(chunks) → list[dict]
        - Context injection: prior history + current query with policy excerpts prepended
  [✅] app.py (Streamlit frontend)
        - Claude-style streaming chat interface
        - Sidebar: user ID input, new conversation button, past conversations list
        - Sources shown as expandable section below each assistant message
        - Full conversation stored in Supabase (user_id + conversation_id + all messages)
        - Multi-turn memory: loads history from DB on each turn
  [✅] requirements.txt updated — added streamlit>=1.35.0

  To run after migration:
    pip install streamlit
    streamlit run app.py


━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
PHASE 5 — Portal, Auth & Frontend              ✅ COMPLETE
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

  Files created:
  [✅] portal/index.html
        - Musashi GPT branded landing page (dark navy, animated grid + particles)
        - "BREAK BARRIERS WITH INTELLIGENCE" hero with animated gradient title
        - Microsoft sign-in button (MSAL.js — requires Azure App Registration)
        - 6 module cards: HR Policies (LIVE), Finance/Quality/Maintenance/
          Compliance/Other (grayed out / Coming Soon)
        - Hover animations, shimmer border, floating particles
        - Clicking HR Policies opens Streamlit at localhost:8501?user=<email>
        - Served via: python -m http.server 8080 --directory portal
  [✅] run.ps1
        - Launches portal (port 8080) + Streamlit (port 8501) in separate windows
        - Usage: .\run.ps1
  [✅] backup/ folder
        - app_v1.py, agent_v1.py, retriever_v1.py, config_v1.py saved

  Auth implementation:
  [✅] Portal (MSAL.js)
        - Microsoft popup sign-in in the browser
        - Stores user name + email in sessionStorage
        - Passes user email as ?user= param to Streamlit
        - Falls back gracefully if Azure not yet configured
  [✅] Streamlit (streamlit-oauth + fallback)
        - Reads ?user= param from portal redirect (primary)
        - Shows Microsoft OAuth button if AZURE_* keys are in .env (secondary)
        - Falls back to manual employee ID text input (tertiary)
  [✅] config.py — added optional azure_client_id, azure_client_secret, azure_tenant_id
  [✅] requirements.txt — added streamlit-oauth>=0.1.3, PyJWT>=2.8.0

  Azure AD setup (user action required to enable Microsoft login):
        1. Go to portal.azure.com → Azure Active Directory → App registrations
        2. New registration → Name: "Musashi GPT" → Redirect: http://localhost:8501
        3. Add redirect for portal: http://localhost:8080/portal/index.html
        4. Copy Application (client) ID → AZURE_CLIENT_ID in .env
        5. Copy Directory (tenant) ID  → AZURE_TENANT_ID in .env
        6. Certificates & secrets → New secret → copy → AZURE_CLIENT_SECRET in .env

  To run the full stack:
    .\run.ps1
    Then open http://localhost:8080 in your browser.


━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
PHASE 5B — Portal Visual Overhaul                  COMPLETE
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

  Changes applied:

  [done] portal/index.html — Canvas particle network
         - Replaced CSS .particles divs with <canvas id="bg-canvas">
         - 60 particles drifting with wrap-around, 30% red / 70% gray
         - Gray connecting lines between particles closer than 160px
           (opacity proportional to distance, max 0.18)
         - Line width 0.7px, very subtle

  [done] portal/index.html — Hexagonal cursor effect
         - Outer hexagon: 36px radius, red stroke rgba(230,0,18,0.45)
         - Inner hexagon: 22px radius, red stroke rgba(230,0,18,0.18)
         - Red center dot (2px)
         - Slowly rotates (outer +0.008 rad/frame, inner counter-rotates)
         - Hidden when mouse leaves window

  [done] portal/index.html — Multi-layered background
         - Body background changed from #FFFFFF to #F4F4F4
         - Replaced .bg-red-glow with .bg-layers using stacked CSS
           radial gradients: red top-right, gray bottom-left, white center
         - Reduced .bg-dots opacity from 0.6 to 0.35

  [done] portal/index.html — Musashi sphere SVG logo
         - Shared <defs> at top of document (mg-grad radialGradient
           + mg-clip clipPath) — referenced by all 4 logo instances
         - Splash: 80x80 sphere above MUSASHI text
         - Nav: 36x36 sphere inline with MUSASHI text
         - Hero: 64x64 sphere above hero title
         - Footer: 24x24 sphere beside USASHI GPT text

  [done] app.py — Musashi sphere SVG logo
         - Sidebar header: 28px sphere + MUSASHI GPT text (with own defs)
         - Landing card: 40px sphere above MUSASHI GPT title (with own defs)


━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
UI OVERHAUL v2 — Professional UI + Dark Mode + Downloads    COMPLETE
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

  [done] app.py — layout="wide" + .block-container max-width:900px (wider chat)
  [done] app.py — removed all emojis (page_icon=None, typing dots replaced)
  [done] app.py — professional status messages during retrieval:
         "Searching HR documents..." → "Generating answer based on N source(s)..."
  [done] app.py — dark mode toggle in sidebar (full CSS variable theme switch)
         Light: white/black/Musashi red  |  Dark: #0D1117 / #E6EDF3 / Musashi red
  [done] app.py — message fade-in animation (msgFadeIn 0.25s)
  [done] app.py — _render_sources_panel() with file-type badges (PDF/DOCX)
         + individual Download buttons per document
         + "Download all as ZIP" when >1 document
  [done] hr_agent/retrieval/retriever.py — document_path added to RetrievedChunk
         and fetched from Supabase chunks table
  [done] hr_agent/chat/agent.py — document_path propagated through chunks_to_sources()
         max_tokens raised 1024 → 4096
  [done] hr_agent/chat/prompts.py — SYSTEM_PROMPT rewritten for comprehensive,
         detailed, employee-friendly answers
  [done] requirements.txt — added docx2pdf>=0.1.8 (installed in .venv)

  New dependency: docx2pdf (Windows COM / Word automation for DOCX→PDF conversion)
  Fallback: if Word not installed, DOCX files are served as-is

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
UI BUG FIXES — Landing page + dead code cleanup              COMPLETE
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

  [done] app.py — Landing page double-scrollbar fixed
         Portal iframe now uses position:fixed; inset:0; 100vw×100vh with !important
         Overrides Streamlit's inline height attribute — iframe fills entire viewport
         Set scrolling=False (no inner iframe scrollbar)
         Removed .hero min-height:680px patch (100vh inside iframe = browser viewport)

  [done] app.py — Sidebar flash on landing page eliminated
         Landing-page check (if not user_id: + st.stop()) moved BEFORE with st.sidebar:
         Sidebar block never executes for unauthenticated users — zero flicker

  [done] app.py — Dead code removed
         _azure_configured variable deleted (never read)
         _try_microsoft_login() function deleted (replaced by portal MSAL flow)

  [done] app.py — Dead CSS removed
         body[data-dark="true"] CSS variable block deleted (no code ever set that attribute)
         Dark mode works via _inject_dark_mode_css() direct !important overrides

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
MODULE CONNECTIONS — All 6 portal modules wired to chat       COMPLETE
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

  [done] portal/index.html — Finance, Quality, Maintenance, Compliance, Other
         cards changed from class="card locked" to class="card active"
         onclick changed from showToast('Coming Soon') to openModule('...')
         badges changed from badge-soon to badge-live
         "Coming Soon" CTA changed to "Access Now →"
         Lock icons removed
         "1 Module Live" stat updated to "6 Modules Live"

  [done] portal/index.html — openModule() JS guard removed
         Removed `if (module !== 'hr') { showToast(...); return; }` check
         All modules now pass through to navigation

  [done] portal/index.html + app.py — module name passed in URL
         Navigation patched to: window.top.location.href = '/?user='+param+'&module='+module
         Streamlit reads ?module= query param and sets session_state.module

  [done] app.py — chat header shows active module
         Header displays active module label (e.g. "MUSASHI FINANCE POLICIES")
         Caption shows module name below header
         _MODULE_LABELS dict maps keys to display names

  [done] app.py — portal scrolling restored
         components.html scrolling=True (was False)
         iframe is position:fixed so outer page never scrolls; portal scrolls within iframe

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
LANDING PAGE REPLACED — Native Streamlit login form             COMPLETE
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

  Two-page architecture: portal landing page (port 8080) + Streamlit chat (port 8501).
  Root cause of all prior navigation failures: portal was embedded inside a Streamlit
  components.html() iframe whose sandbox blocks all top-level navigation.
  Solution: serve the portal as a standalone HTML page — no iframe, no sandbox.

  Fix:
  [done] portal/index.html — openModule() uses window.location.href = STREAMLIT_URL + '/?user=...'
         Plain browser navigation from a standalone page — works instantly.
         Removed postMessage IIFE (no longer inside an iframe).
  [done] run.ps1 — launches both servers:
         Start-Process powershell.exe → python -m http.server 8080 --directory portal
         Main window → streamlit run app.py --server.port 8501
  [done] app.py — native Streamlit login form kept as fallback for direct :8501 access
         (name/email text input + "Access HR Chat →" button)

  Current flow:
  1. .\run.ps1 → opens two processes
  2. User opens http://localhost:8080 → sees full portal landing page
  3. User clicks "Access Now →" on HR card → navigates to http://localhost:8501/?user=EMAIL&module=hr
  4. Streamlit reads ?user= param, sets user_id, shows chat immediately

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
FOLDER RESTRUCTURE — frontend/ + backend/ split              COMPLETE
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

  [done] Created frontend/ and backend/ directories
  [done] Moved app.py, .streamlit/, portal/ → frontend/
  [done] Moved hr_agent/, config.py, migrations/, smoke_test.py,
         test_retrieval.py → backend/
  [done] frontend/app.py — sys.path updated to point at backend/
  [done] backend/config.py — PROJECT_ROOT updated to project root (.parent.parent)
  [done] run.ps1 — updated portal and Streamlit paths
  [done] CLAUDE.md — Commands section updated with new paths

  Note: original portal/ folder may still exist if http.server was running
  during the move. Delete it after stopping the portal server.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
FRONTEND REPLACEMENT — Musashi One GPT SPA                   COMPLETE
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

  The old frontend (Streamlit app.py + portal/index.html) was replaced
  with a new pure static SPA: "Musashi One GPT".

  Files (new):
  [✅] frontend/Musashi One GPT.html    — HTML shell, loads React 18 + Babel
  [✅] frontend/musashi-one/shaders.js  — ShaderBG: 5 WebGL shader backgrounds
  [✅] frontend/musashi-one/globe.js    — Globe: interactive WebGL globe
  [✅] frontend/musashi-one/panels.jsx  — All UI panels + data (JSX → Babel)
  [✅] frontend/musashi-one/app.jsx     — React app state machine

  Files (removed):
  [gone] frontend/app.py               — Streamlit chat UI (replaced)
  [gone] frontend/.streamlit/          — Streamlit theme config (replaced)
  [gone] frontend/portal/index.html    — Old portal landing page (replaced)

  Internal connections (all working):
  [✅] shaders.js → mounted via new window.ShaderBG(canvas) in app.jsx
  [✅] globe.js   → mounted via new window.Globe(canvas) in app.jsx
  [✅] panels.jsx → exports all components to window.* (used by app.jsx)
  [✅] Data       → REGION_META, PLANTS_DATA, FUNCTIONS on window.*

  Backend connection (WIRED):
  [✅] backend/api.py — FastAPI server, POST /chat endpoint
       - Accepts { query, history, agent_label }
       - Calls retrieve() + stream_response()
       - Returns SSE: first event { sources }, then { text } tokens, then [DONE]
       - CORS: allows http://localhost:8080
  [✅] panels.jsx ChatPanel — fetch() replaces window.claude.complete stub
       - Streams tokens, updates message in-place as they arrive
       - Shows cited source documents below the input after each response
  [✅] requirements.txt — added fastapi>=0.111.0, uvicorn>=0.30.0 (installed)

  run.ps1 updated: starts API server (:8501) + static frontend (:8080).
  Open: http://localhost:8080/Musashi%20One%20GPT.html

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
CURRENT PROJECT STRUCTURE
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

  hr-agent/
  ├── .env                          API keys (gitignored)
  ├── .env.example                  Template
  ├── .gitignore
  ├── requirements.txt              Dependencies
  ├── run.ps1                       Launcher (frontend :8080 static)
  ├── CLAUDE.md
  ├── README.md
  │
  ├── frontend/
  │   ├── Musashi One GPT.html      ✅ SPA entry point
  │   └── musashi-one/
  │       ├── shaders.js            ✅ WebGL shader backgrounds
  │       ├── globe.js              ✅ WebGL interactive globe
  │       ├── panels.jsx            ✅ UI components + data (chat wired)
  │       └── app.jsx               ✅ React state machine
  │
  ├── backend/
  │   ├── api.py                    ✅ FastAPI — POST /chat SSE endpoint
  │   ├── config.py                 Settings singleton
  │   ├── smoke_test.py             Service health check
  │   ├── test_retrieval.py         Retrieval smoke test
  │   ├── migrations/
  │   │   ├── 001_chunks.sql        ✅ Run in Supabase
  │   │   └── 002_conversations.sql ✅ Run in Supabase
  │   └── hr_agent/
  │       ├── ingest/
  │       │   ├── loader.py         ✅ Reads PDF/DOCX/TXT
  │       │   ├── chunker.py        ✅ Section-aware splitting
  │       │   ├── embedder.py       ✅ Voyage AI embeddings
  │       │   └── pipeline.py       ✅ Full ingest orchestrator
  │       ├── retrieval/
  │       │   └── retriever.py      ✅ Hybrid search + RRF
  │       └── chat/
  │           ├── prompts.py        ✅ HR system prompt + guardrails
  │           └── agent.py          ✅ Claude streaming + conversation storage
  │
  └── docs/
      ├── architecture.md
      ├── PROGRESS.md               This file
      └── ERRORS.md

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
E2E TEST SUITE — Playwright                                  COMPLETE
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

  Files created:
  [✅] package.json             — Node project + @playwright/test ^1.44.0
  [✅] playwright.config.js     — 2 projects: ui (port 8080) + api (port 8501)
  [✅] tests/TEST_CASES.md      — 40 documented test cases (N, C, R, A suites)
  [✅] tests/e2e/01_navigation.spec.js  — N-01–N-08 (8 tests)
  [✅] tests/e2e/02_chat_ui.spec.js     — C-01–C-13 (13 tests)
  [✅] tests/e2e/03_citations.spec.js   — R-01–R-09 (9 tests)
  [✅] tests/e2e/04_api.spec.js         — A-01–A-10 (10 tests, require backend)

  UI test results (30 tests, no backend needed — mocked /chat):
  [✅] N-01–N-08  8/8  Navigation flow (landing → scope → function → region → chat → back)
  [✅] C-01–C-13 13/13 Chat UI (welcome, templates, streaming, sidebar, theme, shortcuts)
  [✅] R-01–R-09  9/9  Citations & right panel (inline cite, chips, panel open/close/meta)

  Bugs discovered and fixed during test authoring:
  [✅] const API_BASE redeclaration (panels.jsx + app.jsx both declared it)
       → renamed to CHAT_API_BASE in chat-agent/app.jsx
  [✅] [[1]] in mock SSE text resolved to DOCS["1"] (undefined) — right panel returned null
       → changed mock text to [[hr-vac-2025]] to match pre-seeded DOCS key
  [✅] C-06 stop button flaky with instant mock (React 18 batches isStreaming true→false)
       → C-06 now uses a 600ms delayed route override so the stop button renders
  [✅] C-04 strict mode violation (user text + assistant text both matched /vacation policy/i)
       → scoped assertion to .bubble.assistant-prose

  Run UI tests:
    npx playwright test --project=ui

  Run API tests (requires backend on :8501):
    npx playwright test --project=api

  Run all:
    npx playwright test
