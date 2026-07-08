import { describe, expect, it } from "vitest";
import { SOAPNoteZod, PrescriptionListZod } from "./soap.js";

const validNote = {
  chief_complaint: "Fever for 3 days",
  subjective: {
    history_of_present_illness: "Fever, headache",
    past_medical_history: null,
    medications_reported_by_patient: null,
    allergies: null,
    review_of_systems: null,
  },
  objective: {
    vital_signs: null,
    physical_examination: null,
    investigations_ordered: null,
    investigations_reported: null,
  },
  assessment: {
    primary_diagnosis: "Viral fever",
    differential_diagnoses: null,
    clinical_impression: null,
  },
  plan: {
    treatment_plan: "Rest and fluids",
    prescriptions_raw: null,
    referrals: null,
    patient_education: null,
    follow_up: null,
  },
  note_language: "en",
  transcript_duration_seconds: 42,
};

describe("SOAPNoteZod", () => {
  it("accepts a well-formed note", () => {
    expect(SOAPNoteZod.safeParse(validNote).success).toBe(true);
  });

  it("allows grounding-critical fields to be null", () => {
    const nulled = {
      ...validNote,
      chief_complaint: null,
      assessment: { ...validNote.assessment, primary_diagnosis: null },
    };
    expect(SOAPNoteZod.safeParse(nulled).success).toBe(true);
  });

  it("rejects an invalid note_language", () => {
    const bad = { ...validNote, note_language: "fr" };
    expect(SOAPNoteZod.safeParse(bad).success).toBe(false);
  });

  it("rejects a negative duration", () => {
    const bad = { ...validNote, transcript_duration_seconds: -1 };
    expect(SOAPNoteZod.safeParse(bad).success).toBe(false);
  });
});

describe("PrescriptionListZod", () => {
  it("requires a non-empty drug_name", () => {
    const bad = { prescriptions: [{ drug_name: "", dosage: null, frequency: null, route: null, duration: null, instructions: null, quantity: null }] };
    expect(PrescriptionListZod.safeParse(bad).success).toBe(false);
  });
});
