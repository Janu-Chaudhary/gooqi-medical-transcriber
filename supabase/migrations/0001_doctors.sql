-- 0001_doctors.sql
-- Doctors extend Supabase auth.users (1:1). The PK is the auth user id.

CREATE TABLE doctors (
  id UUID PRIMARY KEY REFERENCES auth.users(id),
  name TEXT NOT NULL,
  registration_number TEXT,
  clinic_name TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);
