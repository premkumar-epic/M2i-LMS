# Feature 02 — Batch Management
### Complete Implementation Guide | Version 1.0 | March 2026
### Save As: F02_Batch_Management/F02_Implementation_Guide.md

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

Batch Management is the organizational backbone of M2i_LMS. A batch
represents a cohort of students who go through a defined curriculum
together over a specific time period. Everything else in the platform —
content, quizzes, live sessions, progress tracking — is organized
within the context of a batch.

Think of a batch as a classroom. It has a start date, an end date, a
group of students enrolled in it, one or more mentors assigned to it,
and a curriculum of content delivered within it. Without a batch, none
of the other features have an organizational context to operate in.

In Phase One, M2i_LMS supports a single active batch. However, the
entire data model and API architecture is designed from the start to
support multiple batches running simultaneously, because Phase Two will
require this capability. Every table that stores batch-specific data
uses batch_id as a foreign key. Every API endpoint that returns
batch-specific data is scoped to a batch. This upfront investment in
multi-batch architecture makes Phase Two straightforward to build.

## 1.2 Why This Feature Exists

Without Batch Management, the platform would have no way to:
- Organize students into cohorts with defined start and end dates
- Scope content, sessions, and quizzes to the right group of students
- Track progress meaningfully within a defined time period
- Support multiple simultaneous cohorts in future phases
- Give admins control over who is learning what and when

## 1.3 Batch Lifecycle

A batch moves through the following status transitions during its
lifetime:
```
DRAFT → ACTIVE → COMPLETED → ARCHIVED
                     ↑
               (auto transition
                when end_date passes)
```

**DRAFT:** Batch is created but not yet open. Students can be enrolled
but content is not yet accessible. Mentors can begin uploading content.

**ACTIVE:** Batch is running. Students can access content, take quizzes,
and attend sessions. This is the normal operating state.

**COMPLETED:** End date has passed. The batch is no longer active.
Students retain read-only access to content and their progress data but
cannot take new quizzes or attend new sessions. This transition happens
automatically when the end_date passes.

**ARCHIVED:** Admin has manually archived the batch. It is removed from
active listings but all data is preserved. No new activity can occur.

---

# 2. Core Functionality

## 2.1 Batch Creation

Admin creates a batch by providing a name, description, start date,
end date, and optionally assigning mentors immediately. The batch is
created in DRAFT status. No students can access it until it transitions
to ACTIVE.

### Batch Creation Sequence
```
Admin fills batch creation form
(name, description, start_date, end_date)
          |
          v
Frontend validates all fields
          |
          v
Backend receives request
          |
          v
Validate:
  - name is unique
  - end_date is after start_date
  - start_date is not in the past
          |
    ------+------
    |           |
Validation   Validation
fails        passes
    |           |
    v           v
Return      Create batch record
error       with status DRAFT
                |
                v
            Return created
            batch with ID
                |
                v
            Admin redirected
            to batch detail page
```

## 2.2 Student Enrollment

Admin enrolls students in a batch by selecting from the list of
registered students with the STUDENT role. Multiple students can be
enrolled in a single operation. Each enrollment creates an Enrollment
record linking the student to the batch.

### Enrollment Sequence
```
Admin opens batch detail page
          |
          v
Admin clicks "Enroll Students"
          |
          v
System fetches all STUDENT users
not already enrolled in this batch
          |
          v
Admin selects one or more students
from the list using multi-select
          |
          v
Admin confirms enrollment
          |
          v
Backend receives array of student IDs
          |
          v
For each student_id:
  - Check student exists and has STUDENT role
  - Check not already enrolled in this batch
  - Check not enrolled in another ACTIVE batch
    (Phase One constraint)
          |
          v
Create Enrollment records for
all valid student IDs in a
single database transaction
          |
          v
Return summary:
  - Successfully enrolled: [N]
  - Skipped (already enrolled): [N]
  - Failed (validation errors): [N] with reasons
```

## 2.3 Mentor Assignment

Mentors are assigned to batches by admins. Assigned mentors gain access
to all content management, quiz review, live session management, and
student progress features for that batch. A mentor can be assigned to
multiple batches simultaneously.

### Mentor Assignment Sequence
```
Admin opens batch detail page
          |
          v
Admin clicks "Assign Mentor"
          |
          v
System fetches all MENTOR users
not already assigned to this batch
          |
          v
Admin selects mentor(s) from list
          |
          v
Backend creates BatchMentor
records linking mentor to batch
          |
          v
Mentor immediately gains access
to batch features
```

## 2.4 Batch Status Transitions

### Auto-Transition: DRAFT to ACTIVE

A scheduled job runs daily at midnight. For each batch with status
DRAFT where start_date equals today's date, the status is automatically
updated to ACTIVE and enrolled students receive a notification:
"Your batch [name] has started. Access your content now."

### Auto-Transition: ACTIVE to COMPLETED

The same scheduled job checks for each batch with status ACTIVE where
end_date is before today's date. The status is automatically updated
to COMPLETED.

### Manual Transition: Any status to ARCHIVED

Admin manually archives a batch from the batch detail page. This is a
permanent action — archived batches cannot be unarchived. A
confirmation dialog explains this before the action is executed.

## 2.5 Current Week Calculation

The "current week" is a computed value used throughout the platform —
in the progress dashboard, in content organization, and in the metrics
engine. It is calculated as:
```
currentWeek = Math.floor(
  (today - batch.start_date) / 7 days
) + 1
```

Week 1 begins on the batch start date. The value is clamped between 1
and the total batch duration in weeks. This value is computed at API
response time — it is never stored in the database.

---

# 3. Data Model

## 3.1 Batches Table
```sql
CREATE TABLE batches (
  id            UUID          PRIMARY KEY DEFAULT gen_random_uuid(),
  name          VARCHAR(255)  NOT NULL,
  description   TEXT          DEFAULT NULL,
  start_date    DATE          NOT NULL,
  end_date      DATE          NOT NULL,
  status        VARCHAR(20)   NOT NULL DEFAULT 'DRAFT'
                              CHECK (status IN (
                                'DRAFT',
                                'ACTIVE',
                                'COMPLETED',
                                'ARCHIVED'
                              )),
  created_by    UUID          NOT NULL REFERENCES users(id),
  created_at    TIMESTAMP     NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMP     NOT NULL DEFAULT NOW()
);

-- Indexes
CREATE UNIQUE INDEX idx_batches_name 
  ON batches(name);

CREATE INDEX idx_batches_status 
  ON batches(status);

CREATE INDEX idx_batches_start_date 
  ON batches(start_date);

CREATE INDEX idx_batches_end_date 
  ON batches(end_date);
```

### Column Definitions

**id:** UUID primary key, auto-generated.

**name:** Display name of the batch. Must be unique across all batches
including archived ones. Examples: "Full Stack Batch Jan 2026",
"Data Science Cohort 03".

**description:** Optional detailed description of the batch curriculum,
goals, and target audience. Shown to students on their dashboard.

**start_date:** The calendar date the batch begins. When this date
arrives, the batch auto-transitions from DRAFT to ACTIVE and students
gain access to content.

**end_date:** The calendar date the batch ends. When this date passes,
the batch auto-transitions from ACTIVE to COMPLETED.

**status:** Current lifecycle status of the batch. Controlled by auto-
transitions and admin actions.

**created_by:** Foreign key to the admin who created the batch. Used
for audit purposes.

**created_at / updated_at:** Standard audit timestamps.

