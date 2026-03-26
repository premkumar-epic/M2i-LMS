// backend/src/jobs/batchStatusTransition.job.ts
// Promote batches between statuses based on their start/end dates.
// Runs hourly via the cron scheduler.

import { prisma } from "../lib/prisma";
import { logger } from "../lib/logger";

export const runBatchStatusTransition = async (): Promise<void> => {
  const now = new Date();

  try {
    const [activatedResult, completedResult] = await prisma.$transaction([
      // DRAFT → ACTIVE when startDate has passed
      prisma.batch.updateMany({
        where: { status: "DRAFT", startDate: { lte: now } },
        data: { status: "ACTIVE" },
      }),
      // ACTIVE → COMPLETED when endDate has passed
      prisma.batch.updateMany({
        where: { status: "ACTIVE", endDate: { lt: now } },
        data: { status: "COMPLETED" },
      }),
    ]);

    if (activatedResult.count > 0 || completedResult.count > 0) {
      logger.info(
        `[BatchStatusTransition] Activated: ${activatedResult.count}, Completed: ${completedResult.count}`
      );
    }
  } catch (err) {
    logger.error("[BatchStatusTransition] Job failed", { err });
  }
};
