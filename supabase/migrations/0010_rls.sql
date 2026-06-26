-- 0010_rls.sql
-- Row Level Security. A doctor may only see their own data.
--
-- NOTE: the API server uses the Supabase service-role key, which BYPASSES RLS.
-- These policies are a defence-in-depth measure protecting any direct client
-- (anon/authenticated) access via the Supabase JS client.

-- ---------------------------------------------------------------------------
-- doctors: a doctor can see/update only their own row.
-- ---------------------------------------------------------------------------
ALTER TABLE doctors ENABLE ROW LEVEL SECURITY;

CREATE POLICY doctors_select_own ON doctors
  FOR SELECT USING (id = auth.uid());

CREATE POLICY doctors_update_own ON doctors
  FOR UPDATE USING (id = auth.uid()) WITH CHECK (id = auth.uid());

-- ---------------------------------------------------------------------------
-- patients: scoped directly by doctor_id.
-- ---------------------------------------------------------------------------
ALTER TABLE patients ENABLE ROW LEVEL SECURITY;

CREATE POLICY patients_select_own ON patients
  FOR SELECT USING (doctor_id = auth.uid());

CREATE POLICY patients_insert_own ON patients
  FOR INSERT WITH CHECK (doctor_id = auth.uid());

CREATE POLICY patients_update_own ON patients
  FOR UPDATE USING (doctor_id = auth.uid()) WITH CHECK (doctor_id = auth.uid());

CREATE POLICY patients_delete_own ON patients
  FOR DELETE USING (doctor_id = auth.uid());

-- ---------------------------------------------------------------------------
-- sessions: scoped directly by doctor_id.
-- ---------------------------------------------------------------------------
ALTER TABLE sessions ENABLE ROW LEVEL SECURITY;

CREATE POLICY sessions_select_own ON sessions
  FOR SELECT USING (doctor_id = auth.uid());

CREATE POLICY sessions_insert_own ON sessions
  FOR INSERT WITH CHECK (doctor_id = auth.uid());

CREATE POLICY sessions_update_own ON sessions
  FOR UPDATE USING (doctor_id = auth.uid()) WITH CHECK (doctor_id = auth.uid());

CREATE POLICY sessions_delete_own ON sessions
  FOR DELETE USING (doctor_id = auth.uid());

-- ---------------------------------------------------------------------------
-- Child tables: scoped through the owning session.
-- ---------------------------------------------------------------------------
ALTER TABLE audio_chunks ENABLE ROW LEVEL SECURITY;

CREATE POLICY audio_chunks_own ON audio_chunks
  FOR ALL
  USING (session_id IN (SELECT id FROM sessions WHERE doctor_id = auth.uid()))
  WITH CHECK (session_id IN (SELECT id FROM sessions WHERE doctor_id = auth.uid()));

ALTER TABLE transcripts ENABLE ROW LEVEL SECURITY;

CREATE POLICY transcripts_own ON transcripts
  FOR ALL
  USING (session_id IN (SELECT id FROM sessions WHERE doctor_id = auth.uid()))
  WITH CHECK (session_id IN (SELECT id FROM sessions WHERE doctor_id = auth.uid()));

ALTER TABLE clinical_notes ENABLE ROW LEVEL SECURITY;

CREATE POLICY clinical_notes_own ON clinical_notes
  FOR ALL
  USING (session_id IN (SELECT id FROM sessions WHERE doctor_id = auth.uid()))
  WITH CHECK (session_id IN (SELECT id FROM sessions WHERE doctor_id = auth.uid()));

ALTER TABLE prescriptions ENABLE ROW LEVEL SECURITY;

CREATE POLICY prescriptions_own ON prescriptions
  FOR ALL
  USING (session_id IN (SELECT id FROM sessions WHERE doctor_id = auth.uid()))
  WITH CHECK (session_id IN (SELECT id FROM sessions WHERE doctor_id = auth.uid()));

ALTER TABLE visit_summaries ENABLE ROW LEVEL SECURITY;

CREATE POLICY visit_summaries_own ON visit_summaries
  FOR ALL
  USING (session_id IN (SELECT id FROM sessions WHERE doctor_id = auth.uid()))
  WITH CHECK (session_id IN (SELECT id FROM sessions WHERE doctor_id = auth.uid()));

-- ---------------------------------------------------------------------------
-- consent_log: select-only for the owning doctor (append-only enforced by trigger).
-- ---------------------------------------------------------------------------
ALTER TABLE consent_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY consent_log_select_own ON consent_log
  FOR SELECT USING (doctor_id = auth.uid());

CREATE POLICY consent_log_insert_own ON consent_log
  FOR INSERT WITH CHECK (doctor_id = auth.uid());
