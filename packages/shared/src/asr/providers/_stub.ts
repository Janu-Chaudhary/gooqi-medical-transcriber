import { ASRProvider } from "../ASRProvider.js";
import { ASRErrorCode, ASRPermanentError } from "../errors.js";
import type { TranscribeOptions, TranscriptResult } from "../types.js";

/**
 * Shared base for not-yet-implemented real providers (Phase 8 fills these in).
 * Health check fails so the worker refuses to start with an unimplemented
 * provider selected, rather than silently failing on the first job.
 */
export abstract class StubASRProvider extends ASRProvider {
  async getHealthCheck(): Promise<boolean> {
    return false;
  }

  protected async doTranscribe(
    _audioUrl: string,
    _options: TranscribeOptions,
  ): Promise<TranscriptResult> {
    throw new ASRPermanentError(
      `${this.getName()} provider is not yet implemented (Phase 8). Use ASR_PROVIDER=mock for local development.`,
      ASRErrorCode.AUTH_FAILURE,
      this.getName(),
    );
  }
}
