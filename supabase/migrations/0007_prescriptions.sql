-- 0007_prescriptions.sql
-- Prescription line items attached to a clinical note.

CREATE TABLE prescriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID NOT NULL REFERENCES sessions(id),
  note_id UUID NOT NULL REFERENCES clinical_notes(id),
  drug_name TEXT NOT NULL,
  dose TEXT,
  frequency TEXT,
  duration TEXT,
  route TEXT,
  notes TEXT,
  sort_order INT
);

CREATE INDEX idx_prescriptions_session ON prescriptions(session_id);
CREATE INDEX idx_prescriptions_note ON prescriptions(note_id);
