# Feature 08 — Student Progress Dashboard
### Complete Implementation Guide | Version 1.0 | March 2026
### Save As: F08_Progress_Dashboard/F08_Implementation_Guide.md

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

The Student Progress Dashboard is the primary interface through
which students understand their own learning trajectory, and through
which mentors monitor the performance of every student in their
batch. It translates weeks of raw behavioral data — quiz responses,
content access logs, session attendance records — into a clear,
human-readable, multidimensional picture of each student's growth.

This feature is the visualization layer that sits on top of the
metrics calculation engine (Feature 09). It does not calculate
metrics itself — it reads pre-calculated scores from the
StudentProgress table and presents them in a way that is immediately
understandable and actionable.

The dashboard has two distinct views:

**Student View:** A student opens their dashboard and sees their
own profile — current scores across all nine learning dimensions
visualized as a radar chart, week-by-week trend lines for each
dimension, quiz score history, content engagement summary, session
attendance record, and plain-language insights describing their
strengths and growth areas.

**Mentor View:** A mentor opens their batch dashboard and sees
all enrolled students in a sortable, filterable table with each
student's dimension scores. They can click into any individual
student to see the same detailed view the student sees. They
receive alerts for students who have been inactive or whose
scores have dropped significantly.

## 1.2 Why This Feature Exists

Data without visibility is worthless. The metrics engine
calculates scores, but those scores only create value if students
and mentors can see, understand, and act on them.

For students, the dashboard answers the question "how am I
actually doing?" in a way that is more meaningful than a single
grade. A student who scores 55 percent on a quiz but has high
learning velocity and strong error recovery is in a very different
position from one who scores 55 percent and shows no improvement.
The dashboard makes this distinction visible.

For mentors, the dashboard answers the question "who needs my
attention right now?" A mentor with 45 students cannot give
individual attention to everyone. The dashboard surfaces the
students who are falling behind — low consistency scores,
declining learning velocity, repeated poor quiz performance —
so mentors can intervene early rather than discovering problems
at the end of the batch.

## 1.3 Key Design Decisions

**Radar chart as the primary visualization:** Nine dimensions
displayed as a filled polygon on a radar chart gives an immediate
gestalt impression of a student's overall profile. Strong students
have a large, even polygon. Students with specific weaknesses have
obvious dips in the relevant axes. This visual format is more
informative than nine separate numbers.

**Plain language insights:** Raw scores are not sufficient for
most students to act on. The dashboard generates templated,
readable insights — "Your learning velocity is in the top 30
percent of your batch, meaning you are picking up new concepts
faster than most of your peers" — that translate scores into
actionable self-understanding.

**Week-by-week trends:** Absolute scores matter less than
trajectory. A student at 60 percent and improving is more
on track than a student at 75 percent and declining. The
trend charts make this trajectory visible.

**Mentor alert system:** Proactive alerting for inactive students
and score drops reduces the cognitive load on mentors. Rather
than scanning 45 rows looking for problems, they receive specific
alerts that direct their attention.

---

# 2. Core Functionality

## 2.1 Student Dashboard Flow
```
Student logs in and navigates to dashboard
          |
          v
GET /api/students/me/dashboard
          |
          v
Backend fetches:
  - Latest StudentProgress record (current week scores)
  - StudentProgress history (all weeks)
  - Quiz attempt history (last 10)
  - Content access summary
  - Session attendance record
  - Batch context (week number, total weeks)
          |
          v
Frontend renders dashboard sections:

  Section 1: Overview Header
    - "Week 3 of 8" progress indicator
    - Batch name and mentor name
    - Overall score as a single number

  Section 2: Radar Chart
    - 9 dimensions as polygon
    - Current week filled polygon
    - Previous week as lighter outline
    - Each axis labeled with dimension name
    - Clicking an axis opens dimension detail

  Section 3: Dimension Cards
    - 9 cards showing current score,
      trend indicator (↑↓→), and brief label
    - Color coding: green ≥70, amber 50-69, red <50

  Section 4: Plain Language Insights
    - 3-5 bullet points about strengths and
      areas for development
    - Generated from score patterns

  Section 5: Week-by-Week Trend Charts
    - Line chart for each dimension
    - Shows score evolution from week 1 to current

  Section 6: Recent Quiz Performance
    - Last 10 quiz attempts with scores
    - Mini bar chart showing score trends

  Section 7: Content Engagement
    - Content completion rates
    - Time spent vs expected time

  Section 8: Session Attendance
    - List of all sessions with attendance status
    - Attendance rate percentage
```

## 2.2 Mentor Batch Overview Flow
```
Mentor navigates to batch dashboard
          |
          v
GET /api/batches/:batchId/students/progress
          |
          v
Backend fetches latest StudentProgress
records for ALL students in batch
          |
          v
Frontend renders batch progress table:

  Header:
    - Batch name and current week
    - Overall batch average score
    - Completion statistics

  Table (sortable by any column):
    Columns:
      - Student name (link to individual dashboard)
      - Overall Score
      - Learning Velocity
      - Knowledge Retention
      - Conceptual Depth
      - Consistency
      - Problem Solving
      - Content Engagement
      - Curiosity
      - Communication
      - Error Recovery
      - Last Active (date)
      - Alert indicator (⚠ if flagged)

  Filters:
    - Show only flagged students
    - Filter by dimension score range
    - Search by name

  Alert Panel (above table):
    - "3 students inactive for 3+ days"
    - "2 students had significant score drops"
    - Each alert links to the specific student
```

## 2.3 Individual Student Alert Logic
```
Nightly job runs for each student in active batches:
          |
          v
Check 1: INACTIVE STUDENT
  - Has the student logged in in the last 3 days?
  - Have they accessed any content in the last 3 days?
  - If no to both → flag as INACTIVE
          |
          v
Check 2: SCORE DROP
  - Compare current week overall_score to previous week
  - If drop > 15 points → flag as SCORE_DROP
          |
          v
Check 3: QUIZ STREAK FAILURE
  - Last 3 quizzes all below 50%?
  - Flag as STRUGGLING
          |
          v
For each new flag:
  - Create StudentAlert record
  - Send notification to all batch mentors
  - Display alert indicator on student row
    in mentor batch overview
```

---

# 3. Data Model

## 3.1 StudentProgress Table

This table is populated by the Metrics Calculation Engine
(Feature 09). The Dashboard reads from it — it never writes to it.
```sql
CREATE TABLE student_progress (
  id                        UUID          PRIMARY KEY
                                          DEFAULT gen_random_uuid(),
  student_id                UUID          NOT NULL
                                          REFERENCES users(id),
  batch_id                  UUID          NOT NULL
                                          REFERENCES batches(id),
  week_number               INTEGER       NOT NULL,
  learning_velocity_score   DECIMAL(5,2)  NOT NULL DEFAULT 0,
  content_engagement_score  DECIMAL(5,2)  NOT NULL DEFAULT 0,
  problem_solving_score     DECIMAL(5,2)  NOT NULL DEFAULT 0,
  knowledge_retention_score DECIMAL(5,2)  NOT NULL DEFAULT 0,
  consistency_score         DECIMAL(5,2)  NOT NULL DEFAULT 0,
  curiosity_score           DECIMAL(5,2)  NOT NULL DEFAULT 0,
  communication_score       DECIMAL(5,2)  NOT NULL DEFAULT 0,
  error_recovery_score      DECIMAL(5,2)  NOT NULL DEFAULT 0,
  conceptual_depth_score    DECIMAL(5,2)  NOT NULL DEFAULT 0,
  soft_skills_score         DECIMAL(5,2)  NOT NULL DEFAULT 0,
  overall_score             DECIMAL(5,2)  NOT NULL DEFAULT 0,
  calculated_at             TIMESTAMP     NOT NULL DEFAULT NOW()
);

-- One record per student per batch per week
CREATE UNIQUE INDEX idx_progress_student_batch_week
  ON student_progress(student_id, batch_id, week_number);

CREATE INDEX idx_progress_student_batch
  ON student_progress(student_id, batch_id);

CREATE INDEX idx_progress_batch_week
  ON student_progress(batch_id, week_number DESC);
```

## 3.2 StudentAlerts Table

Stores flags for students requiring mentor attention.
```sql
CREATE TABLE student_alerts (
  id              UUID          PRIMARY KEY
                                DEFAULT gen_random_uuid(),
  student_id      UUID          NOT NULL
                                REFERENCES users(id),
  batch_id        UUID          NOT NULL
                                REFERENCES batches(id),
  alert_type      VARCHAR(30)   NOT NULL
                                CHECK (alert_type IN (
                                  'INACTIVE',
                                  'SCORE_DROP',
                                  'STRUGGLING',
                                  'MISSED_SESSIONS'
                                )),
  severity        VARCHAR(10)   NOT NULL DEFAULT 'WARNING'
                                CHECK (severity IN (
                                  'INFO',
                                  'WARNING',
                                  'CRITICAL'
                                )),
  message         TEXT          NOT NULL,
  metadata        JSONB         DEFAULT '{}',
  is_resolved     BOOLEAN       NOT NULL DEFAULT FALSE,
  resolved_at     TIMESTAMP     DEFAULT NULL,
  resolved_by     UUID          DEFAULT NULL
                                REFERENCES users(id),
  created_at      TIMESTAMP     NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_alerts_student_batch
  ON student_alerts(student_id, batch_id);

CREATE INDEX idx_alerts_batch_unresolved
  ON student_alerts(batch_id, is_resolved)
  WHERE is_resolved = FALSE;

CREATE INDEX idx_alerts_created_at
  ON student_alerts(batch_id, created_at DESC);
```