## 3.2 Enrollments Table
```sql
CREATE TABLE enrollments (
  id              UUID          PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id      UUID          NOT NULL REFERENCES users(id),
  batch_id        UUID          NOT NULL REFERENCES batches(id),
  status          VARCHAR(20)   NOT NULL DEFAULT 'ACTIVE'
                                CHECK (status IN (
                                  'ACTIVE',
                                  'WITHDRAWN',
                                  'COMPLETED'
                                )),
  enrolled_at     TIMESTAMP     NOT NULL DEFAULT NOW(),
  enrolled_by     UUID          NOT NULL REFERENCES users(id),
  withdrawn_at    TIMESTAMP     DEFAULT NULL,
  withdrawn_by    UUID          DEFAULT NULL REFERENCES users(id),
  completed_at    TIMESTAMP     DEFAULT NULL
);

-- Unique constraint: one enrollment per student per batch
CREATE UNIQUE INDEX idx_enrollments_student_batch
  ON enrollments(student_id, batch_id);

-- Indexes for common queries
CREATE INDEX idx_enrollments_batch_id
  ON enrollments(batch_id);

CREATE INDEX idx_enrollments_student_id
  ON enrollments(student_id);

CREATE INDEX idx_enrollments_status
  ON enrollments(status);
```

### Column Definitions

**id:** UUID primary key.

**student_id:** Foreign key to users table. Must be a user with role
STUDENT. Enforced at application layer (Prisma query filters by role).

**batch_id:** Foreign key to batches table.

**status:** ACTIVE = enrolled and participating. WITHDRAWN = removed
from batch. COMPLETED = batch finished and student completed it.

**enrolled_at:** When the enrollment was created.

**enrolled_by:** The admin who enrolled this student.

**withdrawn_at / withdrawn_by:** When and by whom the student was
withdrawn. NULL means not withdrawn.

**completed_at:** When the enrollment was marked complete (set
automatically when batch transitions to COMPLETED).

**Unique index on (student_id, batch_id):** Prevents a student from
being enrolled in the same batch twice. The application layer also
checks this before attempting insert to provide a clear error message.

## 3.3 BatchMentors Table

Junction table linking mentors to batches. A mentor can be assigned to
multiple batches. A batch can have multiple mentors.
```sql
CREATE TABLE batch_mentors (
  id            UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  batch_id      UUID        NOT NULL REFERENCES batches(id),
  mentor_id     UUID        NOT NULL REFERENCES users(id),
  assigned_at   TIMESTAMP   NOT NULL DEFAULT NOW(),
  assigned_by   UUID        NOT NULL REFERENCES users(id)
);

-- Unique constraint: one assignment per mentor per batch
CREATE UNIQUE INDEX idx_batch_mentors_batch_mentor
  ON batch_mentors(batch_id, mentor_id);

CREATE INDEX idx_batch_mentors_batch_id
  ON batch_mentors(batch_id);

CREATE INDEX idx_batch_mentors_mentor_id
  ON batch_mentors(mentor_id);
```

## 3.4 Prisma Schema
```prisma
model Batch {
  id          String      @id @default(dbgenerated("gen_random_uuid()")) @db.Uuid
  name        String      @unique @db.VarChar(255)
  description String?     @db.Text
  startDate   DateTime    @map("start_date") @db.Date
  endDate     DateTime    @map("end_date") @db.Date
  status      BatchStatus @default(DRAFT)
  createdBy   String      @map("created_by") @db.Uuid
  createdAt   DateTime    @default(now()) @map("created_at")
  updatedAt   DateTime    @updatedAt @map("updated_at")

  creator     User          @relation("BatchCreator", fields: [createdBy], references: [id])
  enrollments Enrollment[]
  mentors     BatchMentor[]
  content     Content[]
  liveSessions LiveSession[]

  @@map("batches")
}

model Enrollment {
  id          String           @id @default(dbgenerated("gen_random_uuid()")) @db.Uuid
  studentId   String           @map("student_id") @db.Uuid
  batchId     String           @map("batch_id") @db.Uuid
  status      EnrollmentStatus @default(ACTIVE)
  enrolledAt  DateTime         @default(now()) @map("enrolled_at")
  enrolledBy  String           @map("enrolled_by") @db.Uuid
  withdrawnAt DateTime?        @map("withdrawn_at")
  withdrawnBy String?          @map("withdrawn_by") @db.Uuid
  completedAt DateTime?        @map("completed_at")

  student     User    @relation("StudentEnrollments", fields: [studentId], references: [id])
  batch       Batch   @relation(fields: [batchId], references: [id])
  enrolledByUser User @relation("EnrolledByUser", fields: [enrolledBy], references: [id])

  @@unique([studentId, batchId])
  @@map("enrollments")
}

model BatchMentor {
  id          String   @id @default(dbgenerated("gen_random_uuid()")) @db.Uuid
  batchId     String   @map("batch_id") @db.Uuid
  mentorId    String   @map("mentor_id") @db.Uuid
  assignedAt  DateTime @default(now()) @map("assigned_at")
  assignedBy  String   @map("assigned_by") @db.Uuid

  batch       Batch @relation(fields: [batchId], references: [id])
  mentor      User  @relation("MentorBatches", fields: [mentorId], references: [id])

  @@unique([batchId, mentorId])
  @@map("batch_mentors")
}

enum BatchStatus {
  DRAFT
  ACTIVE
  COMPLETED
  ARCHIVED
}

enum EnrollmentStatus {
  ACTIVE
  WITHDRAWN
  COMPLETED
}
```

---

# 4. API Endpoints

## 4.1 Batch CRUD Endpoints

### POST /api/batches

**Access:** ADMIN, SUPER_ADMIN

**Purpose:** Create a new batch

**Request Body:**
```json
{
  "name": "Full Stack Development Batch Jan 2026",
  "description": "A comprehensive 8-week full stack development 
                  curriculum covering Node.js, React, PostgreSQL,
                  and deployment.",
  "start_date": "2026-04-01",
  "end_date": "2026-05-31"
}
```

**Validation Rules:**
```
name         : required, string, min 3 chars, max 255 chars, unique
description  : optional, string, max 2000 chars
start_date   : required, valid date format YYYY-MM-DD,
               must not be in the past
end_date     : required, valid date format YYYY-MM-DD,
               must be at least 7 days after start_date
```

**Success Response (201 Created):**
```json
{
  "success": true,
  "data": {
    "batch_id": "770f1234-a12b-43c5-d678-998877665544",
    "name": "Full Stack Development Batch Jan 2026",
    "description": "A comprehensive 8-week full stack development...",
    "start_date": "2026-04-01",
    "end_date": "2026-05-31",
    "status": "DRAFT",
    "current_week": null,
    "total_weeks": 8,
    "enrolled_students_count": 0,
    "assigned_mentors_count": 0,
    "created_at": "2026-03-21T10:00:00Z"
  },
  "message": "Batch created successfully"
}
```

**Error Responses:**
```json
// 400 - Validation error
{
  "success": false,
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "End date must be at least 7 days after start date",
    "details": { "field": "end_date" }
  }
}

// 409 - Batch name already exists
{
  "success": false,
  "error": {
    "code": "BATCH_NAME_EXISTS",
    "message": "A batch with this name already exists"
  }
}
```

---

### GET /api/batches

**Access:** ADMIN, SUPER_ADMIN

**Purpose:** List all batches with optional filtering

**Query Parameters:**
```
status      : filter by status (DRAFT, ACTIVE, COMPLETED, ARCHIVED)
search      : search by batch name
page        : page number (default: 1)
limit       : results per page (default: 20, max: 100)
```

**Example Request:**
```
GET /api/batches?status=ACTIVE&page=1&limit=20
```

**Success Response (200 OK):**
```json
{
  "success": true,
  "data": {
    "batches": [
      {
        "batch_id": "770f1234-a12b-43c5-d678-998877665544",
        "name": "Full Stack Development Batch Jan 2026",
        "status": "ACTIVE",
        "start_date": "2026-04-01",
        "end_date": "2026-05-31",
        "current_week": 3,
        "total_weeks": 8,
        "enrolled_students_count": 45,
        "assigned_mentors_count": 2,
        "created_at": "2026-03-21T10:00:00Z"
      }
    ]
  },
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 1,
    "total_pages": 1
  }
}
```

