# Feature 10 — Notification System
### Complete Implementation Guide | Version 1.0 | March 2026
### Save As: F10_Notifications/F10_Implementation_Guide.md

---

# Table of Contents

1. [Feature Overview](#1-feature-overview)
2. [Core Functionality](#2-core-functionality)
3. [Data Model](#3-data-model)
4. [API Endpoints](#4-api-endpoints)
5. [Frontend Components](#5-frontend-components)
6. [Backend Logic and Implementation](#6-backend-logic-and-implementation)
7. [Socket.io Real-Time Integration](#7-socketio-real-time-integration)
8. [Notification Events Reference](#8-notification-events-reference)
9. [Implementation Steps](#9-implementation-steps)
10. [Error Handling](#10-error-handling)
11. [Testing Strategy](#11-testing-strategy)
12. [Code Examples](#12-code-examples)
13. [Performance Optimization](#13-performance-optimization)

---

# 1. Feature Overview

## 1.1 What Is This Feature?

The Notification System is the communication backbone of
M2i_LMS. It keeps every user — students, mentors, and admins —
informed of events relevant to them without requiring them to
constantly check every section of the platform. When a quiz
becomes available, when transcription completes, when a live
session starts, when a student is flagged as inactive — the
notification system delivers the right message to the right
person at the right time.

The system operates on two delivery mechanisms:

**Real-time notifications via Socket.io:** For events that
require immediate attention — a live session starting, a quiz
becoming available, transcription completing — notifications
are pushed to connected users instantly via WebSocket. Users
who are actively on the platform see a toast notification and
their notification bell count updates in real time.

**Persistent in-platform notifications:** All notifications are
stored in the database and displayed in a notification inbox
accessible from the navigation header. Users who were not
connected when an event occurred see the notification on their
next login. Notifications are retained for 30 days before
being archived.

This is a Phase One feature. Email notifications are
deliberately excluded from Phase One because they require
an external SMTP service (SendGrid, AWS SES, etc.) which adds
infrastructure complexity and cost. Email will be added in
Phase Two. In Phase One, all notifications are in-platform only.

## 1.2 Why This Feature Exists

Without notifications, the platform is passive — users must
actively seek information by navigating to different sections.
This creates friction that reduces engagement. Students forget
to take quizzes because they did not know they were available.
Mentors miss quiz review queues because they did not check.
Sessions go unattended because reminders were not sent.

Notifications convert the platform from passive to active —
pushing relevant information to users at the moment it is
actionable. This significantly increases engagement rates
and reduces the cognitive overhead of using the platform.

## 1.3 Notification Principles

**Relevant over frequent:** Every notification must be
genuinely useful to the recipient. Notification spam causes
users to disable or ignore all notifications. Each event
type is evaluated for whether it deserves a notification
before being added.

**Actionable:** Every notification should have a clear
associated action. "Quiz available" links to the quiz.
"Transcription complete" links to the quiz review page.
"Student inactive" links to the student's dashboard.

**Real-time where it matters:** Live events (session starting,
quiz released) need immediate delivery. Administrative events
(batch created, user enrolled) can wait for the next login.

**Persistent for reliability:** Real-time delivery is best-effort.
If a user is offline, the notification is stored and delivered
on next login. No notification is ever lost.

---

# 2. Core Functionality

## 2.1 Notification Creation Flow

Every notification in the system is created through the
NotificationService. No feature creates notification records
directly in the database — they all call the service.
```
Any feature triggers a notification event
e.g. Feature 04 (quiz generation complete)
          |
          v
notificationService.send({
  userId: "mentor-uuid",
  type: "QUIZZES_READY_FOR_REVIEW",
  title: "Quizzes Ready for Review",
  message: "8 questions ready for Introduction to Node.js",
  metadata: { content_id: "...", count: 8 },
  action_url: "/mentor/batches/.../review"
})
          |
          v
NotificationService:
  1. Creates Notification record in database
  2. Emits Socket.io event to user's personal room
     if they are currently connected
          |
          v
If user is connected:
  → Real-time delivery via Socket.io
  → Toast notification appears
  → Bell count increments

If user is offline:
  → Record stored in database
  → Delivered on next login/page load
```

## 2.2 Real-Time Delivery Flow
```
User logs in
          |
          v
Frontend establishes Socket.io connection
          |
          v
Frontend emits AUTHENTICATE event with user ID:
  socket.emit("authenticate", { user_id: "..." })
          |
          v
Server receives AUTHENTICATE:
  socket.join(`user:${userId}`)
  Marks user as online
          |
          v
[User is now in their personal room]
          |
          v
When any event occurs for this user:
  io.to(`user:${userId}`).emit("notification", {
    notification_id: "...",
    type: "QUIZZES_READY_FOR_REVIEW",
    title: "...",
    message: "...",
    action_url: "...",
    created_at: "..."
  })
          |
          v
Frontend receives "notification" event
          |
          v
Frontend shows toast notification
Bell count increments
New notification added to inbox
```

## 2.3 Notification Inbox Flow
```
User clicks notification bell icon
          |
          v
Dropdown opens showing last 10 notifications
          |
          v
GET /api/notifications?page=1&limit=10
          |
          v
List of notifications shown with:
  - Icon based on type
  - Title and message
  - Timestamp (relative: "2 hours ago")
  - Unread indicator (blue dot)
  - Action link
          |
          v
User clicks a notification:
  POST /api/notifications/:id/read
  Frontend navigates to action_url
          |
          v
User clicks "Mark all as read":
  POST /api/notifications/mark-all-read
          |
          v
"View All" link opens full notification
history page
```

## 2.4 Bulk Notification Flow

For events that notify multiple users simultaneously
(e.g., session starting for all batch students), the
notification service supports bulk creation efficiently.
```
Feature 06 session start fires
  → Need to notify 45 enrolled students
          |
          v
notificationService.sendBulk({
  userIds: ["uuid-1", "uuid-2", ..., "uuid-45"],
  type: "SESSION_STARTED",
  title: "Session is live",
  message: "Node.js Deep Dive is live now",
  metadata: { session_id: "..." },
  action_url: "/student/sessions/..."
})
          |
          v
NotificationService:
  1. Bulk insert 45 Notification records
     in a single transaction
  2. For each user who is currently online:
     emit Socket.io event to their personal room
          |
          v
Online students get real-time toast
Offline students get it on next login
```

---

# 3. Data Model

## 3.1 Notifications Table
```sql
CREATE TABLE notifications (
  id              UUID          PRIMARY KEY
                                DEFAULT gen_random_uuid(),
  user_id         UUID          NOT NULL
                                REFERENCES users(id)
                                ON DELETE CASCADE,
  type            VARCHAR(50)   NOT NULL,
  title           VARCHAR(255)  NOT NULL,
  message         TEXT          NOT NULL,
  metadata        JSONB         DEFAULT '{}',
  action_url      TEXT          DEFAULT NULL,
  is_read         BOOLEAN       NOT NULL DEFAULT FALSE,
  read_at         TIMESTAMP     DEFAULT NULL,
  created_at      TIMESTAMP     NOT NULL DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_notifications_user_unread
  ON notifications(user_id, is_read, created_at DESC)
  WHERE is_read = FALSE;

CREATE INDEX idx_notifications_user_created
  ON notifications(user_id, created_at DESC);

CREATE INDEX idx_notifications_type
  ON notifications(type, created_at DESC);
```

### Column Definitions

**id:** UUID primary key.

**user_id:** The user this notification belongs to. ON DELETE
CASCADE ensures notifications are cleaned up if a user is
hard-deleted (unlikely in Phase One with soft deletes, but
good practice).

**type:** A controlled vocabulary string identifying what kind
of event triggered this notification. Used for icon selection
and filtering. Full list in section 8.

**title:** Short headline of the notification (max 255 chars).
Displayed as the primary text in the notification bell dropdown.

**message:** Longer description of the event. Shown in the full
notification inbox. May contain dynamic content like student
names, content titles, counts.

**metadata:** JSON object containing structured data related to
the notification. Used for deep-linking and additional context.
Examples: { content_id: "...", quiz_count: 8 } for a quiz
generation notification.

**action_url:** The URL the user is taken to when they click
the notification. Always a relative URL (e.g.,
/mentor/batches/.../review). NULL if the notification has no
specific action.

**is_read:** Whether the user has seen/clicked this notification.

**read_at:** When the notification was marked as read.

**created_at:** When the notification was created.

## 3.2 Prisma Schema
```prisma
model Notification {
  id          String    @id
                        @default(dbgenerated("gen_random_uuid()"))
                        @db.Uuid
  userId      String    @map("user_id") @db.Uuid
  type        String    @db.VarChar(50)
  title       String    @db.VarChar(255)
  message     String    @db.Text
  metadata    Json      @default("{}")
  actionUrl   String?   @map("action_url") @db.Text
  isRead      Boolean   @default(false) @map("is_read")
  readAt      DateTime? @map("read_at")
  createdAt   DateTime  @default(now()) @map("created_at")

  user        User      @relation(fields: [userId],
                                  references: [id],
                                  onDelete: Cascade)

  @@map("notifications")
}
```

## 3.3 Online User Tracking (In-Memory)

Online user tracking — which users are currently connected
via Socket.io — is maintained in memory, not in the database.
A Map stores the relationship between Socket.io socket IDs
and user IDs.
```typescript
// In-memory online user registry
// Map<userId, Set<socketId>>
// A user can be connected from multiple browser tabs
const onlineUsers = new Map<string, Set<string>>();
```

This is reset on server restart, which is acceptable for
Phase One. For Phase Two with multiple server instances,
use Redis to maintain the online user registry across instances.

---

# 4. API Endpoints

## 4.1 Notification Fetch Endpoints

### GET /api/notifications

**Access:** Authenticated (any role)

**Purpose:** Fetch notifications for the authenticated user

**Query Parameters:**
```
page      : page number (default: 1)
limit     : results per page (default: 20, max: 50)
unread    : boolean, if true return only unread notifications
type      : filter by notification type
```

**Success Response (200 OK):**
```json
{
  "success": true,
  "data": {
    "notifications": [
      {
        "notification_id": "notif-uuid-1",
        "type": "QUIZZES_READY_FOR_REVIEW",
        "title": "Quizzes Ready for Review",
        "message": "8 questions are ready for your review 
                   for 'Introduction to Node.js — Week 1'",
        "metadata": {
          "content_id": "content-uuid-1",
          "quiz_count": 8,
          "batch_id": "batch-uuid-1"
        },
        "action_url": "/mentor/batches/batch-uuid-1/review?content=content-uuid-1",
        "is_read": false,
        "created_at": "2026-04-14T12:30:00Z",
        "time_ago": "2 hours ago"
      },
      {
        "notification_id": "notif-uuid-2",
        "type": "TRANSCRIPTION_COMPLETE",
        "title": "Transcription Complete",
        "message": "Transcription complete for 'Express.js 
                   Fundamentals'. Quizzes are being generated.",
        "metadata": {
          "content_id": "content-uuid-2"
        },
        "action_url": "/mentor/content/content-uuid-2",
        "is_read": true,
        "read_at": "2026-04-14T11:00:00Z",
        "created_at": "2026-04-14T10:45:00Z",
        "time_ago": "3 hours ago"
      }
    ],
    "unread_count": 5,
    "has_more": false
  },
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 8,
    "total_pages": 1
  }
}
```

---

### GET /api/notifications/unread-count

**Access:** Authenticated (any role)

**Purpose:** Fetch just the unread count — used to update
the bell badge without fetching full notification list.
Called on page load and after Socket.io events.

**Success Response (200 OK):**
```json
{
  "success": true,
  "data": {
    "unread_count": 5
  }
}
```

---

## 4.2 Notification Action Endpoints

### POST /api/notifications/:notificationId/read

**Access:** Authenticated (own notifications only)

**Purpose:** Mark a single notification as read

**Request:** No body required.

**Success Response (200 OK):**
```json
{
  "success": true,
  "data": {
    "notification_id": "notif-uuid-1",
    "is_read": true,
    "read_at": "2026-04-14T14:30:00Z"
  }
}
```

---

### POST /api/notifications/mark-all-read

**Access:** Authenticated (any role)

**Purpose:** Mark all of the authenticated user's unread
notifications as read

**Request:** No body required.

**Success Response (200 OK):**
```json
{
  "success": true,
  "data": {
    "marked_count": 5
  },
  "message": "5 notifications marked as read"
}
```

---

### DELETE /api/notifications/:notificationId

**Access:** Authenticated (own notifications only)

**Purpose:** Delete a specific notification

**Success Response (200 OK):**
```json
{
  "success": true,
  "message": "Notification deleted"
}
```

---

### DELETE /api/notifications/clear-all

**Access:** Authenticated (any role)

**Purpose:** Delete all read notifications for the
authenticated user. Unread notifications are not deleted.

**Success Response (200 OK):**
```json
{
  "success": true,
  "data": {
    "deleted_count": 12
  },
  "message": "12 read notifications cleared"
}
```

---

# 5. Frontend Components

## 5.1 Component Structure
```
src/
├── components/
│   └── notifications/
│       ├── NotificationBell.tsx
│       ├── NotificationDropdown.tsx
│       ├── NotificationItem.tsx
│       ├── NotificationToast.tsx
│       └── NotificationPage.tsx
├── hooks/
│   ├── useNotifications.ts
│   └── useSocketNotifications.ts
├── lib/
│   └── socket.ts
└── context/
    └── NotificationContext.tsx
```

## 5.2 Socket.ts — Socket.io Client Setup
```typescript
// lib/socket.ts
import { io, Socket } from "socket.io-client";

let socket: Socket | null = null;

export const getSocket = (): Socket => {
  if (!socket) {
    socket = io(
      process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3001",
      {
        withCredentials: true,
        transports: ["websocket", "polling"],
        autoConnect: false,
      }
    );
  }
  return socket;
};

export const connectSocket = (userId: string): void => {
  const s = getSocket();

  if (!s.connected) {
    s.connect();
  }

  s.once("connect", () => {
    // Join personal notification room
    s.emit("authenticate", { user_id: userId });
  });
};

export const disconnectSocket = (): void => {
  if (socket?.connected) {
    socket.disconnect();
  }
};
```

## 5.3 NotificationContext

Provides notification state to all components without
prop drilling.
```tsx
// context/NotificationContext.tsx
"use client";

import {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  ReactNode,
} from "react";
import { getSocket, connectSocket } from "@/lib/socket";
import api from "@/lib/api";

type NotificationItem = {
  notification_id: string;
  type: string;
  title: string;
  message: string;
  metadata: Record<string, any>;
  action_url: string | null;
  is_read: boolean;
  created_at: string;
  time_ago: string;
};

type ToastNotification = {
  id: string;
  type: string;
  title: string;
  message: string;
  action_url: string | null;
};

type NotificationContextType = {
  notifications: NotificationItem[];
  unreadCount: number;
  toasts: ToastNotification[];
  isLoading: boolean;
  fetchNotifications: () => Promise<void>;
  markAsRead: (notificationId: string) => Promise<void>;
  markAllAsRead: () => Promise<void>;
  deleteNotification: (notificationId: string) => Promise<void>;
  dismissToast: (id: string) => void;
};

const NotificationContext = createContext
  NotificationContextType | null
>(null);

export function NotificationProvider({
  children,
  userId,
}: {
  children: ReactNode;
  userId: string | null;
}) {
  const [notifications, setNotifications] = useState
    NotificationItem[]
  >([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [toasts, setToasts] = useState<ToastNotification[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  // -------------------------------------------------------
  // Fetch notifications from API
  // -------------------------------------------------------
  const fetchNotifications = useCallback(async () => {
    if (!userId) return;
    setIsLoading(true);
    try {
      const response = await api.get(
        "/api/notifications?limit=20"
      );
      setNotifications(response.data.data.notifications);
      setUnreadCount(response.data.data.unread_count);
    } catch {
      // Silently fail — notification fetch should not
      // break the app
    } finally {
      setIsLoading(false);
    }
  }, [userId]);

  // -------------------------------------------------------
  // Fetch unread count only
  // -------------------------------------------------------
  const fetchUnreadCount = useCallback(async () => {
    if (!userId) return;
    try {
      const response = await api.get(
        "/api/notifications/unread-count"
      );
      setUnreadCount(response.data.data.unread_count);
    } catch {
      // Silent fail
    }
  }, [userId]);

  // -------------------------------------------------------
  // Socket.io real-time connection
  // -------------------------------------------------------
  useEffect(() => {
    if (!userId) return;

    connectSocket(userId);
    const socket = getSocket();

    // Handle incoming notifications
    socket.on(
      "notification",
      (data: {
        notification_id: string;
        type: string;
        title: string;
        message: string;
        metadata: Record<string, any>;
        action_url: string | null;
        created_at: string;
      }) => {
        // Add to notifications list
        const newNotification: NotificationItem = {
          ...data,
          is_read: false,
          time_ago: "just now",
        };

        setNotifications((prev) => [newNotification, ...prev]);
        setUnreadCount((prev) => prev + 1);

        // Show toast
        const toastId = `toast-${Date.now()}`;
        setToasts((prev) => [
          ...prev,
          {
            id: toastId,
            type: data.type,
            title: data.title,
            message: data.message,
            action_url: data.action_url,
          },
        ]);

        // Auto-dismiss toast after 5 seconds
        setTimeout(() => {
          setToasts((prev) =>
            prev.filter((t) => t.id !== toastId)
          );
        }, 5000);
      }
    );

    // Handle session events
    socket.on("SESSION_STARTED", (data) => {
      // Session-specific handling (Feature 06)
      // Notification is already sent via the standard channel
    });

    socket.on("SESSION_ENDED", () => {
      // Session ended — update UI if on session page
    });

    // Fetch initial notifications
    fetchNotifications();

    return () => {
      socket.off("notification");
      socket.off("SESSION_STARTED");
      socket.off("SESSION_ENDED");
    };
  }, [userId, fetchNotifications]);

  // -------------------------------------------------------
  // Mark notification as read
  // -------------------------------------------------------
  const markAsRead = useCallback(
    async (notificationId: string) => {
      try {
        await api.post(
          `/api/notifications/${notificationId}/read`
        );
        setNotifications((prev) =>
          prev.map((n) =>
            n.notification_id === notificationId
              ? { ...n, is_read: true, read_at: new Date().toISOString() }
              : n
          )
        );
        setUnreadCount((prev) => Math.max(0, prev - 1));
      } catch {
        // Silent fail
      }
    },
    []
  );

  // -------------------------------------------------------
  // Mark all as read
  // -------------------------------------------------------
  const markAllAsRead = useCallback(async () => {
    try {
      await api.post("/api/notifications/mark-all-read");
      setNotifications((prev) =>
        prev.map((n) => ({ ...n, is_read: true }))
      );
      setUnreadCount(0);
    } catch {
      // Silent fail
    }
  }, []);

  // -------------------------------------------------------
  // Delete notification
  // -------------------------------------------------------
  const deleteNotification = useCallback(
    async (notificationId: string) => {
      try {
        await api.delete(
          `/api/notifications/${notificationId}`
        );
        setNotifications((prev) =>
          prev.filter(
            (n) => n.notification_id !== notificationId
          )
        );
      } catch {
        // Silent fail
      }
    },
    []
  );

  const dismissToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  return (
    <NotificationContext.Provider
      value={{
        notifications,
        unreadCount,
        toasts,
        isLoading,
        fetchNotifications,
        markAsRead,
        markAllAsRead,
        deleteNotification,
        dismissToast,
      }}
    >
      {children}
    </NotificationContext.Provider>
  );
}

export const useNotifications = () => {
  const context = useContext(NotificationContext);
  if (!context) {
    throw new Error(
      "useNotifications must be used within NotificationProvider"
    );
  }
  return context;
};
```

## 5.4 NotificationBell Component

The bell icon in the navigation header showing the unread count.
```tsx
// components/notifications/NotificationBell.tsx
"use client";

import { useState, useRef, useEffect } from "react";
import { useNotifications } from "@/context/NotificationContext";
import NotificationDropdown from "./NotificationDropdown";

export default function NotificationBell() {
  const { unreadCount } = useNotifications();
  const [isOpen, setIsOpen] = useState(false);
  const bellRef = useRef<HTMLDivElement>(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        bellRef.current &&
        !bellRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () =>
      document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  return (
    <div ref={bellRef} style={{ position: "relative" }}>
      {/* Bell Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        aria-label={`Notifications${
          unreadCount > 0 ? ` — ${unreadCount} unread` : ""
        }`}
        style={{
          position: "relative",
          background: "none",
          border: "none",
          cursor: "pointer",
          padding: "8px",
          borderRadius: "8px",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          color: isOpen ? "#4F46E5" : "#6B7280",
          transition: "color 0.15s, background 0.15s",
        }}
        onMouseEnter={(e) => {
          (e.currentTarget).style.background = "#F3F4F6";
        }}
        onMouseLeave={(e) => {
          (e.currentTarget).style.background = "none";
        }}
      >
        {/* Bell SVG Icon */}
        <svg
          width="22"
          height="22"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
          <path d="M13.73 21a2 2 0 0 1-3.46 0" />
        </svg>

        {/* Unread Count Badge */}
        {unreadCount > 0 && (
          <span
            style={{
              position: "absolute",
              top: "2px",
              right: "2px",
              width: unreadCount > 9 ? "20px" : "16px",
              height: "16px",
              borderRadius: "9999px",
              background: "#DC2626",
              color: "white",
              fontSize: "10px",
              fontWeight: 700,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              border: "2px solid white",
            }}
          >
            {unreadCount > 99 ? "99+" : unreadCount}
          </span>
        )}
      </button>

      {/* Dropdown */}
      {isOpen && (
        <NotificationDropdown
          onClose={() => setIsOpen(false)}
        />
      )}
    </div>
  );
}
```

## 5.5 NotificationDropdown Component

The dropdown panel showing recent notifications.
```tsx
// components/notifications/NotificationDropdown.tsx
"use client";

import { useRouter } from "next/navigation";
import { useNotifications } from "@/context/NotificationContext";
import NotificationItem from "./NotificationItem";

type Props = {
  onClose: () => void;
};

export default function NotificationDropdown({ onClose }: Props) {
  const router = useRouter();
  const {
    notifications,
    unreadCount,
    markAllAsRead,
    isLoading,
  } = useNotifications();

  const recentNotifications = notifications.slice(0, 8);

  return (
    <div
      style={{
        position: "absolute",
        top: "calc(100% + 8px)",
        right: 0,
        width: "380px",
        background: "white",
        borderRadius: "12px",
        border: "1px solid #E5E7EB",
        boxShadow: "0 10px 25px rgba(0,0,0,0.12)",
        zIndex: 100,
        overflow: "hidden",
      }}
    >
      {/* Header */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          padding: "14px 16px",
          borderBottom: "1px solid #F3F4F6",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
          <h3 style={{ fontSize: "15px", fontWeight: 600, margin: 0 }}>
            Notifications
          </h3>
          {unreadCount > 0 && (
            <span
              style={{
                fontSize: "12px",
                padding: "2px 8px",
                borderRadius: "9999px",
                background: "#EEF2FF",
                color: "#4F46E5",
                fontWeight: 600,
              }}
            >
              {unreadCount} new
            </span>
          )}
        </div>

        {unreadCount > 0 && (
          <button
            onClick={markAllAsRead}
            style={{
              fontSize: "12px",
              color: "#4F46E5",
              background: "none",
              border: "none",
              cursor: "pointer",
              padding: "4px 8px",
              borderRadius: "6px",
            }}
            onMouseEnter={(e) =>
              (e.currentTarget.style.background = "#EEF2FF")
            }
            onMouseLeave={(e) =>
              (e.currentTarget.style.background = "none")
            }
          >
            Mark all read
          </button>
        )}
      </div>

      {/* Notification List */}
      <div style={{ maxHeight: "400px", overflowY: "auto" }}>
        {isLoading ? (
          <div
            style={{
              padding: "2rem",
              textAlign: "center",
              color: "#9CA3AF",
              fontSize: "14px",
            }}
          >
            Loading...
          </div>
        ) : recentNotifications.length === 0 ? (
          <div
            style={{
              padding: "3rem 2rem",
              textAlign: "center",
            }}
          >
            <div style={{ fontSize: "32px", marginBottom: "8px" }}>
              🔔
            </div>
            <p
              style={{
                fontSize: "14px",
                color: "#6B7280",
                margin: 0,
              }}
            >
              No notifications yet
            </p>
          </div>
        ) : (
          recentNotifications.map((notification) => (
            <NotificationItem
              key={notification.notification_id}
              notification={notification}
              onClose={onClose}
            />
          ))
        )}
      </div>

      {/* Footer */}
      {notifications.length > 0 && (
        <div
          style={{
            borderTop: "1px solid #F3F4F6",
            padding: "10px 16px",
          }}
        >
          <button
            onClick={() => {
              router.push("/notifications");
              onClose();
            }}
            style={{
              width: "100%",
              padding: "8px",
              borderRadius: "8px",
              border: "1px solid #E5E7EB",
              background: "#F9FAFB",
              color: "#374151",
              fontSize: "13px",
              cursor: "pointer",
              textAlign: "center",
            }}
          >
            View all notifications
          </button>
        </div>
      )}
    </div>
  );
}
```

## 5.6 NotificationItem Component

A single notification row in the dropdown or inbox.
```tsx
// components/notifications/NotificationItem.tsx
"use client";

import { useRouter } from "next/navigation";
import { useNotifications } from "@/context/NotificationContext";

type Notification = {
  notification_id: string;
  type: string;
  title: string;
  message: string;
  action_url: string | null;
  is_read: boolean;
  created_at: string;
  time_ago: string;
};

type Props = {
  notification: Notification;
  onClose?: () => void;
};

// Map notification types to icons and colors
const NOTIFICATION_CONFIG: Record
  string,
  { icon: string; color: string; bg: string }
> = {
  QUIZZES_READY_FOR_REVIEW: {
    icon: "📋",
    color: "#4F46E5",
    bg: "#EEF2FF",
  },
  TRANSCRIPTION_COMPLETE: {
    icon: "📝",
    color: "#059669",
    bg: "#D1FAE5",
  },
  QUIZ_AVAILABLE: {
    icon: "✏️",
    color: "#D97706",
    bg: "#FEF3C7",
  },
  RETENTION_QUIZ_AVAILABLE: {
    icon: "🧠",
    color: "#7C3AED",
    bg: "#EDE9FE",
  },
  SESSION_SCHEDULED: {
    icon: "📅",
    color: "#0891B2",
    bg: "#E0F2FE",
  },
  SESSION_STARTED: {
    icon: "🔴",
    color: "#DC2626",
    bg: "#FEE2E2",
  },
  SESSION_REMINDER: {
    icon: "⏰",
    color: "#D97706",
    bg: "#FEF3C7",
  },
  SESSION_ENDED: {
    icon: "✅",
    color: "#059669",
    bg: "#D1FAE5",
  },
  RECORDING_AVAILABLE: {
    icon: "🎬",
    color: "#0891B2",
    bg: "#E0F2FE",
  },
  STUDENT_ALERTS: {
    icon: "⚠️",
    color: "#D97706",
    bg: "#FEF3C7",
  },
  PROGRESS_UPDATED: {
    icon: "📊",
    color: "#059669",
    bg: "#D1FAE5",
  },
  BATCH_STARTED: {
    icon: "🚀",
    color: "#4F46E5",
    bg: "#EEF2FF",
  },
  DEFAULT: {
    icon: "🔔",
    color: "#6B7280",
    bg: "#F3F4F6",
  },
};

export default function NotificationItem({
  notification,
  onClose,
}: Props) {
  const router = useRouter();
  const { markAsRead } = useNotifications();

  const config =
    NOTIFICATION_CONFIG[notification.type] ??
    NOTIFICATION_CONFIG.DEFAULT;

  const handleClick = async () => {
    if (!notification.is_read) {
      await markAsRead(notification.notification_id);
    }
    if (notification.action_url) {
      router.push(notification.action_url);
      onClose?.();
    }
  };

  return (
    <div
      onClick={handleClick}
      style={{
        display: "flex",
        gap: "12px",
        padding: "12px 16px",
        cursor: notification.action_url ? "pointer" : "default",
        background: notification.is_read ? "white" : "#FAFBFF",
        borderBottom: "1px solid #F9FAFB",
        transition: "background 0.1s",
        position: "relative",
      }}
      onMouseEnter={(e) => {
        if (notification.action_url) {
          (e.currentTarget as HTMLDivElement).style.background =
            "#F9FAFB";
        }
      }}
      onMouseLeave={(e) => {
        (e.currentTarget as HTMLDivElement).style.background =
          notification.is_read ? "white" : "#FAFBFF";
      }}
    >
      {/* Unread indicator */}
      {!notification.is_read && (
        <div
          style={{
            position: "absolute",
            left: "6px",
            top: "50%",
            transform: "translateY(-50%)",
            width: "6px",
            height: "6px",
            borderRadius: "50%",
            background: "#4F46E5",
          }}
        />
      )}

      {/* Icon */}
      <div
        style={{
          width: "36px",
          height: "36px",
          borderRadius: "8px",
          background: config.bg,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontSize: "18px",
          flexShrink: 0,
        }}
      >
        {config.icon}
      </div>

      {/* Content */}
      <div style={{ flex: 1, minWidth: 0 }}>
        <p
          style={{
            fontSize: "13px",
            fontWeight: notification.is_read ? 400 : 600,
            color: "#111827",
            margin: 0,
            marginBottom: "2px",
            whiteSpace: "nowrap",
            overflow: "hidden",
            textOverflow: "ellipsis",
          }}
        >
          {notification.title}
        </p>
        <p
          style={{
            fontSize: "12px",
            color: "#6B7280",
            margin: 0,
            lineHeight: 1.4,
            display: "-webkit-box",
            WebkitLineClamp: 2,
            WebkitBoxOrient: "vertical",
            overflow: "hidden",
          }}
        >
          {notification.message}
        </p>
        <p
          style={{
            fontSize: "11px",
            color: "#9CA3AF",
            margin: 0,
            marginTop: "4px",
          }}
        >
          {notification.time_ago}
        </p>
      </div>
    </div>
  );
}
```

## 5.7 NotificationToast Component

Toast notification that appears in the bottom-right corner
of the screen for real-time notifications.
```tsx
// components/notifications/NotificationToast.tsx
"use client";

import { useRouter } from "next/navigation";
import { useNotifications } from "@/context/NotificationContext";

export default function NotificationToastContainer() {
  const { toasts, dismissToast } = useNotifications();
  const router = useRouter();

  if (toasts.length === 0) return null;

  return (
    <div
      style={{
        position: "fixed",
        bottom: "24px",
        right: "24px",
        display: "flex",
        flexDirection: "column",
        gap: "10px",
        zIndex: 9999,
        maxWidth: "380px",
        width: "100%",
      }}
    >
      {toasts.map((toast) => {
        const config = {
          SESSION_STARTED: {
            icon: "🔴",
            border: "#DC2626",
            bg: "#FEF2F2",
          },
          QUIZ_AVAILABLE: {
            icon: "✏️",
            border: "#D97706",
            bg: "#FFFBEB",
          },
          QUIZZES_READY_FOR_REVIEW: {
            icon: "📋",
            border: "#4F46E5",
            bg: "#EEF2FF",
          },
          DEFAULT: {
            icon: "🔔",
            border: "#6B7280",
            bg: "#F9FAFB",
          },
        }[toast.type] ?? {
          icon: "🔔",
          border: "#6B7280",
          bg: "#F9FAFB",
        };

        return (
          <div
            key={toast.id}
            style={{
              background: config.bg,
              border: `1px solid ${config.border}`,
              borderLeft: `4px solid ${config.border}`,
              borderRadius: "10px",
              padding: "12px 16px",
              display: "flex",
              alignItems: "flex-start",
              gap: "10px",
              boxShadow: "0 4px 12px rgba(0,0,0,0.1)",
              animation: "slideIn 0.3s ease",
            }}
          >
            {/* Icon */}
            <span style={{ fontSize: "18px", flexShrink: 0 }}>
              {config.icon}
            </span>

            {/* Content */}
            <div style={{ flex: 1 }}>
              <p
                style={{
                  fontSize: "13px",
                  fontWeight: 600,
                  margin: 0,
                  marginBottom: "2px",
                  color: "#111827",
                }}
              >
                {toast.title}
              </p>
              <p
                style={{
                  fontSize: "12px",
                  color: "#6B7280",
                  margin: 0,
                  lineHeight: 1.4,
                }}
              >
                {toast.message}
              </p>
              {toast.action_url && (
                <button
                  onClick={() => {
                    router.push(toast.action_url!);
                    dismissToast(toast.id);
                  }}
                  style={{
                    marginTop: "6px",
                    fontSize: "12px",
                    color: config.border,
                    background: "none",
                    border: "none",
                    padding: 0,
                    cursor: "pointer",
                    fontWeight: 600,
                    textDecoration: "underline",
                  }}
                >
                  View →
                </button>
              )}
            </div>

            {/* Dismiss */}
            <button
              onClick={() => dismissToast(toast.id)}
              aria-label="Dismiss notification"
              style={{
                background: "none",
                border: "none",
                cursor: "pointer",
                color: "#9CA3AF",
                fontSize: "16px",
                padding: "0",
                lineHeight: 1,
                flexShrink: 0,
              }}
            >
              ×
            </button>
          </div>
        );
      })}
    </div>
  );
}
```

---

# 6. Backend Logic and Implementation

## 6.1 Directory Structure
```
src/
├── controllers/
│   └── notification.controller.ts
├── services/
│   └── notification.service.ts
├── routes/
│   └── notification.routes.ts
└── sockets/
    └── notificationSocket.ts
```

## 6.2 Notification Service

The NotificationService is used by every other feature to create
and deliver notifications. It is the single point of entry for
all notification creation.
```typescript
// services/notification.service.ts
import { PrismaClient } from "@prisma/client";
import { Server as SocketIOServer } from "socket.io";

const prisma = new PrismaClient();

// Singleton Socket.io reference set during server initialization
let io: SocketIOServer | null = null;

export const setSocketIO = (socketIO: SocketIOServer): void => {
  io = socketIO;
};

type NotificationPayload = {
  userId: string;
  type: string;
  title: string;
  message: string;
  metadata?: Record<string, any>;
  action_url?: string;
};

type BulkNotificationPayload = {
  userIds: string[];
  type: string;
  title: string;
  message: string;
  metadata?: Record<string, any>;
  action_url?: string;
};

export const notificationService = {

  // -------------------------------------------------------
  // SEND TO SINGLE USER
  // -------------------------------------------------------
  async send(payload: NotificationPayload): Promise<void> {
    const notification = await prisma.notification.create({
      data: {
        userId: payload.userId,
        type: payload.type,
        title: payload.title,
        message: payload.message,
        metadata: payload.metadata ?? {},
        actionUrl: payload.action_url ?? null,
      },
    });

    // Emit real-time if user is connected
    if (io) {
      io.to(`user:${payload.userId}`).emit("notification", {
        notification_id: notification.id,
        type: notification.type,
        title: notification.title,
        message: notification.message,
        metadata: notification.metadata,
        action_url: notification.actionUrl,
        is_read: false,
        created_at: notification.createdAt,
        time_ago: "just now",
      });
    }
  },

  // -------------------------------------------------------
  // SEND TO MULTIPLE USERS (BULK)
  // -------------------------------------------------------
  async sendBulk(payload: BulkNotificationPayload): Promise<void> {
    if (payload.userIds.length === 0) return;

    // Bulk insert for efficiency
    const notificationsData = payload.userIds.map((userId) => ({
      userId,
      type: payload.type,
      title: payload.title,
      message: payload.message,
      metadata: payload.metadata ?? {},
      actionUrl: payload.action_url ?? null,
    }));

    await prisma.notification.createMany({
      data: notificationsData,
    });

    // Emit real-time to all connected users
    if (io) {
      const socketPayload = {
        type: payload.type,
        title: payload.title,
        message: payload.message,
        metadata: payload.metadata,
        action_url: payload.action_url,
        is_read: false,
        created_at: new Date().toISOString(),
        time_ago: "just now",
      };

      for (const userId of payload.userIds) {
        io.to(`user:${userId}`).emit("notification", {
          notification_id: `bulk-${Date.now()}-${userId}`,
          ...socketPayload,
        });
      }
    }
  },

  // -------------------------------------------------------
  // SEND TO ALL STUDENTS IN A BATCH
  // -------------------------------------------------------
  async sendToBatch(
    batchId: string,
    payload: Omit<NotificationPayload, "userId">
  ): Promise<void> {
    const enrollments = await prisma.enrollment.findMany({
      where: { batchId, status: "ACTIVE" },
      select: { studentId: true },
    });

    const userIds = enrollments.map((e) => e.studentId);

    await this.sendBulk({ ...payload, userIds });
  },

  // -------------------------------------------------------
  // SEND TO ALL MENTORS IN A BATCH
  // -------------------------------------------------------
  async sendToBatchMentors(
    batchId: string,
    payload: Omit<NotificationPayload, "userId">
  ): Promise<void> {
    const mentors = await prisma.batchMentor.findMany({
      where: { batchId },
      select: { mentorId: true },
    });

    const userIds = mentors.map((m) => m.mentorId);

    await this.sendBulk({ ...payload, userIds });
  },
};
```

## 6.3 Notification Controller
```typescript
// controllers/notification.controller.ts
import { Request, Response } from "express";
import { PrismaClient } from "@prisma/client";
import { AuthenticatedRequest } from
  "../middleware/authenticate.middleware";

const prisma = new PrismaClient();

export class NotificationController {

  // GET /api/notifications
  async getNotifications(
    req: AuthenticatedRequest,
    res: Response
  ) {
    try {
      const userId = req.user!.user_id;
      const page = parseInt(req.query.page as string) || 1;
      const limit = Math.min(
        parseInt(req.query.limit as string) || 20,
        50
      );
      const unreadOnly = req.query.unread === "true";
      const type = req.query.type as string | undefined;

      const whereClause: any = { userId };
      if (unreadOnly) whereClause.isRead = false;
      if (type) whereClause.type = type;

      const [notifications, total, unreadCount] =
        await Promise.all([
          prisma.notification.findMany({
            where: whereClause,
            orderBy: { createdAt: "desc" },
            skip: (page - 1) * limit,
            take: limit,
          }),
          prisma.notification.count({ where: whereClause }),
          prisma.notification.count({
            where: { userId, isRead: false },
          }),
        ]);

      const formattedNotifications = notifications.map((n) => ({
        notification_id: n.id,
        type: n.type,
        title: n.title,
        message: n.message,
        metadata: n.metadata,
        action_url: n.actionUrl,
        is_read: n.isRead,
        read_at: n.readAt,
        created_at: n.createdAt,
        time_ago: formatTimeAgo(n.createdAt),
      }));

      res.json({
        success: true,
        data: {
          notifications: formattedNotifications,
          unread_count: unreadCount,
          has_more: page * limit < total,
        },
        pagination: {
          page,
          limit,
          total,
          total_pages: Math.ceil(total / limit),
        },
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        error: { code: "INTERNAL_SERVER_ERROR" },
      });
    }
  }

  // GET /api/notifications/unread-count
  async getUnreadCount(
    req: AuthenticatedRequest,
    res: Response
  ) {
    try {
      const userId = req.user!.user_id;

      const unreadCount = await prisma.notification.count({
        where: { userId, isRead: false },
      });

      res.json({
        success: true,
        data: { unread_count: unreadCount },
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        error: { code: "INTERNAL_SERVER_ERROR" },
      });
    }
  }

  // POST /api/notifications/:id/read
  async markAsRead(req: AuthenticatedRequest, res: Response) {
    try {
      const userId = req.user!.user_id;
      const { notificationId } = req.params;

      const notification = await prisma.notification.findFirst({
        where: { id: notificationId, userId },
      });

      if (!notification) {
        return res.status(404).json({
          success: false,
          error: {
            code: "NOTIFICATION_NOT_FOUND",
            message: "Notification not found",
          },
        });
      }

      const updated = await prisma.notification.update({
        where: { id: notificationId },
        data: { isRead: true, readAt: new Date() },
      });

      res.json({
        success: true,
        data: {
          notification_id: updated.id,
          is_read: true,
          read_at: updated.readAt,
        },
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        error: { code: "INTERNAL_SERVER_ERROR" },
      });
    }
  }

  // POST /api/notifications/mark-all-read
  async markAllAsRead(req: AuthenticatedRequest, res: Response) {
    try {
      const userId = req.user!.user_id;

      const result = await prisma.notification.updateMany({
        where: { userId, isRead: false },
        data: { isRead: true, readAt: new Date() },
      });

      res.json({
        success: true,
        data: { marked_count: result.count },
        message: `${result.count} notifications marked as read`,
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        error: { code: "INTERNAL_SERVER_ERROR" },
      });
    }
  }

  // DELETE /api/notifications/:id
  async deleteNotification(
    req: AuthenticatedRequest,
    res: Response
  ) {
    try {
      const userId = req.user!.user_id;
      const { notificationId } = req.params;

      const notification = await prisma.notification.findFirst({
        where: { id: notificationId, userId },
      });

      if (!notification) {
        return res.status(404).json({
          success: false,
          error: {
            code: "NOTIFICATION_NOT_FOUND",
            message: "Notification not found",
          },
        });
      }

      await prisma.notification.delete({
        where: { id: notificationId },
      });

      res.json({
        success: true,
        message: "Notification deleted",
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        error: { code: "INTERNAL_SERVER_ERROR" },
      });
    }
  }

  // DELETE /api/notifications/clear-all
  async clearAllRead(req: AuthenticatedRequest, res: Response) {
    try {
      const userId = req.user!.user_id;

      const result = await prisma.notification.deleteMany({
        where: { userId, isRead: true },
      });

      res.json({
        success: true,
        data: { deleted_count: result.count },
        message: `${result.count} read notifications cleared`,
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        error: { code: "INTERNAL_SERVER_ERROR" },
      });
    }
  }
}

// Helper function
const formatTimeAgo = (date: Date): string => {
  const seconds = Math.floor(
    (Date.now() - date.getTime()) / 1000
  );

  if (seconds < 60) return "just now";
  if (seconds < 3600) {
    const minutes = Math.floor(seconds / 60);
    return `${minutes} minute${minutes !== 1 ? "s" : ""} ago`;
  }
  if (seconds < 86400) {
    const hours = Math.floor(seconds / 3600);
    return `${hours} hour${hours !== 1 ? "s" : ""} ago`;
  }
  const days = Math.floor(seconds / 86400);
  if (days < 7) {
    return `${days} day${days !== 1 ? "s" : ""} ago`;
  }
  return date.toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
  });
};
```

## 6.4 Socket.io Notification Setup
```typescript
// sockets/notificationSocket.ts
import { Server as SocketIOServer, Socket } from "socket.io";
import { setSocketIO } from "../services/notification.service";

// In-memory registry: userId → Set of socketIds
export const onlineUsers = new Map<string, Set<string>>();

export const setupNotificationSocket = (
  io: SocketIOServer
): void => {
  // Give notification service access to io
  setSocketIO(io);

  io.on("connection", (socket: Socket) => {

    // -------------------------------------------------------
    // AUTHENTICATE — join personal notification room
    // -------------------------------------------------------
    socket.on(
      "authenticate",
      (data: { user_id: string }) => {
        const { user_id } = data;

        if (!user_id) return;

        // Join personal room
        socket.join(`user:${user_id}`);

        // Track online status
        if (!onlineUsers.has(user_id)) {
          onlineUsers.set(user_id, new Set());
        }
        onlineUsers.get(user_id)!.add(socket.id);

        console.log(
          `[Socket] User ${user_id} authenticated ` +
          `(socket: ${socket.id})`
        );

        // Send acknowledgment
        socket.emit("authenticated", {
          status: "ok",
          user_id,
        });
      }
    );

    // -------------------------------------------------------
    // JOIN SESSION ROOM (for live streaming)
    // -------------------------------------------------------
    socket.on(
      "join_session_room",
      (data: { session_id: string; user_id: string }) => {
        socket.join(`session:${data.session_id}`);
        console.log(
          `[Socket] User ${data.user_id} joined ` +
          `session:${data.session_id}`
        );
      }
    );

    socket.on(
      "leave_session_room",
      (data: { session_id: string }) => {
        socket.leave(`session:${data.session_id}`);
      }
    );

    // -------------------------------------------------------
    // DISCONNECT — clean up online registry
    // -------------------------------------------------------
    socket.on("disconnect", () => {
      // Find and remove this socket from onlineUsers
      for (const [userId, sockets] of onlineUsers.entries()) {
        if (sockets.has(socket.id)) {
          sockets.delete(socket.id);

          if (sockets.size === 0) {
            onlineUsers.delete(userId);
          }

          console.log(
            `[Socket] User ${userId} socket disconnected ` +
            `(${sockets.size} connections remaining)`
          );
          break;
        }
      }
    });
  });
};

// Helper: Check if a user is currently online
export const isUserOnline = (userId: string): boolean => {
  return (
    onlineUsers.has(userId) &&
    (onlineUsers.get(userId)?.size ?? 0) > 0
  );
};
```

## 6.5 Server Integration
```typescript
// server.ts — integrate Socket.io and notifications
import { createServer } from "http";
import { Server as SocketIOServer } from "socket.io";
import { setupNotificationSocket } from
  "./sockets/notificationSocket";
import express from "express";

const app = express();
const httpServer = createServer(app);

export const io = new SocketIOServer(httpServer, {
  cors: {
    origin: process.env.CORS_ORIGIN,
    credentials: true,
  },
});

// Set up notification socket
setupNotificationSocket(io);

// Routes setup (all other features)
// ...

httpServer.listen(process.env.PORT ?? 3001, () => {
  console.log(`Server running on port ${process.env.PORT ?? 3001}`);
});
```

## 6.6 Notification Routes
```typescript
// routes/notification.routes.ts
import { Router } from "express";
import { NotificationController } from
  "../controllers/notification.controller";
import { authenticate } from
  "../middleware/authenticate.middleware";

const router = Router();
const controller = new NotificationController();

router.use(authenticate);

router.get(
  "/",
  controller.getNotifications
);

router.get(
  "/unread-count",
  controller.getUnreadCount
);

router.post(
  "/mark-all-read",
  controller.markAllAsRead
);

router.delete(
  "/clear-all",
  controller.clearAllRead
);

router.post(
  "/:notificationId/read",
  controller.markAsRead
);

router.delete(
  "/:notificationId",
  controller.deleteNotification
);

export default router;
```

## 6.7 Notification Cleanup Job

Old notifications should be cleaned up regularly to keep
the database table manageable.
```typescript
// jobs/notificationCleanup.job.ts
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

export const runNotificationCleanupJob = async () => {
  const thirtyDaysAgo = new Date(
    Date.now() - 30 * 24 * 60 * 60 * 1000
  );

  // Delete read notifications older than 30 days
  const result = await prisma.notification.deleteMany({
    where: {
      isRead: true,
      createdAt: { lt: thirtyDaysAgo },
    },
  });

  console.log(
    `[NotificationCleanup] Deleted ${result.count} ` +
    `old read notifications`
  );
};
```

Add to cron schedule:
```typescript
// Run notification cleanup at 3:00 AM daily
cron.schedule("0 3 * * *", runNotificationCleanupJob);
```

---

# 7. Socket.io Real-Time Integration

## 7.1 How Other Features Use the Notification System

All real-time notifications across all features flow through
the NotificationService. Features never call Socket.io directly.
```typescript
// Example from Feature 04 (Quiz Generation complete)
await notificationService.sendToBatchMentors(
  content.batchId,
  {
    type: "QUIZZES_READY_FOR_REVIEW",
    title: "Quizzes Ready for Review",
    message: `${questions.length} questions ready for 
              "${content.title}"`,
    metadata: {
      content_id: content.id,
      batch_id: content.batchId,
      quiz_count: questions.length,
    },
    action_url:
      `/mentor/batches/${content.batchId}/review?` +
      `content=${content.id}`,
  }
);

// Example from Feature 06 (Session started)
await notificationService.sendToBatch(
  session.batchId,
  {
    type: "SESSION_STARTED",
    title: `${session.title} is live now`,
    message: `Join now — ${session.mentor.fullName} is streaming`,
    metadata: {
      session_id: session.id,
      batch_id: session.batchId,
    },
    action_url: `/student/sessions/${session.id}`,
  }
);
```

## 7.2 Next.js Integration — Wrapping App with Provider
```tsx
// app/layout.tsx
import { NotificationProvider } from
  "@/context/NotificationContext";
import NotificationToastContainer from
  "@/components/notifications/NotificationToast";
import { getCurrentUser } from "@/lib/auth";

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await getCurrentUser();

  return (
    <html lang="en">
      <body>
        <NotificationProvider userId={user?.id ?? null}>
          {children}
          <NotificationToastContainer />
        </NotificationProvider>
      </body>
    </html>
  );
}
```

## 7.3 Using NotificationBell in Nav Header
```tsx
// components/layout/NavHeader.tsx
import NotificationBell from
  "@/components/notifications/NotificationBell";

export default function NavHeader() {
  return (
    <header>
      <nav>
        {/* ... other nav items */}
        <NotificationBell />
        {/* ... user menu */}
      </nav>
    </header>
  );
}
```

---

# 8. Notification Events Reference

Complete list of all notification types in Phase One with
their triggers, recipients, and default messages.

## 8.1 Student Notifications

| Type | Trigger | Message Template |
|------|---------|-----------------|
| QUIZ_AVAILABLE | Feature 05: Mentor approves enough questions for Quick Assessment | "Quick quiz available for [Content Title]" |
| RETENTION_QUIZ_AVAILABLE | Time-based: 72h after Quick Assessment available | "Retention quiz now available for [Content Title]" |
| SESSION_SCHEDULED | Feature 06: Mentor schedules session | "New session: [Title] on [Date] at [Time]" |
| SESSION_REMINDER | Job: 30 minutes before scheduled session | "[Session Title] starts in 30 minutes" |
| SESSION_STARTED | Feature 06: Mentor starts stream | "[Session Title] is live now — Join" |
| SESSION_ENDED | Feature 06: Mentor ends stream | "[Session Title] has ended" |
| RECORDING_AVAILABLE | Feature 06: Recording ready | "Recording available: [Session Title]" |
| BATCH_STARTED | Job: batch start_date arrives | "Your batch [Name] has started" |
| PROGRESS_UPDATED | Feature 09: Weekly scores calculated | "Your weekly progress scores have been updated" |
| CONTENT_PUBLISHED | Feature 03: Mentor publishes content | "New content available: [Title]" |

## 8.2 Mentor Notifications

| Type | Trigger | Message Template |
|------|---------|-----------------|
| TRANSCRIPTION_COMPLETE | Feature 03: Whisper completes | "Transcription complete for [Content Title]" |
| QUIZZES_READY_FOR_REVIEW | Feature 04: Llama 2 generation complete | "[N] questions ready for [Content Title]" |
| STUDENT_ALERTS | Feature 08/09: Alert job fires | "[N] students need attention in [Batch Name]" |
| QUIZ_GENERATION_FAILED | Feature 04: Generation failed | "Quiz generation failed for [Content Title]" |
| TRANSCRIPTION_FAILED | Feature 03: Whisper failed | "Transcription failed for [Content Title]" |
| SESSION_RECORDING_READY | Feature 06: Recording processed | "Recording for [Session Title] is now available" |

## 8.3 Admin Notifications

| Type | Trigger | Message Template |
|------|---------|-----------------|
| BATCH_ENROLLMENT | Feature 02: Student enrolled | "[Student Name] enrolled in [Batch Name]" |
| SYSTEM_ALERT | Any system-level error | System alert message |

---

# 9. Implementation Steps

## 9.1 Step-by-Step Build Order

### Step 1 — Database Schema (Day 1)

Add notifications table to Prisma schema and run migration:
```bash
npx prisma migrate dev --name add_notifications_table
```

Install Socket.io client for frontend:
```bash
npm install socket.io-client    # Already installed for server
```

### Step 2 — Notification Service (Day 1)

Build `services/notification.service.ts` from section 6.2.
This is a critical shared service — all other features depend
on it. Test:
1. `send()` — creates a database record
2. `sendBulk()` — creates multiple records in one operation
3. `sendToBatch()` — sends to all enrolled students
4. `sendToBatchMentors()` — sends to all batch mentors

### Step 3 — Socket.io Setup (Day 1)

Build `sockets/notificationSocket.ts` from section 6.4.
Integrate into `server.ts` from section 6.5. Test:
1. Connect a client — verify it joins personal room
2. Send a notification via service — verify Socket.io
   event is received
3. Disconnect — verify online registry is cleaned up

### Step 4 — Notification Controller and Routes (Day 2)

Build `controllers/notification.controller.ts` from section 6.3.
Wire up all routes. Test all endpoints:
1. GET /api/notifications — various filter combinations
2. GET /api/notifications/unread-count
3. POST /api/notifications/:id/read
4. POST /api/notifications/mark-all-read
5. DELETE /api/notifications/:id
6. DELETE /api/notifications/clear-all

### Step 5 — NotificationContext (Day 2)

Build `context/NotificationContext.tsx` from section 5.3.
Test:
1. Provider wraps app correctly
2. Socket.io connection is established on mount
3. Real-time notifications update state
4. Toast auto-dismisses after 5 seconds
5. Mark as read updates local state immediately

### Step 6 — Frontend Components (Day 3)

Build in order:
1. `NotificationBell` with unread count badge
2. `NotificationDropdown` with list and mark all read
3. `NotificationItem` with icons and action navigation
4. `NotificationToastContainer` with auto-dismiss
5. Add NotificationBell to NavHeader
6. Wrap app layout with NotificationProvider

### Step 7 — Connect All Features (Day 3)

Verify that all other features are sending notifications
by checking feature implementation:

Feature 03 (Content):
- Transcription complete → TRANSCRIPTION_COMPLETE to mentors
- Content published → CONTENT_PUBLISHED to students

Feature 04 (Quiz Generation):
- Generation complete → QUIZZES_READY_FOR_REVIEW to mentors
- Generation failed → QUIZ_GENERATION_FAILED to mentors

Feature 05 (Quiz Review):
- Quiz threshold met → QUIZ_AVAILABLE to students

Feature 06 (Live Streaming):
- Session scheduled → SESSION_SCHEDULED to students
- Session started → SESSION_STARTED to students
- Session ended → SESSION_ENDED to students
- Recording available → RECORDING_AVAILABLE to students

Feature 08 (Dashboard):
- Alert generated → STUDENT_ALERTS to mentors

Feature 09 (Metrics):
- Scores calculated → PROGRESS_UPDATED to students

### Step 8 — Notification Cleanup Job (Day 3)

Build and schedule the cleanup job from section 6.7.

### Step 9 — Integration Testing (Day 4)

End-to-end notification test:
1. Mentor uploads video — verify students get nothing yet
2. Transcription completes — verify mentor gets notification
3. Quizzes generated — verify mentor gets review notification
4. Mentor approves quizzes — verify students get quiz notification
5. Mentor schedules session — verify students get notification
6. Session starts — verify all students get live notification
7. Student opens platform while session is live — verify
   toast appears
8. Verify bell count updates in real time
9. Mark notifications as read — verify count decrements
10. Verify offline users see notifications on next login

---

# 10. Error Handling

## 10.1 Error Codes
```
NOTIFICATION_NOT_FOUND  : 404 — Notification ID does not exist
PERMISSION_DENIED       : 403 — Trying to read/delete another
                                user's notification
INTERNAL_SERVER_ERROR   : 500 — Database error
```

## 10.2 Silent Failure Philosophy

The notification system is a non-critical augmentation of the
platform. A notification failure should NEVER prevent the primary
action from completing. For example:

- If quiz generation completes but the notification send fails,
  the quizzes are still stored — only the notification is missed.
- If Socket.io delivery fails, the notification is still in the
  database — the user sees it on next login.

All notification sends in other features are wrapped in try-catch
with silent failures:
```typescript
// In Feature 04 quiz generation worker
try {
  await notificationService.sendToBatchMentors(batchId, {
    type: "QUIZZES_READY_FOR_REVIEW",
    title: "Quizzes Ready for Review",
    message: `${count} questions ready for review`,
  });
} catch (err) {
  // Log but do NOT throw — notification failure should
  // not fail the quiz generation job
  console.error(
    "[QuizGen] Failed to send notification:", err
  );
}
```

## 10.3 Socket.io Reconnection

The Socket.io client is configured with automatic reconnection.
If the server restarts or the connection drops, the client
reconnects automatically. The online user registry is rebuilt
as users re-authenticate.
```typescript
// lib/socket.ts
const socket = io(API_URL, {
  withCredentials: true,
  transports: ["websocket", "polling"],
  reconnection: true,
  reconnectionAttempts: 10,
  reconnectionDelay: 1000,
  reconnectionDelayMax: 5000,
});
```

---

# 11. Testing Strategy

## 11.1 Unit Tests
```typescript
// tests/notification.service.test.ts

describe("NotificationService.send", () => {

  it("should create a notification record in the database", async () => {
    prismaMock.notification.create.mockResolvedValue({
      id: "notif-uuid",
      userId: "user-uuid",
      type: "QUIZ_AVAILABLE",
      title: "Quiz Available",
      message: "Test message",
      metadata: {},
      actionUrl: null,
      isRead: false,
      readAt: null,
      createdAt: new Date(),
    } as any);

    await notificationService.send({
      userId: "user-uuid",
      type: "QUIZ_AVAILABLE",
      title: "Quiz Available",
      message: "Test message",
    });

    expect(prismaMock.notification.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          userId: "user-uuid",
          type: "QUIZ_AVAILABLE",
        }),
      })
    );
  });

  it("should emit Socket.io event if io is set", async () => {
    const mockIo = {
      to: jest.fn().mockReturnThis(),
      emit: jest.fn(),
    };

    // Set mock io
    setSocketIO(mockIo as any);

    prismaMock.notification.create.mockResolvedValue({
      id: "notif-uuid",
      type: "QUIZ_AVAILABLE",
      title: "Quiz Available",
      message: "Test",
      metadata: {},
      actionUrl: null,
      isRead: false,
      createdAt: new Date(),
    } as any);

    await notificationService.send({
      userId: "user-uuid",
      type: "QUIZ_AVAILABLE",
      title: "Quiz Available",
      message: "Test",
    });

    expect(mockIo.to).toHaveBeenCalledWith("user:user-uuid");
    expect(mockIo.emit).toHaveBeenCalledWith(
      "notification",
      expect.objectContaining({ type: "QUIZ_AVAILABLE" })
    );
  });
});

describe("NotificationService.sendBulk", () => {

  it("should create multiple records efficiently", async () => {
    prismaMock.notification.createMany.mockResolvedValue({
      count: 3,
    });

    await notificationService.sendBulk({
      userIds: ["user-1", "user-2", "user-3"],
      type: "SESSION_STARTED",
      title: "Session is live",
      message: "Join now",
    });

    expect(prismaMock.notification.createMany).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.arrayContaining([
          expect.objectContaining({ userId: "user-1" }),
          expect.objectContaining({ userId: "user-2" }),
          expect.objectContaining({ userId: "user-3" }),
        ]),
      })
    );
  });

  it("should handle empty userIds array gracefully", async () => {
    await notificationService.sendBulk({
      userIds: [],
      type: "SESSION_STARTED",
      title: "Test",
      message: "Test",
    });

    expect(prismaMock.notification.createMany).not.toHaveBeenCalled();
  });
});
```

---

# 12. Code Examples

## 12.1 Complete Notification Flow Example

This example shows the complete flow from an event in one
feature all the way to the user seeing a toast notification.
```
1. Feature 04 quiz generation worker completes generation

2. Worker calls:
   await notificationService.sendToBatchMentors(batchId, {
     type: "QUIZZES_READY_FOR_REVIEW",
     title: "Quizzes Ready for Review",
     message: "8 questions ready for 'Node.js Week 1'",
     action_url: "/mentor/batches/.../review"
   });

3. NotificationService:
   a. Fetches mentor IDs from BatchMentor table
   b. Creates 2 Notification records (one per mentor)
      in a single createMany call
   c. Emits Socket.io "notification" event to
      user:mentor-uuid-1 and user:mentor-uuid-2

4. Mentor's browser receives Socket.io event

5. NotificationContext receives the event:
   - Adds notification to state
   - Increments unreadCount
   - Creates toast entry

6. NotificationBell re-renders:
   - Badge shows updated count (e.g., 3 → 4)

7. NotificationToastContainer renders new toast:
   - "📋 Quizzes Ready for Review"
   - "8 questions ready for Node.js Week 1"
   - [View →] button

8. Toast auto-dismisses after 5 seconds

9. Mentor clicks bell → dropdown shows all notifications
   including the new unread one at the top

10. Mentor clicks notification:
    - markAsRead() called
    - Navigation to action_url
    - unreadCount decremented
```

---

# 13. Performance Optimization

## 13.1 Batch Notification Performance

For bulk notifications (session started for 500 students),
the system uses Prisma's `createMany` with `skipDuplicates: true`
to create all records in a single database round-trip.

For Socket.io delivery to 500 connected users, Socket.io's
room-based emit handles this efficiently — a single
`io.to(room).emit()` call fans out to all sockets in that room.

For individual user rooms with up to 500 students all in
`user:{userId}` rooms, each student has their own room.
Socket.io handles the fan-out without requiring 500
separate emit calls.

## 13.2 Unread Count Query Optimization

The notification bell fetches unread count frequently —
on page load, after Socket.io events, and after mark-as-read
actions. The index on (user_id, is_read, created_at DESC) with
the WHERE is_read = FALSE partial condition keeps this query
very fast even with large notification tables.

For Phase Two, cache the unread count in Redis per user
with a 60-second TTL, invalidated immediately when a
new notification is created for that user.

## 13.3 Notification Table Size Management

The 30-day cleanup job prevents the notifications table from
growing indefinitely. For a platform with 500 students and
mentors receiving an average of 5 notifications per day, the
table would accumulate approximately:

500 users × 5 notifications × 30 days = 75,000 rows maximum.

PostgreSQL handles this size trivially. The partial index
on unread notifications keeps all user-facing queries fast.

## 13.4 Socket.io Scaling for Phase Two

In Phase One, Socket.io runs on a single server. For Phase Two
with multiple Node.js instances behind a load balancer, use
the Redis adapter so Socket.io rooms are shared across instances:
```typescript
// Phase Two: Add Redis adapter
import { createAdapter } from "@socket.io/redis-adapter";
import { createClient } from "redis";

const pubClient = createClient({
  url: process.env.REDIS_URL,
});
const subClient = pubClient.duplicate();

await Promise.all([pubClient.connect(), subClient.connect()]);
io.adapter(createAdapter(pubClient, subClient));
```

---

**End of Feature 10 — Notification System**

---

**Document Information**

| Field | Value |
|-------|-------|
| Feature | F10 — Notification System |
| Version | 1.0 |
| Status | Ready for Development |
| Folder | F10_Notifications/ |
| Filename | F10_Implementation_Guide.md |
| Previous Feature | F09_Metrics_Engine/ |
| Next Document | Database Schema Sub-Document |