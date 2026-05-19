# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project

HR knowledge agent ("Musashi GPT") for Musashi Auto Parts Canada. Employees ask HR policy questions; the agent retrieves relevant policy chunks and answers with citations via Claude.

## Commands

```powershell
# Activate venv (must do before any python command)
.venv\Scripts\Activate.ps1
# If blocked: Set-ExecutionPolicy -Scope Process -ExecutionPolicy RemoteSigned

# Verify all 4 services are reachable
$env:PYTHONUTF8=1; python backend/smoke_test.py

# Re-ingest HR documents (overwrites Pinecone + Supabase)
$env:PYTHONPATH="backend"; python -m hr_agent.ingest.pipeline

# Run retrieval smoke test (4 live queries)
python backend/test_retrieval.py

# Serve the new frontend (open http://localhost:8080/Musashi%20One%20GPT.html)
python -m http.server 8080 --directory frontend

# Launch full stack (frontend on :8080 + backend API on :8501 when wired)
.\run.ps1
```

Always set `$env:PYTHONUTF8=1` when running scripts that print Unicode on Windows — the terminal defaults to cp1252.

## Architecture

The system is a four-layer RAG pipeline, each layer in its own sub-package:

**`backend/hr_agent/ingest/`** — one-shot pipeline, run offline when HR docs change
- `loader.py` → reads PDF/DOCX/TXT, tags DOCX heading paragraphs with `[HEADING]`
- `chunker.py` → splits on headings (DOCX markers, markdown `##`, ALL-CAPS lines), then token-boundary splits with tiktoken (cl100k, 500 tok / 50 overlap). Prepends `section_title` to each chunk content so Claude sees the section context.
- `embedder.py` → Voyage AI `voyage-3`, 1024d, `input_type='document'` for chunks / `'query'` for searches. Batches of 128 with tenacity retry.
- `pipeline.py` → orchestrates: wipe Pinecone + `TRUNCATE chunks` → load → chunk → embed → upsert Pinecone + INSERT Supabase. **Overwrite mode — re-running deletes everything.**

**`backend/hr_agent/retrieval/retriever.py`** — called per user turn
- `retrieve(query, top_k=5)` → embeds query → Pinecone cosine top-20 + Supabase `plainto_tsquery` FTS top-20 → RRF fusion (k=60) → fetch full text from Supabase → return `RetrievedChunk` list

**`backend/hr_agent/chat/`** — called per user turn
- `prompts.py` — system prompt (HR persona, 7 guardrails, cite source doc names, escalate unknowns to `hr@musashina.com`)
- `agent.py` — `stream_response(history, query, chunks)` generator wrapping Claude streaming API; conversation persistence functions (`create_conversation`, `load_history`, `save_message`, `list_conversations`) all hit Supabase via psycopg2

**`frontend/`** — Pure static SPA (no Python/Streamlit). Served with `python -m http.server 8080 --directory frontend`. Entry point: `Musashi One GPT.html`.

- `Musashi One GPT.html` — HTML shell, loads React 18 + Babel from unpkg CDN (pinned with SRI hashes), then the three JS modules below.
- `musashi-one/shaders.js` — `ShaderBG` class: five WebGL fragment-shader backgrounds (mercury, plasma, topo, particles, glass). Mouse-reactive, switch with `bg.setShader(id)`.
- `musashi-one/globe.js` — `Globe` class: WebGL interactive globe. Highlights the five Musashi regions (Japan, Americas, Asia, China, Europe) with `setHovered(name)` / `setRegion(name)` / `zoomTo(name, ms)`.
- `musashi-one/panels.jsx` — All UI components compiled by Babel at runtime (JSX). Exports `Panel`, `Landing`, `ScopePanel`, `FunctionPanel`, `LocalMethodPanel`, `RegionPanel`, `PlantPanel`, `ConnectingPanel`, `ChatPanel` onto `window.*`. Also defines `REGION_META`, `PLANTS_DATA`, `FUNCTIONS` data.
- `musashi-one/app.jsx` — Main React app. State machine: `landing → scope → function → localMethod → localRegion/localPlant → connecting → chat`. Mounts `ShaderBG` and `Globe` via refs; passes hover/region state to globe each frame.

**Multi-step navigation flow:**
1. Landing → animated "MUSASHI ONE GPT" wordmark
2. Scope → Global Policies / Local Policies
3. Function → HR (live), Finance, Quality, Compliance, IT, Other (preview)
4. For Local: method (By Region / By Plant) → region tiles (globe zooms) or plant chips
5. Connecting interstitial → Chat panel

**Backend API** (`backend/api.py`) — FastAPI server on port 8501:
- `POST /chat` — accepts `{ query, history, agent_label }`, calls `retrieve()` then `stream_response()`, returns SSE stream of `{ text }` tokens. First SSE event is `{ sources: [...] }` for citation display.
- `GET /health` — liveness check
- CORS: allows `http://localhost:8080`
- Run via: `.venv\Scripts\python.exe -m uvicorn api:app --app-dir backend --port 8501 --reload`

## Key design decisions

- Pinecone and Supabase store the **same chunk IDs**. Pinecone = vectors only; Supabase = full text + FTS. The retriever fetches text from Supabase using the IDs that won the RRF fusion.
- All DB connections use psycopg2 direct to the Supabase **connection pooler** (`aws-1-us-east-2.pooler.supabase.com`) — the direct DB hostname is IPv6-only and won't resolve on this machine.
- `config.py` exports a `settings` singleton. Import with `from config import settings` from anywhere. Models are hardcoded in `config.py` (not in `.env`).
- The `supabase` client (REST API) is only used by `smoke_test.py` to verify auth. All real data operations use psycopg2.

## Database

Two migrations in `backend/migrations/` — both must be run in Supabase SQL Editor before first use:
- `001_chunks.sql` — `chunks` table with `content_tsv` GENERATED tsvector column (FTS, `'simple'` config to preserve policy codes like `HR-PP-50B`)
- `002_conversations.sql` — `conversations` + `messages` tables for chat history

## Environment variables

Required in `.env` (see `.env.example`): `ANTHROPIC_API_KEY`, `VOYAGE_API_KEY`, `PINECONE_API_KEY`, `PINECONE_INDEX_NAME`, `SUPABASE_URL`, `SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_KEY`, `SUPABASE_DB_URL`, `HR_DOCUMENTS_FOLDER`.

Optional: `AZURE_CLIENT_ID`, `AZURE_CLIENT_SECRET`, `AZURE_TENANT_ID` — enables Microsoft "Sign in with Microsoft" in the portal.

## Tracking files

After every task, update:
- `docs/PROGRESS.md` — phase status and file checklist
- `docs/ERRORS.md` — any errors encountered with root cause and fix
