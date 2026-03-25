# Feature 06 — Live Streaming and Session Management

### Complete Implementation Guide | Version 1.0 | March 2026

### Save As: F06_Live_Streaming/F06_Implementation_Guide.md

---

# Table of Contents

1. [Feature Overview](#1-feature-overview)
2. [Core Functionality](#2-core-functionality)
3. [Data Model](#3-data-model)
4. [API Endpoints](#4-api-endpoints)
5. [Frontend Components](#5-frontend-components)
6. [Backend Logic and Implementation](#6-backend-logic-and-implementation)
7. [Streaming Provider Integration](#7-streaming-provider-integration)
8. [Implementation Steps](#8-implementation-steps)
9. [Error Handling](#9-error-handling)
10. [Testing Strategy](#10-testing-strategy)
11. [Code Examples](#11-code-examples)
12. [Performance Optimization](#12-performance-optimization)

---

# 1. Feature Overview

## 1.1 What Is This Feature?

Live Streaming and Session Management is the real-time interactive
learning component of M2i_LMS. It enables mentors to conduct scheduled
live classes that enrolled students can join and watch directly within
the platform, with all attendance and engagement data automatically
captured and fed into the metrics engine.

This feature handles the complete lifecycle of a live session — from
scheduling a class days in advance, through the actual live broadcast,
to post-session recording access and automatic quiz generation
triggering. Every part of this lifecycle is managed within M2i_LMS,
with the actual video encoding and delivery delegated to a third-party
streaming provider (Mux or Agora) that handles the hard infrastructure
problems.

## 1.2 Why This Feature Exists

Live sessions serve a fundamentally different learning function than
pre-recorded videos. They are synchronous, interactive, and time-bound.
Students who attend live sessions tend to engage more deeply because
the experience is real-time — questions can be answered in the moment,
the mentor responds to the room's energy, and the shared experience
creates a cohort identity that asynchronous content cannot replicate.

From a metrics perspective, live session attendance is a direct signal
for the Consistency and Discipline learning dimension. A student who
shows up to every live session, on time, and stays for the full
duration is demonstrating a measurably different commitment level from
one who skips sessions and catches up on recordings.

## 1.3 Key Design Decisions

**Third-party streaming infrastructure:** Building production-quality
live streaming from scratch — handling WebRTC signaling, encoding,
CDN delivery, latency optimization, and recording — is a multi-month
engineering effort. Using Mux or Agora reduces this to a one-week
integration. This is a deliberate build-versus-buy decision in favor
of speed and reliability.

**Attendance tracking via join/leave events:** Every join and leave
event is recorded with precise timestamps. Students cannot mark
themselves as attended without actually joining the stream. Duration
is calculated from actual join and leave times, not self-reported.

**Automatic post-session quiz triggering:** When a mentor ends a
session, the platform automatically triggers the quiz generation
pipeline for any content associated with that session. This means
students can have a quick assessment quiz available within minutes
of a live session ending.

**Recording availability:** All sessions are automatically recorded.
Students who miss the live session can watch the recording, and the
platform tracks recording watch time as a partial substitute for
live attendance, marking the student as ATTENDED_RECORDING.

---

# 2. Core Functionality

## 2.1 Session Scheduling Flow

```
Mentor opens session scheduling interface
          |
          v
Mentor fills in session details:
  - Title (required)
  - Description (optional — agenda, topics)
  - Batch assignment (required)
  - Scheduled date and time (required)
  - Associated content items (optional — links
    session to specific content for quiz triggering)
  - Estimated duration in minutes (optional)
          |
          v
Frontend validates:
  - Title not empty
  - Scheduled time is in the future
  - Batch is assigned to this mentor
          |
          v
POST /api/live-sessions
          |
          v
Backend creates LiveSession record
with status = SCHEDULED
          |
          v
Real-time notification sent to all
enrolled students in the batch:
"New live session scheduled:
[Title] on [Date] at [Time]"
          |
          v
Session appears in batch
session listing for mentor and students
          |
          v
30 minutes before scheduled time:
Automated reminder notification
sent to all enrolled students
```

## 2.2 Session Start Flow

```
Mentor opens session detail page
          |
          v
"Start Stream" button becomes active
15 minutes before scheduled time
          |
          v
Mentor clicks Start Stream
          |
          v
Backend calls streaming provider API
(Mux or Agora) to create a live
stream instance
          |
          v
Provider returns:
  - Stream key (for mentor's encoder)
  - Playback URL (for students)
  - Session token (for authentication)
          |
          v
Backend updates LiveSession:
  - status = LIVE
  - started_at = NOW()
  - stream_key = [from provider]
  - playback_url = [from provider]
          |
          v
Real-time Socket.io event emitted
to all enrolled students:
"SESSION_STARTED" with playback URL
          |
          v
Students online receive toast notification:
"[Session Title] is live now — Join"
          |
          v
Mentor sees streaming interface
with their stream key or
browser-based streaming option
```

## 2.3 Student Join Flow

```
Student clicks "Join" on session card
or notification
          |
          v
POST /api/live-sessions/:id/join
          |
          v
Backend creates SessionAttendance record:
  - student_id
  - session_id
  - joined_at = NOW()
  - status = ATTENDING
          |
          v
Backend returns playback URL
          |
          v
Frontend loads video player with
the session's playback URL
          |
          v
Student watches the live stream
          |
          v
Every 30 seconds: frontend sends
heartbeat to backend to confirm
student is still active
          |
          v
Student leaves (closes tab,
clicks Leave, or session ends)
          |
          v
POST /api/live-sessions/:id/leave
          |
          v
Backend updates SessionAttendance:
  - left_at = NOW()
  - duration_seconds = left_at - joined_at
  - status = ATTENDED
```

## 2.4 Session End Flow

```
Mentor clicks "End Stream"
          |
          v
Confirmation dialog:
"End this session? The recording
will be saved automatically."
          |
          v
Mentor confirms
          |
          v
Backend calls streaming provider API
to stop the stream
          |
          v
Backend updates LiveSession:
  - status = COMPLETED
  - ended_at = NOW()
          |
          v
All students still in session
receive PAUSED event — stream ends
          |
          v
All open attendance records
(no left_at) are automatically
closed with ended_at as left_at
          |
          v
Background job queued:
FETCH_RECORDING (runs after
5 minutes to allow provider
to process recording)
          |
          v
Background job queued:
POST_SESSION_QUIZ_GENERATION
for all associated content items
          |
          v
Notification to all enrolled students:
"[Title] recording is now available"
(sent when recording URL is fetched)
```

## 2.5 Recording Access Flow

```
Recording processing job runs
5 minutes after session ends
          |
          v
Backend calls provider API to
fetch recording URL
          |
    ------+------
    |           |
Recording    Recording
not ready    ready
    |           |
    v           v
Retry in    Store recording_url
5 minutes   in LiveSession record
(up to 6        |
retries)        v
            Notify enrolled students:
            "Recording available for
            [Session Title]"
                |
                v
Student accesses recording from
session listing
                |
                v
Frontend loads video player with
recording URL
                |
                v
Watch progress tracked (same as
regular content via ContentAccessLog)
                |
                v
If student watches ≥70% of recording:
SessionAttendance status updated to
ATTENDED_RECORDING (if they didn't
attend live)
```

---

# 3. Data Model

## 3.1 LiveSessions Table

```sql
CREATE TABLE live_sessions (
  id                    UUID          PRIMARY KEY
                                      DEFAULT gen_random_uuid(),
  batch_id              UUID          NOT NULL
                                      REFERENCES batches(id),
  mentor_id             UUID          NOT NULL
                                      REFERENCES users(id),
  title                 VARCHAR(255)  NOT NULL,
  description           TEXT          DEFAULT NULL,
  scheduled_at          TIMESTAMP     NOT NULL,
  estimated_duration_minutes INTEGER  DEFAULT NULL,
  started_at            TIMESTAMP     DEFAULT NULL,
  ended_at              TIMESTAMP     DEFAULT NULL,
  status                VARCHAR(20)   NOT NULL DEFAULT 'SCHEDULED'
                                      CHECK (status IN (
                                        'SCHEDULED',
                                        'LIVE',
                                        'COMPLETED',
                                        'CANCELLED',
                                        'MISSED'
                                      )),
  streaming_provider    VARCHAR(20)   NOT NULL DEFAULT 'MUX'
                                      CHECK (streaming_provider IN (
                                        'MUX',
                                        'AGORA'
                                      )),
  stream_id             TEXT          DEFAULT NULL,
  stream_key            TEXT          DEFAULT NULL,
  playback_url          TEXT          DEFAULT NULL,
  recording_url         TEXT          DEFAULT NULL,
  recording_status      VARCHAR(20)   DEFAULT 'PENDING'
                                      CHECK (recording_status IN (
                                        'PENDING',
                                        'PROCESSING',
                                        'READY',
                                        'FAILED',
                                        'NOT_AVAILABLE'
                                      )),
  created_at            TIMESTAMP     NOT NULL DEFAULT NOW(),
  updated_at            TIMESTAMP     NOT NULL DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_live_sessions_batch_id
  ON live_sessions(batch_id);

CREATE INDEX idx_live_sessions_mentor_id
  ON live_sessions(mentor_id);

CREATE INDEX idx_live_sessions_status
  ON live_sessions(status)
  WHERE status IN ('SCHEDULED', 'LIVE');

CREATE INDEX idx_live_sessions_scheduled_at
  ON live_sessions(batch_id, scheduled_at DESC);

CREATE INDEX idx_live_sessions_recording_status
  ON live_sessions(recording_status)
  WHERE recording_status = 'PROCESSING';
```

### Column Definitions

**id:** UUID primary key.

**batch_id:** The batch this session belongs to. Only students
enrolled in this batch can join.

**mentor_id:** The mentor conducting this session. Only this mentor
(or admins) can start, end, or cancel the session.

**title:** Display title shown to students. Required, max 255 chars.

**description:** Optional session agenda or topics to be covered.
Shown to students before they join.

**scheduled_at:** The planned start time. Students see this in their
session listing. Used to send reminder notifications 30 minutes before.

**estimated_duration_minutes:** Optional. Used to display expected
session length to students. Does not enforce any time limit.

**started_at:** Actual start time when the mentor clicked Start Stream.
May differ from scheduled_at if mentor starts early or late.

**ended_at:** Actual end time when the mentor clicked End Stream.

**status:** Current lifecycle status. Transitions:
SCHEDULED → LIVE → COMPLETED
SCHEDULED → CANCELLED
SCHEDULED → MISSED (auto, if not started within 30 min of scheduled time)

**streaming_provider:** MUX or AGORA. Selected at session creation
based on platform configuration.

**stream_id:** The streaming provider's internal ID for this stream.
Used to call provider APIs (stop stream, fetch recording).

**stream_key:** The mentor's stream key for publishing. Only returned
to the authenticated mentor, never to students.

**playback_url:** The URL students use to watch the stream.
Returned after stream starts.

**recording_url:** The URL for the session recording.
Populated after session ends and recording is processed.

**recording_status:** Tracks the recording processing lifecycle.

## 3.2 SessionAttendance Table

```sql
CREATE TABLE session_attendance (
  id                UUID        PRIMARY KEY
                                DEFAULT gen_random_uuid(),
  session_id        UUID        NOT NULL
                                REFERENCES live_sessions(id),
  student_id        UUID        NOT NULL
                                REFERENCES users(id),
  status            VARCHAR(25) NOT NULL DEFAULT 'ATTENDING'
                                CHECK (status IN (
                                  'ATTENDING',
                                  'ATTENDED',
                                  'ATTENDED_RECORDING',
                                  'ABSENT'
                                )),
  joined_at         TIMESTAMP   DEFAULT NULL,
  left_at           TIMESTAMP   DEFAULT NULL,
  duration_seconds  INTEGER     DEFAULT 0,
  recording_watch_percentage DECIMAL(5,2) DEFAULT 0,
  created_at        TIMESTAMP   NOT NULL DEFAULT NOW(),
  updated_at        TIMESTAMP   NOT NULL DEFAULT NOW()
);

-- One attendance record per student per session
CREATE UNIQUE INDEX idx_attendance_session_student
  ON session_attendance(session_id, student_id);

CREATE INDEX idx_attendance_session_id
  ON session_attendance(session_id);

CREATE INDEX idx_attendance_student_id
  ON session_attendance(student_id);

CREATE INDEX idx_attendance_status
  ON session_attendance(status);
```

### Column Definitions

**id:** UUID primary key.

**session_id:** The live session this attendance record belongs to.

**student_id:** The student this record belongs to.

**status:**

- ATTENDING: Student is currently in the session (no left_at yet)
- ATTENDED: Student attended the live session
- ATTENDED_RECORDING: Student watched the recording (≥70%)
- ABSENT: Student did not attend live or watch recording

**joined_at:** When the student joined the live stream.
NULL if they only watched the recording.

**left_at:** When the student left the live stream.
NULL if they are still in the session.

**duration_seconds:** Total live attendance duration.
Calculated as left_at - joined_at (or ended_at - joined_at if
student was still in when session ended).

**recording_watch_percentage:** How much of the recording the
student watched. Updated as they watch.

## 3.3 SessionContentLinks Table

Links live sessions to specific content items they cover.
This enables the post-session quiz generation to know which
content's quizzes to generate after the session ends.

```sql
CREATE TABLE session_content_links (
  id          UUID      PRIMARY KEY
                        DEFAULT gen_random_uuid(),
  session_id  UUID      NOT NULL
                        REFERENCES live_sessions(id)
                        ON DELETE CASCADE,
  content_id  UUID      NOT NULL
                        REFERENCES content(id),
  created_at  TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE UNIQUE INDEX idx_session_content_session_content
  ON session_content_links(session_id, content_id);

CREATE INDEX idx_session_content_session_id
  ON session_content_links(session_id);
```

## 3.4 Prisma Schema

```prisma
model LiveSession {
  id                        String          @id
                                            @default(dbgenerated(
                                              "gen_random_uuid()"))
                                            @db.Uuid
  batchId                   String          @map("batch_id") @db.Uuid
  mentorId                  String          @map("mentor_id") @db.Uuid
  title                     String          @db.VarChar(255)
  description               String?         @db.Text
  scheduledAt               DateTime        @map("scheduled_at")
  estimatedDurationMinutes  Int?            @map(
                                              "estimated_duration_minutes")
  startedAt                 DateTime?       @map("started_at")
  endedAt                   DateTime?       @map("ended_at")
  status                    SessionStatus   @default(SCHEDULED)
  streamingProvider         StreamingProvider @default(MUX)
                                            @map("streaming_provider")
  streamId                  String?         @map("stream_id") @db.Text
  streamKey                 String?         @map("stream_key") @db.Text
  playbackUrl               String?         @map("playback_url") @db.Text
  recordingUrl              String?         @map("recording_url") @db.Text
  recordingStatus           RecordingStatus @default(PENDING)
                                            @map("recording_status")
  createdAt                 DateTime        @default(now())
                                            @map("created_at")
  updatedAt                 DateTime        @updatedAt @map("updated_at")

  batch         Batch                  @relation(
                                         fields: [batchId],
                                         references: [id])
  mentor        User                   @relation(
                                         fields: [mentorId],
                                         references: [id])
  attendance    SessionAttendance[]
  contentLinks  SessionContentLink[]

  @@map("live_sessions")
}

model SessionAttendance {
  id                        String    @id
                                      @default(dbgenerated(
                                        "gen_random_uuid()"))
                                      @db.Uuid
  sessionId                 String    @map("session_id") @db.Uuid
  studentId                 String    @map("student_id") @db.Uuid
  status                    AttendanceStatus @default(ATTENDING)
  joinedAt                  DateTime? @map("joined_at")
  leftAt                    DateTime? @map("left_at")
  durationSeconds           Int       @default(0)
                                      @map("duration_seconds")
  recordingWatchPercentage  Decimal   @default(0)
                                      @map("recording_watch_percentage")
                                      @db.Decimal(5, 2)
  createdAt                 DateTime  @default(now())
                                      @map("created_at")
  updatedAt                 DateTime  @updatedAt @map("updated_at")

  session   LiveSession @relation(fields: [sessionId],
                                  references: [id])
  student   User        @relation(fields: [studentId],
                                  references: [id])

  @@unique([sessionId, studentId])
  @@map("session_attendance")
}

model SessionContentLink {
  id          String    @id
                        @default(dbgenerated("gen_random_uuid()"))
                        @db.Uuid
  sessionId   String    @map("session_id") @db.Uuid
  contentId   String    @map("content_id") @db.Uuid
  createdAt   DateTime  @default(now()) @map("created_at")

  session   LiveSession @relation(fields: [sessionId],
                                  references: [id],
                                  onDelete: Cascade)
  content   Content     @relation(fields: [contentId],
                                  references: [id])

  @@unique([sessionId, contentId])
  @@map("session_content_links")
}

enum SessionStatus {
  SCHEDULED
  LIVE
  COMPLETED
  CANCELLED
  MISSED
}

enum StreamingProvider {
  MUX
  AGORA
}

enum RecordingStatus {
  PENDING
  PROCESSING
  READY
  FAILED
  NOT_AVAILABLE
}

enum AttendanceStatus {
  ATTENDING
  ATTENDED
  ATTENDED_RECORDING
  ABSENT
}
```

---

# 4. API Endpoints

## 4.1 Session Management Endpoints

### POST /api/live-sessions

**Access:** MENTOR (assigned to batch), ADMIN, SUPER_ADMIN

**Purpose:** Schedule a new live session

**Request Body:**

```json
{
  "batch_id": "770f1234-a12b-43c5-d678-998877665544",
  "title": "Node.js Event Loop Deep Dive — Week 3",
  "description": "In this session we will dig deep into how the 
                  event loop works, explore the call stack, 
                  callback queue, and microtask queue with 
                  live demonstrations.",
  "scheduled_at": "2026-04-15T10:00:00Z",
  "estimated_duration_minutes": 90,
  "content_ids": [
    "content-uuid-1",
    "content-uuid-2"
  ]
}
```

**Validation Rules:**

```
batch_id                    : required, UUID, must be batch
                              mentor is assigned to
title                       : required, string, min 3, max 255
description                 : optional, string, max 2000
scheduled_at                : required, ISO 8601 datetime,
                              must be at least 15 minutes in future
estimated_duration_minutes  : optional, integer, min 15, max 480
content_ids                 : optional, array of UUIDs,
                              must belong to the same batch
```

**Success Response (201 Created):**

```json
{
  "success": true,
  "data": {
    "session_id": "990h3456-c34d-65e7-f890-110099887766",
    "batch_id": "770f1234-a12b-43c5-d678-998877665544",
    "title": "Node.js Event Loop Deep Dive — Week 3",
    "description": "In this session we will dig deep...",
    "scheduled_at": "2026-04-15T10:00:00Z",
    "estimated_duration_minutes": 90,
    "status": "SCHEDULED",
    "streaming_provider": "MUX",
    "linked_content": [
      {
        "content_id": "content-uuid-1",
        "title": "Understanding the Event Loop"
      }
    ],
    "created_at": "2026-03-21T10:00:00Z"
  },
  "message": "Session scheduled. Students have been notified."
}
```

**Error Responses:**

```json
// 400 - Scheduled time in past
{
  "success": false,
  "error": {
    "code": "INVALID_SCHEDULED_TIME",
    "message": "Session must be scheduled at least 15 minutes 
                in the future"
  }
}

// 409 - Batch already has a live session at this time
{
  "success": false,
  "error": {
    "code": "SESSION_TIME_CONFLICT",
    "message": "This batch already has a session scheduled 
                within 30 minutes of this time"
  }
}
```

---

### GET /api/batches/:batchId/live-sessions

**Access:** Authenticated users enrolled in or assigned to the batch

**Query Parameters:**

```
status    : filter by status (SCHEDULED, LIVE, COMPLETED,
            CANCELLED, MISSED)
upcoming  : boolean, if true return only future sessions
past      : boolean, if true return only past sessions
page      : page number (default: 1)
limit     : results per page (default: 20)
```

**Success Response (200 OK):**

```json
{
  "success": true,
  "data": {
    "sessions": [
      {
        "session_id": "990h3456-c34d-65e7-f890-110099887766",
        "title": "Node.js Event Loop Deep Dive — Week 3",
        "description": "In this session we will dig deep...",
        "scheduled_at": "2026-04-15T10:00:00Z",
        "estimated_duration_minutes": 90,
        "status": "SCHEDULED",
        "mentor": {
          "mentor_id": "mentor-uuid-1",
          "full_name": "Arjun Nair",
          "avatar_url": null
        },
        "linked_content_count": 2,
        "enrolled_students_count": 45,
        "is_live": false,
        "recording_available": false,
        "my_attendance": null
      },
      {
        "session_id": "880g2345-b23c-54d6-e789-009988776655",
        "title": "Introduction to Express.js — Week 2",
        "scheduled_at": "2026-04-08T10:00:00Z",
        "status": "COMPLETED",
        "is_live": false,
        "recording_available": true,
        "recording_url": "https://cdn.example.com/recordings/...",
        "actual_duration_minutes": 87,
        "my_attendance": {
          "status": "ATTENDED",
          "duration_seconds": 4980,
          "joined_at": "2026-04-08T10:02:00Z"
        }
      }
    ]
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

### GET /api/live-sessions/:sessionId

**Access:** Enrolled students and assigned mentors

**Purpose:** Fetch full session details including streaming URLs
for active sessions

**Success Response (200 OK) — For a LIVE session:**

```json
{
  "success": true,
  "data": {
    "session_id": "990h3456-c34d-65e7-f890-110099887766",
    "title": "Node.js Event Loop Deep Dive — Week 3",
    "description": "In this session we will dig deep...",
    "scheduled_at": "2026-04-15T10:00:00Z",
    "started_at": "2026-04-15T10:03:00Z",
    "status": "LIVE",
    "playback_url": "https://stream.mux.com/abc123.m3u8",
    "estimated_duration_minutes": 90,
    "mentor": {
      "mentor_id": "mentor-uuid-1",
      "full_name": "Arjun Nair",
      "avatar_url": null
    },
    "current_viewer_count": 38,
    "my_attendance": {
      "status": "ATTENDING",
      "joined_at": "2026-04-15T10:05:00Z"
    }
  }
}
```

**Note:** stream_key is NEVER returned to students.
It is only returned to the authenticated mentor who owns the session.

---

### PUT /api/live-sessions/:sessionId

**Access:** MENTOR (session owner), ADMIN, SUPER_ADMIN

**Purpose:** Update session details before it starts

**Request Body (all fields optional):**

```json
{
  "title": "Updated Session Title",
  "description": "Updated agenda...",
  "scheduled_at": "2026-04-15T11:00:00Z",
  "estimated_duration_minutes": 120,
  "content_ids": ["content-uuid-1", "content-uuid-3"]
}
```

**Business Rules:**

- Cannot update scheduled_at once session is LIVE or COMPLETED
- Cannot update a CANCELLED or MISSED session
- Updating scheduled_at sends a notification to enrolled students

**Success Response (200 OK):**

```json
{
  "success": true,
  "data": {
    "session_id": "990h3456-c34d-65e7-f890-110099887766",
    "title": "Updated Session Title",
    "scheduled_at": "2026-04-15T11:00:00Z",
    "updated_at": "2026-03-22T09:00:00Z"
  },
  "message": "Session updated. Students have been notified 
              of the schedule change."
}
```

---

### POST /api/live-sessions/:sessionId/cancel

**Access:** MENTOR (session owner), ADMIN, SUPER_ADMIN

**Purpose:** Cancel a scheduled session

**Request Body:**

```json
{
  "reason": "Mentor unavailable due to schedule conflict"
}
```

**Success Response (200 OK):**

```json
{
  "success": true,
  "data": {
    "session_id": "990h3456-c34d-65e7-f890-110099887766",
    "status": "CANCELLED"
  },
  "message": "Session cancelled. Students have been notified."
}
```

---

## 4.2 Session Streaming Endpoints

### POST /api/live-sessions/:sessionId/start

**Access:** MENTOR (session owner only), SUPER_ADMIN

**Purpose:** Start the live stream

**Request:** No body required.

**Business Rules:**

- Only the mentor who owns the session can start it
- Can only start within 15 minutes of scheduled_at (before or after)
- Only one LIVE session per batch at a time

**Processing:**

1. Call streaming provider API to create live stream
2. Receive stream_key and playback_url from provider
3. Update session: status = LIVE, started_at = NOW(),
   stream_key, playback_url, stream_id
4. Emit SESSION_STARTED Socket.io event to all batch students
5. Return stream_key to mentor (only time it's returned)

**Success Response (200 OK):**

```json
{
  "success": true,
  "data": {
    "session_id": "990h3456-c34d-65e7-f890-110099887766",
    "status": "LIVE",
    "started_at": "2026-04-15T10:03:00Z",
    "stream_key": "live_abc123xyz789_stream_key",
    "playback_url": "https://stream.mux.com/abc123.m3u8",
    "streaming_instructions": {
      "rtmp_url": "rtmps://global-live.mux.com:443/app",
      "stream_key": "live_abc123xyz789_stream_key",
      "recommended_settings": {
        "video_bitrate_kbps": 3000,
        "audio_bitrate_kbps": 128,
        "resolution": "1280x720",
        "fps": 30
      }
    }
  },
  "message": "Stream started. Students have been notified."
}
```

**Error Responses:**

```json
// 400 - Too early to start
{
  "success": false,
  "error": {
    "code": "TOO_EARLY_TO_START",
    "message": "Session can only be started within 15 minutes 
                of scheduled time. Scheduled for 10:00 AM, 
                current time is 9:40 AM."
  }
}

// 409 - Another session is already live
{
  "success": false,
  "error": {
    "code": "SESSION_ALREADY_LIVE",
    "message": "Another session is currently live for this batch. 
                End that session before starting a new one."
  }
}
```

---

### POST /api/live-sessions/:sessionId/end

**Access:** MENTOR (session owner only), SUPER_ADMIN

**Purpose:** End the live stream

**Request:** No body required.

**Processing:**

1. Call streaming provider API to stop the stream
2. Update session: status = COMPLETED, ended_at = NOW()
3. Close all open attendance records (set left_at = ended_at)
4. Queue FETCH_RECORDING job (runs after 5 minutes)
5. Queue POST_SESSION_QUIZ_GENERATION for linked content items
6. Emit SESSION_ENDED Socket.io event to all connected students

**Success Response (200 OK):**

```json
{
  "success": true,
  "data": {
    "session_id": "990h3456-c34d-65e7-f890-110099887766",
    "status": "COMPLETED",
    "ended_at": "2026-04-15T11:32:00Z",
    "actual_duration_minutes": 89,
    "attendance_summary": {
      "total_enrolled": 45,
      "attended_live": 38,
      "absent": 7
    }
  },
  "message": "Session ended. Recording will be available 
              within 10 minutes."
}
```

---

## 4.3 Attendance Endpoints

### POST /api/live-sessions/:sessionId/join

**Access:** STUDENT (enrolled in session's batch)

**Purpose:** Record student joining a live session

**Request:** No body required.

**Business Rules:**

- Session must be LIVE status
- Student must be enrolled in the session's batch
- Creates SessionAttendance record if not exists,
  or updates joined_at if re-joining after disconnect

**Success Response (200 OK):**

```json
{
  "success": true,
  "data": {
    "session_id": "990h3456-c34d-65e7-f890-110099887766",
    "playback_url": "https://stream.mux.com/abc123.m3u8",
    "joined_at": "2026-04-15T10:05:00Z",
    "session_title": "Node.js Event Loop Deep Dive — Week 3",
    "mentor_name": "Arjun Nair"
  }
}
```

**Error Responses:**

```json
// 400 - Session not live
{
  "success": false,
  "error": {
    "code": "SESSION_NOT_LIVE",
    "message": "This session is not currently live"
  }
}

// 403 - Not enrolled in batch
{
  "success": false,
  "error": {
    "code": "NOT_ENROLLED",
    "message": "You are not enrolled in the batch for this session"
  }
}
```

---

### POST /api/live-sessions/:sessionId/leave

**Access:** STUDENT

**Purpose:** Record student leaving a live session

**Request:** No body required.

**Success Response (200 OK):**

```json
{
  "success": true,
  "data": {
    "session_id": "990h3456-c34d-65e7-f890-110099887766",
    "left_at": "2026-04-15T11:30:00Z",
    "duration_seconds": 5100,
    "duration_minutes": 85
  }
}
```

---

### POST /api/live-sessions/:sessionId/heartbeat

**Access:** STUDENT

**Purpose:** Periodic heartbeat sent every 30 seconds to confirm
student is still actively watching. Used to handle cases where
student closes browser without triggering the leave event.

**Request:** No body required.

**Success Response (200 OK):**

```json
{
  "success": true,
  "data": {
    "session_status": "LIVE"
  }
}
```

**Note:** If session_status returns COMPLETED, the frontend
knows to stop sending heartbeats and show the session-ended UI.

---

### GET /api/live-sessions/:sessionId/attendance

**Access:** MENTOR (assigned to batch), ADMIN, SUPER_ADMIN

**Purpose:** Fetch attendance report for a session

**Success Response (200 OK):**

```json
{
  "success": true,
  "data": {
    "session_id": "990h3456-c34d-65e7-f890-110099887766",
    "session_title": "Node.js Event Loop Deep Dive — Week 3",
    "total_enrolled": 45,
    "attended_live": 38,
    "attended_recording": 4,
    "absent": 3,
    "average_duration_minutes": 82,
    "attendance_records": [
      {
        "student_id": "student-uuid-1",
        "full_name": "Rahul Sharma",
        "email": "rahul@example.com",
        "status": "ATTENDED",
        "joined_at": "2026-04-15T10:02:00Z",
        "left_at": "2026-04-15T11:32:00Z",
        "duration_seconds": 5400,
        "duration_minutes": 90
      },
      {
        "student_id": "student-uuid-2",
        "full_name": "Priya Patel",
        "email": "priya@example.com",
        "status": "ATTENDED_RECORDING",
        "joined_at": null,
        "left_at": null,
        "duration_seconds": 0,
        "recording_watch_percentage": 84.5
      },
      {
        "student_id": "student-uuid-3",
        "full_name": "Amit Singh",
        "email": "amit@example.com",
        "status": "ABSENT",
        "joined_at": null,
        "left_at": null,
        "duration_seconds": 0,
        "recording_watch_percentage": 0
      }
    ]
  }
}
```

---

### PATCH /api/live-sessions/:sessionId/recording-progress

**Access:** STUDENT

**Purpose:** Update recording watch progress — mirrors the content
progress endpoint from Feature 03 but for session recordings.

**Request Body:**

```json
{
  "current_position_seconds": 2400,
  "session_watch_time_seconds": 30
}
```

**Success Response (200 OK):**

```json
{
  "success": true,
  "data": {
    "recording_watch_percentage": 45.8,
    "attendance_status": "ATTENDED_RECORDING"
  }
}
```

---

# 5. Frontend Components

## 5.1 Component Structure

```
src/
├── app/
│   ├── mentor/
│   │   └── sessions/
│   │       ├── page.tsx               (session list)
│   │       ├── schedule/
│   │       │   └── page.tsx           (schedule new session)
│   │       └── [sessionId]/
│   │           ├── page.tsx           (session detail/stream)
│   │           └── attendance/
│   │               └── page.tsx       (attendance report)
│   └── student/
│       └── sessions/
│           ├── page.tsx               (session listing)
│           └── [sessionId]/
│               └── page.tsx           (join/watch session)
├── components/
│   └── sessions/
│       ├── SessionCard.tsx
│       ├── SessionStatusBadge.tsx
│       ├── SessionList.tsx
│       ├── ScheduleSessionForm.tsx
│       ├── MentorStreamingInterface.tsx
│       ├── StudentSessionViewer.tsx
│       ├── AttendanceReport.tsx
│       ├── LiveBadge.tsx
│       ├── CountdownTimer.tsx
│       └── SessionReminderBanner.tsx
└── hooks/
    ├── useSession.ts
    ├── useLiveSession.ts
    └── useHeartbeat.ts
```

## 5.2 SessionCard Component

Displayed in the session listing for both mentors and students.
Shows session status, timing, and relevant action buttons.

```tsx
// components/sessions/SessionCard.tsx
"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import SessionStatusBadge from "./SessionStatusBadge";
import CountdownTimer from "./CountdownTimer";

type Session = {
  session_id: string;
  title: string;
  description: string | null;
  scheduled_at: string;
  estimated_duration_minutes: number | null;
  status: string;
  mentor: {
    full_name: string;
    avatar_url: string | null;
  };
  is_live: boolean;
  recording_available: boolean;
  recording_url?: string;
  my_attendance?: {
    status: string;
    duration_seconds: number;
  } | null;
};

type Props = {
  session: Session;
  userRole: "STUDENT" | "MENTOR" | "ADMIN";
  onJoin?: (sessionId: string) => void;
};

export default function SessionCard({
  session,
  userRole,
  onJoin,
}: Props) {
  const router = useRouter();
  const scheduledDate = new Date(session.scheduled_at);
  const now = new Date();
  const minutesUntil = Math.floor(
    (scheduledDate.getTime() - now.getTime()) / (1000 * 60)
  );
  const isUpcoming = minutesUntil > 0 && minutesUntil <= 60;

  const formatDate = (date: Date) => {
    return date.toLocaleDateString("en-IN", {
      weekday: "short",
      day: "numeric",
      month: "short",
      year: "numeric",
    });
  };

  const formatTime = (date: Date) => {
    return date.toLocaleTimeString("en-IN", {
      hour: "2-digit",
      minute: "2-digit",
      hour12: true,
    });
  };

  return (
    <div
      style={{
        border: `1px solid ${session.is_live ? "#059669" : "#E5E7EB"}`,
        borderRadius: "12px",
        padding: "1.25rem",
        background: session.is_live ? "#F0FDF4" : "#FFFFFF",
        position: "relative",
        transition: "border-color 0.2s",
      }}
    >
      {/* Live indicator */}
      {session.is_live && (
        <div
          style={{
            position: "absolute",
            top: "12px",
            right: "12px",
            display: "flex",
            alignItems: "center",
            gap: "6px",
            background: "#059669",
            color: "white",
            padding: "4px 10px",
            borderRadius: "9999px",
            fontSize: "12px",
            fontWeight: 600,
          }}
        >
          <span
            style={{
              width: "8px",
              height: "8px",
              borderRadius: "50%",
              background: "white",
              animation: "pulse 1.5s infinite",
            }}
          />
          LIVE
        </div>
      )}

      {/* Header */}
      <div style={{ marginBottom: "0.75rem" }}>
        <h3
          style={{
            fontSize: "16px",
            fontWeight: 500,
            margin: 0,
            paddingRight: session.is_live ? "80px" : "0",
          }}
        >
          {session.title}
        </h3>
        <p
          style={{
            fontSize: "13px",
            color: "#6B7280",
            marginTop: "4px",
          }}
        >
          with {session.mentor.full_name}
        </p>
      </div>

      {/* Date and time */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: "8px",
          marginBottom: "0.75rem",
        }}
      >
        <span style={{ fontSize: "13px", color: "#374151" }}>
          {formatDate(scheduledDate)} at {formatTime(scheduledDate)}
        </span>
        {session.estimated_duration_minutes && (
          <span style={{ fontSize: "12px", color: "#9CA3AF" }}>
            (~{session.estimated_duration_minutes} min)
          </span>
        )}
      </div>

      {/* Countdown for upcoming sessions */}
      {isUpcoming && session.status === "SCHEDULED" && (
        <CountdownTimer
          targetTime={session.scheduled_at}
          label="Starting in"
        />
      )}

      {/* Status badge */}
      <div style={{ marginBottom: "1rem" }}>
        <SessionStatusBadge status={session.status} />
        {session.my_attendance && (
          <span
            style={{
              marginLeft: "8px",
              fontSize: "12px",
              color: "#059669",
            }}
          >
            {session.my_attendance.status === "ATTENDED"
              ? `Attended (${Math.round(
                  session.my_attendance.duration_seconds / 60
                )} min)`
              : session.my_attendance.status === "ATTENDED_RECORDING"
              ? "Watched recording"
              : ""}
          </span>
        )}
      </div>

      {/* Description */}
      {session.description && (
        <p
          style={{
            fontSize: "13px",
            color: "#6B7280",
            marginBottom: "1rem",
            lineHeight: 1.5,
          }}
        >
          {session.description.length > 120
            ? `${session.description.slice(0, 120)}...`
            : session.description}
        </p>
      )}

      {/* Action Buttons */}
      <div style={{ display: "flex", gap: "8px" }}>
        {/* Student: Join live session */}
        {userRole === "STUDENT" && session.is_live && (
          <button
            onClick={() => onJoin?.(session.session_id)}
            style={{
              flex: 1,
              padding: "10px",
              borderRadius: "8px",
              border: "none",
              background: "#059669",
              color: "white",
              fontSize: "14px",
              fontWeight: 500,
              cursor: "pointer",
            }}
          >
            Join Live Session
          </button>
        )}

        {/* Student: Watch recording */}
        {userRole === "STUDENT" &&
          session.recording_available &&
          !session.is_live && (
            <button
              onClick={() =>
                router.push(`/student/sessions/${session.session_id}`)
              }
              style={{
                flex: 1,
                padding: "10px",
                borderRadius: "8px",
                border: "1px solid #D1D5DB",
                background: "#F9FAFB",
                color: "#374151",
                fontSize: "14px",
                cursor: "pointer",
              }}
            >
              Watch Recording
            </button>
          )}

        {/* Mentor: Go to streaming page */}
        {userRole === "MENTOR" && (
          <button
            onClick={() =>
              router.push(
                `/mentor/sessions/${session.session_id}`
              )
            }
            style={{
              flex: 1,
              padding: "10px",
              borderRadius: "8px",
              border: "1px solid #D1D5DB",
              background: "#F9FAFB",
              color: "#374151",
              fontSize: "14px",
              cursor: "pointer",
            }}
          >
            {session.status === "LIVE"
              ? "Manage Stream"
              : session.status === "COMPLETED"
              ? "View Report"
              : "Manage Session"}
          </button>
        )}
      </div>
    </div>
  );
}
```

## 5.3 MentorStreamingInterface Component

The mentor's interface for managing the live stream —
showing the stream key, start/end controls, and live
attendee count.

```tsx
// components/sessions/MentorStreamingInterface.tsx
"use client";

import { useState, useEffect } from "react";
import api from "@/lib/api";

type StreamingData = {
  stream_key: string;
  playback_url: string;
  streaming_instructions: {
    rtmp_url: string;
    stream_key: string;
    recommended_settings: {
      video_bitrate_kbps: number;
      audio_bitrate_kbps: number;
      resolution: string;
      fps: number;
    };
  };
};

type Props = {
  sessionId: string;
  sessionTitle: string;
  scheduledAt: string;
  currentStatus: string;
  onStreamStarted: (data: StreamingData) => void;
  onStreamEnded: (summary: any) => void;
};

export default function MentorStreamingInterface({
  sessionId,
  sessionTitle,
  scheduledAt,
  currentStatus,
  onStreamStarted,
  onStreamEnded,
}: Props) {
  const [status, setStatus] = useState(currentStatus);
  const [streamingData, setStreamingData] =
    useState<StreamingData | null>(null);
  const [isStarting, setIsStarting] = useState(false);
  const [isEnding, setIsEnding] = useState(false);
  const [showEndConfirm, setShowEndConfirm] = useState(false);
  const [liveMinutes, setLiveMinutes] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [keyVisible, setKeyVisible] = useState(false);

  // Track live duration
  useEffect(() => {
    if (status !== "LIVE") return;

    const interval = setInterval(() => {
      setLiveMinutes((prev) => prev + 1);
    }, 60000);

    return () => clearInterval(interval);
  }, [status]);

  const handleStartStream = async () => {
    setIsStarting(true);
    setError(null);

    try {
      const response = await api.post(
        `/api/live-sessions/${sessionId}/start`
      );
      const data = response.data.data;
      setStreamingData(data);
      setStatus("LIVE");
      onStreamStarted(data);
    } catch (err: any) {
      setError(
        err.response?.data?.error?.message ??
        "Failed to start stream. Please try again."
      );
    } finally {
      setIsStarting(false);
    }
  };

  const handleEndStream = async () => {
    setIsEnding(true);
    setError(null);

    try {
      const response = await api.post(
        `/api/live-sessions/${sessionId}/end`
      );
      setStatus("COMPLETED");
      setStreamingData(null);
      onStreamEnded(response.data.data);
    } catch (err: any) {
      setError(
        err.response?.data?.error?.message ??
        "Failed to end stream. Please try again."
      );
    } finally {
      setIsEnding(false);
      setShowEndConfirm(false);
    }
  };

  const scheduledDate = new Date(scheduledAt);
  const now = new Date();
  const minutesUntil = Math.floor(
    (scheduledDate.getTime() - now.getTime()) / (1000 * 60)
  );
  const canStart =
    status === "SCHEDULED" && minutesUntil <= 15;

  return (
    <div style={{ maxWidth: "640px" }}>
      {/* Session Status Header */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          marginBottom: "1.5rem",
        }}
      >
        <div>
          <h2 style={{ fontSize: "20px", fontWeight: 500, margin: 0 }}>
            {sessionTitle}
          </h2>
          <p style={{ fontSize: "13px", color: "#6B7280", marginTop: "4px" }}>
            {status === "LIVE"
              ? `Live for ${liveMinutes} minute${liveMinutes !== 1 ? "s" : ""}`
              : status === "COMPLETED"
              ? "Session completed"
              : `Scheduled for ${scheduledDate.toLocaleTimeString(
                  "en-IN",
                  { hour: "2-digit", minute: "2-digit", hour12: true }
                )}`}
          </p>
        </div>

        {status === "LIVE" && (
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "6px",
              background: "#059669",
              color: "white",
              padding: "6px 14px",
              borderRadius: "9999px",
              fontSize: "13px",
              fontWeight: 600,
            }}
          >
            <span
              style={{
                width: "8px",
                height: "8px",
                borderRadius: "50%",
                background: "white",
              }}
            />
            LIVE
          </div>
        )}
      </div>

      {/* Start Stream Panel */}
      {status === "SCHEDULED" && (
        <div
          style={{
            padding: "1.5rem",
            background: "#F9FAFB",
            borderRadius: "12px",
            border: "1px solid #E5E7EB",
            marginBottom: "1.5rem",
          }}
        >
          <h3 style={{ fontSize: "15px", fontWeight: 500, marginBottom: "1rem" }}>
            Ready to go live?
          </h3>

          {!canStart && minutesUntil > 15 && (
            <div
              style={{
                padding: "10px",
                background: "#FEF3C7",
                borderRadius: "8px",
                marginBottom: "1rem",
              }}
            >
              <p style={{ fontSize: "13px", color: "#92400E" }}>
                You can start the stream 15 minutes before the 
                scheduled time. {minutesUntil} minutes remaining.
              </p>
            </div>
          )}

          <p style={{ fontSize: "13px", color: "#6B7280", marginBottom: "1rem" }}>
            You will need streaming software (OBS Studio, Streamlabs,
            or similar) or use browser-based streaming. Your stream
            key will be provided when you click Start.
          </p>

          <button
            onClick={handleStartStream}
            disabled={isStarting || !canStart}
            style={{
              width: "100%",
              padding: "12px",
              borderRadius: "8px",
              border: "none",
              background: canStart ? "#059669" : "#D1D5DB",
              color: "white",
              fontSize: "15px",
              fontWeight: 500,
              cursor: canStart ? "pointer" : "not-allowed",
            }}
          >
            {isStarting ? "Starting Stream..." : "Start Stream"}
          </button>
        </div>
      )}

      {/* Active Stream Panel */}
      {status === "LIVE" && streamingData && (
        <div>
          {/* Stream Key */}
          <div
            style={{
              padding: "1.25rem",
              background: "#F9FAFB",
              borderRadius: "12px",
              border: "1px solid #E5E7EB",
              marginBottom: "1rem",
            }}
          >
            <h3
              style={{
                fontSize: "14px",
                fontWeight: 500,
                marginBottom: "0.75rem",
              }}
            >
              Your Streaming Setup
            </h3>

            {/* RTMP URL */}
            <div style={{ marginBottom: "0.75rem" }}>
              <label
                style={{
                  fontSize: "12px",
                  color: "#6B7280",
                  display: "block",
                  marginBottom: "4px",
                }}
              >
                RTMP URL
              </label>
              <div
                style={{
                  display: "flex",
                  gap: "8px",
                  alignItems: "center",
                }}
              >
                <code
                  style={{
                    flex: 1,
                    padding: "8px",
                    background: "#F3F4F6",
                    borderRadius: "6px",
                    fontSize: "12px",
                    overflowX: "auto",
                  }}
                >
                  {streamingData.streaming_instructions.rtmp_url}
                </code>
                <button
                  onClick={() =>
                    navigator.clipboard.writeText(
                      streamingData.streaming_instructions.rtmp_url
                    )
                  }
                  style={{
                    padding: "8px 12px",
                    borderRadius: "6px",
                    border: "1px solid #D1D5DB",
                    background: "white",
                    fontSize: "12px",
                    cursor: "pointer",
                  }}
                >
                  Copy
                </button>
              </div>
            </div>

            {/* Stream Key */}
            <div>
              <label
                style={{
                  fontSize: "12px",
                  color: "#6B7280",
                  display: "block",
                  marginBottom: "4px",
                }}
              >
                Stream Key (keep private)
              </label>
              <div
                style={{
                  display: "flex",
                  gap: "8px",
                  alignItems: "center",
                }}
              >
                <code
                  style={{
                    flex: 1,
                    padding: "8px",
                    background: "#F3F4F6",
                    borderRadius: "6px",
                    fontSize: "12px",
                    overflowX: "auto",
                    filter: keyVisible ? "none" : "blur(4px)",
                    userSelect: keyVisible ? "text" : "none",
                  }}
                >
                  {streamingData.streaming_instructions.stream_key}
                </code>
                <button
                  onClick={() => setKeyVisible(!keyVisible)}
                  style={{
                    padding: "8px 12px",
                    borderRadius: "6px",
                    border: "1px solid #D1D5DB",
                    background: "white",
                    fontSize: "12px",
                    cursor: "pointer",
                  }}
                >
                  {keyVisible ? "Hide" : "Show"}
                </button>
                {keyVisible && (
                  <button
                    onClick={() =>
                      navigator.clipboard.writeText(
                        streamingData.streaming_instructions.stream_key
                      )
                    }
                    style={{
                      padding: "8px 12px",
                      borderRadius: "6px",
                      border: "1px solid #D1D5DB",
                      background: "white",
                      fontSize: "12px",
                      cursor: "pointer",
                    }}
                  >
                    Copy
                  </button>
                )}
              </div>
            </div>

            {/* Recommended Settings */}
            <div
              style={{
                marginTop: "0.75rem",
                padding: "10px",
                background: "#EEF2FF",
                borderRadius: "6px",
              }}
            >
              <p
                style={{
                  fontSize: "12px",
                  color: "#4338CA",
                  fontWeight: 500,
                  marginBottom: "4px",
                }}
              >
                Recommended OBS Settings:
              </p>
              <p style={{ fontSize: "12px", color: "#4338CA" }}>
                {streamingData.streaming_instructions
                  .recommended_settings.resolution}{" "}
                @{" "}
                {
                  streamingData.streaming_instructions
                    .recommended_settings.fps
                }{" "}
                fps •{" "}
                {
                  streamingData.streaming_instructions
                    .recommended_settings.video_bitrate_kbps
                }{" "}
                kbps video •{" "}
                {
                  streamingData.streaming_instructions
                    .recommended_settings.audio_bitrate_kbps
                }{" "}
                kbps audio
              </p>
            </div>
          </div>

          {/* End Stream */}
          {!showEndConfirm ? (
            <button
              onClick={() => setShowEndConfirm(true)}
              style={{
                width: "100%",
                padding: "12px",
                borderRadius: "8px",
                border: "1px solid #FCA5A5",
                background: "#FEF2F2",
                color: "#DC2626",
                fontSize: "15px",
                fontWeight: 500,
                cursor: "pointer",
              }}
            >
              End Stream
            </button>
          ) : (
            <div
              style={{
                padding: "1.25rem",
                background: "#FEF2F2",
                borderRadius: "12px",
                border: "1px solid #FCA5A5",
              }}
            >
              <p
                style={{
                  fontSize: "14px",
                  fontWeight: 500,
                  color: "#991B1B",
                  marginBottom: "1rem",
                }}
              >
                End this session? The recording will be saved
                automatically and students will be notified.
              </p>
              <div style={{ display: "flex", gap: "8px" }}>
                <button
                  onClick={() => setShowEndConfirm(false)}
                  style={{
                    flex: 1,
                    padding: "10px",
                    borderRadius: "8px",
                    border: "1px solid #D1D5DB",
                    background: "white",
                    fontSize: "14px",
                    cursor: "pointer",
                  }}
                >
                  Cancel
                </button>
                <button
                  onClick={handleEndStream}
                  disabled={isEnding}
                  style={{
                    flex: 1,
                    padding: "10px",
                    borderRadius: "8px",
                    border: "none",
                    background: "#DC2626",
                    color: "white",
                    fontSize: "14px",
                    fontWeight: 500,
                    cursor: "pointer",
                  }}
                >
                  {isEnding ? "Ending..." : "Yes, End Session"}
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Completed Panel */}
      {status === "COMPLETED" && (
        <div
          style={{
            padding: "1.5rem",
            background: "#F0FDF4",
            borderRadius: "12px",
            border: "1px solid #BBF7D0",
            textAlign: "center",
          }}
        >
          <p
            style={{
              fontSize: "16px",
              fontWeight: 500,
              color: "#065F46",
              marginBottom: "8px",
            }}
          >
            Session completed successfully
          </p>
          <p style={{ fontSize: "13px", color: "#047857" }}>
            The recording is being processed and will be available
            to students within 10 minutes.
          </p>
        </div>
      )}

      {/* Error */}
      {error && (
        <div
          role="alert"
          style={{
            padding: "12px",
            background: "#FEF2F2",
            borderRadius: "8px",
            marginTop: "1rem",
          }}
        >
          <p style={{ fontSize: "13px", color: "#DC2626" }}>
            {error}
          </p>
        </div>
      )}
    </div>
  );
}
```

## 5.4 useHeartbeat Hook

Sends periodic heartbeats to the server to confirm the student
is still actively watching a live session.

```typescript
// hooks/useHeartbeat.ts
"use client";

import { useEffect, useRef } from "react";
import api from "@/lib/api";

export function useHeartbeat(
  sessionId: string | null,
  isActive: boolean,
  intervalSeconds = 30
) {
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    if (!sessionId || !isActive) {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
      return;
    }

    const sendHeartbeat = async () => {
      try {
        const response = await api.post(
          `/api/live-sessions/${sessionId}/heartbeat`
        );
        // If session has ended, stop heartbeat
        if (
          response.data.data.session_status !== "LIVE"
        ) {
          if (intervalRef.current) {
            clearInterval(intervalRef.current);
            intervalRef.current = null;
          }
        }
      } catch {
        // Silently fail — heartbeat loss should not
        // disrupt the viewing experience
      }
    };

    // Send immediately and then on interval
    sendHeartbeat();
    intervalRef.current = setInterval(
      sendHeartbeat,
      intervalSeconds * 1000
    );

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [sessionId, isActive, intervalSeconds]);
}
```

## 5.5 CountdownTimer Component

Shows a countdown to an upcoming session start time.

```tsx
// components/sessions/CountdownTimer.tsx
"use client";

import { useState, useEffect } from "react";

type Props = {
  targetTime: string;
  label: string;
};

export default function CountdownTimer({ targetTime, label }: Props) {
  const [timeLeft, setTimeLeft] = useState({
    hours: 0,
    minutes: 0,
    seconds: 0,
  });

  useEffect(() => {
    const target = new Date(targetTime).getTime();

    const calculate = () => {
      const now = Date.now();
      const diff = target - now;

      if (diff <= 0) {
        setTimeLeft({ hours: 0, minutes: 0, seconds: 0 });
        return;
      }

      const hours = Math.floor(diff / (1000 * 60 * 60));
      const minutes = Math.floor(
        (diff % (1000 * 60 * 60)) / (1000 * 60)
      );
      const seconds = Math.floor((diff % (1000 * 60)) / 1000);

      setTimeLeft({ hours, minutes, seconds });
    };

    calculate();
    const interval = setInterval(calculate, 1000);
    return () => clearInterval(interval);
  }, [targetTime]);

  const pad = (n: number) => String(n).padStart(2, "0");

  return (
    <div
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: "8px",
        padding: "6px 12px",
        background: "#EEF2FF",
        borderRadius: "8px",
        marginBottom: "0.75rem",
      }}
    >
      <span style={{ fontSize: "12px", color: "#4338CA" }}>
        {label}:
      </span>
      <span
        style={{
          fontSize: "14px",
          fontWeight: 600,
          color: "#4338CA",
          fontVariantNumeric: "tabular-nums",
        }}
      >
        {timeLeft.hours > 0 && `${pad(timeLeft.hours)}:`}
        {pad(timeLeft.minutes)}:{pad(timeLeft.seconds)}
      </span>
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
│   └── liveSession.controller.ts
├── services/
│   └── liveSession.service.ts
├── workers/
│   └── recordingFetch.worker.ts
├── validators/
│   └── liveSession.validator.ts
├── routes/
│   └── liveSession.routes.ts
└── utils/
    └── streamingProvider.utils.ts
```

## 6.2 Live Session Service

```typescript
// services/liveSession.service.ts
import { PrismaClient } from "@prisma/client";
import { streamingProvider } from
  "../utils/streamingProvider.utils";
import { notificationService } from
  "../services/notification.service";
import { sessionQueue } from "../queues/session.queue";
import { contentQueue } from "../queues/content.queue";

const prisma = new PrismaClient();

export class LiveSessionService {

  // -------------------------------------------------------
  // SCHEDULE SESSION
  // -------------------------------------------------------
  async scheduleSession(data: {
    batch_id: string;
    mentor_id: string;
    title: string;
    description?: string;
    scheduled_at: string;
    estimated_duration_minutes?: number;
    content_ids?: string[];
  }) {
    const scheduledAt = new Date(data.scheduled_at);

    // Validate batch access
    await this.verifyMentorBatchAccess(
      data.batch_id,
      data.mentor_id
    );

    // Check for time conflicts within same batch
    const conflict = await prisma.liveSession.findFirst({
      where: {
        batchId: data.batch_id,
        status: { in: ["SCHEDULED", "LIVE"] },
        scheduledAt: {
          gte: new Date(scheduledAt.getTime() - 30 * 60 * 1000),
          lte: new Date(scheduledAt.getTime() + 30 * 60 * 1000),
        },
      },
    });

    if (conflict) {
      throw {
        code: "SESSION_TIME_CONFLICT",
        message:
          "This batch already has a session scheduled within " +
          "30 minutes of this time",
        statusCode: 409,
      };
    }

    // Create session
    const session = await prisma.liveSession.create({
      data: {
        batchId: data.batch_id,
        mentorId: data.mentor_id,
        title: data.title,
        description: data.description ?? null,
        scheduledAt,
        estimatedDurationMinutes:
          data.estimated_duration_minutes ?? null,
        status: "SCHEDULED",
        streamingProvider: (process.env.STREAMING_PROVIDER ??
          "MUX") as any,
      },
    });

    // Link content items if provided
    if (data.content_ids && data.content_ids.length > 0) {
      await prisma.sessionContentLink.createMany({
        data: data.content_ids.map((contentId) => ({
          sessionId: session.id,
          contentId,
        })),
        skipDuplicates: true,
      });
    }

    // Schedule reminder notification job
    const reminderTime = new Date(
      scheduledAt.getTime() - 30 * 60 * 1000
    );

    if (reminderTime > new Date()) {
      await sessionQueue.add(
        "SEND_SESSION_REMINDER",
        { session_id: session.id },
        { delay: reminderTime.getTime() - Date.now() }
      );
    }

    // Notify enrolled students immediately
    await this.notifyBatchStudents(
      data.batch_id,
      "SESSION_SCHEDULED",
      `New live session: "${data.title}" scheduled for 
       ${scheduledAt.toLocaleDateString("en-IN")} at 
       ${scheduledAt.toLocaleTimeString("en-IN")}`,
      { session_id: session.id }
    );

    return this.formatSession(session);
  }

  // -------------------------------------------------------
  // START STREAM
  // -------------------------------------------------------
  async startStream(sessionId: string, mentorId: string) {
    const session = await this.findSession(sessionId);

    // Only the owning mentor can start
    if (session.mentorId !== mentorId) {
      const user = await prisma.user.findUnique({
        where: { id: mentorId },
        select: { role: true },
      });
      if (
        user?.role !== "ADMIN" &&
        user?.role !== "SUPER_ADMIN"
      ) {
        throw { code: "PERMISSION_DENIED", statusCode: 403 };
      }
    }

    if (session.status !== "SCHEDULED") {
      throw {
        code: "INVALID_SESSION_STATUS",
        message: `Cannot start a session with status: ${session.status}`,
        statusCode: 400,
      };
    }

    // Check timing (within 15 minutes of scheduled time)
    const now = new Date();
    const minutesUntil = Math.floor(
      (session.scheduledAt.getTime() - now.getTime()) / (1000 * 60)
    );

    if (minutesUntil > 15) {
      throw {
        code: "TOO_EARLY_TO_START",
        message: `Session can only be started within 15 minutes 
                  of scheduled time. Currently ${minutesUntil} 
                  minutes away.`,
        statusCode: 400,
      };
    }

    // Check no other live session for this batch
    const liveSession = await prisma.liveSession.findFirst({
      where: {
        batchId: session.batchId,
        status: "LIVE",
        id: { not: sessionId },
      },
    });

    if (liveSession) {
      throw {
        code: "SESSION_ALREADY_LIVE",
        message: "Another session is currently live for this batch.",
        statusCode: 409,
      };
    }

    // Create stream with provider
    const streamData = await streamingProvider.createStream({
      title: session.title,
      sessionId: session.id,
    });

    // Update session
    await prisma.liveSession.update({
      where: { id: sessionId },
      data: {
        status: "LIVE",
        startedAt: now,
        streamId: streamData.stream_id,
        streamKey: streamData.stream_key,
        playbackUrl: streamData.playback_url,
        recordingStatus: "PENDING",
      },
    });

    // Emit Socket.io event to all batch students
    await this.emitToSession(sessionId, "SESSION_STARTED", {
      session_id: sessionId,
      title: session.title,
      playback_url: streamData.playback_url,
    });

    return {
      session_id: sessionId,
      status: "LIVE",
      started_at: now,
      stream_key: streamData.stream_key,
      playback_url: streamData.playback_url,
      streaming_instructions: streamData.streaming_instructions,
    };
  }

  // -------------------------------------------------------
  // END STREAM
  // -------------------------------------------------------
  async endStream(sessionId: string, mentorId: string) {
    const session = await this.findSession(sessionId);

    if (session.mentorId !== mentorId) {
      const user = await prisma.user.findUnique({
        where: { id: mentorId },
        select: { role: true },
      });
      if (
        user?.role !== "ADMIN" &&
        user?.role !== "SUPER_ADMIN"
      ) {
        throw { code: "PERMISSION_DENIED", statusCode: 403 };
      }
    }

    if (session.status !== "LIVE") {
      throw {
        code: "SESSION_NOT_LIVE",
        message: "Only live sessions can be ended",
        statusCode: 400,
      };
    }

    const now = new Date();

    // Stop stream with provider
    if (session.streamId) {
      await streamingProvider.stopStream(session.streamId);
    }

    // Update session
    await prisma.liveSession.update({
      where: { id: sessionId },
      data: {
        status: "COMPLETED",
        endedAt: now,
        recordingStatus: "PROCESSING",
      },
    });

    // Close all open attendance records
    await prisma.sessionAttendance.updateMany({
      where: {
        sessionId,
        status: "ATTENDING",
        leftAt: null,
      },
      data: {
        leftAt: now,
        status: "ATTENDED",
        durationSeconds: prisma.$executeRaw`
          EXTRACT(EPOCH FROM (${now} - joined_at))::int
        ` as any,
      },
    });

    // Get attendance summary
    const [attended, total] = await Promise.all([
      prisma.sessionAttendance.count({
        where: {
          sessionId,
          status: { in: ["ATTENDED", "ATTENDING"] },
        },
      }),
      prisma.enrollment.count({
        where: { batchId: session.batchId, status: "ACTIVE" },
      }),
    ]);

    // Queue recording fetch (runs after 5 minutes)
    await sessionQueue.add(
      "FETCH_RECORDING",
      {
        session_id: sessionId,
        stream_id: session.streamId,
        attempt: 1,
      },
      { delay: 5 * 60 * 1000 }
    );

    // Queue post-session quiz generation for linked content
    const contentLinks = await prisma.sessionContentLink.findMany({
      where: { sessionId },
      select: { contentId: true },
    });

    for (const link of contentLinks) {
      await contentQueue.add(
        "QUIZ_GENERATION",
        {
          content_id: link.contentId,
          triggered_by: "SESSION_END",
        },
        {
          attempts: 3,
          backoff: { type: "exponential", delay: 60000 },
        }
      );
    }

    // Emit to all connected clients
    await this.emitToSession(sessionId, "SESSION_ENDED", {
      session_id: sessionId,
    });

    const actualDuration = session.startedAt
      ? Math.floor(
          (now.getTime() - session.startedAt.getTime()) / (1000 * 60)
        )
      : 0;

    return {
      session_id: sessionId,
      status: "COMPLETED",
      ended_at: now,
      actual_duration_minutes: actualDuration,
      attendance_summary: {
        total_enrolled: total,
        attended_live: attended,
        absent: total - attended,
      },
    };
  }

  // -------------------------------------------------------
  // JOIN SESSION
  // -------------------------------------------------------
  async joinSession(sessionId: string, studentId: string) {
    const session = await this.findSession(sessionId);

    if (session.status !== "LIVE") {
      throw {
        code: "SESSION_NOT_LIVE",
        message: "This session is not currently live",
        statusCode: 400,
      };
    }

    // Verify student is enrolled in the batch
    const enrollment = await prisma.enrollment.findFirst({
      where: {
        studentId,
        batchId: session.batchId,
        status: "ACTIVE",
      },
    });

    if (!enrollment) {
      throw {
        code: "NOT_ENROLLED",
        message:
          "You are not enrolled in the batch for this session",
        statusCode: 403,
      };
    }

    // Create or update attendance record
    const now = new Date();
    await prisma.sessionAttendance.upsert({
      where: {
        sessionId_studentId: { sessionId, studentId },
      },
      create: {
        sessionId,
        studentId,
        joinedAt: now,
        status: "ATTENDING",
      },
      update: {
        joinedAt: now,
        status: "ATTENDING",
        leftAt: null,
      },
    });

    return {
      session_id: sessionId,
      playback_url: session.playbackUrl,
      joined_at: now,
      session_title: session.title,
      mentor_name: session.mentor?.fullName,
    };
  }

  // -------------------------------------------------------
  // LEAVE SESSION
  // -------------------------------------------------------
  async leaveSession(sessionId: string, studentId: string) {
    const now = new Date();

    const attendance = await prisma.sessionAttendance.findUnique({
      where: {
        sessionId_studentId: { sessionId, studentId },
      },
    });

    if (!attendance || !attendance.joinedAt) {
      throw {
        code: "ATTENDANCE_NOT_FOUND",
        message: "No active attendance record found",
        statusCode: 404,
      };
    }

    const durationSeconds = Math.floor(
      (now.getTime() - attendance.joinedAt.getTime()) / 1000
    );

    await prisma.sessionAttendance.update({
      where: {
        sessionId_studentId: { sessionId, studentId },
      },
      data: {
        leftAt: now,
        status: "ATTENDED",
        durationSeconds,
      },
    });

    return {
      session_id: sessionId,
      left_at: now,
      duration_seconds: durationSeconds,
      duration_minutes: Math.floor(durationSeconds / 60),
    };
  }

  // -------------------------------------------------------
  // PRIVATE HELPERS
  // -------------------------------------------------------

  private async findSession(sessionId: string) {
    const session = await prisma.liveSession.findUnique({
      where: { id: sessionId },
      include: {
        mentor: { select: { fullName: true } },
      },
    });

    if (!session) {
      throw { code: "SESSION_NOT_FOUND", statusCode: 404 };
    }

    return session;
  }

  private async verifyMentorBatchAccess(
    batchId: string,
    userId: string
  ) {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { role: true },
    });

    if (
      user?.role === "ADMIN" ||
      user?.role === "SUPER_ADMIN"
    ) {
      return;
    }

    const assignment = await prisma.batchMentor.findFirst({
      where: { batchId, mentorId: userId },
    });

    if (!assignment) {
      throw { code: "PERMISSION_DENIED", statusCode: 403 };
    }
  }

  private async notifyBatchStudents(
    batchId: string,
    type: string,
    message: string,
    metadata: Record<string, any>
  ) {
    const enrollments = await prisma.enrollment.findMany({
      where: { batchId, status: "ACTIVE" },
      select: { studentId: true },
    });

    for (const enrollment of enrollments) {
      await notificationService.send({
        userId: enrollment.studentId,
        type,
        title: "Live Session Update",
        message,
        metadata,
      });
    }
  }

  private async emitToSession(
    sessionId: string,
    event: string,
    data: any
  ) {
    // Import socket.io instance and emit to session room
    const { io } = await import("../server");
    io.to(`session:${sessionId}`).emit(event, data);
  }

  private formatSession(session: any) {
    return {
      session_id: session.id,
      batch_id: session.batchId,
      title: session.title,
      description: session.description,
      scheduled_at: session.scheduledAt,
      estimated_duration_minutes: session.estimatedDurationMinutes,
      status: session.status,
      streaming_provider: session.streamingProvider,
      created_at: session.createdAt,
    };
  }
}
```

## 6.3 Recording Fetch Worker

```typescript
// workers/recordingFetch.worker.ts
import { Job } from "bull";
import { PrismaClient } from "@prisma/client";
import { streamingProvider } from
  "../utils/streamingProvider.utils";
import { notificationService } from
  "../services/notification.service";
import { sessionQueue } from "../queues/session.queue";

const prisma = new PrismaClient();
const MAX_RECORDING_ATTEMPTS = 6;

export const processFetchRecordingJob = async (job: Job) => {
  const { session_id, stream_id, attempt } = job.data;

  console.log(
    `[RecordingWorker] Fetching recording for session 
     ${session_id}, attempt ${attempt}`
  );

  try {
    const recordingUrl = await streamingProvider.getRecordingUrl(
      stream_id
    );

    if (!recordingUrl) {
      // Recording not ready yet
      if (attempt < MAX_RECORDING_ATTEMPTS) {
        // Retry after 5 more minutes
        await sessionQueue.add(
          "FETCH_RECORDING",
          {
            session_id,
            stream_id,
            attempt: attempt + 1,
          },
          { delay: 5 * 60 * 1000 }
        );
        console.log(
          `[RecordingWorker] Not ready yet, will retry 
           (attempt ${attempt + 1}/${MAX_RECORDING_ATTEMPTS})`
        );
        return;
      } else {
        // Exhausted retries
        await prisma.liveSession.update({
          where: { id: session_id },
          data: { recordingStatus: "FAILED" },
        });
        console.error(
          `[RecordingWorker] Recording failed after 
           ${MAX_RECORDING_ATTEMPTS} attempts`
        );
        return;
      }
    }

    // Recording is ready
    const session = await prisma.liveSession.update({
      where: { id: session_id },
      data: {
        recordingUrl,
        recordingStatus: "READY",
      },
      include: {
        batch: {
          include: {
            enrollments: {
              where: { status: "ACTIVE" },
              select: { studentId: true },
            },
          },
        },
      },
    });

    // Notify all enrolled students
    for (const enrollment of session.batch.enrollments) {
      await notificationService.send({
        userId: enrollment.studentId,
        type: "RECORDING_AVAILABLE",
        title: "Recording Available",
        message: `Recording for "${session.title}" is now available.`,
        metadata: { session_id },
      });
    }

    console.log(
      `[RecordingWorker] Recording ready for session ${session_id}`
    );

  } catch (error: any) {
    console.error(
      `[RecordingWorker] Error for session ${session_id}:`,
      error
    );
    throw error;
  }
};
```

## 6.4 Streaming Provider Utility

Abstracts the streaming provider (Mux or Agora) behind a
consistent interface so the service layer does not know which
provider is being used.

```typescript
// utils/streamingProvider.utils.ts
import axios from "axios";

const PROVIDER = process.env.STREAMING_PROVIDER ?? "MUX";
const MUX_TOKEN_ID = process.env.MUX_TOKEN_ID;
const MUX_TOKEN_SECRET = process.env.MUX_TOKEN_SECRET;

type StreamData = {
  stream_id: string;
  stream_key: string;
  playback_url: string;
  streaming_instructions: {
    rtmp_url: string;
    stream_key: string;
    recommended_settings: {
      video_bitrate_kbps: number;
      audio_bitrate_kbps: number;
      resolution: string;
      fps: number;
    };
  };
};

const muxProvider = {
  async createStream(options: {
    title: string;
    sessionId: string;
  }): Promise<StreamData> {
    const response = await axios.post(
      "https://api.mux.com/video/v1/live-streams",
      {
        playback_policy: ["public"],
        new_asset_settings: { playback_policy: ["public"] },
        passthrough: options.sessionId,
      },
      {
        auth: {
          username: MUX_TOKEN_ID!,
          password: MUX_TOKEN_SECRET!,
        },
      }
    );

    const stream = response.data.data;
    const playbackId = stream.playback_ids[0].id;

    return {
      stream_id: stream.id,
      stream_key: stream.stream_key,
      playback_url: `https://stream.mux.com/${playbackId}.m3u8`,
      streaming_instructions: {
        rtmp_url: "rtmps://global-live.mux.com:443/app",
        stream_key: stream.stream_key,
        recommended_settings: {
          video_bitrate_kbps: 3000,
          audio_bitrate_kbps: 128,
          resolution: "1280x720",
          fps: 30,
        },
      },
    };
  },

  async stopStream(streamId: string): Promise<void> {
    await axios.put(
      `https://api.mux.com/video/v1/live-streams/${streamId}/complete`,
      {},
      {
        auth: {
          username: MUX_TOKEN_ID!,
          password: MUX_TOKEN_SECRET!,
        },
      }
    );
  },

  async getRecordingUrl(
    streamId: string
  ): Promise<string | null> {
    const response = await axios.get(
      `https://api.mux.com/video/v1/live-streams/${streamId}`,
      {
        auth: {
          username: MUX_TOKEN_ID!,
          password: MUX_TOKEN_SECRET!,
        },
      }
    );

    const stream = response.data.data;
    const recentAssetId = stream.recent_asset_ids?.[0];

    if (!recentAssetId) return null;

    const assetResponse = await axios.get(
      `https://api.mux.com/video/v1/assets/${recentAssetId}`,
      {
        auth: {
          username: MUX_TOKEN_ID!,
          password: MUX_TOKEN_SECRET!,
        },
      }
    );

    const asset = assetResponse.data.data;

    if (asset.status !== "ready") return null;

    const playbackId = asset.playback_ids?.[0]?.id;
    if (!playbackId) return null;

    return `https://stream.mux.com/${playbackId}.m3u8`;
  },
};

export const streamingProvider = muxProvider;
```

## 6.5 Socket.io Session Room Management

Students join a Socket.io room when they open a session page.
This allows the backend to emit targeted real-time events.

```typescript
// server.ts — Socket.io room management
import { Server as SocketIOServer } from "socket.io";

export const setupSessionRooms = (io: SocketIOServer) => {
  io.on("connection", (socket) => {

    // Student or mentor joins a session room
    socket.on("join_session_room", (data: {
      session_id: string;
      user_id: string;
    }) => {
      socket.join(`session:${data.session_id}`);
      console.log(
        `User ${data.user_id} joined room 
         session:${data.session_id}`
      );
    });

    // Leave session room
    socket.on("leave_session_room", (data: {
      session_id: string;
    }) => {
      socket.leave(`session:${data.session_id}`);
    });

    // Disconnect cleanup
    socket.on("disconnect", () => {
      // Rooms are automatically cleaned up on disconnect
    });
  });
};
```

## 6.6 Missed Session Job

Runs nightly to mark sessions as MISSED if they were never started.

```typescript
// jobs/missedSessionCheck.job.ts
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

export const runMissedSessionCheck = async () => {
  const thirtyMinutesAgo = new Date(Date.now() - 30 * 60 * 1000);

  const missedSessions = await prisma.liveSession.updateMany({
    where: {
      status: "SCHEDULED",
      scheduledAt: { lt: thirtyMinutesAgo },
    },
    data: { status: "MISSED" },
  });

  if (missedSessions.count > 0) {
    console.log(
      `[MissedSessionJob] Marked ${missedSessions.count} 
       session(s) as MISSED`
    );
  }
};
```

## 6.7 Live Session Routes

```typescript
// routes/liveSession.routes.ts
import { Router } from "express";
import { LiveSessionController } from
  "../controllers/liveSession.controller";
import { authenticate } from
  "../middleware/authenticate.middleware";
import { authorize } from "../middleware/authorize.middleware";
import { validate } from "../middleware/validate.middleware";
import {
  scheduleSessionSchema,
  updateSessionSchema,
} from "../validators/liveSession.validator";

const router = Router();
const controller = new LiveSessionController();

router.use(authenticate);

const MENTOR_ROLES = ["MENTOR", "ADMIN", "SUPER_ADMIN"];
const ALL_ROLES = ["STUDENT", "MENTOR", "ADMIN", "SUPER_ADMIN"];

// Session CRUD
router.post(
  "/",
  authorize(MENTOR_ROLES),
  validate(scheduleSessionSchema),
  controller.scheduleSession
);

router.get(
  "/batches/:batchId/live-sessions",
  authorize(ALL_ROLES),
  controller.listSessions
);

router.get(
  "/:sessionId",
  authorize(ALL_ROLES),
  controller.getSession
);

router.put(
  "/:sessionId",
  authorize(MENTOR_ROLES),
  validate(updateSessionSchema),
  controller.updateSession
);

router.post(
  "/:sessionId/cancel",
  authorize(MENTOR_ROLES),
  controller.cancelSession
);

// Streaming controls (mentor only)
router.post(
  "/:sessionId/start",
  authorize(["MENTOR", "SUPER_ADMIN"]),
  controller.startStream
);

router.post(
  "/:sessionId/end",
  authorize(["MENTOR", "SUPER_ADMIN"]),
  controller.endStream
);

// Attendance (student)
router.post(
  "/:sessionId/join",
  authorize(["STUDENT"]),
  controller.joinSession
);

router.post(
  "/:sessionId/leave",
  authorize(["STUDENT"]),
  controller.leaveSession
);

router.post(
  "/:sessionId/heartbeat",
  authorize(["STUDENT"]),
  controller.heartbeat
);

// Recording progress (student)
router.patch(
  "/:sessionId/recording-progress",
  authorize(["STUDENT"]),
  controller.updateRecordingProgress
);

// Attendance report (mentor/admin)
router.get(
  "/:sessionId/attendance",
  authorize(MENTOR_ROLES),
  controller.getAttendanceReport
);

export default router;
```

---

# 7. Streaming Provider Integration

## 7.1 Mux Setup

```bash
# Install Mux SDK
npm install @mux/mux-node

# Add to .env
MUX_TOKEN_ID=your-mux-token-id
MUX_TOKEN_SECRET=your-mux-token-secret
STREAMING_PROVIDER=MUX
```

### Mux Dashboard Configuration

1. Create a Mux account at dashboard.mux.com
2. Navigate to Settings → API Access Tokens
3. Create a new token with Live Stream read/write permissions
4. Copy Token ID and Token Secret to .env
5. Navigate to Settings → Webhooks
6. Add webhook for `video.live_stream.active` and
   `video.asset.ready` events pointing to your server URL

### Mux Webhook Handler

```typescript
// routes/webhooks.routes.ts
router.post(
  "/webhooks/mux",
  express.raw({ type: "application/json" }),
  async (req, res) => {
    const event = JSON.parse(req.body.toString());

    switch (event.type) {
      case "video.live_stream.active":
        // Stream is receiving data from encoder
        console.log(
          `Stream ${event.data.id} is receiving video`
        );
        break;

      case "video.asset.ready":
        // Recording is ready
        // Update the session's recording URL
        const sessionId = event.data.passthrough;
        if (sessionId) {
          const playbackId = event.data.playback_ids?.[0]?.id;
          if (playbackId) {
            await prisma.liveSession.update({
              where: { id: sessionId },
              data: {
                recordingUrl:
                  `https://stream.mux.com/${playbackId}.m3u8`,
                recordingStatus: "READY",
              },
            });
          }
        }
        break;
    }

    res.sendStatus(200);
  }
);
```

## 7.2 Agora Alternative Setup

If using Agora instead of Mux:

```bash
npm install agora-access-token

# Add to .env
AGORA_APP_ID=your-agora-app-id
AGORA_APP_CERTIFICATE=your-agora-certificate
STREAMING_PROVIDER=AGORA
```

Agora uses a token-based model rather than RTMP streaming keys.
Each user (mentor and student) gets a time-limited access token.

---

# 8. Implementation Steps

## 8.1 Step-by-Step Build Order

### Step 1 — Database Schema (Day 1)

Add three new tables to Prisma schema:

- live_sessions
- session_attendance
- session_content_links

Run migration:

```bash
npx prisma migrate dev --name add_live_session_tables
```

Install required packages:

```bash
npm install @mux/mux-node
npm install socket.io           # Already installed from F01
```

Add environment variables:

```env
MUX_TOKEN_ID=your-token-id
MUX_TOKEN_SECRET=your-token-secret
STREAMING_PROVIDER=MUX
```

### Step 2 — Streaming Provider Utility (Day 1)

Build `utils/streamingProvider.utils.ts` from section 6.4.
Test with Mux sandbox:

1. Create a test stream via the API
2. Verify stream_key and playback_url are returned
3. Stop the stream
4. Verify recording URL is available after processing

### Step 3 — Session Queue Setup (Day 1)

```typescript
// queues/session.queue.ts
import Bull from "bull";

export const sessionQueue = new Bull("session-processing", {
  redis: {
    host: process.env.REDIS_HOST ?? "localhost",
    port: parseInt(process.env.REDIS_PORT ?? "6379"),
  },
});

// Register workers
sessionQueue.process("SEND_SESSION_REMINDER", 5,
  processSendReminderJob);
sessionQueue.process("FETCH_RECORDING", 2,
  processFetchRecordingJob);
```

### Step 4 — Live Session Service — Core CRUD (Day 2)

Build and test:

1. `scheduleSession()` — test with valid/invalid data
2. `listSessions()` — test filters and student vs mentor view
3. `updateSession()` — test constraint on started sessions
4. `cancelSession()` — test notification sending

### Step 5 — Live Session Service — Streaming (Day 2)

Build and test:

1. `startStream()` — test with Mux sandbox,
   verify Socket.io emission
2. `endStream()` — test attendance cleanup,
   queue jobs, verify emission
3. `joinSession()` — test enrollment check,
   upsert logic
4. `leaveSession()` — test duration calculation

### Step 6 — Recording Fetch Worker (Day 3)

Build `workers/recordingFetch.worker.ts` from section 6.3.
Test retry logic with a completed Mux stream.

### Step 7 — Controllers and Routes (Day 3)

Wire up controllers and routes. Test all endpoints.

### Step 8 — Frontend — Session List (Day 3)

Build:

1. `SessionCard` component with all states
2. `SessionStatusBadge` component
3. `CountdownTimer` component
4. Session listing pages for mentor and student

### Step 9 — Frontend — Streaming Interface (Day 4)

Build:

1. `MentorStreamingInterface` — start/end controls,
   stream key display
2. `StudentSessionViewer` — join button, video player,
   leave button
3. `useHeartbeat` hook
4. Socket.io event listeners for SESSION_STARTED,
   SESSION_ENDED

### Step 10 — Integration Testing (Day 5)

Test complete flow:

1. Mentor schedules session
2. Students receive notification
3. 15 minutes before: Start Stream button activates
4. Mentor clicks Start Stream
5. Students receive live notification
6. Students join and see live stream
7. Heartbeats are logged
8. Students leave at different times
9. Mentor clicks End Stream
10. All attendance records closed
11. Recording fetch job queued
12. Students receive recording notification
13. Verify attendance report accuracy

---

# 9. Error Handling

## 9.1 Error Code Reference

```
SESSION_NOT_FOUND         : 404 — Session ID does not exist
SESSION_NOT_LIVE          : 400 — Cannot join a non-live session
SESSION_ALREADY_LIVE      : 409 — Another session already live
SESSION_ALREADY_COMPLETED : 400 — Cannot modify completed session
TOO_EARLY_TO_START        : 400 — Before 15-minute window
SESSION_TIME_CONFLICT     : 409 — Scheduling conflict
PERMISSION_DENIED         : 403 — Not session owner
NOT_ENROLLED              : 403 — Student not in batch
ATTENDANCE_NOT_FOUND      : 404 — No active attendance record
STREAMING_PROVIDER_ERROR  : 502 — Provider API failed
INVALID_SESSION_STATUS    : 400 — Invalid status for operation
CANNOT_CANCEL_LIVE        : 400 — Cannot cancel a live session
```

## 9.2 Streaming Provider Failure Handling

If the Mux/Agora API call fails during startStream:

- Return 502 Bad Gateway with STREAMING_PROVIDER_ERROR
- Session remains in SCHEDULED status
- Mentor sees error and can retry
- Log the provider error for debugging

If provider fails during endStream:

- Mark session as COMPLETED locally regardless
- Log the provider failure
- Mentor may need to manually stop OBS or their encoder
- Recording may not be available — handle with
  recordingStatus = FAILED after retry exhaustion

## 9.3 Student Disconnect Handling

Students may lose connection without triggering the leave endpoint.
The heartbeat system handles this:

1. Student heartbeats stop (browser crashed, network failure)
2. After 3 missed heartbeats (90 seconds), backend marks
   attendance as ATTENDED with current timestamp as left_at
3. This cleanup runs as part of the `endStream` flow —
   all ATTENDING records are closed when session ends

For Phase One with small cohorts, this is acceptable.
For Phase Two at scale, implement a connection watchdog job.

---

# 10. Testing Strategy

## 10.1 Integration Tests

```typescript
// tests/liveSession.integration.test.ts

describe("POST /api/live-sessions", () => {

  it("should create a session and notify students", async () => {
    const response = await request(app)
      .post("/api/live-sessions")
      .set("Cookie", mentorAuthCookie)
      .send({
        batch_id: testBatchId,
        title: "Test Session",
        scheduled_at: new Date(
          Date.now() + 2 * 60 * 60 * 1000
        ).toISOString(),
      });

    expect(response.status).toBe(201);
    expect(response.body.data.status).toBe("SCHEDULED");
    expect(response.body.data.title).toBe("Test Session");
  });

  it("should reject session in the past", async () => {
    const response = await request(app)
      .post("/api/live-sessions")
      .set("Cookie", mentorAuthCookie)
      .send({
        batch_id: testBatchId,
        title: "Past Session",
        scheduled_at: new Date(
          Date.now() - 60 * 60 * 1000
        ).toISOString(),
      });

    expect(response.status).toBe(400);
    expect(response.body.error.code).toBe("INVALID_SCHEDULED_TIME");
  });
});

describe("POST /api/live-sessions/:id/join", () => {

  it("should create attendance record on join", async () => {
    // First set session to LIVE
    await prisma.liveSession.update({
      where: { id: testSessionId },
      data: { status: "LIVE", playbackUrl: "https://test.url" },
    });

    const response = await request(app)
      .post(`/api/live-sessions/${testSessionId}/join`)
      .set("Cookie", studentAuthCookie);

    expect(response.status).toBe(200);
    expect(response.body.data.playback_url).toBeDefined();

    const attendance = await prisma.sessionAttendance.findFirst({
      where: {
        sessionId: testSessionId,
        studentId: testStudentId,
      },
    });

    expect(attendance).toBeTruthy();
    expect(attendance?.status).toBe("ATTENDING");
  });
});
```

---

# 11. Code Examples

## 11.1 How Metrics Engine Uses Attendance Data

The metrics engine reads attendance data from session_attendance
to calculate the Consistency and Discipline dimension score:

```typescript
// Called by the Metrics Calculation Engine (Feature 09)
const getStudentAttendanceMetrics = async (
  studentId: string,
  batchId: string
) => {
  const sessions = await prisma.liveSession.findMany({
    where: {
      batchId,
      status: { in: ["COMPLETED", "MISSED"] },
      scheduledAt: { lte: new Date() },
    },
    include: {
      attendance: {
        where: { studentId },
      },
    },
  });

  const totalSessions = sessions.length;
  if (totalSessions === 0) return null;

  const attended = sessions.filter(
    (s) =>
      s.attendance.length > 0 &&
      s.attendance[0].status !== "ABSENT"
  ).length;

  const attendanceRate = (attended / totalSessions) * 100;

  const avgDurationMinutes =
    sessions
      .filter((s) => s.attendance[0]?.durationSeconds > 0)
      .reduce(
        (sum, s) => sum + s.attendance[0].durationSeconds / 60,
        0
      ) / (attended || 1);

  return {
    total_sessions: totalSessions,
    attended: attended,
    attendance_rate: attendanceRate,
    avg_duration_minutes: Math.round(avgDurationMinutes),
  };
};
```

---

# 12. Performance Optimization

## 12.1 Socket.io Room Management at Scale

For Phase One with up to 500 students per batch, Socket.io
rooms are efficient. Each session has its own room
(`session:{sessionId}`). Events are emitted only to
students in that room, not to all connected clients.

For Phase Two with multiple concurrent batches:

- Use Redis adapter for Socket.io to share state across
  multiple Node.js instances:

```bash
npm install @socket.io/redis-adapter
```

```typescript
import { createAdapter } from "@socket.io/redis-adapter";
import { createClient } from "redis";

const pubClient = createClient({
  url: process.env.REDIS_URL,
});
const subClient = pubClient.duplicate();

io.adapter(createAdapter(pubClient, subClient));
```

## 12.2 Attendance Database Write Optimization

The heartbeat endpoint (called every 30 seconds per student)
only needs to confirm the session is still live — it does not
need to write to the database. The actual attendance duration
is calculated at leave time or session end time.

For high-concurrency scenarios, the join and leave endpoints
use upsert operations to avoid race conditions when a student
rapidly joins and leaves.

## 12.3 Viewer Count Tracking

The current viewer count shown on the session detail page is
calculated from the count of ATTENDING records in the database.
This is accurate but requires a database query on every page
refresh. For Phase One this is fine.

For Phase Two, maintain a Redis counter that increments on join
and decrements on leave, updated in real-time via Socket.io.
This eliminates the database round-trip for viewer count checks.

---

**End of Feature 06 — Live Streaming and Session Management**

---

**Document Information**


| Field            | Value                                        |
| ---------------- | -------------------------------------------- |
| Feature          | F06 — Live Streaming and Session Management |
| Version          | 1.0                                          |
| Status           | Ready for Development                        |
| Folder           | F06_Live_Streaming/                          |
| Filename         | F06_Implementation_Guide.md                  |
| Previous Feature | F05_Quiz_Review/                             |
| Next Feature     | F07_Quiz_Taking/F07_Implementation_Guide.md  |
