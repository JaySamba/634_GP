"""
Smoke test — verifies that all four services can be reached with
your configured API keys. Run this BEFORE building anything else.

Usage:
    python smoke_test.py

If everything is green, your environment is set up correctly and we
can start writing real ingest/retrieval/chat code.
"""

import sys
import time

from config import settings


def check(label: str, fn) -> bool:
    """Run a check function and pretty-print the result."""
    print(f"  Checking {label}...", end=" ", flush=True)
    start = time.time()
    try:
        fn()
        elapsed = time.time() - start
        print(f"✅  ({elapsed:.2f}s)")
        return True
    except Exception as e:
        elapsed = time.time() - start
        print(f"❌  ({elapsed:.2f}s)")
        print(f"     → {type(e).__name__}: {e}")
        return False


def check_anthropic():
    """Send a tiny message to Claude. Cost: <$0.001."""
    from anthropic import Anthropic
    client = Anthropic(api_key=settings.anthropic_api_key)
    response = client.messages.create(
        model=settings.anthropic_model_fast,
        max_tokens=10,
        messages=[{"role": "user", "content": "Reply with the word OK and nothing else."}],
    )
    text = response.content[0].text.strip()
    if "OK" not in text.upper():
        raise RuntimeError(f"Unexpected response: {text!r}")


def check_voyage():
    """Embed a single short string. Cost: free (well under free tier)."""
    import voyageai
    client = voyageai.Client(api_key=settings.voyage_api_key)
    result = client.embed(
        ["test embedding"],
        model=settings.voyage_model,
        input_type="document",
    )
    embedding = result.embeddings[0]
    if len(embedding) != settings.voyage_dimensions:
        raise RuntimeError(
            f"Got {len(embedding)} dimensions, expected {settings.voyage_dimensions}. "
            f"Check that voyage_model and voyage_dimensions match in config.py."
        )


def check_pinecone():
    """Connect to the index and verify dimensions match."""
    from pinecone import Pinecone
    pc = Pinecone(api_key=settings.pinecone_api_key)

    # List indexes — also confirms the API key is valid
    indexes = [i.name for i in pc.list_indexes()]
    if settings.pinecone_index_name not in indexes:
        raise RuntimeError(
            f"Index {settings.pinecone_index_name!r} not found. "
            f"Available indexes: {indexes}. "
            f"Create it in the Pinecone dashboard with {settings.voyage_dimensions} dimensions."
        )

    # Verify dimensions match what Voyage produces
    index_info = pc.describe_index(settings.pinecone_index_name)
    if index_info.dimension != settings.voyage_dimensions:
        raise RuntimeError(
            f"Pinecone index has {index_info.dimension} dimensions but Voyage produces "
            f"{settings.voyage_dimensions}. They MUST match. "
            f"Delete the index and recreate it with {settings.voyage_dimensions} dimensions."
        )


def check_supabase_api():
    """Check the Supabase REST API is reachable."""
    from supabase import create_client
    client = create_client(settings.supabase_url, settings.supabase_service_key)
    # Just ping — try a query against pg_catalog (always exists)
    # We use the postgres-meta endpoint indirectly via a simple table list call
    # Easiest test: just confirm the client builds and can query a non-existent
    # table — we expect a specific error (relation does not exist), not auth failure.
    try:
        client.table("__hr_agent_smoke_test__").select("*").limit(1).execute()
    except Exception as e:
        msg = str(e).lower()
        if ("relation" in msg and "does not exist" in msg) or "schema cache" in msg or "pgrst" in msg:
            return  # auth worked, table doesn't exist (old or new PostgREST error format)
        if "permission denied" in msg or "jwt" in msg or "invalid" in msg:
            raise RuntimeError(f"Supabase auth failed: {e}")
        # Any other error means we couldn't even reach the API
        raise


def check_supabase_db():
    """Check the direct Postgres connection works."""
    import psycopg2
    try:
        conn = psycopg2.connect(settings.supabase_db_url, connect_timeout=10)
    except psycopg2.OperationalError as e:
        msg = str(e)
        if "could not translate host name" in msg or "Name or service not known" in msg:
            raise RuntimeError(
                "DNS cannot resolve the DB host — your Supabase project is IPv6-only. "
                "Fix: in Supabase dashboard → Settings → Database → Connection Pooling → "
                "enable it, then copy the pooler URI and set it as SUPABASE_DB_URL."
            )
        if "Tenant or user not found" in msg or "tenant" in msg.lower():
            raise RuntimeError(
                "Pooler doesn't recognise this project. "
                "Fix: Supabase dashboard → Settings → Database → Connection Pooling → "
                "make sure it is toggled ON, then copy the Session-mode URI."
            )
        raise
    try:
        with conn.cursor() as cur:
            cur.execute("SELECT version()")
            version = cur.fetchone()[0]
            if "PostgreSQL" not in version:
                raise RuntimeError(f"Unexpected DB response: {version}")
    finally:
        conn.close()


def main():
    print()
    print("=" * 60)
    print("  HR Agent — Environment Smoke Test")
    print("=" * 60)
    print()
    print(f"  Project root: {settings.__class__.__module__}")
    print(f"  Pinecone index: {settings.pinecone_index_name}")
    print(f"  Voyage model:   {settings.voyage_model} ({settings.voyage_dimensions}d)")
    print()

    results = []
    results.append(check("Anthropic API     ", check_anthropic))
    results.append(check("Voyage AI         ", check_voyage))
    results.append(check("Pinecone          ", check_pinecone))
    results.append(check("Supabase API      ", check_supabase_api))
    results.append(check("Supabase Postgres ", check_supabase_db))

    print()
    print("=" * 60)
    if all(results):
        print("  ✅ All systems go. Ready to build.")
        print("=" * 60)
        print()
        sys.exit(0)
    else:
        failed = sum(1 for r in results if not r)
        print(f"  ❌ {failed} of {len(results)} checks failed.")
        print("  Fix the issues above before continuing.")
        print("=" * 60)
        print()
        sys.exit(1)


if __name__ == "__main__":
    main()
