# Feature 02 — Batch Management
### Complete Implementation Guide | Version 1.0 | March 2026

---

# 1. Feature Description
*From docs/Features_SubDocument.md*

Batch Management is the organizational backbone of M2i_LMS. A batch represents a cohort of students who are going through a defined curriculum together over a specific time period. Everything in the platform — content, quizzes, live sessions, progress tracking — is organized within the context of a batch. Understanding how batches work is fundamental to understanding how the rest of the platform operates.

In Phase One, the platform supports a single active batch. The batch management system is nevertheless designed to support multiple batches from the beginning, because the data model and API must be batch-aware for Phase Two to function correctly. The UI may focus on a single batch in Phase One, but the underlying architecture treats multi-batch as a first-class concern.

---

# 2. User Stories
*From docs/Features_SubDocument.md*

### Admin Stories

**US-BATCH-01**
As an admin, I want to create a new batch by providing a name, description, and start and end dates, so that I can define the organizational context for a new cohort of students.

**US-BATCH-02**
As an admin, I want to enroll students in a batch by selecting from the list of registered students, so that enrolled students can access the content and sessions associated with that batch.

**US-BATCH-03**
As an admin, I want to assign mentors to a batch, so that mentors can upload content and manage quizzes for that specific cohort.

**US-BATCH-04**
As an admin, I want to view a list of all students enrolled in a batch along with their enrollment status, so that I have a clear picture of who is in the cohort.

**US-BATCH-05**
As an admin, I want to remove a student from a batch, so that I can manage withdrawals or enrollment corrections.

**US-BATCH-06**
As an admin, I want to update a batch's name, description, or dates, so that I can correct mistakes or reflect schedule changes.

**US-BATCH-07**
As an admin, I want to archive a completed batch, so that it is no longer shown as active but its data is preserved for historical reference.

### Mentor Stories

**US-BATCH-08**
As a mentor, I want to see the list of students enrolled in my assigned batch, so that I know who I am teaching and can track their progress individually.

**US-BATCH-09**
As a mentor, I want to see the batch schedule including start date, end date, and the current week of the curriculum, so that I can plan content and sessions appropriately.

### Student Stories

**US-BATCH-10**
As a student, I want to see the name and details of the batch I am enrolled in, so that I understand the context of my learning program.

**US-BATCH-11**
As a student, I want to see how many weeks remain in my batch, so that I can pace my engagement and understand my learning timeline.

---

# 3. Acceptance Criteria
*From docs/Features_SubDocument.md*

### Batch Creation (US-BATCH-01)

- AC-BATCH-01-1: The batch creation form requires batch name (maximum 100 characters), start date, and end date. Description is optional (maximum 500 characters).
- AC-BATCH-01-2: The end date must be after the start date. If the end date is on or before the start date, an inline validation error is displayed.
- AC-BATCH-01-3: Batch names must be unique within the platform. Attempting to create a batch with a name that already exists returns a validation error.
- AC-BATCH-01-4: On successful creation, the admin is taken to the batch detail page where they can begin enrolling students and assigning mentors.
- AC-BATCH-01-5: A newly created batch has status ACTIVE by default.

### Enrollment (US-BATCH-02, US-BATCH-05)

- AC-BATCH-02-1: The enrollment interface shows a searchable list of all users with the STUDENT role who are not already enrolled in the batch.
- AC-BATCH-02-2: Admins can enroll multiple students at once using a multi-select interface.
- AC-BATCH-02-3: A student can only be enrolled in one batch at a time in Phase One. Attempting to enroll an already-enrolled student returns an appropriate error message.
- AC-BATCH-02-4: On successful enrollment, the student immediately gains access to the batch's published content and upcoming sessions.
- AC-BATCH-05-1: Removing a student from a batch changes their enrollment status to WITHDRAWN. Their historical quiz responses, attendance records, and progress scores are preserved.
- AC-BATCH-05-2: A withdrawn student loses access to the batch's content and future sessions immediately upon withdrawal.
- AC-BATCH-05-3: Withdrawing a student requires a confirmation step to prevent accidental removals.

### Mentor Assignment (US-BATCH-03)

- AC-BATCH-03-1: Admins can assign one or more mentors to a batch.
- AC-BATCH-03-2: Assigned mentors gain access to all content management, quiz review, and student progress features for that batch.
- AC-BATCH-03-3: A mentor can be assigned to multiple batches simultaneously.
- AC-BATCH-03-4: Removing a mentor from a batch does not delete any content they uploaded or quizzes they reviewed. It only removes their access to manage that batch going forward.

### Batch Updates and Archiving (US-BATCH-06, US-BATCH-07)

- AC-BATCH-06-1: Admins can update batch name, description, and end date at any time.
- AC-BATCH-06-2: The start date cannot be changed after the first student has been enrolled in the batch.
- AC-BATCH-07-1: Archiving a batch changes its status to ARCHIVED and removes it from the active batches listing.
- AC-BATCH-07-2: Archived batches are accessible via a separate "Archived Batches" section in the admin interface.
- AC-BATCH-07-3: No content, session, or progress data is deleted when a batch is archived.

