// backend/src/controllers/notification.controller.ts
// HTTP layer for notification endpoints — thin wrappers around notification.service.ts.

import { Request, Response, NextFunction } from "express";
import * as notificationService from "../services/notification.service";

// GET /api/notifications
export const listNotifications = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const limit = Math.min(Number(req.query.limit) || 20, 100);
    const offset = Number(req.query.offset) || 0;
    const result = await notificationService.listNotifications(req.user!.user_id, limit, offset);
    res.status(200).json(result);
  } catch (err) { next(err); }
};

// GET /api/notifications/unread-count
export const getUnreadCount = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const count = await notificationService.getUnreadCount(req.user!.user_id);
    res.status(200).json({ unread_count: count });
  } catch (err) { next(err); }
};

// POST /api/notifications/:id/read
export const markRead = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const notification = await notificationService.markRead(req.params.id as string, req.user!.user_id);
    res.status(200).json(notification);
  } catch (err) { next(err); }
};

// POST /api/notifications/mark-all-read
export const markAllRead = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const count = await notificationService.markAllRead(req.user!.user_id);
    res.status(200).json({ marked_read: count });
  } catch (err) { next(err); }
};

// DELETE /api/notifications/:id
export const deleteNotification = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    await notificationService.deleteNotification(req.params.id as string, req.user!.user_id);
    res.status(204).send();
  } catch (err) { next(err); }
};

// DELETE /api/notifications/clear-all
export const clearAllNotifications = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const count = await notificationService.clearAllNotifications(req.user!.user_id);
    res.status(200).json({ deleted: count });
  } catch (err) { next(err); }
};
