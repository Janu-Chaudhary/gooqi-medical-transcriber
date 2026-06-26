"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useApi } from "@/lib/api";
import type { SessionListItem } from "@/lib/api-types";
import { StatusBadge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";

const PROCESSING = new Set([
  "recording",
  "audio_uploaded",
  "transcribing",
  "generating_note",
]);

export default function SessionsPage() {
  const { request } = useApi();
  const [sessions, setSessions] = useState<SessionListItem[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState("");

  const load = useCallback(async () => {
    try {
      const data = await request<SessionListItem[] | { sessions: SessionListItem[] }>(
        "/api/sessions",
      );
      const list = Array.isArray(data) ? data : data.sessions;
      setSessions(list ?? []);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load sessions.");
    }
  }, [request]);

  useEffect(() => {
    load();
  }, [load]);

  // Poll while any session is still processing.
  const hasProcessing = useMemo(
    () => (sessions ?? []).some((s) => PROCESSING.has(s.status)),
    [sessions],
  );
  useEffect(() => {
    if (!hasProcessing) return;
    const t = setInterval(load, 5000);
    return () => clearInterval(t);
  }, [hasProcessing, load]);

  const filtered = useMemo(() => {
    if (!sessions) return [];
    const q = filter.trim().toLowerCase();
    if (!q) return sessions;
    return sessions.filter(
      (s) =>
        (s.patient_name ?? "").toLowerCase().includes(q) ||
        (s.patient_phone ?? "").toLowerCase().includes(q),
    );
  }, [sessions, filter]);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold text-slate-900">Sessions</h1>
        <Link href="/sessions/new">
          <Button>New Session</Button>
        </Link>
      </div>

      <Input
        placeholder="Filter by patient name or phone…"
        value={filter}
        onChange={(e) => setFilter(e.target.value)}
        className="max-w-sm"
      />

      {error && (
        <div className="rounded-md bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}

      <Card className="overflow-hidden">
        <table className="w-full text-left text-sm">
          <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
            <tr>
              <th className="px-4 py-3 font-medium">Date</th>
              <th className="px-4 py-3 font-medium">Patient</th>
              <th className="px-4 py-3 font-medium">Chief Complaint</th>
              <th className="px-4 py-3 font-medium">Diagnosis</th>
              <th className="px-4 py-3 font-medium">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {sessions === null ? (
              <tr>
                <td colSpan={5} className="px-4 py-10 text-center text-slate-400">
                  Loading…
                </td>
              </tr>
            ) : filtered.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-4 py-10 text-center text-slate-400">
                  {sessions.length === 0
                    ? "No sessions yet. Start a new session to begin."
                    : "No sessions match your filter."}
                </td>
              </tr>
            ) : (
              filtered.map((s) => (
                <tr key={s.id} className="hover:bg-slate-50">
                  <td className="px-4 py-3 align-top text-slate-600">
                    {formatDate(s.started_at ?? s.created_at)}
                  </td>
                  <td className="px-4 py-3 align-top">
                    <Link
                      href={`/sessions/${s.id}`}
                      className="font-medium text-brand hover:underline"
                    >
                      {s.patient_name || "Unknown patient"}
                    </Link>
                    {s.patient_phone && (
                      <div className="text-xs text-slate-400">
                        {s.patient_phone}
                      </div>
                    )}
                  </td>
                  <td className="px-4 py-3 align-top text-slate-700">
                    {s.chief_complaint || "—"}
                  </td>
                  <td className="px-4 py-3 align-top text-slate-700">
                    {s.primary_diagnosis || "—"}
                  </td>
                  <td className="px-4 py-3 align-top">
                    <StatusBadge status={s.status} />
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </Card>
    </div>
  );
}

function formatDate(iso: string | null): string {
  if (!iso) return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}
