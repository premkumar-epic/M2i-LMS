// frontend/lib/notification.api.ts
// API client for /api/notifications endpoints.

import api from "./api";

export interface Notification {
  notification_id: string;
  user_id: string;
  type: string;
  title: string;
  message: string;
  metadata: Record<string, unknown>;
  action_url: string | null;
  is_read: boolean;
  read_at: string | null;
  created_at: string;
}

export interface NotificationList {
  notifications: Notification[];
  total: number;
  limit: number;
  offset: number;
}

export const listNotifications = async (limit = 20, offset = 0): Promise<NotificationList> => {
  const { data } = await api.get<NotificationList>("/notifications", {
    params: { limit, offset },
  });
  return data;
};

export const getUnreadCount = async (): Promise<number> => {
  const { data } = await api.get<{ unread_count: number }>("/notifications/unread-count");
  return data.unread_count;
};

export const markRead = async (notificationId: string): Promise<Notification> => {
  const { data } = await api.post<Notification>(`/notifications/${notificationId}/read`);
  return data;
};

export const markAllRead = async (): Promise<number> => {
  const { data } = await api.post<{ marked_read: number }>("/notifications/mark-all-read");
  return data.marked_read;
};

export const deleteNotification = async (notificationId: string): Promise<void> => {
  await api.delete(`/notifications/${notificationId}`);
};

export const clearAllNotifications = async (): Promise<number> => {
  const { data } = await api.delete<{ deleted: number }>("/notifications/clear-all");
  return data.deleted;
};
