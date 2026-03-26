// backend/src/lib/logger.ts
// Shared winston logger instance used across the application.

import winston from "winston";

export const logger = winston.createLogger({
  level: process.env.LOG_LEVEL ?? "info",
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.errors({ stack: true }),
    process.env.NODE_ENV === "production"
      ? winston.format.json()
      : winston.format.colorize({ all: true }),
    process.env.NODE_ENV === "production"
      ? winston.format.printf(({ timestamp, level, message, ...meta }) =>
          JSON.stringify({ timestamp, level, message, ...meta })
        )
      : winston.format.printf(
          ({ timestamp, level, message }) => `${timestamp} ${level}: ${message}`
        )
  ),
  transports: [new winston.transports.Console()],
});
