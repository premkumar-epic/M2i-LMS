// backend/src/routes/upload.routes.ts
// Local file upload route — dev-only replacement for S3 pre-signed URLs.
// In production, files go directly to S3 via pre-signed URLs.
// Mounted under /api/uploads only when NODE_ENV !== "production".

import path from "path";
import fs from "fs";
import { Router, Request, Response } from "express";
import multer from "multer";
import { authenticate } from "../middleware/authenticate";
import { logger } from "../lib/logger";

const UPLOAD_DIR = process.env.LOCAL_UPLOAD_DIR ?? "/tmp/m2i_uploads";
fs.mkdirSync(UPLOAD_DIR, { recursive: true });

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, UPLOAD_DIR),
  filename: (_req, file, cb) => {
    // Preserve extension, use timestamp + random suffix to avoid collisions
    const ext = path.extname(file.originalname);
    const base = path.basename(file.originalname, ext).replace(/[^a-zA-Z0-9_-]/g, "_");
    cb(null, `${Date.now()}_${base}${ext}`);
  },
});

// 500 MB limit covers full lecture videos
const upload = multer({ storage, limits: { fileSize: 500 * 1024 * 1024 } });

const router = Router();
const API_BASE = process.env.API_BASE_URL ?? "http://localhost:3001";

// POST /api/uploads
// Multipart upload — returns a storage_url and cdn_url the frontend can
// pass directly to POST /api/content or POST /api/content/:id/files
router.post(
  "/",
  authenticate,
  upload.single("file"),
  (req: Request, res: Response) => {
    if (!req.file) {
      res.status(400).json({ code: "NO_FILE", message: "No file was uploaded" });
      return;
    }
    const storageUrl = `${API_BASE}/api/uploads/${req.file.filename}`;
    logger.info(`[Upload] Saved ${req.file.filename} (${req.file.size} bytes)`);
    res.status(200).json({
      filename: req.file.filename,
      original_name: req.file.originalname,
      mime_type: req.file.mimetype,
      file_size_bytes: req.file.size,
      storage_url: storageUrl,
      cdn_url: storageUrl, // same in dev
    });
  }
);

export default router;
