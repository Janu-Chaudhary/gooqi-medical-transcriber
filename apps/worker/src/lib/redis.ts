/**
 * Shared ioredis connection for BullMQ.
 *
 * BullMQ requires `maxRetriesPerRequest: null` on the connection it consumes
 * with (blocking commands must not be aborted by the retry limiter).
 */
import IORedis from "ioredis";

const redisUrl = process.env.REDIS_URL ?? "redis://localhost:6379";

export const connection = new IORedis(redisUrl, {
  maxRetriesPerRequest: null,
});
