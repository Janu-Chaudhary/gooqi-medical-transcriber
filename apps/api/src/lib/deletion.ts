/**
 * Hard-deletion helpers shared by the sessions and patients routes.
 *
 * FK order matters: no child table uses ON DELETE CASCADE, so children are
 * removed before the session row. The append-only `consent_log` is deliberately
 * left intact (its FKs were dropped in migration 0014) so the consent audit
 * trail survives deletion of the clinical data.
 */
import { supabase, AUDIO_BUCKET } from "./supabase.js";
import { HttpError } from "../middleware/error.js";

/** Collect every Storage object path we created for a session. */
async function sessionStoragePaths(
  sessionId: string,
  audioUrl: string | null,
): Promise<string[]> {
  const paths: string[] = [];
  const { data: chunks } = await supabase
    .from("audio_chunks")
    .select("storage_path")
    .eq("session_id", sessionId);
  for (const c of chunks ?? []) {
    const p = (c as Record<string, unknown>).storage_path as string | null;
    if (p) paths.push(p);
  }
  if (audioUrl) paths.push(audioUrl);
  return paths;
}

/**
 * Permanently delete all audio for a session (Storage objects + chunk rows),
 * clearing audio_url and stamping audio_purged_at. The transcript and clinical
 * note are kept — this is the DPDP "erase recording" action, not a full delete.
 */
export async function eraseSessionAudio(
  sessionId: string,
  audioUrl: string | null,
): Promise<void> {
  const paths = await sessionStoragePaths(sessionId, audioUrl);
  if (paths.length > 0) {
    const { error } = await supabase.storage.from(AUDIO_BUCKET).remove(paths);
    // Missing objects are not fatal — the goal state is "no audio".
    if (error) console.warn("[deletion] storage remove (erase):", error.message);
  }
  await supabase.from("audio_chunks").delete().eq("session_id", sessionId);

  const { error: uErr } = await supabase
    .from("sessions")
    .update({ audio_url: null, audio_purged_at: new Date().toISOString() })
    .eq("id", sessionId);
  if (uErr) {
    throw new HttpError(500, `Failed to erase audio: ${uErr.message}`);
  }
}

/**
 * Permanently delete a session and every dependent record (audio, transcripts,
 * clinical notes, prescriptions, visit summary). consent_log is intentionally
 * preserved. Safe to call for a session in any status.
 */
export async function deleteSessionCascade(
  sessionId: string,
  audioUrl: string | null,
): Promise<void> {
  // 1. Storage objects (best-effort — a missing object must not block the row delete).
  const paths = await sessionStoragePaths(sessionId, audioUrl);
  if (paths.length > 0) {
    const { error } = await supabase.storage.from(AUDIO_BUCKET).remove(paths);
    if (error) console.warn("[deletion] storage remove (delete):", error.message);
  }

  // 2. Child rows, in FK-safe order.
  const children = [
    "prescriptions",
    "clinical_notes",
    "transcripts",
    "audio_chunks",
    "visit_summaries",
  ] as const;
  for (const table of children) {
    const { error } = await supabase.from(table).delete().eq("session_id", sessionId);
    if (error) {
      throw new HttpError(500, `Failed to delete ${table}: ${error.message}`);
    }
  }

  // 3. The session itself.
  const { error: sErr } = await supabase.from("sessions").delete().eq("id", sessionId);
  if (sErr) {
    throw new HttpError(500, `Failed to delete session: ${sErr.message}`);
  }
}
