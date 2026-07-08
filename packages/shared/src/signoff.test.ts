import { describe, expect, it } from "vitest";
import { validateSignoff } from "./signoff.js";

describe("validateSignoff", () => {
  const base = {
    chief_complaint: "Fever",
    primary_diagnosis: "Viral fever",
    no_medication: false,
  };

  it("passes with required fields + at least one prescription", () => {
    expect(validateSignoff(base, 1).ok).toBe(true);
  });

  it("passes with no prescriptions when no_medication is true", () => {
    expect(validateSignoff({ ...base, no_medication: true }, 0).ok).toBe(true);
  });

  it("fails when chief complaint is missing", () => {
    const r = validateSignoff({ ...base, chief_complaint: "" }, 1);
    expect(r.ok).toBe(false);
    expect(r.reason).toMatch(/chief complaint/i);
  });

  it("fails when chief complaint is whitespace only", () => {
    expect(validateSignoff({ ...base, chief_complaint: "   " }, 1).ok).toBe(false);
  });

  it("fails when primary diagnosis is missing", () => {
    const r = validateSignoff({ ...base, primary_diagnosis: null }, 1);
    expect(r.ok).toBe(false);
    expect(r.reason).toMatch(/diagnosis/i);
  });

  it("fails when there are no prescriptions and no_medication is false", () => {
    const r = validateSignoff(base, 0);
    expect(r.ok).toBe(false);
    expect(r.reason).toMatch(/prescription|no_medication/i);
  });
});