---

### GET /api/batches/:batchId

**Access:** ADMIN, SUPER_ADMIN, MENTOR (assigned to batch)

**Purpose:** Fetch full details of a specific batch

**Success Response (200 OK):**
```json
{
  "success": true,
  "data": {
    "batch_id": "770f1234-a12b-43c5-d678-998877665544",
    "name": "Full Stack Development Batch Jan 2026",
    "description": "A comprehensive 8-week...",
    "status": "ACTIVE",
    "start_date": "2026-04-01",
    "end_date": "2026-05-31",
    "current_week": 3,
    "total_weeks": 8,
    "enrolled_students_count": 45,
    "assigned_mentors": [
      {
        "mentor_id": "mentor-uuid-1",
        "full_name": "Arjun Nair",
        "email": "arjun@example.com",
        "avatar_url": null
      }
    ],
    "content_count": 12,
    "live_sessions_count": 6,
    "created_by": {
      "user_id": "admin-uuid-1",
      "full_name": "Admin User"
    },
    "created_at": "2026-03-21T10:00:00Z",
    "updated_at": "2026-03-21T10:00:00Z"
  }
}
```

**Error Response:**
```json
// 404 - Batch not found
{
  "success": false,
  "error": {
    "code": "BATCH_NOT_FOUND",
    "message": "Batch not found"
  }
}
```

---

### PUT /api/batches/:batchId

**Access:** ADMIN, SUPER_ADMIN

**Purpose:** Update batch metadata

**Request Body (all fields optional):**
```json
{
  "name": "Full Stack Development Batch Jan 2026 (Updated)",
  "description": "Updated description...",
  "end_date": "2026-06-15"
}
```

**Rules:**
- start_date cannot be changed if any students are enrolled
- status cannot be changed via this endpoint (use dedicated
  status endpoints)

**Success Response (200 OK):**
```json
{
  "success": true,
  "data": {
    "batch_id": "770f1234-a12b-43c5-d678-998877665544",
    "name": "Full Stack Development Batch Jan 2026 (Updated)",
    "end_date": "2026-06-15",
    "updated_at": "2026-03-22T09:00:00Z"
  },
  "message": "Batch updated successfully"
}
```

**Error Responses:**
```json
// 400 - Cannot change start date after enrollment
{
  "success": false,
  "error": {
    "code": "CANNOT_CHANGE_START_DATE",
    "message": "Start date cannot be changed after students 
                have been enrolled"
  }
}

// 400 - New end date is before start date
{
  "success": false,
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "End date must be after start date",
    "details": { "field": "end_date" }
  }
}
```

---

### POST /api/batches/:batchId/archive

**Access:** ADMIN, SUPER_ADMIN

**Purpose:** Archive a batch (permanent action)

**Request Body:**
```json
{
  "confirmation": "ARCHIVE"
}
```

The confirmation field must contain the exact string "ARCHIVE" to
prevent accidental archiving. This is an extra safety check in addition
to the frontend confirmation dialog.

**Success Response (200 OK):**
```json
{
  "success": true,
  "data": {
    "batch_id": "770f1234-a12b-43c5-d678-998877665544",
    "status": "ARCHIVED"
  },
  "message": "Batch archived successfully"
}
```

---

## 4.2 Enrollment Endpoints

### POST /api/batches/:batchId/enroll

**Access:** ADMIN, SUPER_ADMIN

**Purpose:** Enroll one or more students in a batch

**Request Body:**
```json
{
  "student_ids": [
    "student-uuid-1",
    "student-uuid-2",
    "student-uuid-3"
  ]
}
```

**Validation Rules:**
```
student_ids : required, array of UUIDs, min 1, max 100 per request
              Each ID must:
              - Exist in the users table
              - Have role = STUDENT
              - Not already be enrolled in this batch (skip with warning)
              - Not be enrolled in another ACTIVE batch (error)
```

**Success Response (200 OK):**
```json
{
  "success": true,
  "data": {
    "enrolled": [
      {
        "student_id": "student-uuid-1",
        "full_name": "Rahul Sharma",
        "enrolled_at": "2026-03-21T10:00:00Z"
      },
      {
        "student_id": "student-uuid-2",
        "full_name": "Priya Patel",
        "enrolled_at": "2026-03-21T10:00:00Z"
      }
    ],
    "skipped": [
      {
        "student_id": "student-uuid-3",
        "reason": "Already enrolled in this batch"
      }
    ],
    "failed": []
  },
  "message": "2 students enrolled successfully. 1 skipped."
}
```

**Error Response:**
```json
// 400 - Student enrolled in another active batch
{
  "success": false,
  "error": {
    "code": "STUDENT_ALREADY_IN_ACTIVE_BATCH",
    "message": "Student Rahul Sharma is already enrolled in 
                an active batch: Backend Development Batch",
    "details": {
      "student_id": "student-uuid-1",
      "current_batch": "Backend Development Batch"
    }
  }
}
```

---

### DELETE /api/batches/:batchId/enroll/:studentId

**Access:** ADMIN, SUPER_ADMIN

**Purpose:** Withdraw a student from a batch

**Request Body:**
```json
{
  "reason": "Student requested withdrawal"
}
```

**Success Response (200 OK):**
```json
{
  "success": true,
  "data": {
    "student_id": "student-uuid-1",
    "batch_id": "770f1234-a12b-43c5-d678-998877665544",
    "status": "WITHDRAWN",
    "withdrawn_at": "2026-03-22T10:00:00Z"
  },
  "message": "Student withdrawn from batch successfully"
}
```

**Important:** Withdrawal does NOT delete quiz responses, attendance
records, or progress data. Only the enrollment status changes. This
data is preserved for historical analysis.

---

### GET /api/batches/:batchId/students

**Access:** ADMIN, SUPER_ADMIN, MENTOR (assigned to batch)

**Purpose:** List all students enrolled in a batch

**Query Parameters:**
```
status   : filter by enrollment status (ACTIVE, WITHDRAWN, COMPLETED)
search   : search by student name or email
page     : page number (default: 1)
limit    : results per page (default: 50)
```

**Success Response (200 OK):**
```json
{
  "success": true,
  "data": {
    "students": [
      {
        "enrollment_id": "enrollment-uuid-1",
        "student_id": "student-uuid-1",
        "full_name": "Rahul Sharma",
        "email": "rahul@example.com",
        "avatar_url": null,
        "enrollment_status": "ACTIVE",
        "enrolled_at": "2026-03-21T10:00:00Z",
        "last_login_at": "2026-03-22T09:30:00Z",
        "overall_progress_score": 72.5
      }
    ]
  },
  "pagination": {
    "page": 1,
    "limit": 50,
    "total": 45,
    "total_pages": 1
  }
}
```

---

## 4.3 Mentor Assignment Endpoints

### POST /api/batches/:batchId/mentors

**Access:** ADMIN, SUPER_ADMIN

**Purpose:** Assign one or more mentors to a batch

**Request Body:**
```json
{
  "mentor_ids": [
    "mentor-uuid-1",
    "mentor-uuid-2"
  ]
}
```

**Success Response (200 OK):**
```json
{
  "success": true,
  "data": {
    "assigned": [
      {
        "mentor_id": "mentor-uuid-1",
        "full_name": "Arjun Nair",
        "assigned_at": "2026-03-21T10:00:00Z"
      }
    ],
    "skipped": [
      {
        "mentor_id": "mentor-uuid-2",
        "reason": "Already assigned to this batch"
      }
    ]
  },
  "message": "1 mentor assigned successfully"
}
```

---

### DELETE /api/batches/:batchId/mentors/:mentorId

**Access:** ADMIN, SUPER_ADMIN

**Purpose:** Remove a mentor from a batch

