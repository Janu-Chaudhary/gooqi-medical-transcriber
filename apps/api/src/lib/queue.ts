/**
 * BullMQ producers backed by an ioredis connection (REDIS_URL).
 *
 * The API only PRODUCES jobs; a separate worker app consumes them.
 *
 * Resilience: the Redis connection is lazy and tolerant of an unavailable
 * Redis at boot (the API must still come up for non-queue routes). Enqueue
 * failures are surfaced to the caller (e.g. finalise-audio) rather than
 * crashing the process.
 */
import { Queue } from "bullmq";
import IORedis, { type Redis } from "ioredis";

const REDIS_URL = process.env.REDIS_URL ?? "redis://127.0.0.1:6379";

let connection: Redis | null = null;
let transcribeQueue: Queue | null = null;
let generateNoteQueue: Queue | null = null;

function getConnection(): Redis {
  if (!connection) {
    connection = new IORedis(REDIS_URL, {
      // BullMQ requirement for blocking commands.
      maxRetriesPerRequest: null,
      // Lazy: don't connect until first command, so the API can boot if Redis is down.
      lazyConnect: true,
      enableOfflineQueue: true,
    });
    connection.on("error", (err) => {
      console.warn("[queue] Redis connection error:", err.message);
    });
  }
  return connection;
}

/** Queue consumed by the transcription worker. */
export function getTranscribeQueue(): Queue {
  if (!transcribeQueue) {
    transcribeQueue = new Queue("transcribe-audio", {
      connection: getConnection(),
    });
  }
  return transcribeQueue;
}

/** Queue consumed by the note/summary worker. */
export function getGenerateNoteQueue(): Queue {
  if (!generateNoteQueue) {
    generateNoteQueue = new Queue("generate-note", {
      connection: getConnection(),
    });
  }
  return generateNoteQueue;
}

/**
 * Enqueue a transcription job for a finalised session.
 * Throws if Redis is unreachable — callers decide how to surface that.
 */
export async function enqueueTranscription(sessionId: string): Promise<void> {
  await getTranscribeQueue().add("transcribe-audio", { sessionId });
}

/**
 * Enqueue a SOAP/prescription note-generation job (used by the note_failed
 * retry path; the worker normally enqueues this itself after transcription).
 * Throws if Redis is unreachable — callers decide how to surface that.
 */
export async function enqueueNoteGeneration(
  sessionId: string,
  transcriptId: string,
): Promise<void> {
  await getGenerateNoteQueue().add("generate-note", { sessionId, transcriptId });
}

/**
 * Enqueue a visit-summary generation job after sign-off.
 * Throws if Redis is unreachable — callers decide how to surface that.
 */
export async function enqueueSummary(sessionId: string): Promise<void> {
  await getGenerateNoteQueue().add("generate-summary", {
    sessionId,
    kind: "summary",
  });
}
