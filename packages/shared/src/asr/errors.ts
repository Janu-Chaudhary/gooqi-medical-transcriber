/**
 * ASR error hierarchy (PRD §6.2.1).
 *
 * Transient errors are safe to retry; permanent errors must be surfaced
 * immediately. The abstract ASRProvider.transcribe() wrapper relies on these
 * classes to decide retry behaviour.
 */

export enum ASRErrorCode {
  TIMEOUT = "TIMEOUT",
  RATE_LIMIT = "RATE_LIMIT",
  AUTH_FAILURE = "AUTH_FAILURE",
  INVALID_AUDIO = "INVALID_AUDIO",
  CONTENT_POLICY = "CONTENT_POLICY",
  UNKNOWN = "UNKNOWN",
}

export class ASRError extends Error {
  constructor(
    message: string,
    public readonly code: ASRErrorCode,
    public readonly providerName: string,
    public readonly retryable: boolean,
  ) {
    super(message);
    this.name = "ASRError";
  }
}

/**
 * Transient failures — safe to retry.
 * Includes: network timeouts, upstream 5xx responses, rate-limit (429).
 */
export class ASRTransientError extends ASRError {
  constructor(
    message: string,
    code: ASRErrorCode.TIMEOUT | ASRErrorCode.RATE_LIMIT | ASRErrorCode.UNKNOWN,
    providerName: string,
  ) {
    super(message, code, providerName, /* retryable */ true);
    this.name = "ASRTransientError";
  }
}

/**
 * Permanent failures — must NOT be retried; surface immediately to caller.
 * Includes: invalid audio format, authentication failure, content policy rejection.
 */
export class ASRPermanentError extends ASRError {
  constructor(
    message: string,
    code:
      | ASRErrorCode.AUTH_FAILURE
      | ASRErrorCode.INVALID_AUDIO
      | ASRErrorCode.CONTENT_POLICY,
    providerName: string,
  ) {
    super(message, code, providerName, /* retryable */ false);
    this.name = "ASRPermanentError";
  }
}
