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

// IMPORTANT: Import processors to register all Bull workers
// This must happen before any jobs are added to the queues
import "./queues/processors";

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
  console.log(`[Server] M2i_LMS API running on port ${PORT}`);
  console.log(
    `[Server] Environment: ${process.env.NODE_ENV}`
  );
  console.log(
    `[Server] CORS origin: ${process.env.CORS_ORIGIN}`
  );
});

export default httpServer;