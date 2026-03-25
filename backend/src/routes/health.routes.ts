// backend/src/routes/health.routes.ts
// Health check endpoints for load balancer / deployment checks.

import { Router, Request, Response } from "express";
import { prisma } from "../lib/prisma";

const router = Router();

// Basic liveness check
router.get("/", (_req: Request, res: Response) => {
  res.status(200).json({
    success: true,
    data: {
      status: "ok",
      timestamp: new Date().toISOString(),
      environment: process.env.NODE_ENV ?? "unknown",
    },
  });
});

// Database connectivity check
router.get("/db", async (_req: Request, res: Response) => {
  try {
    await prisma.$queryRaw`SELECT 1`;
    res.status(200).json({
      success: true,
      data: { status: "ok", database: "connected" },
    });
  } catch (err) {
    res.status(503).json({
      success: false,
      error: {
        code: "DB_UNAVAILABLE",
        message: "Database connection failed",
      },
    });
  }
});

export default router;
