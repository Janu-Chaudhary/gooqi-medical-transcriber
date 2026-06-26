import { ASRProvider } from "../ASRProvider.js";
import type { TranscribeOptions, TranscriptResult } from "../types.js";

/**
 * Mock ASR provider for local development and the vertical slice (PRD §4.4 / Phase 4.4).
 * Returns a deterministic 3-turn Hinglish clinical exchange in well under 1 s.
 * No network calls; always healthy.
 */
export class MockASRProvider extends ASRProvider {
  getName(): string {
    return "Mock";
  }

  async getHealthCheck(): Promise<boolean> {
    return true;
  }

  protected async doTranscribe(
    _audioUrl: string,
    _options: TranscribeOptions,
  ): Promise<TranscriptResult> {
    // Simulate a little processing latency so status transitions are observable.
    await new Promise((resolve) => setTimeout(resolve, 300));

    const turns: TranscriptResult["turns"] = [
      {
        speaker: "doctor",
        startMs: 0,
        endMs: 6000,
        text: "Namaste, aaiye baithiye. Boliye kya takleef ho rahi hai aapko?",
        confidence: 0.93,
      },
      {
        speaker: "patient",
        startMs: 6200,
        endMs: 18000,
        text:
          "Doctor sahab, teen din se bukhar hai, around 101 fever, aur sar mein bahut dard ho raha hai. Khaansi bhi hai thodi.",
        confidence: 0.88,
      },
      {
        speaker: "doctor",
        startMs: 18500,
        endMs: 32000,
        text:
          "Theek hai. BP normal hai, 120 by 80. Throat thoda red hai. Main aapko Paracetamol 500 mg de raha hoon, twice daily, after food, 5 days ke liye. Aur Cetirizine 10 mg raat ko ek, 3 days. Zyada paani piyo, aaram karo. Agar 3 din mein theek na ho to wapas aana.",
        confidence: 0.9,
      },
    ];

    const durationMs = 32000;
    const overallConfidence =
      turns.reduce((acc, t) => acc + t.confidence * (t.endMs - t.startMs), 0) /
      turns.reduce((acc, t) => acc + (t.endMs - t.startMs), 0);

    return {
      turns,
      languageDetected: "hi-Latn",
      overallConfidence,
      durationMs,
      processingTimeMs: 0, // stamped by ASRProvider.transcribe()
      providerName: this.getName(),
      rawProviderResponse: { mock: true },
    };
  }
}
