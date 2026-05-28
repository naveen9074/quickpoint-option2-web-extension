-- ─────────────────────────────────────────────────────────────────────────────
-- ISERT – PostgreSQL Schema
-- Run: psql -U postgres -d isert_db -f schema.sql
-- ─────────────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS meeting_sessions (
    id                  SERIAL PRIMARY KEY,
    session_name        VARCHAR(255),
    transcript          TEXT,
    language            VARCHAR(50),
    summary             TEXT,
    action_items        TEXT,          -- JSON array string
    filler_count        INTEGER        DEFAULT 0,
    filler_words        TEXT,          -- JSON object string
    pace_wpm            FLOAT          DEFAULT 0.0,
    sentiment           VARCHAR(50),
    score               FLOAT          DEFAULT 0.0,
    audio_duration_sec  FLOAT          DEFAULT 0.0,
    created_at          TIMESTAMPTZ    DEFAULT NOW()
);

-- Index for dashboard ordering
CREATE INDEX IF NOT EXISTS idx_sessions_created ON meeting_sessions(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_sessions_score   ON meeting_sessions(score DESC);