**Success Response (200 OK):**
```json
{
  "success": true,
  "message": "Mentor removed from batch successfully"
}
```

**Important:** Removing a mentor does NOT delete any content they
uploaded, quizzes they reviewed, or sessions they conducted. Only
their future access to manage the batch is revoked.

---

## 4.4 Student-Facing Batch Endpoints

### GET /api/my/batch

**Access:** STUDENT

**Purpose:** Fetch the batch the currently authenticated student is
enrolled in

**Success Response (200 OK):**
```json
{
  "success": true,
  "data": {
    "batch_id": "770f1234-a12b-43c5-d678-998877665544",
    "name": "Full Stack Development Batch Jan 2026",
    "description": "A comprehensive 8-week...",
    "status": "ACTIVE",
    "start_date": "2026-04-01",
    "end_date": "2026-05-31",
    "current_week": 3,
    "total_weeks": 8,
    "weeks_remaining": 5,
    "assigned_mentors": [
      {
        "mentor_id": "mentor-uuid-1",
        "full_name": "Arjun Nair",
        "avatar_url": null
      }
    ],
    "enrollment_status": "ACTIVE",
    "enrolled_at": "2026-03-21T10:00:00Z"
  }
}
```

**Error Response:**
```json
// 404 - Student not enrolled in any batch
{
  "success": false,
  "error": {
    "code": "NOT_ENROLLED",
    "message": "You are not currently enrolled in any batch"
  }
}
```

---

# 5. Frontend Components

## 5.1 Component Structure
```
src/
├── app/
│   ├── admin/
│   │   ├── batches/
│   │   │   ├── page.tsx                  (batch list)
│   │   │   ├── create/
│   │   │   │   └── page.tsx              (create batch form)
│   │   │   └── [batchId]/
│   │   │       ├── page.tsx              (batch detail)
│   │   │       ├── students/
│   │   │       │   └── page.tsx          (student management)
│   │   │       └── settings/
│   │   │           └── page.tsx          (batch settings)
│   └── mentor/
│       └── batches/
│           └── [batchId]/
│               └── page.tsx              (mentor batch view)
├── components/
│   └── batches/
│       ├── BatchCard.tsx
│       ├── BatchList.tsx
│       ├── BatchStatusBadge.tsx
│       ├── CreateBatchForm.tsx
│       ├── EditBatchForm.tsx
│       ├── EnrollStudentsModal.tsx
│       ├── AssignMentorsModal.tsx
│       ├── StudentTable.tsx
│       └── BatchStats.tsx
```

## 5.2 BatchStatusBadge Component

A reusable visual badge showing batch status with appropriate colors.
```tsx
// components/batches/BatchStatusBadge.tsx
type BatchStatus = "DRAFT" | "ACTIVE" | "COMPLETED" | "ARCHIVED";

const statusConfig: Record
  BatchStatus,
  { label: string; className: string }
> = {
  DRAFT: {
    label: "Draft",
    className: "bg-gray-100 text-gray-700",
  },
  ACTIVE: {
    label: "Active",
    className: "bg-green-100 text-green-700",
  },
  COMPLETED: {
    label: "Completed",
    className: "bg-blue-100 text-blue-700",
  },
  ARCHIVED: {
    label: "Archived",
    className: "bg-yellow-100 text-yellow-700",
  },
};

export default function BatchStatusBadge({
  status,
}: {
  status: BatchStatus;
}) {
  const config = statusConfig[status];

  return (
    <span
      className={`inline-flex items-center px-2.5 py-0.5 rounded-full 
                  text-xs font-medium ${config.className}`}
    >
      {config.label}
    </span>
  );
}
```

## 5.3 CreateBatchForm Component
```tsx
// components/batches/CreateBatchForm.tsx
"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import api from "@/lib/api";

type CreateBatchFormData = {
  name: string;
  description: string;
  start_date: string;
  end_date: string;
};

export default function CreateBatchForm() {
  const router = useRouter();
  const [serverError, setServerError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const {
    register,
    handleSubmit,
    watch,
    formState: { errors },
  } = useForm<CreateBatchFormData>();

  const startDate = watch("start_date");

  const onSubmit = async (data: CreateBatchFormData) => {
    setServerError(null);
    setIsSubmitting(true);

    try {
      const response = await api.post("/api/batches", data);
      const batchId = response.data.data.batch_id;
      router.push(`/admin/batches/${batchId}`);
    } catch (error: any) {
      const errorCode = error.response?.data?.error?.code;

      if (errorCode === "BATCH_NAME_EXISTS") {
        setServerError(
          "A batch with this name already exists. Please use a unique name."
        );
      } else if (errorCode === "VALIDATION_ERROR") {
        setServerError(error.response?.data?.error?.message);
      } else {
        setServerError("Failed to create batch. Please try again.");
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  // Calculate minimum end date (7 days after start date)
  const minEndDate = startDate
    ? new Date(
        new Date(startDate).getTime() + 7 * 24 * 60 * 60 * 1000
      )
        .toISOString()
        .split("T")[0]
    : undefined;

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
      {/* Batch Name */}
      <div>
        <label htmlFor="name">
          Batch Name <span aria-hidden="true">*</span>
        </label>
        <input
          id="name"
          type="text"
          placeholder="e.g. Full Stack Development Batch Jan 2026"
          {...register("name", {
            required: "Batch name is required",
            minLength: {
              value: 3,
              message: "Batch name must be at least 3 characters",
            },
            maxLength: {
              value: 255,
              message: "Batch name cannot exceed 255 characters",
            },
          })}
          aria-invalid={!!errors.name}
        />
        {errors.name && (
          <span role="alert">{errors.name.message}</span>
        )}
      </div>

      {/* Description */}
      <div>
        <label htmlFor="description">Description (optional)</label>
        <textarea
          id="description"
          rows={4}
          placeholder="Describe the curriculum, goals, and target audience..."
          {...register("description", {
            maxLength: {
              value: 2000,
              message: "Description cannot exceed 2000 characters",
            },
          })}
        />
        {errors.description && (
          <span role="alert">{errors.description.message}</span>
        )}
      </div>

      {/* Start Date */}
      <div>
        <label htmlFor="start_date">
          Start Date <span aria-hidden="true">*</span>
        </label>
        <input
          id="start_date"
          type="date"
          min={new Date().toISOString().split("T")[0]}
          {...register("start_date", {
            required: "Start date is required",
          })}
          aria-invalid={!!errors.start_date}
        />
        {errors.start_date && (
          <span role="alert">{errors.start_date.message}</span>
        )}
      </div>

      {/* End Date */}
      <div>
        <label htmlFor="end_date">
          End Date <span aria-hidden="true">*</span>
        </label>
        <input
          id="end_date"
          type="date"
          min={minEndDate}
          {...register("end_date", {
            required: "End date is required",
          })}
          aria-invalid={!!errors.end_date}
        />
        {errors.end_date && (
          <span role="alert">{errors.end_date.message}</span>
        )}
        {startDate && (
          <p className="text-sm text-gray-500">
            End date must be at least 7 days after start date
          </p>
        )}
      </div>

      {/* Server Error */}
      {serverError && (
        <div role="alert" aria-live="polite">
          {serverError}
        </div>
      )}

      {/* Submit */}
      <div className="flex gap-4">
        <button type="submit" disabled={isSubmitting}>
          {isSubmitting ? "Creating Batch..." : "Create Batch"}
        </button>
        <button
          type="button"
          onClick={() => router.push("/admin/batches")}
        >
          Cancel
        </button>
      </div>
    </form>
  );
}
```

