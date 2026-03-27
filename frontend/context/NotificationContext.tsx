"use client";

// frontend/context/NotificationContext.tsx
// Manages real-time notifications via Socket.io and exposes unread count + list.

import React, {
  createContext,
  useContext,
  useEffect,
  useRef,
  useState,
  useCallback,
} from "react";
import { io, Socket } from "socket.io-client";
import { useAuth } from "./AuthContext";
import type { Notification } from "../lib/notification.api";
import * as notificationApi from "../lib/notification.api";

interface NotificationContextValue {
  notifications: Notification[];
  unreadCount: number;
  isLoading: boolean;
  loadMore: () => Promise<void>;
  hasMore: boolean;
  markRead: (id: string) => Promise<void>;
  markAllRead: () => Promise<void>;
  remove: (id: string) => Promise<void>;
  clearAll: () => Promise<void>;
}

const NotificationContext = createContext<NotificationContextValue | null>(null);

export const useNotifications = () => {
  const ctx = useContext(NotificationContext);
  if (!ctx) throw new Error("useNotifications must be used within NotificationProvider");
  return ctx;
};

const PAGE_SIZE = 20;

export const NotificationProvider = ({ children }: { children: React.ReactNode }) => {
  const { user } = useAuth();
  const socketRef = useRef<Socket | null>(null);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const [offset, setOffset] = useState(0);
  const [hasMore, setHasMore] = useState(true);

  // Initial load
  const loadInitial = useCallback(async () => {
    if (!user) return;
    setIsLoading(true);
    try {
      const [list, count] = await Promise.all([
        notificationApi.listNotifications(PAGE_SIZE, 0),
        notificationApi.getUnreadCount(),
      ]);
      setNotifications(list.notifications);
      setUnreadCount(count);
      setOffset(list.notifications.length);
      setHasMore(list.notifications.length < list.total);
    } catch {
      // non-fatal
    } finally {
      setIsLoading(false);
    }
  }, [user]);

  const loadMore = useCallback(async () => {
    if (!user || isLoading || !hasMore) return;
    setIsLoading(true);
    try {
      const list = await notificationApi.listNotifications(PAGE_SIZE, offset);
      setNotifications((prev) => [...prev, ...list.notifications]);
      setOffset((prev) => prev + list.notifications.length);
      setHasMore(offset + list.notifications.length < list.total);
    } catch {
      // non-fatal
    } finally {
      setIsLoading(false);
    }
  }, [user, isLoading, hasMore, offset]);

  // Socket.io connection
  useEffect(() => {
    if (!user) {
      socketRef.current?.disconnect();
      socketRef.current = null;
      return;
    }

    const accessToken = document.cookie
      .split("; ")
      .find((row) => row.startsWith("access_token="))
      ?.split("=")[1];

    const socket = io(process.env.NEXT_PUBLIC_SOCKET_URL ?? "http://localhost:3001", {
      auth: { token: accessToken },
      withCredentials: true,
      transports: ["websocket", "polling"],
    });

    socket.on("notification:new", (notification: Notification) => {
      setNotifications((prev) => [notification, ...prev]);
      setUnreadCount((prev) => prev + 1);
    });

    socketRef.current = socket;
    void loadInitial();

    return () => {
      socket.disconnect();
      socketRef.current = null;
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.user_id]);

  const markRead = useCallback(async (id: string) => {
    const updated = await notificationApi.markRead(id);
    setNotifications((prev) =>
      prev.map((n) => (n.notification_id === id ? updated : n))
    );
    setUnreadCount((prev) => Math.max(0, prev - 1));
  }, []);

  const markAllRead = useCallback(async () => {
    await notificationApi.markAllRead();
    setNotifications((prev) => prev.map((n) => ({ ...n, is_read: true })));
    setUnreadCount(0);
  }, []);

  const remove = useCallback(async (id: string) => {
    const target = notifications.find((n) => n.notification_id === id);
    await notificationApi.deleteNotification(id);
    setNotifications((prev) => prev.filter((n) => n.notification_id !== id));
    if (target && !target.is_read) setUnreadCount((prev) => Math.max(0, prev - 1));
  }, [notifications]);

  const clearAll = useCallback(async () => {
    await notificationApi.clearAllNotifications();
    setNotifications([]);
    setUnreadCount(0);
  }, []);

  return (
    <NotificationContext.Provider
      value={{ notifications, unreadCount, isLoading, loadMore, hasMore, markRead, markAllRead, remove, clearAll }}
    >
      {children}
    </NotificationContext.Provider>
  );
};
