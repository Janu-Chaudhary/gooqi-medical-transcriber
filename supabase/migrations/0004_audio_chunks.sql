-- 0004_audio_chunks.sql
-- Streamed audio chunks for a session (one row per uploaded slice).

CREATE TABLE audio_chunks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID NOT NULL REFERENCES sessions(id),
  chunk_index INT NOT NULL,
  storage_path TEXT NOT NULL,
  size_bytes INT,
  uploaded_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE (session_id, chunk_index)
);

CREATE INDEX idx_audio_chunks_session ON audio_chunks(session_id);
