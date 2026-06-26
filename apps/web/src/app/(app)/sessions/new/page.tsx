"use client";

import { useState } from "react";
import {
  CONSENT_TEXT_EN,
  CONSENT_TEXT_HI,
} from "@gooqi/shared";
import { useApi } from "@/lib/api";
import type { CreateSessionResponse } from "@/lib/api-types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardBody, CardHeader } from "@/components/ui/card";
import { RecordingPanel } from "@/components/recording/RecordingPanel";

type Step = 1 | 2 | 3;
type Lang = "en" | "hi";

export default function NewSessionPage() {
  const { request } = useApi();
  const [step, setStep] = useState<Step>(1);

  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");

  const [language, setLanguage] = useState<Lang>("en");
  const [agreed, setAgreed] = useState(false);

  const [sessionId, setSessionId] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function confirmAndStart() {
    if (!agreed) return;
    setSubmitting(true);
    setError(null);
    try {
      const res = await request<CreateSessionResponse>("/api/sessions", {
        method: "POST",
        body: {
          patient: { name: name.trim(), phone: phone.trim() || null },
          consent: { agreed: true, language },
        },
      });
      const id = res.id ?? res.session?.id;
      if (!id) throw new Error("Server did not return a session id.");
      setSessionId(id);
      setStep(3);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to create session.",
      );
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <h1 className="text-xl font-semibold text-slate-900">New Session</h1>

      <Stepper step={step} />

      {step === 1 && (
        <Card>
          <CardHeader>
            <h2 className="font-medium text-slate-900">Patient details</h2>
          </CardHeader>
          <CardBody className="space-y-4">
            <div className="space-y-1">
              <label className="text-sm font-medium text-slate-700">
                Patient name
              </label>
              <Input
                autoFocus
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Full name"
              />
            </div>
            <div className="space-y-1">
              <label className="text-sm font-medium text-slate-700">
                Phone (optional)
              </label>
              <Input
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="Mobile number"
                inputMode="tel"
              />
            </div>
            <div className="flex justify-end">
              <Button
                onClick={() => setStep(2)}
                disabled={name.trim().length === 0}
              >
                Continue
              </Button>
            </div>
          </CardBody>
        </Card>
      )}

      {step === 2 && (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <h2 className="font-medium text-slate-900">Consent</h2>
              <div className="flex overflow-hidden rounded-md border border-slate-300 text-sm">
                {(["en", "hi"] as Lang[]).map((l) => (
                  <button
                    key={l}
                    type="button"
                    onClick={() => setLanguage(l)}
                    className={
                      language === l
                        ? "bg-brand px-3 py-1 text-white"
                        : "bg-white px-3 py-1 text-slate-600"
                    }
                  >
                    {l === "en" ? "English" : "हिन्दी"}
                  </button>
                ))}
              </div>
            </div>
          </CardHeader>
          <CardBody className="space-y-4">
            <p className="rounded-md bg-slate-50 px-4 py-3 text-sm text-slate-700">
              {language === "en" ? CONSENT_TEXT_EN : CONSENT_TEXT_HI}
            </p>

            <label className="flex items-start gap-3 text-sm text-slate-700">
              <input
                type="checkbox"
                className="mt-0.5 h-4 w-4"
                checked={agreed}
                onChange={(e) => setAgreed(e.target.checked)}
              />
              <span>
                I confirm the patient has been informed and consents to this
                consultation being recorded.
              </span>
            </label>

            {error && <p className="text-sm text-red-600">{error}</p>}

            <div className="flex justify-between">
              <Button variant="secondary" onClick={() => setStep(1)}>
                Back
              </Button>
              <Button
                onClick={confirmAndStart}
                disabled={!agreed || submitting}
              >
                {submitting ? "Starting…" : "Confirm & Start Recording"}
              </Button>
            </div>
          </CardBody>
        </Card>
      )}

      {step === 3 && sessionId && (
        <RecordingPanel sessionId={sessionId} />
      )}
    </div>
  );
}

function Stepper({ step }: { step: Step }) {
  const labels = ["Patient", "Consent", "Recording"];
  return (
    <ol className="flex items-center gap-2 text-sm">
      {labels.map((label, i) => {
        const n = (i + 1) as Step;
        const active = n === step;
        const done = n < step;
        return (
          <li key={label} className="flex items-center gap-2">
            <span
              className={
                active
                  ? "flex h-6 w-6 items-center justify-center rounded-full bg-brand text-xs text-white"
                  : done
                    ? "flex h-6 w-6 items-center justify-center rounded-full bg-green-500 text-xs text-white"
                    : "flex h-6 w-6 items-center justify-center rounded-full bg-slate-200 text-xs text-slate-500"
              }
            >
              {n}
            </span>
            <span className={active ? "font-medium text-slate-900" : "text-slate-500"}>
              {label}
            </span>
            {i < labels.length - 1 && (
              <span className="mx-1 h-px w-6 bg-slate-300" />
            )}
          </li>
        );
      })}
    </ol>
  );
}
