"""
Hybrid retriever — semantic + keyword + RRF fusion.

retrieve(query, top_k=5) → list[RetrievedChunk]

Steps:
  1. Embed the query with Voyage AI (input_type='query')
  2. Semantic search: Pinecone top-20 by cosine similarity
  3. Keyword search: Supabase FTS top-20 by ts_rank
  4. RRF fusion: merge both ranked lists into one score
  5. Fetch full chunk text from Supabase for the winning IDs
"""

import sys
from dataclasses import dataclass
from pathlib import Path

import psycopg2
from pinecone import Pinecone

sys.path.insert(0, str(Path(__file__).resolve().parents[2]))
from config import settings
from hr_agent.ingest.embedder import embed_query


# Module-level Pinecone client — reused across calls
_pinecone_index = None


def _get_index():
    global _pinecone_index
    if _pinecone_index is None:
        pc = Pinecone(api_key=settings.pinecone_api_key)
        _pinecone_index = pc.Index(settings.pinecone_index_name)
    return _pinecone_index


@dataclass
class RetrievedChunk:
    id: str
    document_name: str
    section_title: str | None
    content: str
    rrf_score: float
    document_path: str = ""


def _semantic_search(query_vector: list[float], top_k: int) -> list[str]:
    """Returns chunk IDs ranked by cosine similarity from Pinecone."""
    index = _get_index()
    results = index.query(vector=query_vector, top_k=top_k, include_metadata=False)
    return [match["id"] for match in results["matches"]]


def _keyword_search(query_text: str, top_k: int) -> list[str]:
    """Returns chunk IDs ranked by PostgreSQL full-text ts_rank."""
    conn = psycopg2.connect(settings.supabase_db_url, connect_timeout=15)
    try:
        with conn.cursor() as cur:
            cur.execute(
                """
                SELECT id FROM chunks
                WHERE content_tsv @@ plainto_tsquery('simple', %s)
                ORDER BY ts_rank(content_tsv, plainto_tsquery('simple', %s)) DESC
                LIMIT %s
                """,
                (query_text, query_text, top_k),
            )
            return [row[0] for row in cur.fetchall()]
    finally:
        conn.close()


def _rrf(ranked_lists: list[list[str]], k: int = 60) -> list[tuple[str, float]]:
    """
    Reciprocal Rank Fusion.
    score(chunk) = sum of 1/(k + rank) across all ranked lists.
    Returns [(chunk_id, score), ...] sorted by descending score.
    k=60 is the standard RRF constant from the original paper.
    """
    scores: dict[str, float] = {}
    for ranked in ranked_lists:
        for rank, chunk_id in enumerate(ranked, start=1):
            scores[chunk_id] = scores.get(chunk_id, 0.0) + 1.0 / (k + rank)
    return sorted(scores.items(), key=lambda x: x[1], reverse=True)


def _fetch_chunks(ids_with_scores: list[tuple[str, float]]) -> list[RetrievedChunk]:
    """Fetch full chunk rows from Supabase, return in RRF-ranked order."""
    if not ids_with_scores:
        return []

    ids = [chunk_id for chunk_id, _ in ids_with_scores]
    score_map = {chunk_id: score for chunk_id, score in ids_with_scores}

    conn = psycopg2.connect(settings.supabase_db_url, connect_timeout=15)
    try:
        with conn.cursor() as cur:
            cur.execute(
                """
                SELECT id, document_name, section_title, content, document_path
                FROM chunks
                WHERE id = ANY(%s)
                """,
                (ids,),
            )
            rows = {row[0]: row for row in cur.fetchall()}
    finally:
        conn.close()

    # Return in RRF-ranked order (not DB return order)
    result = []
    for chunk_id in ids:
        if chunk_id in rows:
            row = rows[chunk_id]
            result.append(RetrievedChunk(
                id=row[0],
                document_name=row[1],
                section_title=row[2],
                content=row[3],
                rrf_score=score_map[chunk_id],
                document_path=row[4] if row[4] else "",
            ))
    return result


def retrieve(query: str, top_k: int = 5, candidate_k: int = 20) -> list[RetrievedChunk]:
    """
    Main entry point. Embed → hybrid search → RRF → return top_k chunks.

    Args:
        query:       The user's question in plain text.
        top_k:       How many chunks to return (default 5).
        candidate_k: How many candidates each search leg fetches before fusion (default 20).
    """
    query_vector = embed_query(query)

    semantic_ids = _semantic_search(query_vector, top_k=candidate_k)
    keyword_ids = _keyword_search(query, top_k=candidate_k)

    fused = _rrf([semantic_ids, keyword_ids])[:top_k]

    return _fetch_chunks(fused)
