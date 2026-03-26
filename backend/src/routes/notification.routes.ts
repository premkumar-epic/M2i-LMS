// backend/src/routes/notification.routes.ts
// Notification endpoints — all require authentication.
// Static routes (/unread-count, /mark-all-read, /clear-all) must be
// registered BEFORE parameterized routes (/:id) to avoid shadowing.

import { Router } from "express";
import { authenticate } from "../middleware/authenticate";
import * as notificationController from "../controllers/notification.controller";

const router = Router();

// All notification routes require an authenticated user
router.use(authenticate);

// Static routes first — must come before /:id
router.get("/unread-count", notificationController.getUnreadCount);
router.post("/mark-all-read", notificationController.markAllRead);
router.delete("/clear-all", notificationController.clearAllNotifications);

// Collection
router.get("/", notificationController.listNotifications);

// Parameterized routes last
router.post("/:id/read", notificationController.markRead);
router.delete("/:id", notificationController.deleteNotification);

export default router;
