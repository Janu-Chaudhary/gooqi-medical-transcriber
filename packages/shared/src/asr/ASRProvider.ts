import { ASRError, ASRErrorCode, ASRPermanentError, ASRTransientError } from "./errors.js";
import type { TranscribeOptions, TranscriptResult } from "./types.js";

export const ASR_MAX_RETRIES = 2;
export const ASR_BACKOFF_BASE_MS = 5_000; // 5 s; attempt n waits n * 5 s

/**
 * All ASR providers extend this class (PRD §6.2.3).
 *
 * Subclasses implement only `doTranscribe()`, `getName()`, and `getHealthCheck()`.
 * The public `transcribe()` method wraps `doTranscribe()` with:
 *   - exponential backoff retry on ASRTransientError (up to ASR_MAX_RETRIES retries)
 *   - immediate re-throw on ASRPermanentError
 *   - processingTimeMs measurement
 */
export abstract class ASRProvider {
  /**
   * Human-readable provider identifier used in structured logs and metrics.
   * Examples: "AssemblyAI", "FasterWhisper-Railway", "Sarvam".
   */
  abstract getName(): string;

  /**
   * Called once at worker startup before the job queue begins consuming work.
   * Must return true within 10 s or the worker exits with a non-zero code.
   * Implementations should perform the cheapest possible reachability check
   * (e.g. a credentials ping, not a full transcription).
   */
  abstract getHealthCheck(): Promise<boolean>;

  /**
   * Provider-specific transcription logic. Implementations must:
   *   - Throw ASRTransientError for retriable conditions (timeout, 429, 5xx).
   *   - Throw ASRPermanentError for non-retriable conditions (401, bad format, policy).
   *   - Never swallow errors silently.
   */
  protected abstract doTranscribe(
    audioUrl: string,
    options: TranscribeOptions,
  ): Promise<TranscriptResult>;

  /**
   * Public entry point. Wraps doTranscribe() with retry and timing.
   *
   * Retry policy:
   *   - Up to ASR_MAX_RETRIES (2) additional attempts after the first failure.
   *   - Only ASRTransientError triggers a retry; ASRPermanentError is re-thrown immediately.
   *   - Backoff: attempt 1 → 5 s, attempt 2 → 10 s.
   *   - If all attempts are exhausted the final ASRTransientError is re-thrown unchanged.
   */
  async transcribe(
    audioUrl: string,
    options: TranscribeOptions,
  ): Promise<TranscriptResult> {
    const start = Date.now();
    let lastError: ASRError | undefined;

    for (let attempt = 0; attempt <= ASR_MAX_RETRIES; attempt++) {
      try {
        const result = await this.doTranscribe(audioUrl, options);
        // Stamp processingTimeMs here so subclasses need not track it themselves.
        return { ...result, processingTimeMs: Date.now() - start };
      } catch (err) {
        if (err instanceof ASRPermanentError) {
          throw err; // never retry
        }
        if (err instanceof ASRTransientError) {
          lastError = err;
          if (attempt < ASR_MAX_RETRIES) {
            const backoffMs = (attempt + 1) * ASR_BACKOFF_BASE_MS;
            await new Promise((resolve) => setTimeout(resolve, backoffMs));
            continue;
          }
        } else {
          // Unexpected error type — wrap and surface immediately without retry.
          throw new ASRTransientError(
            err instanceof Error ? err.message : String(err),
            ASRErrorCode.UNKNOWN,
            this.getName(),
          );
        }
      }
    }

    throw lastError!;
  }
}
