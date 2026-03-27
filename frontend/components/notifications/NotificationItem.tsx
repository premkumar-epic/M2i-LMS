"use client";

// components/notifications/NotificationItem.tsx

import { useRouter } from "next/navigation";
import type { Notification } from "@/lib/notification.api";
import { useNotifications } from "@/context/NotificationContext";

const TYPE_ICONS: Record<string, string> = {
  CONTENT_PUBLISHED: "📹",
  TRANSCRIPTION_COMPLETE: "📝",
  AUDIO_EXTRACTED: "🔊",
  AUDIO_EXTRACTION_FAILED: "❌",
  SESSION_STARTING: "📡",
  QUIZ_AVAILABLE: "❓",
  DEFAULT: "🔔",
};

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60_000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

interface Props {
  notification: Notification;
  onClose?: () => void;
}

export default function NotificationItem({ notification, onClose }: Props) {
  const { markRead, remove } = useNotifications();
  const router = useRouter();

  const icon = TYPE_ICONS[notification.type] ?? TYPE_ICONS.DEFAULT;

  const handleClick = async () => {
    if (!notification.is_read) await markRead(notification.notification_id);
    if (notification.action_url) {
      router.push(notification.action_url);
      onClose?.();
    }
  };

  const handleDelete = async (e: React.MouseEvent) => {
    e.stopPropagation();
    await remove(notification.notification_id);
  };

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={handleClick}
      onKeyDown={(e) => e.key === "Enter" && handleClick()}
      className={`group flex gap-3 px-4 py-3 cursor-pointer hover:bg-gray-50 transition-colors ${
        notification.is_read ? "opacity-60" : ""
      }`}
    >
      {/* Unread dot */}
      <div className="mt-1 flex-shrink-0">
        {!notification.is_read && (
          <span className="block w-2 h-2 rounded-full bg-blue-500" />
        )}
        {notification.is_read && <span className="block w-2 h-2" />}
      </div>

      {/* Icon */}
      <span className="text-lg flex-shrink-0 leading-none mt-0.5">{icon}</span>

      {/* Text */}
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-gray-900 truncate">{notification.title}</p>
        <p className="text-xs text-gray-500 mt-0.5 line-clamp-2">{notification.message}</p>
        <p className="text-xs text-gray-400 mt-1">{timeAgo(notification.created_at)}</p>
      </div>

      {/* Delete button */}
      <button
        aria-label="Remove notification"
        onClick={handleDelete}
        className="opacity-0 group-hover:opacity-100 flex-shrink-0 p-1 text-gray-400 hover:text-red-500 rounded transition-opacity"
      >
        ×
      </button>
    </div>
  );
}