## 5.4 EnrollStudentsModal Component
```tsx
// components/batches/EnrollStudentsModal.tsx
"use client";

import { useState, useEffect } from "react";
import api from "@/lib/api";

type Student = {
  user_id: string;
  full_name: string;
  email: string;
};

type Props = {
  batchId: string;
  isOpen: boolean;
  onClose: () => void;
  onEnrolled: (count: number) => void;
};

export default function EnrollStudentsModal({
  batchId,
  isOpen,
  onClose,
  onEnrolled,
}: Props) {
  const [availableStudents, setAvailableStudents] = useState<Student[]>([]);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [searchQuery, setSearchQuery] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Fetch available students when modal opens
  useEffect(() => {
    if (!isOpen) return;

    const fetchStudents = async () => {
      setIsLoading(true);
      try {
        const response = await api.get(
          `/api/users?role=STUDENT&not_in_batch=${batchId}`
        );
        setAvailableStudents(response.data.data.users);
      } catch {
        setError("Failed to load students");
      } finally {
        setIsLoading(false);
      }
    };

    fetchStudents();
  }, [isOpen, batchId]);

  const filteredStudents = availableStudents.filter(
    (s) =>
      s.full_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      s.email.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const toggleStudent = (studentId: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(studentId)) {
        next.delete(studentId);
      } else {
        next.add(studentId);
      }
      return next;
    });
  };

  const handleSelectAll = () => {
    if (selectedIds.size === filteredStudents.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(filteredStudents.map((s) => s.user_id)));
    }
  };

  const handleEnroll = async () => {
    if (selectedIds.size === 0) return;

    setIsSubmitting(true);
    setError(null);

    try {
      const response = await api.post(
        `/api/batches/${batchId}/enroll`,
        { student_ids: Array.from(selectedIds) }
      );

      const enrolledCount = response.data.data.enrolled.length;
      onEnrolled(enrolledCount);
      onClose();
    } catch (err: any) {
      setError(
        err.response?.data?.error?.message ??
        "Failed to enroll students. Please try again."
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div role="dialog" aria-modal="true" aria-label="Enroll Students">
      <div>
        <h2>Enroll Students</h2>

        {/* Search */}
        <input
          type="search"
          placeholder="Search by name or email..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
        />

        {/* Select All */}
        <div>
          <button onClick={handleSelectAll}>
            {selectedIds.size === filteredStudents.length
              ? "Deselect All"
              : "Select All"}
          </button>
          <span>{selectedIds.size} selected</span>
        </div>

        {/* Student List */}
        {isLoading ? (
          <p>Loading students...</p>
        ) : filteredStudents.length === 0 ? (
          <p>No available students found</p>
        ) : (
          <ul>
            {filteredStudents.map((student) => (
              <li key={student.user_id}>
                <label>
                  <input
                    type="checkbox"
                    checked={selectedIds.has(student.user_id)}
                    onChange={() => toggleStudent(student.user_id)}
                  />
                  <span>{student.full_name}</span>
                  <span>{student.email}</span>
                </label>
              </li>
            ))}
          </ul>
        )}

        {/* Error */}
        {error && (
          <p role="alert">{error}</p>
        )}

        {/* Actions */}
        <div>
          <button onClick={onClose}>Cancel</button>
          <button
            onClick={handleEnroll}
            disabled={selectedIds.size === 0 || isSubmitting}
          >
            {isSubmitting
              ? "Enrolling..."
              : `Enroll ${selectedIds.size} Student${
                  selectedIds.size !== 1 ? "s" : ""
                }`}
          </button>
        </div>
      </div>
    </div>
  );
}
```

## 5.5 Student-Facing Batch Display Hook
```tsx
// hooks/useMyBatch.ts
"use client";

import { useState, useEffect } from "react";
import api from "@/lib/api";

type Batch = {
  batch_id: string;
  name: string;
  description: string;
  status: string;
  start_date: string;
  end_date: string;
  current_week: number;
  total_weeks: number;
  weeks_remaining: number;
  assigned_mentors: Array<{
    mentor_id: string;
    full_name: string;
    avatar_url: string | null;
  }>;
  enrollment_status: string;
};

export function useMyBatch() {
  const [batch, setBatch] = useState<Batch | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchBatch = async () => {
      try {
        const response = await api.get("/api/my/batch");
        setBatch(response.data.data);
      } catch (err: any) {
        if (err.response?.status === 404) {
          setError("not_enrolled");
        } else {
          setError("fetch_failed");
        }
      } finally {
        setIsLoading(false);
      }
    };

    fetchBatch();
  }, []);

  return { batch, isLoading, error };
}
```

---

# 6. Backend Logic and Implementation

## 6.1 Directory Structure
```
src/
├── controllers/
│   └── batches.controller.ts
├── services/
│   └── batches.service.ts
├── validators/
│   └── batches.validator.ts
├── routes/
│   └── batches.routes.ts
└── jobs/
    └── batchStatusTransition.job.ts
```

