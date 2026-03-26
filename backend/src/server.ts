// backend/src/server.ts
// Entry point for the M2i_LMS backend server.
// Initializes HTTP server, Socket.io, cron scheduler,
// and Bull queue processors.

import { createServer } from "http";
import { Server as SocketIOServer } from "socket.io";
import { app } from "./app";
import { setupNotificationSocket } from
  "./sockets/notificationSocket";
import { startScheduler } from "./scheduler";
import { logger } from "./lib/logger";

// IMPORTANT: Import processors to register all Bull workers
// This must happen before any jobs are added to the queues
import "./queues/processors";
import { closeAllQueues } from "./queues/queues";

const PORT = process.env.PORT ?? 3001;

const httpServer = createServer(app);

// =========================================================
// SOCKET.IO
// =========================================================
export const io = new SocketIOServer(httpServer, {
  cors: {
    origin: process.env.CORS_ORIGIN ?? "http://localhost:3000",
    credentials: true,
  },
  transports: ["websocket", "polling"],
  pingTimeout: 60000,
  pingInterval: 25000,
  connectionStateRecovery: {
    maxDisconnectionDuration: 2 * 60 * 1000,
    skipMiddlewares: false, // Ensure io.use() auth middleware runs on reconnection too
  },
});

setupNotificationSocket(io);

// =========================================================
// CRON SCHEDULER
// =========================================================
startScheduler();

// =========================================================
// START SERVER
// =========================================================
httpServer.listen(PORT, () => {
  logger.info(`[Server] M2i_LMS API running on port ${PORT}`);
  logger.info(`[Server] Environment: ${process.env.NODE_ENV}`);
  logger.info(`[Server] CORS origin: ${process.env.CORS_ORIGIN}`);
});

// ─── Graceful shutdown ────────────────────────────────────────────────────────
const SHUTDOWN_TIMEOUT_MS = 10_000;
let isShuttingDown = false;

const shutdown = async (signal: string) => {
  if (isShuttingDown) return;
  isShuttingDown = true;
  logger.info(`[Server] ${signal} received — shutting down gracefully`);

  // Force-exit after timeout so the process never hangs indefinitely
  const forceExit = setTimeout(() => {
    logger.error("[Server] Shutdown timed out — forcing exit");
    process.exit(1);
  }, SHUTDOWN_TIMEOUT_MS);
  forceExit.unref(); // Don't keep the event loop alive just for this timer

  // 1. io.close() disconnects all WebSocket clients AND closes httpServer
  //    internally — must happen first so in-flight request handlers can
  //    still enqueue jobs before Redis connections are torn down.
  //    Do NOT call httpServer.close() separately — io.close() already
  //    does it and a second call would mean the callback never fires.
  await new Promise<void>((resolve) => io.close(() => resolve()));
  logger.info("[Server] Socket.io and HTTP server closed");

  // 2. Drain and close all Bull queues (Redis connections)
  await closeAllQueues();

  logger.info("[Server] Shutdown complete — exiting");
  clearTimeout(forceExit);
  process.exit(0);
};

process.on("SIGTERM", () => { void shutdown("SIGTERM"); });
process.on("SIGINT",  () => { void shutdown("SIGINT"); });

export default httpServer;