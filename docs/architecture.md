# HR Agent — Architecture & Pipeline

Open this file in VS Code and press `Ctrl+Shift+V` to see the diagrams rendered.

---

## 1. Project Folder Structure

```
hr-agent/
│
├── .env                        ← API keys (never commit)
├── config.py                   ← Settings singleton (reads .env)
├── requirements.txt            ← All Python dependencies
├── smoke_test.py               ← Verifies all 4 services connect
│
├── migrations/
│   └── 001_chunks.sql          ← Run once in Supabase SQL Editor
│
├── docs/
│   └── architecture.md         ← This file
│
└── hr_agent/                   ← Main Python package
    │
    ├── ingest/                 ← PHASE 2 ✅ (complete)
    │   ├── loader.py           ← Reads PDF / DOCX / TXT from disk
    │   ├── chunker.py          ← Splits docs into section-aware chunks
    │   ├── embedder.py         ← Sends chunks to Voyage AI (1024d vectors)
    │   └── pipeline.py         ← Orchestrates load → chunk → embed → store
    │
    ├── retrieval/              ← PHASE 3 (next)
    │   └── __init__.py         ← Hybrid search: semantic + keyword + RRF
    │
    └── chat/                   ← PHASE 4 (after retrieval)
        └── __init__.py         ← Claude integration + citations
```

---

## 2. Ingest Pipeline (Phase 2)

```mermaid
flowchart LR
    subgraph SOURCE["📁 HR Documents Folder"]
        A1[HR-PP-50B.docx]
        A2[Safety Policy.pdf]
        A3[Leave Policy.txt]
        A4[... 139 more files]
    end

    subgraph INGEST["⚙️ hr_agent/ingest/pipeline.py"]
        B1["loader.py\n──────────\nReads PDF pages\nReads DOCX paragraphs\nTags [HEADING] markers"]
        B2["chunker.py\n──────────\nSplits on headings\nSection-aware chunks\n~500 tokens each\n50-token overlap"]
        B3["embedder.py\n──────────\nVoyage AI voyage-3\n1024-dim vectors\nBatch size 128\nAuto-retry on error"]
    end

    subgraph STORES["🗄️ Storage"]
        C1[("Pinecone\n──────────\nVector Store\n~500 vectors\n1024 dimensions\nSemantic search")]
        C2[("Supabase Postgres\n──────────\nchunks table\nFull text (tsvector)\nSection titles\nKeyword search")]
    end

    A1 & A2 & A3 & A4 --> B1
    B1 -->|"Document objects\nfilename + text"| B2
    B2 -->|"Chunk objects\n~500 chunks"| B3
    B3 -->|"1024-dim vectors\n+ chunk ID"| C1
    B2 -->|"text + metadata\n+ chunk ID"| C2
```

---

## 3. Full System Architecture (All Phases)

```mermaid
flowchart TB
    subgraph USER["👤 HR Staff"]
        Q["Question:\n'How many vacation days\ndo I get after 5 years?'"]
        ANS["Answer + Source citation\n'According to HR-PP-23\nVacation Policy...'"]
    end

    subgraph RETRIEVAL["🔍 hr_agent/retrieval/ — Phase 3"]
        R1["embed_query()\nVoyage AI → 1024d vector"]
        R2["Pinecone search\nTop-10 by cosine similarity\n(semantic match)"]
        R3["Supabase FTS\nto_tsvector('simple')\n(keyword match)"]
        R4["RRF Fusion\nReciprocal Rank Fusion\nMerge + deduplicate\nReturn top 5 chunks"]
    end

    subgraph STORES["🗄️ Storage (populated by Phase 2)"]
        P[("Pinecone\nVector Store")]
        S[("Supabase\nPostgres")]
    end

    subgraph CHAT["💬 hr_agent/chat/ — Phase 4"]
        C1["System prompt\n(HR persona + guardrails)"]
        C2["Claude claude-sonnet-4-6\nContext = top 5 chunks\nStreamed response"]
    end

    subgraph APIS["🔑 External APIs"]
        V["Voyage AI\nvoyage-3"]
        CL["Anthropic\nClaude API"]
    end

    Q --> R1
    R1 <-->|"embed"| V
    R1 -->|"query vector"| R2
    Q -->|"raw text"| R3
    R2 <--> P
    R3 <--> S
    R2 & R3 --> R4
    R4 -->|"top 5 chunks\nwith section titles"| C2
    C1 --> C2
    C2 <-->|"API call"| CL
    C2 --> ANS

    style USER fill:#e8f4fd,stroke:#2196F3
    style RETRIEVAL fill:#fff3e0,stroke:#FF9800
    style STORES fill:#f3e5f5,stroke:#9C27B0
    style CHAT fill:#e8f5e9,stroke:#4CAF50
    style APIS fill:#fce4ec,stroke:#E91E63
```

---

## 4. Data Flow — One Document, End to End

```mermaid
sequenceDiagram
    participant F as 📄 HR-PP-23.docx
    participant L as loader.py
    participant C as chunker.py
    participant E as embedder.py
    participant P as Pinecone
    participant S as Supabase

    F->>L: read file
    L->>L: extract paragraphs<br/>tag [HEADING] markers
    L->>C: Document(filename, text, paragraphs)

    C->>C: split on [HEADING] markers<br/>→ sections
    C->>C: chunk long sections<br/>(500 tok, 50 overlap)
    C->>E: [Chunk, Chunk, Chunk, ...]

    E->>E: batch texts (128/call)
    E->>Voyage AI: POST /embeddings<br/>model=voyage-3
    Voyage AI-->>E: [[0.12, -0.34, ...], ...]  (1024d each)

    E->>P: upsert vectors<br/>id=chunk.id, values=[...]
    E->>S: INSERT INTO chunks<br/>(id, content, section_title, ...)

    Note over P,S: IDs match in both stores.<br/>Pinecone for semantic.<br/>Supabase for keyword.
```

---

## 5. Phase Roadmap

```mermaid
gantt
    title HR Agent Build Phases
    dateFormat  YYYY-MM-DD
    section Done
    Phase 0 — Accounts & Keys          :done, 2026-05-01, 1d
    Phase 1 — Scaffold & Smoke Test     :done, 2026-05-01, 1d
    Phase 2 — Ingest Pipeline           :done, 2026-05-01, 1d
    section Next
    Phase 3 — Retrieval (hybrid search) :active, 2026-05-02, 2d
    Phase 4 — Chat (Claude integration) :2026-05-04, 2d
    Phase 5 — API + Frontend            :2026-05-06, 3d
```
