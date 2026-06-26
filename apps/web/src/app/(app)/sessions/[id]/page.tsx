"use client";

import { use, useCallback, useEffect, useRef, useState } from "react";
import { useApi } from "@/lib/api";
import type { SessionDetail } from "@/lib/api-types";
import type { SessionStatus } from "@gooqi/shared";
import { Button } from "@/components/ui/button";
import { Card, CardBody, CardHeader } from "@/components/ui/card";
import { StatusBadge } from "@/components/ui/badge";
import { ReviewEditor } from "@/components/review/ReviewEditor";
import { ReadOnlyView } from "@/components/review/ReadOnlyView";

const PROCESSING: SessionStatus[] = [
  "audio_uploaded",
  "transcribing",
  "generating_note",
];
const FAILED: SessionStatus[] = ["transcription_failed", "note_failed"];

export default function SessionDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const { request } = useApi();
  const [session, setSession] = useState<SessionDetail | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [retrying, setRetrying] = useState(false);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const load = useCallback(async () => {
    try {
      const data = await request<SessionDetail | { session: SessionDetail }>(
        `/api/sessions/${id}`,
      );
      const s = "session" in data ? data.session : data;
      setSession(s);
      setError(null);
      return s;
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load session.");
      return null;
    }
  }, [id, request]);

  useEffect(() => {
    void load();
  }, [load]);

  // Poll every 4s while processing.
  useEffect(() => {
    if (!session) return;
    const isProcessing = PROCESSING.includes(session.status);
    if (pollRef.current) {
      clearInterval(pollRef.current);
      pollRef.current = null;
    }
    if (isProcessing) {
      pollRef.current = setInterval(() => void load(), 4000);
    }
    return () => {
      if (pollRef.current) clearInterval(pollRef.current);
    };
  }, [session, load]);

  async function retry() {
    if (!session) return;
    setRetrying(true);
    try {
      // Re-trigger the failed stage. Endpoint best-effort; falls back to reload.
      await request(`/api/sessions/${id}/retry`, { method: "POST" }).catch(
        () => {},
      );
      await load();
    } finally {
      setRetrying(false);
    }
  }

  if (error && !session) {
    return (
      <Card>
        <CardBody>
          <p className="text-sm text-red-700">{error}</p>
          <Button className="mt-3" variant="secondary" onClick={() => load()}>
            Retry
          </Button>
        </CardBody>
      </Card>
    );
  }

  if (!session) {
    return <p className="text-slate-400">Loading session…</p>;
  }

  const { status } = session;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <h1 className="text-xl font-semibold text-slate-900">
            {session.patient_name || "Session"}
          </h1>
          <StatusBadge status={status} />
        </div>
      </div>

      {status === "recording" && (
        <Card>
          <CardBody>
            <p className="text-sm text-slate-600">
              This session is still recording. Return to the recording tab to
              finish it.
            </p>
          </CardBody>
        </Card>
      )}

      {PROCESSING.includes(status) && (
        <Card>
          <CardHeader>
            <h2 className="font-medium text-slate-900">Processing…</h2>
          </CardHeader>
          <CardBody className="space-y-2">
            <div className="flex items-center gap-3">
              <span className="inline-block h-3 w-3 animate-pulse rounded-full bg-blue-500" />
              <p className="text-sm text-slate-600">
                {status === "audio_uploaded" && "Preparing audio…"}
                {status === "transcribing" && "Transcribing the consultation…"}
                {status === "generating_note" &&
                  "Generating the clinical note…"}
              </p>
            </div>
            <p className="text-xs text-slate-400">
              This page refreshes automatically.
            </p>
          </CardBody>
        </Card>
      )}

      {FAILED.includes(status) && (
        <Card>
          <CardHeader>
            <h2 className="font-medium text-red-700">
              {status === "transcription_failed"
                ? "Transcription failed"
                : "Note generation failed"}
            </h2>
          </CardHeader>
          <CardBody className="space-y-3">
            {session.failure_reason && (
              <p className="text-sm text-slate-600">{session.failure_reason}</p>
            )}
            <Button onClick={retry} disabled={retrying}>
              {retrying ? "Retrying…" : "Retry"}
            </Button>
          </CardBody>
        </Card>
      )}

      {status === "draft" && (
        <ReviewEditor sessionId={id} onFinalised={load} />
      )}

      {status === "final" && <ReadOnlyView sessionId={id} />}

      {status === "abandoned" && (
        <Card>
          <CardBody>
            <p className="text-sm text-slate-600">
              This session was abandoned.
            </p>
          </CardBody>
        </Card>
      )}
    </div>
  );
}