## 3.3 Prisma Schema
```prisma
model StudentProgress {
  id                      String    @id
                                    @default(dbgenerated(
                                      "gen_random_uuid()"))
                                    @db.Uuid
  studentId               String    @map("student_id") @db.Uuid
  batchId                 String    @map("batch_id") @db.Uuid
  weekNumber              Int       @map("week_number")
  learningVelocityScore   Decimal   @default(0)
                                    @map("learning_velocity_score")
                                    @db.Decimal(5, 2)
  contentEngagementScore  Decimal   @default(0)
                                    @map("content_engagement_score")
                                    @db.Decimal(5, 2)
  problemSolvingScore     Decimal   @default(0)
                                    @map("problem_solving_score")
                                    @db.Decimal(5, 2)
  knowledgeRetentionScore Decimal   @default(0)
                                    @map("knowledge_retention_score")
                                    @db.Decimal(5, 2)
  consistencyScore        Decimal   @default(0)
                                    @map("consistency_score")
                                    @db.Decimal(5, 2)
  curiosityScore          Decimal   @default(0)
                                    @map("curiosity_score")
                                    @db.Decimal(5, 2)
  communicationScore      Decimal   @default(0)
                                    @map("communication_score")
                                    @db.Decimal(5, 2)
  errorRecoveryScore      Decimal   @default(0)
                                    @map("error_recovery_score")
                                    @db.Decimal(5, 2)
  conceptualDepthScore    Decimal   @default(0)
                                    @map("conceptual_depth_score")
                                    @db.Decimal(5, 2)
  softSkillsScore         Decimal   @default(0)
                                    @map("soft_skills_score")
                                    @db.Decimal(5, 2)
  overallScore            Decimal   @default(0)
                                    @map("overall_score")
                                    @db.Decimal(5, 2)
  calculatedAt            DateTime  @default(now())
                                    @map("calculated_at")

  student   User  @relation(fields: [studentId],
                            references: [id])
  batch     Batch @relation(fields: [batchId],
                            references: [id])

  @@unique([studentId, batchId, weekNumber])
  @@map("student_progress")
}

model StudentAlert {
  id          String    @id
                        @default(dbgenerated("gen_random_uuid()"))
                        @db.Uuid
  studentId   String    @map("student_id") @db.Uuid
  batchId     String    @map("batch_id") @db.Uuid
  alertType   AlertType @map("alert_type")
  severity    AlertSeverity @default(WARNING)
  message     String    @db.Text
  metadata    Json      @default("{}")
  isResolved  Boolean   @default(false) @map("is_resolved")
  resolvedAt  DateTime? @map("resolved_at")
  resolvedBy  String?   @map("resolved_by") @db.Uuid
  createdAt   DateTime  @default(now()) @map("created_at")

  student     User  @relation(fields: [studentId],
                              references: [id])
  batch       Batch @relation(fields: [batchId],
                              references: [id])

  @@map("student_alerts")
}

enum AlertType {
  INACTIVE
  SCORE_DROP
  STRUGGLING
  MISSED_SESSIONS
}

enum AlertSeverity {
  INFO
  WARNING
  CRITICAL
}
```

---

# 4. API Endpoints

## 4.1 Student Dashboard Endpoints

### GET /api/students/me/dashboard

**Access:** STUDENT only

**Purpose:** Fetch complete dashboard data for the authenticated
student — current scores, history, quiz performance, and insights.

**Success Response (200 OK):**
```json
{
  "success": true,
  "data": {
    "student": {
      "student_id": "student-uuid-1",
      "full_name": "Rahul Sharma",
      "avatar_url": null,
      "enrolled_at": "2026-03-21T10:00:00Z"
    },
    "batch": {
      "batch_id": "batch-uuid-1",
      "name": "Full Stack Development Batch Jan 2026",
      "current_week": 3,
      "total_weeks": 8,
      "weeks_remaining": 5,
      "mentor_name": "Arjun Nair"
    },
    "current_scores": {
      "week_number": 3,
      "overall_score": 68.4,
      "learning_velocity": 72.5,
      "content_engagement": 65.0,
      "problem_solving": 58.3,
      "knowledge_retention": 70.1,
      "consistency": 80.0,
      "curiosity": 55.0,
      "communication": 60.0,
      "error_recovery": 74.2,
      "conceptual_depth": 62.5,
      "soft_skills": 63.0,
      "calculated_at": "2026-04-14T02:00:00Z"
    },
    "previous_scores": {
      "week_number": 2,
      "overall_score": 61.2,
      "learning_velocity": 65.0,
      "content_engagement": 58.0,
      "problem_solving": 52.0,
      "knowledge_retention": 64.5,
      "consistency": 75.0,
      "curiosity": 50.0,
      "communication": 58.0,
      "error_recovery": 70.0,
      "conceptual_depth": 55.0,
      "soft_skills": 58.0
    },
    "score_history": [
      {
        "week_number": 1,
        "overall_score": 55.0,
        "learning_velocity": 50.0,
        "content_engagement": 60.0,
        "problem_solving": 45.0,
        "knowledge_retention": 0,
        "consistency": 70.0,
        "curiosity": 40.0,
        "communication": 55.0,
        "error_recovery": 65.0,
        "conceptual_depth": 48.0,
        "soft_skills": 52.0
      },
      {
        "week_number": 2,
        "overall_score": 61.2
      },
      {
        "week_number": 3,
        "overall_score": 68.4
      }
    ],
    "insights": [
      {
        "type": "STRENGTH",
        "dimension": "consistency",
        "title": "Strong consistency",
        "message": "You have logged in and completed assigned 
                   activities on time in 80% of scheduled windows.
                   This puts you in the top 25% of your batch 
                   for discipline."
      },
      {
        "type": "STRENGTH",
        "dimension": "error_recovery",
        "title": "Good error recovery",
        "message": "When you score poorly on a quiz, you tend to 
                   review and improve on subsequent assessments.
                   This resilience is a strong indicator of 
                   long-term growth."
      },
      {
        "type": "GROWTH_AREA",
        "dimension": "problem_solving",
        "title": "Problem solving needs attention",
        "message": "Your problem-solving score suggests you may 
                   be rushing through questions without thinking 
                   them through fully. Try spending at least 
                   30 seconds on each question before selecting 
                   an answer."
      },
      {
        "type": "GROWTH_AREA",
        "dimension": "curiosity",
        "title": "Explore more",
        "message": "You are mostly sticking to required content.
                   Exploring supplementary materials and optional 
                   resources can significantly accelerate your 
                   learning and improve this score."
      }
    ],
    "quiz_history": [
      {
        "attempt_id": "attempt-uuid-1",
        "content_title": "Introduction to Node.js",
        "quiz_type": "QUICK_ASSESSMENT",
        "score_percentage": 70.0,
        "completed_at": "2026-04-02T11:30:00Z"
      },
      {
        "attempt_id": "attempt-uuid-2",
        "content_title": "Express.js Fundamentals",
        "quiz_type": "QUICK_ASSESSMENT",
        "score_percentage": 85.0,
        "completed_at": "2026-04-09T14:20:00Z"
      }
    ],
    "content_engagement": {
      "total_content_items": 8,
      "completed": 5,
      "in_progress": 2,
      "not_started": 1,
      "completion_rate": 62.5,
      "average_watch_percentage": 78.3
    },
    "session_attendance": {
      "total_sessions": 4,
      "attended_live": 3,
      "attended_recording": 0,
      "absent": 1,
      "attendance_rate": 75.0
    }
  }
}
```

---

### GET /api/students/me/progress/history

**Access:** STUDENT only

**Purpose:** Fetch full week-by-week progress history for
trend charts

**Success Response (200 OK):**
```json
{
  "success": true,
  "data": {
    "history": [
      {
        "week_number": 1,
        "overall_score": 55.0,
        "learning_velocity": 50.0,
        "content_engagement": 60.0,
        "problem_solving": 45.0,
        "knowledge_retention": 0,
        "consistency": 70.0,
        "curiosity": 40.0,
        "communication": 55.0,
        "error_recovery": 65.0,
        "conceptual_depth": 48.0,
        "soft_skills": 52.0,
        "calculated_at": "2026-04-07T02:00:00Z"
      },
      {
        "week_number": 2,
        "overall_score": 61.2,
        "learning_velocity": 65.0,
        "content_engagement": 58.0,
        "problem_solving": 52.0,
        "knowledge_retention": 64.5,
        "consistency": 75.0,
        "curiosity": 50.0,
        "communication": 58.0,
        "error_recovery": 70.0,
        "conceptual_depth": 55.0,
        "soft_skills": 58.0,
        "calculated_at": "2026-04-14T02:00:00Z"
      }
    ]
  }
}
```

---

## 4.2 Mentor Batch Dashboard Endpoints

### GET /api/batches/:batchId/students/progress

**Access:** MENTOR (assigned to batch), ADMIN, SUPER_ADMIN

**Purpose:** Fetch latest progress scores for all students
in the batch for the mentor overview table

**Query Parameters:**
```
sort_by   : dimension to sort by (overall_score, 
            learning_velocity, consistency, etc.)
sort_dir  : asc or desc (default: desc)
search    : search by student name
flagged   : boolean, show only flagged students
page      : page number (default: 1)
limit     : results per page (default: 50)
```

