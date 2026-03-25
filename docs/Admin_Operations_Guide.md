# M2i_LMS — Admin Operations Guide

### Version 1.0 | March 2026

### Save As: Developer_Guides/M2i_LMS_Admin_Operations_Guide.md

---

# Table of Contents

1. [Who This Guide Is For](#1-who-this-guide-is-for)
2. [Admin Dashboard Overview](#2-admin-dashboard-overview)
3. [Setting Up a New Batch](#3-setting-up-a-new-batch)
4. [Managing Users](#4-managing-users)
5. [Weekly Admin Routine](#5-weekly-admin-routine)
6. [Handling Student Issues](#6-handling-student-issues)
7. [Handling Mentor Issues](#7-handling-mentor-issues)
8. [Handling AI Pipeline Issues](#8-handling-ai-pipeline-issues)
9. [End-of-Batch Procedures](#9-end-of-batch-procedures)
10. [Data Export and Reporting](#10-data-export-and-reporting)
11. [Quick Reference](#11-quick-reference)

---

# 1. Who This Guide Is For

This guide is for the non-technical platform administrator
who manages M2i_LMS day-to-day. It does not assume any
programming knowledge. If you encounter a situation not
covered here, escalate to the tech lead rather than
attempting to fix it directly in the database.

**What admins can do through the platform UI:**

- Create and manage user accounts
- Create batches and manage enrollments
- Assign mentors to batches
- View all student and mentor activity
- Trigger manual metrics recalculation
- Resolve student alerts

**What requires developer involvement:**

- Resetting a student's quiz attempt (database change)
- Recovering data after accidental deletion
- Changing the AI model or transcription settings
- Any change that requires editing environment variables

---

# 2. Admin Dashboard Overview

When you log in as an admin, you see the admin dashboard
with four main sections:

**Users panel:** All registered users across all roles.
Shows last login time and account status.

**Batches panel:** All batches in all statuses. Clicking
a batch opens its full management page.

**System health panel:** Shows whether background jobs
are running normally. Red indicators here mean something
needs attention — contact the tech lead.

**Recent alerts panel:** Students flagged for mentor
attention across all active batches.

---

# 3. Setting Up a New Batch

Setting up a batch correctly from the start prevents most
common issues. Follow this procedure in order.

## Step 1 — Create User Accounts

Before creating the batch, all users who will participate
must have accounts. Create them first.

```
Navigate to: Admin → Users → Create User

For each mentor:
  Full Name : [Mentor's full name]
  Email     : [Work email address]
  Role      : MENTOR

For each student:
  Full Name : [Student's full name]
  Email     : [Email address — students will use this to login]
  Role      : STUDENT
```

After creating each account, share the temporary password
with the user directly. They will be prompted to change it
on first login.

## Step 2 — Create the Batch

```
Navigate to: Admin → Batches → Create Batch

Batch Name     : [Descriptive name including batch number/month]
                 Example: "Full Stack Dev Batch Jan 2026"
Description    : [Brief description of what will be taught]
Start Date     : [First day of the batch]
End Date       : [Last day of the batch]
```

**Important date rules:**

- End date must be at least 7 days after start date
- Set the start date to the actual first day of class, not earlier
- The batch activates automatically at midnight on the start date
- Once students are enrolled, the start date cannot be changed

## Step 3 — Assign Mentors

```
Navigate to: Batch → Assign Mentors
Select the mentors for this batch
Click Assign
```

A mentor must be assigned before they can upload content
or schedule sessions. You can assign multiple mentors to
one batch.

## Step 4 — Enroll Students

```
Navigate to: Batch → Enroll Students
Select students from the user list
Click Enroll
```

You will see a summary showing how many were enrolled,
how many were skipped (already enrolled), and any failures.

**Phase One rule:** Each student can only be in one active
batch at a time. If you try to enroll a student who is
already in another active batch, they will be in the
skipped list.

## Step 5 — Verify Setup

Before the batch starts, verify:

```
□ Batch status shows ACTIVE (or DRAFT if start date is future)
□ Correct number of students shown in enrollment list
□ All mentors appear in assigned mentors list
□ Students can log in and see the batch name in their dashboard
□ Mentors can see the batch in their batch list
```

---

# 4. Managing Users

## Creating Accounts in Bulk

For batches with many students, creating accounts one by one
is slow. Ask the tech lead to run the bulk import script,
which accepts a CSV file with columns:
`full_name, email, role`

## Resetting a Forgotten Password

```
Navigate to: Admin → Users → [Find User] → Reset Password

This generates a new temporary password.
The old password immediately stops working.
All the user's devices are logged out.
Share the new temporary password with the user directly.
```

## Deactivating an Account

If a student drops out or a mentor leaves:

```
Navigate to: Admin → Users → [Find User] → Edit
Set is_active to FALSE
Click Save
```

The user is immediately logged out and cannot log back in.
Their historical data (quiz scores, attendance, progress)
is preserved.

## Reactivating an Account

```
Navigate to: Admin → Users → [Find User] → Edit
Set is_active to TRUE
Click Save
Reset their password so they can log back in
```

---

# 5. Weekly Admin Routine

This 15-minute routine keeps the platform running smoothly.

**Every Monday morning:**

```
1. Check system health panel
   → Any red indicators? Contact tech lead immediately.

2. Review unresolved student alerts
   Admin → [Batch] → Alerts
   → Forward critical alerts to the relevant mentor
   → INACTIVE alerts: check if the student has been contacted

3. Verify nightly jobs ran over the weekend
   Admin → [Batch] → Metrics Log
   → Should see entries for each day
   → Any failures? Contact tech lead.

4. Check if any content is stuck in transcription
   Admin → [Batch] → Content
   → Any items showing "Transcribing..." for more than 1 hour?
   → If yes: see section 8

5. Review any new mentor-reported issues from the previous week
   → Address or escalate as needed
```

**Every Friday:**

```
1. Confirm next week's live sessions are scheduled
   Check with each mentor that their sessions are in the platform

2. Verify student engagement levels
   Batch → Progress Dashboard
   Any students with zero activity this week?
   → Send a check-in message through appropriate channel

3. Check AI quiz generation backlog
   Batch → Content
   Any content items where quizzes are still PENDING_REVIEW
   for more than 48 hours?
   → Remind the mentor to review them
```

---

# 6. Handling Student Issues

## "I cannot log in"

**Check 1:** Is the account active?

```
Admin → Users → Find student by email
Check: is_active = TRUE
If FALSE: reactivate and reset password
```

**Check 2:** Are they using the correct email?
Many students register with a different email than the
one they were enrolled with. Check both.

**Check 3:** Password reset
If the above checks pass, reset their password.

## "My quiz progress was lost"

Quiz responses are saved atomically on submission.
There is no partial save that could be lost.

If a student reports losing answers mid-quiz:

- Their answers are saved in their browser's localStorage
- Refreshing the page should restore them
- If the browser was cleared, the answers are gone
- They can take the quiz again ONLY if an admin resets
  their attempt (requires developer/database access)

## "I cannot see the content"

**Check 1:** Is the student enrolled?

```
Admin → Batch → Students → Search student name
If not listed: enroll them
```

**Check 2:** Is the content published?

```
Admin → Batch → Content
Check: is_published = TRUE for the content
If not: ask the mentor to publish it
```

**Check 3:** Is the student's enrollment status ACTIVE?
Withdrawn students cannot see content. Re-enroll if needed.

## "I submitted a quiz but my score looks wrong"

This requires tech lead investigation. Collect:

- Student name and email
- Content title and quiz type (Quick or Retention)
- Approximate submission time
- What score the student expected vs what they see

Do not reset the quiz attempt without confirming with the
tech lead first. Once reset, the original score is gone.

---

# 7. Handling Mentor Issues

## "My video has been transcribing for over an hour"

This usually means the AI pipeline is stuck.

**Step 1:** Check the content status

```
Admin → Batch → Content
Find the content item
Note the transcription_status:
  PENDING    = in queue, waiting to start
  PROCESSING = currently running (normal if < 1 hour)
  COMPLETE   = done successfully
  FAILED     = failed with an error
```

**Step 2:** If FAILED, there will be a transcription_error
message visible in the admin content detail view.
Share this with the tech lead.

**Step 3:** If PROCESSING for > 1 hour, the job is likely
stuck. Contact the tech lead to restart the pipeline.

**Step 4:** If the issue is audio quality (the transcript
looks like nonsense), the mentor can:

- Edit the transcript manually from their account
- Then click "Regenerate Quizzes" to generate questions
  from the corrected transcript

## "Quiz generation produced no questions"

This happens when:

1. The transcript is too short (lecture under 5 minutes)
2. The AI could not extract meaningful concepts
3. There was an error in the generation pipeline

**Action:**

1. Ask the mentor to add learning objectives to the content
   (Content → Edit → Learning Objectives)
   This guides the AI when the transcript is ambiguous.
2. Ask the mentor to click "Regenerate Quizzes"
3. If it fails again, contact the tech lead

## "I cannot start my live session"

The Start Stream button only becomes active 15 minutes
before the scheduled time.

If the session time has passed and the button never appeared:

```
Admin → Batch → Sessions → Find session
Check: status = SCHEDULED (if MISSED, need to reschedule)
Check: scheduled_at time is correct
```

If the session shows MISSED but the mentor was ready to stream,
ask the tech lead to manually reset the session status to
SCHEDULED so the mentor can start it.

---

# 8. Handling AI Pipeline Issues

## Checking Pipeline Status

Content items go through these statuses:

```
PENDING     → waiting in queue
PROCESSING  → currently running
COMPLETE    → transcript ready, quizzes generated
FAILED      → something went wrong
```

The queue depth can be checked at:
`https://api.m2ilms.com/admin/queues` (requires admin login)

This shows how many jobs are waiting, active, completed,
and failed for each queue.

## What to Do When Jobs Are Failing

**Do not try to fix the AI pipeline yourself.**

Collect this information for the tech lead:

1. Content item title and batch name
2. The error message shown in the admin content view
3. Approximate time the issue started
4. Whether it is affecting all content or just specific items

While waiting for a fix, mentors can:

- Edit the transcript manually if transcription completed
- Create quiz questions manually (no AI required)
  from the quiz review interface

## Manual Metrics Recalculation

If student progress scores look incorrect or have not
updated for more than 24 hours:

```
Navigate to: Admin → Batch → [Recalculate Metrics]
```

This triggers an immediate recalculation for all students
in the batch. Results appear in the dashboard within 5 minutes.

---

# 9. End-of-Batch Procedures

When a batch ends (on the end_date), the system automatically:

- Changes batch status to COMPLETED
- Marks all enrollments as COMPLETED
- Sends a completion notification to all students

**Admin actions at end of batch:**

```
Week before end:
□ Confirm all content is published and accessible
□ Confirm all quiz questions are approved
□ Confirm final live session is scheduled

Day of completion:
□ Verify batch status changed to COMPLETED
   (happens automatically at midnight)
□ Check that students received completion notification
□ Archive the batch after 2 weeks:
   Admin → Batch → Archive
```

**Exporting data before archiving:**

Ask the tech lead to run the data export script which
produces a CSV with all student progress scores, quiz
attempt histories, and attendance records for the batch.
Store this in a secure location before archiving.

---

# 10. Data Export and Reporting

## Student Progress Report

Ask the tech lead to run:

```bash
npm run report:batch-progress -- --batch-id=[ID]
```

This produces a CSV with:

- Student name and email
- Overall score per week
- All 9 dimension scores for the final week
- Total quizzes taken and average score
- Session attendance rate
- Content completion rate

## Quiz Quality Report

```bash
npm run report:quiz-quality -- --batch-id=[ID]
```

This produces a CSV showing:

- Content item name
- Total questions generated
- Approval rate
- Most common rejection reasons
- Average quiz scores per content item

---

# 11. Quick Reference

## User Roles


| Role        | Can Do                                                              |
| ----------- | ------------------------------------------------------------------- |
| STUDENT     | View content, take quizzes, join sessions, see own dashboard        |
| MENTOR      | Upload content, review quizzes, host sessions, see batch dashboard  |
| ADMIN       | Everything above + create users, create batches, manage enrollments |
| SUPER_ADMIN | Everything above + cannot be deactivated                            |

## Content Status Reference


| Status                 | Meaning              | Student Can See? |
| ---------------------- | -------------------- | ---------------- |
| Draft + Unpublished    | Just uploaded        | No               |
| Transcribing           | AI processing        | No               |
| Unpublished + Complete | Ready, not released  | No               |
| Published              | Released to students | Yes              |
| Failed                 | Pipeline error       | No               |

## Common Admin Contacts


| Issue                          | Contact                           |
| ------------------------------ | --------------------------------- |
| Pipeline failures              | Tech Lead                         |
| Quiz score disputes            | Tech Lead (database check needed) |
| Student cannot access platform | Admin (this guide)                |
| Server is down                 | Tech Lead + DevOps                |
| Mux streaming issues           | Tech Lead                         |

---

**End of Admin Operations Guide**

---

**Document Information**


| Field          | Value                                                    |
| -------------- | -------------------------------------------------------- |
| Document Title | M2i_LMS Admin Operations Guide                           |
| Version        | 1.0                                                      |
| Created        | March 2026                                               |
| Audience       | Non-technical platform administrators                    |
| Repository     | /docs/Developer_Guides/M2i_LMS_Admin_Operations_Guide.md |
