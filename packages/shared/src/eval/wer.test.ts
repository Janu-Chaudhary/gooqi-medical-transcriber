import { describe, expect, it } from "vitest";
import {
  aggregateWer,
  characterErrorRate,
  normalizeForWer,
  wordErrorRate,
} from "./wer.js";

describe("normalizeForWer", () => {
  it("lowercases, strips punctuation and collapses whitespace", () => {
    expect(normalizeForWer("Hello,   World!")).toBe("hello world");
  });
  it("keeps Devanagari letters", () => {
    expect(normalizeForWer("बुखार, तीन!")).toBe("बुखार तीन");
  });
});

describe("wordErrorRate", () => {
  it("is 0 for identical (modulo case/punctuation) transcripts", () => {
    expect(wordErrorRate("the cat sat", "The cat, sat.").wer).toBe(0);
  });

  it("counts a single substitution", () => {
    const r = wordErrorRate("the cat sat", "the dog sat");
    expect(r.substitutions).toBe(1);
    expect(r.deletions).toBe(0);
    expect(r.insertions).toBe(0);
    expect(r.wer).toBeCloseTo(1 / 3);
  });

  it("counts a deletion", () => {
    const r = wordErrorRate("the cat sat down", "the cat sat");
    expect(r.deletions).toBe(1);
    expect(r.wer).toBeCloseTo(1 / 4);
  });

  it("counts an insertion", () => {
    const r = wordErrorRate("the cat sat", "the cat sat down");
    expect(r.insertions).toBe(1);
    expect(r.wer).toBeCloseTo(1 / 3);
  });

  it("handles empty hypothesis (all deletions)", () => {
    const r = wordErrorRate("one two three", "");
    expect(r.deletions).toBe(3);
    expect(r.wer).toBe(1);
  });

  it("can exceed 1 when hypothesis is much longer", () => {
    const r = wordErrorRate("hi", "hi there my friend");
    expect(r.wer).toBeGreaterThan(1);
  });
});

describe("aggregateWer", () => {
  it("weights by total reference length, not mean of rates", () => {
    // Clip A: 1 error / 1 word = 100%. Clip B: 0 errors / 99 words = 0%.
    // Mean-of-rates would give 50%; correct aggregate is 1/100 = 1%.
    const agg = aggregateWer([
      { substitutions: 1, deletions: 0, insertions: 0, referenceLength: 1 },
      { substitutions: 0, deletions: 0, insertions: 0, referenceLength: 99 },
    ]);
    expect(agg.wer).toBeCloseTo(0.01);
  });
});

describe("characterErrorRate", () => {
  it("is 0 for identical strings", () => {
    expect(characterErrorRate("cat", "cat")).toBe(0);
  });
  it("detects a one-character substitution", () => {
    expect(characterErrorRate("cat", "cot")).toBeCloseTo(1 / 3);
  });
});
