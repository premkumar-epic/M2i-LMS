# M2i_LMS — Features Sub-Document
### Version 1.0 | March 2026 | Sub-Document 01 of 05
### Parent Document: M2i_LMS Master Product Documentation v1.0

---

# Table of Contents

1. [Document Purpose & Scope](#1-document-purpose--scope)
2. [Feature 01 — User Authentication & Role Management](#2-feature-01--user-authentication--role-management)
3. [Feature 02 — Batch Management](#3-feature-02--batch-management)
4. [Feature 03 — Content Management System](#4-feature-03--content-management-system)
5. [Feature 04 — AI-Powered Quiz Generation](#5-feature-04--ai-powered-quiz-generation)
6. [Feature 05 — Mentor Quiz Review Interface](#6-feature-05--mentor-quiz-review-interface)
7. [Feature 06 — Live Streaming & Session Management](#7-feature-06--live-streaming--session-management)
8. [Feature 07 — Quiz Taking System](#8-feature-07--quiz-taking-system)
9. [Feature 08 — Student Progress Dashboard](#9-feature-08--student-progress-dashboard)
10. [Feature 09 — Metrics Calculation Engine](#10-feature-09--metrics-calculation-engine)
11. [Feature 10 — Notification System](#11-feature-10--notification-system)
12. [Feature Cross-Reference Matrix](#12-feature-cross-reference-matrix)

---

# 1. Document Purpose & Scope

## 1.1 Purpose

This document provides exhaustive specification for every feature included in Phase One of M2i_LMS. It is intended as the primary reference for developers, testers, and product reviewers during Phase One development. Every feature described in this document must be implemented before Phase One is considered complete.

For each feature, this document defines:
- A plain-language description of what the feature does and why it exists
- The user stories that define expected behavior from each user role's perspective
- Detailed acceptance criteria that define what "done" means for each story
- Business rules that govern edge cases and exceptional scenarios
- UI and UX requirements that define the experience across all interfaces
- Technical implementation notes that guide developers on approach and architecture
- Integration points describing how this feature connects to other features
- Known limitations that are acceptable for Phase One and planned for resolution in later phases

## 1.2 Scope

This document covers all ten features included in Phase One of M2i_LMS. Features planned for Phase Two and Phase Three are not covered here. Where a Phase One feature has known limitations that will be addressed in a future phase, those limitations are explicitly noted.

## 1.3 How to Read This Document

Each feature section is structured identically. Within each section, the user stories are grouped by user role — Student, Mentor, Admin, and Super Admin. Each user story is written in the standard format:

*As a [role], I want to [action], so that [benefit].*

Acceptance criteria are written as specific, testable conditions. A feature is considered complete when all acceptance criteria pass in a testing environment with realistic data.

Business rules define the logic that governs edge cases. These are not optional — they represent decisions that have been made about how the system should behave in ambiguous situations, and they must be implemented as specified.

---

# 2. Feature 01 — User Authentication & Role Management

## 2.1 Feature Description

User Authentication and Role Management is the security foundation of the entire M2i_LMS platform. It controls who can access the platform, what they can see, and what actions they can perform. Every other feature in the platform depends on this feature functioning correctly. A failure in authentication or authorization is not just an inconvenience — it is a security incident.

This feature covers user registration, login, logout, token management, password management, and the enforcement of role-based permissions across all platform features. Four roles exist in Phase One: Student, Mentor, Admin, and Super Admin. Each role has a clearly defined set of capabilities, and the enforcement of those capabilities is not handled at the UI level alone — it is enforced at the API level on every request.

The design principle for this feature is security by default. Every endpoint is protected unless explicitly marked as public. Every data access check verifies not only that the user is authenticated but that they have the specific permission required for the specific resource being accessed.

## 2.2 User Stories

### Student Stories

**US-AUTH-01**
As a student, I want to register for the platform using my email address and a password I choose, so that I can create a personal account and access the learning content I am enrolled in.

**US-AUTH-02**
As a student, I want to log in using my email and password, so that I can access my personalized dashboard, learning content, and progress data.

**US-AUTH-03**
As a student, I want to remain logged in across browser sessions without having to re-enter my credentials every time, so that my learning experience is not interrupted by unnecessary authentication prompts.

**US-AUTH-04**
As a student, I want to log out of the platform from any device, so that I can ensure my account is secure when using shared or public devices.

**US-AUTH-05**
As a student, I want to change my password from within my account settings, so that I can maintain the security of my account.

**US-AUTH-06**
As a student, I want my session to expire after a reasonable period of inactivity, so that my account is protected if I forget to log out.

### Mentor Stories

**US-AUTH-07**
As a mentor, I want to log in using my email and password and be taken directly to the mentor dashboard, so that I can immediately access the tools I need without unnecessary navigation.

**US-AUTH-08**
As a mentor, I want to update my profile information including my name and avatar, so that students recognize me in the platform.

### Admin Stories

**US-AUTH-09**
As an admin, I want to create user accounts for students and mentors, so that I control who has access to the platform and what role they hold.

**US-AUTH-10**
As an admin, I want to deactivate a user account without deleting it, so that I can revoke access for a student who has withdrawn or a mentor who has left, while preserving their historical data.

**US-AUTH-11**
As an admin, I want to reset a user's password and send them a reset link, so that I can help users who are locked out of their accounts.

**US-AUTH-12**
As an admin, I want to change a user's role, so that I can promote a student to mentor or adjust permissions as organizational needs change.

**US-AUTH-13**
As an admin, I want to see a list of all users with filters for role and status, so that I can quickly find and manage any user in the system.

## 2.3 Acceptance Criteria

### Registration (US-AUTH-01)

- AC-AUTH-01-1: The registration form requires email address, full name, password, and password confirmation fields. All fields are mandatory.
- AC-AUTH-01-2: The email field validates that the entered value is a properly formatted email address (contains @ and a domain). Invalid email formats display an inline error before form submission.
- AC-AUTH-01-3: The password field enforces a minimum of eight characters. Passwords shorter than eight characters display an inline error before form submission.
- AC-AUTH-01-4: The password confirmation field must match the password field exactly. A mismatch displays an inline error before form submission.
- AC-AUTH-01-5: On successful registration, the user receives a success message and is redirected to the login page.
- AC-AUTH-01-6: If the email address is already registered, the system returns an error message stating that the email is already in use, without revealing whether a password is set for that account.
- AC-AUTH-01-7: The password is never stored in plaintext. The database stores only the bcrypt hash.
- AC-AUTH-01-8: New registrations default to no role assignment. An admin must explicitly assign a role before the user can access role-specific features.

### Login (US-AUTH-02)

- AC-AUTH-02-1: The login form requires email and password. Both fields are mandatory.
- AC-AUTH-02-2: On successful login, the user is issued a JWT access token (1-hour expiration) and a refresh token (7-day expiration), both set as HttpOnly, Secure cookies.
- AC-AUTH-02-3: On successful login, the user is redirected to the dashboard appropriate for their role: students go to the student home dashboard, mentors go to the mentor dashboard, admins go to the admin dashboard.
- AC-AUTH-02-4: If the email or password is incorrect, the system returns the error message "Invalid email or password." It does not specify which field is incorrect, to prevent user enumeration.
- AC-AUTH-02-5: If an account is deactivated, the login attempt returns the message "This account has been deactivated. Please contact your administrator."
- AC-AUTH-02-6: After five consecutive failed login attempts from the same IP address within one minute, subsequent login attempts from that IP return a 429 Too Many Requests response with a message indicating the user should wait before trying again.
- AC-AUTH-02-7: After ten consecutive failed login attempts on a specific account (regardless of IP), the account is locked for 15 minutes. The user receives a message indicating the account is temporarily locked.

### Session Management (US-AUTH-03, US-AUTH-06)

- AC-AUTH-03-1: When the access token expires, the frontend automatically attempts to refresh it using the refresh token without interrupting the user's session.
- AC-AUTH-03-2: If the refresh token is valid and not expired, a new access token is issued and the user's session continues seamlessly.
- AC-AUTH-03-3: If the refresh token is expired or invalid, the user is redirected to the login page with the message "Your session has expired. Please log in again."
- AC-AUTH-06-1: If a user is inactive (no API requests) for more than 30 minutes, their next request triggers a session expiry check. If the access token has expired and cannot be refreshed, they are redirected to login.

### Logout (US-AUTH-04)

- AC-AUTH-04-1: On logout, both the access token cookie and the refresh token cookie are cleared from the browser.
- AC-AUTH-04-2: The refresh token is deleted from the database on logout, making it impossible to use even if captured.
- AC-AUTH-04-3: After logout, navigating to any protected page redirects the user to the login page.
- AC-AUTH-04-4: Logout is accessible from the navigation header on every page.

### Password Management (US-AUTH-05, US-AUTH-11)

- AC-AUTH-05-1: The change password form requires the current password, the new password, and confirmation of the new password.
- AC-AUTH-05-2: The current password must be verified before the new password is saved.
- AC-AUTH-05-3: The new password must meet the same validation requirements as registration (minimum 8 characters).
- AC-AUTH-05-4: On successful password change, all existing refresh tokens for the user are invalidated, requiring re-login.
- AC-AUTH-11-1: Admins can initiate a password reset for any user. The system generates a secure, single-use reset token with a 24-hour expiration.
- AC-AUTH-11-2: A password reset link is sent to the user's registered email address. In Phase One, if no email service is configured, the reset link is displayed directly to the admin for manual communication.

### User Management (US-AUTH-09, US-AUTH-10, US-AUTH-12, US-AUTH-13)

- AC-AUTH-09-1: Admins can create user accounts by providing full name, email address, and role. A temporary password is generated and provided to the admin for communication to the new user.
- AC-AUTH-09-2: The system prevents creation of duplicate email addresses across all user accounts.
- AC-AUTH-10-1: Deactivating a user immediately prevents them from logging in. Their historical data — quiz responses, attendance records, progress scores — is preserved in the database.
- AC-AUTH-10-2: A deactivated user who attempts to log in receives the appropriate deactivation message.
- AC-AUTH-12-1: Role changes take effect immediately. If a user is currently logged in when their role changes, their next API request after the change will reflect the new role's permissions.
- AC-AUTH-13-1: The user listing page supports filtering by role (Student, Mentor, Admin) and by status (Active, Deactivated).
- AC-AUTH-13-2: The user listing supports search by name or email address.
- AC-AUTH-13-3: The user listing is paginated with a default of 20 users per page.

## 2.4 Business Rules

**BR-AUTH-01:** Only Admins and Super Admins can create new user accounts. Self-registration creates an account with no role assigned and no access to role-specific features until an admin assigns a role.

**BR-AUTH-02:** A Super Admin cannot be deactivated by a regular Admin. Only another Super Admin can deactivate a Super Admin account.

**BR-AUTH-03:** The last Super Admin account in the system cannot be deactivated. The system must always have at least one active Super Admin.

**BR-AUTH-04:** Role changes do not affect historical data. If a student is promoted to mentor, their quiz responses and progress scores remain in the database and are accessible to admins.

**BR-AUTH-05:** Password hashing is performed on the server side. The client never sends a pre-hashed password. The raw password is only ever held in memory on the server for the duration of the hashing operation and is never logged.

**BR-AUTH-06:** JWT tokens must include the user's ID and role in their payload. All authorization checks use the role from the token, not from a database lookup, to avoid database round-trips on every request. Token invalidation is handled by the refresh token mechanism — if the refresh token is deleted, no new access tokens can be issued even if an existing access token has not yet expired.

## 2.5 UI and UX Requirements

**Login Page:**
The login page is the first thing unauthenticated users see when they navigate to the platform. It must be clean, professional, and immediately intuitive. The M2i_LMS logo or platform name must be prominently displayed. The form contains two fields — email and password — and a submit button labeled "Sign In." A "Forgot Password" link is present below the form. Error messages from failed login attempts appear inline below the form, not as modal dialogs or browser alerts. The page must be fully responsive and usable on mobile browsers.

**Registration Page:**
The registration page is accessible from the login page via a "Create Account" or "Register" link. It contains fields for full name, email, password, and password confirmation. Inline validation messages appear as users type, not only on form submission — this reduces frustration by catching errors immediately. The password field includes a show/hide toggle. A password strength indicator is shown as the user types (weak, moderate, strong) based on length and character variety.

**Account Settings:**
Accessible from the user's profile menu in the navigation header. Contains a profile section (update name and avatar) and a security section (change password). Changes save with an explicit Save button, not auto-save, to prevent accidental updates.

**Admin User Management:**
The user management interface is a data table with columns for name, email, role, status, and last login date. Each row has action buttons for Edit (change name, role, or status) and Reset Password. A Create User button is prominently placed above the table. The Create User flow is a modal dialog to avoid navigation away from the user list.

## 2.6 Technical Implementation Notes

Authentication middleware is implemented as an Express middleware function that reads the JWT from the cookie, verifies its signature and expiration, and attaches the decoded user object to the request. If the token is missing, expired, or invalid, the middleware returns 401 immediately without calling the next handler.

Role-based authorization is implemented as a separate middleware factory function that accepts an array of allowed roles and returns a middleware function. This allows any route to be protected with a concise one-liner:
```javascript
router.get('/batches', authenticate, authorize(['ADMIN', 'SUPER_ADMIN']), batchController.list);
```

The authenticate middleware runs before authorize. If authentication fails, authorize never runs.

Refresh token rotation should be considered — each time a refresh token is used to get a new access token, a new refresh token is also issued and the old one is invalidated. This limits the exposure window of any captured refresh token.

## 2.7 Integration Points

This feature is a dependency for every other feature in the platform. No other feature can be accessed without a valid authenticated session. The user's role, determined by this feature, controls what they see and can do in every other feature.

The metrics calculation engine uses the user ID to associate progress scores with the correct student. The content management system uses the mentor's user ID to associate uploaded content with the uploader. The live session system uses the mentor's user ID to associate sessions with their creator.

## 2.8 Known Limitations for Phase One

Email-based password reset is dependent on an SMTP email service being configured. If no SMTP service is available, the reset link is generated and shown to the admin for manual delivery. Full email integration is planned for Phase Two.

Multi-factor authentication is not implemented in Phase One. It is planned as an optional feature in Phase Two for admin and mentor accounts.

Social login (Google, GitHub OAuth) is not implemented in Phase One. It is planned for Phase Two to reduce friction for student onboarding.

---

# 3. Feature 02 — Batch Management

## 3.1 Feature Description

Batch Management is the organizational backbone of M2i_LMS. A batch represents a cohort of students who are going through a defined curriculum together over a specific time period. Everything in the platform — content, quizzes, live sessions, progress tracking — is organized within the context of a batch. Understanding how batches work is fundamental to understanding how the rest of the platform operates.

In Phase One, the platform supports a single active batch. The batch management system is nevertheless designed to support multiple batches from the beginning, because the data model and API must be batch-aware for Phase Two to function correctly. The UI may focus on a single batch in Phase One, but the underlying architecture treats multi-batch as a first-class concern.

## 3.2 User Stories

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

## 3.3 Acceptance Criteria

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

## 3.4 Business Rules

**BR-BATCH-01:** In Phase One, a student may only be enrolled in one batch at a time. This simplifies the student dashboard experience and avoids ambiguity in progress tracking. Multi-batch enrollment will be supported from Phase Two.

**BR-BATCH-02:** A batch must have at least one assigned mentor before content can be uploaded to it. The system prevents content upload attempts if no mentor is assigned.

**BR-BATCH-03:** Batches cannot be deleted — only archived. Deletion would destroy student progress data, which is unacceptable. Archiving preserves all data while removing the batch from active workflows.

**BR-BATCH-04:** The "current week" of a batch is calculated automatically based on the batch start date and the current date. Week 1 is the first full week after the start date. This calculation is used in the progress dashboard to display week-by-week progress in context.

**BR-BATCH-05:** If a batch's end date passes without the admin archiving it, the batch status automatically transitions to COMPLETED. COMPLETED batches remain fully accessible but are visually distinguished from ACTIVE batches.

## 3.5 UI and UX Requirements

**Admin Batch List:**
A card-based or table-based listing showing all active batches with the batch name, current enrollment count, start and end dates, current status, and a link to the batch detail page. Archived and completed batches are accessible via a tab or filter toggle. A prominently placed Create Batch button is present.

**Batch Detail Page:**
The central management hub for a batch. Contains tabs or sections for: Overview (batch metadata, current week, status), Students (enrolled students with enrollment status), Mentors (assigned mentors), Content (links to content management for this batch), Sessions (links to live sessions for this batch), and Analytics (links to batch analytics dashboard).

**Enrollment Interface:**
A searchable, scrollable list of available students. Each student is shown with their name and email. Multi-select checkboxes allow batch enrollment. A confirmation dialog summarizes how many students are being enrolled before the action is executed.

## 3.6 Technical Implementation Notes

The Enrollment table's unique constraint on (student_id, batch_id) is enforced at the database level via Prisma. The application layer should also check for existing enrollment before attempting to create a new record, to provide a clear error message rather than a database constraint violation error.

The "current week" calculation is performed as a computed value in the API response, not stored in the database. It is calculated as: Math.floor((currentDate - batch.startDate) / 7) + 1, clamped between 1 and the total duration in weeks.

## 3.7 Integration Points

Every piece of content, every live session, and every quiz is associated with a batch. The student progress dashboard filters data by batch context. The metrics calculation engine calculates scores per student per batch, allowing a student's progress in one batch to be tracked independently of any future batch enrollment.

## 3.8 Known Limitations for Phase One

Multi-batch enrollment for a single student is not supported. A student who completes one batch and joins another in a later cycle will have separate progress profiles for each batch, which is acceptable for Phase One.

Bulk enrollment via CSV import is not implemented in Phase One. Admins must enroll students individually or in batches through the multi-select UI. CSV import is planned for Phase Two.

---

# 4. Feature 03 — Content Management System

## 4.1 Feature Description

The Content Management System is the primary tool through which mentors deliver learning material to students. It handles the full lifecycle of learning content — from initial upload through organization, publication, and eventual archiving. It is also the entry point for the AI quiz generation pipeline: every piece of content that passes through the CMS is automatically transcribed and used to generate quizzes.

The design philosophy of the CMS is minimal friction for the mentor. Uploading a video should require no more effort than dragging a file into a browser and filling in a title. Everything downstream — storage, transcription, quiz generation — happens automatically. The mentor's job is to create good content and review AI-generated quizzes, not to manage technical processes.

## 4.2 User Stories

### Mentor Stories

**US-CMS-01**
As a mentor, I want to upload a video file to the platform with a title, description, and topic tags, so that students in my batch can access the learning material.

**US-CMS-02**
As a mentor, I want to see the upload progress in real time, so that I know whether my upload is succeeding and how much longer it will take.

**US-CMS-03**
As a mentor, I want to add learning objectives to my content, so that the AI quiz generation system produces quizzes that are well-aligned with what I intend students to learn.

**US-CMS-04**
As a mentor, I want to save content as a draft before publishing, so that I can prepare material in advance without making it visible to students before it is ready.

**US-CMS-05**
As a mentor, I want to publish content when it is ready, so that students can access it immediately.

**US-CMS-06**
As a mentor, I want to unpublish content if I need to make corrections, so that students do not access material that contains errors.

**US-CMS-07**
As a mentor, I want to upload supplementary materials such as PDFs and slides alongside a video, so that students have reference materials to support their learning.

**US-CMS-08**
As a mentor, I want to view and edit the auto-generated transcript for my video, so that I can correct any transcription errors before quiz generation is triggered.

**US-CMS-09**
As a mentor, I want to see the transcription and quiz generation status for each piece of content, so that I know when quizzes will be ready for review.

**US-CMS-10**
As a mentor, I want to reorder content within my batch, so that students see the material in a logical curriculum sequence.

**US-CMS-11**
As a mentor, I want to delete a piece of content that is no longer relevant, so that the content library stays clean and up to date.

### Student Stories

**US-CMS-12**
As a student, I want to see a list of all published content in my batch organized in curriculum order, so that I know what material is available and in what sequence I should study it.

**US-CMS-13**
As a student, I want to watch a video with standard playback controls including play, pause, seek, and speed adjustment, so that I can learn at my own pace.

**US-CMS-14**
As a student, I want to see my completion status for each piece of content, so that I can track which material I have finished.

**US-CMS-15**
As a student, I want to access supplementary materials associated with a video, so that I can download and study reference documents.

**US-CMS-16**
As a student, I want to resume a video from where I left off, so that I do not have to re-watch content I have already seen.

## 4.3 Acceptance Criteria

### Video Upload (US-CMS-01, US-CMS-02)

- AC-CMS-01-1: The upload interface accepts video files in MP4, MOV, and WebM formats. Files in unsupported formats display an error before upload begins.
- AC-CMS-01-2: Maximum file size per upload is 2 GB. Files larger than 2 GB display an error before upload begins.
- AC-CMS-01-3: The title field is required (maximum 150 characters). The description field is optional (maximum 1000 characters). Topic tags are optional.
- AC-CMS-01-4: Upload is performed via pre-signed S3 URL — the file is uploaded directly from the browser to S3 without passing through the application server.
- AC-CMS-02-1: A progress bar shows the current upload percentage in real time.
- AC-CMS-02-2: If the upload is interrupted (e.g., browser tab closed, network failure), the partial upload is preserved and the user can resume it on next visit.
- AC-CMS-02-3: On successful upload completion, the user sees a confirmation message and the content record is created in the database with transcription_status PENDING.
- AC-CMS-02-4: The content immediately appears in the mentor's content library in DRAFT status (not yet visible to students).

### Learning Objectives (US-CMS-03)

- AC-CMS-03-1: The content creation form includes a learning objectives text area (maximum 2000 characters).
- AC-CMS-03-2: Learning objectives are stored alongside the content record and are included in the quiz generation prompt.
- AC-CMS-03-3: If learning objectives are not provided, the quiz generation falls back to using only the transcript. The mentor is shown an informational message noting that providing learning objectives improves quiz quality.

### Draft and Publish Workflow (US-CMS-04, US-CMS-05, US-CMS-06)

- AC-CMS-04-1: All newly uploaded content defaults to DRAFT status and is not visible to students.
- AC-CMS-05-1: A mentor can publish content by clicking a Publish button on the content detail page. On publishing, is_published is set to TRUE and students can access the content immediately.
- AC-CMS-05-2: Content can only be published after it has at least a title and a stored video URL. Content with a failed transcription can still be published — transcription failure does not block content access.
- AC-CMS-06-1: Published content can be unpublished by the mentor. Unpublishing sets is_published to FALSE and removes the content from the student content library immediately.
- AC-CMS-06-2: Unpublishing content does not delete existing quiz responses. Students who have already taken quizzes for this content retain their responses and scores.

### Supplementary Materials (US-CMS-07)

- AC-CMS-07-1: Mentors can upload supplementary files (PDF, DOCX, PPTX, PNG, JPG) alongside a video or as standalone content items.
- AC-CMS-07-2: Maximum file size for supplementary materials is 50 MB.
- AC-CMS-07-3: Supplementary files are stored in S3 and linked to the parent content record.
- AC-CMS-07-4: Students can view or download supplementary files from the content detail page.

### Transcript Management (US-CMS-08, US-CMS-09)

- AC-CMS-08-1: The content detail page shows the auto-generated transcript in an editable text area once transcription is complete.
- AC-CMS-08-2: Mentors can edit the transcript directly and save changes. Changes to the transcript do not automatically trigger quiz regeneration — the mentor must explicitly click a Regenerate Quizzes button.
- AC-CMS-08-3: The quiz generation pipeline uses the most recently saved version of the transcript, including any mentor edits.
- AC-CMS-09-1: The content library displays a status indicator for each content item showing: Transcription Pending, Transcription In Progress, Transcription Complete, Transcription Failed, Quizzes Generating, Quizzes Ready for Review, or Quizzes Approved.
- AC-CMS-09-2: Transcription failure displays a clear error message and a button to retry transcription manually.

### Content Organization (US-CMS-10, US-CMS-11)

- AC-CMS-10-1: Mentors can reorder content items within a batch using a drag-and-drop interface.
- AC-CMS-10-2: The sort order is reflected immediately in the student-facing content listing.
- AC-CMS-11-1: Mentors can soft-delete content items. Deleted content is not visible to students but is preserved in the database with a deleted_at timestamp.
- AC-CMS-11-2: Deletion requires a confirmation dialog. The dialog warns that deletion will make the content inaccessible to students.
- AC-CMS-11-3: Content that has student quiz responses cannot be permanently deleted. Attempting to permanently delete such content returns an error explaining that student data depends on it.

### Student Content Experience (US-CMS-12 through US-CMS-16)

- AC-CMS-12-1: The student content library shows all published, non-deleted content for their batch in sort order.
- AC-CMS-12-2: Each content item shows the title, description, duration, topic tags, and completion status.
- AC-CMS-13-1: The video player supports play, pause, seek, volume control, fullscreen, and speed adjustment (0.5x, 0.75x, 1x, 1.25x, 1.5x, 2x).
- AC-CMS-13-2: Video playback is served via the streaming provider's CDN for performance — not directly from S3.
- AC-CMS-14-1: A content item is marked as IN PROGRESS once a student has watched at least 10 percent of the video.
- AC-CMS-14-2: A content item is marked as COMPLETED once a student has watched at least 90 percent of the video.
- AC-CMS-16-1: The video player resumes from the last watched position when a student returns to a video they previously watched. The resume position is saved every 30 seconds and on page exit.

## 4.4 Business Rules

**BR-CMS-01:** Content belongs exclusively to the batch it was created in. A mentor cannot move content from one batch to another. If the same material is needed in a new batch, it must be re-uploaded.

**BR-CMS-02:** Only mentors assigned to a batch and admins can upload content to that batch. Students cannot upload content.

**BR-CMS-03:** Transcription is triggered automatically when a new video upload is completed. It cannot be disabled. If a mentor does not want quizzes generated for a particular piece of content, they can reject all generated quiz questions in the review step.

**BR-CMS-04:** Content re-ordering does not affect student access to individual content items. Students can access any published content regardless of its position in the sort order.

**BR-CMS-05:** Video resume position is stored per student per content item. If Student A watches 30 percent of a video and Student B watches 60 percent, each resumes from their own position independently.

## 4.5 UI and UX Requirements

**Mentor Content Library:**
A list or grid view of all content in the batch. Each item shows thumbnail (auto-generated from video), title, status badge (Draft, Published, Transcribing, Quizzes Ready), duration, and upload date. Action buttons for Edit, Preview, Publish/Unpublish, and Delete are accessible per item. A prominent Upload New Content button is visible at the top.

**Upload Interface:**
A modal or dedicated page with a large drag-and-drop zone prominently labeled "Drag your video here or click to browse." Below the upload zone, form fields for title, description, topic tags, and learning objectives. The Upload button is disabled until a valid file is selected and a title is entered. A progress bar fills from left to right as the file uploads. Percentage complete and estimated time remaining are displayed.

**Content Detail Page (Mentor):**
Shows all metadata fields in editable form. A status timeline shows the current stage of the transcription and quiz generation pipeline. The transcript is shown in a full-width editable text area below the metadata. A separate section shows linked supplementary materials with upload and remove controls.

**Student Content Library:**
A clean, scroll-friendly list showing content in curriculum order. Each item has a clear title, short description, duration badge, topic tags, and a completion status indicator (grey circle for not started, half-filled for in progress, green checkmark for completed). Clicking an item opens the content viewer.

**Video Player Page:**
Full-width video player at the top. Below the player, the content title and description. Tab navigation between Overview, Supplementary Materials, and (once available) Quizzes. Resume banner at the top of the player if returning to a partially watched video: "You left off at 12:45 — Resume."

## 4.6 Technical Implementation Notes

Pre-signed URLs are generated by the backend using the AWS SDK. The pre-signed URL grants write access to a specific S3 key for a limited time window (default 15 minutes). The key is constructed as: uploads/{batchId}/{contentId}/{timestamp}-{filename}.

FFmpeg is required on the server running the transcription worker. It is used to extract the audio track from the video before passing it to Whisper. FFmpeg is available as a Docker image and as an apt package for Ubuntu.

Video playback for students is served via a CloudFront distribution pointing to the S3 bucket, not directly from S3. This improves delivery speed for geographically distributed students and reduces S3 egress costs.

The resume position is stored in a content_access_logs table (not in the nine core tables defined in the master document, but in a supplementary table). This table stores student_id, content_id, last_position_seconds, and total_watch_time_seconds. It is updated via a debounced API call every 30 seconds during video playback.

## 4.7 Integration Points

Content is the trigger for the quiz generation pipeline. Every video uploaded creates a chain of downstream processes: transcription, concept extraction, quiz generation, mentor review, student assessment.

Content is also the basis for content engagement metrics. The content_access_logs supplementary table feeds the Metrics Calculation Engine, providing data for the content engagement and curiosity learning dimensions.

## 4.8 Known Limitations for Phase One

Video transcription is only available for videos with audio tracks. Videos without audio (e.g., screen recordings with no narration) will not produce useful transcripts and will generate poor quizzes. Mentors are advised to record narrated explanations rather than silent screen recordings.

Automatic chapter detection (segmenting long videos into labeled chapters) is not implemented in Phase One. All videos are presented as a single continuous stream.

Subtitle or closed caption generation from the transcript is not implemented in Phase One. This is planned for Phase Two as an accessibility improvement.

---

# 5. Feature 04 — AI-Powered Quiz Generation

## 5.1 Feature Description

AI-Powered Quiz Generation is the most technically novel and differentiated feature of M2i_LMS in Phase One. It solves the single largest barrier to effective continuous assessment in educational settings — the mentor's time. Creating high-quality quiz questions manually for every piece of content is a time-consuming and cognitively demanding task. Most mentors either skip it entirely or produce low-quality, repetitive questions that do not genuinely test understanding.

M2i_LMS's quiz generation system eliminates this barrier entirely. After a video is uploaded and transcribed, the system automatically generates a full set of quiz questions at multiple cognitive levels, organized into two quiz types (quick assessment and retention), and queues them for mentor review. The mentor's role is reduced to quality control — approving, lightly editing, or occasionally rejecting questions — rather than creation.

This is not a cosmetic AI feature. The quiz questions generated directly feed the metrics calculation engine. Their quality determines the quality of the learning dimension scores. Poor quizzes produce misleading metrics. The prompt engineering, mentor review workflow, and continuous improvement loop are therefore not optional polish — they are critical to the platform's core value proposition.

## 5.2 User Stories

### System-Triggered Stories (Automatic Processes)

**US-QUIZ-GEN-01**
As the system, after a video has been successfully transcribed, I want to automatically trigger the quiz generation pipeline, so that quiz questions are available for mentor review without requiring any manual action.

**US-QUIZ-GEN-02**
As the system, I want to generate two types of quizzes for each piece of content — a quick assessment quiz and a retention quiz — so that both immediate comprehension and long-term retention can be measured.

**US-QUIZ-GEN-03**
As the system, I want to generate questions at multiple cognitive levels — recall, comprehension, application, and analysis — so that the quiz set tests genuine understanding rather than surface-level memorization.

### Mentor Stories

**US-QUIZ-GEN-04**
As a mentor, I want to receive a notification when quiz generation is complete for a piece of content, so that I know when to log in and review the generated questions.

**US-QUIZ-GEN-05**
As a mentor, I want to see the original transcript excerpt that each AI-generated question was based on, so that I can quickly validate whether the question accurately reflects the content.

**US-QUIZ-GEN-06**
As a mentor, I want to manually trigger quiz regeneration for a piece of content after editing the transcript, so that quizzes reflect my corrections rather than transcription errors.

**US-QUIZ-GEN-07**
As a mentor, I want to be able to create quiz questions manually for content that failed to generate acceptable questions automatically, so that students are never left without assessment material.

## 5.3 Acceptance Criteria

### Automatic Pipeline Trigger (US-QUIZ-GEN-01)

- AC-QG-01-1: Quiz generation is triggered automatically when a content record's transcription_status transitions to COMPLETE. No manual action is required.
- AC-QG-01-2: If quiz generation is triggered for a content item that already has approved quiz questions (e.g., regeneration after transcript edit), the existing approved questions are preserved and the new questions are added as additional PENDING_REVIEW items. The mentor can then choose which set to use.
- AC-QG-01-3: Quiz generation failures are logged with the full error context and the mentor is notified. The system provides a Retry button that triggers regeneration from the quiz generation stage (not from transcription, unless the transcript itself is the cause of the failure).

### Quiz Types and Volume (US-QUIZ-GEN-02)

- AC-QG-02-1: For each piece of content, the system generates a minimum of eight and a maximum of fifteen Quick Assessment quiz questions.
- AC-QG-02-2: For each piece of content, the system generates a minimum of ten and a maximum of twenty Retention quiz questions.
- AC-QG-02-3: Retention quiz questions include a mix of questions specific to the current content and questions revisiting concepts from at least one previous piece of content in the same batch (if available). The ratio is approximately 60 percent current content and 40 percent historical content.
- AC-QG-02-4: If this is the first piece of content in a batch (no previous content exists for historical questions), the Retention quiz contains 100 percent questions from the current content.

### Cognitive Level Distribution (US-QUIZ-GEN-03)

- AC-QG-03-1: The Quick Assessment quiz contains approximately 40 percent RECALL questions, 40 percent COMPREHENSION questions, and 20 percent APPLICATION questions.
- AC-QG-03-2: The Retention quiz contains approximately 20 percent RECALL questions, 40 percent COMPREHENSION questions, 30 percent APPLICATION questions, and 10 percent ANALYSIS questions.
- AC-QG-03-3: Each generated question is tagged with its cognitive level. The mentor can see and change the cognitive level designation during review.

### Transcript Source Reference (US-QUIZ-GEN-05)

- AC-QG-05-1: Each generated question is stored with a reference to the portion of the transcript it was generated from (a character offset range or a quoted excerpt).
- AC-QG-05-2: The mentor review interface displays the relevant transcript excerpt alongside each question for context.

### Manual Regeneration (US-QUIZ-GEN-06)

- AC-QG-06-1: A Regenerate Quizzes button is available on the content detail page after the transcript has been saved.
- AC-QG-06-2: Triggering regeneration adds new PENDING_REVIEW questions to the quiz queue. It does not delete previously APPROVED questions.
- AC-QG-06-3: A warning is shown to the mentor before triggering regeneration, explaining that the process will take several minutes and that existing approved questions will not be affected.

### Manual Quiz Creation (US-QUIZ-GEN-07)

- AC-QG-07-1: Mentors can create quiz questions manually via a form on the content detail page.
- AC-QG-07-2: The manual creation form requires question text, four answer options, and designation of the correct answer.
- AC-QG-07-3: Manually created questions are immediately set to APPROVED status and do not go through the review workflow.
- AC-QG-07-4: Manually created questions are marked with is_ai_generated = FALSE in the database for analytics purposes.

## 5.4 Business Rules

**BR-QG-01:** Quiz questions must have exactly four answer options — one correct answer and three distractors. Questions with fewer or more options are invalid and should not be stored. If Llama 2 generates a question with a different number of options, the worker should retry the generation for that question up to two times before logging a failure for that specific question.

**BR-QG-02:** The correct answer must not always appear in the same position (e.g., always option A). The position of the correct answer among the four options must be randomized during storage so that patterns cannot be learned by students.

**BR-QG-03:** Duplicate questions within the same quiz set are not acceptable. The generation worker must check for semantic similarity between generated questions and discard duplicates before storing.

**BR-QG-04:** Questions containing factual errors should be caught by the mentor review process. The system cannot automatically detect factual errors — this is why mentor review is mandatory.

**BR-QG-05:** Quiz generation does not block content publication. A mentor can publish a video before quiz generation is complete. Students can watch the video. Quizzes become available only after they are generated and approved.

## 5.5 Technical Implementation Notes

The quiz generation prompt is the most important piece of engineering in this feature. The quality of every generated question depends on the clarity and specificity of the prompt. The initial prompt template should include:

1. A system instruction establishing the model's role ("You are an expert educational assessment designer creating multiple-choice quiz questions for adult learners.")
2. The content transcript excerpt (limited to the relevant section, not the full transcript, to stay within context window limits)
3. The mentor's learning objectives if provided
4. The specific concept to generate a question about
5. The desired cognitive level (RECALL, COMPREHENSION, APPLICATION, or ANALYSIS) with a definition of what that level means
6. The required output format (JSON with question, options array, correct_option_index)
7. Examples of good questions at the requested cognitive level

The output format constraint (JSON) is critical. The worker parses the model's response as JSON. If the response is not valid JSON, the worker retries up to two times with an adjusted prompt before logging a failure for that question.

The concept extraction step (identifying what to ask questions about) should also be a separate Llama 2 call, not a combined call with question generation. Separating concept extraction from question generation produces better results because each call can be optimized for its specific task.

## 5.6 Integration Points

Quiz generation is downstream of content transcription and upstream of the mentor quiz review workflow. It is the link between the content management system and the student assessment system.

The cognitive level distribution of generated questions is used by the metrics calculation engine to calculate the Conceptual Depth dimension score — comparing a student's performance on RECALL questions versus APPLICATION and ANALYSIS questions.

## 5.7 Known Limitations for Phase One

The quiz generation system currently generates only multiple-choice questions. Short-answer, essay, and code completion question types are planned for Phase Two.

The Llama 2 model may occasionally generate questions with subtle factual inaccuracies, particularly for highly technical content. Mentor review is the primary safeguard against this. Over time, the pattern of mentor edits can be used to fine-tune the generation prompts.

The system does not currently generate questions from supplementary materials (PDFs, slides) — only from video transcripts. PDF and slide content extraction for quiz generation is planned for Phase Two.

---

# 6. Feature 05 — Mentor Quiz Review Interface

## 6.1 Feature Description

The Mentor Quiz Review Interface is the quality control gate between AI-generated quiz questions and student-facing assessments. It is designed to be fast, efficient, and low-friction for the mentor. A mentor should be able to review a full batch of twenty generated questions in under ten minutes, with the interface providing all the context needed to make a rapid but informed decision on each question.

This feature is closely related to Feature 04 (AI Quiz Generation) but is separated as a distinct feature because it represents a distinct user workflow — mentor review and approval — with its own UI requirements, acceptance criteria, and business rules.

## 6.2 User Stories

**US-QR-01**
As a mentor, I want to see a consolidated list of all quiz questions pending my review across all content in my batch, so that I can efficiently work through my review queue without navigating to each content item separately.

**US-QR-02**
As a mentor, I want to see all the details I need to evaluate a question — the question text, all answer options with the correct answer highlighted, the cognitive level, and the source transcript excerpt — without having to navigate to another page, so that my review workflow is fast and efficient.

**US-QR-03**
As a mentor, I want to approve a question with a single click, so that approving correct questions requires minimal effort.

**US-QR-04**
As a mentor, I want to edit a question's text, answer options, or correct answer designation before approving it, so that I can fix minor errors without having to reject and manually recreate questions.

**US-QR-05**
As a mentor, I want to reject a question that is factually incorrect, poorly worded, or irrelevant, so that it is removed from the quiz and does not reach students.

**US-QR-06**
As a mentor, I want to see a summary of my review progress — how many questions are pending, approved, and rejected — so that I know how much of my review queue remains.

**US-QR-07**
As a mentor, I want to see the overall approval rate for each content item's generated quizzes, so that I can identify content for which the AI generation quality is poor and may need prompt improvement or manual quiz creation.

## 6.3 Acceptance Criteria

### Review Queue (US-QR-01, US-QR-06)

- AC-QR-01-1: The review queue displays all PENDING_REVIEW questions across all content items in the mentor's batch, sorted by content item and then by question order within each content item.
- AC-QR-01-2: The queue can be filtered by content item, quiz type (Quick Assessment or Retention), and cognitive level.
- AC-QR-06-1: A progress summary bar at the top of the review page shows: Pending Review (N), Approved (N), Rejected (N), as counts and percentages of the total.
- AC-QR-06-2: The progress summary updates in real time as the mentor approves or rejects questions.

### Question Display (US-QR-02)

- AC-QR-02-1: Each question card displays: the question number, the content item title it belongs to, the quiz type (Quick Assessment or Retention), the cognitive level badge, the question text, all four answer options with the correct one highlighted in green, and the transcript excerpt it was generated from.
- AC-QR-02-2: The transcript excerpt is collapsible to save screen space. It is expanded by default for the first question and collapsed by default for subsequent questions to reduce visual noise.
- AC-QR-02-3: If the question was previously edited by the mentor, a "Edited" badge is shown and the original AI-generated text is accessible via an "View Original" toggle.

### Approval Action (US-QR-03)

- AC-QR-03-1: An Approve button is present on each question card. Clicking it immediately changes the question status to APPROVED, records the approving mentor's ID and timestamp, and removes the question from the pending queue view.
- AC-QR-03-2: An "Approve All" button is present at the top of the review interface that approves all currently displayed PENDING_REVIEW questions at once, after a confirmation dialog.

### Edit and Approve Action (US-QR-04)

- AC-QR-04-1: An Edit button on each question card expands an inline editing form within the card — it does not navigate away from the review queue.
- AC-QR-04-2: The editing form allows modification of the question text, any of the four answer option texts, and the designation of which option is correct.
- AC-QR-04-3: The editing form also allows changing the cognitive level.
- AC-QR-04-4: Saving edits does not automatically approve the question. A separate Approve button appears after saving, so that the mentor can review the edited version before approving.
- AC-QR-04-5: The original AI-generated question text and options are preserved in the original_generated_text column. Edits never overwrite the original — they create a new version.

### Rejection Action (US-QR-05)

- AC-QR-05-1: A Reject button is present on each question card. Clicking it opens a small dropdown or modal asking for a rejection reason: Factually Incorrect, Poorly Worded, Off Topic, Too Easy, Too Hard, or Other.
- AC-QR-05-2: Selecting a reason and confirming changes the question status to REJECTED and removes it from the pending queue.
- AC-QR-05-3: Rejection reasons are stored in the database for analytics purposes to improve quiz generation prompts over time.
- AC-QR-05-4: Rejected questions are not shown to students. They are accessible to admins and super admins for review and analytics.

### Approval Rate Analytics (US-QR-07)

- AC-QR-07-1: The content management page shows an approval rate badge for each content item that has been through the quiz generation pipeline, displaying the percentage of generated questions that were approved without editing, approved with editing, and rejected.
- AC-QR-07-2: A content item with an approval rate below 50 percent is flagged with an amber warning indicator, suggesting that manual quiz creation may be more efficient than generation for this content.

## 6.4 Business Rules

**BR-QR-01:** A quiz question must be APPROVED before it can be shown to any student. There are no exceptions to this rule in Phase One. The mentor review step cannot be bypassed.

**BR-QR-02:** A Quick Assessment quiz for a given content item becomes available to students once at least five of its questions are in APPROVED status. If fewer than five questions are approved after the mentor has reviewed all pending questions, the system notifies the mentor that manual question creation is required to reach the minimum threshold.

**BR-QR-03:** A Retention quiz becomes available to students once at least eight of its questions are in APPROVED status.

**BR-QR-04:** Questions can be re-reviewed. If a mentor approved a question and subsequently realizes it is incorrect, they can navigate to the Approved Questions section and change its status back to REJECTED. This removes it from student access immediately.

**BR-QR-05:** If a student has already answered a question that is subsequently rejected, their response data is preserved but the question is flagged as REJECTED in the quiz history. The score for that question is excluded from recalculations of the student's quiz score for that session.

## 6.5 Technical Implementation Notes

The inline edit form should use optimistic UI updates — show the edit as saved immediately while the API call is in flight, and roll back with an error message if the API call fails. This makes the review workflow feel fast even if there is network latency.

Rejection reason storage should use an ENUM or a controlled vocabulary to ensure analytics are consistent and queryable. Free-text rejection reasons are not sufficient for building a feedback loop.

The "Approve All" action should be implemented as a batch API endpoint (POST /api/quizzes/batch-approve) that accepts an array of quiz IDs, rather than firing one API call per question. This avoids performance issues when approving large batches.

---

# 7. Feature 06 — Live Streaming & Session Management

## 7.1 Feature Description

Live Streaming and Session Management enables mentors to conduct real-time interactive learning sessions with their batch. It is not merely a video call feature — it is an integrated component of the M2i_LMS curriculum structure, with session scheduling, attendance tracking, recording storage, and post-session quiz triggering built in.

The design decision to use a third-party streaming provider (Mux or Agora) rather than building a custom WebRTC implementation reflects the reality that production-quality live streaming is an extremely complex engineering problem. By delegating the hard problems of encoding, CDN delivery, and latency management to a specialized provider, the M2i_LMS team can focus on the product features that differentiate the platform.

## 7.2 User Stories

### Mentor Stories

**US-LIVE-01**
As a mentor, I want to schedule a live session with a title, date, time, and description, so that students know what to expect and when to join.

**US-LIVE-02**
As a mentor, I want to start a scheduled live session when I am ready, so that students can join my stream from within the platform.

**US-LIVE-03**
As a mentor, I want to end a live session when I am finished, so that the session is marked as complete and the recording is saved.

**US-LIVE-04**
As a mentor, I want to see who is currently in the session and who joined and left over time, so that I can track attendance.

**US-LIVE-05**
As a mentor, I want to see the attendance report for a completed session, so that I can follow up with students who were absent.

**US-LIVE-06**
As a mentor, I want the session recording to be automatically saved and accessible after the session, so that absent students can catch up by watching the recording.

### Student Stories

**US-LIVE-07**
As a student, I want to see a list of upcoming live sessions for my batch with the date, time, title, and mentor name, so that I can plan to attend.

**US-LIVE-08**
As a student, I want to join a live session by clicking a Join button, so that I can watch and participate in the mentor's live class.

**US-LIVE-09**
As a student, I want to watch a recording of a live session I missed, so that I can catch up on content I was unable to attend in real time.

**US-LIVE-10**
As a student, I want to see which sessions I have attended and which I have missed, so that I can track my own attendance record.

## 7.3 Acceptance Criteria

### Session Scheduling (US-LIVE-01)

- AC-LIVE-01-1: The session scheduling form requires title (maximum 150 characters), scheduled date and time, and batch assignment. Description is optional.
- AC-LIVE-01-2: Sessions cannot be scheduled in the past. If the selected date/time is before the current time, an inline validation error is shown.
- AC-LIVE-01-3: On successful creation, the session appears in the batch session list and students receive an in-platform notification.
- AC-LIVE-01-4: Mentors can update session details up to one hour before the scheduled start time. After that, only the description can be edited.
- AC-LIVE-01-5: Mentors can cancel a session by changing its status to CANCELLED. Students receive a notification of the cancellation.

### Session Start and End (US-LIVE-02, US-LIVE-03)

- AC-LIVE-02-1: A Start Stream button becomes active on the session detail page when the current time is within 15 minutes of the scheduled start time.
- AC-LIVE-02-2: Clicking Start Stream initiates the stream with the chosen provider (Mux or Agora) and generates a stream token. The session status changes to LIVE.
- AC-LIVE-02-3: When the session goes LIVE, enrolled students who are on the platform receive a real-time notification via Socket.io.
- AC-LIVE-03-1: An End Stream button is visible to the mentor during a live session. Clicking it stops the stream and changes the session status to COMPLETED.
- AC-LIVE-03-2: On session completion, the recording URL is retrieved from the streaming provider and stored in the LiveSessions record.
- AC-LIVE-03-3: After session completion, the quiz generation pipeline is triggered for the session content (if the session was linked to specific content items).

### Attendance Tracking (US-LIVE-04, US-LIVE-05)

- AC-LIVE-04-1: When a student clicks Join Session, a SessionAttendance record is created with the joined_at timestamp.
- AC-LIVE-04-2: When a student leaves the session (closes the tab, clicks Leave, or the session ends), the left_at timestamp is recorded and duration_seconds is calculated.
- AC-LIVE-04-3: A student who joins and leaves multiple times within a session has one SessionAttendance record — the first join time is preserved and the final leave time is recorded. Total duration accumulates across all join/leave cycles.
- AC-LIVE-05-1: The attendance report for a completed session shows: total enrolled students, students who attended (with join time, leave time, and duration), and students who did not attend.
- AC-LIVE-05-2: The attendance report is exportable as a CSV file.

### Recordings (US-LIVE-06, US-LIVE-09)

- AC-LIVE-06-1: Session recordings are automatically saved by the streaming provider. The recording URL is stored in the LiveSessions record within 30 minutes of session completion.
- AC-LIVE-06-2: Students can access recordings from the session listing page. A Recording Available badge appears on sessions that have recordings.
- AC-LIVE-09-1: The recording player has the same playback controls as the content video player — play, pause, seek, speed control.
- AC-LIVE-09-2: Recording watch progress is tracked for attendance purposes — if a student watches at least 70 percent of a session recording, their attendance status for that session is updated to ATTENDED (RECORDING).

## 7.4 Business Rules

**BR-LIVE-01:** Only one live session per batch can be LIVE simultaneously. Attempting to start a second session while one is already live returns an error.

**BR-LIVE-02:** A session that was scheduled but not started by the mentor within 30 minutes after its scheduled time is automatically marked as MISSED. Students receive a notification. The mentor can reschedule.

**BR-LIVE-03:** Attendance is only tracked for students enrolled in the batch associated with the session. Users from other batches or with other roles who somehow obtain a session link cannot have their attendance recorded.

**BR-LIVE-04:** Recordings are stored for a minimum of 90 days before they may be expired. Archiving a batch does not immediately delete its session recordings.

## 7.5 Technical Implementation Notes

The streaming provider integration requires generating a server-side token for each session to authenticate the mentor's streaming client and the students' viewing clients. This token generation logic is in the backend, not the frontend, to keep API credentials secure.

Socket.io is used to emit a session_started event to all online students in the batch when the mentor starts the stream. Students who are not currently online receive the notification on next login.

The session join and leave events must be handled robustly — including cases where the student's browser crashes or they lose network connectivity without explicitly clicking Leave. A heartbeat mechanism (periodic ping from the client every 30 seconds) combined with a session-end cleanup job (mark any attendance records without a left_at timestamp when a session is completed) handles these edge cases.

## 7.6 Known Limitations for Phase One

In-session chat or Q&A features are not implemented in Phase One. Students cannot communicate with the mentor or each other during live sessions within the platform. They may use external tools (WhatsApp, messaging apps) for this purpose. In-session interaction features are planned for Phase Two.

Breakout room functionality is not available in Phase One.

---

# 8. Feature 07 — Quiz Taking System

## 8.1 Feature Description

The Quiz Taking System is the student-facing interface for completing quizzes. It is the primary mechanism through which student knowledge is measured, and its data directly feeds the metrics calculation engine. The system must be fast, reliable, distraction-free, and technically robust — a quiz submission must never be lost.

The experience of taking a quiz must be cognitively comfortable. Students should be able to focus entirely on the questions without worrying about losing their answers or accidentally submitting before they are ready. The interface must communicate clearly what is happening at every step.

## 8.2 User Stories

**US-QUIZ-01**
As a student, I want to see a list of quizzes available for me to take, organized by content item and quiz type, so that I know exactly what assessments are available and which I have already completed.

**US-QUIZ-02**
As a student, I want to take a quiz with a clear, distraction-free interface that presents one question at a time, so that I can focus on each question without being overwhelmed.

**US-QUIZ-03**
As a student, I want to navigate between questions within a quiz before submitting, so that I can review my answers before finalizing.

**US-QUIZ-04**
As a student, I want to submit my quiz answers and immediately receive my score and feedback on which questions I answered correctly and incorrectly, so that I can learn from my mistakes immediately.

**US-QUIZ-05**
As a student, I want to see my quiz history — all quizzes I have attempted with dates, scores, and question-level detail — so that I can track my progress over time.

**US-QUIZ-06**
As a student, I want the system to save my progress automatically if I accidentally close my browser during a quiz, so that I do not lose my answers and have to start over.

## 8.3 Acceptance Criteria

### Quiz Availability (US-QUIZ-01)

- AC-QUIZ-01-1: The quiz listing page shows all quizzes associated with content in the student's batch, organized by content item.
- AC-QUIZ-01-2: Each quiz shows its type (Quick Assessment or Retention), the content item it belongs to, the number of questions, the availability window, and the student's status (Not Started, In Progress, Completed).
- AC-QUIZ-01-3: Quizzes that are not yet available (their availability date has not been reached) are shown with a "Available on [date]" indicator and cannot be started.
- AC-QUIZ-01-4: Completed quizzes show the student's score (percentage correct) and the date of completion.

### Quiz Interface (US-QUIZ-02, US-QUIZ-03)

- AC-QUIZ-02-1: The quiz starts with a brief introduction screen showing the quiz title, content it covers, number of questions, and a Start button.
- AC-QUIZ-02-2: Each question is presented on a full-screen or full-panel view with the question text prominently displayed and the four answer options shown as clearly labeled radio buttons.
- AC-QUIZ-02-3: The student's current question number and total question count are shown (e.g., "Question 3 of 10").
- AC-QUIZ-02-4: A Next button advances to the next question. The current answer selection is preserved.
- AC-QUIZ-03-1: A question navigator (small numbered buttons) is visible at the bottom or side of the quiz interface, allowing the student to jump to any specific question. Questions that have been answered show a filled indicator. Questions not yet answered show an empty indicator.
- AC-QUIZ-03-2: A Review Answers screen is shown before final submission, listing all questions with the student's selected answer. Unanswered questions are highlighted.

### Submission and Results (US-QUIZ-04)

- AC-QUIZ-04-1: A Submit Quiz button is present on the Review Answers screen. Clicking it shows a confirmation dialog: "Are you sure you want to submit? You cannot change your answers after submission."
- AC-QUIZ-04-2: On confirmation, all answers are submitted to the backend in a single API call (not one call per answer).
- AC-QUIZ-04-3: The results screen shows: overall score (percentage and count), question-by-question breakdown showing the student's answer, whether it was correct, and the correct answer for questions answered incorrectly.
- AC-QUIZ-04-4: Results are available immediately after submission — there is no delay.
- AC-QUIZ-04-5: The student cannot retake a quiz once submitted. If the mentor explicitly enables retakes for a specific quiz, the student is notified and a Retake button is available.

### Quiz History (US-QUIZ-05)

- AC-QUIZ-05-1: The quiz history page shows all quiz attempts with date, content item, quiz type, and score.
- AC-QUIZ-05-2: Students can drill down into any completed quiz to see the question-level breakdown again.
- AC-QUIZ-05-3: Score trends are visible — a simple line chart showing quiz scores over time gives students a visual of their improvement.

### Auto-Save (US-QUIZ-06)

- AC-QUIZ-06-1: Answer selections are saved to localStorage every time the student selects or changes an answer.
- AC-QUIZ-06-2: If a student closes the browser and returns to the quiz, their previously selected answers are restored from localStorage.
- AC-QUIZ-06-3: The auto-saved state is cleared on successful submission.
- AC-QUIZ-06-4: The auto-saved state expires after 24 hours. If a student returns to an in-progress quiz after 24 hours, they start fresh.

## 8.4 Business Rules

**BR-QUIZ-01:** A student can only take each quiz once. Once all questions in a quiz set have been answered and submitted, the quiz is marked COMPLETED for that student and cannot be retaken unless explicitly unlocked by the mentor.

**BR-QUIZ-02:** Time-to-answer is recorded for each question individually. The timer starts when the question is displayed and stops when the student selects an answer (not when they click Next). Students who change their answer have the timer reset to when they changed their answer.

**BR-QUIZ-03:** The order of answer options within each question is randomized for each student. This means Student A and Student B see the same questions and same options but in a different order, reducing the effectiveness of copying.

**BR-QUIZ-04:** A Quick Assessment quiz for a given content item must be completed before the Retention quiz for that content item becomes accessible. This ensures the retention measurement is genuinely testing long-term memory rather than first exposure.

**BR-QUIZ-05:** If a student submits a quiz and the API call fails, the frontend must retry the submission automatically up to three times before displaying an error to the student. The backend must be idempotent on quiz submission — submitting the same answers twice should not create duplicate QuizResponse records.

## 8.5 Technical Implementation Notes

Quiz submission must be implemented as an atomic operation. All QuizResponse records for a quiz session must be created in a single database transaction. If any insert fails, the entire transaction is rolled back and the frontend receives an error, prompting a retry.

Idempotency is implemented by checking for existing QuizResponse records for the same (student_id, quiz_id) combination before inserting. If responses already exist (indicating a duplicate submission), the existing responses are returned rather than creating duplicates.

Answer option randomization is handled on the client side for display purposes. The server always stores and references options by their index in the original Quizzes.options array. The client maps the randomized display order back to the original index when submitting.

---

# 9. Feature 08 — Student Progress Dashboard

## 9.1 Feature Description

The Student Progress Dashboard is the window through which both students and mentors understand a student's learning trajectory. It translates weeks of raw behavioral data — quiz scores, content access logs, attendance records — into a clear, human-readable narrative of who the student is and how they are developing.

The dashboard must strike a careful balance. It must be information-dense enough to be genuinely useful for mentors who need to identify struggling students quickly. But it must also be approachable and non-intimidating for students who are seeing their own metrics for the first time. Numbers alone can feel impersonal and discouraging. The dashboard should contextualize scores — explaining what each score means and what a student can do to improve.

## 9.2 User Stories

**US-DASH-01**
As a student, I want to see my current scores across all nine learning dimensions visualized in a clear chart, so that I have an immediate, holistic picture of my strengths and areas for development.

**US-DASH-02**
As a student, I want to see how my scores on each dimension have changed week over week, so that I can see whether I am improving, plateauing, or declining.

**US-DASH-03**
As a student, I want to see a plain-language interpretation of my scores, so that I can understand what my data means without needing to interpret numbers in isolation.

**US-DASH-04**
As a student, I want to see my quiz history including scores, dates, and question-level detail, so that I can review my performance on specific topics.

**US-DASH-05**
As a student, I want to see my attendance record for live sessions, so that I can see whether my attendance is impacting my consistency score.

**US-DASH-06**
As a mentor, I want to see all students in my batch in a sortable, filterable table with their current scores across all nine dimensions, so that I can quickly identify students who need attention.

**US-DASH-07**
As a mentor, I want to receive alerts for students who have been inactive for more than three consecutive days or whose scores on any dimension drop significantly, so that I can proactively reach out.

**US-DASH-08**
As a mentor, I want to drill down into any individual student's dashboard to see the same level of detail they see, so that I can understand their specific situation before providing guidance.

## 9.3 Acceptance Criteria

### Student View — Dimension Overview (US-DASH-01)

- AC-DASH-01-1: The dashboard displays all nine learning dimension scores in a radar (spider) chart format. Each dimension is on a separate axis scaled from 0 to 100.
- AC-DASH-01-2: The current week's scores are shown as a filled polygon. The previous week's scores are shown as a lighter outline polygon for comparison.
- AC-DASH-01-3: Each dimension label on the radar chart is clickable, navigating to a detailed view of that specific dimension.
- AC-DASH-01-4: If a student is new and has not yet completed enough activities for scores to be calculated, the chart shows a placeholder state with the message "Complete your first quiz to see your learning profile."

### Student View — Trend Analysis (US-DASH-02)

- AC-DASH-02-1: A trend section below the radar chart shows a line chart for each of the nine dimensions, plotting the score for each week of the batch from week 1 to the current week.
- AC-DASH-02-2: Weeks where no score could be calculated (e.g., student was absent) are shown as gaps in the line rather than as zero, to avoid misleading representations.
- AC-DASH-02-3: Trend charts are selectable — the student can view all nine on one screen or select individual dimensions to view in isolation.

### Student View — Plain Language Insights (US-DASH-03)

- AC-DASH-03-1: Below the charts, a written insights section provides three to five bullet points describing the student's most notable strengths (top two dimensions) and areas for development (lowest two dimensions), in plain, encouraging language.
- AC-DASH-03-2: Insights are generated server-side based on the student's current scores and trends, using templated language with score-based branching. AI-generated narrative insights are a Phase Two enhancement.
- AC-DASH-03-3: Insights are updated whenever scores are recalculated (at minimum weekly).

### Mentor View — Batch Overview (US-DASH-06, US-DASH-07)

- AC-DASH-06-1: The mentor batch overview shows a table with one row per enrolled student and one column per learning dimension, plus an overall score column.
- AC-DASH-06-2: The table is sortable by any column. Default sort is by overall score descending.
- AC-DASH-06-3: The table is filterable by dimension score ranges (e.g., show students with Consistency below 50).
- AC-DASH-07-1: Students who have not logged in for three or more consecutive days are flagged with a warning indicator in the table.
- AC-DASH-07-2: Students whose overall score has dropped by more than 15 points in a single week are flagged with an alert indicator.
- AC-DASH-07-3: Mentor receives an in-platform notification when a student they mentor is flagged, once per flag event.

## 9.4 Business Rules

**BR-DASH-01:** Students can only see their own dashboard. Attempting to access another student's dashboard URL redirects to the student's own dashboard with an appropriate message.

**BR-DASH-02:** Dimension scores are displayed rounded to one decimal place. Raw calculated values may have more precision but displaying more than one decimal place creates a false sense of precision in the metrics.

**BR-DASH-03:** The overall score displayed on the mentor's batch overview is a weighted average of the nine dimension scores. The weighting is: Learning Velocity (15%), Knowledge Retention (15%), Conceptual Depth (15%), Consistency (15%), Problem-Solving (10%), Content Engagement (10%), Curiosity (10%), Communication (5%), Error Recovery (5%). These weights can be adjusted by Super Admins in system settings.

---

# 10. Feature 09 — Metrics Calculation Engine

## 10.1 Feature Description

The Metrics Calculation Engine is the computational core of M2i_LMS. It is a backend system — entirely invisible to end users — that continuously processes raw platform data and translates it into the nine learning dimension scores for each student. Without this engine, all the data the platform collects is meaningless. With it, the data becomes a clear, multidimensional picture of student learning behavior.

The engine runs as a scheduled background job, processing all accumulated data for all students in active batches on a nightly basis. It can also be triggered on-demand for specific students when significant new data arrives (e.g., immediately after a quiz is submitted).

## 10.2 Calculation Algorithms

### Dimension 1 — Learning Velocity

**Input Data:** Quiz scores for Quick Assessment quizzes, organized chronologically by week.

**Algorithm:** For each student, calculate the slope of quiz score improvement over time using linear regression on the weekly Quick Assessment scores. The slope is then normalized to a 0–100 scale, where a steep positive slope maps to 100 and a flat or negative slope maps near 0. The baseline quiz score from week 1 (or the diagnostic) is factored in — a student starting from a low baseline and improving significantly scores higher than a student starting from a high baseline and improving slightly, because velocity is about rate of change, not absolute level.

**Score Range:** 0–100. Updated weekly.

### Dimension 2 — Content Engagement

**Input Data:** Content access logs (time spent, completion status, rewatch events).

**Algorithm:** For each student, calculate: (1) average completion rate across all content items (0–100%); (2) average time spent relative to expected time (videos watched at 1x speed for their full duration = 100%); (3) rewatch rate (number of content items rewatched at least once / total content items). Combine with weights: completion rate (50%), time spent (30%), rewatch rate (20%). Normalize to 0–100.

**Score Range:** 0–100. Updated daily.

### Dimension 3 — Problem-Solving Approach

**Input Data:** Time-to-answer data from QuizResponses, attempt patterns (which questions were skipped and returned to), sequence of answer changes.

**Algorithm:** Calculate an independence score from time-to-answer distributions (students who think through answers independently before selecting show longer but more consistent answer times compared to guessers who answer quickly). Calculate a revision rate (percentage of questions where the student changed their initial answer before submitting — high revision rates with score improvement indicate thoughtful review). Combine and normalize to 0–100.

**Score Range:** 0–100. Updated after each quiz completion.

### Dimension 4 — Knowledge Retention

**Input Data:** Retention quiz scores, specifically performance on questions tagged as revisiting concepts from previous weeks.

**Algorithm:** For each student, compare their score on historical-concept questions in retention quizzes (questions about content from two or more weeks prior) against their original Quick Assessment score on the same concepts. A student who scores within 10 percent of their original score on historical questions demonstrates strong retention. A student who scores significantly lower shows decay. Calculate as: mean(retention_quiz_historical_scores / original_quick_assessment_scores) capped at 1, multiplied by 100.

**Score Range:** 0–100. Updated after each Retention quiz completion. Not calculable until at least two weeks of data exist.

### Dimension 5 — Consistency and Discipline

**Input Data:** Login timestamps, content access timestamps, quiz submission timestamps, session attendance records.

**Algorithm:** For each scheduled activity in the week (content access window, quiz availability window, live session), score whether the student completed the activity within the intended window. Calculate: activities_completed_on_time / total_scheduled_activities. Apply a context adjustment: if a student has declared a schedule constraint in their profile (e.g., part-time student), adjust the expected activity windows accordingly. Normalize to 0–100.

**Score Range:** 0–100. Updated weekly.

### Dimension 6 — Curiosity and Self-Direction

**Input Data:** Content access logs (specifically access to optional/supplementary content), forum participation logs (Phase Two), additional resource access.

**Algorithm:** In Phase One, curiosity is measured by: (1) whether the student accessed supplementary materials for each content item (yes/no per item); (2) whether the student rewatched content beyond completion (voluntary re-engagement); (3) whether the student completed any optional content items that were not part of the required curriculum. Score as: (supplementary_access_rate * 50) + (rewatch_rate * 30) + (optional_content_rate * 20), normalized to 0–100.

**Score Range:** 0–100. Updated daily.

### Dimension 7 — Communication and Articulation

**Input Data:** Short-answer quiz responses (if any), forum posts (Phase Two — not available in Phase One for full scoring).

**Algorithm:** In Phase One, communication scoring is limited. It is calculated from the quality of questions submitted by students in any forum or feedback mechanism. Given the limited data in Phase One, this dimension starts with a baseline score of 50 and adjusts based on available signals. Full communication scoring will be implemented in Phase Two when forum data and peer feedback are available.

**Score Range:** 0–100. Baseline 50. Limited updates in Phase One.

### Dimension 8 — Error Recovery and Resilience

**Input Data:** Quiz scores over time, specifically performance on topics after a previous poor performance on the same topic.

**Algorithm:** Identify instances where a student scored below 50 percent on a Quick Assessment quiz. For each such instance, check their Retention quiz score on the same topic area in the following week. If the Retention score is more than 20 points higher than the Quick Assessment score, this indicates successful error recovery. Calculate: number_of_successful_recoveries / number_of_poor_performance_instances. Students with no poor performances score 75 (good, but not measurable). Students who consistently recover score 90–100. Students who do not recover score below 50.

**Score Range:** 0–100. Updated after each Retention quiz completion.

### Dimension 9 — Conceptual Depth

**Input Data:** Quiz responses categorized by cognitive level (RECALL, COMPREHENSION, APPLICATION, ANALYSIS).

**Algorithm:** Calculate average scores for RECALL questions and for APPLICATION + ANALYSIS questions separately. Conceptual depth score = min(application_score / recall_score, 1) * 100. A student who scores equally well on application as on recall has a Conceptual Depth score of 100. A student who scores 80 on recall but only 40 on application has a score of 50.

**Score Range:** 0–100. Updated after each quiz completion. Not calculable until the student has answered at least five questions of each cognitive level.

## 10.3 Scheduling and Performance

The metrics calculation engine runs as a Bull background job on a nightly schedule (default: 2:00 AM local time). The job processes all students in all active batches sequentially. For a batch of 500 students, the full calculation run should complete within 30 minutes on standard hardware.

On-demand recalculation can be triggered for a specific student via an internal API endpoint called by the quiz submission handler after a quiz is submitted. On-demand calculation updates only the dimensions affected by the new data (e.g., submitting a quiz triggers recalculation of Learning Velocity, Knowledge Retention, Conceptual Depth, Error Recovery, and Problem-Solving, but not Consistency or Curiosity).

---

# 11. Feature 10 — Notification System

## 11.1 Feature Description

The Notification System delivers real-time and persistent in-platform alerts to students and mentors, keeping them informed of relevant events without requiring them to constantly check every section of the platform. It is built on Socket.io for real-time delivery to connected users and on a database-backed notification table for persistent storage of notifications that can be read when the user next logs in.

## 11.2 Notification Events

The following events trigger notifications in Phase One:

**Student Notifications:**
- New content published in their batch (Content Available: [Title])
- Quick Assessment quiz approved and available (Quiz Ready: [Content Title])
- Retention quiz now available (Retention Quiz Available: [Content Title])
- Upcoming live session in 30 minutes (Session Starting Soon: [Title])
- Live session is now starting (Session Live Now: [Title])
- Live session recording available (Recording Available: [Title])
- Progress scores updated (Your weekly progress has been updated — view your dashboard)

**Mentor Notifications:**
- Transcription complete for uploaded content (Transcription Complete: [Content Title] — Quizzes generating)
- Quiz generation complete (Quizzes Ready for Review: [Content Title] — [N] questions pending)
- Student inactive alert (Student [Name] has not logged in for 3 days)
- Student score drop alert (Student [Name]'s overall score dropped significantly this week)

## 11.3 Acceptance Criteria

- AC-NOTIF-01: Real-time notifications are delivered via Socket.io to connected users within 2 seconds of the triggering event.
- AC-NOTIF-02: Notifications are stored in the database so that users who were not connected at the time of the event see them on next login.
- AC-NOTIF-03: The notification bell icon in the navigation header shows an unread count badge. The count decrements as notifications are read.
- AC-NOTIF-04: Clicking the notification bell opens a dropdown showing the 10 most recent notifications with timestamps and brief messages.
- AC-NOTIF-05: Clicking a notification navigates the user to the relevant page (e.g., clicking a "Quiz Ready" notification goes to the quiz page).
- AC-NOTIF-06: Notifications older than 30 days are archived and not shown in the main notification list. They are accessible via a "View All" page.

## 11.4 Known Limitations for Phase One

Email notifications are not implemented in Phase One due to the dependency on an external SMTP service. Students and mentors who are not logged in when an event occurs will see notifications on next login but will not receive an email. Email notifications are planned for Phase Two.

Push notifications for mobile browsers are not implemented in Phase One.

---

# 12. Feature Cross-Reference Matrix

The following matrix shows which features depend on or interact with each other. An X indicates that the row feature has a dependency on or interaction with the column feature.

| Feature | F01 Auth | F02 Batch | F03 CMS | F04 QuizGen | F05 Review | F06 Live | F07 QuizTake | F08 Dashboard | F09 Metrics | F10 Notify |
|---------|----------|-----------|---------|-------------|------------|----------|--------------|---------------|-------------|------------|
| F01 Auth | - | X | X | X | X | X | X | X | X | X |
| F02 Batch | X | - | X | X | X | X | X | X | X | X |
| F03 CMS | X | X | - | X | X | - | X | X | X | X |
| F04 QuizGen | X | X | X | - | X | X | - | - | X | X |
| F05 Review | X | X | X | X | - | - | X | - | X | X |
| F06 Live | X | X | - | X | - | - | - | X | X | X |
| F07 QuizTake | X | X | X | X | X | - | - | X | X | X |
| F08 Dashboard | X | X | X | - | - | X | X | - | X | - |
| F09 Metrics | X | X | X | X | - | X | X | X | - | X |
| F10 Notify | X | X | X | X | X | X | X | - | X | - |

---

**End of Features Sub-Document**
