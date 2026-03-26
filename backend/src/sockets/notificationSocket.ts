// backend/src/sockets/notificationSocket.ts
// Socket.io event handlers for real-time notifications (F10).
// Called once at server startup with the io instance.

import { Server as SocketIOServer } from "socket.io";
import jwt from "jsonwebtoken";
import { logger } from "../lib/logger";

type JWTPayload = { user_id: string; role: string | null };

export const setupNotificationSocket = (io: SocketIOServer): void => {
  io.on("connection", (socket) => {
    // Verify the JWT token supplied in handshake.auth instead of trusting
    // a client-supplied userId directly — prevents session hijacking.
    const token = socket.handshake.auth?.token as string | undefined;

    if (!token) {
      socket.disconnect(true);
      return;
    }

    const secret = process.env.JWT_SECRET;
    if (!secret) {
      socket.disconnect(true);
      return;
    }

    let payload: JWTPayload;
    try {
      payload = jwt.verify(token, secret) as JWTPayload;
    } catch {
      socket.disconnect(true);
      return;
    }

    const userId = payload.user_id;
    void socket.join(`user:${userId}`);
    logger.info(`[Socket] User ${userId} connected (socket ${socket.id})`);

    socket.on("disconnect", () => {
      logger.info(`[Socket] Socket ${socket.id} disconnected`);
    });
  });

  logger.info("[Socket] Notification socket initialized");
};