**Success Response (200 OK):**
```json
{
  "success": true,
  "data": {
    "batch_summary": {
      "total_students": 45,
      "active_students": 42,
      "flagged_students": 4,
      "batch_average_score": 67.3,
      "current_week": 3
    },
    "students": [
      {
        "student_id": "student-uuid-1",
        "full_name": "Rahul Sharma",
        "email": "rahul@example.com",
        "avatar_url": null,
        "last_active": "2026-04-14T09:30:00Z",
        "is_flagged": false,
        "alerts": [],
        "progress": {
          "week_number": 3,
          "overall_score": 68.4,
          "learning_velocity": 72.5,
          "content_engagement": 65.0,
          "problem_solving": 58.3,
          "knowledge_retention": 70.1,
          "consistency": 80.0,
          "curiosity": 55.0,
          "communication": 60.0,
          "error_recovery": 74.2,
          "conceptual_depth": 62.5
        }
      },
      {
        "student_id": "student-uuid-3",
        "full_name": "Amit Singh",
        "email": "amit@example.com",
        "avatar_url": null,
        "last_active": "2026-04-11T14:00:00Z",
        "is_flagged": true,
        "alerts": [
          {
            "alert_type": "INACTIVE",
            "severity": "WARNING",
            "message": "Has not logged in for 3 days",
            "created_at": "2026-04-14T02:00:00Z"
          }
        ],
        "progress": {
          "week_number": 3,
          "overall_score": 42.1,
          "learning_velocity": 38.0,
          "content_engagement": 30.0,
          "problem_solving": 45.0,
          "knowledge_retention": 48.5,
          "consistency": 35.0,
          "curiosity": 28.0,
          "communication": 50.0,
          "error_recovery": 55.0,
          "conceptual_depth": 40.0
        }
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

### GET /api/students/:studentId/dashboard

**Access:** MENTOR (assigned to student's batch), ADMIN,
SUPER_ADMIN

**Purpose:** Mentor views a specific student's full dashboard
— same data structure as the student's own dashboard view

**Success Response:** Same structure as GET /api/students/me/dashboard
but for the specified student

---

### GET /api/batches/:batchId/alerts

**Access:** MENTOR (assigned to batch), ADMIN, SUPER_ADMIN

**Purpose:** Fetch all unresolved student alerts for the batch

**Success Response (200 OK):**
```json
{
  "success": true,
  "data": {
    "total_unresolved": 6,
    "alerts": [
      {
        "alert_id": "alert-uuid-1",
        "student_id": "student-uuid-3",
        "student_name": "Amit Singh",
        "alert_type": "INACTIVE",
        "severity": "WARNING",
        "message": "Amit Singh has not logged in for 3 days",
        "metadata": {
          "last_login": "2026-04-11T14:00:00Z",
          "days_inactive": 3
        },
        "created_at": "2026-04-14T02:00:00Z"
      },
      {
        "alert_id": "alert-uuid-2",
        "student_id": "student-uuid-5",
        "student_name": "Sneha Reddy",
        "alert_type": "SCORE_DROP",
        "severity": "WARNING",
        "message": "Sneha Reddy's overall score dropped by 18 
                   points this week",
        "metadata": {
          "previous_score": 75.0,
          "current_score": 57.0,
          "drop_amount": 18.0
        },
        "created_at": "2026-04-14T02:00:00Z"
      }
    ]
  }
}
```

---

### POST /api/batches/:batchId/alerts/:alertId/resolve

**Access:** MENTOR (assigned to batch), ADMIN, SUPER_ADMIN

**Purpose:** Mark an alert as resolved after the mentor
has taken action (e.g., reached out to the student)

**Request Body:**
```json
{
  "resolution_note": "Spoke with Amit — he was unwell. 
                      Will catch up this week."
}
```

**Success Response (200 OK):**
```json
{
  "success": true,
  "data": {
    "alert_id": "alert-uuid-1",
    "is_resolved": true,
    "resolved_at": "2026-04-14T10:30:00Z",
    "resolved_by": "mentor-uuid-1"
  },
  "message": "Alert resolved"
}
```

---

## 4.3 Dimension Detail Endpoints

### GET /api/students/:studentId/dimensions/:dimension

**Access:** STUDENT (own), MENTOR, ADMIN

**Purpose:** Fetch detailed breakdown for a single learning
dimension — what activities contributed to the score and
how it was calculated

**Valid dimension values:**
```
learning_velocity, content_engagement, problem_solving,
knowledge_retention, consistency, curiosity, communication,
error_recovery, conceptual_depth
```

**Success Response (200 OK) — Example: learning_velocity:**
```json
{
  "success": true,
  "data": {
    "dimension": "learning_velocity",
    "current_score": 72.5,
    "score_label": "Good",
    "description": "Measures how quickly you are improving 
                   your quiz performance over time. A high score
                   means your results are consistently getting 
                   better week over week.",
    "how_calculated": "Calculated from the slope of your Quick 
                      Assessment quiz scores over the past 4 
                      weeks, adjusted for starting difficulty.",
    "history": [
      { "week": 1, "score": 50.0 },
      { "week": 2, "score": 65.0 },
      { "week": 3, "score": 72.5 }
    ],
    "contributing_data": {
      "quiz_scores_this_week": [70.0, 85.0, 60.0],
      "average_this_week": 71.7,
      "improvement_from_week_1": 22.5
    },
    "improvement_tip": "Continue completing quizzes promptly 
                       after watching content. The faster you 
                       test your understanding, the faster 
                       you will improve."
  }
}
```

---

# 5. Frontend Components

## 5.1 Component Structure
```
src/
├── app/
│   ├── student/
│   │   └── dashboard/
│   │       └── page.tsx
│   └── mentor/
│       └── batches/
│           └── [batchId]/
│               ├── dashboard/
│               │   └── page.tsx
│               └── students/
│                   └── [studentId]/
│                       └── dashboard/
│                           └── page.tsx
├── components/
│   └── dashboard/
│       ├── RadarChart.tsx
│       ├── DimensionCard.tsx
│       ├── DimensionTrendChart.tsx
│       ├── InsightCard.tsx
│       ├── QuizScoreHistory.tsx
│       ├── ContentEngagementSummary.tsx
│       ├── AttendanceSummary.tsx
│       ├── StudentProgressTable.tsx
│       ├── StudentAlertBanner.tsx
│       ├── StudentAlertList.tsx
│       ├── DimensionDetailModal.tsx
│       ├── BatchScoreDistributionChart.tsx
│       └── ScoreTrendMiniChart.tsx
└── hooks/
    ├── useStudentDashboard.ts
    └── useBatchProgress.ts
```

## 5.2 RadarChart Component

The radar chart is the signature visualization of the dashboard.
It uses SVG to draw a polygon for each week's scores on a
9-axis radar grid.
```tsx
// components/dashboard/RadarChart.tsx
"use client";

import { useMemo } from "react";

type DimensionScores = {
  learning_velocity: number;
  content_engagement: number;
  problem_solving: number;
  knowledge_retention: number;
  consistency: number;
  curiosity: number;
  communication: number;
  error_recovery: number;
  conceptual_depth: number;
};

type Props = {
  currentScores: DimensionScores;
  previousScores?: DimensionScores;
  size?: number;
  onDimensionClick?: (dimension: string) => void;
};

const DIMENSIONS = [
  { key: "learning_velocity", label: "Learning Velocity" },
  { key: "content_engagement", label: "Content Engagement" },
  { key: "problem_solving", label: "Problem Solving" },
  { key: "knowledge_retention", label: "Knowledge Retention" },
  { key: "consistency", label: "Consistency" },
  { key: "curiosity", label: "Curiosity" },
  { key: "communication", label: "Communication" },
  { key: "error_recovery", label: "Error Recovery" },
  { key: "conceptual_depth", label: "Conceptual Depth" },
];

const toRadians = (deg: number) => (deg * Math.PI) / 180;

export default function RadarChart({
  currentScores,
  previousScores,
  size = 400,
  onDimensionClick,
}: Props) {
  const center = size / 2;
  const radius = size * 0.35;
  const numAxes = DIMENSIONS.length;

  const getPoint = (
    index: number,
    value: number,
    maxValue = 100
  ): [number, number] => {
    const angle = toRadians(
      (360 / numAxes) * index - 90
    );
    const r = (value / maxValue) * radius;
    return [
      center + r * Math.cos(angle),
      center + r * Math.sin(angle),
    ];
  };

  const getLabelPoint = (
    index: number
  ): [number, number] => {
    const angle = toRadians((360 / numAxes) * index - 90);
    const r = radius + 28;
    return [
      center + r * Math.cos(angle),
      center + r * Math.sin(angle),
    ];
  };

  const getAxisEndPoint = (
    index: number
  ): [number, number] => {
    const angle = toRadians((360 / numAxes) * index - 90);
    return [
      center + radius * Math.cos(angle),
      center + radius * Math.sin(angle),
    ];
  };

  const buildPath = (
    scores: DimensionScores
  ): string => {
    const points = DIMENSIONS.map((dim, i) =>
      getPoint(i, Number((scores as any)[dim.key]))
    );
    return (
      points.map((p, i) => `${i === 0 ? "M" : "L"} ${p[0]} ${p[1]}`).join(" ") + " Z"
    );
  };

  const gridLevels = [20, 40, 60, 80, 100];

  const gridPath = (level: number): string => {
    const points = DIMENSIONS.map((_, i) =>
      getPoint(i, level)
    );
    return (
      points.map((p, i) => `${i === 0 ? "M" : "L"} ${p[0]} ${p[1]}`).join(" ") + " Z"
    );
  };

  return (
    <svg
      width={size}
      height={size}
      viewBox={`0 0 ${size} ${size}`}
      style={{ overflow: "visible" }}
    >
      {/* Grid circles */}
      {gridLevels.map((level) => (
        <path
          key={level}
          d={gridPath(level)}
          fill="none"
          stroke="#E5E7EB"
          strokeWidth="1"
        />
      ))}

      {/* Grid level labels */}
      {gridLevels.map((level) => (
        <text
          key={`label-${level}`}
          x={center + 4}
          y={center - (level / 100) * radius + 4}
          fontSize="9"
          fill="#9CA3AF"
        >
          {level}
        </text>
      ))}

      {/* Axis lines */}
      {DIMENSIONS.map((_, i) => {
        const [ex, ey] = getAxisEndPoint(i);
        return (
          <line
            key={i}
            x1={center}
            y1={center}
            x2={ex}
            y2={ey}
            stroke="#E5E7EB"
            strokeWidth="1"
          />
        );
      })}

      {/* Previous scores polygon */}
      {previousScores && (
        <path
          d={buildPath(previousScores)}
          fill="rgba(99, 102, 241, 0.1)"
          stroke="rgba(99, 102, 241, 0.3)"
          strokeWidth="1.5"
          strokeDasharray="4 3"
        />
      )}

      {/* Current scores polygon */}
      <path
        d={buildPath(currentScores)}
        fill="rgba(99, 102, 241, 0.25)"
        stroke="#4F46E5"
        strokeWidth="2"
      />

      {/* Data points */}
      {DIMENSIONS.map((dim, i) => {
        const [px, py] = getPoint(
          i,
          Number((currentScores as any)[dim.key])
        );
        return (
          <circle
            key={dim.key}
            cx={px}
            cy={py}
            r="4"
            fill="#4F46E5"
            stroke="white"
            strokeWidth="2"
          />
        );
      })}

      {/* Axis labels */}
      {DIMENSIONS.map((dim, i) => {
        const [lx, ly] = getLabelPoint(i);
        const score = Number(
          (currentScores as any)[dim.key]
        );

        return (
          <g
            key={dim.key}
            style={{ cursor: onDimensionClick ? "pointer" : "default" }}
            onClick={() => onDimensionClick?.(dim.key)}
          >
            <text
              x={lx}
              y={ly - 6}
              textAnchor="middle"
              fontSize="10"
              fill="#374151"
              fontWeight="500"
            >
              {dim.label.split(" ").map((word, wi) => (
                <tspan
                  key={wi}
                  x={lx}
                  dy={wi === 0 ? 0 : 12}
                >
                  {word}
                </tspan>
              ))}
            </text>
            <text
              x={lx}
              y={ly + (dim.label.includes(" ") ? 22 : 8)}
              textAnchor="middle"
              fontSize="11"
              fontWeight="600"
              fill={
                score >= 70
                  ? "#059669"
                  : score >= 50
                  ? "#D97706"
                  : "#DC2626"
              }
            >
              {Math.round(score)}
            </text>
          </g>
        );
      })}
    </svg>
  );
}
```

## 5.3 DimensionCard Component

Shows a single dimension score with trend indicator and
color coding.
```tsx
// components/dashboard/DimensionCard.tsx

type Props = {
  dimension: string;
  label: string;
  currentScore: number;
  previousScore?: number;
  onClick?: () => void;
};

const getDimensionColor = (score: number) => {
  if (score >= 70) return { bg: "#D1FAE5", text: "#065F46", border: "#6EE7B7" };
  if (score >= 50) return { bg: "#FEF3C7", text: "#78350F", border: "#FCD34D" };
  return { bg: "#FEE2E2", text: "#7F1D1D", border: "#FCA5A5" };
};

const getTrendIndicator = (
  current: number,
  previous?: number
): { icon: string; color: string; label: string } => {
  if (!previous) return { icon: "—", color: "#9CA3AF", label: "No comparison" };
  const diff = current - previous;
  if (diff > 3)
    return { icon: "↑", color: "#059669", label: `+${diff.toFixed(1)}` };
  if (diff < -3)
    return { icon: "↓", color: "#DC2626", label: diff.toFixed(1) };
  return { icon: "→", color: "#D97706", label: "Stable" };
};

