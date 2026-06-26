-- 0009_consent_log.sql
-- Append-only consent audit trail. UPDATE/DELETE are blocked by a trigger.

CREATE TABLE consent_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID NOT NULL REFERENCES sessions(id),
  doctor_id UUID NOT NULL REFERENCES doctors(id),
  patient_id UUID NOT NULL REFERENCES patients(id),
  consent_text TEXT NOT NULL,
  consent_version TEXT NOT NULL,
  consent_language TEXT NOT NULL DEFAULT 'en',
  consented_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  ip_address INET,
  user_agent TEXT
);

CREATE INDEX idx_consent_log_session ON consent_log(session_id);
CREATE INDEX idx_consent_log_doctor ON consent_log(doctor_id);

CREATE OR REPLACE FUNCTION consent_log_immutable() RETURNS TRIGGER AS $$
BEGIN
  RAISE EXCEPTION 'consent_log is append-only: UPDATE and DELETE are not permitted';
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_consent_log_immutable
  BEFORE UPDATE OR DELETE ON consent_log
  FOR EACH ROW EXECUTE FUNCTION consent_log_immutable();
