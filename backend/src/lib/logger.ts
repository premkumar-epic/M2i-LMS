// backend/src/lib/logger.ts
// Shared winston logger instance used across the application.

import winston from "winston";

const { combine, timestamp, errors, colorize, printf, json } = winston.format;

const devFormat = combine(
  timestamp(),
  errors({ stack: true }),
  colorize({ all: true }),
  printf(({ timestamp, level, message }) => `${timestamp} ${level}: ${message}`)
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
