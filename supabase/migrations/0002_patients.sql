-- 0002_patients.sql
-- Patients belong to exactly one doctor.

CREATE TABLE patients (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  doctor_id UUID NOT NULL REFERENCES doctors(id),
  name TEXT NOT NULL,
  phone TEXT,
  dob DATE,
  gender TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_patients_doctor ON patients(doctor_id);
