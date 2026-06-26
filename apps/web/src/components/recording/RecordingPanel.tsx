"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
  CHUNK_TIMESLICE_MS,
  MAX_RECORDING_MS,
  RECORDING_WARNING_MS,
} from "@gooqi/shared";
import { useApi } from "@/lib/api";
import type { ChunkUploadResponse } from "@/lib/api-types";
import {
  getPendingChunks,
  markChunksUploaded,
  saveChunk,
  type StoredChunk,
} from "@/lib/recording/idb";
import { Button } from "@/components/ui/button";
import { Card, CardBody, CardHeader } from "@/components/ui/card";

type RecState = "idle" | "recording" | "paused" | "stopping" | "stopped";

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

function pickMimeType(): string {
  if (typeof MediaRecorder === "undefined") return "";
  const preferred = "audio/webm;codecs=opus";
  if (MediaRecorder.isTypeSupported(preferred)) return preferred;
  if (MediaRecorder.isTypeSupported("audio/webm")) return "audio/webm";
  return "";
}

export function RecordingPanel({ sessionId }: { sessionId: string }) {
  const router = useRouter();
  const { request, requestMultipart } = useApi();

  const [state, setState] = useState<RecState>("idle");
  const [elapsedMs, setElapsedMs] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [uploadPaused, setUploadPaused] = useState(false);
  const [showWarning, setShowWarning] = useState(false);
  const [inflight, setInflight] = useState(0);

  const recorderRef = useRef<MediaRecorder | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const wakeLockRef = useRef<WakeLockSentinel | null>(null);
  const chunkIndexRef = useRef(0);
  const consecutiveFailuresRef = useRef(0);
  const uploadsRef = useRef<Set<Promise<unknown>>>(new Set());
  const startTimeRef = useRef(0);
  const accumulatedRef = useRef(0);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const stoppingRef = useRef(false);

  // --- Upload with retry/backoff -----------------------------------------
  const uploadChunk = useCallback(
    async (chunk: StoredChunk): Promise<void> => {
      for (let attempt = 0; attempt < 3; attempt++) {
        try {
          const fd = new FormData();
          fd.append("chunkIndex", String(chunk.chunkIndex));
          fd.append(
            "chunk",
            chunk.blob,
            `chunk-${chunk.chunkIndex}.webm`,
          );
          const res = await requestMultipart<ChunkUploadResponse>(
            `/api/sessions/${sessionId}/chunks`,
            fd,
          );
          const ack = res?.acknowledgedIndices ?? [chunk.chunkIndex];
          await markChunksUploaded(sessionId, ack);
          consecutiveFailuresRef.current = 0;
          setUploadPaused(false);
          return;
        } catch {
          if (attempt < 2) await sleep(1000 * 2 ** attempt); // 1s, 2s, (4s)
        }
      }
      consecutiveFailuresRef.current += 1;
      if (consecutiveFailuresRef.current > 3) setUploadPaused(true);
      throw new Error(`chunk ${chunk.chunkIndex} upload failed`);
    },
    [requestMultipart, sessionId],
  );

  const trackUpload = useCallback((p: Promise<unknown>) => {
    uploadsRef.current.add(p);
    setInflight(uploadsRef.current.size);
    p.finally(() => {
      uploadsRef.current.delete(p);
      setInflight(uploadsRef.current.size);
    });
  }, []);

  // --- ondataavailable: persist FIRST, then upload -----------------------
  const handleData = useCallback(
    (e: BlobEvent) => {
      if (!e.data || e.data.size === 0) return;
      const index = chunkIndexRef.current++;
      const chunk: StoredChunk = {
        sessionId,
        chunkIndex: index,
        blob: e.data,
        uploaded: false,
      };
      const p = (async () => {
        await saveChunk(chunk); // IndexedDB before network
        try {
          await uploadChunk(chunk);
        } catch {
          /* left pending in IDB; retried on 'online' / finalise */
        }
      })();
      trackUpload(p);
    },
    [sessionId, uploadChunk, trackUpload],
  );

  // --- Wake lock ----------------------------------------------------------
  const requestWakeLock = useCallback(async () => {
    try {
      if ("wakeLock" in navigator) {
        wakeLockRef.current = await navigator.wakeLock.request("screen");
      }
    } catch {
      /* unsupported or denied — non-fatal */
    }
  }, []);

  const releaseWakeLock = useCallback(async () => {
    try {
      await wakeLockRef.current?.release();
    } catch {
      /* ignore */
    }
    wakeLockRef.current = null;
  }, []);

  // --- Timer --------------------------------------------------------------
  const stopTimer = useCallback(() => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
  }, []);

  // finalise is defined before stop because stop calls it on the no-recorder path
  const finalise = useCallback(async () => {
    // Wait for all in-flight uploads, then retry any still-pending chunks.
    await Promise.allSettled(Array.from(uploadsRef.current));
    const pending = await getPendingChunks(sessionId);
    for (const c of pending) {
      await uploadChunk(c).catch(() => {});
    }
    try {
      await request(`/api/sessions/${sessionId}/finalise-audio`, {
        method: "POST",
        body: {
          duration_ms: Math.round(elapsedMs),
          total_chunks: chunkIndexRef.current,
        },
      });
    } catch (err) {
      setError(
        err instanceof Error
          ? `Failed to finalise: ${err.message}`
          : "Failed to finalise recording.",
      );
    }
    setState("stopped");
    router.push(`/sessions/${sessionId}`);
  }, [elapsedMs, request, router, sessionId, uploadChunk]);

  const stop = useCallback(async () => {
    if (stoppingRef.current) return;
    stoppingRef.current = true;
    setState("stopping");
    stopTimer();
    await releaseWakeLock();
    const mr = recorderRef.current;
    if (mr && mr.state !== "inactive") {
      // onstop (set in start) runs finalise after the final dataavailable.
      mr.stop();
    } else {
      streamRef.current?.getTracks().forEach((t) => t.stop());
      await finalise();
    }
  }, [finalise, releaseWakeLock, stopTimer]);

  const startTimer = useCallback(() => {
    stopTimer();
    timerRef.current = setInterval(() => {
      const e = accumulatedRef.current + (Date.now() - startTimeRef.current);
      setElapsedMs(e);
      if (e >= RECORDING_WARNING_MS) setShowWarning(true);
      if (e >= MAX_RECORDING_MS) void stop();
    }, 500);
  }, [stop, stopTimer]);

  // --- Controls -----------------------------------------------------------
  const start = useCallback(async () => {
    setError(null);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;
      const mimeType = pickMimeType();
      const mr = new MediaRecorder(
        stream,
        mimeType ? { mimeType } : undefined,
      );
      mr.ondataavailable = handleData;
      mr.onstop = () => {
        streamRef.current?.getTracks().forEach((t) => t.stop());
        void finalise();
      };
      recorderRef.current = mr;
      chunkIndexRef.current = 0;
      accumulatedRef.current = 0;
      startTimeRef.current = Date.now();
      consecutiveFailuresRef.current = 0;
      mr.start(CHUNK_TIMESLICE_MS);
      setState("recording");
      startTimer();
      void requestWakeLock();
    } catch (err) {
      setError(
        err instanceof Error
          ? `Microphone unavailable: ${err.message}`
          : "Could not access microphone.",
      );
    }
  }, [finalise, handleData, requestWakeLock, startTimer]);

  const pause = useCallback(() => {
    const mr = recorderRef.current;
    if (mr && mr.state === "recording") {
      mr.pause();
      accumulatedRef.current += Date.now() - startTimeRef.current;
      stopTimer();
      void releaseWakeLock();
      setState("paused");
    }
  }, [releaseWakeLock, stopTimer]);

  const resume = useCallback(() => {
    const mr = recorderRef.current;
    if (mr && mr.state === "paused") {
      mr.resume();
      startTimeRef.current = Date.now();
      startTimer();
      void requestWakeLock();
      setState("recording");
    }
  }, [requestWakeLock, startTimer]);

  // --- Re-queue pending chunks when connectivity returns ------------------
  useEffect(() => {
    const onOnline = () => {
      void (async () => {
        const pending = await getPendingChunks(sessionId);
        for (const c of pending) {
          trackUpload(uploadChunk(c).catch(() => {}));
        }
      })();
    };
    window.addEventListener("online", onOnline);
    return () => window.removeEventListener("online", onOnline);
  }, [sessionId, trackUpload, uploadChunk]);

  // --- Flush partial chunk when tab is hidden -----------------------------
  useEffect(() => {
    const onVisibility = () => {
      const mr = recorderRef.current;
      if (document.hidden && mr && mr.state === "recording") {
        try {
          mr.requestData();
        } catch {
          /* ignore */
        }
      } else if (!document.hidden && mr && mr.state === "recording") {
        void requestWakeLock();
      }
    };
    document.addEventListener("visibilitychange", onVisibility);
    return () =>
      document.removeEventListener("visibilitychange", onVisibility);
  }, [requestWakeLock]);

  // --- Warn before unloading while actively recording ---------------------
  useEffect(() => {
    const handler = (e: BeforeUnloadEvent) => {
      if (state === "recording" || state === "paused") {
        e.preventDefault();
        e.returnValue = "";
      }
    };
    window.addEventListener("beforeunload", handler);
    return () => window.removeEventListener("beforeunload", handler);
  }, [state]);

  // --- Cleanup on unmount -------------------------------------------------
  useEffect(() => {
    return () => {
      stopTimer();
      void releaseWakeLock();
      streamRef.current?.getTracks().forEach((t) => t.stop());
    };
  }, [releaseWakeLock, stopTimer]);

  // -----------------------------------------------------------------------
  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <h2 className="font-medium text-slate-900">Recording</h2>
          <span className="font-mono text-lg tabular-nums text-slate-900">
            {formatElapsed(elapsedMs)}
          </span>
        </div>
      </CardHeader>
      <CardBody className="space-y-4">
        {/* Status row */}
        <div className="flex items-center gap-2 text-sm">
          <span
            className={
              state === "recording"
                ? "inline-block h-3 w-3 animate-pulse rounded-full bg-red-500"
                : state === "paused"
                  ? "inline-block h-3 w-3 rounded-full bg-amber-400"
                  : "inline-block h-3 w-3 rounded-full bg-slate-300"
            }
          />
          <span className="text-slate-600">
            {state === "idle" && "Ready to record"}
            {state === "recording" && "Recording…"}
            {state === "paused" && "Paused"}
            {state === "stopping" && "Finishing upload…"}
            {state === "stopped" && "Stopped"}
          </span>
          {inflight > 0 && (
            <span className="text-xs text-slate-400">
              ({inflight} chunk{inflight > 1 ? "s" : ""} uploading)
            </span>
          )}
        </div>

        {showWarning && state !== "stopped" && (
          <div className="rounded-md bg-amber-50 px-4 py-3 text-sm text-amber-800">
            Approaching the 60-minute limit. Recording will stop automatically
            at 60 minutes.
          </div>
        )}

        {uploadPaused && (
          <div className="rounded-md bg-amber-50 px-4 py-3 text-sm text-amber-800">
            Upload paused — check your connection. Recording continues locally.
          </div>
        )}

        {error && (
          <div className="rounded-md bg-red-50 px-4 py-3 text-sm text-red-700">
            {error}
          </div>
        )}

        {/* Controls */}
        <div className="flex flex-wrap gap-3">
          {state === "idle" && (
            <Button onClick={start}>Start Recording</Button>
          )}
          {state === "recording" && (
            <>
              <Button variant="secondary" onClick={pause}>
                Pause
              </Button>
              <Button variant="danger" onClick={stop}>
                Stop
              </Button>
            </>
          )}
          {state === "paused" && (
            <>
              <Button onClick={resume}>Resume</Button>
              <Button variant="danger" onClick={stop}>
                Stop
              </Button>
            </>
          )}
          {state === "stopping" && (
            <Button disabled>Finishing…</Button>
          )}
        </div>

        <p className="text-xs text-slate-400">
          Audio is saved on this device as it records, so a refresh or lost
          connection will not lose the consultation.
        </p>
      </CardBody>
    </Card>
  );
}

function formatElapsed(ms: number): string {
  const total = Math.floor(ms / 1000);
  const m = Math.floor(total / 60)
    .toString()
    .padStart(2, "0");
  const s = (total % 60).toString().padStart(2, "0");
  return `${m}:${s}`;
}
