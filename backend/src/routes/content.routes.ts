// backend/src/routes/content.routes.ts
// Content management endpoints (F03).
// IMPORTANT: static routes (e.g. /reorder) must come before dynamic /:contentId routes.

import { Router } from "express";
import { authenticate } from "../middleware/authenticate";
import { authorize } from "../middleware/authorize";
import { validate } from "../middleware/validate";
import * as contentController from "../controllers/content.controller";
import * as v from "../validators/content.validators";

const router = Router();
const ADMIN_ROLES = ["ADMIN", "SUPER_ADMIN"];
const MENTOR_ROLES = ["ADMIN", "SUPER_ADMIN", "MENTOR"];
const ALL_ROLES = ["ADMIN", "SUPER_ADMIN", "MENTOR", "STUDENT"];

// ─── Upload URL ────────────────────────────────────────────────────────────────
// POST /api/content/upload-url
router.post(
  "/upload-url",
  authenticate,
  authorize(MENTOR_ROLES),
  validate(v.generateUploadUrlSchema),
  contentController.generateUploadUrl
);

// ─── Reorder (static — must be before /:contentId) ────────────────────────────
// PUT /api/content/reorder
router.put(
  "/reorder",
  authenticate,
  authorize(MENTOR_ROLES),
  validate(v.reorderContentSchema),
  contentController.reorderContent
);

// ─── Create ────────────────────────────────────────────────────────────────────
// POST /api/content
router.post(
  "/",
  authenticate,
  authorize(MENTOR_ROLES),
  validate(v.createContentSchema),
  contentController.createContent
);

// ─── Get single ────────────────────────────────────────────────────────────────
// GET /api/content/:contentId
router.get("/:contentId", authenticate, authorize(ALL_ROLES), contentController.getContent);

// ─── Update ────────────────────────────────────────────────────────────────────
// PUT /api/content/:contentId
router.put(
  "/:contentId",
  authenticate,
  authorize(MENTOR_ROLES),
  validate(v.updateContentSchema),
  contentController.updateContent
);

// ─── Publish / unpublish ───────────────────────────────────────────────────────
// POST /api/content/:contentId/publish
router.post(
  "/:contentId/publish",
  authenticate,
  authorize(MENTOR_ROLES),
  contentController.publishContent
);

// POST /api/content/:contentId/unpublish
router.post(
  "/:contentId/unpublish",
  authenticate,
  authorize(MENTOR_ROLES),
  contentController.unpublishContent
);

// ─── Soft delete ───────────────────────────────────────────────────────────────
// DELETE /api/content/:contentId
router.delete("/:contentId", authenticate, authorize(ADMIN_ROLES), contentController.deleteContent);

// ─── Transcript ────────────────────────────────────────────────────────────────
// GET /api/content/:contentId/transcript
router.get("/:contentId/transcript", authenticate, authorize(ALL_ROLES), contentController.getTranscript);

// PUT /api/content/:contentId/transcript
router.put(
  "/:contentId/transcript",
  authenticate,
  authorize(MENTOR_ROLES),
  validate(v.updateTranscriptSchema),
  contentController.updateTranscript
);

// ─── Watch progress ────────────────────────────────────────────────────────────
// GET /api/content/:contentId/progress
router.get(
  "/:contentId/progress",
  authenticate,
  authorize(["STUDENT"]),
  contentController.getWatchProgress
);

// PATCH /api/content/:contentId/progress
router.patch(
  "/:contentId/progress",
  authenticate,
  authorize(["STUDENT"]),
  validate(v.watchProgressSchema),
  contentController.updateWatchProgress
);

// ─── Supplementary files ───────────────────────────────────────────────────────
// POST /api/content/:contentId/files/upload-url
router.post(
  "/:contentId/files/upload-url",
  authenticate,
  authorize(MENTOR_ROLES),
  validate(v.generateFileUploadUrlSchema),
  contentController.generateFileUploadUrl
);

// POST /api/content/:contentId/files
router.post(
  "/:contentId/files",
  authenticate,
  authorize(MENTOR_ROLES),
  validate(v.createSupplementaryFileSchema),
  contentController.createSupplementaryFile
);

// DELETE /api/content/:contentId/files/:fileId
router.delete(
  "/:contentId/files/:fileId",
  authenticate,
  authorize(ADMIN_ROLES),
  contentController.deleteSupplementaryFile
);

export default router;
