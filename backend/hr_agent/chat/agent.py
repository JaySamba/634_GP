"""
Chat agent — retrieves context, streams Claude response, persists conversation.

Public API:
    create_conversation(user_id, title) -> str          conversation UUID
    load_history(conversation_id)       -> list[dict]   Claude messages format
    save_message(conversation_id, role, content, sources)
    stream_response(history, query, chunks)             generator of text chunks
    chunks_to_sources(chunks)           -> list[dict]
"""

import json
import sys
from pathlib import Path

import psycopg2
import anthropic

sys.path.insert(0, str(Path(__file__).resolve().parents[2]))
from config import settings
from hr_agent.retrieval.retriever import RetrievedChunk
from hr_agent.chat.prompts import SYSTEM_PROMPT, USER_CONTEXT_TEMPLATE

_client: anthropic.Anthropic | None = None


def _get_client() -> anthropic.Anthropic:
    global _client
    if _client is None:
        _client = anthropic.Anthropic(api_key=settings.anthropic_api_key)
    return _client


# ── Conversation persistence ───────────────────────────────────────────────────

def create_conversation(user_id: str, title: str | None = None) -> str:
    """Creates a new conversation row, returns the UUID as a string."""
    conn = psycopg2.connect(settings.supabase_db_url, connect_timeout=15)
    try:
        with conn.cursor() as cur:
            cur.execute(
                "INSERT INTO conversations (user_id, title) VALUES (%s, %s) RETURNING id",
                (user_id, title),
            )
            conversation_id = str(cur.fetchone()[0])
        conn.commit()
    finally:
        conn.close()
    return conversation_id


def load_history(conversation_id: str) -> list[dict]:
    """Returns all messages for a conversation in Claude messages-API format."""
    conn = psycopg2.connect(settings.supabase_db_url, connect_timeout=15)
    try:
        with conn.cursor() as cur:
            cur.execute(
                "SELECT role, content FROM messages WHERE conversation_id = %s ORDER BY created_at ASC",
                (conversation_id,),
            )
            return [{"role": row[0], "content": row[1]} for row in cur.fetchall()]
    finally:
        conn.close()


def save_message(
    conversation_id: str,
    role: str,
    content: str,
    sources: list[dict] | None = None,
) -> None:
    """Persists a single message and bumps the conversation updated_at timestamp."""
    conn = psycopg2.connect(settings.supabase_db_url, connect_timeout=15)
    try:
        with conn.cursor() as cur:
            cur.execute(
                "INSERT INTO messages (conversation_id, role, content, sources) VALUES (%s, %s, %s, %s)",
                (conversation_id, role, content, json.dumps(sources) if sources else None),
            )
            cur.execute(
                "UPDATE conversations SET updated_at = now() WHERE id = %s",
                (conversation_id,),
            )
        conn.commit()
    finally:
        conn.close()


def list_conversations(user_id: str, limit: int = 20) -> list[dict]:
    """Returns recent conversations for a user (for sidebar display)."""
    conn = psycopg2.connect(settings.supabase_db_url, connect_timeout=15)
    try:
        with conn.cursor() as cur:
            cur.execute(
                """
                SELECT id, title, updated_at
                FROM conversations
                WHERE user_id = %s
                ORDER BY updated_at DESC
                LIMIT %s
                """,
                (user_id, limit),
            )
            return [
                {"id": str(row[0]), "title": row[1] or "Untitled", "updated_at": row[2]}
                for row in cur.fetchall()
            ]
    finally:
        conn.close()


# ── Claude interaction ─────────────────────────────────────────────────────────

def chunks_to_sources(chunks: list[RetrievedChunk]) -> list[dict]:
    return [
        {
            "document_name": c.document_name,
            "section_title": c.section_title,
            "rrf_score": round(c.rrf_score, 4),
            "document_path": c.document_path,
        }
        for c in chunks
    ]


def _build_context_block(chunks: list[RetrievedChunk]) -> str:
    parts = []
    for chunk in chunks:
        header = f"[Source: {chunk.document_name}"
        if chunk.section_title:
            header += f" > {chunk.section_title}"
        header += "]"
        parts.append(f"{header}\n{chunk.content}")
    return "\n---\n".join(parts)


def _build_messages(
    history: list[dict],
    query: str,
    chunks: list[RetrievedChunk],
) -> list[dict]:
    """Combines prior history with the current turn.

    If chunks are provided the user message is context-injected (policy Q&A).
    If chunks is empty the message is sent as-is (conversational greeting).
    """
    if chunks:
        context_block = _build_context_block(chunks)
        user_message = USER_CONTEXT_TEMPLATE.format(context=context_block, query=query)
    else:
        user_message = query  # conversational — no context injection
    return list(history) + [{"role": "user", "content": user_message}]


def stream_response(
    history: list[dict],
    query: str,
    chunks: list[RetrievedChunk],
):
    """
    Generator that yields text chunks from Claude's streaming API.
    Designed to be consumed by st.write_stream() in Streamlit.

    history  — prior turns already saved to DB (does NOT include current query)
    query    — the current user question (plain text)
    chunks   — retrieved policy chunks for context injection
    """
    messages = _build_messages(history, query, chunks)
    with _get_client().messages.stream(
        model=settings.anthropic_model_smart,
        max_tokens=4096,
        system=SYSTEM_PROMPT,
        messages=messages,
    ) as stream:
        for text in stream.text_stream:
            yield text
