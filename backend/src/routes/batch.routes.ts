// backend/src/routes/batch.routes.ts
// All /api/batches and /api/my/batch routes.

import { Router } from "express";
import { authenticate } from "../middleware/authenticate";
import { authorize } from "../middleware/authorize";
import { validate } from "../middleware/validate";
import {
  createBatchSchema,
  updateBatchSchema,
  listBatchesQuerySchema,
  archiveBatchSchema,
  enrollStudentsSchema,
  assignMentorsSchema,
  listStudentsQuerySchema,
} from "../validators/batch.validators";
import {
  createBatchController,
  listBatchesController,
  getBatchController,
  updateBatchController,
  archiveBatchController,
  enrollStudentsController,
  withdrawStudentController,
  listBatchStudentsController,
  assignMentorsController,
  getMyBatchesController,
  getMyBatchController,
} from "../controllers/batch.controller";
import { listBatchContent } from "../controllers/content.controller";

const router = Router();
const adminOnly = [authenticate, authorize(["ADMIN", "SUPER_ADMIN"])];
const adminOrMentor = [authenticate, authorize(["ADMIN", "SUPER_ADMIN", "MENTOR"])];
const studentOnly = [authenticate, authorize(["STUDENT"])];

// Admin CRUD
router.post("/", ...adminOnly, validate(createBatchSchema), createBatchController);
router.get("/", ...adminOnly, validate(listBatchesQuerySchema, "query"), listBatchesController);
router.get("/:batchId", ...adminOrMentor, getBatchController);
router.put("/:batchId", ...adminOnly, validate(updateBatchSchema), updateBatchController);
router.post("/:batchId/archive", ...adminOnly, validate(archiveBatchSchema), archiveBatchController);

// Enrollment management
router.post("/:batchId/enroll", ...adminOnly, validate(enrollStudentsSchema), enrollStudentsController);
router.delete("/:batchId/enroll/:studentId", ...adminOnly, withdrawStudentController);
router.get("/:batchId/students", ...adminOrMentor, validate(listStudentsQuerySchema, "query"), listBatchStudentsController);

// Mentor assignment
router.post("/:batchId/mentors", ...adminOnly, validate(assignMentorsSchema), assignMentorsController);

// Content listing for a batch — handled by content controller
// GET /api/batches/:batchId/content — admin, mentor, student (student sees published only)
const allRoles = [authenticate, authorize(["ADMIN", "SUPER_ADMIN", "MENTOR", "STUDENT"])];
router.get("/:batchId/content", ...allRoles, listBatchContent);

export default router;

// ─── Self-service routes (/api/my/*) ─────────────────────────────────────────
// Exported separately so routes/index.ts can mount it under /my
export const myBatchRouter = Router();
const mentorOnly = [authenticate, authorize(["MENTOR"])];
myBatchRouter.get("/batches", ...mentorOnly, getMyBatchesController);
myBatchRouter.get("/batch", ...studentOnly, getMyBatchController);
