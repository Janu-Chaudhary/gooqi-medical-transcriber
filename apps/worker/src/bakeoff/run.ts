/**
 * ASR bake-off harness.
 *
 *   pnpm --filter @gooqi/worker bakeoff [manifest.json] [--out results.json]
 *
 * Runs every provider listed in the manifest against every clip, scores each
 * transcript's Word Error Rate (and Character Error Rate) against the reference,
 * and prints an aggregate scorecard. This is the *harness* — you supply the
 * clips (audio URLs + human reference transcripts) and the provider API keys.
 *
 * WER is aggregated the benchmark-correct way (total edits / total reference
 * words), not as a mean of per-clip rates, so short clips don't dominate.
 *
 * See ./README.md for the manifest schema and the recommended test-set design
 * (≥100 clips, 3-speaker scenarios, graded noise) — a 20-clip set is not
 * statistically meaningful.
 */
import "../lib/env.js";
import { readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import {
  createASRProvider,
  wordErrorRate,
  characterErrorRate,
  aggregateWer,
  type ErrorCounts,
  type TranscribeOptions,
  type TranscriptResult,
} from "@gooqi/shared";

interface Clip {
  id: string;
  /** Fetchable audio URL (e.g. a Supabase signed URL) or a public https URL. */
  audioUrl: string;
  /** Human ground-truth transcript (Roman script recommended for Hinglish). */
  refText: string;
  language?: TranscribeOptions["language"];
  audioFormat?: TranscribeOptions["audioFormat"];
  /** Ground-truth number of distinct speakers, for diarization scoring. */
  refSpeakers?: number;
  /** Free-form tags for slicing the report (accent, noise level, specialty). */
  tags?: Record<string, string>;
}

interface Manifest {
  providers: string[];
  defaults?: Partial<TranscribeOptions>;
  clips: Clip[];
}

interface ClipScore {
  clipId: string;
  provider: string;
  ok: boolean;
  error?: string;
  wer?: number;
  cer?: number;
  counts?: ErrorCounts;
  speakerCountMatch?: boolean | null;
  processingTimeMs?: number;
}

function parseArgs(argv: string[]): { manifest: string; out: string | null } {
  const args = argv.slice(2);
  let manifest = "src/bakeoff/manifest.example.json";
  let out: string | null = null;
  for (let i = 0; i < args.length; i++) {
    if (args[i] === "--out") out = args[++i] ?? null;
    else if (!args[i]!.startsWith("--")) manifest = args[i]!;
  }
  return { manifest, out };
}

async function scoreClip(
  provider: string,
  clip: Clip,
  defaults: Partial<TranscribeOptions>,
): Promise<ClipScore> {
  const asr = createASRProvider(provider);
  const options: TranscribeOptions = {
    language: clip.language ?? defaults.language ?? "auto",
    audioFormat: clip.audioFormat ?? defaults.audioFormat ?? "webm",
    scriptOutput: defaults.scriptOutput ?? "roman",
    speakerCount: clip.refSpeakers ?? defaults.speakerCount ?? 2,
    maxSpeakers: defaults.maxSpeakers ?? 3,
    noiseReduction: defaults.noiseReduction ?? true,
  };
  try {
    const result: TranscriptResult = await asr.transcribe(clip.audioUrl, options);
    const hyp = result.turns.map((t) => t.text).join(" ");
    const wer = wordErrorRate(clip.refText, hyp);
    const cer = characterErrorRate(clip.refText, hyp);
    const distinctSpeakers = new Set(result.turns.map((t) => t.speaker)).size;
    const speakerCountMatch =
      clip.refSpeakers != null ? distinctSpeakers === clip.refSpeakers : null;
    return {
      clipId: clip.id,
      provider,
      ok: true,
      wer: wer.wer,
      cer,
      counts: {
        substitutions: wer.substitutions,
        deletions: wer.deletions,
        insertions: wer.insertions,
        referenceLength: wer.referenceLength,
      },
      speakerCountMatch,
      processingTimeMs: result.processingTimeMs,
    };
  } catch (err) {
    return {
      clipId: clip.id,
      provider,
      ok: false,
      error: err instanceof Error ? err.message : String(err),
    };
  }
}

function pct(x: number): string {
  return (x * 100).toFixed(1) + "%";
}

async function main() {
  const { manifest: manifestPath, out } = parseArgs(process.argv);
  const raw = readFileSync(resolve(manifestPath), "utf8");
  const manifest = JSON.parse(raw) as Manifest;

  if (!manifest.providers?.length || !manifest.clips?.length) {
    throw new Error("Manifest must list at least one provider and one clip.");
  }

  console.log(
    `\nBake-off: ${manifest.providers.length} provider(s) × ${manifest.clips.length} clip(s)\n`,
  );
  if (manifest.clips.length < 100) {
    console.log(
      `\x1b[33m! Only ${manifest.clips.length} clips. ≥100 (varied accent/noise/specialty, incl. 3-speaker) is recommended for a meaningful result.\x1b[0m\n`,
    );
  }

  const allScores: ClipScore[] = [];
  for (const provider of manifest.providers) {
    for (const clip of manifest.clips) {
      process.stdout.write(`  ${provider} · ${clip.id} … `);
      const score = await scoreClip(provider, clip, manifest.defaults ?? {});
      allScores.push(score);
      console.log(score.ok ? `WER ${pct(score.wer!)}` : `\x1b[31mFAIL: ${score.error}\x1b[0m`);
    }
  }

  // Aggregate per provider.
  console.log("\nScorecard\n─────────");
  console.log(
    ["provider".padEnd(16), "WER".padEnd(8), "CER".padEnd(8), "spkr✓".padEnd(7), "ok/total"].join(" "),
  );
  const summary = manifest.providers.map((provider) => {
    const scores = allScores.filter((s) => s.provider === provider);
    const ok = scores.filter((s) => s.ok);
    const agg = aggregateWer(ok.map((s) => s.counts!).filter(Boolean));
    const cerMean = ok.length
      ? ok.reduce((a, s) => a + (s.cer ?? 0), 0) / ok.length
      : 0;
    const spkrEval = ok.filter((s) => s.speakerCountMatch !== null);
    const spkrMatch = spkrEval.filter((s) => s.speakerCountMatch).length;
    const spkrRate = spkrEval.length ? spkrMatch / spkrEval.length : null;
    console.log(
      [
        provider.padEnd(16),
        pct(agg.wer).padEnd(8),
        pct(cerMean).padEnd(8),
        (spkrRate === null ? "n/a" : pct(spkrRate)).padEnd(7),
        `${ok.length}/${scores.length}`,
      ].join(" "),
    );
    return { provider, wer: agg.wer, cer: cerMean, speakerCountAccuracy: spkrRate, ok: ok.length, total: scores.length };
  });

  const best = [...summary].filter((s) => s.ok > 0).sort((a, b) => a.wer - b.wer)[0];
  if (best) console.log(`\nLowest WER: \x1b[32m${best.provider}\x1b[0m (${pct(best.wer)})`);

  if (out) {
    writeFileSync(resolve(out), JSON.stringify({ summary, scores: allScores }, null, 2));
    console.log(`\nWrote detailed results → ${out}`);
  }
  console.log("");
}

main().catch((err) => {
  console.error("\x1b[31mBake-off failed:\x1b[0m", err instanceof Error ? err.message : err);
  process.exit(1);
});
