-- 0011_storage.sql
-- Private storage bucket for session audio (chunks + assembled files).
-- The API uses the service-role key (bypasses storage RLS); these policies
-- gate any direct authenticated-client access.

INSERT INTO storage.buckets (id, name, public)
VALUES ('session-audio', 'session-audio', false)
ON CONFLICT DO NOTHING;

-- Allow the authenticated role to read/write objects in this bucket.
-- (Kept simple: per-doctor path scoping is enforced by the API layer, which
-- mediates all uploads/downloads with the service role.)
CREATE POLICY "session-audio authenticated read" ON storage.objects
  FOR SELECT TO authenticated
  USING (bucket_id = 'session-audio');

CREATE POLICY "session-audio authenticated insert" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'session-audio');

CREATE POLICY "session-audio authenticated update" ON storage.objects
  FOR UPDATE TO authenticated
  USING (bucket_id = 'session-audio')
  WITH CHECK (bucket_id = 'session-audio');

CREATE POLICY "session-audio authenticated delete" ON storage.objects
  FOR DELETE TO authenticated
  USING (bucket_id = 'session-audio');
