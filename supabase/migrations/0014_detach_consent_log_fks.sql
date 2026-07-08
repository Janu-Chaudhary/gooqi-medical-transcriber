-- 0014_detach_consent_log_fks.sql
-- Hard-deleting a session or patient must not be blocked by, or cascade into,
-- the append-only consent_log. The log already stores a self-contained record
-- (doctor_id, patient_id, session_id, consent_text/version/language, timestamp),
-- so we drop its FKs to sessions and patients and keep the columns as plain
-- UUIDs. The immutability trigger (0009) still forbids UPDATE/DELETE, so the
-- audit trail is preserved even after the referenced rows are gone.
-- doctor_id keeps its FK (doctors are not deleted by these flows).

ALTER TABLE consent_log DROP CONSTRAINT IF EXISTS consent_log_session_id_fkey;
ALTER TABLE consent_log DROP CONSTRAINT IF EXISTS consent_log_patient_id_fkey;
