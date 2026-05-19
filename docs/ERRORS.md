# HR Agent — Error Log
# Every error encountered, root cause, and fix applied.
# Updated by Claude Code whenever an error is resolved.

Last updated: 2026-05-14
Total errors resolved: 10

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
ERROR 01 — voyageai package version not found
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Phase:     1 — Environment setup
Command:   pip install -r requirements.txt
Error:     ERROR: Could not find a version that satisfies the requirement
           voyageai>=0.3.0

Root cause:
  voyageai 0.3.0 was only released as a release candidate (0.3.0rc0).
  pip does not install pre-release versions by default. The latest
  stable release at the time was 0.2.4.

Fix applied:
  requirements.txt line changed from:
    voyageai>=0.3.0
  to:
    voyageai>=0.2.1

  The 0.2.4 version is fully functional — same API surface, same models.

Lesson learned:
  Always check PyPI for actual available versions before pinning.
  Pre-release versions (rc, alpha, beta) are not installed by default.

File changed: requirements.txt


━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
ERROR 02 — pyiceberg requires Microsoft Visual C++ Build Tools
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Phase:     1 — Environment setup
Command:   pip install -r requirements.txt
Error:     error: Microsoft Visual C++ 14.0 or greater is required.
           Failed building wheel for pyiceberg

Root cause:
  supabase >= 2.9.0 bumped its storage3 dependency to version 2.x.
  storage3 2.x added pyiceberg as a dependency (Apache Iceberg format
  support). pyiceberg has a C extension (Cython-compiled Avro decoder)
  that requires a C++ compiler to build from source. Python 3.14 on
  Windows has no pre-built wheel for pyiceberg, so pip tries to compile
  it — and fails because Visual C++ Build Tools are not installed.

Fix applied:
  Pinned supabase to the last version that uses the old storage3 0.x
  (which has no pyiceberg dependency):
    supabase==2.8.0

  Confirmed: supabase 2.8.0 uses storage3==0.8.2 (the 0.x line).
  All smoke test functionality works fine with this version.

Lesson learned:
  When a transitive dependency pulls in a package that needs compilation,
  the fix is usually to pin the parent package to an older version that
  doesn't have that dependency, not to install a C++ compiler.

  Dependency chain that caused it:
    supabase >= 2.9.0 → storage3 2.x → pyiceberg → C++ compile

File changed: requirements.txt


━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
ERROR 03 — UnicodeEncodeError when running smoke_test.py
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Phase:     1 — Smoke test
Command:   python smoke_test.py
Error:     UnicodeEncodeError: 'charmap' codec can't encode character
           '✅' in position 0: character maps to <undefined>

Root cause:
  Windows terminal defaults to cp1252 (Windows Western European) encoding.
  smoke_test.py prints ✅ (U+2705) and ❌ (U+274C) which are outside
  the cp1252 character set. Python 3.14 on Windows uses the terminal's
  encoding by default for stdout.

Fix applied:
  Run Python with UTF-8 mode enabled:
    $env:PYTHONUTF8=1
    python smoke_test.py

  Or in one line:
    $env:PYTHONUTF8=1; python smoke_test.py

  This tells Python to use UTF-8 for all I/O regardless of the system locale.

Lesson learned:
  Always set PYTHONUTF8=1 when running scripts that print Unicode
  characters (emoji, arrows, checkmarks) on Windows.

  Alternative fix: add this to the top of smoke_test.py:
    import sys; sys.stdout.reconfigure(encoding='utf-8')

No files changed — environment variable workaround.


