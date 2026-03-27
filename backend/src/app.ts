// backend/src/app.ts
// Express application setup.
// Configures global middleware, registers routes, and attaches the error handler.

import "dotenv/config";
import express from "express";
import cors from "cors";
import helmet from "helmet";
import morgan from "morgan";
import cookieParser from "cookie-parser";

import path from "path";
import swaggerUi from "swagger-ui-express";
import { swaggerSpec } from "./swagger";
import apiRoutes from "./routes/index";
import { errorHandler } from "./middleware/errorHandler";

export const app = express();

// =========================================================
// SECURITY MIDDLEWARE
// =========================================================

app.use(
  helmet({
    crossOriginResourcePolicy: { policy: "same-site" },
  })
);

app.use(
  cors({
    origin: process.env.CORS_ORIGIN ?? "http://localhost:3000",
    credentials: true, // Required for HttpOnly cookie transport
    methods: ["GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
  })
);

// =========================================================
// PARSING MIDDLEWARE
// =========================================================

app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true, limit: "10mb" }));
app.use(cookieParser());

// =========================================================
// LOGGING
// =========================================================

if (process.env.NODE_ENV !== "test") {
  app.use(morgan(process.env.NODE_ENV === "production" ? "combined" : "dev"));
}

// =========================================================
// SWAGGER UI — API DOCUMENTATION & TESTER
// Access at: http://localhost:3001/api-docs
// =========================================================

app.use(
  "/api-docs",
  swaggerUi.serve,
  swaggerUi.setup(swaggerSpec, {
    customSiteTitle: "M2i LMS API Docs",
    swaggerOptions: {
      withCredentials: true, // sends cookies automatically when testing
    },
  })
);

// =========================================================
// ROUTES
// =========================================================

app.use("/api", apiRoutes);

// ─── Dev-only: local file upload + static serving ─────────────────────────────
// In production, uploads go directly to S3 via pre-signed URLs.
// Mount BEFORE the catch-all so /api/uploads/* is reachable.
if (process.env.NODE_ENV !== "production") {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const uploadRoutes = require("./routes/upload.routes").default as import("express").Router;
  const UPLOAD_DIR = process.env.LOCAL_UPLOAD_DIR ?? "/tmp/m2i_uploads";
  app.use("/api/uploads", uploadRoutes);
  app.use("/api/uploads", express.static(path.resolve(UPLOAD_DIR)));
}

// Catch-all for unknown routes
app.use((_req, _res, next) => {
  next({
    code: "NOT_FOUND",
    message: "The requested endpoint does not exist",
    statusCode: 404,
  });
});

// =========================================================
// GLOBAL ERROR HANDLER
// Must be last — after all routes
// =========================================================

app.use(errorHandler);
