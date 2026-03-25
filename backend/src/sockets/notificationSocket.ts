// backend/src/sockets/notificationSocket.ts
// Socket.io event handlers for real-time notifications (F10).
// Called once at server startup with the io instance.

import { Server as SocketIOServer } from "socket.io";

export const setupNotificationSocket = (io: SocketIOServer): void => {
  io.on("connection", (socket) => {
    const userId = socket.handshake.auth?.userId as string | undefined;

    if (userId) {
      // Join a room named after the user ID so we can emit
      // notifications to specific users
      void socket.join(`user:${userId}`);
      console.log(`[Socket] User ${userId} connected (socket ${socket.id})`);
    }

    socket.on("disconnect", () => {
      console.log(`[Socket] Socket ${socket.id} disconnected`);
    });
  });

  console.log("[Socket] Notification socket initialized");
};
