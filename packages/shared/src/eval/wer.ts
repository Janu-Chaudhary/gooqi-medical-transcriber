/**
 * ASR evaluation metrics — Word Error Rate (WER), Character Error Rate (CER),
 * and a light diarization error proxy. Pure functions, no I/O, so they are
 * unit-testable and reusable by the bake-off harness (apps/worker/src/bakeoff).
 *
 * WER = (S + D + I) / N, where S/D/I are substitutions, deletions and
 * insertions from the Levenshtein alignment of reference vs hypothesis tokens,
 * and N is the number of reference tokens.
 */

export interface ErrorCounts {
  substitutions: number;
  deletions: number;
  insertions: number;
  /** Reference token (or char) count — the denominator. */
  referenceLength: number;
}

export interface WerResult extends ErrorCounts {
  /** (S + D + I) / N. 0 = perfect; can exceed 1 when hyp is much longer. */
  wer: number;
}

/**
 * Normalize a transcript for fair comparison: lowercase, strip punctuation,
 * collapse whitespace. Devanagari and Latin scripts both survive; only
 * ASCII/Unicode punctuation and case are removed. This mirrors common WER
 * scoring practice (case- and punctuation-insensitive).
 */
export function normalizeForWer(text: string): string {
  return text
    .toLowerCase()
    .normalize("NFKC")
    // Remove punctuation but keep letters (any script), combining marks
    // (Devanagari matras are category M, not L), digits and spaces.
    .replace(/[^\p{L}\p{M}\p{N}\s]/gu, " ")
    .replace(/\s+/gu, " ")
    .trim();
}

function tokenize(text: string): string[] {
  const n = normalizeForWer(text);
  return n.length === 0 ? [] : n.split(" ");
}

/**
 * Levenshtein alignment over two token sequences, returning S/D/I counts.
 * Uses the standard DP table with backtrace. O(|ref| * |hyp|) time and memory;
 * fine for sentence/utterance-level transcripts.
 */
export function alignTokens(ref: string[], hyp: string[]): ErrorCounts {
  const R = ref.length;
  const H = hyp.length;

  // dp[i][j] = edit distance between ref[0..i) and hyp[0..j).
  const dp: number[][] = Array.from({ length: R + 1 }, () =>
    new Array<number>(H + 1).fill(0),
  );
  for (let i = 0; i <= R; i++) dp[i]![0] = i;
  for (let j = 0; j <= H; j++) dp[0]![j] = j;

  for (let i = 1; i <= R; i++) {
    for (let j = 1; j <= H; j++) {
      const cost = ref[i - 1] === hyp[j - 1] ? 0 : 1;
      dp[i]![j] = Math.min(
        dp[i - 1]![j]! + 1, // deletion (ref token dropped)
        dp[i]![j - 1]! + 1, // insertion (extra hyp token)
        dp[i - 1]![j - 1]! + cost, // match or substitution
      );
    }
  }

  // Backtrace to categorise the edits.
  let i = R;
  let j = H;
  let substitutions = 0;
  let deletions = 0;
  let insertions = 0;
  while (i > 0 || j > 0) {
    if (i > 0 && j > 0 && ref[i - 1] === hyp[j - 1] && dp[i]![j] === dp[i - 1]![j - 1]) {
      i--;
      j--;
    } else if (i > 0 && j > 0 && dp[i]![j] === dp[i - 1]![j - 1]! + 1) {
      substitutions++;
      i--;
      j--;
    } else if (i > 0 && dp[i]![j] === dp[i - 1]![j]! + 1) {
      deletions++;
      i--;
    } else {
      insertions++;
      j--;
    }
  }

  return { substitutions, deletions, insertions, referenceLength: R };
}

/** Word Error Rate between a reference and hypothesis transcript. */
export function wordErrorRate(reference: string, hypothesis: string): WerResult {
  const ref = tokenize(reference);
  const hyp = tokenize(hypothesis);
  const counts = alignTokens(ref, hyp);
  const denom = counts.referenceLength || (hyp.length === 0 ? 1 : hyp.length);
  const wer = (counts.substitutions + counts.deletions + counts.insertions) / denom;
  return { ...counts, wer };
}

/** Character Error Rate — same algorithm over characters (ignores spaces). */
export function characterErrorRate(reference: string, hypothesis: string): number {
  const ref = normalizeForWer(reference).replace(/\s+/gu, "").split("");
  const hyp = normalizeForWer(hypothesis).replace(/\s+/gu, "").split("");
  const counts = alignTokens(ref, hyp);
  const denom = counts.referenceLength || (hyp.length === 0 ? 1 : hyp.length);
  return (counts.substitutions + counts.deletions + counts.insertions) / denom;
}

/**
 * Aggregate WER over a set of utterances the way ASR benchmarks report it:
 * sum all S/D/I and divide by total reference length (NOT the mean of
 * per-utterance WERs, which over-weights short clips).
 */
export function aggregateWer(results: ErrorCounts[]): WerResult {
  const agg = results.reduce<ErrorCounts>(
    (a, r) => ({
      substitutions: a.substitutions + r.substitutions,
      deletions: a.deletions + r.deletions,
      insertions: a.insertions + r.insertions,
      referenceLength: a.referenceLength + r.referenceLength,
    }),
    { substitutions: 0, deletions: 0, insertions: 0, referenceLength: 0 },
  );
  const denom = agg.referenceLength || 1;
  const wer = (agg.substitutions + agg.deletions + agg.insertions) / denom;
  return { ...agg, wer };
}