---

# 4. Business Rules
*From docs/Features_SubDocument.md*

**BR-BATCH-01:** In Phase One, a student may only be enrolled in one batch at a time. This simplifies the student dashboard experience and avoids ambiguity in progress tracking. Multi-batch enrollment will be supported from Phase Two.

**BR-BATCH-02:** A batch must have at least one assigned mentor before content can be uploaded to it. The system prevents content upload attempts if no mentor is assigned.

**BR-BATCH-03:** Batches cannot be deleted — only archived. Deletion would destroy student progress data, which is unacceptable. Archiving preserves all data while removing the batch from active workflows.

**BR-BATCH-04:** The "current week" of a batch is calculated automatically based on the batch start date and the current date. Week 1 is the first full week after the start date. This calculation is used in the progress dashboard to display week-by-week progress in context.

**BR-BATCH-05:** If a batch's end date passes without the admin archiving it, the batch status automatically transitions to COMPLETED. COMPLETED batches remain fully accessible but are visually distinguished from ACTIVE batches.

---

# 5. Core Functionality
*From features/F02_Batch_Management.md*

### 5.1 Batch Lifecycle

A batch moves through the following status transitions during its
lifetime:
```
DRAFT → ACTIVE → COMPLETED → ARCHIVED
                     ↑
               (auto transition
                when end_date passes)
```

1.  **DRAFT:** Batch is created but not yet active. No students can
    be enrolled. Mentors can be assigned and content uploaded.
2.  **ACTIVE:** Batch is ongoing. Students are enrolled, content is
    being delivered, and progress is being tracked.
3.  **COMPLETED:** Batch end date has passed. Content remains
    accessible but no new sessions can be scheduled.
4.  **ARCHIVED:** Batch is no longer active. Removed from standard
    views but data preserved for historical analysis.

---

# 6. Data Model
*Refer to docs/Database_Schema.md for the authoritative version.*

The batch system relies on the `batches`, `enrollments`, and
`batch_mentors` tables.

---

# 7. API Endpoints
*Refer to docs/API_Endpoints.md for the authoritative version.*

Key endpoints:
- `POST /api/batches`
- `GET /api/batches/:batchId`
- `POST /api/batches/:batchId/enroll`
- `POST /api/batches/:batchId/mentors`
- `GET /api/my/batch` (Student)

---

# 8. Frontend Components
*From features/F02_Batch_Management.md*

## 8.1 Component Structure
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

## 8.2 BatchStatusBadge Component

A reusable visual badge showing batch status with appropriate colors.
```tsx
// components/batches/BatchStatusBadge.tsx
type BatchStatus = "DRAFT" | "ACTIVE" | "COMPLETED" | "ARCHIVED";

const statusConfig: Record<
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
    className: "bg-orange-100 text-orange-700",
  },
};
```

---

# 9. Implementation Steps
*From features/F02_Batch_Management.md*

### Step 1 — Database Schema (Day 1)

1.  Define `batches`, `enrollments`, and `batch_mentors` in `schema.prisma`.
2.  Run `npx prisma migrate dev --name add_batch_tables`.

### Step 2 — Batch Service (Day 1)

1.  Implement `createBatch()`: validate dates, unique name.
2.  Implement `enrollStudents()`: bulk insert enrollments, check existing.
3.  Implement `assignMentors()`: bulk insert mentor assignments.
4.  Implement `getBatchDetails()`: aggregate counts (students, mentors, content).

### Step 3 — Routes and Controllers (Day 2)

1.  Create `routes/batch.routes.ts` and `controllers/batch.controller.ts`.
2.  Implement `authorize(['ADMIN'])` on management routes.
3.  Implement `getStudentBatch()` for the student dashboard.

### Step 4 — Admin Batch Management UI (Day 3)

1.  Build Batch List page with filters.
2.  Build Create Batch form with date validation.
3.  Build Student Enrollment modal with search and multi-select.

### Step 5 — Batch Context and Navigation (Day 3)

1.  Ensure all content/session routes correctly handle the `batchId` parameter.
2.  Implement student-side batch overview.

---

# 10. Error Handling
*From features/F02_Batch_Management.md*

- **400 Bad Request:** End date before start date, missing required fields.
- **404 Not Found:** Batch ID does not exist.
- **409 Conflict:** Batch name already exists, student already enrolled.

---

# 11. Testing Strategy
*Refer to docs/Testing_And_QA_Guide.md for the authoritative version.*

Key tests:
- Create batch with valid/invalid dates.
- Enroll multiple students and verify counts.
- Prevent duplicate enrollment of same student.
- Verify mentor access is scoped to assigned batches.
- Verify automatic transition to COMPLETED status.

---

# 12. Performance Optimization
*From features/F02_Batch_Management.md*

- **Database Indexes:** Index `enrollments.student_id`, `enrollments.batch_id`, and `batch_mentors.mentor_id`.
- **Count Caching:** For large batches, consider caching enrollment counts or using Prisma's `_count` aggregation efficiently.
- **Bulk Operations:** Always use `createMany` for student enrollment to avoid N+1 database calls.