export default function DimensionCard({
  label,
  currentScore,
  previousScore,
  onClick,
}: Props) {
  const colors = getDimensionColor(currentScore);
  const trend = getTrendIndicator(currentScore, previousScore);

  return (
    <div
      onClick={onClick}
      style={{
        padding: "1rem",
        borderRadius: "10px",
        border: `1px solid ${colors.border}`,
        background: colors.bg,
        cursor: onClick ? "pointer" : "default",
        transition: "transform 0.15s, box-shadow 0.15s",
        userSelect: "none",
      }}
      onMouseEnter={(e) => {
        if (onClick) {
          (e.currentTarget as HTMLDivElement).style.transform =
            "translateY(-2px)";
        }
      }}
      onMouseLeave={(e) => {
        (e.currentTarget as HTMLDivElement).style.transform = "none";
      }}
    >
      {/* Label */}
      <p
        style={{
          fontSize: "12px",
          color: colors.text,
          marginBottom: "8px",
          fontWeight: 500,
          opacity: 0.8,
        }}
      >
        {label}
      </p>

      {/* Score and Trend */}
      <div
        style={{
          display: "flex",
          alignItems: "baseline",
          justifyContent: "space-between",
        }}
      >
        <span
          style={{
            fontSize: "28px",
            fontWeight: 700,
            color: colors.text,
          }}
        >
          {Math.round(currentScore)}
        </span>

        <div style={{ textAlign: "right" }}>
          <span
            style={{
              fontSize: "18px",
              fontWeight: 600,
              color: trend.color,
            }}
          >
            {trend.icon}
          </span>
          <p
            style={{
              fontSize: "11px",
              color: trend.color,
              margin: 0,
            }}
          >
            {trend.label}
          </p>
        </div>
      </div>

      {/* Score bar */}
      <div
        style={{
          height: "4px",
          background: "rgba(0,0,0,0.1)",
          borderRadius: "2px",
          marginTop: "8px",
          overflow: "hidden",
        }}
      >
        <div
          style={{
            height: "100%",
            width: `${currentScore}%`,
            background: colors.text,
            borderRadius: "2px",
            opacity: 0.6,
            transition: "width 0.5s ease",
          }}
        />
      </div>
    </div>
  );
}
```

## 5.4 DimensionTrendChart Component

Line chart showing a single dimension's score history
week by week.
```tsx
// components/dashboard/DimensionTrendChart.tsx
"use client";

type DataPoint = {
  week_number: number;
  score: number;
};

type Props = {
  data: DataPoint[];
  dimension: string;
  label: string;
  color?: string;
  height?: number;
};

export default function DimensionTrendChart({
  data,
  label,
  color = "#4F46E5",
  height = 80,
}: Props) {
  if (data.length < 2) {
    return (
      <div
        style={{
          height,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <p style={{ fontSize: "12px", color: "#9CA3AF" }}>
          Not enough data yet
        </p>
      </div>
    );
  }

  const width = 200;
  const padding = { top: 8, right: 8, bottom: 20, left: 28 };
  const chartWidth = width - padding.left - padding.right;
  const chartHeight = height - padding.top - padding.bottom;

  const maxScore = 100;
  const minScore = 0;

  const xScale = (index: number) =>
    padding.left + (index / (data.length - 1)) * chartWidth;

  const yScale = (score: number) =>
    padding.top +
    chartHeight -
    ((score - minScore) / (maxScore - minScore)) * chartHeight;

  const pathData = data
    .map((point, i) =>
      `${i === 0 ? "M" : "L"} ${xScale(i)} ${yScale(point.score)}`
    )
    .join(" ");

  const areaData =
    pathData +
    ` L ${xScale(data.length - 1)} ${height - padding.bottom}` +
    ` L ${xScale(0)} ${height - padding.bottom} Z`;

  return (
    <div>
      <p
        style={{
          fontSize: "12px",
          color: "#6B7280",
          marginBottom: "4px",
        }}
      >
        {label}
      </p>
      <svg
        width="100%"
        viewBox={`0 0 ${width} ${height}`}
        preserveAspectRatio="none"
      >
        {/* Y-axis gridlines */}
        {[25, 50, 75].map((level) => (
          <line
            key={level}
            x1={padding.left}
            y1={yScale(level)}
            x2={width - padding.right}
            y2={yScale(level)}
            stroke="#F3F4F6"
            strokeWidth="1"
          />
        ))}

        {/* Y-axis label */}
        <text
          x={padding.left - 4}
          y={yScale(100)}
          textAnchor="end"
          fontSize="8"
          fill="#9CA3AF"
        >
          100
        </text>
        <text
          x={padding.left - 4}
          y={yScale(50)}
          textAnchor="end"
          fontSize="8"
          fill="#9CA3AF"
        >
          50
        </text>

        {/* Area fill */}
        <path
          d={areaData}
          fill={`${color}20`}
        />

        {/* Line */}
        <path
          d={pathData}
          fill="none"
          stroke={color}
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        />

        {/* Data points */}
        {data.map((point, i) => (
          <circle
            key={i}
            cx={xScale(i)}
            cy={yScale(point.score)}
            r="3"
            fill={color}
            stroke="white"
            strokeWidth="1.5"
          />
        ))}

        {/* X-axis week labels */}
        {data.map((point, i) => (
          <text
            key={i}
            x={xScale(i)}
            y={height - 4}
            textAnchor="middle"
            fontSize="8"
            fill="#9CA3AF"
          >
            W{point.week_number}
          </text>
        ))}
      </svg>
    </div>
  );
}
```

## 5.5 InsightCard Component

Displays a single plain-language insight about a dimension.
```tsx
// components/dashboard/InsightCard.tsx

type Insight = {
  type: "STRENGTH" | "GROWTH_AREA";
  dimension: string;
  title: string;
  message: string;
};

type Props = {
  insight: Insight;
};

const DIMENSION_ICONS: Record<string, string> = {
  learning_velocity: "⚡",
  content_engagement: "📺",
  problem_solving: "🧩",
  knowledge_retention: "🧠",
  consistency: "📅",
  curiosity: "🔍",
  communication: "💬",
  error_recovery: "🔄",
  conceptual_depth: "🎯",
};

export default function InsightCard({ insight }: Props) {
  const isStrength = insight.type === "STRENGTH";

  return (
    <div
      style={{
        display: "flex",
        gap: "12px",
        padding: "1rem",
        borderRadius: "10px",
        border: `1px solid ${isStrength ? "#BBF7D0" : "#FDE68A"}`,
        background: isStrength ? "#F0FDF4" : "#FFFBEB",
        marginBottom: "10px",
      }}
    >
      {/* Icon */}
      <div
        style={{
          fontSize: "20px",
          flexShrink: 0,
          lineHeight: 1.3,
        }}
      >
        {DIMENSION_ICONS[insight.dimension] ?? "📊"}
      </div>

      {/* Content */}
      <div>
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: "8px",
            marginBottom: "4px",
          }}
        >
          <span
            style={{
              fontSize: "11px",
              fontWeight: 600,
              padding: "2px 8px",
              borderRadius: "9999px",
              background: isStrength ? "#BBF7D0" : "#FDE68A",
              color: isStrength ? "#065F46" : "#78350F",
            }}
          >
            {isStrength ? "Strength" : "Growth Area"}
          </span>
          <p
            style={{
              fontSize: "14px",
              fontWeight: 500,
              margin: 0,
              color: "#111827",
            }}
          >
            {insight.title}
          </p>
        </div>

        <p
          style={{
            fontSize: "13px",
            color: "#4B5563",
            margin: 0,
            lineHeight: 1.6,
          }}
        >
          {insight.message}
        </p>
      </div>
    </div>
  );
}
```

## 5.6 StudentProgressTable Component

The mentor's batch overview table — sortable, filterable,
with alert indicators.
```tsx
// components/dashboard/StudentProgressTable.tsx
"use client";

import { useState, useMemo } from "react";
import { useRouter } from "next/navigation";

type StudentRow = {
  student_id: string;
  full_name: string;
  email: string;
  last_active: string;
  is_flagged: boolean;
  alerts: Array<{ alert_type: string; message: string }>;
  progress: {
    overall_score: number;
    learning_velocity: number;
    content_engagement: number;
    problem_solving: number;
    knowledge_retention: number;
    consistency: number;
    curiosity: number;
    communication: number;
    error_recovery: number;
    conceptual_depth: number;
  };
};

type SortField = keyof StudentRow["progress"] | "full_name" |
  "last_active";
type SortDir = "asc" | "desc";

type Props = {
  students: StudentRow[];
  batchId: string;
};

const DIMENSION_COLUMNS = [
  { key: "overall_score", label: "Overall" },
  { key: "learning_velocity", label: "Velocity" },
  { key: "knowledge_retention", label: "Retention" },
  { key: "conceptual_depth", label: "Depth" },
  { key: "consistency", label: "Consistency" },
  { key: "problem_solving", label: "Problem\nSolving" },
  { key: "content_engagement", label: "Engagement" },
  { key: "curiosity", label: "Curiosity" },
  { key: "communication", label: "Communication" },
  { key: "error_recovery", label: "Recovery" },
];

const ScoreCell = ({ score }: { score: number }) => {
  const color =
    score >= 70 ? "#059669" : score >= 50 ? "#D97706" : "#DC2626";
  const bg =
    score >= 70 ? "#D1FAE5" : score >= 50 ? "#FEF3C7" : "#FEE2E2";

  return (
    <span
      style={{
        display: "inline-block",
        padding: "2px 8px",
        borderRadius: "6px",
        background: bg,
        color,
        fontSize: "13px",
        fontWeight: 600,
        minWidth: "40px",
        textAlign: "center",
      }}
    >
      {Math.round(score)}
    </span>
  );
};

