// backend/src/routes/index.ts
// Central router — registers all domain routers under /api

import { Router } from "express";
import authRoutes from "./auth.routes";
import healthRoutes from "./health.routes";
import userRoutes from "./user.routes";
import batchRoutes, { myBatchRouter } from "./batch.routes";
import contentRoutes from "./content.routes";
import notificationRoutes from "./notification.routes";

const router = Router();

router.use("/health", healthRoutes);
router.use("/auth", authRoutes);
router.use("/users", userRoutes);
router.use("/batches", batchRoutes);
router.use("/my", myBatchRouter);
router.use("/content", contentRoutes);
router.use("/notifications", notificationRoutes);

// Domain routes — added as features are implemented:
// router.use("/quizzes", quizRoutes);
// router.use("/sessions", sessionRoutes);

export default router;
