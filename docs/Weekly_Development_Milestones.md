# M2i_LMS — Week-by-Week Development Milestones

### Version 1.0 | March 2026

### Save As: Developer_Guides/M2i_LMS_Development_Milestones.md

---

# Table of Contents

1. [Overview](#1-overview)
2. [Team Structure and Responsibilities](#2-team-structure-and-responsibilities)
3. [Dependency Map](#3-dependency-map)
4. [Week 1 — Foundation](#4-week-1--foundation)
5. [Week 2 — Content and Auth Completion](#5-week-2--content-and-auth-completion)
6. [Week 3 — AI Pipeline](#6-week-3--ai-pipeline)
7. [Week 4 — Quiz Review and Taking](#7-week-4--quiz-review-and-taking)
8. [Week 5 — Live Streaming](#8-week-5--live-streaming)
9. [Week 6 — Metrics Engine](#9-week-6--metrics-engine)
10. [Week 7 — Dashboard and Notifications](#10-week-7--dashboard-and-notifications)
11. [Week 8 — Integration and Hardening](#11-week-8--integration-and-hardening)
12. [Week 9 — Beta Launch](#12-week-9--beta-launch)
13. [Daily Standup Template](#13-daily-standup-template)
14. [Integration Checkpoints](#14-integration-checkpoints)
15. [Risk Register](#15-risk-register)
16. [Definition of Done](#16-definition-of-done)

---

# 1. Overview

## 1.1 Timeline Summary

M2i_LMS Phase One is an 8-week build culminating in a beta
launch in Week 9 with a pilot cohort of 20-50 students.

```
Week 1  : Foundation — database, auth, batch management
Week 2  : Content upload, storage, admin frontend
Week 3  : AI pipeline — Whisper transcription, quiz generation
Week 4  : Quiz review (mentor) and quiz taking (student)
Week 5  : Live streaming — Mux integration, session management
Week 6  : Metrics calculation engine — all 9 dimensions
Week 7  : Student dashboard, mentor batch overview, notifications
Week 8  : Integration testing, bug fixes, performance hardening
Week 9  : Beta launch prep, pilot onboarding, go-live
```

## 1.2 Key Constraints

**8-week build window:** Week 9 is not a build week — it is
a launch week. All features must be functionally complete and
tested by end of Week 8.

**Feature freeze at end of Week 7:** No new features after
Friday of Week 7. Week 8 is exclusively for fixing what exists,
not adding what does not.

**Integration checkpoint after each week:** Every Friday, the
team merges all branches to main, runs the full test suite,
and demos the week's work together. Blockers discovered at
checkpoints are resolved before new work begins Monday.

**The AI pipeline is the highest risk item:** Whisper and
Ollama behavior can be unpredictable. Allocate 20% buffer
time in Weeks 3-4 for AI quality issues. If the pipeline
is ahead of schedule, use the buffer for quality improvement.
If behind, descope retention quiz generation first.

## 1.3 Build Principles

**Backend-first, frontend-second:** Every feature starts
with the API endpoints and business logic. The frontend
is built against working endpoints, not mocked data.
This prevents the front end from being built twice.

**Test as you build:** Unit tests are written alongside
the code they test, not in a separate "testing sprint"
at the end. Code review does not pass without tests for
new service logic.

**Document blockers immediately:** If a developer is
blocked for more than two hours, they surface it in Slack
immediately rather than waiting for standup. Time lost to
undisclosed blockers is the most preventable schedule risk.

---

# 2. Team Structure and Responsibilities

## 2.1 Roles

```
Tech Lead / Backend Lead (1 person)
  Primary owner of:
    - Backend architecture decisions
    - Database schema and migrations
    - AI pipeline (Whisper + Ollama workers)
    - Metrics calculation engine
    - Code review for all backend PRs

Backend Developer (1 person)
  Primary owner of:
    - API endpoints (all features)
    - Background job workers
    - Socket.io real-time events
    - Integration testing

Frontend Developer 1 (1 person)
  Primary owner of:
    - Student-facing pages and components
    - Quiz taking interface
    - Student progress dashboard
    - Notification components

Frontend Developer 2 (1 person)
  Primary owner of:
    - Mentor-facing pages and components
    - Quiz review interface
    - Batch management and content upload
    - Admin pages

PM / Tech Lead Support (shared with Tech Lead)
  Primary owner of:
    - Documentation maintenance
    - Sprint planning and weekly checkpoints
    - Stakeholder communication
    - Beta launch coordination
```

## 2.2 Parallel Track Strategy

The 4-person team can work on two parallel tracks:

```
Track A: Backend (Tech Lead + Backend Dev)
Track B: Frontend (Frontend Dev 1 + Frontend Dev 2)

Tracks converge at integration points each week.
Track B builds against API contracts in the documentation
while Track A implements the actual endpoints.
Mock API responses in Track B are replaced with real
calls as Track A completes each endpoint group.
```

---

# 3. Dependency Map

Before looking at the week-by-week plan, understand which
features depend on which others. Building in the wrong order
creates blockers.

```
F01 Authentication
  ↓ (required by everything)
  └──► F02 Batch Management
            ↓
            ├──► F03 Content Management
            │         ↓
            │         ├──► F04 Quiz Generation (needs transcript)
            │         │         ↓
            │         │         └──► F05 Quiz Review
            │         │                   ↓
            │         │                   └──► F07 Quiz Taking
            │         │                             ↓
            │         └──► F06 Live Streaming        └──► F09 Metrics Engine
            │                   ↓                             ↓
            │                   └──► F07 (attendance data)   └──► F08 Dashboard
            │
            └──► F10 Notifications (used by all features)
```

**Critical path:** F01 → F02 → F03 → F04 → F05 → F07 → F09 → F08

F06 (Live Streaming) and F10 (Notifications) are parallel
tracks that can be built alongside the critical path.

---

# 4. Week 1 — Foundation

**Theme:** Everything needed before any user-facing feature
can be built. The goal of Week 1 is that by Friday, any
developer can log in, create a batch, enroll students, and
make authenticated API calls.

## 4.1 Week 1 Goals

```
By end of Friday Week 1:

Backend:
  ✓ Repository initialized with TypeScript config
  ✓ Docker Compose running PostgreSQL + Redis
  ✓ All 20 database tables created via Prisma migrations
  ✓ Prisma client generated with full type safety
  ✓ Express app with middleware stack configured
  ✓ Socket.io server attached to HTTP server
  ✓ Bull queues initialized (content, metrics, session)
  ✓ node-cron scheduler initialized (no jobs yet)
  ✓ F01 Authentication complete:
      POST /api/auth/register
      POST /api/auth/login
      POST /api/auth/logout
      POST /api/auth/refresh-token
      GET  /api/auth/me
      PUT  /api/auth/me
      POST /api/auth/change-password
  ✓ F02 Batch Management complete (backend):
      POST /api/batches
      GET  /api/batches
      GET  /api/batches/:batchId
      PUT  /api/batches/:batchId
      POST /api/batches/:batchId/enroll
      DELETE /api/batches/:batchId/enroll/:studentId
      GET  /api/batches/:batchId/students
      POST /api/batches/:batchId/mentors
      GET  /api/my/batch (student endpoint)
  ✓ User management endpoints:
      POST /api/users
      GET  /api/users
      GET  /api/users/:userId
      PUT  /api/users/:userId
      POST /api/users/:userId/reset-password
  ✓ Health endpoints:
      GET /api/health
      GET /api/health/db
  ✓ Dev seed data working

Frontend:
  ✓ Next.js 14 project initialized with App Router
  ✓ Tailwind CSS + shadcn/ui configured
  ✓ Axios instance with cookie handling and auto-refresh
  ✓ AuthContext providing user state to all pages
  ✓ Login page (functional — calls real backend)
  ✓ Register page (functional)
  ✓ Route protection middleware (redirect if not logged in)
  ✓ Nav header shell with placeholder bell icon
  ✓ Admin batch management page (create, list, view batch)
  ✓ Admin user management page (list, create, update user)
  ✓ Student enrollment UI (add/remove students from batch)
```

## 4.2 Week 1 Day-by-Day

### Monday — Infrastructure

**Tech Lead:**

- Initialize repository structure (monorepo layout)
- Set up TypeScript for both backend and frontend
- Create `docker-compose.yml` with Postgres and Redis
- Write complete `prisma/schema.prisma` (all 20 tables)
- Run first migration: `prisma migrate dev --name initial_schema`

**Backend Dev:**

- Set up Express app with all middleware
  (helmet, cors, cookie-parser, morgan, rate limiter)
- Attach Socket.io to HTTP server
- Initialize Bull queues (empty — no workers yet)
- Initialize node-cron scheduler (empty — no jobs yet)
- Write global error handler middleware

**Frontend Dev 1:**

- Initialize Next.js 14 project with App Router
- Configure Tailwind CSS and shadcn/ui
- Set up Axios instance with interceptors
- Create AuthContext shell

**Frontend Dev 2:**

- Set up folder structure for all feature pages
- Create navigation header component shell
- Set up route protection middleware
- Create basic layout components

---

### Tuesday — Authentication (F01)

**Tech Lead:**

- Implement AuthService:
  - `register()` with bcrypt hashing
  - `login()` with Passport.js local strategy
  - `logout()` with token revocation
  - `refreshToken()` with SHA-256 hash comparison
  - `changePassword()` with full token revocation
- Write JWT utility functions
- Write middleware: `authenticate.ts`, `authorize.ts`

**Backend Dev:**

- Build auth controller wrapping AuthService
- Register all auth routes
- Implement login rate limiter (5 attempts per minute)
- Write unit tests for AuthService

**Frontend Dev 1:**

- Build login page with form validation
- Build register page
- Connect both pages to backend auth endpoints
- Implement auto-refresh interceptor in Axios
- Test full login/logout flow

**Frontend Dev 2:**

- Build route protection (Next.js middleware.ts)
- Create role-based redirect logic:
  - ADMIN → /admin/dashboard
  - MENTOR → /mentor/dashboard
  - STUDENT → /student/dashboard
- Build profile page (view and update own details)

---

### Wednesday — Batch Management Backend (F02)

**Tech Lead:**

- Implement BatchService:
  - `createBatch()`, `listBatches()`, `getBatch()`
  - `updateBatch()`, `archiveBatch()`
  - `enrollStudents()`, `withdrawStudent()`
  - `assignMentors()`
  - `verifyBatchAccess()` utility (used by all features)
- Write batch status transition cron job (DRAFT → ACTIVE)

**Backend Dev:**

- Build batch controller
- Register all batch routes with authorization
- Write unit tests for BatchService
- Write integration tests for enrollment endpoints

**Frontend Dev 1:**

- Start building Student enrollment flow
  (select students → bulk enroll → show result)

**Frontend Dev 2:**

- Build Admin batch list page
- Build Admin batch creation form
- Build Admin batch detail page (students, mentors)

---

### Thursday — User Management and Batch Frontend

**Tech Lead:**

- Implement UserService:
  - `createUser()` with temp password generation
  - `listUsers()`, `getUser()`, `updateUser()`
  - `resetPassword()`
- Code review: auth and batch PRs

**Backend Dev:**

- Build user controller and routes
- Write seeding script (`prisma/seed.ts`)
- Test seed: `npx prisma db seed`
- Verify all Week 1 backend endpoints with Postman

**Frontend Dev 1:**

- Build mentor assignment UI
- Build student withdrawal UI
- Test enrollment flows end-to-end

**Frontend Dev 2:**

- Build Admin user management page
- Build user creation modal
- Build user edit modal with role change
- Polish batch detail page with student list

---

### Friday — Week 1 Integration Checkpoint

**All developers — morning:**

- Merge all branches to main
- Run full test suite: `npm test`
- Fix any failing tests before proceeding

**All developers — afternoon:**

- Demo session: each developer demos their week's work
- Walk through the complete admin flow together:
  1. Create a batch
  2. Create a mentor user
  3. Create 3 student users
  4. Assign mentor to batch
  5. Enroll students
  6. Log in as each role — verify correct dashboard
- Document any bugs found as GitHub issues

**Week 1 go/no-go criteria:**

```
✓ All 7 auth endpoints return correct responses
✓ JWT cookie is set and refresh works
✓ Batch CRUD is working
✓ Enrollment adds/removes correctly
✓ Role-based routing works (admin, mentor, student go different places)
✓ Dev seed creates all test data cleanly
✓ Test suite passes with no failures
```

---

# 5. Week 2 — Content and Auth Completion

**Theme:** Content upload pipeline, S3 integration, and the
remaining UI infrastructure. By end of Week 2, mentors can
upload videos and students can see the content library.

## 5.1 Week 2 Goals

```
By end of Friday Week 2:

Backend:
  ✓ F03 Content Management complete:
      POST /api/content/upload-url (pre-signed S3 URL)
      POST /api/content (create after upload)
      GET  /api/batches/:batchId/content
      GET  /api/content/:contentId
      PUT  /api/content/:contentId
      POST /api/content/:contentId/publish
      POST /api/content/:contentId/unpublish
      DELETE /api/content/:contentId (soft delete)
      PUT  /api/content/reorder
      GET  /api/content/:contentId/transcript
      PUT  /api/content/:contentId/transcript
      PATCH /api/content/:contentId/progress (student progress)
      POST /api/content/:contentId/files/upload-url
      POST /api/content/:contentId/files
      DELETE /api/content/:contentId/files/:fileId
  ✓ S3 pre-signed URL generation working
  ✓ CloudFront CDN URLs being generated
  ✓ EXTRACT_AUDIO Bull worker implemented (FFmpeg)
  ✓ Batch status transition cron job running
  ✓ Missed session check cron job skeleton (no sessions yet)

Frontend:
  ✓ Mentor content upload page (drag-drop + progress bar)
  ✓ Direct-to-S3 upload working in browser
  ✓ Content library page (mentor view with unpublished)
  ✓ Content library page (student view, published only)
  ✓ Content detail page with video player
  ✓ Supplementary file upload and display
  ✓ Content reordering (drag-and-drop sort)
  ✓ Student video watch progress tracking (30s heartbeat)
  ✓ NotificationContext wired up with Socket.io
  ✓ NotificationBell in nav header (reads unread count)
```

## 5.2 Week 2 Day-by-Day

### Monday — S3 Integration and Content Backend

**Tech Lead:**

- Implement S3 utility functions (upload URL, download URL)
- Build ContentService:
  - `generateUploadUrl()` with MIME type validation
  - `createContent()` with CDN URL generation
  - `publishContent()`, `unpublishContent()`
  - `deleteContent()` (soft delete)
  - `reorderContent()`
  - `updateWatchProgress()` (UPSERT pattern)
- Implement EXTRACT_AUDIO Bull worker:
  - Download video from S3
  - Run FFmpeg subprocess
  - Upload audio to S3 temp path
  - Queue TRANSCRIBE job

**Backend Dev:**

- Build content controller
- Register all content routes
- Write unit tests for ContentService
- Set up local S3 mock (localstack) for dev testing
  OR use real S3 dev bucket

**Frontend Dev 1:**

- Build content library page (student view)
- Build content detail page with video player
- Implement 30-second watch progress heartbeat

**Frontend Dev 2:**

- Build mentor content upload page
- Implement direct-to-S3 browser upload
- Show upload progress bar

---

### Tuesday — Content Frontend and Notifications

**Tech Lead:**

- Implement NotificationService (send, sendBulk, sendToBatch)
- Set up Socket.io user rooms in notificationSocket.ts
- Wire notifications into content pipeline:
  - TRANSCRIPTION_COMPLETE notification to mentors
  - CONTENT_PUBLISHED notification to students

**Backend Dev:**

- Build notification controller and routes
- Register notification endpoints:
  GET  /api/notifications
  GET  /api/notifications/unread-count
  POST /api/notifications/:id/read
  POST /api/notifications/mark-all-read
  DELETE /api/notifications/:id
  DELETE /api/notifications/clear-all
- Write notification cleanup cron job

**Frontend Dev 1:**

- Build NotificationToastContainer
- Wire up Socket.io in NotificationContext
- Test real-time notification delivery

**Frontend Dev 2:**

- Build supplementary file upload UI
- Build content reordering UI
- Polish mentor content detail page

---

### Wednesday — Transcript and Supplementary Files

**Tech Lead:**

- Wire transcript storage after TRANSCRIBE job
  (TRANSCRIBE worker is in Week 3 — add the stub now)
- Build transcript view/edit endpoint and UI stub

**Backend Dev:**

- Complete supplementary file endpoints
- Write S3 lifecycle rule setup script for temp audio cleanup
- Test full content upload → audio extraction flow

**Frontend Dev 1:**

- Build NotificationDropdown
- Build NotificationItem with type icons
- Connect mark-as-read to API

**Frontend Dev 2:**

- Build transcript view for mentor
  (shows transcription status + text when complete)
- Build content management dashboard
  (list with status indicators: draft, published, transcribing)

---

### Thursday — Polish and Integration Testing

**Tech Lead:**

- Code review all Week 2 PRs
- Fix any S3/FFmpeg integration issues
- Verify audio extraction end-to-end

**Backend Dev:**

- Integration tests for content upload flow
- Integration tests for notification creation and delivery
- Verify Socket.io room joining and event emission

**Frontend Dev 1:**

- Build full notification inbox page
- Handle all notification states: empty, loading, list

**Frontend Dev 2:**

- Student content library — quiz status badges
  (available, completed, not available yet)
- Content completion percentage display

---

### Friday — Week 2 Integration Checkpoint

**Demo flow:**

1. Mentor uploads a video → progress bar shows → upload completes
2. Content appears in mentor content list as unpublished
3. FFmpeg job triggers → audio extracted → TRANSCRIBE queued
4. Mentor receives TRANSCRIPTION_COMPLETE notification
   (manually fire notification for demo since TRANSCRIBE not built)
5. Mentor publishes content → students can see it
6. Student watches video → progress saves every 30 seconds
7. Student sees completion percentage on content card

**Week 2 go/no-go criteria:**

```
✓ Pre-signed URL generates and S3 upload completes
✓ Content record created after upload
✓ FFmpeg worker runs and queues next job
✓ Content publish/unpublish toggles student visibility
✓ Watch progress saves and resumes from last position
✓ Notifications create and deliver via Socket.io
✓ Bell badge shows correct unread count
✓ Mark as read decrements count
```

---

# 6. Week 3 — AI Pipeline

**Theme:** The most technically risky week in the project.
Whisper transcription and Mistral 7B quiz generation must
both work reliably by Friday. Plan for things to go wrong
and allocate Thursday as a buffer day.

## 6.1 Week 3 Goals

```
By end of Friday Week 3:

Backend:
  ✓ TRANSCRIBE Bull worker complete:
      Download audio from S3
      Run Whisper subprocess
      Parse JSON output
      Store transcript in database
      Delete temp audio from S3
      Queue GENERATE_QUIZZES job
      Notify mentors on completion/failure
  ✓ GENERATE_QUIZZES Bull worker complete:
      Read transcript from database
      Chunk transcript (>3000 words)
      Concept extraction prompt + Ollama call
      Parse concepts JSON
      Question generation prompt per concept (up to 8)
      Parse and validate each question
      Retry up to 3x per concept on JSON failure
      Store valid questions as PENDING_REVIEW
      Log all stages to quiz_generation_logs
      Notify mentors: QUIZZES_READY_FOR_REVIEW
  ✓ POST /api/content/:contentId/regenerate-quizzes endpoint
  ✓ GET /api/batches/:batchId/quizzes/review-stats endpoint
  ✓ All generation failures handled gracefully
  ✓ quiz_generation_logs populated for every run

Frontend:
  ✓ Content detail page shows transcription progress status
  ✓ Mentor receives and can click QUIZZES_READY_FOR_REVIEW
    notification
  ✓ Basic quiz review queue page showing pending questions
    (full review UI is Week 4 — this week just shows the list)
```

## 6.2 Week 3 Day-by-Day

### Monday — Whisper Transcription Worker

**Tech Lead:**

- Implement `processTranscribeJob()` worker completely:
  - S3 download
  - Whisper subprocess with all parameters
  - JSON output parsing
  - `cleanWhisperTranscript()` function
  - Transcript storage in database
  - S3 temp file deletion
  - GENERATE_QUIZZES job queuing
  - Error handling and mentor notification
- Test with a real audio file end-to-end
- Benchmark transcription speed (document result)

**Backend Dev:**

- Wire TRANSCRIBE worker into content queue processor
- Ensure EXTRACT_AUDIO worker correctly chains to TRANSCRIBE
- Write integration test for full audio → transcript flow
- Set up logging for pipeline stages

**Frontend Dev 1:**

- Transcription status polling on content detail page
  (poll every 15 seconds while status = PROCESSING)
- Show transcript text once COMPLETE

**Frontend Dev 2:**

- Quiz generation log viewer for admin
  (table showing run history, stages, success/failure)

---

### Tuesday — Concept Extraction

**Tech Lead:**

- Implement `extractConcepts()` function:
  - Transcript chunking for long lectures
  - Concept extraction prompt (P01)
  - Ollama API call
  - `parseJsonFromResponse()` parser
  - Concept deduplication
  - quiz_generation_logs creation
- Test with real transcripts of different lengths

**Backend Dev:**

- Implement `generateWithOllama()` utility
- Implement full `parseJsonFromResponse()` with all
  recovery strategies
- Write unit tests for parser covering all failure modes
- Write unit tests for concept validation

**Frontend Dev 1 & 2:**

- Build quiz review queue page shell
  (shows count of pending questions per content item)

---

### Wednesday — Question Generation

**Tech Lead:**

- Implement `generateQuestionsForContent()`:
  - `buildQuestionDistribution()` for cognitive levels
  - `buildQuestionGenerationPrompt()` for each level
  - Per-concept retry loop (3 attempts)
  - `validateGeneratedQuestion()` for all conditions
  - `storeGeneratedQuestions()` to quizzes table
  - `checkThresholdAndNotify()` for mentor notification
  - Partial success handling

**Backend Dev:**

- Wire GENERATE_QUIZZES worker end-to-end
- Test complete pipeline: upload → audio → transcript → quizzes
- Measure generation time, document result
- Fix any JSON parsing failures encountered in testing

**Frontend Dev 1:**

- Display generated question count in content list
- QUIZZES_READY_FOR_REVIEW notification → link to review queue

**Frontend Dev 2:**

- Build basic question list in review queue
  (question text, options, correct indicator, cognitive level)
  Full review actions (approve/reject) are Week 4

---

### Thursday — Buffer and Quality Day

This day is intentionally left as a buffer. The AI pipeline
almost always has unexpected behavior the first time it runs
on real content. Common issues and fixes:

**If Ollama keeps timing out:**

```bash
# Check available memory
free -h
# If < 6GB free RAM, close other applications
# Reduce max_tokens in generateWithOllama call
```

**If JSON parsing fails consistently:**

```bash
# Log the raw Ollama output to see what it is producing
console.log("RAW OUTPUT:", rawResponse);
# Adjust parseJsonFromResponse() to handle the new pattern
```

**If concept extraction produces irrelevant concepts:**

```bash
# Add more specific instructions to P01 prompt
# Test with 3-5 different transcripts before adjusting
```

**If question quality is consistently poor:**

```bash
# Add positive examples to the prompt
# Reduce temperature from 0.3 to 0.1
# Add more specific requirements for distractors
```

**If pipeline is ahead of schedule:**

- Implement retention quiz generation
- Implement `POST /api/content/:contentId/regenerate-quizzes`
- Add quiz_generation_logs analytics endpoint

---

### Friday — Week 3 Integration Checkpoint

**Demo flow:**

1. Upload a video (or use existing one from Week 2)
2. Audio extraction completes → backend log shows
3. Whisper transcription runs → log shows word count
4. Concept extraction runs → log shows concepts
5. Question generation runs → log shows each question
6. Mentor receives QUIZZES_READY_FOR_REVIEW notification
7. Click notification → basic question list shows
8. Verify quiz_generation_logs table has entries

**Week 3 go/no-go criteria:**

```
✓ Whisper successfully transcribes a real lecture video
✓ Transcript stored in database with correct text
✓ Concept extraction produces 4-8 concepts
✓ Question generation produces valid JSON for ≥80% of concepts
✓ Questions stored with PENDING_REVIEW status in database
✓ Mentor receives notification with correct question count
✓ JSON parser handles all tested failure patterns
✓ Failed concepts are retried without failing entire pipeline
✓ quiz_generation_logs has entries for every stage
```

**Critical warning:** If fewer than 5 questions are consistently
generated per video by end of Friday, escalate immediately.
This blocks Weeks 4 and 7. Do not leave the office without a
root cause identified.

---

# 7. Week 4 — Quiz Review and Taking

**Theme:** The quiz workflow closes this week. Mentors can
review and approve questions, students can take quizzes,
and the system records responses. This is the week that
the platform becomes a real learning assessment tool.

## 7.1 Week 4 Goals

```
By end of Friday Week 4:

Backend:
  ✓ F05 Quiz Review complete:
      GET  /api/batches/:batchId/quizzes/review-queue
      POST /api/quizzes/:quizId/approve
      POST /api/quizzes/batch-approve
      PUT  /api/quizzes/:quizId (edit question)
      POST /api/quizzes/:quizId/reject
      POST /api/quizzes/:quizId/revoke-approval
      POST /api/content/:contentId/quizzes/manual
      GET  /api/content/:contentId/quizzes/approved
      GET  /api/batches/:batchId/quizzes/review-stats
  ✓ F07 Quiz Taking complete:
      GET  /api/content/:contentId/quizzes/status
      GET  /api/content/:contentId/quizzes/available
      POST /api/quizzes/submit
      GET  /api/students/:studentId/quiz-history
      GET  /api/quiz-attempts/:attemptId/detail
      GET  /api/batches/:batchId/quiz-analytics
  ✓ Quiz availability threshold logic (5 for quick, 8 for retention)
  ✓ Option shuffle with deterministic seed per student
  ✓ Display index → canonical index mapping on submission
  ✓ Idempotent submission (same attempt_id = same result)
  ✓ QUIZ_AVAILABLE notification to students on threshold met
  ✓ metricsQueue.add() called after each submission
    (worker is Week 6 — just queue the job now)

Frontend:
  ✓ Full quiz review interface (mentor):
      Question cards with edit/approve/reject
      Batch approve button
      Threshold indicator per content item
      Rejection reason dropdown
      Inline editing of question text and options
  ✓ Full quiz taking interface (student):
      Intro screen
      Question display with randomized options
      Navigation between questions
      Auto-save to localStorage
      Review screen before submit
      Confirmation dialog
      Results screen with per-question breakdown
  ✓ Quiz history page for student
  ✓ Quiz analytics page for mentor
```

## 7.2 Week 4 Day-by-Day

### Monday — Quiz Review Backend (F05)

**Tech Lead:**

- Implement QuizReviewService:
  - `getReviewQueue()` with content grouping
  - `approveQuiz()` with threshold check
  - `batchApprove()` in chunks of 10
  - `rejectQuiz()` with reason validation
  - `revokeApproval()` with answered-question guard
  - `editQuiz()` preserving original_question_text
  - `createManualQuestion()` auto-approved
  - `notifyStudentsQuizAvailable()` on threshold met

**Backend Dev:**

- Build quiz review controller
- Register all quiz review routes
- Write unit tests for threshold logic
- Write unit tests for approval state transitions

**Frontend Dev 2:**

- Build mentor quiz review queue page
- Build question card component:
  - Question text display
  - Options display with correct highlighted
  - Cognitive level and difficulty badges
  - Approve / Edit / Reject buttons

---

### Tuesday — Quiz Review Frontend (F05)

**Tech Lead:**

- Wire threshold notifications to student batch members
- Code review: quiz review PR

**Backend Dev:**

- Integration tests for quiz review flow
- Test batch-approve with 50 questions

**Frontend Dev 1:**

- Build quiz taking intro screen
- Build QuizQuestion component with option selection

**Frontend Dev 2:**

- Build inline question editing in review UI
- Build rejection reason modal
- Build batch approve UI
- Build threshold progress indicator per content item

---

### Wednesday — Quiz Taking Backend (F07)

**Tech Lead:**

- Implement QuizTakingService:
  - `getQuizStatus()` checking availability + completion
  - `getAvailableQuizzes()` with `shuffleWithSeed()`
  - `submitQuiz()` with display_order → canonical mapping
  - Idempotency check on attempt_id
  - `getQuizHistory()` with summary stats
  - Transaction for atomic quiz_responses + quiz_attempts

**Backend Dev:**

- Build quiz taking controller
- Register all quiz taking routes
- Write unit tests for shuffleWithSeed (determinism + uniqueness)
- Write unit tests for display → canonical index mapping
- Write unit tests for submission idempotency

**Frontend Dev 1:**

- Build QuizNavigator component
- Build QuizReviewScreen (pre-submit review)
- Implement localStorage auto-save in useQuizSession hook

**Frontend Dev 2:**

- Build quiz analytics page for mentor
- (Batch quiz performance table, score distribution)

---

### Thursday — Quiz Taking Frontend (F07)

**Tech Lead:**

- Code review all Week 4 PRs
- End-to-end test: upload → transcribe → generate →
  mentor approves → student takes quiz → score shows

**Backend Dev:**

- Integration tests for quiz submission
- Test that metrics queue job is added after submission
- Verify quiz history endpoint pagination

**Frontend Dev 1:**

- Build QuizResultsScreen with per-question breakdown
- Build quiz history list page
- localStorage cleanup on successful submission
- localStorage expiry check on quiz start

**Frontend Dev 2:**

- Polish review queue: keyboard shortcuts (A=approve, R=reject)
- Add empty states and loading states to all quiz pages

---

### Friday — Week 4 Integration Checkpoint

**Demo flow:**

1. Mentor opens review queue → sees pending questions
2. Mentor edits one question, approves it
3. Mentor batch-approves remaining questions
4. Threshold indicator shows ≥5 approved
5. Student receives QUIZ_AVAILABLE notification
6. Student clicks notification → opens quiz
7. Student answers all questions → submits
8. Results screen shows score and per-question breakdown
9. Mentor views batch quiz analytics

**Week 4 go/no-go criteria:**

```
✓ Approve/reject changes generation_status correctly
✓ Threshold logic triggers student notification at exactly 5
✓ Student sees questions in different order from another student
  (verify with two different student accounts)
✓ Same attempt_id submitted twice returns same result
✓ Correct answers detected correctly (canonical mapping works)
✓ Quiz history shows completed attempts
✓ metricsQueue job is created after quiz submission
✓ localStorage restores mid-quiz state after page refresh
```

---

# 8. Week 5 — Live Streaming

**Theme:** Mux integration for real-time live sessions.
This is the second high-risk week — external API integration
with Mux can have account setup delays. Ensure Mux account
is created and API keys are obtained by Monday morning.

## 8.1 Prerequisites Before Week 5 Starts

```
□ Mux account created at dashboard.mux.com
□ Live streaming enabled on Mux account (may require support)
□ MUX_TOKEN_ID and MUX_TOKEN_SECRET in backend .env
□ Mux webhook URL configured pointing to staging server
  (or ngrok tunnel for local dev testing)
□ OBS Studio installed on mentor's test machine
  for end-to-end streaming test
```

## 8.2 Week 5 Goals

```
By end of Friday Week 5:

Backend:
  ✓ F06 Live Sessions complete:
      POST /api/live-sessions
      GET  /api/batches/:batchId/live-sessions
      GET  /api/live-sessions/:sessionId
      PUT  /api/live-sessions/:sessionId
      POST /api/live-sessions/:sessionId/cancel
      POST /api/live-sessions/:sessionId/start
      POST /api/live-sessions/:sessionId/end
      POST /api/live-sessions/:sessionId/join
      POST /api/live-sessions/:sessionId/leave
      POST /api/live-sessions/:sessionId/heartbeat
      GET  /api/live-sessions/:sessionId/attendance
      PATCH /api/live-sessions/:sessionId/recording-progress
  ✓ Mux createStream(), stopStream(), getRecordingUrl()
  ✓ FETCH_RECORDING Bull worker (retries up to 6x every 5 min)
  ✓ SEND_SESSION_REMINDER Bull job (delayed, 30 min before)
  ✓ Missed session cron job (marks SCHEDULED → MISSED)
  ✓ SESSION_STARTED Socket.io event to student batch rooms
  ✓ SESSION_ENDED Socket.io event
  ✓ All session lifecycle notifications wired up
  ✓ Post-session quiz generation trigger (reuses F04 worker)

Frontend:
  ✓ Session list page (mentor + student views)
  ✓ Schedule session form
  ✓ MentorStreamingInterface (stream key display, start/end)
  ✓ StudentSessionViewer (join button, video player, leave)
  ✓ CountdownTimer component
  ✓ useHeartbeat hook (30-second ping while watching)
  ✓ Attendance report page for mentor
  ✓ SESSION_STARTED toast notification for students
  ✓ Recording available notification → recording playback
```

## 8.3 Week 5 Day-by-Day

### Monday — Mux Integration

**Tech Lead:**

- Implement `streamingProvider.utils.ts`:
  - `createLiveStream()` calling Mux API
  - `stopStream()` calling Mux complete endpoint
  - `getRecordingUrl()` polling Mux for asset
- Test all three functions with real Mux sandbox
- Document stream key and playback URL format

**Backend Dev:**

- Implement LiveSessionService:
  - `scheduleSession()` with time conflict check
  - `startStream()` with 15-minute window validation
  - `endStream()` with attendance cleanup
  - `joinSession()` with enrollment verification
  - `leaveSession()` with duration calculation
- Build FETCH_RECORDING worker

**Frontend Dev 1:**

- Build StudentSessionViewer:
  - Join button (only visible when status = LIVE)
  - HLS video player (use video.js or native HTML5 video)
  - Leave button
- Build useHeartbeat hook

**Frontend Dev 2:**

- Build session list page (cards for upcoming + past)
- Build SessionCard component with all status states
- Build CountdownTimer component

---

### Tuesday — Session Lifecycle and Socket Events

**Tech Lead:**

- Wire Socket.io events to session lifecycle:
  - `emitToSession()` on start, end
  - SESSION_STARTED event with playback_url
  - SESSION_ENDED event
- Implement session room management in Socket.io

**Backend Dev:**

- Build live session controller and routes
- Register all session routes
- Write unit tests for session status transitions
- Wire notification service to all session events

**Frontend Dev 1:**

- Wire SESSION_STARTED Socket.io event to NotificationContext
- Show toast when session goes live
- Auto-populate session player with playback_url

**Frontend Dev 2:**

- Build schedule session form
- Build session detail page (mentor view)
- Build MentorStreamingInterface with RTMP instructions

---

### Wednesday — Attendance and Recording

**Tech Lead:**

- Implement attendance cleanup on session end:
  - Close all ATTENDING records with ended_at as left_at
- Implement SEND_SESSION_REMINDER delayed job
- Test recording fetch with real completed Mux stream

**Backend Dev:**

- Build attendance report endpoint
- Build recording progress endpoint
- Write integration tests for join/leave flow
- Test heartbeat disconnection handling

**Frontend Dev 1:**

- Build recording playback (same video player, different URL)
- Recording watch progress update (mirrors content progress)
- ATTENDED_RECORDING status update at 70% watch

**Frontend Dev 2:**

- Build attendance report page for mentor
  (table with join time, leave time, duration per student)

---

### Thursday — Post-Session Quiz Trigger and Polish

**Tech Lead:**

- Wire post-session GENERATE_QUIZZES job for linked content
- Test full lifecycle: schedule → start → stream via OBS → end
  → recording appears → quiz generation triggers
- Code review all Week 5 PRs

**Backend Dev:**

- Missed session cron job implementation and testing
- Integration test for full session lifecycle

**Frontend Dev 1 & 2:**

- Polish all session pages
- Empty states for no sessions
- Mobile-responsive session card layout

---

### Friday — Week 5 Integration Checkpoint

**Demo flow (requires OBS on mentor machine):**

1. Mentor schedules a session
2. Students receive SESSION_SCHEDULED notification
3. 15 minutes before: Start Stream button activates
4. Mentor clicks Start Stream → stream key appears
5. Mentor opens OBS, enters RTMP URL and stream key, goes live
6. Students receive SESSION_STARTED toast
7. Student clicks Join → video player loads and shows stream
8. Mentor ends session
9. Recording processes → students notified
10. Mentor views attendance report

**Alternative demo if OBS unavailable:**
Use Mux's built-in stream simulator to test without OBS.

**Week 5 go/no-go criteria:**

```
✓ Mux createStream() returns stream_key and playback_url
✓ Students in batch receive SESSION_STARTED Socket.io event
✓ join() creates attendance record with joined_at
✓ leave() calculates correct duration_seconds
✓ endStream() closes all ATTENDING records
✓ FETCH_RECORDING job runs and stores recording_url
✓ Attendance report shows all students with correct status
✓ MISSED status applies to sessions not started within 30 min
```

---

# 9. Week 6 — Metrics Engine

**Theme:** The calculation engine that transforms all the
data collected so far into the nine learning dimension scores.
This is a backend-only week — no user-facing features.

## 9.1 Week 6 Goals

```
By end of Friday Week 6:

Backend:
  ✓ All 9 dimension algorithms implemented and tested:
      calculateLearningVelocity()   (linear regression)
      calculateContentEngagement()  (completion + depth + rewatch)
      calculateProblemSolving()     (time-to-answer analysis)
      calculateKnowledgeRetention() (retention ratio vs baseline)
      calculateConsistency()        (multi-source activity rate)
      calculateCuriosity()          (supplementary + rewatch)
      calculateCommunication()      (Phase One baseline: 50)
      calculateErrorRecovery()      (recovery signal detection)
      calculateConceptualDepth()    (recall vs application gap)
      calculateOverallScore()       (weighted combination)
  ✓ MetricsEngineService.calculateStudentMetrics() complete
  ✓ Nightly batch calculation job (2:00 AM cron)
  ✓ On-demand worker for RECALCULATE_STUDENT_METRICS
  ✓ Alert generation job (2:30 AM cron):
      INACTIVE alert (3+ days no login)
      SCORE_DROP alert (15+ point drop)
      STRUGGLING alert (3 quizzes < 50%)
  ✓ student_progress UPSERT working correctly
  ✓ metrics_calculation_logs populated for every run
  ✓ Admin endpoint: POST /api/admin/batches/:id/recalculate-metrics
  ✓ Admin endpoint: GET /api/batches/:id/metrics-log

Frontend:
  ✓ No new frontend this week
  ✓ Frontend Dev 1 + 2 use this week to:
      - Implement all dashboard components (Week 7 will integrate them)
      - Build RadarChart SVG component
      - Build DimensionCard, DimensionTrendChart
      - Build InsightCard
      - Build StudentProgressTable
      - Build StudentAlertBanner
      (All built but not wired to real data yet)
```

## 9.2 Week 6 Day-by-Day

### Monday — Algorithm Implementation (Part 1)

**Tech Lead:**

- Implement in `utils/algorithms/`:
  - `learningVelocity.ts` — linear regression on weekly scores
  - `contentEngagement.ts` — completion/depth/rewatch
  - `problemSolving.ts` — time-to-answer distribution

**Backend Dev:**

- Write unit tests for all three algorithms
- Test with edge cases:
  - Student with zero quiz attempts
  - Student with only one week of data
  - Student with all perfect scores
  - Student with all zero scores

**Frontend Dev 1:**

- Build RadarChart SVG component
- Test with hardcoded scores for all 9 dimensions
- Verify polygon renders correctly for all-high,
  all-low, and mixed profiles

**Frontend Dev 2:**

- Build DimensionCard with score, trend indicator, color
- Build DimensionTrendChart SVG line chart
- Test both with hardcoded data

---

### Tuesday — Algorithm Implementation (Part 2)

**Tech Lead:**

- Implement:
  - `knowledgeRetention.ts` — retention ratio vs quick scores
  - `consistency.ts` — weekly activity rate
  - `curiosity.ts` — supplementary + rewatch rates

**Backend Dev:**

- Write unit tests for all three algorithms
- Test knowledge retention with no baseline scores
- Test consistency at week 1 (insufficient data)

**Frontend Dev 1:**

- Build InsightCard (STRENGTH / GROWTH_AREA styles)
- Build QuizScoreHistory mini chart
- Build ContentEngagementSummary

**Frontend Dev 2:**

- Build StudentProgressTable with all columns
- Build sort functionality (by any dimension)
- Build search/filter controls

---

### Wednesday — Algorithm Implementation (Part 3) + Engine

**Tech Lead:**

- Implement:
  - `errorRecovery.ts` — recovery signal detection
  - `conceptualDepth.ts` — cognitive level gap analysis
  - `overallScore.ts` — weighted combination
- Implement MetricsEngineService.calculateStudentMetrics()
  pulling all data sources in parallel Promise.all

**Backend Dev:**

- Write unit tests for error recovery
- Write unit tests for conceptual depth
- Write unit tests for overall score weighting
- Verify UPSERT works correctly for existing records

**Frontend Dev 1:**

- Build AttendanceSummary component
- Build full student dashboard page layout
  (assembles all components, hardcoded data for now)

**Frontend Dev 2:**

- Build StudentAlertBanner
- Build mentor batch dashboard page layout
  (assembles table + alert banner, hardcoded data)

---

### Thursday — Nightly Job and Alert Generation

**Tech Lead:**

- Implement `runNightlyMetricsJob()`:
  - Iterate all active batches
  - Iterate all enrolled students
  - Call calculateStudentMetrics() per student
  - Per-student error isolation
  - Log to metrics_calculation_logs
- Register nightly cron at 2:00 AM
- Implement `runAlertGenerationJob()`:
  - Check INACTIVE (3+ days)
  - Check SCORE_DROP (15+ points)
  - Check STRUGGLING (3 quizzes < 50%)
  - createAlertIfNotExists() deduplication
- Register alert cron at 2:30 AM

**Backend Dev:**

- Implement on-demand RECALCULATE_STUDENT_METRICS worker
- Build admin metrics log endpoint
- Integration test: run nightly job manually with dev data
- Verify student_progress records created correctly

**Frontend Dev 1 & 2:**

- Polish all dashboard components
- Add loading skeletons
- Add empty states ("Not enough data yet")

---

### Friday — Week 6 Integration Checkpoint

**Manual test procedure:**

1. Run nightly job manually: `npm run job:metrics`
2. Check student_progress table has records
3. Check metrics_calculation_logs shows completed run
4. Check algorithm outputs are in 0-100 range
5. Manually set a student's last_login_at to 4 days ago
6. Run alert job: `npm run job:alerts`
7. Check student_alerts table has INACTIVE record

**Week 6 go/no-go criteria:**

```
✓ All 9 algorithm functions return values in 0-100 range
✓ Algorithm unit tests pass for all edge cases
✓ Nightly job runs without errors for dev batch
✓ student_progress records created with correct week_number
✓ UPSERT works: running job twice gives same result
✓ On-demand worker processes RECALCULATE_STUDENT_METRICS job
✓ INACTIVE alert created for inactive student
✓ SCORE_DROP alert created for significant drop
✓ No alert created if alert already exists for same day
✓ Dashboard components render correctly with hardcoded data
```

---

# 10. Week 7 — Dashboard and Notifications

**Theme:** Wire everything together. The metrics scores from
Week 6 now appear in the dashboard. Students see their radar
chart and insights. Mentors see the batch progress table and
alerts. The notification system is fully operational.

## 10.1 Week 7 Goals

```
By end of Friday Week 7:

Backend:
  ✓ F08 Dashboard complete:
      GET /api/students/me/dashboard
      GET /api/students/me/progress/history
      GET /api/students/:studentId/dashboard
      GET /api/students/:studentId/dimensions/:dimension
      GET /api/batches/:batchId/students/progress
      GET /api/batches/:batchId/alerts
      POST /api/batches/:batchId/alerts/:alertId/resolve
  ✓ DashboardService with insight generation
  ✓ All 18 insight messages (9 strengths + 9 growth areas)
  ✓ PROGRESS_UPDATED notification to students after metrics run

Frontend:
  ✓ Student dashboard fully wired to real API data:
      Radar chart with current + previous week scores
      9 DimensionCards with trend indicators
      Plain language insights
      Week-by-week trend charts for each dimension
      Recent quiz history
      Content engagement summary
      Session attendance summary
  ✓ Mentor batch dashboard fully wired:
      Alert banner with resolve button
      Student progress table sortable by all dimensions
      Search and filter by name/alert status
      Click student row → navigate to student dashboard
  ✓ Dimension detail modal (click radar axis → detail)
  ✓ All notifications operational end-to-end:
      All 18 notification types sending correctly
      Toast appears for real-time events
      Bell count correct
      Mark as read works
      Full notification history page

⚠️  Feature freeze at end of Week 7 Friday.
    No new features after this point.
```

## 10.2 Week 7 Day-by-Day

### Monday — Dashboard Backend (F08)

**Tech Lead:**

- Implement DashboardService:
  - `getStudentDashboard()` — aggregates all data sources
  - `getContentEngagementStats()`
  - `getAttendanceStats()`
  - `generateInsights()` with all 18 messages

**Backend Dev:**

- Implement `getBatchStudentsProgress()` with sort/filter
- Build all dashboard controller methods
- Register all dashboard routes
- Wire PROGRESS_UPDATED notification to nightly metrics job

**Frontend Dev 1:**

- Wire student dashboard page to real API
- Replace all hardcoded data with API calls
- Add loading state while data fetches

**Frontend Dev 2:**

- Wire mentor batch dashboard to real API
- Wire alert banner to real alerts API
- Wire resolve button to resolve endpoint

---

### Tuesday — Dashboard Integration

**Tech Lead:**

- Implement dimension detail endpoint
  (GET /api/students/:id/dimensions/:dimension)
- Code review dashboard PRs

**Backend Dev:**

- Write integration tests for dashboard data aggregation
- Test with a student who has complete data
  (quiz attempts, content access, attendance)

**Frontend Dev 1:**

- Build DimensionDetailModal
  (click any radar axis → shows history + improvement tip)
- Verify radar chart renders correctly with real data

**Frontend Dev 2:**

- Student table click-through to student dashboard
- Batch summary cards at top of mentor dashboard
  (total students, avg score, flagged count)

---

### Wednesday — Final Notification Wiring

**Tech Lead + Backend Dev:**

- Audit all features for missing notifications:
  - F02: BATCH_STARTED when batch becomes ACTIVE ✓
  - F03: CONTENT_PUBLISHED to students ✓
  - F04: QUIZZES_READY_FOR_REVIEW to mentors ✓
  - F05: QUIZ_AVAILABLE to students ✓
  - F06: SESSION_SCHEDULED, SESSION_REMINDER,
    SESSION_STARTED, SESSION_ENDED,
    RECORDING_AVAILABLE ✓
  - F08: STUDENT_ALERTS to mentors ✓
  - F09: PROGRESS_UPDATED to students ✓
- Fix any missing notification sends

**Frontend Dev 1:**

- Notification inbox full page
- Filter by notification type
- Clear all read button

**Frontend Dev 2:**

- Verify all 18 notification types appear with correct
  icon and color in NotificationItem
- Test notification flow for all major events

---

### Thursday — Polish, Edge Cases, and Feature Freeze Prep

**All developers:**

- Walk through every user flow as each role:

  **As Admin:**

  - Create batch → assign mentor → enroll students
  - View all batches and users
  - Trigger manual metrics recalculation

  **As Mentor:**

  - Upload video → watch pipeline run → review quizzes
  - Approve/reject/edit questions
  - Schedule and host a live session
  - View batch progress dashboard and alerts
  - Resolve an alert

  **As Student:**

  - View content library → watch a video
  - Take a quiz → see results
  - View progress dashboard → interact with radar chart
  - Join a live session
  - See notifications in bell
- Log all bugs found as GitHub issues tagged `week-8-fix`
- Prioritize: P1 = blocks core flow, P2 = poor UX, P3 = cosmetic

---

### Friday — Feature Freeze and Week 7 Checkpoint

**Morning:** Final feature merges to main.
**After 12:00 PM Friday:** Feature freeze. No new features.
Only P1 and P2 bug fixes from this point forward.

**Demo: Full end-to-end platform walkthrough**
Walk through the complete student learning journey from
enrollment to dashboard — everything works end-to-end
with real data, no hardcoded values, no mock endpoints.

**Week 7 go/no-go criteria:**

```
✓ Student dashboard shows real scores from student_progress table
✓ Radar chart renders correctly for all tested profiles
✓ Insights generate correctly (at least 2 per student)
✓ Mentor batch table shows all students with correct scores
✓ Alert banner shows and resolves correctly
✓ All 18 notification types send and display correctly
✓ Socket.io real-time delivery works for session events
✓ FEATURE FREEZE enforced — no new code after Friday noon
```

---

# 11. Week 8 — Integration and Hardening

**Theme:** No new features. This week is entirely dedicated
to finding and fixing bugs, improving performance, securing
the application, and preparing for the beta launch.

## 11.1 Week 8 Goals

```
By end of Friday Week 8:

Quality:
  ✓ All P1 bugs fixed
  ✓ All P2 bugs fixed or explicitly deferred to post-beta
  ✓ Test suite coverage ≥ 70% for all service files
  ✓ No TypeScript errors (npm run build succeeds cleanly)
  ✓ No ESLint errors

Performance:
  ✓ Dashboard load time < 2 seconds on local dev
  ✓ API response times < 200ms for all non-AI endpoints
  ✓ Quiz submission returns in < 500ms
  ✓ Nightly metrics job completes in < 5 minutes for 50 students

Security:
  ✓ All endpoints return 401 without auth cookie
  ✓ Students cannot access other students' data
  ✓ Mentors cannot access batches they are not assigned to
  ✓ Stream key never returned to student endpoints
  ✓ No sensitive data in error messages

Infrastructure:
  ✓ Staging environment deployed and tested
  ✓ Environment variables verified in staging
  ✓ Database migrations run cleanly on staging
  ✓ Seed data loads correctly in staging
  ✓ All background jobs run correctly in staging
  ✓ SSL certificate installed
  ✓ Monitoring/logging verified (Winston logs to file)

Documentation:
  ✓ All feature documents updated for any changes made
    during development that deviated from the plan
  ✓ Environment setup guide verified end-to-end
    by a fresh team member who was not involved in setup
```

## 11.2 Week 8 Day-by-Day

### Monday — Bug Triage and P1 Fixes

**All developers:**

- Review all `week-8-fix` GitHub issues
- Classify each: P1 / P2 / P3
- Assign P1 bugs to developers
- Begin P1 fixes immediately

**Focus areas for bug hunting:**

- Authentication edge cases (expired token during quiz submission)
- Quiz submission race conditions (double-click submit)
- Video player resume position accuracy
- Socket.io reconnection after network drop
- Attendance record when student closes browser during session

---

### Tuesday — P1 Fixes Continue + Test Coverage

**Tech Lead:**

- Audit test coverage: `npm test -- --coverage`
- Identify service files under 70% coverage
- Write missing tests for critical paths

**Backend Dev:**

- P1 bug fixes
- Write integration tests for any flows lacking them

**Frontend Dev 1:**

- P1 bug fixes on student-facing pages
- Add missing loading states and error boundaries

**Frontend Dev 2:**

- P1 bug fixes on mentor-facing pages
- Add missing empty states

---

### Wednesday — P2 Fixes + Performance

**All developers:**

- P2 bug fixes
- Performance audit:

```bash
  # Backend: check slow endpoints
  # Add timing logs temporarily
  console.time("getStudentDashboard");
  // ... query
  console.timeEnd("getStudentDashboard");

  # Frontend: Chrome DevTools Performance tab
  # Check dashboard load time
  # Check bundle size: npm run build → check output sizes
```

- Common performance improvements to check:
  - Dashboard over-fetching (parallel queries instead of serial)
  - Missing database indexes for frequent queries
  - N+1 query issues in student progress table
  - Frontend re-rendering unnecessarily (useMemo, useCallback)

---

### Thursday — Security Audit + Staging Deploy

**Tech Lead:**

- Security review checklist:

```bash
  # Test each role cannot access restricted endpoints
  # Log in as student1, try to GET another student's dashboard
  curl -b student1_cookie http://localhost:3001/api/students/student2-uuid/dashboard
  # Expected: 403 PERMISSION_DENIED

  # Try to approve a quiz as a student
  curl -b student1_cookie -X POST \
    http://localhost:3001/api/quizzes/quiz-uuid/approve
  # Expected: 403

  # Try to start a session as a student
  curl -b student1_cookie -X POST \
    http://localhost:3001/api/live-sessions/session-uuid/start
  # Expected: 403
```

- Fix any authorization holes found

**Backend Dev:**

- Deploy to staging environment
- Run migrations on staging
- Run seed on staging
- Verify all environment variables are set correctly

**Frontend Dev 1 + 2:**

- Test staging environment end-to-end
- Report any staging-specific issues

---

### Friday — Week 8 Checkpoint and Go-Live Decision

**Morning: Final integration test on staging**

Run the complete manual test script covering every major flow.
Document results in a test report. Every P1 issue must be
fixed before proceeding to Week 9.

**Afternoon: Go-live decision meeting**

The team reviews the test report together. For each open issue:

- P1: Must fix before go-live. If any P1 remains open,
  push go-live by one week.
- P2: Fix if time allows. Document as known issues for
  beta users.
- P3: Deferred to post-beta. Document in backlog.

**Week 8 go/no-go criteria:**

```
✓ Zero P1 bugs open
✓ Staging environment fully functional
✓ All migrations run cleanly on staging
✓ Test suite passes on staging
✓ Security audit checklist complete
✓ Team agrees platform is ready for real student users
```

---

# 12. Week 9 — Beta Launch

**Theme:** Onboard the pilot cohort and go live. This is
not a development week — it is an operations week.

## 12.1 Week 9 Goals

```
Day 1 (Monday):
  ✓ Production environment deployed (if separate from staging)
  ✓ Production database migrated
  ✓ Admin accounts created for platform admins
  ✓ Mentor accounts created
  ✓ Pilot batch created with correct dates

Day 2 (Tuesday):
  ✓ Student accounts created (20-50 students)
  ✓ Students enrolled in batch
  ✓ Welcome email sent to all participants (manual for now)
    with login credentials and getting started instructions

Day 3-5 (Wednesday-Friday):
  ✓ First content uploaded by mentor
  ✓ First quiz generation reviewed and approved
  ✓ First live session scheduled and conducted
  ✓ All students have logged in at least once

Monitoring:
  ✓ Check server logs daily for errors
  ✓ Check queue health daily
  ✓ Address any student-reported issues same day
  ✓ Document all issues encountered during beta
```

## 12.2 Beta Success Criteria

After 2 weeks of beta operation:

```
Engagement:
  - ≥ 80% of students have logged in
  - ≥ 60% of students have completed at least one quiz
  - ≥ 70% of sessions attended live

Quality:
  - Zero critical bugs (data loss, auth failure, crash)
  - < 5 medium bugs reported per week
  - AI quiz approval rate ≥ 70%

Performance:
  - Platform uptime ≥ 99%
  - No user-reported page load issues
```

---

# 13. Daily Standup Template

Use this template every morning at standup. Keep it under
15 minutes total. Do not use standup to problem-solve —
surface blockers and solve them after standup in pairs.

```
For each developer:

1. YESTERDAY
   "Yesterday I completed: [specific task]"
   Be specific — "worked on F07" is not useful,
   "completed the quiz submission service and unit tests" is.

2. TODAY
   "Today I will complete: [specific task]"
   One or two items that will actually be done by end of day.
   Not a wish list.

3. BLOCKERS
   "I am blocked on: [specific blocker]"
   OR "No blockers."
   If blocked: who is the right person to resolve it?
   Resolve immediately after standup.

4. WEEKLY MILESTONE STATUS
   Tech Lead gives 30-second assessment:
   - On track / At risk / Behind
   - If at risk: what is being cut or accelerated?
```

---

# 14. Integration Checkpoints

Every Friday afternoon, the team runs through the integration
checkpoint for that week. This is not optional — it is how
the team finds integration issues before they compound.

## 14.1 Checkpoint Procedure

```
1. All developers merge their branches to main (30 min)
   - Resolve merge conflicts together
   - Do not merge broken code

2. Run full test suite (10 min)
   cd backend && npm test
   - Fix any new failures before proceeding

3. Start the full local stack (5 min)
   - docker compose up -d postgres redis
   - ollama serve
   - npm run dev (backend)
   - npm run dev (frontend)

4. Run the week's demo script (20 min)
   - Each developer demos their week's work
   - Test the specific flows listed in that week's section

5. Log issues (10 min)
   - Any bug found → GitHub issue with label week-X-fix
   - Classify P1 / P2 / P3

6. Week assessment (5 min)
   - Did we hit all go/no-go criteria?
   - If yes: proceed to next week
   - If no: what is the recovery plan?
```

## 14.2 Major Integration Points to Watch

```
Week 2→3: Content upload must produce a transcript
  Test: Upload video → verify transcript in database

Week 3→4: Transcript must produce reviewable questions
  Test: Check quizzes table has PENDING_REVIEW rows

Week 4→5: Quiz taking must queue metrics jobs
  Test: Submit quiz → verify job in Bull queue

Week 5→6: Session attendance must feed metrics
  Test: Run metrics → verify consistency_score non-zero
        for student who attended session

Week 6→7: Metrics must appear in dashboard
  Test: student_progress has row → dashboard shows scores

Week 7→8: Everything must work together end-to-end
  Test: Complete student journey from enroll to dashboard
```

---

# 15. Risk Register

Known risks and mitigation strategies for the 8-week build.

## 15.1 High Risks

**Risk: Mux account approval delayed**

- Probability: Medium
- Impact: Week 5 blocked
- Mitigation: Create Mux account in Week 3 (not Week 5).
  Use Mux sandbox for testing. If live account is blocked,
  implement mock streaming in Week 5 and unblock when account
  is ready. The session scheduling and attendance tracking
  can be built and tested without actual streaming.

**Risk: AI quiz quality is consistently poor**

- Probability: Medium
- Impact: Core value proposition reduced
- Mitigation: Week 3 Thursday is explicitly a quality day.
  If approval rate < 50% after tuning, descope retention
  quizzes (they are supplementary) and focus on making
  Quick Assessment quality excellent. Prompt engineering
  is an iterative process — plan for 3+ iteration cycles.

**Risk: Whisper transcription is too slow without GPU**

- Probability: High if no GPU is available
- Impact: Pipeline takes 60+ minutes per video
- Mitigation: Use tiny model for development.
  Ensure production machine has GPU by Week 3.
  Students do not need instant quizzes — 1-2 hours delay
  is acceptable for beta.

**Risk: Key developer unavailable for 1+ weeks**

- Probability: Low
- Impact: 1-2 week schedule slip
- Mitigation: All code is documented. Each feature has
  an implementation guide. A replacement developer can
  onboard in one day using the Developer Onboarding Guide.
  Cross-train developers on adjacent features each week.

## 15.2 Medium Risks

**Risk: PostgreSQL migration conflicts**

- Mitigation: One developer owns schema changes at a time.
  Migration files are never edited after creation.
  Conflicts are resolved by creating new migrations.

**Risk: Socket.io real-time delivery unreliable**

- Mitigation: All notifications are persisted in the database.
  Real-time is best-effort enhancement. If Socket.io has
  issues, notification bell still works via polling.

**Risk: S3 costs exceed budget**

- Mitigation: Only videos are stored. Documents are small.
  Temp audio files are deleted after transcription.
  S3 lifecycle rule deletes temp files older than 24 hours.
  Monitor S3 usage weekly from Week 3.

## 15.3 Descope Priority

If the project falls more than one week behind schedule,
descope in this order (least impactful first):

```
1. Retention quizzes (descope to only Quick Assessment)
2. Dimension detail modal on dashboard
3. Session recording watch tracking (attendance still works)
4. Quiz analytics page for mentor
5. Admin metrics log viewer
6. Batch archive functionality
```

Never descope:

- Core quiz generation and review
- Basic student dashboard with radar chart
- Live session join/leave
- Notifications (required for all other features to feel complete)

---

# 16. Definition of Done

A feature or task is "done" when ALL of the following are true.
"Done" does not mean "the happy path works" — it means the
feature is production-ready.

## 16.1 Backend Done Criteria

```
✓ All specified endpoints return correct responses
✓ All validation rules enforced (test with bad inputs)
✓ All error codes return correct HTTP status codes
✓ All authorization checks working (test with wrong roles)
✓ Unit tests written for all service methods
✓ Edge cases handled (empty data, insufficient data)
✓ Notifications sent for all specified events
✓ No TypeScript errors (npm run build)
✓ No ESLint errors (npm run lint)
✓ Code reviewed by one other developer
✓ Merged to main branch
```

## 16.2 Frontend Done Criteria

```
✓ All specified UI states implemented:
    - Loading state
    - Empty state
    - Error state
    - Data state
✓ Calls real API endpoints (no hardcoded mock data)
✓ Auth errors redirect to login (401 handling)
✓ Mobile layout is not broken (responsive check at 375px)
✓ No console errors in browser dev tools
✓ No TypeScript errors
✓ No ESLint errors
✓ Code reviewed by one other developer
✓ Merged to main branch
```

## 16.3 Feature Done Criteria

A full feature is done when:

```
✓ All backend done criteria met
✓ All frontend done criteria met
✓ End-to-end tested manually by a developer
  who did not build it
✓ Integration checkpoint demo passed
✓ Feature implementation guide updated if
  anything changed from the specification
```

---

**End of Week-by-Week Development Milestones**

---

**Document Information**


| Field          | Value                                                    |
| -------------- | -------------------------------------------------------- |
| Document Title | M2i_LMS Week-by-Week Development Milestones              |
| Version        | 1.0                                                      |
| Status         | Ready                                                    |
| Created        | March 2026                                               |
| Last Updated   | March 2026                                               |
| Build Duration | 8 weeks + 1 week beta launch                             |
| Team Size      | 4 developers                                             |
| Maintained By  | Tech Lead / PM                                           |
| Repository     | /docs/Developer_Guides/M2i_LMS_Development_Milestones.md |
| Next Document  | M2i_LMS_Testing_And_QA_Guide.md                          |
