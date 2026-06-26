"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { Turn } from "@gooqi/shared";
import { useApi } from "@/lib/api";
import type {
  NoteFields,
  NoteResponse,
  PrescriptionDraft,
  TranscriptResponse,
} from "@/lib/api-types";
import { Button } from "@/components/ui/button";
import { Card, CardBody, CardHeader } from "@/components/ui/card";

export function ReadOnlyView({ sessionId }: { sessionId: string }) {
  const { request } = useApi();
  const [turns, setTurns] = useState<Turn[]>([]);
  const [note, setNote] = useState<Partial<NoteFields> | null>(null);
  const [prescriptions, setPrescriptions] = useState<PrescriptionDraft[]>([]);
  const [summary, setSummary] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const loadNote = useCallback(async () => {
    const n = await request<NoteResponse>(`/api/sessions/${sessionId}/note`);
    setNote(n?.note ?? null);
    setPrescriptions(n?.prescriptions ?? []);
    setSummary(n?.summary ?? null);
    return n?.summary ?? null;
  }, [request, sessionId]);

  useEffect(() => {
    let active = true;
    void (async () => {
      try {
        const [tx] = await Promise.all([
          request<TranscriptResponse>(
            `/api/sessions/${sessionId}/transcript`,
          ),
          loadNote(),
        ]);
        if (active) setTurns(tx?.turns ?? []);
      } catch (err) {
        if (active)
          setError(err instanceof Error ? err.message : "Failed to load.");
      } finally {
        if (active) setLoading(false);
      }
    })();
    return () => {
      active = false;
    };
  }, [request, sessionId, loadNote]);

  // Poll for the visit summary until it appears.
  useEffect(() => {
    if (summary) {
      if (pollRef.current) clearInterval(pollRef.current);
      return;
    }
    pollRef.current = setInterval(() => {
      void loadNote();
    }, 4000);
    return () => {
      if (pollRef.current) clearInterval(pollRef.current);
    };
  }, [summary, loadNote]);

  if (loading) return <p className="text-slate-400">Loading…</p>;
  if (error)
    return (
      <div className="rounded-md bg-red-50 px-4 py-3 text-sm text-red-700">
        {error}
      </div>
    );

  return (
    <div className="space-y-4">
      <div className="flex justify-end no-print">
        <Button variant="secondary" onClick={() => window.print()}>
          Print summary
        </Button>
      </div>

      {/* PRINT AREA: patient visit summary (A5) */}
      <Card data-print-area>
        <CardHeader>
          <h2 className="font-medium text-slate-900">Visit Summary</h2>
        </CardHeader>
        <CardBody>
          {summary ? (
            <p className="whitespace-pre-wrap text-sm leading-relaxed text-slate-800">
              {summary}
            </p>
          ) : (
            <p className="text-sm text-slate-400">
              The patient visit summary is still being generated…
            </p>
          )}
        </CardBody>
      </Card>

      {/* Clinical note (not printed) */}
      <Card className="no-print">
        <CardHeader>
          <h2 className="font-medium text-slate-900">Clinical Note</h2>
        </CardHeader>
        <CardBody className="space-y-3 text-sm">
          <ReadField label="Chief complaint" value={note?.chief_complaint} />
          <ReadField label="Subjective" value={note?.subjective} />
          <ReadField label="Objective" value={note?.objective} />
          <ReadField label="Assessment" value={note?.assessment} />
          <ReadField label="Plan" value={note?.plan} />
          <ReadField
            label="Primary diagnosis"
            value={note?.primary_diagnosis}
          />
          {note?.differentials && note.differentials.length > 0 && (
            <ReadField
              label="Differentials"
              value={note.differentials.join(", ")}
            />
          )}
          <ReadField label="Follow-up" value={note?.follow_up} />
        </CardBody>
      </Card>

      {/* Prescriptions (not printed) */}
      <Card className="no-print">
        <CardHeader>
          <h2 className="font-medium text-slate-900">Prescriptions</h2>
        </CardHeader>
        <CardBody>
          {note?.no_medication ? (
            <p className="text-sm text-slate-600">No medication prescribed.</p>
          ) : prescriptions.length === 0 ? (
            <p className="text-sm text-slate-400">None recorded.</p>
          ) : (
            <table className="w-full text-left text-sm">
              <thead className="text-xs uppercase text-slate-500">
                <tr>
                  <th className="py-1 pr-3">Drug</th>
                  <th className="py-1 pr-3">Dose</th>
                  <th className="py-1 pr-3">Frequency</th>
                  <th className="py-1 pr-3">Duration</th>
                  <th className="py-1 pr-3">Route</th>
                  <th className="py-1">Notes</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {prescriptions.map((r, i) => (
                  <tr key={i}>
                    <td className="py-1 pr-3 font-medium">{r.drug_name}</td>
                    <td className="py-1 pr-3">{r.dose || "—"}</td>
                    <td className="py-1 pr-3">{r.frequency || "—"}</td>
                    <td className="py-1 pr-3">{r.duration || "—"}</td>
                    <td className="py-1 pr-3">{r.route || "—"}</td>
                    <td className="py-1">{r.notes || "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </CardBody>
      </Card>

      {/* Transcript (not printed) */}
      <Card className="no-print">
        <CardHeader>
          <h2 className="font-medium text-slate-900">Transcript</h2>
        </CardHeader>
        <CardBody className="space-y-2">
          {turns.length === 0 ? (
            <p className="text-sm text-slate-400">No transcript.</p>
          ) : (
            turns.map((t, i) => (
              <p key={i} className="text-sm">
                <span className="font-medium capitalize text-slate-500">
                  {t.speaker}:
                </span>{" "}
                <span className="text-slate-800">{t.text}</span>
              </p>
            ))
          )}
        </CardBody>
      </Card>
    </div>
  );
}

function ReadField({
  label,
  value,
}: {
  label: string;
  value?: string | null;
}) {
  if (!value) return null;
  return (
    <div>
      <div className="text-xs font-medium uppercase tracking-wide text-slate-500">
        {label}
      </div>
      <p className="whitespace-pre-wrap text-slate-800">{value}</p>
    </div>
  );
}
