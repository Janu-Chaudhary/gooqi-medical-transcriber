/**
 * Sign-off rules and attestation types (shared by the API, the web client's
 * gating UI, and tests). Keeping the rule in one pure function means the
 * client's "can sign" gate and the server's enforcement can never drift.
 */

/** How the doctor re-authenticated at sign-off (audit trail, IT Act 2000 §5). */
export type SignoffMethod = "password" | "otp" | "oauth";

export interface SignoffAttestation {
  method: SignoffMethod;
  ip: string | null;
  userAgent: string | null;
  /** ISO timestamp the re-auth proof was minted. */
  reauthAt: string;
}

export interface SignoffNoteInput {
  chief_complaint?: string | null;
  primary_diagnosis?: string | null;
  no_medication?: boolean | null;
}

export interface SignoffValidation {
  ok: boolean;
  /** Human-readable reason when `ok` is false. */
  reason?: string;
}

/**
 * The invariant a note must satisfy to be finalised (PRD RV-5):
 * chief complaint + primary diagnosis are required, and there must be at least
 * one prescription OR an explicit no_medication flag.
 */
export function validateSignoff(
  note: SignoffNoteInput,
  prescriptionCount: number,
): SignoffValidation {
  if (!note.chief_complaint || note.chief_complaint.trim().length === 0) {
    return { ok: false, reason: "Chief complaint is required to sign off" };
  }
  if (!note.primary_diagnosis || note.primary_diagnosis.trim().length === 0) {
    return { ok: false, reason: "Primary diagnosis is required to sign off" };
  }
  if (prescriptionCount === 0 && note.no_medication !== true) {
    return {
      ok: false,
      reason: "At least one prescription or no_medication=true is required",
    };
  }
  return { ok: true };
}

/**
 * Maximum age of a step-up re-authentication token accepted at sign-off.
 * A fresh signInWithPassword / verifyOtp mints a JWT with a current `iat`;
 * requiring iat within this window proves the doctor actively re-authenticated
 * at the moment of signing rather than reusing a long-lived session.
 */
export const REAUTH_MAX_AGE_SECONDS = 300;
