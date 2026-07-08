/**
 * ASR input / output types (PRD §6.2.2).
 * These are the normalised types every provider must speak, regardless of the
 * upstream vendor's native response shape.
 */

/** Transcription request parameters passed by the worker to the provider. */
export interface TranscribeOptions {
  /** BCP-47 language code, or "auto" for provider-side detection. */
  language: "hi" | "en-IN" | "auto";

  /** Expected number of distinct speakers (hint only; provider may ignore). Default: 2. */
  speakerCount?: number;

  /** Hard upper bound for diarisation. Provider must not return more than this many speaker labels. Default: 3. */
  maxSpeakers?: number;

  /** Encoding of the audio payload. Provider must reject formats it cannot handle via ASRPermanentError. */
  audioFormat: "wav" | "mp3" | "webm" | "ogg";

  /**
   * Desired script for the primary `text` field on each Turn.
   * "roman"      — Latin-script transliteration (Hinglish-safe; default).
   * "devanagari" — Devanagari Unicode.
   * "auto"       — provider chooses; the detected script is recorded in languageDetected.
   */
  scriptOutput: "roman" | "devanagari" | "auto";

  /**
   * Hint to the provider to apply noise reduction before recognition.
   * Providers that do not support this MUST silently ignore the flag, not throw.
   * Default: true.
   */
  noiseReduction?: boolean;
}

/** Word-level timestamp, emitted when the provider supports forced alignment. */
export interface Word {
  word: string;
  startMs: number;
  endMs: number;
  confidence: number; // 0–1
}

/** Speaker role labels (PRD TR-3 / TR-4). */
export type SpeakerLabel = "doctor" | "patient" | "other" | "unknown";

/** A single speaker turn within a transcript. */
export interface Turn {
  /** Role label from diarisation. "unknown" when speaker count == 1 or diarisation failed. */
  speaker: SpeakerLabel;

  startMs: number;
  endMs: number;

  /** Transcript text in the script requested via TranscribeOptions.scriptOutput (default: Roman). */
  text: string;

  /** Devanagari form of the same text, populated only when the provider returns dual-script output. */
  textOriginalScript?: string;

  /** Per-turn ASR confidence in [0, 1]. Required; providers must supply a value (may be estimated). */
  confidence: number;

  /** Word-level detail; omit when provider does not support it rather than returning empty array. */
  words?: Word[];
}

/** Normalised transcription result returned by every ASRProvider implementation. */
export interface TranscriptResult {
  turns: Turn[];

  /** BCP-47 code for the language the provider actually recognised, e.g. "hi", "en-IN", "hi-Latn". */
  languageDetected: string;

  /**
   * Aggregate confidence for the whole transcript.
   * If the provider reports a document-level score, use that.
   * Otherwise compute as the duration-weighted mean of Turn.confidence values.
   * Range [0, 1].
   */
  overallConfidence: number;

  /** Total audio length in milliseconds as reported by the provider. */
  durationMs: number;

  /** Wall-clock time from doTranscribe() call to resolved Promise, in milliseconds. */
  processingTimeMs: number;

  /** Name of the provider that produced this result, identical to ASRProvider.getName(). */
  providerName: string;

  /**
   * Unmodified provider API response, preserved for debugging and audit.
   * Must not be forwarded to the LLM or stored in the patient record.
   */
  rawProviderResponse: unknown;
}
