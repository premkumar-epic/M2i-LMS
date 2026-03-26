// backend/src/lib/logger.ts
// Shared winston logger instance used across the application.

import winston from "winston";

const { combine, timestamp, errors, colorize, printf, json } = winston.format;

const devFormat = combine(
  timestamp(),
  errors({ stack: true }),
  colorize({ all: true }),
  printf(({ timestamp, level, message, stack, ...meta }) => {
    const base = `${timestamp} ${level}: ${message}`;
    // Surface stack traces and any extra metadata in non-production so
    // queue error listeners (and other callers) are fully visible.
    const stackLine = stack ? `\n${stack}` : "";
    const metaLine =
      Object.keys(meta).length > 0 ? `\n${JSON.stringify(meta, null, 2)}` : "";
    return `${base}${stackLine}${metaLine}`;
  })
);

const prodFormat = combine(
  timestamp(),
  errors({ stack: true }),
  json()
);

export const logger = winston.createLogger({
  level: process.env.LOG_LEVEL ?? "info",
  format: process.env.NODE_ENV === "production" ? prodFormat : devFormat,
  transports: [new winston.transports.Console()],
});
