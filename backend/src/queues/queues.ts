// backend/src/queues/queues.ts
// Bull Queue instances shared across the application.
// Import from here — never instantiate Queue elsewhere.

import Bull from "bull";
import { logger } from "../lib/logger";

const rawPort = parseInt(process.env.REDIS_PORT ?? "6379", 10);
const redisPort = isNaN(rawPort) ? 6379 : rawPort;

if (isNaN(rawPort)) {
  logger.warn(
    `[Queues] REDIS_PORT "${process.env.REDIS_PORT}" is not a valid number — falling back to 6379`
  );
}

const redisConfig = {
  host: process.env.REDIS_HOST ?? "localhost",
  port: redisPort,
  // Use || so an empty string env var is treated as "no password"
  password: process.env.REDIS_PASSWORD || undefined,
};

// ─── Queue factory ────────────────────────────────────────────────────────────
// Attaches an error listener immediately so Redis connection failures on
// startup produce a structured log entry rather than an unhandled exception.

const createQueue = (name: string): Bull.Queue => {
  const queue = new Bull(name, { redis: redisConfig });
  queue.on("error", (err: Error) => {
    logger.error(`[Queue:${name}] Redis error: ${err.message}`, { err });
  });
  return queue;
};

// Content processing queue — drives the AI pipeline (F03/F04)
// Jobs: EXTRACT_AUDIO, TRANSCRIBE, GENERATE_QUIZ
export const contentQueue = createQueue("content");

// Metrics calculation queue — drives the metrics engine (F09)
// Jobs: CALCULATE_STUDENT_METRICS, CALCULATE_BATCH_METRICS
export const metricsQueue = createQueue("metrics");

// Live session queue — drives session attendance tracking (F06)
// Jobs: SESSION_STARTED, SESSION_ENDED, RECORD_ATTENDANCE
export const sessionQueue = createQueue("session");

// Notification queue — drives real-time and async notifications (F10)
// Jobs: SEND_NOTIFICATION, SEND_BATCH_NOTIFICATION
export const notificationQueue = createQueue("notification");

logger.info("[Queues] Bull queues initialized: content, metrics, session, notification");

// ─── Graceful shutdown ────────────────────────────────────────────────────────
// Call this on SIGTERM/SIGINT to close all 12 Redis connections cleanly
// before the process exits. Registered in server.ts.

const allQueues = [contentQueue, metricsQueue, sessionQueue, notificationQueue];

export const closeAllQueues = async (): Promise<void> => {
  // allSettled so a single failed close doesn't leave other queues open
  const results = await Promise.allSettled(allQueues.map((q) => q.close()));
  results.forEach((r, i) => {
    if (r.status === "rejected") {
      logger.error(`[Queues] Failed to close queue "${allQueues[i].name}": ${(r.reason as Error).message}`);
    }
  });
  logger.info("[Queues] All Bull queues closed");
};
