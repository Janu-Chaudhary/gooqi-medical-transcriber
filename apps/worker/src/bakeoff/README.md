# ASR bake-off harness

Scores every ASR provider against a labelled clip set and prints a WER/CER
scorecard, so provider selection (PRD §6.2, G9) is driven by data instead of
vendor claims.

## Run

```bash
# From the repo root. Set the provider API keys in .env first.
pnpm --filter @gooqi/worker bakeoff apps/worker/src/bakeoff/manifest.example.json --out bakeoff-results.json
```

- `--out <file>` writes the full per-clip JSON (WER, CER, S/D/I counts, timing).
- Without a manifest argument it uses `manifest.example.json` (mock provider).

## Manifest schema

```jsonc
{
  "providers": ["sarvam", "deepgram", "assemblyai"], // ASR_PROVIDER values
  "defaults": { "language": "auto", "audioFormat": "webm", "scriptOutput": "roman" },
  "clips": [
    {
      "id": "clip-001",
      "audioUrl": "https://…/clip-001.webm", // fetchable by the provider
      "refText": "human ground-truth transcript",
      "language": "auto",       // or "hi" | "en-IN"
      "refSpeakers": 2,          // ground-truth speaker count (diarization check)
      "tags": { "accent": "…", "noise": "…", "specialty": "…" }
    }
  ]
}
```

## What it measures

- **WER** — aggregated as total edits ÷ total reference words (benchmark-correct,
  not a mean of per-clip rates). Punctuation- and case-insensitive; Devanagari
  and Roman both supported.
- **CER** — character error rate (mean per clip).
- **Speaker-count accuracy** — distinct diarized speakers vs `refSpeakers`. A
  proxy for diarization quality; full DER needs time-aligned reference segments
  (not yet scored here — a documented gap, not silently skipped).

## Test-set design (important)

A 20–30 clip set is **not** statistically meaningful. Target **≥100 clips**
covering:

- **5+ accents** (north/south/east/west Indian English + Hindi),
- **3+ noise levels** (quiet, clinic AC/fan, crowded OPD),
- **4+ specialties** (general, pediatrics, cardiology, derm — vocabulary varies),
- **3-speaker scenarios** — Indian consultations routinely include an attendant;
  2-speaker-only test sets hide the diarization failures that matter most.

The harness prints a warning when the manifest has fewer than 100 clips.

## Provider ↔ WER target

PRD acceptance is **≤30% Hinglish WER**. That is aggressive for uncontrolled
clinic audio (SOTA is ~20–25% in controlled settings; noise adds 8–15 points).
Run this on **real clinic recordings**, not benchmark datasets, before
committing to a provider — and budget for human-in-the-loop correction if the
winner lands above target.
