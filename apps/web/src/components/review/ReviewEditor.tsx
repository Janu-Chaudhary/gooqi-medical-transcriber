"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { SpeakerLabel, Turn } from "@gooqi/shared";
import { useApi } from "@/lib/api";
import { createClient } from "@/lib/supabase/client";
import type {
  NoteFields,
  NoteResponse,
  PrescriptionDraft,
  TranscriptResponse,
} from "@/lib/api-types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardBody, CardHeader } from "@/components/ui/card";

const SPEAKERS: SpeakerLabel[] = ["doctor", "patient", "other", "unknown"];
const AUTOSAVE_MS = 30_000;

type Tab = "soap" | "rx" | "summary";

function emptyNote(): NoteFields {
  return {
    chief_complaint: "",
    subjective: "",
    objective: "",
    assessment: "",
    plan: "",
    primary_diagnosis: "",
    differentials: [],
    follow_up: "",
    no_medication: false,
  };
}

function emptyRx(): PrescriptionDraft {
  return {
    drug_name: "",
    dose: "",
    frequency: "",
    duration: "",
    route: "",
    notes: "",
  };
}

export function ReviewEditor({
  sessionId,
  onFinalised,
}: {
  sessionId: string;
  onFinalised: () => void | Promise<unknown>;
}) {
  const { request } = useApi();

  const [turns, setTurns] = useState<Turn[]>([]);
  const [note, setNote] = useState<NoteFields>(emptyNote());
  const [prescriptions, setPrescriptions] = useState<PrescriptionDraft[]>([]);
  const [summary, setSummary] = useState<string | null>(null);

  const [tab, setTab] = useState<Tab>("soap");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [savedAt, setSavedAt] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [dirty, setDirty] = useState(false);
  const [doctorName, setDoctorName] = useState<string>("Doctor");
  const [signing, setSigning] = useState(false);

  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const dirtyRef = useRef(false);

  // --- Load doctor name --------------------------------------------------
  useEffect(() => {
    const supabase = createClient();
    void supabase.auth.getUser().then(({ data }) => {
      const meta = data.user?.user_metadata as
        | Record<string, unknown>
        | undefined;
      const name =
        (meta?.full_name as string | undefined) ??
        (meta?.name as string | undefined) ??
        (data.user?.email ? data.user.email.split("@")[0] : undefined);
      if (name) setDoctorName(name);
    });
  }, []);

  // --- Initial load ------------------------------------------------------
  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [tx, n] = await Promise.all([
        request<TranscriptResponse>(`/api/sessions/${sessionId}/transcript`),
        request<NoteResponse>(`/api/sessions/${sessionId}/note`),
      ]);
      setTurns(tx?.turns ?? []);
      setNote({ ...emptyNote(), ...(n?.note ?? {}) });
      setPrescriptions(n?.prescriptions ?? []);
      setSummary(n?.summary ?? null);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load.");
    } finally {
      setLoading(false);
    }
  }, [request, sessionId]);

  useEffect(() => {
    void load();
  }, [load]);

  // --- Saving ------------------------------------------------------------
  const save = useCallback(async () => {
    if (saveTimer.current) {
      clearTimeout(saveTimer.current);
      saveTimer.current = null;
    }
    setSaving(true);
    try {
      await request(`/api/sessions/${sessionId}/note`, {
        method: "PATCH",
        body: {
          ...note,
          prescriptions,
          no_medication: note.no_medication,
        },
      });
      // Best-effort transcript persistence (separate resource).
      await request(`/api/sessions/${sessionId}/transcript`, {
        method: "PATCH",
        body: { turns },
      }).catch(() => {});
      dirtyRef.current = false;
      setDirty(false);
      setSavedAt(
        new Date().toLocaleTimeString(undefined, {
          hour: "2-digit",
          minute: "2-digit",
        }),
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : "Save failed.");
    } finally {
      setSaving(false);
    }
  }, [note, prescriptions, turns, request, sessionId]);

  const markDirty = useCallback(() => {
    dirtyRef.current = true;
    setDirty(true);
    if (saveTimer.current) clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(() => void save(), AUTOSAVE_MS);
  }, [save]);

  // Save on blur (immediate flush).
  const flushSave = useCallback(() => {
    if (dirtyRef.current) void save();
  }, [save]);

  // Warn before unload if unsaved.
  useEffect(() => {
    const handler = (e: BeforeUnloadEvent) => {
      if (dirtyRef.current) {
        e.preventDefault();
        e.returnValue = "";
      }
    };
    window.addEventListener("beforeunload", handler);
    return () => window.removeEventListener("beforeunload", handler);
  }, []);

  useEffect(() => {
    return () => {
      if (saveTimer.current) clearTimeout(saveTimer.current);
    };
  }, []);

  // --- Field updaters ----------------------------------------------------
  function setNoteField<K extends keyof NoteFields>(key: K, value: NoteFields[K]) {
    setNote((n) => ({ ...n, [key]: value }));
    markDirty();
  }

  function updateTurn(i: number, patch: Partial<Turn>) {
    setTurns((ts) => ts.map((t, idx) => (idx === i ? { ...t, ...patch } : t)));
    markDirty();
  }

  function updateRx(i: number, patch: Partial<PrescriptionDraft>) {
    setPrescriptions((rx) =>
      rx.map((r, idx) => (idx === i ? { ...r, ...patch } : r)),
    );
    markDirty();
  }
  function addRx() {
    setPrescriptions((rx) => [...rx, emptyRx()]);
    markDirty();
  }
  function removeRx(i: number) {
    setPrescriptions((rx) => rx.filter((_, idx) => idx !== i));
    markDirty();
  }

  // --- Sign-off gating ---------------------------------------------------
  const hasValidRx = prescriptions.some(
    (r) => r.drug_name.trim().length > 0,
  );
  const canSign =
    note.chief_complaint.trim().length > 0 &&
    note.primary_diagnosis.trim().length > 0 &&
    (note.no_medication || hasValidRx);

  async function signoff() {
    if (!canSign) return;
    const ok = window.confirm(`Confirm and finalise this note as Dr. ${doctorName}?`);
    if (!ok) return;
    setSigning(true);
    try {
      if (dirtyRef.current) await save();
      await request(`/api/sessions/${sessionId}/signoff`, { method: "POST" });
      await onFinalised();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Sign-off failed.");
    } finally {
      setSigning(false);
    }
  }

  if (loading) {
    return <p className="text-slate-400">Loading note…</p>;
  }

  return (
    <div className="space-y-4">
      {/* Save status bar */}
      <div className="flex items-center justify-between rounded-md border border-slate-200 bg-white px-4 py-2 text-sm">
        <div className="text-slate-500">
          {saving
            ? "Saving…"
            : dirty
              ? "Unsaved changes"
              : savedAt
                ? `Saved ${savedAt}`
                : "Auto-saves as you edit"}
        </div>
        <div className="flex items-center gap-2">
          <Button size="sm" variant="secondary" onClick={() => void save()}>
            Save now
          </Button>
          <Button
            size="sm"
            onClick={signoff}
            disabled={!canSign || signing}
            title={
              canSign
                ? undefined
                : "Chief complaint, primary diagnosis, and at least one prescription (or 'No medication') are required."
            }
          >
            {signing ? "Finalising…" : "Sign & Finalise"}
          </Button>
        </div>
      </div>

      {error && (
        <div className="rounded-md bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        {/* LEFT: transcript */}
        <Card className="h-fit">
          <CardHeader>
            <h2 className="font-medium text-slate-900">Transcript</h2>
          </CardHeader>
          <CardBody className="space-y-3">
            {turns.length === 0 ? (
              <p className="text-sm text-slate-400">No transcript turns.</p>
            ) : (
              turns.map((t, i) => (
                <div
                  key={i}
                  className="rounded-md border border-slate-100 bg-slate-50 p-2"
                >
                  <select
                    value={t.speaker}
                    onChange={(e) =>
                      updateTurn(i, {
                        speaker: e.target.value as SpeakerLabel,
                      })
                    }
                    onBlur={flushSave}
                    className="mb-1 rounded border border-slate-300 bg-white px-2 py-0.5 text-xs capitalize"
                  >
                    {SPEAKERS.map((s) => (
                      <option key={s} value={s}>
                        {s}
                      </option>
                    ))}
                  </select>
                  <Textarea
                    value={t.text}
                    rows={2}
                    onChange={(e) => updateTurn(i, { text: e.target.value })}
                    onBlur={flushSave}
                  />
                </div>
              ))
            )}
          </CardBody>
        </Card>

        {/* RIGHT: tabs */}
        <Card className="h-fit">
          <CardHeader className="pb-0">
            <div className="flex gap-1">
              {(
                [
                  ["soap", "SOAP Note"],
                  ["rx", "Prescriptions"],
                  ["summary", "Visit Summary"],
                ] as [Tab, string][]
              ).map(([key, label]) => (
                <button
                  key={key}
                  onClick={() => setTab(key)}
                  className={
                    tab === key
                      ? "rounded-t-md border-b-2 border-brand px-3 py-2 text-sm font-medium text-brand"
                      : "px-3 py-2 text-sm text-slate-500 hover:text-slate-700"
                  }
                >
                  {label}
                </button>
              ))}
            </div>
          </CardHeader>
          <CardBody className="space-y-4">
            {tab === "soap" && (
              <SoapFields
                note={note}
                onField={setNoteField}
                onBlur={flushSave}
              />
            )}

            {tab === "rx" && (
              <RxTable
                prescriptions={prescriptions}
                noMedication={note.no_medication}
                onToggleNoMed={(v) => setNoteField("no_medication", v)}
                onUpdate={updateRx}
                onAdd={addRx}
                onRemove={removeRx}
                onBlur={flushSave}
              />
            )}

            {tab === "summary" && (
              <div className="space-y-2">
                {summary ? (
                  <p className="whitespace-pre-wrap text-sm text-slate-700">
                    {summary}
                  </p>
                ) : (
                  <p className="text-sm text-slate-400">
                    The patient visit summary is still being generated.
                  </p>
                )}
              </div>
            )}
          </CardBody>
        </Card>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-1">
      <label className="text-xs font-medium uppercase tracking-wide text-slate-500">
        {label}
      </label>
      {children}
    </div>
  );
}

function SoapFields({
  note,
  onField,
  onBlur,
}: {
  note: NoteFields;
  onField: <K extends keyof NoteFields>(k: K, v: NoteFields[K]) => void;
  onBlur: () => void;
}) {
  return (
    <div className="space-y-4">
      <Field label="Chief complaint">
        <Input
          value={note.chief_complaint}
          onChange={(e) => onField("chief_complaint", e.target.value)}
          onBlur={onBlur}
        />
      </Field>
      <Field label="Subjective">
        <Textarea
          rows={3}
          value={note.subjective}
          onChange={(e) => onField("subjective", e.target.value)}
          onBlur={onBlur}
        />
      </Field>
      <Field label="Objective">
        <Textarea
          rows={3}
          value={note.objective}
          onChange={(e) => onField("objective", e.target.value)}
          onBlur={onBlur}
        />
      </Field>
      <Field label="Assessment">
        <Textarea
          rows={3}
          value={note.assessment}
          onChange={(e) => onField("assessment", e.target.value)}
          onBlur={onBlur}
        />
      </Field>
      <Field label="Plan">
        <Textarea
          rows={3}
          value={note.plan}
          onChange={(e) => onField("plan", e.target.value)}
          onBlur={onBlur}
        />
      </Field>
      <Field label="Primary diagnosis">
        <Input
          value={note.primary_diagnosis}
          onChange={(e) => onField("primary_diagnosis", e.target.value)}
          onBlur={onBlur}
        />
      </Field>
      <Field label="Differentials (one per line)">
        <Textarea
          rows={2}
          value={note.differentials.join("\n")}
          onChange={(e) =>
            onField(
              "differentials",
              e.target.value
                .split("\n")
                .map((s) => s.trim())
                .filter(Boolean),
            )
          }
          onBlur={onBlur}
        />
      </Field>
      <Field label="Follow-up">
        <Textarea
          rows={2}
          value={note.follow_up}
          onChange={(e) => onField("follow_up", e.target.value)}
          onBlur={onBlur}
        />
      </Field>
    </div>
  );
}

function RxTable({
  prescriptions,
  noMedication,
  onToggleNoMed,
  onUpdate,
  onAdd,
  onRemove,
  onBlur,
}: {
  prescriptions: PrescriptionDraft[];
  noMedication: boolean;
  onToggleNoMed: (v: boolean) => void;
  onUpdate: (i: number, patch: Partial<PrescriptionDraft>) => void;
  onAdd: () => void;
  onRemove: (i: number) => void;
  onBlur: () => void;
}) {
  const cols: [keyof PrescriptionDraft, string][] = [
    ["drug_name", "Drug"],
    ["dose", "Dose"],
    ["frequency", "Frequency"],
    ["duration", "Duration"],
    ["route", "Route"],
    ["notes", "Notes"],
  ];
  return (
    <div className="space-y-3">
      <label className="flex items-center gap-2 text-sm text-slate-700">
        <input
          type="checkbox"
          className="h-4 w-4"
          checked={noMedication}
          onChange={(e) => onToggleNoMed(e.target.checked)}
        />
        No medication prescribed
      </label>

      {!noMedication && (
        <>
          <div className="space-y-3">
            {prescriptions.length === 0 && (
              <p className="text-sm text-slate-400">
                No prescriptions. Add one below.
              </p>
            )}
            {prescriptions.map((r, i) => (
              <div
                key={i}
                className="space-y-2 rounded-md border border-slate-100 p-2"
              >
                <div className="grid grid-cols-2 gap-2">
                  {cols.map(([key, label]) => (
                    <div key={key} className="space-y-1">
                      <label className="text-[11px] uppercase text-slate-400">
                        {label}
                      </label>
                      <Input
                        value={r[key] ?? ""}
                        onChange={(e) =>
                          onUpdate(i, {
                            [key]: e.target.value,
                          } as Partial<PrescriptionDraft>)
                        }
                        onBlur={onBlur}
                      />
                    </div>
                  ))}
                </div>
                <div className="flex justify-end">
                  <Button
                    size="sm"
                    variant="ghost"
                    className="text-red-600"
                    onClick={() => onRemove(i)}
                  >
                    Remove
                  </Button>
                </div>
              </div>
            ))}
          </div>
          <Button size="sm" variant="secondary" onClick={onAdd}>
            + Add medication
          </Button>
        </>
      )}
    </div>
  );
}
