// backend/src/services/notification.service.ts
// Notification business logic for F10.
// Call initNotificationService(io) from server.ts after creating the Socket.io instance.

import { Server as SocketIOServer } from "socket.io";
import { prisma } from "../lib/prisma";
import { logger } from "../lib/logger";

let _io: SocketIOServer | null = null;

/**
 * Wire the Socket.io instance into the notification service.
 * Must be called once in server.ts before any requests are handled.
 */
export const initNotificationService = (io: SocketIOServer): void => {
  _io = io;
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

const toNotification = (n: {
  id: string;
  userId: string;
  type: string;
  title: string;
  message: string;
  metadata: unknown;
  actionUrl: string | null;
  isRead: boolean;
  readAt: Date | null;
  createdAt: Date;
}) => ({
  notification_id: n.id,
  user_id: n.userId,
  type: n.type,
  title: n.title,
  message: n.message,
  metadata: n.metadata,
  action_url: n.actionUrl,
  is_read: n.isRead,
  read_at: n.readAt,
  created_at: n.createdAt,
});

// ─── Send ─────────────────────────────────────────────────────────────────────

/**
 * Create a notification record and emit it in real-time to the target user.
 */
export const send = async (
  userId: string,
  type: string,
  title: string,
  message: string,
  metadata: Record<string, unknown> = {},
  actionUrl?: string
) => {
  const notification = await prisma.notification.create({
    data: { userId, type, title, message, metadata: metadata as object, actionUrl },
  });

  const payload = toNotification(notification);
  _io?.to(`user:${userId}`).emit("notification:new", payload);

  logger.info(`[Notification] Sent "${type}" to user ${userId}`);
  return payload;
};

/**
 * Send the same notification to every actively enrolled student in a batch.
 */
export const sendToBatch = async (
  batchId: string,
  type: string,
  title: string,
  message: string,
  metadata: Record<string, unknown> = {},
  actionUrl?: string
): Promise<number> => {
  const enrollments = await prisma.enrollment.findMany({
    where: { batchId, status: "ACTIVE" },
    select: { studentId: true },
  });

  if (enrollments.length === 0) return 0;

  const now = new Date();
  await prisma.notification.createMany({
    data: enrollments.map((e) => ({
      userId: e.studentId,
      type,
      title,
      message,
      metadata: metadata as object,
      actionUrl,
      isRead: false,
      createdAt: now,
    })),
  });

  // Emit to each enrolled student's Socket.io room
  for (const { studentId } of enrollments) {
    _io?.to(`user:${studentId}`).emit("notification:new", {
      type,
      title,
      message,
      metadata,
      action_url: actionUrl ?? null,
      is_read: false,
      created_at: now,
    });
  }

  logger.info(`[Notification] Sent "${type}" to ${enrollments.length} students in batch ${batchId}`);
  return enrollments.length;
};

// ─── List ─────────────────────────────────────────────────────────────────────

export const listNotifications = async (
  userId: string,
  limit = 20,
  offset = 0
) => {
  const [notifications, total] = await prisma.$transaction([
    prisma.notification.findMany({
      where: { userId },
      orderBy: { createdAt: "desc" },
      take: limit,
      skip: offset,
    }),
    prisma.notification.count({ where: { userId } }),
  ]);

  return {
    notifications: notifications.map(toNotification),
    total,
    limit,
    offset,
  };
};

export const getUnreadCount = async (userId: string): Promise<number> =>
  prisma.notification.count({ where: { userId, isRead: false } });

// ─── Read / delete ────────────────────────────────────────────────────────────

export const markRead = async (notificationId: string, userId: string) => {
  const notification = await prisma.notification.findUnique({
    where: { id: notificationId },
  });

  if (!notification || notification.userId !== userId) {
    throw { code: "NOT_FOUND", message: "Notification not found", statusCode: 404 };
  }

  if (notification.isRead) return toNotification(notification);

  const updated = await prisma.notification.update({
    where: { id: notificationId },
    data: { isRead: true, readAt: new Date() },
  });
  return toNotification(updated);
};

export const markAllRead = async (userId: string): Promise<number> => {
  const { count } = await prisma.notification.updateMany({
    where: { userId, isRead: false },
    data: { isRead: true, readAt: new Date() },
  });
  return count;
};

export const deleteNotification = async (notificationId: string, userId: string): Promise<void> => {
  const notification = await prisma.notification.findUnique({
    where: { id: notificationId },
  });

  if (!notification || notification.userId !== userId) {
    throw { code: "NOT_FOUND", message: "Notification not found", statusCode: 404 };
  }

  await prisma.notification.delete({ where: { id: notificationId } });
};

export const clearAllNotifications = async (userId: string): Promise<number> => {
  const { count } = await prisma.notification.deleteMany({ where: { userId } });
  return count;
};
