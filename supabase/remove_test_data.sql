-- Remove 5 test patients + their sessions:
--   Live Test Patient, Test MockAudio Patient, Sandhya Parmar,
--   Batch ASR Test Patient, Batch ASR Test 2
--
-- consent_log is append-only (a trigger blocks DELETE), so this temporarily
-- disables that trigger inside a single transaction and re-enables it at the end.
-- Run: Supabase Dashboard → SQL Editor → paste → Run.

BEGIN;

ALTER TABLE consent_log DISABLE TRIGGER trg_consent_log_immutable;

-- The 5 sessions to remove.
CREATE TEMP TABLE _del_sessions (id uuid) ON COMMIT DROP;
INSERT INTO _del_sessions VALUES
  ('014f95ba-39f0-4484-a3d2-8193cea929f6'),  -- Live Test Patient
  ('52284f03-b94f-4504-a96a-99f3d4067537'),  -- Test MockAudio Patient
  ('54e24b02-b443-4d0f-9bef-69350598064f'),  -- Sandhya Parmar
  ('818f6f49-9528-4803-acfd-419c3717be53'),  -- Batch ASR Test 2
  ('bec9bf55-841c-42e1-bbd7-67a28544e9dd');  -- Batch ASR Test Patient

-- Children first (no ON DELETE CASCADE in this schema).
DELETE FROM prescriptions   WHERE session_id IN (SELECT id FROM _del_sessions);
DELETE FROM clinical_notes  WHERE session_id IN (SELECT id FROM _del_sessions);
DELETE FROM transcripts     WHERE session_id IN (SELECT id FROM _del_sessions);
DELETE FROM visit_summaries WHERE session_id IN (SELECT id FROM _del_sessions);
DELETE FROM audio_chunks    WHERE session_id IN (SELECT id FROM _del_sessions);
DELETE FROM consent_log     WHERE session_id IN (SELECT id FROM _del_sessions);
DELETE FROM sessions        WHERE id         IN (SELECT id FROM _del_sessions);

-- The 5 patients (now free of any session/consent_log references).
DELETE FROM patients WHERE id IN (
  '1a0fd0d7-532b-414b-bf9b-f1387756c66f',  -- Live Test Patient
  '4962ff36-560d-4336-9ccf-1b5d7a00dd79',  -- Test MockAudio Patient
  'b9867943-a2b6-432f-9a8b-b9eedb7b4bb0',  -- Sandhya Parmar
  '4ce45d93-82a0-407f-b00a-59b7b6fa14d0',  -- Batch ASR Test 2
  '6d41353b-588d-4eb7-a285-a2d3f5fff70a'   -- Batch ASR Test Patient
);

ALTER TABLE consent_log ENABLE TRIGGER trg_consent_log_immutable;

COMMIT;
