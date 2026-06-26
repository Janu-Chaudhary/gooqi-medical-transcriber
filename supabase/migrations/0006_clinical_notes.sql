-- 0006_clinical_notes.sql
-- Structured clinical notes (versioned: ai_generated or doctor_edited).

CREATE TABLE clinical_notes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID NOT NULL REFERENCES sessions(id),
  version TEXT NOT NULL CHECK (version IN ('ai_generated','doctor_edited')),
  edit_number INT NOT NULL DEFAULT 1,
  chief_complaint TEXT,
  primary_diagnosis TEXT,
  differentials TEXT[],
  follow_up TEXT,
  no_medication BOOLEAN NOT NULL DEFAULT false,
  subjective TEXT,
  objective TEXT,
  assessment TEXT,
  plan TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_clinical_notes_session ON clinical_notes(session_id);
