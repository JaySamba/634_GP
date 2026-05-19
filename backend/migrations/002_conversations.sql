-- Migration 002 — Conversation & Message storage
-- Run this in the Supabase SQL Editor after 001_chunks.sql

-- ── conversations ─────────────────────────────────────────────────────────────
CREATE TABLE conversations (
    id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id     TEXT        NOT NULL,
    title       TEXT,                          -- first 80 chars of opening question
    created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_conversations_user_id   ON conversations(user_id);
CREATE INDEX idx_conversations_updated   ON conversations(updated_at DESC);

-- ── messages ──────────────────────────────────────────────────────────────────
CREATE TABLE messages (
    id                UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    conversation_id   UUID        NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
    role              TEXT        NOT NULL CHECK (role IN ('user', 'assistant')),
    content           TEXT        NOT NULL,
    sources           JSONB,      -- [{document_name, section_title, rrf_score}] on assistant turns
    created_at        TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_messages_conversation_id ON messages(conversation_id);
CREATE INDEX idx_messages_created_at      ON messages(created_at);

-- ── helper view: recent conversations with last message preview ───────────────
CREATE VIEW conversations_recent AS
SELECT
    c.id,
    c.user_id,
    c.title,
    c.created_at,
    c.updated_at,
    (
        SELECT content FROM messages m
        WHERE m.conversation_id = c.id
        ORDER BY m.created_at DESC
        LIMIT 1
    ) AS last_message_preview
FROM conversations c
ORDER BY c.updated_at DESC;
