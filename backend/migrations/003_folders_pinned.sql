-- Migration 003: add pinned/folder support to conversations, add folders table
-- Run in Supabase SQL Editor before deploying.

ALTER TABLE conversations ADD COLUMN IF NOT EXISTS pinned boolean DEFAULT false;
ALTER TABLE conversations ADD COLUMN IF NOT EXISTS folder_id text;

CREATE TABLE IF NOT EXISTS folders (
  id         text PRIMARY KEY,
  name       text NOT NULL,
  created_at timestamptz DEFAULT now()
);
