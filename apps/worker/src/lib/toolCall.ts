/**
 * Anthropic tool_use extraction + error classification helpers for the
 * two-call note-generation architecture (PRD §6.3.5).
 */
import type Anthropic from "@anthropic-ai/sdk";

/**
 * Terminal note-generation failure. When thrown, the worker must set the
 * session to `note_failed`, store the reason, and stop — no further retry.
 */
export class NoteFailedError extends Error {
  constructor(public readonly reason: string) {
    super(reason);
    this.name = "NoteFailedError";
  }
}

/**
 * The model returned no tool_use block. This is a *retryable* note-generation
 * error: the caller should re-prompt the model once before giving up.
 */
export class ToolUseMissingError extends Error {
  constructor(message = "Model response contained no tool_use block") {
    super(message);
    this.name = "ToolUseMissingError";
  }
}

/**
 * Find the first `tool_use` content block in a Message and return its `.input`.
 * Throws ToolUseMissingError (retryable) when none is present.
 */
export function extractToolUseInput(message: Anthropic.Message): unknown {
  const block = message.content.find((b) => b.type === "tool_use");
  if (!block || block.type !== "tool_use") {
    throw new ToolUseMissingError();
  }
  return block.input;
}

/**
 * Classify an error thrown by `anthropic.messages.create`.
 *
 * Returns a NoteFailedError for the NON-RETRYABLE cases (HTTP 5xx,
 * context-length / prompt-too-long), or null when the error is transient /
 * unexpected and should be re-thrown so BullMQ can retry the job.
 */
export function classifyAnthropicError(err: unknown): NoteFailedError | null {
  const anyErr = err as { status?: number; message?: string } | undefined;
  const status = anyErr?.status;
  const message = String(anyErr?.message ?? "");

  if (typeof status === "number" && status >= 500) {
    return new NoteFailedError(`anthropic_http_${status}`);
  }
  if (
    (status === 400 || status === 413) &&
    /context|prompt is too long|too long|max.*token/i.test(message)
  ) {
    return new NoteFailedError("context_length_exceeded");
  }
  return null;
}

/**
 * NON-RETRYABLE stop_reason check: `max_tokens` means the tool call was
 * truncated and is not worth re-prompting — fail the note immediately.
 */
export function assertNotTruncated(
  message: Anthropic.Message,
  label: string,
): void {
  if (message.stop_reason === "max_tokens") {
    throw new NoteFailedError(`${label}_max_tokens`);
  }
}
