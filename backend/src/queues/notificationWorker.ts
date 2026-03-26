// backend/src/queues/notificationWorker.ts
// Bull worker for async notification delivery jobs.
// Registered on startup via processors.ts.

import { notificationQueue } from "./queues";
import { send, sendToBatch } from "../services/notification.service";
import { logger } from "../lib/logger";

type SendNotificationJobData = {
  jobName: "SEND_NOTIFICATION";
  userId: string;
  type: string;
  title: string;
  message: string;
  metadata?: Record<string, unknown>;
  actionUrl?: string;
};

type SendBatchNotificationJobData = {
  jobName: "SEND_BATCH_NOTIFICATION";
  batchId: string;
  type: string;
  title: string;
  message: string;
  metadata?: Record<string, unknown>;
  actionUrl?: string;
};

notificationQueue.process("SEND_NOTIFICATION", async (job) => {
  const data = job.data as SendNotificationJobData;
  await send(data.userId, data.type, data.title, data.message, data.metadata, data.actionUrl);
});

notificationQueue.process("SEND_BATCH_NOTIFICATION", async (job) => {
  const data = job.data as SendBatchNotificationJobData;
  const count = await sendToBatch(
    data.batchId,
    data.type,
    data.title,
    data.message,
    data.metadata,
    data.actionUrl
  );
  logger.info(`[NotificationWorker] SEND_BATCH_NOTIFICATION delivered to ${count} users`);
});

logger.info("[Queues] Notification workers registered (SEND_NOTIFICATION, SEND_BATCH_NOTIFICATION)");
