# Musashi One GPT — Technical Specification & Future Roadmap

> **Audience:** Anyone — engineers, managers, HR leads, or new team members.
> This document explains what the system is, how it works today, and where it is headed.

---

## Table of Contents

1. [What Is This System?](#1-what-is-this-system)
2. [How It Works — Plain English](#2-how-it-works--plain-english)
3. [Architecture Overview](#3-architecture-overview)
4. [Technology Stack](#4-technology-stack)
5. [Data Flow — Step by Step](#5-data-flow--step-by-step)
6. [Frontend (User Interface)](#6-frontend-user-interface)
7. [Backend API](#7-backend-api)
8. [Database Schema](#8-database-schema)
9. [Security & Access Control](#9-security--access-control)
10. [Current Limitations](#10-current-limitations)
11. [Future Enhancements](#11-future-enhancements)

---

## 1. What Is This System?

**Musashi One GPT** is an AI-powered HR knowledge assistant for Musashi Auto Parts Canada. Employees can type any HR policy question in plain English — e.g. *"How many vacation days do I get after 3 years?"* — and receive an accurate, cited answer pulled directly from official HR documents.

**Key capabilities today:**
- Answers questions from 139 HR policy documents (PDF, DOCX, TXT)
- Cites the exact source document for every answer
- Remembers conversation history within a session
- Interactive globe navigation to select region/plant context
- Global or local (plant/region-specific) policy mode

**What it is NOT:**
- It does not create, update, or delete HR policies
- It does not connect to payroll or HRIS systems
- It cannot answer questions outside the HR policy documents it has been given

---

## 2. How It Works — Plain English

Think of it as a very smart librarian who has read every HR policy document and can instantly find the right passage to answer your question.

```
Employee asks a question
        │
        ▼
System converts the question into a mathematical "fingerprint" (embedding)
        │
        ▼
Two searches run simultaneously:
  • Semantic search  — finds documents that MEAN the same thing
  • Keyword search   — finds documents that contain the EXACT words
        │
        ▼
Results are combined and ranked (best matches win)
        │
        ▼
Top 5 matching policy excerpts are sent to Claude AI
        │
        ▼
Claude reads the excerpts and writes a clear, cited answer
        │
        ▼
Employee sees the answer + source document names they can refer to
```

---

## 3. Architecture Overview

The system has four layers, each with a single job:

```
┌─────────────────────────────────────────────────────────────┐
│  LAYER 1 — INGEST  (run once, offline, when docs change)    │
│  HR Documents → Chunks → Embeddings → Stored in DB          │
└─────────────────────────────────────────────────────────────┘
                           │
                           ▼
┌─────────────────────────────────────────────────────────────┐
│  LAYER 2 — RETRIEVAL  (runs on every user question)         │
│  Question → Search Pinecone + Supabase → Rank → Top 5       │
└─────────────────────────────────────────────────────────────┘
                           │
                           ▼
┌─────────────────────────────────────────────────────────────┐
│  LAYER 3 — CHAT  (runs on every user question)              │
│  History + Question + Excerpts → Claude AI → Streamed Reply │
└─────────────────────────────────────────────────────────────┘
                           │
                           ▼
┌─────────────────────────────────────────────────────────────┐
│  LAYER 4 — FRONTEND  (what the employee sees)               │
│  Animated SPA → Globe Navigation → Chat Interface           │
└─────────────────────────────────────────────────────────────┘
```

---

## 4. Technology Stack

| Component | Technology | Purpose | Why This Choice |
|---|---|---|---|
| **AI Language Model** | Anthropic Claude (`claude-sonnet-4-6`) | Reads policy excerpts, writes answers | Best-in-class comprehension, streaming support, safe guardrails |
| **Embeddings** | Voyage AI `voyage-3` (1024 dimensions) | Converts text to searchable vectors | Outperforms OpenAI on retrieval tasks; 200M free tokens |
| **Vector Database** | Pinecone (cosine similarity) | Fast semantic search across all chunks | Managed, serverless, no infrastructure to maintain |
| **Relational Database** | Supabase (PostgreSQL) | Full-text search + conversation history | Managed Postgres with built-in auth and REST API |
| **Backend API** | FastAPI (Python) on port 8501 | Connects frontend to AI + databases | Fast async framework, streaming SSE support |
| **Frontend** | React 18 + WebGL (pure static HTML) | Interactive UI | No build step, CDN-loaded, works from any static file server |
| **3D Globe** | Custom WebGL | Region/plant navigation | Visually communicates Musashi's global presence |
| **Tokenizer** | tiktoken (`cl100k_base`) | Ensures chunks don't exceed Claude's context limit | Same tokenizer Claude uses — guarantees accurate token counts |
| **Retry Logic** | tenacity | Retries failed API calls with backoff | Handles transient network and rate-limit errors gracefully |

---

## 5. Data Flow — Step by Step

### 5a. Ingest (one-time setup, re-run when HR docs change)

```
HR Documents folder
    │
    ├── loader.py    ← Reads PDF (pypdf), DOCX (python-docx), TXT
    │                   Tags DOCX headings with [HEADING] markers
    │
    ├── chunker.py   ← Splits on headings / section boundaries
    │                   Max 500 tokens per chunk, 50-token overlap
    │                   Prepends section title to every chunk
    │
    ├── embedder.py  ← Sends chunks to Voyage AI in batches of 128
    │                   Returns 1024-dimension float vectors
    │
    └── pipeline.py  ← Writes vectors → Pinecone
                        Writes text + metadata → Supabase (chunks table)
                        Both stores share the same chunk IDs
```

**Result after ingest:**
- 139 documents → 477 chunks → 477 vectors stored
- ~115,000 tokens processed

### 5b. Retrieval (every user question)

```
User question: "Can I take bereavement leave for a cousin?"
    │
    ├── Voyage AI embeds the question (input_type='query')
    │
    ├── Pinecone: cosine similarity top-20 chunks
    │   (finds chunks that are SEMANTICALLY similar)
    │
    ├── Supabase: plainto_tsquery FTS top-20 chunks
    │   (finds chunks that contain the EXACT WORDS)
    │
    ├── RRF Fusion (Reciprocal Rank Fusion, k=60)
    │   Merges both lists — chunks appearing in BOTH lists score highest
    │
    └── Returns top 5 chunks with: id, document_name, section_title, content, score
```

**Why two search methods?**
Semantic search finds relevant content even when the employee uses different words (e.g. "time off when family dies" → finds bereavement policy). Keyword search catches exact policy codes like `HR-PP-50B`. Combining them is more accurate than either alone.

### 5c. Chat (every user question, after retrieval)

```
Retrieved chunks (5 policy excerpts)
    +
Conversation history (prior turns from Supabase)
    +
User question
    │
    ▼
Claude API (streaming)
    │
    ├── First SSE event: { sources: ["BEREAVEMENT PAY RULES.pdf", ...] }
    ├── Then: streamed text tokens (displayed word-by-word as they arrive)
    └── Final: [DONE] signal
```

---

## 6. Frontend (User Interface)

The frontend is a **pure static single-page app** — no server-side rendering, no build pipeline. It runs entirely in the browser.

### Navigation State Machine

```
Landing Page
  → "MUSASHI ONE GPT" animated wordmark
      │
      ▼
  Scope Selection
  ├── Global Policies
  └── Local Policies
          │
          ▼ (Local path)
      Function Selection (HR, Finance, Quality, Compliance, IT, Other)
          │
          ▼
      Method Selection
      ├── By Region  → Globe zooms to selected region (Japan / Americas / Asia / China / Europe)
      └── By Plant   → Plant chips
          │
          ▼
      Connecting interstitial (animated transition)
          │
          ▼
      Chat Interface
```

### Key UI Components

| File | What it does |
|---|---|
| [Musashi One GPT.html](../frontend/Musashi%20One%20GPT.html) | HTML shell — loads React, Babel, and the three JS modules |
| [shaders.js](../frontend/musashi-one/shaders.js) | 5 animated WebGL backgrounds (mercury, plasma, topo, particles, glass) — mouse reactive |
| [globe.js](../frontend/musashi-one/globe.js) | Interactive 3D globe — zooms to the 5 Musashi regions on selection |
| [panels.jsx](../frontend/musashi-one/panels.jsx) | All UI panels + the chat component that streams from the backend API |
| [app.jsx](../frontend/musashi-one/app.jsx) | React state machine that drives the navigation flow above |

---

## 7. Backend API

**File:** [backend/api.py](../backend/api.py) | **Port:** 8501

| Endpoint | Method | Input | Output |
|---|---|---|---|
| `/chat` | POST | `{ query, history, agent_label }` | Server-Sent Events stream: first `{ sources }`, then `{ text }` tokens, then `[DONE]` |
| `/health` | GET | — | `{ status: "ok" }` |

**Run command:**
```powershell
.venv\Scripts\python.exe -m uvicorn api:app --app-dir backend --port 8501 --reload
```

---

## 8. Database Schema

### `chunks` table (Supabase PostgreSQL)
Stores all HR policy text after ingestion.

| Column | Type | Notes |
|---|---|---|
| `id` | TEXT (PK) | Shared with Pinecone vector ID |
| `document_name` | TEXT | Original filename (e.g. `HR-PP-58 Vacation Policy.docx`) |
| `document_path` | TEXT | Full path to source file (for downloads) |
| `section_title` | TEXT | Heading from the policy document |
| `content` | TEXT | The actual policy text (≤500 tokens) |
| `content_tsv` | TSVECTOR (generated) | Full-text search index, auto-updated on insert |
| `created_at` | TIMESTAMPTZ | Ingest timestamp |

### `conversations` table
| Column | Type | Notes |
|---|---|---|
| `id` | UUID (PK) | |
| `user_id` | TEXT | Employee email or ID |
| `title` | TEXT | First question, used as conversation title |
| `created_at` | TIMESTAMPTZ | |
| `updated_at` | TIMESTAMPTZ | |

### `messages` table
| Column | Type | Notes |
|---|---|---|
| `id` | UUID (PK) | |
| `conversation_id` | UUID (FK) | References `conversations.id` |
| `role` | TEXT | `user` or `assistant` |
| `content` | TEXT | Full message text |
| `sources` | JSONB | Array of source doc names cited in this message |

---

## 9. Security & Access Control

**Current state:**
- Microsoft Azure AD login is wired but optional (falls back to email text input)
- No employee data (payroll, personal info) enters the system
- The system only reads HR policy documents — it cannot write or delete anything
- API keys stored in `.env` (never committed to git)
- CORS restricted to `localhost:8080` — prevents cross-origin requests in production

**Guardrails built into the AI prompt:**
1. Never invent policy — only cite what exists in the documents
2. Always name the source document
3. Escalate anything unknown to `hr@musashina.com`
4. Do not answer questions outside the scope of HR policies
5. Do not give legal advice — recommend consulting HR directly
6. Acknowledge when information may be outdated
7. Treat all employees respectfully regardless of question

---

## 10. Current Limitations

| Limitation | Impact | Planned Fix |
|---|---|---|
| **Supabase (US East 2)** | Data hosted outside Canada, potential compliance concern | Migrate to Azure PostgreSQL (Canada Central) — see §11 |
| **Pinecone (US region)** | Same data residency concern as Supabase | Migrate to Azure AI Search or pgvector — see §11 |
| **Static file server** | No HTTPS, no authentication enforcement on frontend | Deploy to Azure Static Web Apps with authentication |
| **No user authentication enforcement** | Any employee can access any module | Enforce Azure AD groups per function (HR, Finance, etc.) |
| **Ingest is manual** | Someone must re-run the pipeline when HR docs change | Automate via Azure Blob Storage trigger |
| **No admin UI** | Adding/removing documents requires technical access | Build a simple upload portal for HR team |
| **Single language (English)** | Employees who speak French or other languages are underserved | Add multilingual support via Claude's translation capability |
| **Conversation history not searchable** | No way to see what questions employees are asking most | Build analytics dashboard |

---

## 11. Future Enhancements

### 11a. Migrate from Supabase → Azure Database for PostgreSQL

**Why:**
- Musashi Auto Parts Canada is an Azure AD customer — consolidating on Azure reduces vendor sprawl and simplifies compliance
- Azure Database for PostgreSQL (Canada Central region) keeps HR data within Canada
- Azure's built-in private networking (VNet integration) removes the need for the IPv4 pooler workaround currently required for Supabase

**What changes:**
| Component | Today | Future |
|---|---|---|
| Database host | `aws-1-us-east-2.pooler.supabase.com` | `musashi-hr.postgres.database.azure.com` |
| Connection | psycopg2 via IPv4 connection pooler | psycopg2 via Azure Private Endpoint or SSL |
| DB URL format | `postgresql://postgres.[ref]:password@pooler.supabase.com:5432/postgres` | `postgresql://adminuser@musashi-hr:password@musashi-hr.postgres.database.azure.com:5432/musashihr` |
| Migrations | Run manually in Supabase SQL Editor | Run via Flyway or Azure DevOps pipeline |
| Auth/keys | Supabase JWT tokens | Azure Managed Identity (no secrets in .env) |
| Region | US East 2 | Canada Central |

**Migration steps (when ready):**
1. Provision Azure Database for PostgreSQL Flexible Server in Canada Central
2. Run the same two migrations (`001_chunks.sql`, `002_conversations.sql`) against Azure
3. Re-run the ingest pipeline with the new `SUPABASE_DB_URL` pointing at Azure
4. Remove Supabase-specific connection pooler workarounds from `config.py`
5. Update `smoke_test.py` to check Azure endpoint instead of Supabase REST API
6. Decommission Supabase project

**Code impact:** Minimal. All database access is through psycopg2 with standard SQL. The only change is the connection string in `.env`.

---

### 11b. Migrate from Pinecone → Azure AI Search (with vector support)

**Why:**
- Azure AI Search supports both vector search (ANN) and full-text search in a single service — eliminates the need for two separate databases (Pinecone + PostgreSQL) for retrieval
- Consolidates onto Azure, aligning with the PostgreSQL migration above
- Azure AI Search is available in Canada regions

**What changes:**
- `embedder.py`: upsert vectors to Azure AI Search index instead of Pinecone
- `retriever.py`: single hybrid query to Azure AI Search (replaces Pinecone call + Supabase FTS call + RRF fusion)
- Chunks table in PostgreSQL becomes storage-only (for conversation history); search moves entirely to Azure AI Search
- RRF fusion logic in `retriever.py` can be removed (Azure AI Search does hybrid + RRF natively)

**Code impact:** Medium. Retriever rewrite, embedder upsert change, new Azure AI Search SDK dependency (`azure-search-documents`).

---

### 11c. Azure Static Web Apps + Azure Functions (Production Deployment)

**Why:** Right now the system only runs on a local developer machine. To make it available to all Musashi Canada employees it needs to be hosted.

**Target architecture:**
```
Employee Browser
      │
      ▼
Azure Static Web Apps (Canada Central)
  frontend/ → served globally via CDN
  Built-in auth: Azure AD SSO (no code changes)
      │
      ▼
Azure Functions (Python, Canada Central)
  /api/chat → replaces FastAPI backend/api.py
  /api/health
      │
      ├── Azure Database for PostgreSQL
      └── Azure AI Search
```

**Benefits:**
- Zero servers to manage — fully serverless
- Azure AD authentication is handled by the platform (no MSAL.js configuration needed)
- Scales automatically — 10 employees or 10,000 employees, same cost structure
- All data stays in Canada Central

---

### 11d. Automated Document Ingestion

**Why:** Currently, when HR updates a policy document, a developer must manually re-run the ingest pipeline. HR should be able to upload documents themselves.

**Plan:**
1. Create an Azure Blob Storage container: `hr-documents`
2. Set up an Azure Function trigger: fires when a file is added or replaced in the container
3. The trigger calls the ingest pipeline automatically
4. Slack/Teams notification sent to HR when ingestion completes

**UI addition:** Simple upload portal for HR administrators — drag-and-drop a PDF/DOCX and it automatically becomes searchable within minutes.

---

### 11e. Role-Based Access Control (RBAC)

**Why:** Today all six function modules (HR, Finance, Quality, etc.) are open to all employees. In production, a Finance policy should only be accessible to Finance employees.

**Plan:**
- Azure AD Groups: `musashi-hr`, `musashi-finance`, `musashi-quality`, etc.
- Azure Static Web Apps reads the user's group membership from the Azure AD token
- Frontend passes `agent_label` (already in the `/chat` API call) to filter retrieval to the correct document subset
- Database: add `function_tag` column to `chunks` table; filter queries by tag

**Code impact:** Small. The API already accepts `agent_label` — just need to wire it to a WHERE clause in the retriever.

---

### 11f. Analytics Dashboard

**Why:** HR leadership wants to know: What are employees confused about? Which policies generate the most questions? Are there gaps in the documentation?

**Plan:**
- Add a `feedback` table: thumbs-up/down per message
- Build a read-only Power BI dashboard (or simple HTML chart page) connected to the `messages` table
- Weekly digest email: top 10 questions asked, average satisfaction rating

---

### 11g. Multilingual Support

**Why:** Not all Musashi Canada employees are primary English speakers; French is an official language in Canada.

**Plan:**
- Detect the language of the incoming question (Claude can do this natively)
- If French, instruct Claude to answer in French
- Add French-language HR documents to the ingest pipeline
- No changes needed to the retrieval architecture — Voyage AI `voyage-3` is multilingual

---

## Summary Table — Enhancement Priority

| Enhancement | Effort | Business Value | Priority |
|---|---|---|---|
| Azure PostgreSQL migration | Medium | High (data residency compliance) | 1 |
| Azure Static Web Apps hosting | Medium | High (make it available to all employees) | 2 |
| Automated document ingestion | Medium | High (removes developer bottleneck) | 3 |
| RBAC by Azure AD group | Small | Medium (security hardening) | 4 |
| Azure AI Search migration | Medium | Medium (simplify stack) | 5 |
| Analytics dashboard | Small | Medium (visibility for HR leadership) | 6 |
| Multilingual support | Small | Medium (inclusivity) | 7 |

---

*Document maintained by the Musashi HR Agent development team.*
*For technical questions contact the project maintainer. For HR policy questions, use the agent or email hr@musashina.com.*
