import { ASRProvider } from "../ASRProvider.js";
import { ASRErrorCode, ASRPermanentError, ASRTransientError } from "../errors.js";
import type { SpeakerLabel, TranscribeOptions, TranscriptResult, Turn } from "../types.js";

/**
 * Sarvam AI provider — Saarika speech-to-text (PRD §6.2.5).
 *
 * Preferred for DPDP compliance and strong Hindi/Hinglish support, with native
 * Roman-script transliteration.
 *
 * NOTE (best-effort API shape): Sarvam's public STT endpoint expects a MULTIPART
 * file upload, not a remote URL. We therefore fetch the signed Supabase audio
 * bytes first and send them as the multipart `file` field. The exact field names
 * (`model`, `language_code`, `with_diarization`, `with_timestamps`) and response
 * structure follow the currently documented Saarika batch API and may need
 * adjustment against the live Sarvam docs.
 *
 * Endpoint: POST https://api.sarvam.ai/speech-to-text
 * Header:   api-subscription-key: <key>
 * Env:      SARVAM_API_KEY.
 */
const SARVAM_STT = "https://api.sarvam.ai/speech-to-text";

export class SarvamASRProvider extends ASRProvider {
  private readonly apiKey: string;

  constructor(apiKey = process.env.SARVAM_API_KEY ?? "") {
    super();
    this.apiKey = apiKey;
  }

  getName(): string {
    return "Sarvam";
  }

  async getHealthCheck(): Promise<boolean> {
    return !!this.apiKey;
  }

  protected async doTranscribe(
    audioUrl: string,
    options: TranscribeOptions,
  ): Promise<TranscriptResult> {
    if (!this.apiKey) {
      throw new ASRPermanentError(
        "SARVAM_API_KEY is not configured",
        ASRErrorCode.AUTH_FAILURE,
        this.getName(),
      );
    }

    // 1) Fetch the signed audio bytes (Sarvam wants a multipart file upload).
    let audioBuffer: ArrayBuffer;
    try {
      const audioRes = await fetch(audioUrl, { signal: AbortSignal.timeout(60_000) });
      if (!audioRes.ok) {
        throw new ASRPermanentError(
          `Failed to fetch audio (${audioRes.status})`,
          ASRErrorCode.INVALID_AUDIO,
          this.getName(),
        );
      }
      audioBuffer = await audioRes.arrayBuffer();
    } catch (err) {
      if (err instanceof ASRPermanentError) throw err;
      throw new ASRTransientError(
        err instanceof Error ? err.message : String(err),
        ASRErrorCode.TIMEOUT,
        this.getName(),
      );
    }

    // 2) Build the multipart request.
    // language_code: "hi-IN" for Hindi, "en-IN" for English, "unknown" for auto.
    const languageCode =
      options.language === "auto" ? "unknown" : options.language === "hi" ? "hi-IN" : "en-IN";

    const form = new FormData();
    form.append("file", new Blob([audioBuffer], { type: "audio/webm" }), "audio.webm");
    form.append("model", "saarika:v2");
    form.append("language_code", languageCode);
    form.append("with_diarization", "true");
    form.append("with_timestamps", "true");
    // "roman" script output requested via transliteration where supported.
    if (options.scriptOutput === "roman") {
      form.append("script", "roman");
    }

    let res: Response;
    try {
      res = await fetch(SARVAM_STT, {
        method: "POST",
        headers: { "api-subscription-key": this.apiKey },
        body: form,
        signal: AbortSignal.timeout(300_000), // up to 5 min for long audio
      });
    } catch (err) {
      throw new ASRTransientError(
        err instanceof Error ? err.message : String(err),
        ASRErrorCode.TIMEOUT,
        this.getName(),
      );
    }

    if (res.status === 401 || res.status === 403) {
      throw new ASRPermanentError(`Auth failure (${res.status})`, ASRErrorCode.AUTH_FAILURE, this.getName());
    }
    if (res.status === 400 || res.status === 415 || res.status === 422) {
      throw new ASRPermanentError(`Invalid audio (${res.status})`, ASRErrorCode.INVALID_AUDIO, this.getName());
    }
    if (res.status === 429) {
      throw new ASRTransientError("Rate limited", ASRErrorCode.RATE_LIMIT, this.getName());
    }
    if (res.status >= 500) {
      throw new ASRTransientError(`Upstream ${res.status}`, ASRErrorCode.UNKNOWN, this.getName());
    }
    if (!res.ok) {
      throw new ASRTransientError(`Unexpected ${res.status}`, ASRErrorCode.UNKNOWN, this.getName());
    }

    const raw = (await res.json()) as SarvamResponse;

    // 3) Map diarized segments → turns. If diarization is absent, emit a single
    //    "unknown" turn covering the full transcript.
    let turns: Turn[];
    const segments = raw.diarized_transcript?.entries ?? raw.segments;
    if (segments && segments.length > 0) {
      turns = segments.map((seg) => ({
        speaker: normaliseSpeaker(seg.speaker_id ?? seg.speaker),
        startMs: Math.round((seg.start_time_seconds ?? seg.start ?? 0) * 1000),
        endMs: Math.round((seg.end_time_seconds ?? seg.end ?? 0) * 1000),
        text: seg.transcript ?? seg.text ?? "",
        confidence: seg.confidence ?? 0.7,
      }));
    } else {
      turns = [
        {
          speaker: "unknown",
          startMs: 0,
          endMs: 0,
          text: raw.transcript ?? "",
          confidence: 0.7,
        },
      ];
    }

    const durationMs = turns.at(-1)?.endMs ?? 0;
    const overallConfidence = turns.length
      ? turns.reduce((a, t) => a + t.confidence * Math.max(1, t.endMs - t.startMs), 0) /
        turns.reduce((a, t) => a + Math.max(1, t.endMs - t.startMs), 0)
      : 0;

    return {
      turns,
      languageDetected: raw.language_code ?? (languageCode === "unknown" ? "auto" : languageCode),
      overallConfidence,
      durationMs,
      processingTimeMs: 0, // stamped by base class
      providerName: this.getName(),
      rawProviderResponse: raw,
    };
  }
}

/**
 * Sarvam speaker ids may be strings ("speaker_0") or integers. First distinct
 * speaker → doctor, second → patient, third → other, else unknown.
 */
function normaliseSpeaker(s: string | number | undefined): SpeakerLabel {
  const key = String(s ?? "").toLowerCase();
  switch (key) {
    case "0":
    case "speaker_0":
    case "spk_0":
      return "doctor";
    case "1":
    case "speaker_1":
    case "spk_1":
      return "patient";
    case "2":
    case "speaker_2":
    case "spk_2":
      return "other";
    default:
      return "unknown";
  }
}

interface SarvamSegment {
  speaker_id?: string | number;
  speaker?: string | number;
  start_time_seconds?: number;
  end_time_seconds?: number;
  start?: number;
  end?: number;
  transcript?: string;
  text?: string;
  confidence?: number;
}

interface SarvamResponse {
  transcript?: string;
  language_code?: string;
  segments?: SarvamSegment[];
  diarized_transcript?: { entries?: SarvamSegment[] };
}
