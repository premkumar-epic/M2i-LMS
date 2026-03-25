# Feature 03 — Content Management System
### Complete Implementation Guide | Version 1.0 | March 2026
### Save As: F03_Content_Management/F03_Implementation_Guide.md

---

# Table of Contents

1. [Feature Overview](#1-feature-overview)
2. [Core Functionality](#2-core-functionality)
3. [Data Model](#3-data-model)
4. [API Endpoints](#4-api-endpoints)
5. [Frontend Components](#5-frontend-components)
6. [Backend Logic and Implementation](#6-backend-logic-and-implementation)
7. [Implementation Steps](#7-implementation-steps)
8. [Error Handling](#8-error-handling)
9. [Testing Strategy](#9-testing-strategy)
10. [Code Examples](#10-code-examples)
11. [Performance Optimization](#11-performance-optimization)

---

# 1. Feature Overview

## 1.1 What Is This Feature?

The Content Management System is the primary mechanism through which
mentors deliver learning material to students. It handles the complete
lifecycle of every piece of learning content on the platform — from
the moment a mentor uploads a video, through automatic transcription
and quiz generation triggering, all the way to the student watching
the video and the platform tracking their engagement.

The CMS manages four types of content:

**VIDEO:** The primary learning format. Mentor-recorded or lecture
videos uploaded as MP4, MOV, or WebM files. Videos are stored in
cloud storage and served via CDN. Every video upload automatically
triggers the transcription pipeline.

**DOCUMENT:** Supplementary learning materials — PDFs, DOCX files,
slide decks. Stored in cloud storage and available for student
download.

**RESOURCE:** External reference links, GitHub repositories, reading
lists. Stored as URLs rather than files.

**LIVE_RECORDING:** Automatically created content records when a live
session ends and its recording becomes available. These are linked to
the original LiveSession record.

## 1.2 Why This Feature Exists

Content is the foundation of the learning experience. Without a robust
CMS, mentors cannot deliver curriculum, students cannot learn, and the
quiz generation pipeline has nothing to process. The CMS is also the
primary source of engagement data — every interaction a student has
with content generates signals that feed the metrics engine.

The design philosophy of the CMS is zero friction for mentors. A
mentor should be able to upload a video, add a title and learning
objectives, and be done. Everything else — storage, transcription,
quiz generation, CDN delivery — happens automatically in the
background.

## 1.3 Key Design Decisions

**Direct-to-S3 upload via pre-signed URLs:** Video files are large.
Routing a 2GB video through the application server would be slow,
expensive, and would block the server for other requests. Pre-signed
URLs allow the browser to upload directly to S3, bypassing the
application server entirely. The application server only handles
metadata.

**Automatic transcription trigger:** Transcription is not optional and
not manually triggered. Every video upload automatically queues a
transcription job. This ensures the quiz generation pipeline always
has transcript data to work with.

**Soft deletion with data preservation:** Content is never hard-deleted
because students may have quiz responses and progress data linked to
it. Soft deletion hides content from students while preserving all
linked data.

**Content access logging:** Every time a student accesses content, an
access log record is created. This data directly feeds the Content
Engagement and Curiosity learning dimension scores in the metrics
engine.

---

# 2. Core Functionality

## 2.1 Content Upload Flow

The content upload process is a multi-step flow that separates file
storage from metadata creation to keep the application server out of
the file transfer path.

### Complete Upload Sequence
```
Mentor opens content upload page
          |
          v
Mentor fills in metadata form:
  - Title (required)
  - Description (optional)
  - Topic tags (optional)
  - Learning objectives (optional but strongly recommended)
          |
          v
Mentor selects video file from filesystem
          |
          v
Frontend validates file:
  - Format must be MP4, MOV, or WebM
  - Size must be under 2GB
          |
    ------+------
    |           |
Validation   Validation
fails        passes
    |           |
    v           v
Show error  Frontend requests pre-signed
            S3 URL from backend
            POST /api/content/upload-url
                |
                v
            Backend generates pre-signed URL
            with 15-minute expiry for the
            specific S3 key
                |
                v
            Backend returns pre-signed URL
            and content_id (UUID generated
            before upload so content record
            can be created atomically)
                |
                v
            Frontend uploads file DIRECTLY
            to S3 using the pre-signed URL
            (application server not involved)
                |
                v
            Frontend shows upload progress
            bar in real time using XMLHttpRequest
            progress events
                |
          ------+------
          |           |
       Upload       Upload
       fails        succeeds
          |           |
          v           v
      Show retry  Frontend notifies
      option      backend that upload
                  is complete
                  POST /api/content
                      |
                      v
                  Backend creates Content
                  record in database:
                    - status = DRAFT
                    - transcription_status = PENDING
                    - storage_url = S3 key
                      |
                      v
                  Backend adds
                  TRANSCRIPTION job
                  to Bull queue
                      |
                      v
                  Backend returns
                  content record
                      |
                      v
                  Frontend shows
                  content in library
                  with "Transcribing"
                  status badge
```

## 2.2 Content Access Flow (Student)

When a student accesses content, the platform tracks the interaction
for metrics purposes.

### Complete Student Access Sequence
```
Student clicks on content item
in their batch library
          |
          v
Frontend calls GET /api/content/:contentId
          |
          v
Backend verifies:
  - Student is authenticated
  - Student is enrolled in the batch
    that owns this content
  - Content is published (is_published = true)
  - Content is not deleted
          |
    ------+------
    |           |
Access       Access
denied       granted
    |           |
    v           v
Return      Return content
403         metadata + video
            streaming URL
                |
                v
            Frontend loads
            video player
                |
                v
            Backend creates or
            updates ContentAccessLog:
              - student_id
              - content_id
              - first_accessed_at
              - last_accessed_at
              - total_watch_time_seconds
              - completion_percentage
                |
                v
            Frontend resumes from
            last saved position
            (fetched from ContentAccessLog)
                |
                v
            Every 30 seconds of playback:
            Frontend calls PATCH
            /api/content/:contentId/progress
            to update position and watch time
                |
                v
            On video completion (90% watched):
            Frontend marks content as COMPLETED
```

## 2.3 Content Publishing Workflow

Content moves through a clear publish/unpublish lifecycle before
reaching students:
```
Upload Complete
      |
      v
   DRAFT ←─────────────────────────────┐
      |                                 |
      | Mentor clicks Publish           | Mentor clicks Unpublish
      |                                 |
      v                                 |
  PUBLISHED ───────────────────────────┘
      |
      | Admin or Mentor soft-deletes
      |
      v
   DELETED (soft) — not shown to
   anyone but data preserved
```

## 2.4 Transcription Status Lifecycle
```
PENDING → PROCESSING → COMPLETE → (Quiz generation triggered)
              |
              | (on failure)
              v
           FAILED → Mentor notified → Mentor can:
                     1. Edit transcript manually and trigger quiz gen
                     2. Retry transcription
                     3. Create quizzes manually
```

---

# 3. Data Model

## 3.1 Content Table
```sql
CREATE TABLE content (
  id                    UUID          PRIMARY KEY 
                                      DEFAULT gen_random_uuid(),
  batch_id              UUID          NOT NULL 
                                      REFERENCES batches(id),
  uploaded_by           UUID          NOT NULL 
                                      REFERENCES users(id),
  title                 VARCHAR(255)  NOT NULL,
  description           TEXT          DEFAULT NULL,
  content_type          VARCHAR(20)   NOT NULL 
                                      CHECK (content_type IN (
                                        'VIDEO',
                                        'DOCUMENT',
                                        'RESOURCE',
                                        'LIVE_RECORDING'
                                      )),
  storage_url           TEXT          NOT NULL,
  cdn_url               TEXT          DEFAULT NULL,
  duration_seconds      INTEGER       DEFAULT NULL,
  file_size_bytes       BIGINT        DEFAULT NULL,
  mime_type             VARCHAR(100)  DEFAULT NULL,
  topic_tags            TEXT[]        DEFAULT '{}',
  learning_objectives   TEXT          DEFAULT NULL,
  transcript            TEXT          DEFAULT NULL,
  transcription_status  VARCHAR(20)   NOT NULL 
                                      DEFAULT 'PENDING'
                                      CHECK (transcription_status IN (
                                        'PENDING',
                                        'PROCESSING',
                                        'COMPLETE',
                                        'FAILED',
                                        'NOT_REQUIRED'
                                      )),
  transcription_error   TEXT          DEFAULT NULL,
  is_published          BOOLEAN       NOT NULL DEFAULT FALSE,
  sort_order            INTEGER       NOT NULL DEFAULT 0,
  live_session_id       UUID          DEFAULT NULL 
                                      REFERENCES live_sessions(id),
  created_at            TIMESTAMP     NOT NULL DEFAULT NOW(),
  updated_at            TIMESTAMP     NOT NULL DEFAULT NOW(),
  deleted_at            TIMESTAMP     DEFAULT NULL
);

-- Indexes
CREATE INDEX idx_content_batch_id
  ON content(batch_id)
  WHERE deleted_at IS NULL;

CREATE INDEX idx_content_batch_published
  ON content(batch_id, is_published)
  WHERE deleted_at IS NULL;

CREATE INDEX idx_content_transcription_status
  ON content(transcription_status)
  WHERE transcription_status IN ('PENDING', 'PROCESSING');

CREATE INDEX idx_content_uploaded_by
  ON content(uploaded_by);

CREATE INDEX idx_content_sort_order
  ON content(batch_id, sort_order)
  WHERE deleted_at IS NULL;
```

### Column Definitions

**id:** UUID primary key, auto-generated.

**batch_id:** The batch this content belongs to. Content is exclusively
owned by one batch. To use the same material in another batch, it must
be re-uploaded.

**uploaded_by:** The mentor who uploaded this content. Used for access
control (mentors can only manage their own content).

**title:** Display title shown to students. Required, max 255 chars.

**description:** Optional description shown to students before they
access the content. Max 2000 chars.

**content_type:** VIDEO, DOCUMENT, RESOURCE, or LIVE_RECORDING.
Determines how the content is displayed and whether transcription
is applicable.

**storage_url:** The full S3 key or URL where the file is stored.
For RESOURCE type, this stores the external URL.

**cdn_url:** The CloudFront or CDN URL for serving the content to
students. Populated after upload. Students always receive the CDN URL,
never the direct S3 URL.

**duration_seconds:** Video duration in seconds. Populated by the
transcription worker after processing the video file.

**file_size_bytes:** Size of the uploaded file in bytes. Stored for
storage analytics and quota management in future phases.

**mime_type:** The MIME type of the uploaded file. Stored for client
rendering decisions.

**topic_tags:** PostgreSQL array of topic strings. Used for content
organization and quiz generation context.

**learning_objectives:** Free-text field where mentors describe what
students should learn from this content. This is the single most
important input to the quiz generation prompt — better objectives
produce better quizzes.

**transcript:** The full text transcript generated by Whisper. May be
edited by the mentor. The quiz generation pipeline always uses the most
recently saved version of this field.

**transcription_status:** Current state of the transcription pipeline
for this content item.

**transcription_error:** The error message if transcription failed.
Shown to mentor so they understand what went wrong.

**is_published:** TRUE = visible to enrolled students. FALSE = draft,
visible only to mentors and admins.

**sort_order:** Integer used to control the display order of content
within a batch. Lower values appear first. Reordering updates these
values.

**live_session_id:** For LIVE_RECORDING content type, this links back
to the original live session. NULL for all other content types.

**deleted_at:** Soft deletion timestamp. NULL = not deleted. All queries
serving students filter WHERE deleted_at IS NULL.

## 3.2 ContentAccessLogs Table

Tracks every student's interaction with every content item. This is the
primary data source for the Content Engagement and Curiosity dimension
scores.
```sql
CREATE TABLE content_access_logs (
  id                        UUID        PRIMARY KEY 
                                        DEFAULT gen_random_uuid(),
  student_id                UUID        NOT NULL 
                                        REFERENCES users(id),
  content_id                UUID        NOT NULL 
                                        REFERENCES content(id),
  batch_id                  UUID        NOT NULL 
                                        REFERENCES batches(id),
  first_accessed_at         TIMESTAMP   NOT NULL DEFAULT NOW(),
  last_accessed_at          TIMESTAMP   NOT NULL DEFAULT NOW(),
  total_watch_time_seconds  INTEGER     NOT NULL DEFAULT 0,
  last_position_seconds     INTEGER     NOT NULL DEFAULT 0,
  completion_percentage     DECIMAL(5,2) NOT NULL DEFAULT 0,
  is_completed              BOOLEAN     NOT NULL DEFAULT FALSE,
  access_count              INTEGER     NOT NULL DEFAULT 1,
  rewatch_count             INTEGER     NOT NULL DEFAULT 0
);

-- One log record per student per content item
CREATE UNIQUE INDEX idx_access_logs_student_content
  ON content_access_logs(student_id, content_id);

CREATE INDEX idx_access_logs_student_id
  ON content_access_logs(student_id);

CREATE INDEX idx_access_logs_content_id
  ON content_access_logs(content_id);

CREATE INDEX idx_access_logs_batch_id
  ON content_access_logs(batch_id);
```

### Column Definitions

**student_id / content_id / batch_id:** Foreign keys. batch_id is
stored for efficient batch-level analytics queries without needing to
join through content.

**first_accessed_at:** When the student first opened this content. Used
as the starting reference for learning velocity calculations.

**last_accessed_at:** Most recent access. Used to detect inactive
students (students who have not accessed anything in N days).

**total_watch_time_seconds:** Cumulative seconds the student has spent
watching this video, across all viewing sessions. Not a simple video
position — it accumulates even when rewatching sections.

**last_position_seconds:** The video position in seconds where the
student last stopped watching. Used to resume playback from where they
left off.

**completion_percentage:** Percentage of the video the student has
watched. Calculated as: (furthest_position_reached / duration) * 100.
Not based on total_watch_time because a student could watch the
beginning 10 times and never see the end.

**is_completed:** TRUE when completion_percentage reaches 90%.
Once set to TRUE, it does not revert even if the student is rewatching.

**access_count:** Total number of times the student has opened this
content. A student who opens a video 5 times has access_count = 5.

**rewatch_count:** Number of times the student has rewatched content
they already completed. Incremented when a student opens completed
content again. Strong signal for the Curiosity dimension.

## 3.3 SupplementaryFiles Table

Stores supplementary files (PDFs, slides) associated with a content
item.
```sql
CREATE TABLE supplementary_files (
  id              UUID          PRIMARY KEY 
                                DEFAULT gen_random_uuid(),
  content_id      UUID          NOT NULL 
                                REFERENCES content(id) 
                                ON DELETE CASCADE,
  filename        VARCHAR(255)  NOT NULL,
  storage_url     TEXT          NOT NULL,
  file_size_bytes BIGINT        DEFAULT NULL,
  mime_type       VARCHAR(100)  DEFAULT NULL,
  uploaded_at     TIMESTAMP     NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_supplementary_content_id
  ON supplementary_files(content_id);
```

## 3.4 Prisma Schema
```prisma
model Content {
  id                   String              @id 
                                           @default(dbgenerated(
                                             "gen_random_uuid()")) 
                                           @db.Uuid
  batchId              String              @map("batch_id") @db.Uuid
  uploadedBy           String              @map("uploaded_by") @db.Uuid
  title                String              @db.VarChar(255)
  description          String?             @db.Text
  contentType          ContentType         @map("content_type")
  storageUrl           String              @map("storage_url") @db.Text
  cdnUrl               String?             @map("cdn_url") @db.Text
  durationSeconds      Int?                @map("duration_seconds")
  fileSizeBytes        BigInt?             @map("file_size_bytes")
  mimeType             String?             @map("mime_type") 
                                           @db.VarChar(100)
  topicTags            String[]            @default([]) 
                                           @map("topic_tags")
  learningObjectives   String?             @map("learning_objectives") 
                                           @db.Text
  transcript           String?             @db.Text
  transcriptionStatus  TranscriptionStatus @default(PENDING) 
                                           @map("transcription_status")
  transcriptionError   String?             @map("transcription_error") 
                                           @db.Text
  isPublished          Boolean             @default(false) 
                                           @map("is_published")
  sortOrder            Int                 @default(0) 
                                           @map("sort_order")
  liveSessionId        String?             @map("live_session_id") 
                                           @db.Uuid
  createdAt            DateTime            @default(now()) 
                                           @map("created_at")
  updatedAt            DateTime            @updatedAt 
                                           @map("updated_at")
  deletedAt            DateTime?           @map("deleted_at")

  batch                Batch               @relation(
                                             fields: [batchId], 
                                             references: [id])
  uploader             User                @relation(
                                             fields: [uploadedBy], 
                                             references: [id])
  accessLogs           ContentAccessLog[]
  supplementaryFiles   SupplementaryFile[]
  quizzes              Quiz[]

  @@map("content")
}

model ContentAccessLog {
  id                      String    @id 
                                    @default(dbgenerated(
                                      "gen_random_uuid()")) 
                                    @db.Uuid
  studentId               String    @map("student_id") @db.Uuid
  contentId               String    @map("content_id") @db.Uuid
  batchId                 String    @map("batch_id") @db.Uuid
  firstAccessedAt         DateTime  @default(now()) 
                                    @map("first_accessed_at")
  lastAccessedAt          DateTime  @default(now()) 
                                    @map("last_accessed_at")
  totalWatchTimeSeconds   Int       @default(0) 
                                    @map("total_watch_time_seconds")
  lastPositionSeconds     Int       @default(0) 
                                    @map("last_position_seconds")
  completionPercentage    Decimal   @default(0) 
                                    @map("completion_percentage") 
                                    @db.Decimal(5, 2)
  isCompleted             Boolean   @default(false) 
                                    @map("is_completed")
  accessCount             Int       @default(1) 
                                    @map("access_count")
  rewatchCount            Int       @default(0) 
                                    @map("rewatch_count")

  student                 User      @relation(
                                      fields: [studentId], 
                                      references: [id])
  content                 Content   @relation(
                                      fields: [contentId], 
                                      references: [id])

  @@unique([studentId, contentId])
  @@map("content_access_logs")
}

model SupplementaryFile {
  id              String    @id 
                            @default(dbgenerated("gen_random_uuid()")) 
                            @db.Uuid
  contentId       String    @map("content_id") @db.Uuid
  filename        String    @db.VarChar(255)
  storageUrl      String    @map("storage_url") @db.Text
  fileSizeBytes   BigInt?   @map("file_size_bytes")
  mimeType        String?   @map("mime_type") @db.VarChar(100)
  uploadedAt      DateTime  @default(now()) @map("uploaded_at")

  content         Content   @relation(
                              fields: [contentId], 
                              references: [id], 
                              onDelete: Cascade)

  @@map("supplementary_files")
}

enum ContentType {
  VIDEO
  DOCUMENT
  RESOURCE
  LIVE_RECORDING
}

enum TranscriptionStatus {
  PENDING
  PROCESSING
  COMPLETE
  FAILED
  NOT_REQUIRED
}
```

---

# 4. API Endpoints

## 4.1 Upload Endpoints

### POST /api/content/upload-url

**Access:** MENTOR, ADMIN, SUPER_ADMIN

**Purpose:** Generate a pre-signed S3 URL for direct browser-to-S3
upload. Called BEFORE the file is uploaded.

**Request Body:**
```json
{
  "filename": "nodejs-introduction-week1.mp4",
  "mime_type": "video/mp4",
  "file_size_bytes": 524288000,
  "batch_id": "770f1234-a12b-43c5-d678-998877665544"
}
```

**Validation Rules:**
```
filename       : required, string, max 255 chars
mime_type      : required, must be one of:
                   video/mp4, video/quicktime, video/webm
                   application/pdf
                   application/vnd.openxmlformats-officedocument
                     .wordprocessingml.document
                   application/vnd.ms-powerpoint
                   application/vnd.openxmlformats-officedocument
                     .presentationml.presentation
file_size_bytes: required, integer, max 2147483648 (2GB for video),
                 max 52428800 (50MB for documents)
batch_id       : required, UUID, must be a batch the mentor is
                 assigned to
```

**Success Response (200 OK):**
```json
{
  "success": true,
  "data": {
    "upload_url": "https://s3.amazonaws.com/m2i-lms/uploads/
                   batch-id/content-uuid/video.mp4?
                   X-Amz-Signature=abc123...",
    "content_id": "880g2345-b23c-54d6-e789-009988776655",
    "s3_key": "uploads/770f1234/880g2345/nodejs-intro-week1.mp4",
    "expires_in_seconds": 900
  }
}
```

**How the Frontend Uses This:**
```typescript
// Step 1: Get pre-signed URL from backend
const { data } = await api.post("/api/content/upload-url", {
  filename: file.name,
  mime_type: file.type,
  file_size_bytes: file.size,
  batch_id: batchId,
});

const { upload_url, content_id, s3_key } = data.data;

// Step 2: Upload directly to S3
const xhr = new XMLHttpRequest();
xhr.upload.addEventListener("progress", (event) => {
  if (event.lengthComputable) {
    const percentage = (event.loaded / event.total) * 100;
    setUploadProgress(Math.round(percentage));
  }
});

xhr.open("PUT", upload_url);
xhr.setRequestHeader("Content-Type", file.type);
xhr.send(file);

// Step 3: On success, notify backend
xhr.onload = async () => {
  if (xhr.status === 200) {
    await api.post("/api/content", {
      content_id,
      s3_key,
      title: formData.title,
      description: formData.description,
      topic_tags: formData.topicTags,
      learning_objectives: formData.learningObjectives,
      content_type: "VIDEO",
      batch_id: batchId,
      mime_type: file.type,
      file_size_bytes: file.size,
    });
  }
};
```

---

### POST /api/content

**Access:** MENTOR, ADMIN, SUPER_ADMIN

**Purpose:** Create content record after successful S3 upload

**Request Body:**
```json
{
  "content_id": "880g2345-b23c-54d6-e789-009988776655",
  "s3_key": "uploads/770f1234/880g2345/nodejs-intro-week1.mp4",
  "title": "Introduction to Node.js — Week 1",
  "description": "In this session we cover Node.js fundamentals 
                  including modules, the event loop, and async 
                  programming patterns.",
  "content_type": "VIDEO",
  "batch_id": "770f1234-a12b-43c5-d678-998877665544",
  "topic_tags": ["nodejs", "javascript", "backend", "async"],
  "learning_objectives": "Students should understand: 1) What 
                          Node.js is and how it differs from 
                          browser JavaScript. 2) How the event 
                          loop works. 3) How to use require() 
                          and module.exports. 4) Basic async 
                          patterns with callbacks and Promises.",
  "mime_type": "video/mp4",
  "file_size_bytes": 524288000
}
```

**Success Response (201 Created):**
```json
{
  "success": true,
  "data": {
    "content_id": "880g2345-b23c-54d6-e789-009988776655",
    "title": "Introduction to Node.js — Week 1",
    "content_type": "VIDEO",
    "is_published": false,
    "transcription_status": "PENDING",
    "sort_order": 5,
    "created_at": "2026-03-21T10:00:00Z"
  },
  "message": "Content created. Transcription queued."
}
```

---

## 4.2 Content Management Endpoints

### GET /api/batches/:batchId/content

**Access:** MENTOR and ADMIN see all content (including drafts).
STUDENT sees only published, non-deleted content.

**Query Parameters:**
```
published_only  : boolean (students always get true, 
                  mentors can see all)
page            : page number (default: 1)
limit           : results per page (default: 50)
```

**Success Response (200 OK) — Mentor View:**
```json
{
  "success": true,
  "data": {
    "content": [
      {
        "content_id": "880g2345-b23c-54d6-e789-009988776655",
        "title": "Introduction to Node.js — Week 1",
        "description": "In this session we cover...",
        "content_type": "VIDEO",
        "duration_seconds": 2700,
        "topic_tags": ["nodejs", "javascript", "backend"],
        "is_published": true,
        "transcription_status": "COMPLETE",
        "quiz_generation_status": "QUIZZES_READY_FOR_REVIEW",
        "approved_quiz_count": 8,
        "pending_quiz_count": 4,
        "sort_order": 1,
        "created_at": "2026-03-21T10:00:00Z"
      }
    ]
  },
  "pagination": {
    "page": 1,
    "limit": 50,
    "total": 12,
    "total_pages": 1
  }
}
```

**Success Response (200 OK) — Student View:**
```json
{
  "success": true,
  "data": {
    "content": [
      {
        "content_id": "880g2345-b23c-54d6-e789-009988776655",
        "title": "Introduction to Node.js — Week 1",
        "description": "In this session we cover...",
        "content_type": "VIDEO",
        "duration_seconds": 2700,
        "topic_tags": ["nodejs", "javascript", "backend"],
        "sort_order": 1,
        "my_progress": {
          "completion_percentage": 65.5,
          "is_completed": false,
          "last_position_seconds": 1768,
          "total_watch_time_seconds": 1980,
          "last_accessed_at": "2026-03-20T15:30:00Z"
        },
        "has_quizzes": true,
        "quiz_status": {
          "quick_quiz_available": true,
          "quick_quiz_completed": false,
          "retention_quiz_available": false,
          "retention_quiz_available_at": "2026-03-23T00:00:00Z"
        }
      }
    ]
  }
}
```

---

### GET /api/content/:contentId

**Access:** MENTOR (for their batch), STUDENT (if enrolled and content
is published)

**Purpose:** Fetch full content details including video playback URL

**Success Response (200 OK):**
```json
{
  "success": true,
  "data": {
    "content_id": "880g2345-b23c-54d6-e789-009988776655",
    "title": "Introduction to Node.js — Week 1",
    "description": "In this session we cover...",
    "content_type": "VIDEO",
    "playback_url": "https://cdn.example.com/videos/880g2345.mp4",
    "duration_seconds": 2700,
    "topic_tags": ["nodejs", "javascript", "backend"],
    "learning_objectives": "Students should understand...",
    "is_published": true,
    "transcription_status": "COMPLETE",
    "sort_order": 1,
    "supplementary_files": [
      {
        "file_id": "file-uuid-1",
        "filename": "nodejs-slides-week1.pdf",
        "download_url": "https://cdn.example.com/files/slides.pdf",
        "file_size_bytes": 2048000,
        "mime_type": "application/pdf"
      }
    ],
    "my_progress": {
      "completion_percentage": 65.5,
      "last_position_seconds": 1768,
      "is_completed": false
    },
    "created_at": "2026-03-21T10:00:00Z"
  }
}
```

---

### PUT /api/content/:contentId

**Access:** MENTOR (own content), ADMIN, SUPER_ADMIN

**Purpose:** Update content metadata

**Request Body (all fields optional):**
```json
{
  "title": "Introduction to Node.js — Week 1 (Updated)",
  "description": "Updated description...",
  "topic_tags": ["nodejs", "javascript", "backend", "eventloop"],
  "learning_objectives": "Updated learning objectives..."
}
```

**Success Response (200 OK):**
```json
{
  "success": true,
  "data": {
    "content_id": "880g2345-b23c-54d6-e789-009988776655",
    "title": "Introduction to Node.js — Week 1 (Updated)",
    "updated_at": "2026-03-22T09:00:00Z"
  },
  "message": "Content updated successfully"
}
```

---

### POST /api/content/:contentId/publish

**Access:** MENTOR (own content), ADMIN, SUPER_ADMIN

**Purpose:** Make content visible to enrolled students

**Request:** No body required.

**Rules:**
- Content must have a title and storage_url
- Failed transcription does NOT block publishing
- Publishing does not require quiz approval

**Success Response (200 OK):**
```json
{
  "success": true,
  "data": {
    "content_id": "880g2345-b23c-54d6-e789-009988776655",
    "is_published": true
  },
  "message": "Content published successfully. 
              Students can now access this content."
}
```

---

### POST /api/content/:contentId/unpublish

**Access:** MENTOR (own content), ADMIN, SUPER_ADMIN

**Purpose:** Hide content from students

**Request:** No body required.

**Success Response (200 OK):**
```json
{
  "success": true,
  "data": {
    "content_id": "880g2345-b23c-54d6-e789-009988776655",
    "is_published": false
  },
  "message": "Content unpublished. Students can no longer 
              access this content."
}
```

---

### DELETE /api/content/:contentId

**Access:** MENTOR (own content), ADMIN, SUPER_ADMIN

**Purpose:** Soft-delete a content item

**Request Body:**
```json
{
  "confirmation": "DELETE"
}
```

**Success Response (200 OK):**
```json
{
  "success": true,
  "message": "Content deleted. All student data 
              associated with this content is preserved."
}
```

---

### PUT /api/content/reorder

**Access:** MENTOR, ADMIN, SUPER_ADMIN

**Purpose:** Update the sort order of content items within a batch

**Request Body:**
```json
{
  "batch_id": "770f1234-a12b-43c5-d678-998877665544",
  "content_order": [
    { "content_id": "content-uuid-3", "sort_order": 1 },
    { "content_id": "content-uuid-1", "sort_order": 2 },
    { "content_id": "content-uuid-2", "sort_order": 3 }
  ]
}
```

**Success Response (200 OK):**
```json
{
  "success": true,
  "message": "Content order updated successfully"
}
```

---

## 4.3 Transcript Endpoints

### GET /api/content/:contentId/transcript

**Access:** MENTOR (own batch), ADMIN, SUPER_ADMIN

**Purpose:** Fetch the auto-generated transcript for editing

**Success Response (200 OK):**
```json
{
  "success": true,
  "data": {
    "content_id": "880g2345-b23c-54d6-e789-009988776655",
    "transcript": "Hello everyone, welcome to week one of our 
                  Node.js curriculum. Today we are going to 
                  cover the fundamentals of Node.js...",
    "transcription_status": "COMPLETE",
    "word_count": 3450,
    "last_edited_at": null
  }
}
```

---

### PUT /api/content/:contentId/transcript

**Access:** MENTOR (own batch), ADMIN, SUPER_ADMIN

**Purpose:** Update the transcript before quiz regeneration

**Request Body:**
```json
{
  "transcript": "Hello everyone, welcome to week one of our 
                Node.js curriculum. Today we are going to 
                cover the fundamentals of Node.js..."
}
```

**Success Response (200 OK):**
```json
{
  "success": true,
  "data": {
    "content_id": "880g2345-b23c-54d6-e789-009988776655",
    "word_count": 3450,
    "updated_at": "2026-03-22T09:00:00Z"
  },
  "message": "Transcript updated. Click Regenerate Quizzes 
              to generate new quizzes from the updated transcript."
}
```

---

### POST /api/content/:contentId/regenerate-quizzes

**Access:** MENTOR (own batch), ADMIN, SUPER_ADMIN

**Purpose:** Trigger quiz regeneration after transcript edits

**Request:** No body required.

**Success Response (200 OK):**
```json
{
  "success": true,
  "message": "Quiz regeneration queued. You will be notified 
              when new quizzes are ready for review."
}
```

---

## 4.4 Student Progress Endpoints

### PATCH /api/content/:contentId/progress

**Access:** STUDENT only

**Purpose:** Update watch progress during video playback.
Called every 30 seconds during active playback.

**Request Body:**
```json
{
  "current_position_seconds": 1800,
  "session_watch_time_seconds": 30
}
```

**Success Response (200 OK):**
```json
{
  "success": true,
  "data": {
    "completion_percentage": 66.7,
    "is_completed": false,
    "total_watch_time_seconds": 2010
  }
}
```

---

### GET /api/content/:contentId/progress

**Access:** STUDENT (own progress), MENTOR (any student)

**Purpose:** Fetch a student's progress on a specific content item

**Query Parameters (Mentor only):**
```
student_id : UUID of student to fetch progress for
```

**Success Response (200 OK):**
```json
{
  "success": true,
  "data": {
    "content_id": "880g2345-b23c-54d6-e789-009988776655",
    "completion_percentage": 66.7,
    "last_position_seconds": 1800,
    "total_watch_time_seconds": 2010,
    "is_completed": false,
    "access_count": 3,
    "rewatch_count": 0,
    "first_accessed_at": "2026-03-20T10:00:00Z",
    "last_accessed_at": "2026-03-21T15:30:00Z"
  }
}
```

---

## 4.5 Supplementary Files Endpoints

### POST /api/content/:contentId/files/upload-url

**Access:** MENTOR, ADMIN, SUPER_ADMIN

**Purpose:** Generate pre-signed URL for supplementary file upload

**Request Body:**
```json
{
  "filename": "nodejs-slides-week1.pdf",
  "mime_type": "application/pdf",
  "file_size_bytes": 2048000
}
```

**Success Response (200 OK):**
```json
{
  "success": true,
  "data": {
    "upload_url": "https://s3.amazonaws.com/...",
    "file_id": "file-uuid-1",
    "s3_key": "files/880g2345/file-uuid-1-slides.pdf",
    "expires_in_seconds": 900
  }
}
```

---

### POST /api/content/:contentId/files

**Access:** MENTOR, ADMIN, SUPER_ADMIN

**Purpose:** Register supplementary file after S3 upload

**Request Body:**
```json
{
  "file_id": "file-uuid-1",
  "filename": "nodejs-slides-week1.pdf",
  "s3_key": "files/880g2345/file-uuid-1-slides.pdf",
  "file_size_bytes": 2048000,
  "mime_type": "application/pdf"
}
```

**Success Response (201 Created):**
```json
{
  "success": true,
  "data": {
    "file_id": "file-uuid-1",
    "filename": "nodejs-slides-week1.pdf",
    "download_url": "https://cdn.example.com/files/slides.pdf"
  },
  "message": "File uploaded successfully"
}
```

---

### DELETE /api/content/:contentId/files/:fileId

**Access:** MENTOR (own batch), ADMIN, SUPER_ADMIN

**Purpose:** Remove a supplementary file

**Success Response (200 OK):**
```json
{
  "success": true,
  "message": "File removed successfully"
}
```

---

# 5. Frontend Components

## 5.1 Component Structure
```
src/
├── app/
│   ├── mentor/
│   │   └── batches/
│   │       └── [batchId]/
│   │           ├── content/
│   │           │   ├── page.tsx           (content library)
│   │           │   ├── upload/
│   │           │   │   └── page.tsx       (upload page)
│   │           │   └── [contentId]/
│   │           │       ├── page.tsx       (content detail)
│   │           │       └── transcript/
│   │           │           └── page.tsx   (transcript editor)
│   └── student/
│       └── batches/
│           └── content/
│               ├── page.tsx               (content library)
│               └── [contentId]/
│                   └── page.tsx           (content viewer)
├── components/
│   └── content/
│       ├── VideoUploader.tsx
│       ├── UploadProgressBar.tsx
│       ├── ContentCard.tsx
│       ├── ContentStatusBadge.tsx
│       ├── ContentList.tsx
│       ├── DraggableContentList.tsx
│       ├── VideoPlayer.tsx
│       ├── TranscriptEditor.tsx
│       ├── SupplementaryFilesList.tsx
│       ├── ContentMetadataForm.tsx
│       └── StudentProgressRing.tsx
```

## 5.2 VideoUploader Component

The VideoUploader handles the complete two-step upload process —
requesting the pre-signed URL and then uploading directly to S3.
```tsx
// components/content/VideoUploader.tsx
"use client";

import { useState, useRef } from "react";
import api from "@/lib/api";

type UploadState =
  | "idle"
  | "validating"
  | "requesting_url"
  | "uploading"
  | "creating_record"
  | "complete"
  | "error";

type Props = {
  batchId: string;
  onUploadComplete: (contentId: string) => void;
};

const ACCEPTED_VIDEO_TYPES = ["video/mp4", "video/quicktime", "video/webm"];
const MAX_VIDEO_SIZE = 2 * 1024 * 1024 * 1024; // 2GB

export default function VideoUploader({ batchId, onUploadComplete }: Props) {
  const [uploadState, setUploadState] = useState<UploadState>("idle");
  const [uploadProgress, setUploadProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [dragOver, setDragOver] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFile = async (file: File, metadata: ContentMetadata) => {
    setError(null);

    // Step 1: Validate file
    setUploadState("validating");

    if (!ACCEPTED_VIDEO_TYPES.includes(file.type)) {
      setError("Only MP4, MOV, and WebM video files are supported.");
      setUploadState("error");
      return;
    }

    if (file.size > MAX_VIDEO_SIZE) {
      setError("File size cannot exceed 2GB.");
      setUploadState("error");
      return;
    }

    try {
      // Step 2: Request pre-signed URL
      setUploadState("requesting_url");

      const urlResponse = await api.post("/api/content/upload-url", {
        filename: file.name,
        mime_type: file.type,
        file_size_bytes: file.size,
        batch_id: batchId,
      });

      const { upload_url, content_id, s3_key } = urlResponse.data.data;

      // Step 3: Upload directly to S3
      setUploadState("uploading");

      await uploadToS3(file, upload_url, (progress) => {
        setUploadProgress(progress);
      });

      // Step 4: Create content record in backend
      setUploadState("creating_record");

      await api.post("/api/content", {
        content_id,
        s3_key,
        title: metadata.title,
        description: metadata.description,
        topic_tags: metadata.topicTags,
        learning_objectives: metadata.learningObjectives,
        content_type: "VIDEO",
        batch_id: batchId,
        mime_type: file.type,
        file_size_bytes: file.size,
      });

      setUploadState("complete");
      onUploadComplete(content_id);

    } catch (err: any) {
      const message =
        err.response?.data?.error?.message ??
        "Upload failed. Please try again.";
      setError(message);
      setUploadState("error");
    }
  };

  const uploadToS3 = (
    file: File,
    presignedUrl: string,
    onProgress: (percentage: number) => void
  ): Promise<void> => {
    return new Promise((resolve, reject) => {
      const xhr = new XMLHttpRequest();

      xhr.upload.addEventListener("progress", (event) => {
        if (event.lengthComputable) {
          onProgress(Math.round((event.loaded / event.total) * 100));
        }
      });

      xhr.addEventListener("load", () => {
        if (xhr.status === 200) {
          resolve();
        } else {
          reject(new Error(`S3 upload failed with status ${xhr.status}`));
        }
      });

      xhr.addEventListener("error", () => {
        reject(new Error("Network error during upload"));
      });

      xhr.open("PUT", presignedUrl);
      xhr.setRequestHeader("Content-Type", file.type);
      xhr.send(file);
    });
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer.files[0];
    if (file) {
      // Trigger metadata form with the dropped file
      pendingFileRef.current = file;
      setShowMetadataForm(true);
    }
  };

  return (
    <div>
      {/* Drop Zone */}
      <div
        onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
        onDragLeave={() => setDragOver(false)}
        onDrop={handleDrop}
        onClick={() => fileInputRef.current?.click()}
        role="button"
        aria-label="Upload video — click or drag and drop"
        tabIndex={0}
        style={{
          border: `2px dashed ${dragOver ? "#4F46E5" : "#D1D5DB"}`,
          borderRadius: "12px",
          padding: "3rem",
          textAlign: "center",
          cursor: "pointer",
          background: dragOver ? "#EEF2FF" : "transparent",
          transition: "all 0.2s",
        }}
      >
        <p>Drag and drop your video here</p>
        <p>or click to browse</p>
        <p style={{ fontSize: "12px", color: "#6B7280", marginTop: "8px" }}>
          MP4, MOV, WebM — maximum 2GB
        </p>
      </div>

      <input
        ref={fileInputRef}
        type="file"
        accept="video/mp4,video/quicktime,video/webm"
        style={{ display: "none" }}
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) {
            pendingFileRef.current = file;
            setShowMetadataForm(true);
          }
        }}
      />

      {/* Upload Progress */}
      {(uploadState === "uploading" ||
        uploadState === "requesting_url" ||
        uploadState === "creating_record") && (
        <div>
          <div style={{ margin: "1rem 0" }}>
            {uploadState === "requesting_url" &&
              "Preparing upload..."}
            {uploadState === "uploading" &&
              `Uploading: ${uploadProgress}%`}
            {uploadState === "creating_record" &&
              "Finalizing..."}
          </div>
          <div
            style={{
              height: "8px",
              background: "#E5E7EB",
              borderRadius: "4px",
              overflow: "hidden",
            }}
          >
            <div
              style={{
                height: "100%",
                width: `${uploadState === "uploading" 
                  ? uploadProgress : 100}%`,
                background: "#4F46E5",
                borderRadius: "4px",
                transition: "width 0.3s ease",
              }}
            />
          </div>
        </div>
      )}

      {/* Error State */}
      {uploadState === "error" && error && (
        <div role="alert" style={{ color: "#DC2626", marginTop: "1rem" }}>
          {error}
          <button
            onClick={() => {
              setUploadState("idle");
              setError(null);
            }}
          >
            Try Again
          </button>
        </div>
      )}

      {/* Success State */}
      {uploadState === "complete" && (
        <div style={{ color: "#059669", marginTop: "1rem" }}>
          Upload complete. Transcription is processing in the background.
          You will be notified when quizzes are ready for review.
        </div>
      )}
    </div>
  );
}
```

## 5.3 VideoPlayer Component

The video player wraps Video.js and handles playback tracking —
reporting progress to the backend every 30 seconds during active
viewing.
```tsx
// components/content/VideoPlayer.tsx
"use client";

import { useEffect, useRef, useCallback } from "react";
import api from "@/lib/api";

type Props = {
  contentId: string;
  playbackUrl: string;
  initialPosition?: number;
  onProgressUpdate?: (percentage: number) => void;
};

export default function VideoPlayer({
  contentId,
  playbackUrl,
  initialPosition = 0,
  onProgressUpdate,
}: Props) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const progressIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const lastReportedPositionRef = useRef(0);
  const sessionWatchTimeRef = useRef(0);

  const reportProgress = useCallback(async () => {
    const video = videoRef.current;
    if (!video || video.paused) return;

    const currentPosition = Math.floor(video.currentTime);
    const sessionSeconds =
      currentPosition - lastReportedPositionRef.current;

    if (sessionSeconds <= 0) return;

    lastReportedPositionRef.current = currentPosition;
    sessionWatchTimeRef.current += sessionSeconds;

    try {
      const response = await api.patch(
        `/api/content/${contentId}/progress`,
        {
          current_position_seconds: currentPosition,
          session_watch_time_seconds: sessionSeconds,
        }
      );

      onProgressUpdate?.(response.data.data.completion_percentage);
    } catch {
      // Silently fail — progress tracking should not
      // interrupt the viewing experience
    }
  }, [contentId, onProgressUpdate]);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    // Set initial position (resume from last watched point)
    if (initialPosition > 0) {
      video.currentTime = initialPosition;
    }

    // Report progress every 30 seconds during playback
    const handlePlay = () => {
      lastReportedPositionRef.current = Math.floor(video.currentTime);
      progressIntervalRef.current = setInterval(reportProgress, 30000);
    };

    const handlePause = () => {
      if (progressIntervalRef.current) {
        clearInterval(progressIntervalRef.current);
      }
      reportProgress(); // Report on pause
    };

    const handleEnded = () => {
      if (progressIntervalRef.current) {
        clearInterval(progressIntervalRef.current);
      }
      reportProgress(); // Final report on completion
    };

    // Report progress when user leaves page
    const handleBeforeUnload = () => {
      reportProgress();
    };

    video.addEventListener("play", handlePlay);
    video.addEventListener("pause", handlePause);
    video.addEventListener("ended", handleEnded);
    window.addEventListener("beforeunload", handleBeforeUnload);

    return () => {
      if (progressIntervalRef.current) {
        clearInterval(progressIntervalRef.current);
      }
      video.removeEventListener("play", handlePlay);
      video.removeEventListener("pause", handlePause);
      video.removeEventListener("ended", handleEnded);
      window.removeEventListener("beforeunload", handleBeforeUnload);
    };
  }, [reportProgress, initialPosition]);

  return (
    <div style={{ width: "100%", borderRadius: "8px", overflow: "hidden" }}>
      <video
        ref={videoRef}
        src={playbackUrl}
        controls
        style={{ width: "100%", display: "block" }}
        preload="metadata"
      >
        Your browser does not support the video element.
      </video>
    </div>
  );
}
```

## 5.4 ContentStatusBadge Component
```tsx
// components/content/ContentStatusBadge.tsx
type TranscriptionStatus =
  | "PENDING"
  | "PROCESSING"
  | "COMPLETE"
  | "FAILED"
  | "NOT_REQUIRED";

type QuizStatus =
  | "NOT_STARTED"
  | "GENERATING"
  | "READY_FOR_REVIEW"
  | "APPROVED";

const transcriptionConfig: Record
  TranscriptionStatus,
  { label: string; color: string }
> = {
  PENDING: { label: "Transcription queued", color: "#6B7280" },
  PROCESSING: { label: "Transcribing...", color: "#D97706" },
  COMPLETE: { label: "Transcribed", color: "#059669" },
  FAILED: { label: "Transcription failed", color: "#DC2626" },
  NOT_REQUIRED: { label: "N/A", color: "#6B7280" },
};

export function TranscriptionStatusBadge({
  status,
}: {
  status: TranscriptionStatus;
}) {
  const config = transcriptionConfig[status];

  return (
    <span
      style={{
        fontSize: "12px",
        color: config.color,
        fontWeight: 500,
      }}
    >
      {config.label}
    </span>
  );
}

export function PublishStatusBadge({
  isPublished,
}: {
  isPublished: boolean;
}) {
  return (
    <span
      style={{
        display: "inline-block",
        padding: "2px 10px",
        borderRadius: "9999px",
        fontSize: "12px",
        fontWeight: 500,
        background: isPublished ? "#D1FAE5" : "#F3F4F6",
        color: isPublished ? "#065F46" : "#4B5563",
      }}
    >
      {isPublished ? "Published" : "Draft"}
    </span>
  );
}
```

---

# 6. Backend Logic and Implementation

## 6.1 Directory Structure
```
src/
├── controllers/
│   └── content.controller.ts
├── services/
│   └── content.service.ts
├── workers/
│   ├── transcription.worker.ts
│   └── quizGeneration.worker.ts
├── validators/
│   └── content.validator.ts
├── routes/
│   └── content.routes.ts
└── utils/
    ├── s3.utils.ts
    └── ffmpeg.utils.ts
```

## 6.2 S3 Utilities
```typescript
// utils/s3.utils.ts
import {
  S3Client,
  PutObjectCommand,
  GetObjectCommand,
  DeleteObjectCommand,
} from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

const s3 = new S3Client({
  region: process.env.AWS_REGION!,
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID!,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!,
  },
});

const BUCKET = process.env.S3_BUCKET_NAME!;
const CDN_BASE = process.env.CDN_BASE_URL!;

export const generateUploadUrl = async (
  s3Key: string,
  mimeType: string,
  expiresInSeconds = 900
): Promise<string> => {
  const command = new PutObjectCommand({
    Bucket: BUCKET,
    Key: s3Key,
    ContentType: mimeType,
  });

  return getSignedUrl(s3, command, { expiresIn: expiresInSeconds });
};

export const generateDownloadUrl = (s3Key: string): string => {
  // Use CDN URL for all content delivery
  return `${CDN_BASE}/${s3Key}`;
};

export const deleteObject = async (s3Key: string): Promise<void> => {
  const command = new DeleteObjectCommand({
    Bucket: BUCKET,
    Key: s3Key,
  });
  await s3.send(command);
};

export const buildS3Key = (
  batchId: string,
  contentId: string,
  filename: string,
  type: "video" | "document" | "supplementary"
): string => {
  const sanitizedFilename = filename
    .replace(/[^a-zA-Z0-9.-]/g, "-")
    .toLowerCase();

  return `${type}/${batchId}/${contentId}/${Date.now()}-${sanitizedFilename}`;
};
```

## 6.3 Content Service
```typescript
// services/content.service.ts
import { PrismaClient } from "@prisma/client";
import { v4 as uuidv4 } from "uuid";
import { generateUploadUrl, generateDownloadUrl, buildS3Key } from
  "../utils/s3.utils";
import { contentQueue } from "../queues/content.queue";

const prisma = new PrismaClient();

export class ContentService {

  // -------------------------------------------------------
  // GENERATE UPLOAD URL
  // -------------------------------------------------------
  async generateUploadUrl(data: {
    filename: string;
    mime_type: string;
    file_size_bytes: number;
    batch_id: string;
    uploaded_by: string;
  }) {
    // Verify batch exists and mentor is assigned
    const batchMentor = await prisma.batchMentor.findFirst({
      where: {
        batchId: data.batch_id,
        mentorId: data.uploaded_by,
      },
    });

    if (!batchMentor) {
      // Allow admins to upload to any batch
      const batch = await prisma.batch.findUnique({
        where: { id: data.batch_id },
      });
      if (!batch) {
        throw { code: "BATCH_NOT_FOUND", statusCode: 404 };
      }
    }

    // Validate file size based on type
    const isVideo = data.mime_type.startsWith("video/");
    const maxSize = isVideo
      ? 2 * 1024 * 1024 * 1024  // 2GB for video
      : 50 * 1024 * 1024;        // 50MB for documents

    if (data.file_size_bytes > maxSize) {
      throw {
        code: "FILE_TOO_LARGE",
        message: isVideo
          ? "Video files cannot exceed 2GB"
          : "Document files cannot exceed 50MB",
        statusCode: 400,
      };
    }

    // Generate content ID upfront so we can use it in the S3 key
    const contentId = uuidv4();
    const s3Key = buildS3Key(
      data.batch_id,
      contentId,
      data.filename,
      isVideo ? "video" : "document"
    );

    const uploadUrl = await generateUploadUrl(s3Key, data.mime_type);

    return {
      upload_url: uploadUrl,
      content_id: contentId,
      s3_key: s3Key,
      expires_in_seconds: 900,
    };
  }

  // -------------------------------------------------------
  // CREATE CONTENT RECORD
  // -------------------------------------------------------
  async createContent(data: {
    content_id: string;
    s3_key: string;
    title: string;
    description?: string;
    topic_tags?: string[];
    learning_objectives?: string;
    content_type: string;
    batch_id: string;
    mime_type: string;
    file_size_bytes: number;
    uploaded_by: string;
  }) {
    // Determine if transcription is required
    const requiresTranscription =
      data.content_type === "VIDEO" ||
      data.content_type === "LIVE_RECORDING";

    // Get the highest current sort_order in this batch
    const lastContent = await prisma.content.findFirst({
      where: { batchId: data.batch_id, deletedAt: null },
      orderBy: { sortOrder: "desc" },
      select: { sortOrder: true },
    });

    const nextSortOrder = (lastContent?.sortOrder ?? 0) + 1;

    // Create content record
    const content = await prisma.content.create({
      data: {
        id: data.content_id,
        batchId: data.batch_id,
        uploadedBy: data.uploaded_by,
        title: data.title,
        description: data.description ?? null,
        contentType: data.content_type as any,
        storageUrl: data.s3_key,
        cdnUrl: generateDownloadUrl(data.s3_key),
        topicTags: data.topic_tags ?? [],
        learningObjectives: data.learning_objectives ?? null,
        mimeType: data.mime_type,
        fileSizeBytes: data.file_size_bytes,
        transcriptionStatus: requiresTranscription
          ? "PENDING"
          : "NOT_REQUIRED",
        isPublished: false,
        sortOrder: nextSortOrder,
      },
    });

    // Queue transcription job if required
    if (requiresTranscription) {
      await contentQueue.add(
        "TRANSCRIPTION",
        { content_id: content.id },
        {
          attempts: 3,
          backoff: { type: "exponential", delay: 60000 },
        }
      );
    }

    return {
      content_id: content.id,
      title: content.title,
      content_type: content.contentType,
      is_published: content.isPublished,
      transcription_status: content.transcriptionStatus,
      sort_order: content.sortOrder,
      created_at: content.createdAt,
    };
  }

  // -------------------------------------------------------
  // GET BATCH CONTENT
  // -------------------------------------------------------
  async getBatchContent(
    batchId: string,
    userId: string,
    userRole: string,
    options: { page: number; limit: number }
  ) {
    const isMentorOrAdmin =
      userRole === "MENTOR" ||
      userRole === "ADMIN" ||
      userRole === "SUPER_ADMIN";

    const whereClause: any = {
      batchId,
      deletedAt: null,
    };

    // Students only see published content
    if (!isMentorOrAdmin) {
      whereClause.isPublished = true;
    }

    const [contentItems, total] = await Promise.all([
      prisma.content.findMany({
        where: whereClause,
        orderBy: { sortOrder: "asc" },
        skip: (options.page - 1) * options.limit,
        take: options.limit,
        include: isMentorOrAdmin
          ? {
              _count: {
                select: {
                  quizzes: {
                    where: { generationStatus: "APPROVED" },
                  },
                },
              },
            }
          : undefined,
      }),
      prisma.content.count({ where: whereClause }),
    ]);

    // For students, fetch their access logs
    let accessLogMap: Record<string, any> = {};
    if (!isMentorOrAdmin) {
      const accessLogs = await prisma.contentAccessLog.findMany({
        where: {
          studentId: userId,
          contentId: { in: contentItems.map((c) => c.id) },
        },
      });

      accessLogMap = Object.fromEntries(
        accessLogs.map((log) => [log.contentId, log])
      );
    }

    const formattedContent = contentItems.map((item) => {
      const base = {
        content_id: item.id,
        title: item.title,
        description: item.description,
        content_type: item.contentType,
        duration_seconds: item.durationSeconds,
        topic_tags: item.topicTags,
        sort_order: item.sortOrder,
        created_at: item.createdAt,
      };

      if (isMentorOrAdmin) {
        return {
          ...base,
          is_published: item.isPublished,
          transcription_status: item.transcriptionStatus,
          approved_quiz_count: (item as any)._count?.quizzes ?? 0,
        };
      }

      const log = accessLogMap[item.id];
      return {
        ...base,
        my_progress: log
          ? {
              completion_percentage: Number(log.completionPercentage),
              is_completed: log.isCompleted,
              last_position_seconds: log.lastPositionSeconds,
              total_watch_time_seconds: log.totalWatchTimeSeconds,
              last_accessed_at: log.lastAccessedAt,
            }
          : null,
      };
    });

    return {
      content: formattedContent,
      pagination: {
        page: options.page,
        limit: options.limit,
        total,
        total_pages: Math.ceil(total / options.limit),
      },
    };
  }

  // -------------------------------------------------------
  // UPDATE CONTENT PROGRESS (Student)
  // -------------------------------------------------------
  async updateContentProgress(
    contentId: string,
    studentId: string,
    data: {
      current_position_seconds: number;
      session_watch_time_seconds: number;
    }
  ) {
    // Get content to calculate completion percentage
    const content = await prisma.content.findUnique({
      where: { id: contentId },
      select: { durationSeconds: true, batchId: true },
    });

    if (!content) {
      throw { code: "CONTENT_NOT_FOUND", statusCode: 404 };
    }

    const completionPercentage = content.durationSeconds
      ? Math.min(
          (data.current_position_seconds / content.durationSeconds) * 100,
          100
        )
      : 0;

    const isCompleted = completionPercentage >= 90;

    // Upsert access log
    const log = await prisma.contentAccessLog.upsert({
      where: {
        studentId_contentId: {
          studentId,
          contentId,
        },
      },
      create: {
        studentId,
        contentId,
        batchId: content.batchId,
        lastPositionSeconds: data.current_position_seconds,
        totalWatchTimeSeconds: data.session_watch_time_seconds,
        completionPercentage,
        isCompleted,
      },
      update: {
        lastAccessedAt: new Date(),
        lastPositionSeconds: data.current_position_seconds,
        totalWatchTimeSeconds: {
          increment: data.session_watch_time_seconds,
        },
        completionPercentage:
          completionPercentage >
          0
            ? completionPercentage
            : undefined,
        isCompleted: isCompleted ? true : undefined,
        rewatchCount: isCompleted
          ? { increment: 1 }
          : undefined,
      },
    });

    return {
      completion_percentage: Number(log.completionPercentage),
      is_completed: log.isCompleted,
      total_watch_time_seconds: log.totalWatchTimeSeconds,
    };
  }

  // -------------------------------------------------------
  // REORDER CONTENT
  // -------------------------------------------------------
  async reorderContent(
    batchId: string,
    contentOrder: Array<{ content_id: string; sort_order: number }>
  ) {
    // Update all sort orders in a single transaction
    await prisma.$transaction(
      contentOrder.map(({ content_id, sort_order }) =>
        prisma.content.update({
          where: { id: content_id, batchId },
          data: { sortOrder: sort_order },
        })
      )
    );
  }

  // -------------------------------------------------------
  // SOFT DELETE CONTENT
  // -------------------------------------------------------
  async deleteContent(contentId: string, userId: string,
    userRole: string) {
    const content = await prisma.content.findUnique({
      where: { id: contentId },
    });

    if (!content || content.deletedAt) {
      throw { code: "CONTENT_NOT_FOUND", statusCode: 404 };
    }

    // Mentors can only delete their own content
    if (
      userRole === "MENTOR" &&
      content.uploadedBy !== userId
    ) {
      throw { code: "PERMISSION_DENIED", statusCode: 403 };
    }

    await prisma.content.update({
      where: { id: contentId },
      data: {
        deletedAt: new Date(),
        isPublished: false,
      },
    });
  }
}
```

## 6.4 Transcription Worker

The transcription worker runs as a Bull queue consumer. It downloads
the video, runs Whisper for transcription, and triggers quiz generation.
```typescript
// workers/transcription.worker.ts
import { Job } from "bull";
import { PrismaClient } from "@prisma/client";
import { exec } from "child_process";
import { promisify } from "util";
import fs from "fs";
import path from "path";
import { S3Client, GetObjectCommand } from "@aws-sdk/client-s3";
import { contentQueue } from "../queues/content.queue";
import { notificationService } from "../services/notification.service";

const execAsync = promisify(exec);
const prisma = new PrismaClient();
const s3 = new S3Client({ region: process.env.AWS_REGION! });

export const processTranscriptionJob = async (job: Job) => {
  const { content_id } = job.data;
  const tmpDir = `/tmp/transcription/${content_id}`;

  console.log(`[TranscriptionWorker] Processing content ${content_id}`);

  try {
    // Step 1: Mark as PROCESSING
    await prisma.content.update({
      where: { id: content_id },
      data: { transcriptionStatus: "PROCESSING" },
    });

    // Step 2: Get content record
    const content = await prisma.content.findUnique({
      where: { id: content_id },
      include: {
        batch: {
          include: {
            mentors: { select: { mentorId: true } },
          },
        },
      },
    });

    if (!content) throw new Error("Content not found");

    // Step 3: Create temp directory
    await fs.promises.mkdir(tmpDir, { recursive: true });

    // Step 4: Download video from S3
    console.log(`[TranscriptionWorker] Downloading video...`);
    const videoPath = path.join(tmpDir, "video.mp4");

    const s3Response = await s3.send(
      new GetObjectCommand({
        Bucket: process.env.S3_BUCKET_NAME!,
        Key: content.storageUrl,
      })
    );

    const videoStream = s3Response.Body as NodeJS.ReadableStream;
    const writeStream = fs.createWriteStream(videoPath);

    await new Promise<void>((resolve, reject) => {
      videoStream.pipe(writeStream);
      writeStream.on("finish", resolve);
      writeStream.on("error", reject);
    });

    // Step 5: Extract audio using FFmpeg
    console.log(`[TranscriptionWorker] Extracting audio...`);
    const audioPath = path.join(tmpDir, "audio.wav");

    await execAsync(
      `ffmpeg -i "${videoPath}" -ar 16000 -ac 1 "${audioPath}" -y`
    );

    // Step 6: Get video duration
    const { stdout: durationOutput } = await execAsync(
      `ffprobe -v quiet -show_entries format=duration ` +
      `-of csv=p=0 "${videoPath}"`
    );
    const durationSeconds = Math.floor(parseFloat(durationOutput.trim()));

    // Step 7: Run Whisper transcription
    console.log(`[TranscriptionWorker] Running Whisper...`);
    const transcriptPath = path.join(tmpDir, "transcript.txt");

    await execAsync(
      `whisper "${audioPath}" --model medium --output_format txt ` +
      `--output_dir "${tmpDir}" --language en`
    );

    // Step 8: Read transcript
    const transcript = await fs.promises.readFile(
      transcriptPath,
      "utf-8"
    );

    // Step 9: Update content record
    await prisma.content.update({
      where: { id: content_id },
      data: {
        transcript: transcript.trim(),
        transcriptionStatus: "COMPLETE",
        durationSeconds,
      },
    });

    // Step 10: Queue quiz generation
    await contentQueue.add(
      "QUIZ_GENERATION",
      { content_id },
      {
        attempts: 3,
        backoff: { type: "exponential", delay: 60000 },
      }
    );

    // Step 11: Notify mentor
    const mentorIds = content.batch.mentors.map((bm) => bm.mentorId);
    for (const mentorId of mentorIds) {
      await notificationService.send({
        userId: mentorId,
        type: "TRANSCRIPTION_COMPLETE",
        title: "Transcription Complete",
        message: `Transcription complete for "${content.title}". 
                  Quizzes are now being generated.`,
        metadata: { content_id },
      });
    }

    console.log(
      `[TranscriptionWorker] Completed content ${content_id}`
    );

  } catch (error: any) {
    console.error(
      `[TranscriptionWorker] Failed for ${content_id}:`,
      error
    );

    // Mark as FAILED
    await prisma.content.update({
      where: { id: content_id },
      data: {
        transcriptionStatus: "FAILED",
        transcriptionError: error.message,
      },
    });

    // Re-throw to trigger Bull retry mechanism
    throw error;

  } finally {
    // Always clean up temp files
    try {
      await fs.promises.rm(tmpDir, { recursive: true, force: true });
    } catch {
      // Ignore cleanup errors
    }
  }
};
```

## 6.5 Content Routes
```typescript
// routes/content.routes.ts
import { Router } from "express";
import { ContentController } from "../controllers/content.controller";
import { authenticate } from "../middleware/authenticate.middleware";
import { authorize } from "../middleware/authorize.middleware";
import { validate } from "../middleware/validate.middleware";
import {
  createUploadUrlSchema,
  createContentSchema,
  updateContentSchema,
  updateProgressSchema,
  reorderContentSchema,
} from "../validators/content.validator";

const router = Router();
const controller = new ContentController();

// All routes require authentication
router.use(authenticate);

const MENTOR_ROLES = ["MENTOR", "ADMIN", "SUPER_ADMIN"];

// Upload endpoints
router.post(
  "/upload-url",
  authorize(MENTOR_ROLES),
  validate(createUploadUrlSchema),
  controller.generateUploadUrl
);

router.post(
  "/",
  authorize(MENTOR_ROLES),
  validate(createContentSchema),
  controller.createContent
);

// Content retrieval — batch-scoped
router.get(
  "/batches/:batchId/content",
  authorize(["STUDENT", "MENTOR", "ADMIN", "SUPER_ADMIN"]),
  controller.getBatchContent
);

// Individual content endpoints
router.get(
  "/:contentId",
  authorize(["STUDENT", "MENTOR", "ADMIN", "SUPER_ADMIN"]),
  controller.getContent
);

router.put(
  "/:contentId",
  authorize(MENTOR_ROLES),
  validate(updateContentSchema),
  controller.updateContent
);

router.delete(
  "/:contentId",
  authorize(MENTOR_ROLES),
  controller.deleteContent
);

router.post(
  "/:contentId/publish",
  authorize(MENTOR_ROLES),
  controller.publishContent
);

router.post(
  "/:contentId/unpublish",
  authorize(MENTOR_ROLES),
  controller.unpublishContent
);

// Reorder content
router.put(
  "/reorder",
  authorize(MENTOR_ROLES),
  validate(reorderContentSchema),
  controller.reorderContent
);

// Transcript endpoints
router.get(
  "/:contentId/transcript",
  authorize(MENTOR_ROLES),
  controller.getTranscript
);

router.put(
  "/:contentId/transcript",
  authorize(MENTOR_ROLES),
  controller.updateTranscript
);

router.post(
  "/:contentId/regenerate-quizzes",
  authorize(MENTOR_ROLES),
  controller.regenerateQuizzes
);

// Student progress endpoints
router.patch(
  "/:contentId/progress",
  authorize(["STUDENT"]),
  validate(updateProgressSchema),
  controller.updateProgress
);

router.get(
  "/:contentId/progress",
  authorize(["STUDENT", "MENTOR", "ADMIN", "SUPER_ADMIN"]),
  controller.getProgress
);

// Supplementary files
router.post(
  "/:contentId/files/upload-url",
  authorize(MENTOR_ROLES),
  controller.generateFileUploadUrl
);

router.post(
  "/:contentId/files",
  authorize(MENTOR_ROLES),
  controller.createSupplementaryFile
);

router.delete(
  "/:contentId/files/:fileId",
  authorize(MENTOR_ROLES),
  controller.deleteSupplementaryFile
);

export default router;
```

---

# 7. Implementation Steps

## 7.1 Step-by-Step Build Order

### Step 1 — Database Schema (Day 1)

Add the three new tables to Prisma schema:
- content
- content_access_logs
- supplementary_files

Run migration:
```bash
npx prisma migrate dev --name add_content_tables
```

Install required packages:
```bash
npm install @aws-sdk/client-s3 @aws-sdk/s3-request-presigner
npm install bull @types/bull
npm install uuid @types/uuid
npm install fluent-ffmpeg @types/fluent-ffmpeg
```

### Step 2 — S3 Configuration (Day 1)

Set up S3 bucket with correct CORS configuration to allow
browser-to-S3 direct uploads:
```json
[
  {
    "AllowedHeaders": ["*"],
    "AllowedMethods": ["PUT", "GET"],
    "AllowedOrigins": ["http://localhost:3000",
                       "https://yourdomain.com"],
    "ExposeHeaders": ["ETag"],
    "MaxAgeSeconds": 3600
  }
]
```

Add S3 environment variables:
```env
AWS_REGION=ap-south-1
AWS_ACCESS_KEY_ID=your-access-key
AWS_SECRET_ACCESS_KEY=your-secret-key
S3_BUCKET_NAME=m2i-lms-content
CDN_BASE_URL=https://cdn.yourdomain.com
```

Create S3 utilities file from section 6.2.

### Step 3 — Bull Queue Setup (Day 1)
```typescript
// queues/content.queue.ts
import Bull from "bull";

export const contentQueue = new Bull("content-processing", {
  redis: {
    host: process.env.REDIS_HOST ?? "localhost",
    port: parseInt(process.env.REDIS_PORT ?? "6379"),
  },
  defaultJobOptions: {
    removeOnComplete: 100,
    removeOnFail: 50,
  },
});
```

Add Redis environment variable:
```env
REDIS_HOST=localhost
REDIS_PORT=6379
```

### Step 4 — Content Service Core (Day 2)

Build and test:
1. `generateUploadUrl()` — test pre-signed URL generation
2. `createContent()` — test record creation and queue job
3. `getBatchContent()` — test mentor vs student view
4. `getContent()` — test access control

### Step 5 — Transcription Worker (Day 2-3)

This is the most complex step. Build in this order:
1. Install Whisper on the server (Python dependency)
2. Install FFmpeg (system dependency)
3. Test Whisper manually on a sample video
4. Build the worker step by step, testing each stage
5. Test the full pipeline with a real video upload

Install Whisper:
```bash
pip install openai-whisper
```

Install FFmpeg:
```bash
sudo apt-get install ffmpeg
```

Test Whisper manually:
```bash
whisper sample.mp4 --model medium --output_format txt
```

### Step 6 — Content Service — Progress Tracking (Day 3)

Build and test:
1. `updateContentProgress()` — test upsert logic
2. `reorderContent()` — test transaction
3. `deleteContent()` — test soft delete

### Step 7 — Controllers and Routes (Day 3)

Wire up all controllers and routes. Test every endpoint with
a real S3 bucket in development mode.

### Step 8 — Frontend — Upload Flow (Day 4)

Build in order:
1. VideoUploader component with drag-and-drop
2. ContentMetadataForm for title, description, objectives
3. UploadProgressBar component
4. Integration of upload flow into mentor content page

### Step 9 — Frontend — Student Experience (Day 4-5)

Build in order:
1. ContentList with progress indicators
2. VideoPlayer with resume and progress reporting
3. ContentCard with status indicators
4. ContentStatusBadge components

### Step 10 — Integration Testing (Day 5)

Test the complete pipeline end to end:
1. Mentor uploads a video
2. Verify file appears in S3
3. Verify transcription job runs
4. Verify transcript is stored
5. Verify quiz generation is triggered
6. Student accesses published content
7. Verify progress tracking updates correctly
8. Verify resume works after browser refresh

---

# 8. Error Handling

## 8.1 Error Code Reference
```
CONTENT_NOT_FOUND          : 404 — Content ID does not exist
CONTENT_ALREADY_DELETED    : 400 — Content is already soft-deleted
CONTENT_NOT_PUBLISHED      : 403 — Student tried to access draft
FILE_TOO_LARGE             : 400 — File exceeds size limit
UNSUPPORTED_FILE_TYPE      : 400 — File format not supported
UPLOAD_URL_EXPIRED         : 400 — Pre-signed URL has expired
TRANSCRIPTION_IN_PROGRESS  : 400 — Cannot regenerate during processing
BATCH_NOT_FOUND            : 404 — Batch does not exist
MENTOR_NOT_ASSIGNED        : 403 — Mentor not assigned to this batch
PERMISSION_DENIED          : 403 — User cannot access this content
PROGRESS_UPDATE_FAILED     : 500 — Database error during progress save
```

## 8.2 Transcription Failure Handling

When Whisper transcription fails after all retry attempts, the system:

1. Sets content.transcriptionStatus = "FAILED"
2. Stores the error message in content.transcriptionError
3. Sends notification to all batch mentors
4. The content remains accessible for publishing — transcription
   failure does NOT block content delivery
5. The mentor can: retry transcription, manually enter the transcript,
   or create quizzes manually

## 8.3 Upload Interruption Handling

If the browser connection drops during an S3 upload, the pre-signed
URL remains valid for 15 minutes. The frontend stores upload state in
sessionStorage so the upload can be resumed if the page is refreshed
within the validity window.

For very large files (>500MB), a multipart upload approach should be
considered in a future iteration. For Phase One, single-part uploads
are acceptable given the 15-minute window.

---

# 9. Testing Strategy

## 9.1 Unit Tests
```typescript
// tests/content.service.test.ts

describe("ContentService.updateContentProgress", () => {

  it("should mark content as completed at 90% watch", async () => {
    prismaMock.content.findUnique.mockResolvedValue({
      id: "content-uuid",
      durationSeconds: 1000,
      batchId: "batch-uuid",
    } as any);

    prismaMock.contentAccessLog.upsert.mockResolvedValue({
      completionPercentage: 90,
      isCompleted: true,
      totalWatchTimeSeconds: 900,
    } as any);

    const result = await contentService.updateContentProgress(
      "content-uuid",
      "student-uuid",
      {
        current_position_seconds: 900,
        session_watch_time_seconds: 30,
      }
    );

    expect(result.is_completed).toBe(true);
    expect(result.completion_percentage).toBe(90);
  });

  it("should not mark as completed below 90%", async () => {
    // ... similar setup with 80% position
    const result = await contentService.updateContentProgress(
      "content-uuid",
      "student-uuid",
      {
        current_position_seconds: 800,
        session_watch_time_seconds: 30,
      }
    );

    expect(result.is_completed).toBe(false);
  });
});
```

---

# 10. Code Examples

## 10.1 How to Access Content from Other Features

Other features (Quiz Generation, Live Sessions, Metrics) access content
data through the content service. Never query the content table directly
from other services — always go through the ContentService to ensure
access control is consistently applied.
```typescript
// Example: Quiz generation worker getting content for processing
import { prisma } from "../lib/prisma";

const getContentForQuizGeneration = async (contentId: string) => {
  const content = await prisma.content.findUnique({
    where: {
      id: contentId,
      deletedAt: null,
      transcriptionStatus: "COMPLETE",
    },
    select: {
      id: true,
      title: true,
      transcript: true,
      learningObjectives: true,
      topicTags: true,
      batchId: true,
      batch: {
        include: {
          mentors: { select: { mentorId: true } },
        },
      },
    },
  });

  if (!content) {
    throw new Error(`Content ${contentId} not found or not transcribed`);
  }

  return content;
};
```

---

# 11. Performance Optimization

## 11.1 CDN Configuration

All video content must be served through CloudFront or another CDN —
never directly from S3. Direct S3 URLs are expensive per-byte for
delivery and have high latency for users outside the S3 bucket's
region. CDN configuration:
```
Origin: your-s3-bucket.s3.ap-south-1.amazonaws.com
Cache behavior:
  - Path: /video/*    TTL: 86400 (24 hours)
  - Path: /document/* TTL: 86400 (24 hours)
  - Path: /files/*    TTL: 86400 (24 hours)
Compression: enabled
HTTPS: required
```

## 11.2 Progress Tracking Optimization

The PATCH /api/content/:contentId/progress endpoint is called every
30 seconds for every active viewer. For 100 concurrent students all
watching videos, this is approximately 200 database writes per minute.
This is manageable for Phase One with PostgreSQL.

For Phase Two scaling, batch progress updates using a Redis-backed
write buffer that flushes to PostgreSQL every 5 minutes instead of
writing on every 30-second call.

## 11.3 Transcript Storage

Transcripts for a 45-minute video can be 5,000–8,000 words or roughly
30–50KB of text. Storing this in the PostgreSQL TEXT column is fine
for Phase One. If transcript search becomes a requirement in future
phases, consider moving transcripts to a full-text search engine like
Elasticsearch or using PostgreSQL's built-in tsvector search.

## 11.4 Worker Resource Management

The transcription worker downloads entire video files to local temp
storage before processing. For a 2GB video, this requires at least 4GB
of available disk space on the worker server (2GB for the video, 2GB
for the extracted audio WAV file). Monitor worker disk usage and set
up alerts at 70% disk capacity.

---

**End of Feature 03 — Content Management System**

---

**Document Information**

| Field | Value |
|-------|-------|
| Feature | F03 — Content Management System |
| Version | 1.0 |
| Status | Ready for Development |
| Folder | F03_Content_Management/ |
| Filename | F03_Implementation_Guide.md |
| Previous Feature | F02_Batch_Management/ |
| Next Feature | F04_Quiz_Generation/F04_Implementation_Guide.md |