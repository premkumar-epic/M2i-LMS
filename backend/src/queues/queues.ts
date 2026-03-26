// backend/src/queues/queues.ts
// Bull Queue instances shared across the application.
// Import from here — never instantiate Queue elsewhere.

import Bull from "bull";

const redisConfig = {
  host: process.env.REDIS_HOST ?? "localhost",
  port: parseInt(process.env.REDIS_PORT ?? "6379", 10),
  password: process.env.REDIS_PASSWORD ?? undefined,
};

// Content processing queue — drives the AI pipeline (F03/F04)
// Jobs: EXTRACT_AUDIO, TRANSCRIBE, GENERATE_QUIZ
export const contentQueue = new Bull("content", { redis: redisConfig });

// Metrics calculation queue — drives the metrics engine (F09)
// Jobs: CALCULATE_STUDENT_METRICS, CALCULATE_BATCH_METRICS
export const metricsQueue = new Bull("metrics", { redis: redisConfig });

// Live session queue — drives session attendance tracking (F06)
// Jobs: SESSION_STARTED, SESSION_ENDED, RECORD_ATTENDANCE
export const sessionQueue = new Bull("session", { redis: redisConfig });

console.log("[Queues] Bull queues initialized: content, metrics, session");
