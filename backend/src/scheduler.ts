// backend/src/scheduler.ts
// node-cron scheduler entry point.
// Import and register all cron jobs here.

import cron from "node-cron";

export const startScheduler = (): void => {
  console.log("[Scheduler] Starting cron scheduler...");

  // Nightly metrics calculation — runs at 2:00 AM UTC
  // cron.schedule("0 2 * * *", async () => {
  //   const { runNightlyMetricsJob } = await import("./jobs/nightlyMetrics.job");
  //   await runNightlyMetricsJob();
  // });

  // Alert detection — runs at 6:00 AM UTC
  // cron.schedule("0 6 * * *", async () => {
  //   const { runAlertJob } = await import("./jobs/alertDetection.job");
  //   await runAlertJob();
  // });

  console.log("[Scheduler] Cron scheduler initialized (jobs pending implementation)");
};
