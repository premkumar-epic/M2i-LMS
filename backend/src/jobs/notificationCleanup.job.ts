// backend/src/jobs/notificationCleanup.job.ts
// Delete stale notifications to prevent unbounded table growth.
// Runs nightly at 4:00 AM UTC via the cron scheduler.

import { prisma } from "../lib/prisma";
import { logger } from "../lib/logger";

const DAYS_MS = (days: number) => days * 24 * 60 * 60 * 1000;

export const runNotificationCleanup = async (): Promise<void> => {
  const now = Date.now();
  const readCutoff = new Date(now - DAYS_MS(30));   // read notifications older than 30 days
  const unreadCutoff = new Date(now - DAYS_MS(90)); // unread notifications older than 90 days

  try {
    const [readResult, unreadResult] = await Promise.allSettled([
      prisma.notification.deleteMany({
        where: { isRead: true, createdAt: { lt: readCutoff } },
      }),
      prisma.notification.deleteMany({
        where: { isRead: false, createdAt: { lt: unreadCutoff } },
      }),
    ]);

    const readCount = readResult.status === "fulfilled" ? readResult.value.count : 0;
    const unreadCount = unreadResult.status === "fulfilled" ? unreadResult.value.count : 0;

    if (readResult.status === "rejected") {
      logger.error("[NotificationCleanup] Failed to delete read notifications", { err: readResult.reason });
    }
    if (unreadResult.status === "rejected") {
      logger.error("[NotificationCleanup] Failed to delete unread notifications", { err: unreadResult.reason });
    }

    logger.info(
      `[NotificationCleanup] Deleted ${readCount} read + ${unreadCount} unread stale notifications`
    );
  } catch (err) {
    logger.error("[NotificationCleanup] Job failed", { err });
  }
};
