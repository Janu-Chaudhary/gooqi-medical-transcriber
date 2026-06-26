import * as React from "react";
import { cn } from "@/lib/cn";
import type { SessionStatus } from "@gooqi/shared";

type Tone = "amber" | "green" | "red" | "blue" | "slate";

const tones: Record<Tone, string> = {
  amber: "bg-amber-100 text-amber-800",
  green: "bg-green-100 text-green-800",
  red: "bg-red-100 text-red-800",
  blue: "bg-blue-100 text-blue-800",
  slate: "bg-slate-100 text-slate-700",
};

export function Badge({
  tone = "slate",
  className,
  children,
}: {
  tone?: Tone;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium",
        tones[tone],
        className,
      )}
    >
      {children}
    </span>
  );
}

const STATUS_TONE: Record<SessionStatus, Tone> = {
  recording: "blue",
  audio_uploaded: "blue",
  transcribing: "blue",
  generating_note: "blue",
  transcription_failed: "red",
  note_failed: "red",
  draft: "amber",
  final: "green",
  abandoned: "slate",
};

const STATUS_LABEL: Record<SessionStatus, string> = {
  recording: "Recording",
  audio_uploaded: "Uploaded",
  transcribing: "Transcribing",
  generating_note: "Generating note",
  transcription_failed: "Transcription failed",
  note_failed: "Note failed",
  draft: "Draft",
  final: "Final",
  abandoned: "Abandoned",
};

export function StatusBadge({ status }: { status: SessionStatus }) {
  return <Badge tone={STATUS_TONE[status]}>{STATUS_LABEL[status]}</Badge>;
}
