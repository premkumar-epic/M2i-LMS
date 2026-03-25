// backend/src/middleware/errorHandler.ts
// Global error handler middleware.
// Must be registered LAST — after all routes.

import { Request, Response, NextFunction } from "express";

type AppError = {
  code?: string;
  message?: string;
  statusCode?: number;
  stack?: string;
};

export const errorHandler = (
  err: AppError,
  _req: Request,
  res: Response,
  _next: NextFunction
): void => {
  const statusCode = err.statusCode ?? 500;
  const code = err.code ?? "INTERNAL_SERVER_ERROR";
  const message = err.message ?? "An unexpected error occurred";

  if (process.env.NODE_ENV === "development") {
    console.error("[Error]", {
      code,
      message,
      statusCode,
      stack: err.stack,
    });
  } else if (statusCode >= 500) {
    console.error("[Error]", { code, message, statusCode });
  }

  res.status(statusCode).json({
    success: false,
    error: { code, message },
  });
};
