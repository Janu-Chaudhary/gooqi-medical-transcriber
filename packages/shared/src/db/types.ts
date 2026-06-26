/**
 * Shared domain types mirroring the Postgres schema (PRD §7).
 * Used by the API, worker, and web app so they agree on row shapes and the
 * session state machine. These are hand-maintained; they are not generated.
 */

import type { Turn } from "../asr/types.js";

/** Session lifecycle (PRD §7.1 enum + §7.3 state machine). */
export type SessionStatus =
  | "recording"
  | "audio_uploaded"
  | "transcribing"
  | "transcription_failed"
  | "generating_note"
  | "note_failed"
  | "draft"
  | "final"
  | "abandoned";

export const SESSION_STATUSES: readonly SessionStatus[] = [
  "recording",
  "audio_uploaded",
  "transcribing",
  "transcription_failed",
  "generating_note",
  "note_failed",
  "draft",
  "final",
  "abandoned",
];

/** Terminal-failure statuses that expose a manual re-trigger to the doctor. */
export const RETRIABLE_FAILURE_STATUSES: readonly SessionStatus[] = [
  "transcription_failed",
  "note_failed",
];

export type NoteVersion = "ai_generated" | "doctor_edited";

export interface Doctor {
  id: string;
  name: string;
  registration_number: string | null;
  clinic_name: string | null;
  created_at: string;
}

export interface Patient {
  id: string;
  doctor_id: string;
  name: string;
  phone: string | null;
  dob: string | null;
  gender: string | null;
  created_at: string;
}

export interface Session {
  id: string;
  doctor_id: string;
  patient_id: string;
  status: SessionStatus;
  audio_url: string | null;
  audio_duration_ms: number | null;
  consent_logged: boolean;
  consent_text_version: string | null;
  consent_language: string;
  consent_timestamp: string | null;
  started_at: string | null;
  stopped_at: string | null;
  finalised_at: string | null;
  asr_provider: string | null;
  audio_purged_at: string | null;
  failure_reason: string | null;
  created_at: string;
}

export interface AudioChunk {
  id: string;
  session_id: string;
  chunk_index: number;
  storage_path: string;
  size_bytes: number | null;
  uploaded_at: string;
}

export interface TranscriptRow {
  id: string;
  session_id: string;
  version: NoteVersion;
  edit_number: number;
  turns: Turn[];
  raw_provider_response: unknown | null;
  language_detected: string | null;
  overall_confidence: number | null;
  created_at: string;
}

export interface ClinicalNoteRow {
  id: string;
  session_id: string;
  version: NoteVersion;
  edit_number: number;
  chief_complaint: string | null;
  primary_diagnosis: string | null;
  differentials: string[] | null;
  follow_up: string | null;
  no_medication: boolean;
  subjective: string | null;
  objective: string | null;
  assessment: string | null;
  plan: string | null;
  created_at: string;
}

export interface PrescriptionRow {
  id: string;
  session_id: string;
  note_id: string;
  drug_name: string;
  dose: string | null;
  frequency: string | null;
  duration: string | null;
  route: string | null;
  notes: string | null;
  sort_order: number | null;
}

export interface VisitSummaryRow {
  id: string;
  session_id: string;
  content: string;
  edited_by_doctor: boolean;
  created_at: string;
}

/** The exact consent text shown to the patient. Bump the version on any change. */
export const CONSENT_TEXT_VERSION = "v1-2026-06";
export const CONSENT_TEXT_EN =
  "The patient has been informed and consents to this consultation being recorded for clinical purposes.";
export const CONSENT_TEXT_HI =
  "मरीज़ को सूचित किया गया है और वह इस परामर्श को नैदानिक उद्देश्यों के लिए रिकॉर्ड किए जाने हेतु सहमति देता/देती है।";

/** Recording limits (PRD SC-9). */
export const MAX_RECORDING_MS = 60 * 60 * 1000;
export const RECORDING_WARNING_MS = 55 * 60 * 1000;
export const CHUNK_TIMESLICE_MS = 30_000;
