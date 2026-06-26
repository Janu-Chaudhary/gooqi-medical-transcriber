-- 0005_transcripts.sql
-- Transcripts (versioned: ai_generated or doctor_edited).
-- raw_provider_response / language_detected / overall_confidence are written
-- by the worker (see shared TranscriptRow).

CREATE TABLE transcripts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID NOT NULL REFERENCES sessions(id),
  version TEXT NOT NULL CHECK (version IN ('ai_generated','doctor_edited')),
  edit_number INT NOT NULL DEFAULT 1,
  turns JSONB NOT NULL,
  -- Adjustments per shared types:
  raw_provider_response JSONB,
  language_detected TEXT,
  overall_confidence REAL,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_transcripts_session ON transcripts(session_id);
CREATE INDEX idx_transcripts_turns_gin ON transcripts USING GIN (turns);
