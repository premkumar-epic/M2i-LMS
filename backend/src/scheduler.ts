// backend/src/scheduler.ts
// node-cron scheduler entry point.
// Import and register all cron jobs here.

import cron from "node-cron";
import { logger } from "./lib/logger";

export const startScheduler = (): void => {
  logger.info("[Scheduler] Starting cron scheduler...");

  // Nightly cleanup of old login attempts — runs at 3:00 AM UTC
  cron.schedule("0 3 * * *", async () => {
    const { runLoginAttemptCleanup } = await import("./jobs/cleanup.job");
    await runLoginAttemptCleanup();
  });

  // Batch status transitions (DRAFT → ACTIVE, ACTIVE → COMPLETED) — runs every hour
  cron.schedule("0 * * * *", async () => {
    const { runBatchStatusTransition } = await import("./jobs/batchStatusTransition.job");
    await runBatchStatusTransition();
  });

  // Notification cleanup (read > 30 days, unread > 90 days) — runs at 4:00 AM UTC
  cron.schedule("0 4 * * *", async () => {
    const { runNotificationCleanup } = await import("./jobs/notificationCleanup.job");
    await runNotificationCleanup();
  });

  // Nightly metrics calculation — runs at 2:00 AM UTC (Week 6)
  // cron.schedule("0 2 * * *", async () => {
  //   const { runNightlyMetricsJob } = await import("./jobs/nightlyMetrics.job");
  //   await runNightlyMetricsJob();
  // });

  // Alert detection — runs at 6:00 AM UTC (Week 6)
  // cron.schedule("0 6 * * *", async () => {
  //   const { runAlertJob } = await import("./jobs/alertDetection.job");
  //   await runAlertJob();
  // });

  logger.info("[Scheduler] Cron scheduler initialized");
};
