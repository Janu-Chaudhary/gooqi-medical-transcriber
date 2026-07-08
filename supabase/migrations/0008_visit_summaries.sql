-- 0008_visit_summaries.sql
-- Plain-language visit summary for the patient.

CREATE TABLE visit_summaries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  -- One visit summary per session; UNIQUE enables the worker's upsert
  -- (on_conflict = session_id) when (re)generating the summary.
  session_id UUID NOT NULL UNIQUE REFERENCES sessions(id),
  content TEXT NOT NULL,
  edited_by_doctor BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_visit_summaries_session ON visit_summaries(session_id);
