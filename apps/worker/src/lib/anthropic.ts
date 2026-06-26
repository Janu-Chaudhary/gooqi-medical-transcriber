/**
 * Anthropic client singleton for note generation.
 *
 * Model id: the current Sonnet alias is "claude-sonnet-4-6" ($3/$15 per MTok,
 * 1M context). It supports forced tool calls (tool_choice: { type: "any" }),
 * which the two-call note-generation flow relies on. Change NOTE_MODEL in one
 * place to roll the model forward.
 */
import Anthropic from "@anthropic-ai/sdk";

/** Model used for all two-call note generation. */
export const NOTE_MODEL = "claude-sonnet-4-6";

let client: Anthropic | null = null;

/**
 * Lazily construct the Anthropic client. Deferred (not at import time) so the
 * worker can still boot and run transcription jobs when ANTHROPIC_API_KEY is
 * absent — note-generation jobs then fail cleanly into `note_failed` instead of
 * crashing the whole process at startup.
 */
export function getAnthropic(): Anthropic {
  if (!client) {
    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (!apiKey) throw new Error("ANTHROPIC_API_KEY is not set");
    client = new Anthropic({ apiKey });
  }
  return client;
}
