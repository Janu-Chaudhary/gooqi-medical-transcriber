import { describe, expect, it } from "vitest";
import {
  isSarvamJobNotReady,
  normaliseSpeaker,
  sarvamResponseToTurns,
} from "./sarvamShared.js";

describe("isSarvamJobNotReady", () => {
  it("detects the eventual-consistency 'not ready' download error", () => {
    expect(
      isSarvamJobNotReady(
        'Job 2026_x is not in COMPLETED state. Current state: Pending',
      ),
    ).toBe(true);
    expect(isSarvamJobNotReady("Current state: Running")).toBe(true);
    expect(isSarvamJobNotReady("current state: accepted")).toBe(true);
  });

  it("does NOT match genuine bad-input errors", () => {
    expect(isSarvamJobNotReady("Unsupported audio format")).toBe(false);
    expect(isSarvamJobNotReady("Invalid language_code")).toBe(false);
    expect(isSarvamJobNotReady("")).toBe(false);
  });
});

describe("normaliseSpeaker", () => {
  it("maps first three speakers to doctor/patient/other", () => {
    expect(normaliseSpeaker("speaker_0")).toBe("doctor");
    expect(normaliseSpeaker(1)).toBe("patient");
    expect(normaliseSpeaker("spk_2")).toBe("other");
    expect(normaliseSpeaker("speaker_9")).toBe("unknown");
    expect(normaliseSpeaker(undefined)).toBe("unknown");
  });
});

describe("sarvamResponseToTurns", () => {
  it("maps diarized entries to turns", () => {
    const turns = sarvamResponseToTurns({
      diarized_transcript: {
        entries: [
          { speaker_id: 0, start_time_seconds: 0, end_time_seconds: 2, transcript: "hello" },
          { speaker_id: 1, start_time_seconds: 2, end_time_seconds: 4, transcript: "hi" },
        ],
      },
    });
    expect(turns).toHaveLength(2);
    expect(turns[0]).toMatchObject({ speaker: "doctor", startMs: 0, endMs: 2000, text: "hello" });
    expect(turns[1]).toMatchObject({ speaker: "patient", text: "hi" });
  });

  it("falls back to a single unknown turn when diarization is absent", () => {
    const turns = sarvamResponseToTurns({ transcript: "full text" });
    expect(turns).toEqual([
      { speaker: "unknown", startMs: 0, endMs: 0, text: "full text", confidence: 0.7 },
    ]);
  });
});
