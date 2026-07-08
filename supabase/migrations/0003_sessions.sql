-- 0003_sessions.sql
-- session_status enum + sessions table.
-- Enum values mirror packages/shared/src/db/types.ts (SessionStatus),
-- including 'abandoned' for discarded recordings.

CREATE TYPE session_status AS ENUM (
  'recording',
  'audio_uploaded',
  'transcribing',
  'transcription_failed',
  'generating_note',
  'note_failed',
  'draft',
  'final',
  'abandoned'
);

CREATE TABLE sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  doctor_id UUID NOT NULL REFERENCES doctors(id),
  patient_id UUID NOT NULL REFERENCES patients(id),
  status session_status NOT NULL DEFAULT 'recording',
  audio_url TEXT,
  audio_duration_ms INT,
  consent_logged BOOLEAN NOT NULL DEFAULT false,
  consent_text_version TEXT,
  consent_language TEXT NOT NULL DEFAULT 'en',
  consent_timestamp TIMESTAMPTZ,
  started_at TIMESTAMPTZ DEFAULT now(),
  stopped_at TIMESTAMPTZ,
  finalised_at TIMESTAMPTZ,
  asr_provider TEXT,
  -- Adjustments per shared types:
  audio_purged_at TIMESTAMPTZ,
  failure_reason TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_sessions_doctor ON sessions(doctor_id);
CREATE INDEX idx_sessions_patient ON sessions(patient_id);
CREATE INDEX idx_sessions_status ON sessions(status);