## 6.2 Batch Service
```typescript
// services/batches.service.ts
import { PrismaClient, BatchStatus, EnrollmentStatus } from "@prisma/client";

const prisma = new PrismaClient();

export class BatchService {

  // -------------------------------------------------------
  // CREATE BATCH
  // -------------------------------------------------------
  async createBatch(data: {
    name: string;
    description?: string;
    start_date: string;
    end_date: string;
    created_by: string;
  }) {
    // Check name uniqueness
    const existing = await prisma.batch.findUnique({
      where: { name: data.name },
    });

    if (existing) {
      throw { code: "BATCH_NAME_EXISTS", statusCode: 409 };
    }

    const startDate = new Date(data.start_date);
    const endDate = new Date(data.end_date);

    // Validate dates
    if (endDate <= startDate) {
      throw {
        code: "VALIDATION_ERROR",
        message: "End date must be after start date",
        statusCode: 400,
      };
    }

    const diffDays =
      (endDate.getTime() - startDate.getTime()) /
      (1000 * 60 * 60 * 24);

    if (diffDays < 7) {
      throw {
        code: "VALIDATION_ERROR",
        message: "End date must be at least 7 days after start date",
        statusCode: 400,
      };
    }

    const batch = await prisma.batch.create({
      data: {
        name: data.name,
        description: data.description ?? null,
        startDate,
        endDate,
        status: BatchStatus.DRAFT,
        createdBy: data.created_by,
      },
    });

    return this.formatBatch(batch);
  }

  // -------------------------------------------------------
  // GET BATCH BY ID
  // -------------------------------------------------------
  async getBatchById(batchId: string, requestingUserId: string,
    requestingUserRole: string) {
    const batch = await prisma.batch.findUnique({
      where: { id: batchId },
      include: {
        mentors: {
          include: {
            mentor: {
              select: {
                id: true,
                fullName: true,
                email: true,
                avatarUrl: true,
              },
            },
          },
        },
        creator: {
          select: { id: true, fullName: true },
        },
        _count: {
          select: {
            enrollments: {
              where: { status: EnrollmentStatus.ACTIVE },
            },
            content: true,
            liveSessions: true,
          },
        },
      },
    });

    if (!batch) {
      throw { code: "BATCH_NOT_FOUND", statusCode: 404 };
    }

    // Mentor can only see batches they are assigned to
    if (requestingUserRole === "MENTOR") {
      const isAssigned = batch.mentors.some(
        (bm) => bm.mentorId === requestingUserId
      );
      if (!isAssigned) {
        throw { code: "PERMISSION_DENIED", statusCode: 403 };
      }
    }

    return {
      batch_id: batch.id,
      name: batch.name,
      description: batch.description,
      status: batch.status,
      start_date: batch.startDate.toISOString().split("T")[0],
      end_date: batch.endDate.toISOString().split("T")[0],
      current_week: this.calculateCurrentWeek(batch.startDate, batch.endDate),
      total_weeks: this.calculateTotalWeeks(batch.startDate, batch.endDate),
      enrolled_students_count: batch._count.enrollments,
      content_count: batch._count.content,
      live_sessions_count: batch._count.liveSessions,
      assigned_mentors: batch.mentors.map((bm) => ({
        mentor_id: bm.mentor.id,
        full_name: bm.mentor.fullName,
        email: bm.mentor.email,
        avatar_url: bm.mentor.avatarUrl,
      })),
      created_by: {
        user_id: batch.creator.id,
        full_name: batch.creator.fullName,
      },
      created_at: batch.createdAt,
      updated_at: batch.updatedAt,
    };
  }

  // -------------------------------------------------------
  // ENROLL STUDENTS
  // -------------------------------------------------------
  async enrollStudents(
    batchId: string,
    studentIds: string[],
    enrolledBy: string
  ) {
    // Verify batch exists
    const batch = await prisma.batch.findUnique({
      where: { id: batchId },
    });

    if (!batch) {
      throw { code: "BATCH_NOT_FOUND", statusCode: 404 };
    }

    const enrolled = [];
    const skipped = [];
    const failed = [];

    for (const studentId of studentIds) {
      try {
        // Verify student exists and has STUDENT role
        const student = await prisma.user.findUnique({
          where: { id: studentId },
          select: {
            id: true,
            fullName: true,
            role: true,
            isActive: true,
          },
        });

        if (!student || student.role !== "STUDENT") {
          failed.push({
            student_id: studentId,
            reason: "User not found or not a student",
          });
          continue;
        }

        if (!student.isActive) {
          failed.push({
            student_id: studentId,
            reason: "Student account is deactivated",
          });
          continue;
        }

        // Check if already enrolled in THIS batch
        const existingEnrollment = await prisma.enrollment.findUnique({
          where: {
            studentId_batchId: {
              studentId,
              batchId,
            },
          },
        });

        if (existingEnrollment) {
          skipped.push({
            student_id: studentId,
            reason: "Already enrolled in this batch",
          });
          continue;
        }

        // Check if enrolled in ANOTHER active batch (Phase One constraint)
        const activeEnrollment = await prisma.enrollment.findFirst({
          where: {
            studentId,
            status: EnrollmentStatus.ACTIVE,
            batch: {
              status: BatchStatus.ACTIVE,
              id: { not: batchId },
            },
          },
          include: { batch: { select: { name: true } } },
        });

        if (activeEnrollment) {
          failed.push({
            student_id: studentId,
            reason: `Already enrolled in active batch: ${activeEnrollment.batch.name}`,
          });
          continue;
        }

        // Create enrollment
        const enrollment = await prisma.enrollment.create({
          data: {
            studentId,
            batchId,
            enrolledBy,
            status: EnrollmentStatus.ACTIVE,
          },
        });

        enrolled.push({
          student_id: studentId,
          full_name: student.fullName,
          enrolled_at: enrollment.enrolledAt,
        });

      } catch (err) {
        failed.push({
          student_id: studentId,
          reason: "Unexpected error during enrollment",
        });
      }
    }

    return { enrolled, skipped, failed };
  }

  // -------------------------------------------------------
  // WITHDRAW STUDENT
  // -------------------------------------------------------
  async withdrawStudent(
    batchId: string,
    studentId: string,
    withdrawnBy: string
  ) {
    const enrollment = await prisma.enrollment.findUnique({
      where: {
        studentId_batchId: { studentId, batchId },
      },
    });

    if (!enrollment) {
      throw { code: "ENROLLMENT_NOT_FOUND", statusCode: 404 };
    }

    if (enrollment.status === EnrollmentStatus.WITHDRAWN) {
      throw {
        code: "ALREADY_WITHDRAWN",
        message: "Student is already withdrawn from this batch",
        statusCode: 400,
      };
    }

    const updated = await prisma.enrollment.update({
      where: {
        studentId_batchId: { studentId, batchId },
      },
      data: {
        status: EnrollmentStatus.WITHDRAWN,
        withdrawnAt: new Date(),
        withdrawnBy,
      },
    });

    return {
      student_id: studentId,
      batch_id: batchId,
      status: updated.status,
      withdrawn_at: updated.withdrawnAt,
    };
  }

  // -------------------------------------------------------
  // GET MY BATCH (Student)
  // -------------------------------------------------------
  async getMyBatch(studentId: string) {
    const enrollment = await prisma.enrollment.findFirst({
      where: {
        studentId,
        status: EnrollmentStatus.ACTIVE,
      },
      include: {
        batch: {
          include: {
            mentors: {
              include: {
                mentor: {
                  select: {
                    id: true,
                    fullName: true,
                    avatarUrl: true,
                  },
                },
              },
            },
          },
        },
      },
      orderBy: { enrolledAt: "desc" },
    });

    if (!enrollment) {
      throw { code: "NOT_ENROLLED", statusCode: 404 };
    }

    const batch = enrollment.batch;
    const currentWeek = this.calculateCurrentWeek(
      batch.startDate,
      batch.endDate
    );
    const totalWeeks = this.calculateTotalWeeks(
      batch.startDate,
      batch.endDate
    );

    return {
      batch_id: batch.id,
      name: batch.name,
      description: batch.description,
      status: batch.status,
      start_date: batch.startDate.toISOString().split("T")[0],
      end_date: batch.endDate.toISOString().split("T")[0],
      current_week: currentWeek,
      total_weeks: totalWeeks,
      weeks_remaining: Math.max(0, totalWeeks - (currentWeek ?? 0)),
      assigned_mentors: batch.mentors.map((bm) => ({
        mentor_id: bm.mentor.id,
        full_name: bm.mentor.fullName,
        avatar_url: bm.mentor.avatarUrl,
      })),
      enrollment_status: enrollment.status,
      enrolled_at: enrollment.enrolledAt,
    };
  }

  // -------------------------------------------------------
  // PRIVATE HELPERS
  // -------------------------------------------------------

  private calculateCurrentWeek(
    startDate: Date,
    endDate: Date
  ): number | null {
    const now = new Date();

    if (now < startDate) return null;
    if (now > endDate) return this.calculateTotalWeeks(startDate, endDate);

    const diffMs = now.getTime() - startDate.getTime();
    const diffDays = diffMs / (1000 * 60 * 60 * 24);
    return Math.floor(diffDays / 7) + 1;
  }

  private calculateTotalWeeks(startDate: Date, endDate: Date): number {
    const diffMs = endDate.getTime() - startDate.getTime();
    const diffDays = diffMs / (1000 * 60 * 60 * 24);
    return Math.ceil(diffDays / 7);
  }

  private formatBatch(batch: any) {
    return {
      batch_id: batch.id,
      name: batch.name,
      description: batch.description,
      status: batch.status,
      start_date: batch.startDate.toISOString().split("T")[0],
      end_date: batch.endDate.toISOString().split("T")[0],
      current_week: this.calculateCurrentWeek(batch.startDate, batch.endDate),
      total_weeks: this.calculateTotalWeeks(batch.startDate, batch.endDate),
      enrolled_students_count: 0,
      assigned_mentors_count: 0,
      created_at: batch.createdAt,
    };
  }
}
```

## 6.3 Batch Status Transition Job

This job runs nightly and handles automatic batch status transitions.
```typescript
// jobs/batchStatusTransition.job.ts
import { PrismaClient, BatchStatus } from "@prisma/client";

const prisma = new PrismaClient();

export const runBatchStatusTransitions = async () => {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  console.log(
    `[BatchStatusJob] Running at ${new Date().toISOString()}`
  );

  // Transition DRAFT → ACTIVE
  // (batches whose start_date is today or earlier)
  const activatedBatches = await prisma.batch.updateMany({
    where: {
      status: BatchStatus.DRAFT,
      startDate: { lte: today },
    },
    data: { status: BatchStatus.ACTIVE },
  });

  if (activatedBatches.count > 0) {
    console.log(
      `[BatchStatusJob] Activated ${activatedBatches.count} batch(es)`
    );
    // TODO: Send notifications to enrolled students
    // Fetch activated batch IDs and notify via Socket.io or queued email
  }

  // Transition ACTIVE → COMPLETED
  // (batches whose end_date is in the past)
  const completedBatches = await prisma.batch.updateMany({
    where: {
      status: BatchStatus.ACTIVE,
      endDate: { lt: today },
    },
    data: { status: BatchStatus.COMPLETED },
  });

  if (completedBatches.count > 0) {
    console.log(
      `[BatchStatusJob] Completed ${completedBatches.count} batch(es)`
    );

    // Mark all active enrollments in completed batches as COMPLETED
    await prisma.enrollment.updateMany({
      where: {
        status: "ACTIVE",
        batch: {
          status: BatchStatus.COMPLETED,
        },
      },
      data: {
        status: "COMPLETED",
        completedAt: new Date(),
      },
    });
  }

  console.log(
    `[BatchStatusJob] Completed at ${new Date().toISOString()}`
  );
};
```