━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
ERROR 04 — Supabase API key invalid (JWT transcription error)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Phase:     1 — Smoke test
Error:     RuntimeError: Supabase auth failed:
           {'message': 'Invalid API key', 'hint': 'Double check your
           Supabase anon or service_role API key.'}

Root cause:
  When copying the Supabase anon and service_role JWT tokens from the
  chat into the .env file, a single character was dropped. The JWT
  payload encodes the iat (issued-at) timestamp. The correct value
  was 1777612735, but the .env had 1776612735 (missing one '7').

  JWT tokens are base64url-encoded. A one-character difference in the
  base64 string changes the decoded payload — Supabase rejects the token
  because the iat timestamp doesn't match what it issued.

Fix applied:
  Corrected both keys in .env:
    SUPABASE_ANON_KEY    — fixed 1776... → 1777... in base64 payload
    SUPABASE_SERVICE_KEY — same fix

Lesson learned:
  Always copy JWT tokens as a single unbroken string. Long base64 strings
  are easy to mis-transcribe. Best practice: copy directly from the
  Supabase dashboard UI, not via chat.

File changed: .env


━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
ERROR 05 — Supabase API check fails with PGRST205 instead of expected error
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Phase:     1 — Smoke test
Error:     APIError: {'code': 'PGRST205', 'message': "Could not find the
           table 'public.__hr_agent_smoke_test__' in the schema cache"}

Root cause:
  smoke_test.py checks Supabase connectivity by querying a non-existent
  table and expecting the PostgreSQL error "relation does not exist".
  This worked with older PostgREST versions. The version bundled with
  newer Supabase projects returns error code PGRST205 ("table not found
  in schema cache") instead — a different error string for the same
  underlying fact: the table doesn't exist, but auth worked.

  The smoke test treated any unrecognised error as a hard failure, so
  a working connection was reported as broken.

Fix applied:
  Updated the check condition in smoke_test.py to also accept PGRST205:
    Old: if "relation" in msg and "does not exist" in msg: return
    New: if (...old condition...) or "schema cache" in msg or "pgrst" in msg: return

Lesson learned:
  Smoke tests that rely on specific error message strings are fragile.
  Better to check for what DIDN'T happen (auth failure) rather than
  what DID happen (specific error text). PostgREST updates change
  error messages; auth failure strings are more stable.

File changed: smoke_test.py


━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
ERROR 06 — Supabase Postgres: DB hostname does not resolve in Python
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Phase:     1 — Smoke test
Error:     OperationalError: could not translate host name
           "db.uzowatmilugjzgiknjtu.supabase.co" to address:
           Name or service not known

Root cause:
  Newer Supabase projects (2024+) assign a DB hostname that resolves
  to IPv6 only (AAAA record, no A record). PowerShell's Resolve-DnsName
  could find the AAAA record, but Python's socket.getaddrinfo() returned
  WSAHOST_NOT_FOUND because:
    1. The machine has no globally routable IPv6 address (only link-local
       fe80:: which can't reach the internet)
    2. getaddrinfo() with AI_ADDRCONFIG flag skips address families that
       have no matching interface — so it skips IPv6 and returns nothing

Fix applied:
  Switched SUPABASE_DB_URL to use Supabase's connection pooler, which
  has a real IPv4 address:
    Old: postgresql://postgres:PASSWORD@db.[ref].supabase.co:5432/postgres
    New: postgresql://postgres.[ref]:PASSWORD@aws-1-us-east-2.pooler.supabase.com:5432/postgres

  Required upgrading Supabase project to Pro to get IPv4 pooler access.

Lesson learned:
  Supabase free tier projects are IPv6-only for direct DB connections.
  If your development machine has no IPv6 connectivity, you must use
  the connection pooler (IPv4) instead. The pooler URL format is:
    postgresql://postgres.[project-ref]:[password]@aws-1-[region].pooler.supabase.com:[port]/postgres


━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
ERROR 07 — Supabase pooler: "Tenant or user not found" (wrong host prefix)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Phase:     1 — Smoke test
Error:     OperationalError: FATAL: Tenant or user not found
           (on aws-0-us-east-2.pooler.supabase.com)

Root cause:
  Supabase has two pooler infrastructure generations:
    aws-0-[region].pooler.supabase.com  — older generation
    aws-1-[region].pooler.supabase.com  — newer generation (Pro tier)

  The project was created on the newer infrastructure (aws-1), but we
  were connecting to aws-0. The aws-0 pooler had no record of this
  project, hence "Tenant or user not found".

  We tested all 13 AWS regions on aws-0 — none recognised the project.
  The fix was changing aws-0 → aws-1 (same region: us-east-2).

Fix applied:
  SUPABASE_DB_URL changed:
    aws-0-us-east-2.pooler.supabase.com  →  aws-1-us-east-2.pooler.supabase.com

Lesson learned:
  When Supabase says "Tenant or user not found" across all regions, the
  problem is the generation prefix (aws-0 vs aws-1), not the region.
  Always copy the exact pooler URL from the Supabase dashboard under
  Settings → Database → Connection string → Session mode.

File changed: .env


━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
ERROR 08 — Pipeline fails: ModuleNotFoundError: No module named 'psycopg2'
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Phase:     2 — Ingest pipeline first run
Command:   python -m hr_agent.ingest.pipeline
Error:     ModuleNotFoundError: No module named 'psycopg2'

Root cause:
  The pipeline was run BEFORE the virtual environment was activated.
  The command ran against the system Python (Python 3.14 at
  C:\Users\jaswanth.samba\AppData\Local\Programs\Python\Python314\)
  which does not have any of the project dependencies installed.
  The virtual environment was activated AFTER the error occurred.

Fix applied:
  Activate the virtual environment first, then run:
    .venv\Scripts\Activate.ps1
    python -m hr_agent.ingest.pipeline

  Or as one line without needing to activate:
    .venv\Scripts\python.exe -m hr_agent.ingest.pipeline

Lesson learned:
  On Windows, always check the terminal prompt for (.venv) before
  running any project commands. If not present, run:
    .venv\Scripts\Activate.ps1
  first. If PowerShell blocks .ps1 scripts:
    Set-ExecutionPolicy -Scope Process -ExecutionPolicy RemoteSigned


━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
ERROR 09 — Voyage AI RateLimitError during ingest embedding
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Phase:     2 — Ingest pipeline
Error:     voyageai.error.RateLimitError: You have not yet added your
           payment method... reduced rate limits of 3 RPM and 10K TPM

Root cause:
  Voyage AI free tier enforces strict rate limits:
    - 3 requests per minute (RPM)
    - 10,000 tokens per minute (TPM)

  The pipeline sends chunks in batches of 128. At ~500 tokens per chunk,
  batch 1 alone = 64,000 tokens — 6x the per-minute token limit.
  tenacity retried 4 times, all failed due to the rate limit.

Fix applied:
  Added a payment method in the Voyage AI dashboard:
    dashboard.voyageai.com → Billing → Add payment method

  This unlocked standard rate limits (300 RPM, much higher TPM).
  The 200M free token allowance for voyage-3 still applies after
  adding a card — only rate limits change, not cost.

  After adding the card, waited ~5 minutes for limits to propagate,
  then re-ran the pipeline successfully.

Lesson learned:
  Voyage AI (and most embedding APIs) require a payment method to unlock
  usable rate limits even on free tiers. For batch ingest of hundreds of
  documents, the free tier limits are not workable.
  Always set up billing before running large-scale embedding jobs.
  The actual cost for 115,792 tokens was $0 (within free allowance).


━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
ERROR 10 — HR card click does nothing (portal iframe sandbox blocks navigation)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Phase:     UI — Portal navigation
Symptom:   Clicking "Access Now →" on the HR Policies card does nothing.
           No page change, no error visible.

Root cause:
  Streamlit's components.html() renders content in an iframe with a
  sandbox attribute that does NOT include allow-top-navigation or
  allow-top-navigation-by-user-activation. All three previous approaches
  fail silently:
    1. window.top.location.href = url    → SecurityError (caught by try/catch)
    2. window.parent.location.href = url → SecurityError (same — parent == top)
    3. <form target="_top"> submit       → Blocked (no allow-top-navigation-by-user-activation)
  The try/catch swallowed all errors, so nothing happened visually.

Fix applied:
  Switch to postMessage architecture:
  1. Portal registers a message listener on window.parent (the Streamlit page)
     via window.parent.addEventListener('message', handler) — possible because
     the sandbox includes allow-same-origin, granting access to window.parent.
  2. When handler fires, 'this' is the Streamlit page's window (no sandbox),
     so this.location.href = url navigates freely.
  3. openModule() sends window.parent.postMessage({musashiNav: url}, '*').

File changed: portal/index.html