export default function StudentProgressTable({
  students,
  batchId,
}: Props) {
  const router = useRouter();
  const [sortField, setSortField] =
    useState<SortField>("overall_score");
  const [sortDir, setSortDir] = useState<SortDir>("desc");
  const [searchQuery, setSearchQuery] = useState("");
  const [showFlaggedOnly, setShowFlaggedOnly] = useState(false);

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDir(sortDir === "asc" ? "desc" : "asc");
    } else {
      setSortField(field);
      setSortDir("desc");
    }
  };

  const filteredAndSorted = useMemo(() => {
    let result = [...students];

    if (searchQuery) {
      result = result.filter((s) =>
        s.full_name.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }

    if (showFlaggedOnly) {
      result = result.filter((s) => s.is_flagged);
    }

    result.sort((a, b) => {
      let aVal: number | string;
      let bVal: number | string;

      if (sortField === "full_name") {
        aVal = a.full_name;
        bVal = b.full_name;
      } else if (sortField === "last_active") {
        aVal = a.last_active;
        bVal = b.last_active;
      } else {
        aVal = a.progress[sortField as keyof StudentRow["progress"]];
        bVal = b.progress[sortField as keyof StudentRow["progress"]];
      }

      if (sortDir === "asc") return aVal > bVal ? 1 : -1;
      return aVal < bVal ? 1 : -1;
    });

    return result;
  }, [students, searchQuery, showFlaggedOnly, sortField, sortDir]);

  const SortHeader = ({
    field,
    label,
  }: {
    field: SortField;
    label: string;
  }) => (
    <th
      onClick={() => handleSort(field)}
      style={{
        padding: "8px 12px",
        fontSize: "12px",
        fontWeight: 600,
        color: "#6B7280",
        background: "#F9FAFB",
        cursor: "pointer",
        whiteSpace: "pre",
        textAlign: "center",
        borderBottom: "1px solid #E5E7EB",
        userSelect: "none",
      }}
    >
      {label}
      {sortField === field && (
        <span style={{ marginLeft: "4px" }}>
          {sortDir === "asc" ? "↑" : "↓"}
        </span>
      )}
    </th>
  );

  return (
    <div>
      {/* Filters */}
      <div
        style={{
          display: "flex",
          gap: "12px",
          marginBottom: "1rem",
          alignItems: "center",
        }}
      >
        <input
          type="search"
          placeholder="Search students..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          style={{
            padding: "8px 12px",
            borderRadius: "8px",
            border: "1px solid #D1D5DB",
            fontSize: "14px",
            width: "240px",
          }}
        />
        <label
          style={{
            display: "flex",
            alignItems: "center",
            gap: "6px",
            fontSize: "13px",
            color: "#374151",
            cursor: "pointer",
          }}
        >
          <input
            type="checkbox"
            checked={showFlaggedOnly}
            onChange={(e) => setShowFlaggedOnly(e.target.checked)}
          />
          Show flagged only
        </label>
        <span style={{ fontSize: "13px", color: "#6B7280" }}>
          {filteredAndSorted.length} student
          {filteredAndSorted.length !== 1 ? "s" : ""}
        </span>
      </div>

      {/* Table */}
      <div style={{ overflowX: "auto" }}>
        <table
          style={{
            width: "100%",
            borderCollapse: "collapse",
            fontSize: "14px",
          }}
        >
          <thead>
            <tr>
              <SortHeader field="full_name" label="Student" />
              {DIMENSION_COLUMNS.map((col) => (
                <SortHeader
                  key={col.key}
                  field={col.key as SortField}
                  label={col.label}
                />
              ))}
              <SortHeader field="last_active" label="Last Active" />
              <th
                style={{
                  padding: "8px 12px",
                  fontSize: "12px",
                  background: "#F9FAFB",
                  borderBottom: "1px solid #E5E7EB",
                }}
              >
                Alerts
              </th>
            </tr>
          </thead>

          <tbody>
            {filteredAndSorted.map((student) => (
              <tr
                key={student.student_id}
                onClick={() =>
                  router.push(
                    `/mentor/batches/${batchId}/students/` +
                    `${student.student_id}/dashboard`
                  )
                }
                style={{
                  cursor: "pointer",
                  borderBottom: "1px solid #F3F4F6",
                  background: student.is_flagged
                    ? "#FFFBEB"
                    : "white",
                  transition: "background 0.1s",
                }}
                onMouseEnter={(e) => {
                  if (!student.is_flagged) {
                    (e.currentTarget as HTMLTableRowElement).style.background =
                      "#F9FAFB";
                  }
                }}
                onMouseLeave={(e) => {
                  (e.currentTarget as HTMLTableRowElement).style.background =
                    student.is_flagged ? "#FFFBEB" : "white";
                }}
              >
                {/* Name */}
                <td style={{ padding: "10px 12px", whiteSpace: "nowrap" }}>
                  <div style={{ fontWeight: 500 }}>
                    {student.full_name}
                  </div>
                  <div style={{ fontSize: "12px", color: "#9CA3AF" }}>
                    {student.email}
                  </div>
                </td>

                {/* Scores */}
                {DIMENSION_COLUMNS.map((col) => (
                  <td
                    key={col.key}
                    style={{ padding: "10px 12px", textAlign: "center" }}
                  >
                    <ScoreCell
                      score={
                        student.progress[
                          col.key as keyof StudentRow["progress"]
                        ]
                      }
                    />
                  </td>
                ))}

                {/* Last Active */}
                <td
                  style={{
                    padding: "10px 12px",
                    fontSize: "12px",
                    color: "#6B7280",
                    textAlign: "center",
                  }}
                >
                  {new Date(student.last_active).toLocaleDateString(
                    "en-IN",
                    { day: "numeric", month: "short" }
                  )}
                </td>

                {/* Alerts */}
                <td style={{ padding: "10px 12px", textAlign: "center" }}>
                  {student.is_flagged && (
                    <span
                      title={student.alerts
                        .map((a) => a.message)
                        .join(", ")}
                      style={{
                        fontSize: "16px",
                        cursor: "help",
                      }}
                    >
                      ⚠️
                    </span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {filteredAndSorted.length === 0 && (
        <div
          style={{
            textAlign: "center",
            padding: "3rem",
            color: "#9CA3AF",
            fontSize: "14px",
          }}
        >
          No students match your filters
        </div>
      )}
    </div>
  );
}
```

## 5.7 StudentAlertBanner Component

Displayed at the top of the mentor batch dashboard when
there are unresolved student alerts.
```tsx
// components/dashboard/StudentAlertBanner.tsx
"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

type Alert = {
  alert_id: string;
  student_id: string;
  student_name: string;
  alert_type: string;
  severity: string;
  message: string;
  created_at: string;
};

type Props = {
  alerts: Alert[];
  batchId: string;
  onResolve: (alertId: string) => void;
};

export default function StudentAlertBanner({
  alerts,
  batchId,
  onResolve,
}: Props) {
  const router = useRouter();
  const [isExpanded, setIsExpanded] = useState(false);

  if (alerts.length === 0) return null;

  const criticalCount = alerts.filter(
    (a) => a.severity === "CRITICAL"
  ).length;

  const displayAlerts = isExpanded ? alerts : alerts.slice(0, 2);

  return (
    <div
      style={{
        padding: "1rem",
        background: "#FFFBEB",
        borderRadius: "10px",
        border: "1px solid #FDE68A",
        marginBottom: "1.5rem",
      }}
    >
      {/* Header */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          marginBottom: isExpanded ? "1rem" : "0",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
          <span style={{ fontSize: "16px" }}>⚠️</span>
          <p style={{ fontSize: "14px", fontWeight: 500, margin: 0 }}>
            {alerts.length} student
            {alerts.length !== 1 ? "s" : ""} need
            {alerts.length === 1 ? "s" : ""} attention
            {criticalCount > 0 && (
              <span
                style={{
                  marginLeft: "8px",
                  fontSize: "12px",
                  padding: "2px 8px",
                  borderRadius: "9999px",
                  background: "#FEE2E2",
                  color: "#DC2626",
                }}
              >
                {criticalCount} critical
              </span>
            )}
          </p>
        </div>

        <button
          onClick={() => setIsExpanded(!isExpanded)}
          style={{
            fontSize: "13px",
            color: "#92400E",
            background: "none",
            border: "none",
            cursor: "pointer",
          }}
        >
          {isExpanded ? "Show less ↑" : `Show all ${alerts.length} ↓`}
        </button>
      </div>

      {/* Alert list */}
      {isExpanded && (
        <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
          {displayAlerts.map((alert) => (
            <div
              key={alert.alert_id}
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                padding: "8px 12px",
                background: "white",
                borderRadius: "8px",
                border: "1px solid #FDE68A",
              }}
            >
              <div>
                <span style={{ fontSize: "13px", fontWeight: 500 }}>
                  {alert.student_name}:
                </span>
                <span style={{ fontSize: "13px", color: "#6B7280", marginLeft: "6px" }}>
                  {alert.message}
                </span>
              </div>
              <div style={{ display: "flex", gap: "8px" }}>
                <button
                  onClick={() =>
                    router.push(
                      `/mentor/batches/${batchId}/students/` +
                      `${alert.student_id}/dashboard`
                    )
                  }
                  style={{
                    fontSize: "12px",
                    padding: "4px 10px",
                    borderRadius: "6px",
                    border: "1px solid #D1D5DB",
                    background: "white",
                    cursor: "pointer",
                  }}
                >
                  View
                </button>
                <button
                  onClick={() => onResolve(alert.alert_id)}
                  style={{
                    fontSize: "12px",
                    padding: "4px 10px",
                    borderRadius: "6px",
                    border: "none",
                    background: "#059669",
                    color: "white",
                    cursor: "pointer",
                  }}
                >
                  Resolve
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
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
│   └── dashboard.controller.ts
├── services/
│   └── dashboard.service.ts
├── jobs/
│   └── alertGeneration.job.ts
├── utils/
│   └── insights.utils.ts
└── routes/
    └── dashboard.routes.ts
```

## 6.2 Dashboard Service
```typescript
// services/dashboard.service.ts
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

// Dimension weights for overall score calculation
const DIMENSION_WEIGHTS: Record<string, number> = {
  learningVelocityScore: 0.15,
  knowledgeRetentionScore: 0.15,
  conceptualDepthScore: 0.15,
  consistencyScore: 0.15,
  problemSolvingScore: 0.10,
  contentEngagementScore: 0.10,
  curiosityScore: 0.10,
  communicationScore: 0.05,
  errorRecoveryScore: 0.05,
};

export class DashboardService {

  // -------------------------------------------------------
  // GET STUDENT DASHBOARD
  // -------------------------------------------------------
  async getStudentDashboard(studentId: string) {
    // Get enrollment and batch info
    const enrollment = await prisma.enrollment.findFirst({
      where: { studentId, status: "ACTIVE" },
      include: {
        batch: {
          include: {
            mentors: {
              include: {
                mentor: { select: { fullName: true } },
              },
              take: 1,
            },
          },
        },
      },
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

    // Fetch progress history
    const progressHistory = await prisma.studentProgress.findMany({
      where: {
        studentId,
        batchId: batch.id,
      },
      orderBy: { weekNumber: "asc" },
    });

    const currentProgress =
      progressHistory[progressHistory.length - 1] ?? null;
    const previousProgress =
      progressHistory.length >= 2
        ? progressHistory[progressHistory.length - 2]
        : null;

    // Fetch quiz history (last 10 attempts)
    const quizHistory = await prisma.quizAttempt.findMany({
      where: { studentId, batchId: batch.id },
      orderBy: { completedAt: "desc" },
      take: 10,
      include: {
        content: { select: { title: true } },
      },
    });

    // Fetch content engagement
    const contentStats = await this.getContentEngagementStats(
      studentId,
      batch.id
    );

    // Fetch session attendance
    const attendanceStats = await this.getAttendanceStats(
      studentId,
      batch.id
    );

    // Generate insights
    const insights = currentProgress
      ? this.generateInsights(
          currentProgress,
          progressHistory,
          batch.id,
          studentId
        )
      : [];

    const student = await prisma.user.findUnique({
      where: { id: studentId },
      select: {
        id: true,
        fullName: true,
        avatarUrl: true,
        createdAt: true,
      },
    });

    return {
      student: {
        student_id: student!.id,
        full_name: student!.fullName,
        avatar_url: student!.avatarUrl,
        enrolled_at: enrollment.enrolledAt,
      },
      batch: {
        batch_id: batch.id,
        name: batch.name,
        current_week: currentWeek,
        total_weeks: totalWeeks,
        weeks_remaining: Math.max(
          0,
          totalWeeks - (currentWeek ?? 0)
        ),
        mentor_name:
          batch.mentors[0]?.mentor?.fullName ?? null,
      },
      current_scores: currentProgress
        ? this.formatProgressRecord(currentProgress)
        : null,
      previous_scores: previousProgress
        ? this.formatProgressRecord(previousProgress)
        : null,
      score_history: progressHistory.map((p) =>
        this.formatProgressRecord(p)
      ),
      insights,
      quiz_history: quizHistory.map((a) => ({
        attempt_id: a.attemptId,
        content_title: a.content.title,
        quiz_type: a.quizType,
        score_percentage: Number(a.scorePercentage),
        completed_at: a.completedAt,
      })),
      content_engagement: contentStats,
      session_attendance: attendanceStats,
    };
  }

  // -------------------------------------------------------
  // GET BATCH STUDENTS PROGRESS (Mentor View)
  // -------------------------------------------------------
  async getBatchStudentsProgress(
    batchId: string,
    options: {
      sort_by?: string;
      sort_dir?: string;
      search?: string;
      flagged?: boolean;
      page: number;
      limit: number;
    }
  ) {
    // Get current week for this batch
    const batch = await prisma.batch.findUnique({
      where: { id: batchId },
      select: { startDate: true, endDate: true },
    });

    if (!batch) {
      throw { code: "BATCH_NOT_FOUND", statusCode: 404 };
    }

    const currentWeek = this.calculateCurrentWeek(
      batch.startDate,
      batch.endDate
    );

    // Get all active enrollments
    const enrollmentWhere: any = {
      batchId,
      status: "ACTIVE",
    };

    if (options.search) {
      enrollmentWhere.student = {
        fullName: {
          contains: options.search,
          mode: "insensitive",
        },
      };
    }

    const [enrollments, totalCount] = await Promise.all([
      prisma.enrollment.findMany({
        where: enrollmentWhere,
        include: {
          student: {
            select: {
              id: true,
              fullName: true,
              email: true,
              avatarUrl: true,
              lastLoginAt: true,
            },
          },
        },
      }),
      prisma.enrollment.count({ where: enrollmentWhere }),
    ]);

    // Get latest progress for all students
    const studentIds = enrollments.map((e) => e.studentId);

    const latestProgress = await prisma.studentProgress.findMany({
      where: {
        batchId,
        studentId: { in: studentIds },
        weekNumber: currentWeek ?? 1,
      },
    });

    const progressMap = Object.fromEntries(
      latestProgress.map((p) => [p.studentId, p])
    );

    // Get unresolved alerts
    const alerts = await prisma.studentAlert.findMany({
      where: {
        batchId,
        studentId: { in: studentIds },
        isResolved: false,
      },
    });

    const alertMap: Record<string, any[]> = {};
    for (const alert of alerts) {
      if (!alertMap[alert.studentId]) alertMap[alert.studentId] = [];
      alertMap[alert.studentId].push({
        alert_type: alert.alertType,
        severity: alert.severity,
        message: alert.message,
        created_at: alert.createdAt,
      });
    }

    let students = enrollments.map((enrollment) => {
      const progress = progressMap[enrollment.studentId];
      const studentAlerts = alertMap[enrollment.studentId] ?? [];

      return {
        student_id: enrollment.student.id,
        full_name: enrollment.student.fullName,
        email: enrollment.student.email,
        avatar_url: enrollment.student.avatarUrl,
        last_active: enrollment.student.lastLoginAt,
        is_flagged: studentAlerts.length > 0,
        alerts: studentAlerts,
        progress: progress
          ? {
              week_number: progress.weekNumber,
              overall_score: Number(progress.overallScore),
              learning_velocity: Number(
                progress.learningVelocityScore
              ),
              content_engagement: Number(
                progress.contentEngagementScore
              ),
              problem_solving: Number(
                progress.problemSolvingScore
              ),
              knowledge_retention: Number(
                progress.knowledgeRetentionScore
              ),
              consistency: Number(progress.consistencyScore),
              curiosity: Number(progress.curiosityScore),
              communication: Number(
                progress.communicationScore
              ),
              error_recovery: Number(
                progress.errorRecoveryScore
              ),
              conceptual_depth: Number(
                progress.conceptualDepthScore
              ),
            }
          : this.getEmptyProgress(),
      };
    });

    // Filter flagged if requested
    if (options.flagged) {
      students = students.filter((s) => s.is_flagged);
    }

    // Sort
    const sortField = options.sort_by ?? "overall_score";
    const sortDir = options.sort_dir ?? "desc";

    students.sort((a, b) => {
      const aVal =
        sortField === "full_name"
          ? a.full_name
          : sortField === "last_active"
          ? a.last_active?.toString() ?? ""
          : (a.progress as any)[sortField] ?? 0;

      const bVal =
        sortField === "full_name"
          ? b.full_name
          : sortField === "last_active"
          ? b.last_active?.toString() ?? ""
          : (b.progress as any)[sortField] ?? 0;

      if (sortDir === "asc") return aVal > bVal ? 1 : -1;
      return aVal < bVal ? 1 : -1;
    });

    // Paginate
    const total = students.length;
    const paginatedStudents = students.slice(
      (options.page - 1) * options.limit,
      options.page * options.limit
    );

    // Batch summary
    const scores = students
      .map((s) => s.progress.overall_score)
      .filter((s) => s > 0);

    const batchAvgScore =
      scores.length > 0
        ? scores.reduce((sum, s) => sum + s, 0) / scores.length
        : 0;

    return {
      batch_summary: {
        total_students: totalCount,
        active_students: students.length,
        flagged_students: students.filter((s) => s.is_flagged)
          .length,
        batch_average_score: Math.round(batchAvgScore * 10) / 10,
        current_week: currentWeek,
      },
      students: paginatedStudents,
      pagination: {
        page: options.page,
        limit: options.limit,
        total,
        total_pages: Math.ceil(total / options.limit),
      },
    };
  }

  // -------------------------------------------------------
  // GENERATE INSIGHTS
  // -------------------------------------------------------
  private generateInsights(
    currentProgress: any,
    history: any[],
    batchId: string,
    studentId: string
  ) {
    const insights: any[] = [];

    const scores = {
      learning_velocity: Number(
        currentProgress.learningVelocityScore
      ),
      content_engagement: Number(
        currentProgress.contentEngagementScore
      ),
      problem_solving: Number(
        currentProgress.problemSolvingScore
      ),
      knowledge_retention: Number(
        currentProgress.knowledgeRetentionScore
      ),
      consistency: Number(currentProgress.consistencyScore),
      curiosity: Number(currentProgress.curiosityScore),
      communication: Number(
        currentProgress.communicationScore
      ),
      error_recovery: Number(
        currentProgress.errorRecoveryScore
      ),
      conceptual_depth: Number(
        currentProgress.conceptualDepthScore
      ),
    };

    // Find top 2 and bottom 2 dimensions
    const sorted = Object.entries(scores).sort(
      ([, a], [, b]) => b - a
    );

    const top2 = sorted.slice(0, 2);
    const bottom2 = sorted.slice(-2);

    // Generate strength insights
    const STRENGTH_MESSAGES: Record<string, (score: number) => string> =
      {
        consistency: (s) =>
          `You have completed ${Math.round(s)}% of scheduled activities
           on time. This puts you ahead of most peers in discipline 
           and reliability.`,
        learning_velocity: (s) =>
          `Your quiz scores have been improving consistently, 
           showing strong upward momentum. You are learning 
           at a healthy pace.`,
        knowledge_retention: (s) =>
          `You are retaining information well over time. 
           Your retention quiz scores show that knowledge 
           is sticking, not just passing through.`,
        error_recovery: (s) =>
          `When you score poorly on a quiz, you tend to come back 
           stronger. This resilience is a strong predictor of 
           long-term professional success.`,
        conceptual_depth: (s) =>
          `You are not just memorizing — you can apply concepts to 
           new situations. Your application-level question scores are 
           strong relative to recall scores.`,
        content_engagement: (s) =>
          `You are engaging deeply with content, going beyond just 
           watching videos once. High rewatch rates and completion 
           percentages show genuine effort.`,
        curiosity: (s) =>
          `You regularly explore beyond the required curriculum.
           This self-directed learning habit will serve you 
           exceptionally well in your career.`,
        problem_solving: (s) =>
          `Your approach to problems shows systematic thinking.
           You think before you answer rather than guessing, 
           which leads to better outcomes.`,
        communication: (s) =>
          `Your written explanations and forum contributions are 
           clear and helpful. Strong communication skills will 
           differentiate you in any professional environment.`,
      };

    const GROWTH_MESSAGES: Record<string, (score: number) => string> = {
      consistency: (s) =>
        `Your engagement has been irregular. Try logging in at the same 
         time each day and treating the content schedule as a commitment,
         not a suggestion.`,
      learning_velocity: (s) =>
        `Your quiz scores have not been improving as quickly as they 
         could. After each quiz, spend 5 minutes reviewing incorrect 
         answers and the related transcript section.`,
      knowledge_retention: (s) =>
        `You may be cramming rather than learning. Try spacing out 
         your content consumption — watch one video thoroughly rather 
         than rushing through multiple in one sitting.`,
      error_recovery: (s) =>
        `After a poor quiz result, your engagement tends to drop. 
         Try treating poor results as information, not judgment — 
         they show you exactly what to review.`,
      conceptual_depth: (s) =>
        `You are scoring well on recall questions but struggling 
         with application. Try asking yourself "how would I use this 
         in a real project?" after learning each concept.`,
      content_engagement: (s) =>
        `You are watching content at a surface level. Try pausing 
         the video and summarizing each section in your own words 
         before continuing.`,
      curiosity: (s) =>
        `You are sticking only to required content. Explore the 
         supplementary materials and reference links provided — 
         they often contain the most valuable insights.`,
      problem_solving: (s) =>
        `You may be answering questions too quickly. Try spending at 
         least 30 seconds thinking through each option before selecting 
         an answer.`,
      communication: (s) =>
        `Practice articulating concepts in writing. When you learn 
         something new, try writing a one-paragraph explanation as if 
         teaching it to someone else.`,
    };

    for (const [dimension, score] of top2) {
      if (score > 60 && STRENGTH_MESSAGES[dimension]) {
        insights.push({
          type: "STRENGTH",
          dimension,
          title: this.getDimensionLabel(dimension),
          message: STRENGTH_MESSAGES[dimension](score),
        });
      }
    }

    for (const [dimension, score] of bottom2) {
      if (score < 65 && GROWTH_MESSAGES[dimension]) {
        insights.push({
          type: "GROWTH_AREA",
          dimension,
          title: `${this.getDimensionLabel(dimension)} needs attention`,
          message: GROWTH_MESSAGES[dimension](score),
        });
      }
    }

    return insights.slice(0, 5);
  }

  // -------------------------------------------------------
  // PRIVATE HELPERS
  // -------------------------------------------------------

  private async getContentEngagementStats(
    studentId: string,
    batchId: string
  ) {
    const totalContent = await prisma.content.count({
      where: { batchId, isPublished: true, deletedAt: null },
    });

    const accessLogs = await prisma.contentAccessLog.findMany({
      where: { studentId, batchId },
      select: {
        isCompleted: true,
        completionPercentage: true,
      },
    });

    const completed = accessLogs.filter((l) => l.isCompleted).length;
    const inProgress = accessLogs.filter(
      (l) =>
        !l.isCompleted && Number(l.completionPercentage) > 0
    ).length;
    const notStarted = totalContent - accessLogs.length;

    const avgWatchPercentage =
      accessLogs.length > 0
        ? accessLogs.reduce(
            (sum, l) => sum + Number(l.completionPercentage),
            0
          ) / accessLogs.length
        : 0;

    return {
      total_content_items: totalContent,
      completed,
      in_progress: inProgress,
      not_started: notStarted,
      completion_rate:
        totalContent > 0
          ? Math.round((completed / totalContent) * 1000) / 10
          : 0,
      average_watch_percentage: Math.round(avgWatchPercentage * 10) / 10,
    };
  }

  private async getAttendanceStats(
    studentId: string,
    batchId: string
  ) {
    const sessions = await prisma.liveSession.findMany({
      where: { batchId, status: "COMPLETED" },
      include: {
        attendance: {
          where: { studentId },
        },
      },
    });

    const total = sessions.length;
    if (total === 0) {
      return {
        total_sessions: 0,
        attended_live: 0,
        attended_recording: 0,
        absent: 0,
        attendance_rate: 0,
      };
    }

    const attendedLive = sessions.filter(
      (s) =>
        s.attendance.length > 0 &&
        s.attendance[0].status === "ATTENDED"
    ).length;

    const attendedRecording = sessions.filter(
      (s) =>
        s.attendance.length > 0 &&
        s.attendance[0].status === "ATTENDED_RECORDING"
    ).length;

    const absent = total - attendedLive - attendedRecording;

    return {
      total_sessions: total,
      attended_live: attendedLive,
      attended_recording: attendedRecording,
      absent,
      attendance_rate:
        Math.round(
          ((attendedLive + attendedRecording) / total) * 1000
        ) / 10,
    };
  }

  private formatProgressRecord(progress: any) {
    return {
      week_number: progress.weekNumber,
      overall_score: Number(progress.overallScore),
      learning_velocity: Number(progress.learningVelocityScore),
      content_engagement: Number(progress.contentEngagementScore),
      problem_solving: Number(progress.problemSolvingScore),
      knowledge_retention: Number(progress.knowledgeRetentionScore),
      consistency: Number(progress.consistencyScore),
      curiosity: Number(progress.curiosityScore),
      communication: Number(progress.communicationScore),
      error_recovery: Number(progress.errorRecoveryScore),
      conceptual_depth: Number(progress.conceptualDepthScore),
      soft_skills: Number(progress.softSkillsScore),
      calculated_at: progress.calculatedAt,
    };
  }

  private getEmptyProgress() {
    return {
      week_number: 0,
      overall_score: 0,
      learning_velocity: 0,
      content_engagement: 0,
      problem_solving: 0,
      knowledge_retention: 0,
      consistency: 0,
      curiosity: 0,
      communication: 0,
      error_recovery: 0,
      conceptual_depth: 0,
    };
  }

  private getDimensionLabel(dimension: string): string {
    const labels: Record<string, string> = {
      learning_velocity: "Learning Velocity",
      content_engagement: "Content Engagement",
      problem_solving: "Problem Solving",
      knowledge_retention: "Knowledge Retention",
      consistency: "Consistency",
      curiosity: "Curiosity",
      communication: "Communication",
      error_recovery: "Error Recovery",
      conceptual_depth: "Conceptual Depth",
    };
    return labels[dimension] ?? dimension;
  }

  private calculateCurrentWeek(
    startDate: Date,
    endDate: Date
  ): number | null {
    const now = new Date();
    if (now < startDate) return null;
    if (now > endDate) {
      return this.calculateTotalWeeks(startDate, endDate);
    }
    return (
      Math.floor(
        (now.getTime() - startDate.getTime()) /
          (7 * 24 * 60 * 60 * 1000)
      ) + 1
    );
  }

  private calculateTotalWeeks(
    startDate: Date,
    endDate: Date
  ): number {
    return Math.ceil(
      (endDate.getTime() - startDate.getTime()) /
        (7 * 24 * 60 * 60 * 1000)
    );
  }
}
```

## 6.3 Alert Generation Job

Runs nightly to create alerts for students requiring mentor
attention.
```typescript
// jobs/alertGeneration.job.ts
import { PrismaClient } from "@prisma/client";
import { notificationService } from
  "../services/notification.service";

const prisma = new PrismaClient();

export const runAlertGenerationJob = async () => {
  console.log(
    `[AlertJob] Running at ${new Date().toISOString()}`
  );

  const activeBatches = await prisma.batch.findMany({
    where: { status: "ACTIVE" },
    include: {
      enrollments: {
        where: { status: "ACTIVE" },
        include: {
          student: {
            select: { id: true, fullName: true, lastLoginAt: true },
          },
        },
      },
      mentors: { select: { mentorId: true } },
    },
  });

  for (const batch of activeBatches) {
    const currentWeek = calculateCurrentWeek(
      batch.startDate,
      batch.endDate
    );

    for (const enrollment of batch.enrollments) {
      const student = enrollment.student;
      const threeDaysAgo = new Date(
        Date.now() - 3 * 24 * 60 * 60 * 1000
      );

      // Check 1: INACTIVE
      const isInactive =
        !student.lastLoginAt ||
        student.lastLoginAt < threeDaysAgo;

      if (isInactive) {
        await createAlertIfNotExists({
          studentId: student.id,
          batchId: batch.id,
          alertType: "INACTIVE",
          severity: "WARNING",
          message: `${student.fullName} has not logged in for 3+ days`,
          metadata: {
            last_login: student.lastLoginAt,
            days_inactive: student.lastLoginAt
              ? Math.floor(
                  (Date.now() - student.lastLoginAt.getTime()) /
                    (24 * 60 * 60 * 1000)
                )
              : null,
          },
        });
      }

      // Check 2: SCORE DROP
      if (currentWeek && currentWeek >= 2) {
        const [currentWeekProgress, previousWeekProgress] =
          await Promise.all([
            prisma.studentProgress.findUnique({
              where: {
                studentId_batchId_weekNumber: {
                  studentId: student.id,
                  batchId: batch.id,
                  weekNumber: currentWeek,
                },
              },
            }),
            prisma.studentProgress.findUnique({
              where: {
                studentId_batchId_weekNumber: {
                  studentId: student.id,
                  batchId: batch.id,
                  weekNumber: currentWeek - 1,
                },
              },
            }),
          ]);

        if (currentWeekProgress && previousWeekProgress) {
          const drop =
            Number(previousWeekProgress.overallScore) -
            Number(currentWeekProgress.overallScore);

          if (drop >= 15) {
            await createAlertIfNotExists({
              studentId: student.id,
              batchId: batch.id,
              alertType: "SCORE_DROP",
              severity: "WARNING",
              message: `${student.fullName}'s overall score dropped 
                        by ${Math.round(drop)} points this week`,
              metadata: {
                previous_score: Number(
                  previousWeekProgress.overallScore
                ),
                current_score: Number(
                  currentWeekProgress.overallScore
                ),
                drop_amount: drop,
              },
            });
          }
        }
      }

      // Check 3: STRUGGLING (last 3 quizzes all below 50%)
      const recentAttempts = await prisma.quizAttempt.findMany({
        where: { studentId: student.id, batchId: batch.id },
        orderBy: { completedAt: "desc" },
        take: 3,
        select: { scorePercentage: true },
      });

      if (
        recentAttempts.length === 3 &&
        recentAttempts.every(
          (a) => Number(a.scorePercentage) < 50
        )
      ) {
        await createAlertIfNotExists({
          studentId: student.id,
          batchId: batch.id,
          alertType: "STRUGGLING",
          severity: "WARNING",
          message: `${student.fullName} has scored below 50% 
                    on their last 3 quizzes`,
          metadata: {
            scores: recentAttempts.map((a) =>
              Number(a.scorePercentage)
            ),
          },
        });
      }
    }

    // Notify mentors about new alerts
    const newAlerts = await prisma.studentAlert.findMany({
      where: {
        batchId: batch.id,
        isResolved: false,
        createdAt: {
          gte: new Date(Date.now() - 24 * 60 * 60 * 1000),
        },
      },
    });

    if (newAlerts.length > 0) {
      for (const mentorAssignment of batch.mentors) {
        await notificationService.send({
          userId: mentorAssignment.mentorId,
          type: "STUDENT_ALERTS",
          title: "Students Need Attention",
          message: `${newAlerts.length} student${
            newAlerts.length !== 1 ? "s" : ""
          } in your batch require${
            newAlerts.length === 1 ? "s" : ""
          } attention.`,
          metadata: { batch_id: batch.id, alert_count: newAlerts.length },
        });
      }
    }
  }

  console.log(`[AlertJob] Completed`);
};

const createAlertIfNotExists = async (data: {
  studentId: string;
  batchId: string;
  alertType: string;
  severity: string;
  message: string;
  metadata: Record<string, any>;
}) => {
  // Check if a similar unresolved alert already exists from today
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const existing = await prisma.studentAlert.findFirst({
    where: {
      studentId: data.studentId,
      batchId: data.batchId,
      alertType: data.alertType as any,
      isResolved: false,
      createdAt: { gte: today },
    },
  });

  if (!existing) {
    await prisma.studentAlert.create({
      data: {
        studentId: data.studentId,
        batchId: data.batchId,
        alertType: data.alertType as any,
        severity: data.severity as any,
        message: data.message,
        metadata: data.metadata,
      },
    });
  }
};

const calculateCurrentWeek = (
  startDate: Date,
  endDate: Date
): number | null => {
  const now = new Date();
  if (now < startDate || now > endDate) return null;
  return (
    Math.floor(
      (now.getTime() - startDate.getTime()) /
        (7 * 24 * 60 * 60 * 1000)
    ) + 1
  );
};
```

## 6.4 Dashboard Routes
```typescript
// routes/dashboard.routes.ts
import { Router } from "express";
import { DashboardController } from
  "../controllers/dashboard.controller";
import { authenticate } from
  "../middleware/authenticate.middleware";
import { authorize } from "../middleware/authorize.middleware";

const router = Router();
const controller = new DashboardController();

router.use(authenticate);

// Student's own dashboard
router.get(
  "/students/me/dashboard",
  authorize(["STUDENT"]),
  controller.getMyDashboard
);

router.get(
  "/students/me/progress/history",
  authorize(["STUDENT"]),
  controller.getMyProgressHistory
);

// Mentor views specific student
router.get(
  "/students/:studentId/dashboard",
  authorize(["MENTOR", "ADMIN", "SUPER_ADMIN"]),
  controller.getStudentDashboard
);

// Dimension detail
router.get(
  "/students/:studentId/dimensions/:dimension",
  authorize(["STUDENT", "MENTOR", "ADMIN", "SUPER_ADMIN"]),
  controller.getDimensionDetail
);

// Batch progress overview (mentor)
router.get(
  "/batches/:batchId/students/progress",
  authorize(["MENTOR", "ADMIN", "SUPER_ADMIN"]),
  controller.getBatchStudentsProgress
);

// Alerts
router.get(
  "/batches/:batchId/alerts",
  authorize(["MENTOR", "ADMIN", "SUPER_ADMIN"]),
  controller.getBatchAlerts
);

router.post(
  "/batches/:batchId/alerts/:alertId/resolve",
  authorize(["MENTOR", "ADMIN", "SUPER_ADMIN"]),
  controller.resolveAlert
);

export default router;
```

---

# 7. Implementation Steps

## 7.1 Step-by-Step Build Order

### Step 1 — Database Schema (Day 1)

Add two tables to Prisma schema:
- student_progress (read by this feature, written by Feature 09)
- student_alerts (created by nightly job, resolved by mentors)

Run migration:
```bash
npx prisma migrate dev --name add_dashboard_tables
```

### Step 2 — Dashboard Service — Student View (Day 1)

Build and test:
1. `getStudentDashboard()` — test with enrolled and
   non-enrolled student
2. `getContentEngagementStats()` — test with various
   access log states
3. `getAttendanceStats()` — test with various attendance states
4. `generateInsights()` — test insight generation for various
   score patterns

### Step 3 — Dashboard Service — Mentor View (Day 2)

Build and test:
1. `getBatchStudentsProgress()` — test with sort, filter,
   pagination
2. Alert aggregation into student rows
3. Batch summary calculation

### Step 4 — Alert Generation Job (Day 2)

Build `jobs/alertGeneration.job.ts`.
Schedule it with node-cron:
```typescript
// Run every day at 2 AM (after metrics calculation)
cron.schedule("0 2 * * *", runAlertGenerationJob);
```

Test each alert condition manually:
1. Set a student's last_login to 4 days ago → verify INACTIVE alert
2. Create two StudentProgress records with 20-point drop → verify
   SCORE_DROP alert
3. Create 3 quiz attempts all below 50% → verify STRUGGLING alert

### Step 5 — Controllers and Routes (Day 2)

Wire up all controllers and routes. Test every endpoint.

### Step 6 — Frontend — RadarChart (Day 3)

Build the SVG-based RadarChart component from section 5.2.
Test with various score distributions — verify the polygon
renders correctly for all-high, all-low, and mixed scores.

### Step 7 — Frontend — Dimension Components (Day 3)

Build:
1. `DimensionCard` with score, trend, and color coding
2. `DimensionTrendChart` SVG line chart
3. `InsightCard` with strength/growth area styling

### Step 8 — Frontend — Student Dashboard Page (Day 4)

Assemble the student dashboard page using all components.
Build the `useStudentDashboard` hook for data fetching.

### Step 9 — Frontend — Mentor Dashboard (Day 4)

Build:
1. `StudentProgressTable` with sorting, filtering, colors
2. `StudentAlertBanner` with expand/collapse
3. Mentor batch dashboard page

### Step 10 — Integration Testing (Day 5)

Test complete dashboard:
1. Verify student dashboard shows correct scores after
   Feature 09 has run
2. Verify radar chart renders without crashes for
   zero-score state
3. Verify mentor table sorts correctly by each column
4. Verify alert banner appears with correct counts
5. Verify resolving an alert removes it from the list
6. Test insight generation for students with various profiles

---

# 8. Error Handling

## 8.1 Error Code Reference
```
NOT_ENROLLED             : 404 — Student not in any active batch
BATCH_NOT_FOUND          : 404 — Batch does not exist
STUDENT_NOT_FOUND        : 404 — Student ID does not exist
ALERT_NOT_FOUND          : 404 — Alert ID does not exist
PERMISSION_DENIED        : 403 — Accessing another student's data
NO_PROGRESS_DATA         : 200 — No scores yet (not an error,
                                  return empty state gracefully)
INVALID_DIMENSION        : 400 — Dimension name not recognized
```

## 8.2 Empty State Handling

When a student has not yet taken any quizzes or accessed any
content, the dashboard must display a meaningful empty state
rather than a broken visualization:

- Radar chart: show the grid but with a message overlay
  "Complete your first quiz to see your learning profile"
- Dimension cards: show 0 scores with a "Not yet calculated" label
- Insights: show "Your insights will appear after you complete
  your first week of activities"
- Trend charts: show "Not enough data yet — check back after
  Week 2"

This empty state handling is critical for new students in Week 1
who have not yet generated any assessment data.

---

# 9. Testing Strategy

## 9.1 Unit Tests
```typescript
// tests/dashboard.service.test.ts

describe("DashboardService.generateInsights", () => {

  it("should generate strength insight for high consistency", () => {
    const mockProgress = {
      consistencyScore: 85,
      learningVelocityScore: 50,
      knowledgeRetentionScore: 50,
      conceptualDepthScore: 50,
      problemSolvingScore: 50,
      contentEngagementScore: 50,
      curiosityScore: 50,
      communicationScore: 50,
      errorRecoveryScore: 50,
    };

    const insights = (dashboardService as any).generateInsights(
      mockProgress,
      [mockProgress],
      "batch-uuid",
      "student-uuid"
    );

    const consistencyInsight = insights.find(
      (i: any) => i.dimension === "consistency"
    );

    expect(consistencyInsight).toBeDefined();
    expect(consistencyInsight.type).toBe("STRENGTH");
  });

  it("should generate growth area for low curiosity", () => {
    const mockProgress = {
      consistencyScore: 50,
      learningVelocityScore: 50,
      knowledgeRetentionScore: 50,
      conceptualDepthScore: 50,
      problemSolvingScore: 50,
      contentEngagementScore: 50,
      curiosityScore: 25,
      communicationScore: 50,
      errorRecoveryScore: 50,
    };

    const insights = (dashboardService as any).generateInsights(
      mockProgress,
      [mockProgress],
      "batch-uuid",
      "student-uuid"
    );

    const curiosityInsight = insights.find(
      (i: any) => i.dimension === "curiosity"
    );

    expect(curiosityInsight).toBeDefined();
    expect(curiosityInsight.type).toBe("GROWTH_AREA");
  });
});

describe("Alert Generation Job", () => {

  it("should create INACTIVE alert for student not logged in 3+ days",
    async () => {
      const threeDaysAgo = new Date(
        Date.now() - 4 * 24 * 60 * 60 * 1000
      );

      prismaMock.user.findUnique.mockResolvedValue({
        lastLoginAt: threeDaysAgo,
        fullName: "Test Student",
      } as any);

      prismaMock.studentAlert.findFirst.mockResolvedValue(null);
      prismaMock.studentAlert.create.mockResolvedValue({} as any);

      await runAlertGenerationJob();

      expect(prismaMock.studentAlert.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            alertType: "INACTIVE",
          }),
        })
      );
    }
  );
});
```

---

# 10. Code Examples

## 10.1 How to Read StudentProgress from Another Feature

Other features that need to display or use progress scores
should read from the student_progress table directly, without
going through the dashboard service:
```typescript
// Example: Reading progress in a notification system
const getStudentCurrentScores = async (
  studentId: string,
  batchId: string
) => {
  const latestProgress = await prisma.studentProgress.findFirst({
    where: { studentId, batchId },
    orderBy: { weekNumber: "desc" },
  });

  if (!latestProgress) return null;

  return {
    overall: Number(latestProgress.overallScore),
    consistency: Number(latestProgress.consistencyScore),
    learning_velocity: Number(latestProgress.learningVelocityScore),
  };
};
```

---

# 11. Performance Optimization

## 11.1 Dashboard Data Caching

The student dashboard aggregates data from 6 different tables:
student_progress, quiz_attempts, content_access_logs,
session_attendance, live_sessions, and enrollments. This results
in 6+ database queries per dashboard load.

For Phase One with under 500 students, this is acceptable.
For Phase Two, cache the dashboard response in Redis with a
5-minute TTL per student:
```typescript
const DASHBOARD_CACHE_KEY = (studentId: string) =>
  `dashboard:student:${studentId}`;
const DASHBOARD_CACHE_TTL = 5 * 60; // 5 minutes

// Invalidate on quiz submission, content access, or
// score recalculation
const invalidateStudentDashboardCache = async (
  studentId: string
) => {
  await redis.del(DASHBOARD_CACHE_KEY(studentId));
};
```

## 11.2 Batch Progress Table Query

The mentor batch progress table fetches progress for all students
simultaneously using a single findMany with studentId IN query,
then builds a map. This is O(1) lookups per student rather than
N separate queries.

For batches with 500+ students, add a cursor-based pagination
approach rather than offset pagination to maintain consistent
performance as the table grows.

## 11.3 RadarChart SVG Performance

The radar chart is a pure SVG component with no external
dependencies. It renders server-side in Next.js and is
hydrated on the client. No canvas, no D3, no Chart.js.
This keeps bundle size minimal and renders instantly.

For dashboards with multiple trend charts (9 dimensions),
use React's useMemo to memoize the SVG path calculations
and prevent re-renders when unrelated state changes.

---

**End of Feature 08 — Student Progress Dashboard**

---

**Document Information**

| Field | Value |
|-------|-------|
| Feature | F08 — Student Progress Dashboard |
| Version | 1.0 |
| Status | Ready for Development |
| Folder | F08_Progress_Dashboard/ |
| Filename | F08_Implementation_Guide.md |
| Previous Feature | F07_Quiz_Taking/ |
| Next Feature | F09_Metrics_Engine/F09_Implementation_Guide.md |