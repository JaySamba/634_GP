"""
Ingest pipeline.

Run with:
    python -m hr_agent.ingest.pipeline

What it does:
  1. Walks HR_DOCUMENTS_FOLDER
  2. For each document — loads, splits into section-aware chunks
  3. Embeds chunks via Voyage (batched)
  4. Wipes the existing Pinecone index + Supabase chunks table (overwrite mode)
  5. Upserts vectors to Pinecone, inserts text+metadata to Supabase

Idempotency: this is overwrite mode — re-running replaces everything.
"""

import sys
import time
from pathlib import Path

import psycopg2
from pinecone import Pinecone
from rich.console import Console
from rich.progress import Progress, SpinnerColumn, BarColumn, TextColumn, TimeElapsedColumn

# Make project root importable
sys.path.insert(0, str(Path(__file__).resolve().parents[2]))

from config import settings
from hr_agent.ingest.loader import iter_documents
from hr_agent.ingest.chunker import chunk_document, Chunk
from hr_agent.ingest.embedder import embed_chunks


console = Console()


# ---------- destination wipes (because we chose overwrite mode) ----------

def wipe_pinecone(index):
    """Delete every vector in the index."""
    try:
        index.delete(delete_all=True)
    except Exception as e:
        # Pinecone raises if the namespace is already empty — that's fine
        if "404" in str(e) or "not found" in str(e).lower():
            return
        raise


def wipe_supabase_chunks():
    """Truncate the chunks table."""
    conn = psycopg2.connect(settings.supabase_db_url, connect_timeout=15)
    try:
        with conn.cursor() as cur:
            cur.execute("TRUNCATE TABLE chunks")
        conn.commit()
    finally:
        conn.close()


# ---------- writes ----------

def upsert_to_pinecone(index, chunks: list[Chunk], embeddings: list[list[float]]):
    """Upsert (id, vector, metadata) tuples to Pinecone in batches."""
    vectors = []
    for chunk, embedding in zip(chunks, embeddings):
        vectors.append({
            "id": chunk.id,
            "values": embedding,
            "metadata": {
                "document_name": chunk.document_name,
                "section_title": chunk.section_title or "",
                "chunk_index": chunk.chunk_index,
            },
        })

    # Pinecone serverless prefers batches <= 100
    BATCH = 100
    for i in range(0, len(vectors), BATCH):
        index.upsert(vectors=vectors[i : i + BATCH])


def insert_to_supabase(chunks: list[Chunk]):
    """Bulk insert chunks into the Postgres table."""
    conn = psycopg2.connect(settings.supabase_db_url, connect_timeout=15)
    try:
        with conn.cursor() as cur:
            rows = [
                (
                    c.id,
                    c.document_name,
                    c.document_path,
                    c.section_title,
                    c.chunk_index,
                    c.content,
                    c.token_count,
                )
                for c in chunks
            ]
            cur.executemany(
                """
                INSERT INTO chunks
                    (id, document_name, document_path, section_title,
                     chunk_index, content, token_count)
                VALUES (%s, %s, %s, %s, %s, %s, %s)
                """,
                rows,
            )
        conn.commit()
    finally:
        conn.close()


# ---------- main ----------

def main():
    folder = Path(settings.hr_documents_folder).expanduser().resolve()
    if not folder.is_dir():
        console.print(f"[red]ERROR:[/red] HR_DOCUMENTS_FOLDER is not a directory: {folder}")
        console.print("Set HR_DOCUMENTS_FOLDER in .env to the path of your HR docs.")
        sys.exit(1)

    console.rule("[bold]HR Agent — Ingest[/bold]")
    console.print(f"  Source folder: [cyan]{folder}[/cyan]")
    console.print(f"  Pinecone index: [cyan]{settings.pinecone_index_name}[/cyan]")
    console.print(f"  Mode: [yellow]OVERWRITE[/yellow] (existing data will be wiped)")
    console.print()

    # Connect to Pinecone
    pc = Pinecone(api_key=settings.pinecone_api_key)
    index = pc.Index(settings.pinecone_index_name)

    # ---------- step 1: wipe ----------
    console.print("[1/4] Wiping existing data...")
    wipe_pinecone(index)
    wipe_supabase_chunks()
    console.print("      ✓ Pinecone + Supabase cleared")

    # ---------- step 2: load + chunk ----------
    console.print("[2/4] Loading and chunking documents...")
    all_chunks: list[Chunk] = []
    doc_count = 0
    with Progress(SpinnerColumn(), TextColumn("{task.description}"), console=console, transient=True) as p:
        task = p.add_task("Reading documents...", total=None)
        for doc in iter_documents(folder):
            chunks = chunk_document(doc, chunk_size=settings.chunk_size_tokens, overlap=settings.chunk_overlap_tokens)
            all_chunks.extend(chunks)
            doc_count += 1
            p.update(task, description=f"Reading documents... ({doc_count} done, {len(all_chunks)} chunks)")
    console.print(f"      ✓ {doc_count} documents → {len(all_chunks)} chunks")

    if not all_chunks:
        console.print("[red]No chunks produced. Something is wrong with the source folder.[/red]")
        sys.exit(1)

    # ---------- step 3: embed ----------
    console.print("[3/4] Embedding chunks via Voyage...")
    start = time.time()
    texts = [c.content for c in all_chunks]
    with Progress(
        SpinnerColumn(), BarColumn(), TextColumn("{task.completed}/{task.total}"),
        TimeElapsedColumn(), console=console, transient=True,
    ) as p:
        task = p.add_task("Embedding...", total=len(texts))
        embeddings: list[list[float]] = []
        BATCH = 128
        for i in range(0, len(texts), BATCH):
            embeddings.extend(embed_chunks(texts[i : i + BATCH], batch_size=BATCH))
            p.update(task, advance=min(BATCH, len(texts) - i))
    elapsed = time.time() - start
    console.print(f"      ✓ {len(embeddings)} embeddings in {elapsed:.1f}s")

    # ---------- step 4: write ----------
    console.print("[4/4] Writing to Pinecone + Supabase...")
    upsert_to_pinecone(index, all_chunks, embeddings)
    insert_to_supabase(all_chunks)
    console.print(f"      ✓ {len(all_chunks)} chunks written to both stores")

    console.print()
    console.rule("[green]Ingest complete[/green]")
    console.print(f"  Documents:  {doc_count}")
    console.print(f"  Chunks:     {len(all_chunks)}")
    console.print(f"  Total tokens embedded: {sum(c.token_count for c in all_chunks):,}")
    console.print()
    console.print("Next: run a test search to verify retrieval works.")


if __name__ == "__main__":
    main()
