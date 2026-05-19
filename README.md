# HR Agent

Internal HR knowledge agent for Musashi Auto Parts Canada. Uses hybrid
RAG (semantic + keyword) with Claude as the answering model and Voyage
for multilingual embeddings (English + Japanese).

## Stack

- **Anthropic Claude** — answering model (Sonnet 4.6 + Haiku 4.5)
- **Voyage AI** — multilingual embeddings (`voyage-3`, 1024d)
- **Pinecone** — vector store (serverless, AWS us-east-1)
- **Supabase Postgres** — keyword search, chat history, audit

## Setup

### 1. Clone and create a virtualenv

```bash
cd hr-agent
python3.11 -m venv .venv
source .venv/bin/activate         # macOS/Linux
# .venv\Scripts\activate          # Windows
```

### 2. Install dependencies

```bash
pip install -r requirements.txt
```

### 3. Configure secrets

Copy the example environment file and fill in your real values:

```bash
cp .env.example .env
# Now edit .env and paste in your real keys
```

You need:

- `ANTHROPIC_API_KEY` — from console.anthropic.com
- `VOYAGE_API_KEY` — from voyageai.com
- `PINECONE_API_KEY` and `PINECONE_INDEX_NAME` — from pinecone.io
- All four Supabase values — from your Supabase project settings
- `HR_DOCUMENTS_FOLDER` — local path to your HR docs

⚠️ **`.env` is gitignored.** Never commit it.

### 4. Run the smoke test

```bash
python smoke_test.py
```

If everything is green, you're ready. If anything is red, the error
message tells you exactly what's wrong (usually a typo'd key or a
Pinecone index with the wrong dimension count).

## Project layout

```
hr-agent/
├── .env                   # Your secrets (gitignored)
├── .env.example           # Template
├── config.py              # Loads + validates .env
├── smoke_test.py          # Verifies all 4 services connect
├── requirements.txt
├── README.md
└── hr_agent/
    ├── ingest/            # Phase 2 — read docs, chunk, embed, store
    ├── retrieval/         # Phase 3 — hybrid search + RRF fusion
    └── chat/              # Phase 4 — system prompt, Claude calls, citations
```

## Build phases

- [x] **Phase 0** — Accounts and keys
- [x] **Phase 1** — Project scaffold + smoke test (you are here)
- [ ] **Phase 2** — Ingest pipeline
- [ ] **Phase 3** — Hybrid retrieval
- [ ] **Phase 4** — Chat backend with Claude
- [ ] **Phase 5** — API layer + frontend