**Scheduling the Job with Node-Cron:**
```typescript
// server.ts (add to server setup)
import cron from "node-cron";
import { runBatchStatusTransitions } from "./jobs/batchStatusTransition.job";

// Run every day at midnight
cron.schedule("0 0 * * *", async () => {
  await runBatchStatusTransitions();
});
```

## 6.4 Batch Routes
```typescript
// routes/batches.routes.ts
import { Router } from "express";
import { BatchController } from "../controllers/batches.controller";
import { authenticate } from "../middleware/authenticate.middleware";
import { authorize } from "../middleware/authorize.middleware";
import { validate } from "../middleware/validate.middleware";
import {
  createBatchSchema,
  updateBatchSchema,
  enrollStudentsSchema,
  assignMentorsSchema,
} from "../validators/batches.validator";

const router = Router();
const controller = new BatchController();

// All batch routes require authentication
router.use(authenticate);

// Admin routes
router.post(
  "/",
  authorize(["ADMIN", "SUPER_ADMIN"]),
  validate(createBatchSchema),
  controller.createBatch
);

router.get(
  "/",
  authorize(["ADMIN", "SUPER_ADMIN"]),
  controller.listBatches
);

router.get(
  "/:batchId",
  authorize(["ADMIN", "SUPER_ADMIN", "MENTOR"]),
  controller.getBatch
);

router.put(
  "/:batchId",
  authorize(["ADMIN", "SUPER_ADMIN"]),
  validate(updateBatchSchema),
  controller.updateBatch
);

router.post(
  "/:batchId/archive",
  authorize(["ADMIN", "SUPER_ADMIN"]),
  controller.archiveBatch
);

router.post(
  "/:batchId/enroll",
  authorize(["ADMIN", "SUPER_ADMIN"]),
  validate(enrollStudentsSchema),
  controller.enrollStudents
);

router.delete(
  "/:batchId/enroll/:studentId",
  authorize(["ADMIN", "SUPER_ADMIN"]),
  controller.withdrawStudent
);

router.get(
  "/:batchId/students",
  authorize(["ADMIN", "SUPER_ADMIN", "MENTOR"]),
  controller.listStudents
);

router.post(
  "/:batchId/mentors",
  authorize(["ADMIN", "SUPER_ADMIN"]),
  validate(assignMentorsSchema),
  controller.assignMentors
);

router.delete(
  "/:batchId/mentors/:mentorId",
  authorize(["ADMIN", "SUPER_ADMIN"]),
  controller.removeMentor
);

// Student route
router.get(
  "/my/batch",
  authorize(["STUDENT"]),
  controller.getMyBatch
);

export default router;
```

## 6.5 Validation Schemas
```typescript
// validators/batches.validator.ts
import Joi from "joi";

export const createBatchSchema = Joi.object({
  name: Joi.string().min(3).max(255).required().messages({
    "string.min": "Batch name must be at least 3 characters",
    "string.max": "Batch name cannot exceed 255 characters",
    "any.required": "Batch name is required",
  }),
  description: Joi.string().max(2000).optional().allow("", null),
  start_date: Joi.string()
    .pattern(/^\d{4}-\d{2}-\d{2}$/)
    .required()
    .messages({
      "string.pattern.base":
        "Start date must be in YYYY-MM-DD format",
      "any.required": "Start date is required",
    }),
  end_date: Joi.string()
    .pattern(/^\d{4}-\d{2}-\d{2}$/)
    .required()
    .messages({
      "string.pattern.base": "End date must be in YYYY-MM-DD format",
      "any.required": "End date is required",
    }),
});

export const updateBatchSchema = Joi.object({
  name: Joi.string().min(3).max(255).optional(),
  description: Joi.string().max(2000).optional().allow("", null),
  end_date: Joi.string()
    .pattern(/^\d{4}-\d{2}-\d{2}$/)
    .optional(),
}).min(1).messages({
  "object.min": "At least one field must be provided for update",
});

export const enrollStudentsSchema = Joi.object({
  student_ids: Joi.array()
    .items(Joi.string().uuid())
    .min(1)
    .max(100)
    .required()
    .messages({
      "array.min": "At least one student ID is required",
      "array.max": "Cannot enroll more than 100 students at once",
      "any.required": "student_ids is required",
    }),
});

export const assignMentorsSchema = Joi.object({
  mentor_ids: Joi.array()
    .items(Joi.string().uuid())
    .min(1)
    .max(10)
    .required()
    .messages({
      "array.min": "At least one mentor ID is required",
      "any.required": "mentor_ids is required",
    }),
});
```

---

# 7. Implementation Steps

## 7.1 Step-by-Step Build Order

### Step 1 — Database Schema (Day 1)

Add the three new tables to your Prisma schema:
- batches
- enrollments
- batch_mentors

Run migration:
```bash
npx prisma migrate dev --name add_batch_tables
```

Verify tables are created correctly:
```bash
npx prisma studio
```

### Step 2 — Validation Schemas (Day 1)

Create `validators/batches.validator.ts` with all four validation
schemas. Test each schema manually with valid and invalid inputs before
proceeding.

### Step 3 — Batch Service — Core CRUD (Day 2)

Build and test these methods in isolation:
1. `createBatch()` — test uniqueness check, date validation, creation
2. `getBatchById()` — test normal fetch and not found case
3. `listBatches()` — test with status filter, search, pagination
4. `updateBatch()` — test field updates and start_date protection
5. `archiveBatch()` — test status transition

### Step 4 — Batch Service — Enrollment (Day 2)

Build and test:
1. `enrollStudents()` — test single and bulk enrollment, skip
   already-enrolled, reject cross-batch duplicates
2. `withdrawStudent()` — test withdrawal and data preservation
3. `listStudents()` — test with filters

### Step 5 — Batch Service — Mentor Assignment (Day 3)

Build and test:
1. `assignMentors()` — test assignment and duplicate skip
2. `removeMentor()` — test removal and data preservation
3. `getMyBatch()` — test student-facing fetch and not-enrolled case

### Step 6 — Status Transition Job (Day 3)

Build the nightly job and test manually by temporarily changing batch
dates to trigger transitions. Verify:
- DRAFT → ACTIVE triggers correctly when start_date arrives
- ACTIVE → COMPLETED triggers when end_date passes
- Enrollment statuses update to COMPLETED when batch completes

### Step 7 — Controllers and Routes (Day 3)

Wire up controllers to the service. Add all routes with correct
middleware. Test every endpoint with Postman or similar tool.

### Step 8 — Frontend — Admin Pages (Day 4)

Build:
1. Batch list page (admin)
2. Create batch form
3. Batch detail page with tabs
4. Enroll students modal
5. Assign mentors modal
6. Student table with withdrawal action

### Step 9 — Frontend — Student Page (Day 4)

Build:
1. `useMyBatch` hook
2. Student batch info display on student dashboard
3. "Not enrolled" state display

### Step 10 — Integration Testing (Day 5)

