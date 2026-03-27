"use client";

// components/notifications/NotificationDropdown.tsx
// Dropdown panel showing recent notifications with mark-all-read and clear-all actions.

import Link from "next/link";
import { useNotifications } from "@/context/NotificationContext";
import NotificationItem from "./NotificationItem";

interface Props {
  onClose: () => void;
}

export default function NotificationDropdown({ onClose }: Props) {
  const { notifications, unreadCount, isLoading, hasMore, loadMore, markAllRead, clearAll } =
    useNotifications();

  return (
    <div className="absolute right-0 top-full mt-2 w-80 bg-white rounded-xl shadow-lg border border-gray-200 z-50 overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100">
        <span className="text-sm font-semibold text-gray-900">
          Notifications{unreadCount > 0 && ` (${unreadCount})`}
        </span>
        <div className="flex gap-2">
          {unreadCount > 0 && (
            <button
              onClick={() => void markAllRead()}
              className="text-xs text-blue-600 hover:underline"
            >
              Mark all read
            </button>
          )}
          {notifications.length > 0 && (
            <button
              onClick={() => void clearAll()}
              className="text-xs text-gray-400 hover:text-red-500"
            >
              Clear all
            </button>
          )}
        </div>
      </div>

      {/* List */}
      <div className="max-h-96 overflow-y-auto divide-y divide-gray-50">
        {notifications.length === 0 && !isLoading && (
          <p className="py-8 text-center text-sm text-gray-400">No notifications yet</p>
        )}
        {notifications.map((n) => (
          <NotificationItem key={n.notification_id} notification={n} onClose={onClose} />
        ))}
        {hasMore && (
          <button
            onClick={() => void loadMore()}
            disabled={isLoading}
            className="w-full py-3 text-xs text-blue-600 hover:bg-gray-50 disabled:opacity-50"
          >
            {isLoading ? "Loading…" : "Load more"}
          </button>
        )}
      </div>

      {/* Footer */}
      <div className="border-t border-gray-100 px-4 py-2.5">
        <Link
          href="/notifications"
          onClick={onClose}
          className="text-xs text-blue-600 hover:underline"
        >
          View all notifications →
        </Link>
      </div>
    </div>
  );
}
