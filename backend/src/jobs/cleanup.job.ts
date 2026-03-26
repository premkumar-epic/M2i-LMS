// backend/src/jobs/cleanup.job.ts
// Cleanup background jobs for the system.

import { prisma } from "../lib/prisma";

/**
 * Remove old login attempts to prevent the table from growing indefinitely.
 * Keeps only the last 7 days of logs.
 */
export const runLoginAttemptCleanup = async (): Promise<void> => {
  console.log("[Job] Starting LoginAttempt cleanup...");
  try {
    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

    const deleted = await prisma.loginAttempt.deleteMany({
      where: {
        attemptedAt: { lt: sevenDaysAgo },
      },
    });

    console.log(`[Job] Deleted ${deleted.count} old login attempts.`);
  } catch (error) {
    console.error("[Job] LoginAttempt cleanup failed:", error);
  }
};