Test the complete flow:
1. Admin creates batch
2. Admin enrolls students
3. Admin assigns mentor
4. Verify students can see batch on their dashboard
5. Verify mentor can see batch and student list
6. Test withdrawal — verify student loses access
7. Test automatic status transition by setting past dates
8. Test archiving

---

# 8. Error Handling

## 8.1 Error Code Reference
```
BATCH_NOT_FOUND              : 404 — Batch ID does not exist
BATCH_NAME_EXISTS            : 409 — Batch name already in use
ENROLLMENT_NOT_FOUND         : 404 — Enrollment record not found
ALREADY_WITHDRAWN            : 400 — Student already withdrawn
STUDENT_ALREADY_IN_ACTIVE_BATCH : 400 — Student in another active batch
CANNOT_CHANGE_START_DATE     : 400 — Start date locked after enrollment
BATCH_ALREADY_ARCHIVED       : 400 — Cannot archive an archived batch
MENTOR_NOT_ASSIGNED          : 404 — Mentor is not assigned to this batch
NOT_ENROLLED                 : 404 — Student has no active enrollment
INVALID_ARCHIVE_CONFIRMATION : 400 — Archive confirmation string missing
```

## 8.2 Edge Cases to Handle

**Enrolling a student in a COMPLETED or ARCHIVED batch:** Return error
with code BATCH_NOT_ENROLLABLE and message "Cannot enroll students in a
completed or archived batch."

**Attempting to start a batch before its start_date:** Admins may want
to manually transition a DRAFT batch to ACTIVE before the automated
job runs. Allow this via a dedicated POST /api/batches/:id/activate
endpoint accessible to ADMIN and SUPER_ADMIN.

**Date timezone handling:** All dates are stored as DATE type in
PostgreSQL (no time component). The API receives and returns dates as
YYYY-MM-DD strings. Date comparisons in the status transition job must
compare DATE values, not DATETIME values, to avoid timezone-related
off-by-one errors.

**Bulk enrollment partial failure:** If enrolling 50 students and 3
fail validation, the remaining 47 should still be enrolled. The
operation is not atomic at the bulk level — individual failures are
reported in the response but do not block the rest.

---

# 9. Testing Strategy

## 9.1 Unit Tests
```typescript
// tests/batches.service.test.ts

describe("BatchService.createBatch", () => {

  it("should create batch with DRAFT status", async () => {
    prismaMock.batch.findUnique.mockResolvedValue(null);
    prismaMock.batch.create.mockResolvedValue({
      id: "batch-uuid",
      name: "Test Batch",
      status: "DRAFT",
      startDate: new Date("2026-04-01"),
      endDate: new Date("2026-05-31"),
    } as any);

    const result = await batchService.createBatch({
      name: "Test Batch",
      start_date: "2026-04-01",
      end_date: "2026-05-31",
      created_by: "admin-uuid",
    });

    expect(result.status).toBe("DRAFT");
    expect(prismaMock.batch.create).toHaveBeenCalled();
  });

  it("should throw BATCH_NAME_EXISTS for duplicate name", async () => {
    prismaMock.batch.findUnique.mockResolvedValue({
      id: "existing-batch",
    } as any);

    await expect(
      batchService.createBatch({
        name: "Duplicate Name",
        start_date: "2026-04-01",
        end_date: "2026-05-31",
        created_by: "admin-uuid",
      })
    ).rejects.toMatchObject({ code: "BATCH_NAME_EXISTS" });
  });

  it("should throw VALIDATION_ERROR when end date less 
  than 7 days after start", async () => {
    prismaMock.batch.findUnique.mockResolvedValue(null);

    await expect(
      batchService.createBatch({
        name: "Short Batch",
        start_date: "2026-04-01",
        end_date: "2026-04-03",
        created_by: "admin-uuid",
      })
    ).rejects.toMatchObject({ code: "VALIDATION_ERROR" });
  });
});

describe("BatchService.enrollStudents", () => {

  it("should enroll valid students and skip already enrolled", async () => {
    // Setup mocks for one new student and one already enrolled
    // ...
    const result = await batchService.enrollStudents(
      "batch-uuid",
      ["new-student-uuid", "existing-student-uuid"],
      "admin-uuid"
    );

    expect(result.enrolled).toHaveLength(1);
    expect(result.skipped).toHaveLength(1);
    expect(result.failed).toHaveLength(0);
  });
});
```

---

# 10. Code Examples

## 10.1 How Other Features Use Batch Context

Every feature that is scoped to a batch uses this pattern to verify
that the requesting user has access to the batch before processing
the request:
```typescript
// Reusable batch access checker
export const verifyBatchAccess = async (
  batchId: string,
  userId: string,
  userRole: string
) => {
  const batch = await prisma.batch.findUnique({
    where: { id: batchId },
    include: {
      mentors: { select: { mentorId: true } },
      enrollments: {
        where: { studentId: userId, status: "ACTIVE" },
      },
    },
  });

  if (!batch) {
    throw { code: "BATCH_NOT_FOUND", statusCode: 404 };
  }

  if (userRole === "ADMIN" || userRole === "SUPER_ADMIN") {
    return batch; // Admins can access all batches
  }

  if (userRole === "MENTOR") {
    const isAssigned = batch.mentors.some(
      (bm) => bm.mentorId === userId
    );
    if (!isAssigned) {
      throw { code: "PERMISSION_DENIED", statusCode: 403 };
    }
    return batch;
  }

  if (userRole === "STUDENT") {
    const isEnrolled = batch.enrollments.length > 0;
    if (!isEnrolled) {
      throw { code: "PERMISSION_DENIED", statusCode: 403 };
    }
    return batch;
  }

  throw { code: "PERMISSION_DENIED", statusCode: 403 };
};

// Usage in content controller
const batch = await verifyBatchAccess(
  req.params.batchId,
  req.user.user_id,
  req.user.role
);
// Safe to proceed — user has access to this batch
```

---

# 11. Performance Optimization

## 11.1 Query Optimization

The most frequently called batch query is fetching a student's active
enrollment to determine which batch they belong to. This happens on
virtually every page load for a student. Use a combined index:
```sql
CREATE INDEX idx_enrollments_student_active
  ON enrollments(student_id, status)
  WHERE status = 'ACTIVE';
```

This partial index only indexes active enrollments, making it small
and fast to query.

## 11.2 Caching Student Batch Context

Since a student's batch does not change frequently, the result of
GET /api/my/batch can be cached in Redis with a TTL of 30 minutes.
Invalidate the cache when the enrollment status changes (withdrawal
or completion).
```typescript
// Cache pattern for student batch data
const CACHE_KEY = (studentId: string) => `student:${studentId}:batch`;
const CACHE_TTL = 30 * 60; // 30 minutes

const getCachedStudentBatch = async (studentId: string) => {
  const cached = await redis.get(CACHE_KEY(studentId));
  if (cached) return JSON.parse(cached);

  const batch = await batchService.getMyBatch(studentId);
  await redis.setex(CACHE_KEY(studentId), CACHE_TTL, JSON.stringify(batch));
  return batch;
};

const invalidateStudentBatchCache = async (studentId: string) => {
  await redis.del(CACHE_KEY(studentId));
};
```

## 11.3 Pagination on Student Lists

For batches with hundreds of students, always use pagination on the
GET /api/batches/:batchId/students endpoint. Default page size of 50
is appropriate. Never fetch all students in a single query — use
Prisma's `skip` and `take` parameters.

---

**End of Feature 02 — Batch Management**

---

**Document Information**

| Field | Value |
|-------|-------|
| Feature | F02 — Batch Management |
| Version | 1.0 |
| Status | Ready for Development |
| Folder | F02_Batch_Management/ |
| Filename | F02_Implementation_Guide.md |
| Previous Feature | F01_Authentication_And_RoleManagement/ |
| Next Feature | F03_Content_Management/F03_Implementation_Guide.md |