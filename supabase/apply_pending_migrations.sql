-- Pending migrations not yet applied to the live database.
-- Both are idempotent — safe to run once in Supabase Dashboard → SQL Editor.
-- After running, sign-off (POST /api/sessions/:id/signoff) will work.

-- 0013_signoff_attestation.sql — columns the sign-off endpoint writes.
ALTER TABLE sessions
  ADD COLUMN IF NOT EXISTS signoff_method TEXT,
  ADD COLUMN IF NOT EXISTS signoff_ip INET,
  ADD COLUMN IF NOT EXISTS signoff_user_agent TEXT;

-- 0014_detach_consent_log_fks.sql — lets sessions/patients be hard-deleted
-- without the append-only consent_log blocking them (the immutability trigger
-- from 0009 still forbids UPDATE/DELETE on consent_log itself).
ALTER TABLE consent_log DROP CONSTRAINT IF EXISTS consent_log_session_id_fkey;
ALTER TABLE consent_log DROP CONSTRAINT IF EXISTS consent_log_patient_id_fkey;
