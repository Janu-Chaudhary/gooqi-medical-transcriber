import { ASRProvider } from "./ASRProvider.js";
import { MockASRProvider } from "./providers/mock.js";
import { FasterWhisperASRProvider } from "./providers/fasterwhisper.js";
import { AssemblyAIASRProvider } from "./providers/assemblyai.js";
import { SarvamASRProvider } from "./providers/sarvam.js";
import { DeepgramASRProvider } from "./providers/deepgram.js";
import { GoogleChirpASRProvider } from "./providers/googlechirp.js";

/**
 * Instantiates the ASR provider configured via the ASR_PROVIDER environment
 * variable (PRD §6.2.4 / §8.3.2).
 *
 * Valid values:
 *   "mock" | "assemblyai" | "sarvam" | "deepgram" | "google_chirp" | "faster_whisper"
 *
 * Throws a hard error at startup if the value is unrecognised, so misconfigured
 * deployments fail fast before any job is consumed.
 */
export function createASRProvider(name: string): ASRProvider {
  switch (name) {
    case "mock":
      return new MockASRProvider();
    case "assemblyai":
      return new AssemblyAIASRProvider();
    case "sarvam":
      return new SarvamASRProvider();
    case "deepgram":
      return new DeepgramASRProvider();
    case "google_chirp":
      return new GoogleChirpASRProvider();
    case "faster_whisper":
      return new FasterWhisperASRProvider();
    default:
      throw new Error(
        `Unknown ASR_PROVIDER "${name}". Valid values: mock | assemblyai | sarvam | deepgram | google_chirp | faster_whisper`,
      );
  }
}
