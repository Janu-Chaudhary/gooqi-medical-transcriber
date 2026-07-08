-- 0013_signoff_attestation.sql
-- Records how a doctor re-authenticated at the moment of sign-off, so a
-- finalised note carries a verifiable attestation rather than a bare button
-- click (IT Act 2000 §5 — attribution of an electronic record).
-- finalised_at (the signature timestamp) and doctor_id already live on sessions.

ALTER TABLE sessions
  ADD COLUMN IF NOT EXISTS signoff_method TEXT,
  ADD COLUMN IF NOT EXISTS signoff_ip INET,
  ADD COLUMN IF NOT EXISTS signoff_user_agent TEXT;
