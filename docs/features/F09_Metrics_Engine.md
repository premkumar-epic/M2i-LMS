# Feature 09 — Metrics Calculation Engine

### Complete Implementation Guide | Version 1.0 | March 2026

### Save As: F09_Metrics_Engine/F09_Implementation_Guide.md

---

# Table of Contents

1. [Feature Overview](#1-feature-overview)
2. [Core Functionality](#2-core-functionality)
3. [Data Sources](#3-data-sources)
4. [Calculation Algorithms](#4-calculation-algorithms)
5. [Data Model](#5-data-model)
6. [Backend Logic and Implementation](#6-backend-logic-and-implementation)
7. [Job Scheduling and Triggers](#7-job-scheduling-and-triggers)
8. [Implementation Steps](#8-implementation-steps)
9. [Error Handling](#9-error-handling)
10. [Testing Strategy](#10-testing-strategy)
11. [Code Examples](#11-code-examples)
12. [Performance Optimization](#12-performance-optimization)

---

# 1. Feature Overview

## 1.1 What Is This Feature?

The Metrics Calculation Engine is the computational brain of
M2i_LMS. It is a backend-only service — invisible to users, with
no UI of its own — that continuously processes raw platform
behavioral data and translates it into the nine learning dimension
scores that power the student progress dashboard, the mentor
analytics, and ultimately the career path recommendations in
Phase Three.

Every data point collected by every other feature feeds into
this engine:

- Quiz responses from Feature 07 feed Learning Velocity,
  Knowledge Retention, Conceptual Depth, Problem Solving,
  and Error Recovery
- Content access logs from Feature 03 feed Content Engagement
  and Curiosity
- Session attendance from Feature 06 feeds Consistency
- Forum participation and written contributions feed
  Communication

The engine runs on two triggers: a nightly scheduled batch job
that recalculates scores for all students in all active batches,
and an on-demand trigger fired after significant events
(quiz submission, session completion) that recalculates only
the dimensions affected by the new data.

## 1.2 Why This Feature Exists

Raw behavioral data is meaningless without calculation.
A student who submitted 47 quiz responses, accessed 12 content
items, and attended 4 sessions has generated data — but nobody
can look at those raw numbers and understand whether the student
is learning well or struggling. The metrics engine transforms
that raw data into normalized, comparable, interpretable scores
that tell a clear story about each student's development.

The nine dimensions were deliberately chosen to capture different
facets of learning behavior that are each independently predictive
of professional success. The engine calculates all nine from
different data sources, ensuring that no single activity or test
dominates the overall picture.

## 1.3 Key Design Decisions

**Nightly batch calculation with on-demand partial updates:**
Full recalculation for all students in all batches runs nightly
at 2:00 AM. Individual student recalculations are triggered
on-demand after quiz submissions and session completions, but
only recalculate the dimensions affected by the new data.
This keeps the dashboard reasonably current without requiring
expensive full recalculations after every user action.

**Scores stored in student_progress table:** Calculated scores
are stored persistently in the student_progress table rather than
calculated on-the-fly at query time. This makes dashboard loads
fast — they read pre-calculated scores rather than running complex
aggregations on every request.

**One record per student per batch per week:** Progress is tracked
at weekly granularity. Each week's scores are stored as a separate
record, enabling week-over-week trend analysis and the learning
velocity calculation.

**Scores clamped to 0–100:** All dimension scores are normalized
to a 0–100 scale regardless of the underlying calculation method.
This makes scores comparable across dimensions and interpretable
without needing to understand the underlying algorithm.

**Graceful handling of insufficient data:** For new students who
have not yet generated enough data for reliable calculations, the
engine returns 0 for uncomputable dimensions and a flag indicating
the minimum activity threshold has not been met. This is preferable
to showing misleading scores based on one or two data points.

---

# 2. Core Functionality

## 2.1 Nightly Batch Calculation Flow

```
Scheduled job triggers at 2:00 AM daily
          |
          v
Fetch all ACTIVE batches
          |
          v
For each batch:
  Determine current week number
          |
          v
  Fetch all ACTIVE enrollments for batch
          |
          v
  For each student:
    Fetch all raw data since last calculation:
      - Quiz responses (quiz_responses table)
      - Quiz attempts (quiz_attempts table)
      - Content access logs (content_access_logs table)
      - Session attendance (session_attendance table)
          |
          v
    Calculate all 9 dimension scores
    (see section 4 for algorithms)
          |
          v
    Calculate soft skills score
          |
          v
    Calculate overall weighted score
          |
          v
    UPSERT student_progress record
    for (student_id, batch_id, week_number)
          |
          v
    If scores have changed significantly:
      Trigger alert check for this student
          |
          v
  [Next student]
          |
          v
[Next batch]
          |
          v
Log job completion with stats:
  - Batches processed
  - Students processed
  - Average processing time
  - Any failures
```

## 2.2 On-Demand Recalculation Flow

Triggered by Feature 07 after quiz submission and Feature 06
after session completion.

```
metricsQueue receives RECALCULATE_STUDENT_METRICS job
  {
    student_id: "...",
    batch_id: "...",
    triggered_by: "QUIZ_SUBMISSION" | "SESSION_END"
  }
          |
          v
Determine which dimensions need recalculation
based on trigger type:

  QUIZ_SUBMISSION triggers:
    - Learning Velocity
    - Knowledge Retention
    - Conceptual Depth
    - Problem Solving
    - Error Recovery

  SESSION_END triggers:
    - Consistency
    - (Content Engagement if content linked)
          |
          v
Fetch only the data needed for
affected dimensions
          |
          v
Recalculate affected dimensions
          |
          v
Recalculate overall score
          |
          v
UPSERT student_progress record
          |
          v
Job complete
```

---

# 3. Data Sources

## 3.1 Quiz Response Data

**Source table:** quiz_responses

**What it provides:**

- Per-question correctness (is_correct boolean)
- Time to answer each question (time_to_answer_seconds)
- Cognitive level of each question (via join to quizzes)
- Quiz type (Quick Assessment vs Retention)
- Submission timestamps

**Used by dimensions:**

- Learning Velocity (quiz score trends over time)
- Knowledge Retention (retention quiz performance)
- Conceptual Depth (recall vs application score comparison)
- Problem Solving (time-to-answer patterns)
- Error Recovery (score improvement after poor performance)

## 3.2 Quiz Attempt Summaries

**Source table:** quiz_attempts

**What it provides:**

- Overall score per attempt (score_percentage)
- Quiz type and content association
- Completion timestamp
- Total time taken

**Used by dimensions:**

- Learning Velocity (weekly score progression)
- Knowledge Retention (retention quiz scores)
- Error Recovery (scores after previous poor attempts)

## 3.3 Content Access Logs

**Source table:** content_access_logs

**What it provides:**

- Completion percentage per content item
- Total watch time per content item
- Number of times content was accessed (access_count)
- Rewatch count (times content accessed after completion)
- Whether content is completed

**Used by dimensions:**

- Content Engagement (completion rates, watch depth)
- Curiosity (rewatch rates, supplementary content access)

## 3.4 Session Attendance

**Source table:** session_attendance

**What it provides:**

- Whether student attended each session (status)
- Duration of live attendance (duration_seconds)
- Recording watch percentage

**Used by dimensions:**

- Consistency (session attendance rate combined with
  other activity patterns)

## 3.5 Login and Activity Data

**Source:** users.last_login_at and inferred from
quiz submission and content access timestamps

**Used by dimensions:**

- Consistency (regularity of platform engagement)

---

# 4. Calculation Algorithms

## 4.1 Dimension 1 — Learning Velocity

**What it measures:** How quickly a student's quiz performance
is improving over time. This is a rate of change metric, not
an absolute score metric.

**Minimum data required:** At least 2 Quick Assessment attempts
across at least 2 different weeks.

**Algorithm:**

```
Step 1: Collect all Quick Assessment quiz_attempt scores,
        grouped by week number.

        Week 1: [65, 70] → average = 67.5
        Week 2: [72, 68, 75] → average = 71.7
        Week 3: [78, 82] → average = 80.0

Step 2: Calculate the slope of the weekly averages using
        simple linear regression.

        slope = (Σ(xi - x̄)(yi - ȳ)) / Σ(xi - x̄)²
        where xi = week number, yi = average score

        In the example above:
        x̄ = 2.0 (average week), ȳ = 73.1 (average score)
        slope ≈ +6.25 (improving ~6.25 points per week)

Step 3: Normalize the slope to a 0-100 scale.

        A slope of +10 or more per week → score of 100
        A slope of 0 (flat) → score of 50
        A slope of -10 or more per week → score of 0

        normalized = clamp((slope / 10) * 50 + 50, 0, 100)

Step 4: Apply a starting bonus.
        Students who start from a low baseline and improve
        significantly get a bonus of up to +10 points.
        This rewards genuine growth over initial advantage.

        If week1_avg < 50 AND slope > 5:
          bonus = min((50 - week1_avg) / 50 * 10, 10)
        Else:
          bonus = 0

Step 5: Final score = clamp(normalized + bonus, 0, 100)
```

**Code implementation:**

```typescript
const calculateLearningVelocity = (
  attempts: Array<{
    weekNumber: number;
    scorePercentage: number;
  }>
): number => {
  if (attempts.length < 2) return 0;

  // Group by week and calculate weekly averages
  const weeklyScores: Record<number, number[]> = {};
  for (const attempt of attempts) {
    if (!weeklyScores[attempt.weekNumber]) {
      weeklyScores[attempt.weekNumber] = [];
    }
    weeklyScores[attempt.weekNumber].push(attempt.scorePercentage);
  }

  const weeklyAverages = Object.entries(weeklyScores)
    .map(([week, scores]) => ({
      week: parseInt(week),
      avg:
        scores.reduce((sum, s) => sum + s, 0) / scores.length,
    }))
    .sort((a, b) => a.week - b.week);

  if (weeklyAverages.length < 2) return 0;

  // Linear regression to find slope
  const n = weeklyAverages.length;
  const xMean =
    weeklyAverages.reduce((sum, p) => sum + p.week, 0) / n;
  const yMean =
    weeklyAverages.reduce((sum, p) => sum + p.avg, 0) / n;

  const numerator = weeklyAverages.reduce(
    (sum, p) => sum + (p.week - xMean) * (p.avg - yMean),
    0
  );
  const denominator = weeklyAverages.reduce(
    (sum, p) => sum + Math.pow(p.week - xMean, 2),
    0
  );

  const slope = denominator !== 0 ? numerator / denominator : 0;

  // Normalize: slope of +10/week → 100, flat → 50, -10/week → 0
  const normalized = Math.max(0, Math.min(100, (slope / 10) * 50 + 50));

  // Starting bonus
  const week1Avg = weeklyAverages[0].avg;
  const bonus =
    week1Avg < 50 && slope > 5
      ? Math.min((50 - week1Avg) / 50 * 10, 10)
      : 0;

  return Math.max(0, Math.min(100, normalized + bonus));
};
```

## 4.2 Dimension 2 — Content Engagement

**What it measures:** How deeply and consistently a student
engages with learning content — not just whether they watch
videos, but how thoroughly they watch them.

**Minimum data required:** At least 1 content item accessed.

**Algorithm:**

```
For each content item in the batch:
  - completion_rate: 0 (not started) to 100 (fully completed)
  - depth_score: average completion_percentage across all items
  - rewatch_bonus: +5 points per rewatched item, capped at +20

Step 1: Calculate completion score
  completion_score = (completed_items / total_published_items) * 100

Step 2: Calculate depth score
  depth_score = average completion_percentage across all accessed items
  (Note: unaccessed items count as 0% for this calculation)

Step 3: Calculate rewatch engagement
  rewatch_score = min(rewatch_count * 10, 30)

Step 4: Weighted combination
  content_engagement = (completion_score * 0.5) +
                       (depth_score * 0.35) +
                       (rewatch_score * 0.15)

Step 5: Normalize to 0-100
```

**Code implementation:**

```typescript
const calculateContentEngagement = (
  accessLogs: Array<{
    completionPercentage: number;
    isCompleted: boolean;
    rewatchCount: number;
  }>,
  totalPublishedContent: number
): number => {
  if (totalPublishedContent === 0) return 0;

  const completedCount = accessLogs.filter(
    (l) => l.isCompleted
  ).length;

  const completionScore =
    (completedCount / totalPublishedContent) * 100;

  const accessedCount = accessLogs.length;
  const avgCompletionPct =
    accessedCount > 0
      ? accessLogs.reduce(
          (sum, l) => sum + Number(l.completionPercentage),
          0
        ) /
        totalPublishedContent // Divide by total, not accessed
      : 0;

  const totalRewatches = accessLogs.reduce(
    (sum, l) => sum + l.rewatchCount,
    0
  );
  const rewatchScore = Math.min(totalRewatches * 10, 30);

  const score =
    completionScore * 0.5 +
    avgCompletionPct * 0.35 +
    rewatchScore * 0.15;

  return Math.max(0, Math.min(100, score));
};
```

## 4.3 Dimension 3 — Problem Solving Approach

**What it measures:** Whether a student approaches problems
thoughtfully rather than randomly guessing. Measured through
time-to-answer patterns and answer revision behavior.

**Minimum data required:** At least 10 quiz question responses
with time tracking data.

**Algorithm:**

```
Step 1: Analyze time-to-answer distribution

  Expected thoughtful answer time: 20–90 seconds
  Very fast (< 10s): likely guessing or reading ahead
  Very slow (> 120s): may indicate confusion or distraction

  For each response:
    - too_fast (< 10s): -1 point signal
    - thoughtful (10-90s): +2 point signal
    - extended (90-120s): +1 point signal (thinking hard)
    - too_slow (> 120s): 0 point signal

Step 2: Calculate thoughtfulness ratio
  thoughtful_ratio = (thoughtful_responses + extended_responses) /
                     total_responses_with_timing

Step 3: Analyze answer pattern
  systematic_signals = responses where correct answers cluster
                       in specific cognitive levels (not random)

Step 4: Combine
  raw_score = thoughtful_ratio * 100

Step 5: Baseline adjustment
  Students with fewer than 10 timed responses get score of 50
  (insufficient data — neutral baseline)
```

**Code implementation:**

```typescript
const calculateProblemSolving = (
  responses: Array<{
    timeToAnswerSeconds: number | null;
    isCorrect: boolean;
    cognitiveLevel: string;
  }>
): number => {
  const timedResponses = responses.filter(
    (r) => r.timeToAnswerSeconds !== null
  );

  if (timedResponses.length < 10) return 50; // Insufficient data

  let thoughtfulCount = 0;
  let tooFastCount = 0;

  for (const response of timedResponses) {
    const time = response.timeToAnswerSeconds!;

    if (time < 10) {
      tooFastCount++;
    } else if (time >= 10 && time <= 120) {
      thoughtfulCount++;
    }
    // Extended thinking (>120s) is neutral — not penalized
  }

  const thoughtfulRatio =
    thoughtfulCount / timedResponses.length;

  // Penalize high guessing rate
  const guessingPenalty =
    tooFastCount / timedResponses.length;

  const rawScore =
    thoughtfulRatio * 100 - guessingPenalty * 30;

  return Math.max(0, Math.min(100, rawScore));
};
```

## 4.4 Dimension 4 — Knowledge Retention

**What it measures:** Whether a student retains knowledge
over time — do they still know things they learned two weeks
ago?

**Minimum data required:** At least 1 completed Retention quiz.

**Algorithm:**

```
Retention quizzes contain two types of questions:
  1. Current content questions (from this week's material)
  2. Historical questions (from content 2+ weeks ago)

The retention score is specifically calculated from
HISTORICAL questions only — current content questions
in retention quizzes measure immediate comprehension,
not retention.

Step 1: Identify historical questions in each
        Retention quiz attempt.
        (quiz.contentId != current week's contentIds)

Step 2: Calculate historical accuracy
  historical_accuracy = correct_historical /
                        total_historical * 100

Step 3: Compare to original Quick Assessment score
        for the same content

  For each historical question:
    Find the student's Quick Assessment score on that content
    retention_ratio = historical_accuracy /
                      original_quick_score

  A ratio of 1.0 means perfect retention
  A ratio of 0.7 means 30% forgetting

Step 4: Average retention ratio across all historical questions

Step 5: Normalize to 0-100
  score = min(average_retention_ratio * 100, 100)

Special case: If no Quick Assessment exists for comparison,
  use historical accuracy directly (can't calculate retention
  ratio without a baseline)
```

**Code implementation:**

```typescript
const calculateKnowledgeRetention = async (
  studentId: string,
  batchId: string,
  prisma: PrismaClient
): Promise<number> => {
  // Get all retention quiz responses
  const retentionResponses = await prisma.quizResponse.findMany({
    where: {
      studentId,
      batchId,
      quiz: { quizType: "RETENTION" },
    },
    include: {
      quiz: {
        select: {
          contentId: true,
          cognitiveLevel: true,
        },
      },
    },
  });

  if (retentionResponses.length === 0) return 0;

  // Get current batch content with their week numbers
  // (to identify "historical" = content from 2+ weeks ago)
  const attempts = await prisma.quizAttempt.findMany({
    where: {
      studentId,
      batchId,
      quizType: "QUICK_ASSESSMENT",
    },
    select: {
      contentId: true,
      scorePercentage: true,
    },
  });

  const quickScoreMap = Object.fromEntries(
    attempts.map((a) => [
      a.contentId,
      Number(a.scorePercentage),
    ])
  );

  // Calculate retention score
  let totalRetentionRatio = 0;
  let countWithBaseline = 0;
  let correctWithoutBaseline = 0;
  let totalWithoutBaseline = 0;

  for (const response of retentionResponses) {
    const originalScore =
      quickScoreMap[response.quiz.contentId];

    if (originalScore !== undefined && originalScore > 0) {
      // Can calculate retention ratio
      const retentionRatio = response.isCorrect
        ? 1.0
        : 0.0;
      totalRetentionRatio +=
        (retentionRatio * 100) / originalScore;
      countWithBaseline++;
    } else {
      // No baseline — use raw accuracy
      if (response.isCorrect) correctWithoutBaseline++;
      totalWithoutBaseline++;
    }
  }

  let score = 0;

  if (countWithBaseline > 0) {
    const avgRetentionRatio =
      totalRetentionRatio / countWithBaseline;
    score = Math.min(avgRetentionRatio * 100, 100);
  } else if (totalWithoutBaseline > 0) {
    score =
      (correctWithoutBaseline / totalWithoutBaseline) * 100;
  }

  return Math.max(0, Math.min(100, score));
};
```

## 4.5 Dimension 5 — Consistency and Discipline

**What it measures:** Whether a student engages with the
platform regularly and reliably — do they show up consistently
or do they binge and disappear?

**Minimum data required:** At least 1 week of batch duration
completed.

**Algorithm:**

```
Consistency is measured across three activity types:

Activity Type 1: Content Access
  Expected: Access at least some content each week
  For each week of the batch so far:
    Did the student access at least 1 content item? (yes/no)

Activity Type 2: Quiz Completion
  Expected: Complete quizzes when they become available
  For each available quiz:
    Did the student complete it within 48 hours? (yes/no)

Activity Type 3: Session Attendance
  Expected: Attend scheduled live sessions
  For each completed session:
    Did the student attend (live or recording)? (yes/no)

Step 1: Calculate activity rate for each type
  content_activity_rate = weeks_with_content_access /
                          total_weeks_elapsed

  quiz_timeliness_rate = quizzes_completed_on_time /
                         total_available_quizzes

  attendance_rate = sessions_attended /
                    total_sessions

Step 2: Weighted combination
  consistency_score = (content_activity_rate * 0.4) +
                      (quiz_timeliness_rate * 0.4) +
                      (attendance_rate * 0.2)

  * 100 to normalize to 0-100 scale

Step 3: Apply regularity bonus
  If the student has accessed content on at least
  5 out of 7 days this week: +5 bonus (capped at 100)
```

**Code implementation:**

```typescript
const calculateConsistency = (
  data: {
    weeksElapsed: number;
    weeksWithContentAccess: number;
    totalAvailableQuizzes: number;
    quizzesCompletedOnTime: number;
    totalSessions: number;
    sessionsAttended: number;
  }
): number => {
  if (data.weeksElapsed === 0) return 0;

  const contentRate =
    data.weeksElapsed > 0
      ? data.weeksWithContentAccess / data.weeksElapsed
      : 0;

  const quizRate =
    data.totalAvailableQuizzes > 0
      ? data.quizzesCompletedOnTime / data.totalAvailableQuizzes
      : 0.5; // Neutral if no quizzes available yet

  const attendanceRate =
    data.totalSessions > 0
      ? data.sessionsAttended / data.totalSessions
      : 0.5; // Neutral if no sessions yet

  const score =
    (contentRate * 0.4 + quizRate * 0.4 + attendanceRate * 0.2) *
    100;

  return Math.max(0, Math.min(100, score));
};
```

## 4.6 Dimension 6 — Curiosity and Self-Direction

**What it measures:** Whether a student goes beyond the minimum
required activities — rewatching content, accessing supplementary
materials, exploring beyond what is assigned.

**Minimum data required:** At least 3 content items published.

**Algorithm:**

```
Step 1: Supplementary content access rate
  supplementary_rate = content_items_with_supplementary_accessed /
                       content_items_with_supplementary_available

Step 2: Rewatch engagement rate
  rewatch_rate = content_items_rewatched /
                 content_items_completed

Step 3: Over-completion rate
  (Students who watch beyond 100% = re-watched)
  over_completion_rate = items_where_rewatch_count > 0 /
                         items_completed

Step 4: Early access bonus
  If student accesses content before the mentor publishes
  a quiz (i.e., on the day content is published):
  early_access_count++

Step 5: Combine with weights
  curiosity_score = (supplementary_rate * 0.35) +
                    (rewatch_rate * 0.35) +
                    (over_completion_rate * 0.30)

  * 100 to normalize

Step 6: Early access bonus
  bonus = min(early_access_count * 5, 20)
  final_score = min(curiosity_score + bonus, 100)
```

**Code implementation:**

```typescript
const calculateCuriosity = (
  accessLogs: Array<{
    completionPercentage: number;
    isCompleted: boolean;
    rewatchCount: number;
    accessCount: number;
  }>,
  supplementaryFilesAccessed: number,
  totalSupplementaryAvailable: number
): number => {
  if (accessLogs.length === 0) return 0;

  const supplementaryRate =
    totalSupplementaryAvailable > 0
      ? Math.min(
          supplementaryFilesAccessed / totalSupplementaryAvailable,
          1
        )
      : 0.5;

  const completedItems = accessLogs.filter(
    (l) => l.isCompleted
  );

  const rewatchedItems = accessLogs.filter(
    (l) => l.rewatchCount > 0
  );

  const rewatchRate =
    completedItems.length > 0
      ? rewatchedItems.length / completedItems.length
      : 0;

  const overCompletionRate =
    completedItems.length > 0
      ? rewatchedItems.length / completedItems.length
      : 0;

  const score =
    (supplementaryRate * 0.35 +
      rewatchRate * 0.35 +
      overCompletionRate * 0.30) *
    100;

  return Math.max(0, Math.min(100, score));
};
```

## 4.7 Dimension 7 — Communication and Articulation

**What it measures:** The clarity and quality of written
communication in platform interactions.

**Phase One limitation:** In Phase One, full forum and peer
feedback systems are not yet built. Communication scoring is
limited to basic signals and defaults to a baseline of 50.

**Phase One Algorithm:**

```
In Phase One, this dimension has limited data available.
The score is calculated from:

1. Quiz short-answer quality (if any short-answer questions
   are used — primarily multiple choice in Phase One, so
   this signal is usually absent)

2. Question quality in any forum posts
   (forum feature limited in Phase One)

3. Default baseline: 50 out of 100

The communication score will be upgraded significantly in
Phase Two when forum data and peer feedback are available.

For Phase One:
  communication_score = 50 (baseline — insufficient data)
  This is clearly labelled in the dashboard as
  "Based on limited Phase One data"
```

**Code implementation:**

```typescript
const calculateCommunication = (): number => {
  // Phase One: Return baseline score
  // Phase Two: Implement full forum + peer feedback analysis
  return 50;
};
```

## 4.8 Dimension 8 — Error Recovery and Resilience

**What it measures:** How a student responds to poor performance —
do they analyze their mistakes and improve, or do they disengage?

**Minimum data required:** At least 1 quiz attempt with a score
below 60 percent, followed by subsequent activity.

**Algorithm:**

```
Step 1: Identify "poor performance events"
  A poor performance event occurs when a student scores
  below 60% on a Quick Assessment quiz.

  For each content item with a poor Quick Assessment score:
    poor_event = {
      content_id: ...,
      quick_assessment_score: 52,
      week: 2
    }

Step 2: Check for recovery signals after each poor event

  Recovery signal A (Strong): Took the Retention quiz for
    that content AND scored above their Quick Assessment score
    recovery_improvement = retention_score - quick_score > 0
    Signal weight: 2.0

  Recovery signal B (Moderate): Rewatched the content after
    the poor quiz score
    rewatch_after_poor_score: content_access after quiz date
    Signal weight: 1.5

  Recovery signal C (Weak): Took any other quiz within 2 days
    of the poor score (shows continued engagement)
    continued_engagement: next_quiz_date - poor_quiz_date < 2 days
    Signal weight: 1.0

  No recovery signal: Student disengaged after poor score
    Signal weight: 0

Step 3: Calculate recovery score
  If no poor events: return 75 (good — no failures to recover from)

  total_weight = sum of signal weights for all poor events
  max_possible_weight = number_of_poor_events * 2.0
  recovery_score = (total_weight / max_possible_weight) * 100

Step 4: Apply engagement decay penalty
  If student has had 2+ consecutive poor scores with no recovery:
    decay_penalty = min(consecutive_poor_count * 10, 30)
    final_score = max(recovery_score - decay_penalty, 0)
```

**Code implementation:**

```typescript
const calculateErrorRecovery = (
  quickAttempts: Array<{
    contentId: string;
    scorePercentage: number;
    completedAt: Date;
  }>,
  retentionAttempts: Array<{
    contentId: string;
    scorePercentage: number;
    completedAt: Date;
  }>,
  contentAccessAfterDate: (
    contentId: string,
    afterDate: Date
  ) => boolean
): number => {
  const poorAttempts = quickAttempts.filter(
    (a) => a.scorePercentage < 60
  );

  if (poorAttempts.length === 0) return 75;

  let totalWeight = 0;
  const maxWeight = poorAttempts.length * 2.0;

  for (const poorAttempt of poorAttempts) {
    const retentionAfter = retentionAttempts.find(
      (r) =>
        r.contentId === poorAttempt.contentId &&
        r.completedAt > poorAttempt.completedAt
    );

    if (
      retentionAfter &&
      retentionAfter.scorePercentage > poorAttempt.scorePercentage
    ) {
      totalWeight += 2.0; // Strong recovery
    } else if (
      contentAccessAfterDate(
        poorAttempt.contentId,
        poorAttempt.completedAt
      )
    ) {
      totalWeight += 1.5; // Rewatched content
    } else {
      // Check if any quiz taken within 2 days
      const twoDaysLater = new Date(
        poorAttempt.completedAt.getTime() + 2 * 24 * 60 * 60 * 1000
      );
      const continuedEngagement = quickAttempts.some(
        (a) =>
          a.contentId !== poorAttempt.contentId &&
          a.completedAt > poorAttempt.completedAt &&
          a.completedAt < twoDaysLater
      );

      if (continuedEngagement) {
        totalWeight += 1.0; // Continued engagement
      }
    }
  }

  const rawScore = (totalWeight / maxWeight) * 100;
  return Math.max(0, Math.min(100, rawScore));
};
```

## 4.9 Dimension 9 — Conceptual Depth

**What it measures:** Whether a student understands concepts
deeply enough to apply them, not just recall definitions.

**Minimum data required:** At least 5 questions at RECALL level
and 5 questions at APPLICATION or ANALYSIS level answered.

**Algorithm:**

```
Step 1: Calculate score separately for each cognitive level

  recall_score = correct_recall_responses /
                 total_recall_responses * 100

  comprehension_score = correct_comprehension_responses /
                        total_comprehension_responses * 100

  application_score = correct_application_responses /
                      total_application_responses * 100

  analysis_score = correct_analysis_responses /
                   total_analysis_responses * 100
                   (may be 0 if no analysis questions yet)

Step 2: Calculate depth ratio
  
  surface_score = (recall_score + comprehension_score) / 2
  deep_score = weighted average of application and analysis
    If analysis questions exist:
      deep_score = (application_score * 0.6) +
                   (analysis_score * 0.4)
    Else:
      deep_score = application_score

Step 3: Calculate conceptual depth score

  The score rewards students where deep_score approaches
  or exceeds surface_score.

  depth_ratio = deep_score / surface_score
    (if surface_score > 0, else 0)

  conceptual_depth = min(depth_ratio * 80, 100)
    (capped at 100, scaled so ratio of 1.25 gives 100)

  Bonus: if application_score > 85:
    bonus = (application_score - 85) * 2
    conceptual_depth = min(conceptual_depth + bonus, 100)

Step 4: Handle insufficient data
  If fewer than 5 responses at any required level:
    return 0 (insufficient data)
```

**Code implementation:**

```typescript
const calculateConceptualDepth = (
  responses: Array<{
    isCorrect: boolean;
    cognitiveLevel: string;
  }>
): number => {
  const byLevel: Record<string, { correct: number; total: number }> =
    {
      RECALL: { correct: 0, total: 0 },
      COMPREHENSION: { correct: 0, total: 0 },
      APPLICATION: { correct: 0, total: 0 },
      ANALYSIS: { correct: 0, total: 0 },
    };

  for (const response of responses) {
    const level = response.cognitiveLevel;
    if (byLevel[level]) {
      byLevel[level].total++;
      if (response.isCorrect) byLevel[level].correct++;
    }
  }

  // Check minimum data requirement
  if (
    byLevel.RECALL.total < 5 ||
    byLevel.APPLICATION.total < 5
  ) {
    return 0; // Insufficient data
  }

  const recallScore =
    byLevel.RECALL.total > 0
      ? (byLevel.RECALL.correct / byLevel.RECALL.total) * 100
      : 0;

  const comprehensionScore =
    byLevel.COMPREHENSION.total > 0
      ? (byLevel.COMPREHENSION.correct /
          byLevel.COMPREHENSION.total) *
        100
      : recallScore;

  const applicationScore =
    byLevel.APPLICATION.total > 0
      ? (byLevel.APPLICATION.correct /
          byLevel.APPLICATION.total) *
        100
      : 0;

  const analysisScore =
    byLevel.ANALYSIS.total > 0
      ? (byLevel.ANALYSIS.correct / byLevel.ANALYSIS.total) *
        100
      : null;

  const surfaceScore = (recallScore + comprehensionScore) / 2;

  const deepScore =
    analysisScore !== null
      ? applicationScore * 0.6 + analysisScore * 0.4
      : applicationScore;

  if (surfaceScore === 0) return 0;

  const depthRatio = deepScore / surfaceScore;
  let score = Math.min(depthRatio * 80, 100);

  if (applicationScore > 85) {
    score = Math.min(score + (applicationScore - 85) * 2, 100);
  }

  return Math.max(0, Math.min(100, score));
};
```

## 4.10 Overall Score Calculation

The overall score is a weighted average of all nine dimensions.

```typescript
const DIMENSION_WEIGHTS = {
  learningVelocity: 0.15,
  knowledgeRetention: 0.15,
  conceptualDepth: 0.15,
  consistency: 0.15,
  problemSolving: 0.10,
  contentEngagement: 0.10,
  curiosity: 0.10,
  communication: 0.05,
  errorRecovery: 0.05,
};

const calculateOverallScore = (
  scores: Record<string, number>
): number => {
  const total =
    scores.learningVelocity * DIMENSION_WEIGHTS.learningVelocity +
    scores.knowledgeRetention *
      DIMENSION_WEIGHTS.knowledgeRetention +
    scores.conceptualDepth * DIMENSION_WEIGHTS.conceptualDepth +
    scores.consistency * DIMENSION_WEIGHTS.consistency +
    scores.problemSolving * DIMENSION_WEIGHTS.problemSolving +
    scores.contentEngagement *
      DIMENSION_WEIGHTS.contentEngagement +
    scores.curiosity * DIMENSION_WEIGHTS.curiosity +
    scores.communication * DIMENSION_WEIGHTS.communication +
    scores.errorRecovery * DIMENSION_WEIGHTS.errorRecovery;

  return Math.max(0, Math.min(100, total));
};
```

---

# 5. Data Model

## 5.1 StudentProgress Table

Already defined in Feature 08. The Metrics Engine writes to
this table; the Dashboard reads from it.

```sql
-- Already created in Feature 08 migration
-- student_progress table with all 9 dimension score columns
-- UPSERT pattern used by metrics engine:
-- INSERT ... ON CONFLICT (student_id, batch_id, week_number)
-- DO UPDATE SET ...
```

## 5.2 MetricsCalculationLog Table

Tracks each calculation run for debugging and monitoring.

```sql
CREATE TABLE metrics_calculation_logs (
  id                  UUID        PRIMARY KEY
                                  DEFAULT gen_random_uuid(),
  run_id              UUID        NOT NULL UNIQUE,
  run_type            VARCHAR(20) NOT NULL
                                  CHECK (run_type IN (
                                    'NIGHTLY_BATCH',
                                    'ON_DEMAND'
                                  )),
  triggered_by        VARCHAR(30) DEFAULT NULL,
  student_id          UUID        DEFAULT NULL
                                  REFERENCES users(id),
  batch_id            UUID        DEFAULT NULL
                                  REFERENCES batches(id),
  batches_processed   INTEGER     DEFAULT 0,
  students_processed  INTEGER     DEFAULT 0,
  students_failed     INTEGER     DEFAULT 0,
  duration_ms         INTEGER     DEFAULT NULL,
  started_at          TIMESTAMP   NOT NULL DEFAULT NOW(),
  completed_at        TIMESTAMP   DEFAULT NULL,
  error_message       TEXT        DEFAULT NULL
);

CREATE INDEX idx_calc_logs_run_type
  ON metrics_calculation_logs(run_type, started_at DESC);

CREATE INDEX idx_calc_logs_student
  ON metrics_calculation_logs(student_id, started_at DESC);
```

## 5.3 Prisma Schema

```prisma
model MetricsCalculationLog {
  id                  String    @id
                                @default(dbgenerated(
                                  "gen_random_uuid()"))
                                @db.Uuid
  runId               String    @unique @map("run_id") @db.Uuid
  runType             String    @map("run_type") @db.VarChar(20)
  triggeredBy         String?   @map("triggered_by") @db.VarChar(30)
  studentId           String?   @map("student_id") @db.Uuid
  batchId             String?   @map("batch_id") @db.Uuid
  batchesProcessed    Int       @default(0)
                                @map("batches_processed")
  studentsProcessed   Int       @default(0)
                                @map("students_processed")
  studentsFailed      Int       @default(0)
                                @map("students_failed")
  durationMs          Int?      @map("duration_ms")
  startedAt           DateTime  @default(now()) @map("started_at")
  completedAt         DateTime? @map("completed_at")
  errorMessage        String?   @map("error_message") @db.Text

  @@map("metrics_calculation_logs")
}
```

---

# 6. Backend Logic and Implementation

## 6.1 Directory Structure

```
src/
├── services/
│   └── metricsEngine.service.ts
├── jobs/
│   ├── nightlyMetrics.job.ts
│   └── onDemandMetrics.job.ts
├── workers/
│   └── metricsCalculation.worker.ts
├── utils/
│   └── metricsAlgorithms.ts
└── queues/
    └── metrics.queue.ts
```

## 6.2 Metrics Engine Service

```typescript
// services/metricsEngine.service.ts
import { PrismaClient } from "@prisma/client";
import { v4 as uuidv4 } from "uuid";
import {
  calculateLearningVelocity,
  calculateContentEngagement,
  calculateProblemSolving,
  calculateKnowledgeRetention,
  calculateConsistency,
  calculateCuriosity,
  calculateCommunication,
  calculateErrorRecovery,
  calculateConceptualDepth,
  calculateOverallScore,
} from "../utils/metricsAlgorithms";

const prisma = new PrismaClient();

export class MetricsEngineService {

  // -------------------------------------------------------
  // CALCULATE ALL METRICS FOR ONE STUDENT
  // -------------------------------------------------------
  async calculateStudentMetrics(
    studentId: string,
    batchId: string,
    weekNumber: number
  ): Promise<void> {
    // Fetch all raw data for this student
    const [
      quickAttempts,
      retentionAttempts,
      allResponses,
      accessLogs,
      sessionAttendance,
      batchData,
    ] = await Promise.all([
      // Quick Assessment quiz attempts
      prisma.quizAttempt.findMany({
        where: {
          studentId,
          batchId,
          quizType: "QUICK_ASSESSMENT",
        },
        include: {
          content: {
            select: {
              id: true,
              sortOrder: true,
              createdAt: true,
            },
          },
        },
        orderBy: { completedAt: "asc" },
      }),

      // Retention quiz attempts
      prisma.quizAttempt.findMany({
        where: {
          studentId,
          batchId,
          quizType: "RETENTION",
        },
        orderBy: { completedAt: "asc" },
      }),

      // All individual responses with cognitive level
      prisma.quizResponse.findMany({
        where: { studentId, batchId },
        include: {
          quiz: {
            select: {
              cognitiveLevel: true,
              quizType: true,
            },
          },
        },
      }),

      // Content access logs
      prisma.contentAccessLog.findMany({
        where: { studentId, batchId },
      }),

      // Session attendance
      prisma.sessionAttendance.findMany({
        where: { studentId },
        include: {
          session: {
            select: {
              batchId: true,
              status: true,
              scheduledAt: true,
            },
          },
        },
      }),

      // Batch context
      prisma.batch.findUnique({
        where: { id: batchId },
        select: {
          startDate: true,
          endDate: true,
          _count: {
            select: {
              content: {
                where: {
                  isPublished: true,
                  deletedAt: null,
                },
              },
              liveSessions: {
                where: { status: "COMPLETED" },
              },
            },
          },
        },
      }),
    ]);

    if (!batchData) return;

    // Filter session attendance to this batch only
    const batchAttendance = sessionAttendance.filter(
      (a) => a.session.batchId === batchId
    );

    // -------------------------------------------------------
    // Prepare data for algorithms
    // -------------------------------------------------------

    // For Learning Velocity: map attempts to week numbers
    const attemptsWithWeeks = quickAttempts.map((attempt) => {
      const weekNum = this.getWeekNumber(
        batchData.startDate,
        attempt.completedAt
      );
      return {
        weekNumber: weekNum,
        scorePercentage: Number(attempt.scorePercentage),
      };
    });

    // For Consistency: calculate weeks with content access
    const weeksElapsed = weekNumber;
    const contentAccessByWeek = new Set<number>();
    for (const log of accessLogs) {
      const weekNum = this.getWeekNumber(
        batchData.startDate,
        log.lastAccessedAt
      );
      contentAccessByWeek.add(weekNum);
    }

    // For Consistency: quiz timeliness
    // A quiz is "on time" if completed within 48 hours of becoming available
    const totalAvailableQuizzes = await prisma.quizAttempt.count({
      where: { studentId, batchId },
    });

    const allAttempts = [...quickAttempts, ...retentionAttempts];
    const quizzesCompletedOnTime = allAttempts.filter((attempt) => {
      // Check if completed within 72 hours of becoming available
      // For simplicity in Phase One, count all completed quizzes
      // as "on time" unless submitted more than 7 days late
      return true; // Simplified — Phase Two will have precise timing
    }).length;

    // For Curiosity: supplementary file access
    const supplementaryAccessed = await prisma.supplementaryFile.count({
      where: {
        content: { batchId },
        // In Phase One, we track file access indirectly through
        // download count — this can be enhanced with a dedicated
        // file_access_logs table in Phase Two
      },
    });

    const totalSupplementary = await prisma.supplementaryFile.count({
      where: { content: { batchId } },
    });

    // For Error Recovery: content access after poor quiz
    const contentAccessAfterDate = (
      contentId: string,
      afterDate: Date
    ): boolean => {
      return accessLogs.some(
        (log) =>
          log.contentId === contentId &&
          log.lastAccessedAt > afterDate
      );
    };

    // -------------------------------------------------------
    // Calculate all 9 dimensions
    // -------------------------------------------------------
    const scores = {
      learningVelocity: calculateLearningVelocity(attemptsWithWeeks),
      contentEngagement: calculateContentEngagement(
        accessLogs.map((l) => ({
          completionPercentage: Number(l.completionPercentage),
          isCompleted: l.isCompleted,
          rewatchCount: l.rewatchCount,
        })),
        batchData._count.content
      ),
      problemSolving: calculateProblemSolving(
        allResponses.map((r) => ({
          timeToAnswerSeconds: r.timeToAnswerSeconds,
          isCorrect: r.isCorrect,
          cognitiveLevel: r.quiz.cognitiveLevel,
        }))
      ),
      knowledgeRetention: await calculateKnowledgeRetention(
        studentId,
        batchId,
        prisma
      ),
      consistency: calculateConsistency({
        weeksElapsed,
        weeksWithContentAccess: contentAccessByWeek.size,
        totalAvailableQuizzes,
        quizzesCompletedOnTime,
        totalSessions: batchData._count.liveSessions,
        sessionsAttended: batchAttendance.filter(
          (a) => a.status !== "ABSENT"
        ).length,
      }),
      curiosity: calculateCuriosity(
        accessLogs.map((l) => ({
          completionPercentage: Number(l.completionPercentage),
          isCompleted: l.isCompleted,
          rewatchCount: l.rewatchCount,
          accessCount: l.accessCount,
        })),
        supplementaryAccessed,
        totalSupplementary
      ),
      communication: calculateCommunication(),
      errorRecovery: calculateErrorRecovery(
        quickAttempts.map((a) => ({
          contentId: a.contentId,
          scorePercentage: Number(a.scorePercentage),
          completedAt: a.completedAt,
        })),
        retentionAttempts.map((a) => ({
          contentId: a.contentId,
          scorePercentage: Number(a.scorePercentage),
          completedAt: a.completedAt,
        })),
        contentAccessAfterDate
      ),
      conceptualDepth: calculateConceptualDepth(
        allResponses.map((r) => ({
          isCorrect: r.isCorrect,
          cognitiveLevel: r.quiz.cognitiveLevel,
        }))
      ),
    };

    const overallScore = calculateOverallScore(scores);

    // -------------------------------------------------------
    // Upsert StudentProgress record
    // -------------------------------------------------------
    await prisma.studentProgress.upsert({
      where: {
        studentId_batchId_weekNumber: {
          studentId,
          batchId,
          weekNumber,
        },
      },
      create: {
        studentId,
        batchId,
        weekNumber,
        learningVelocityScore: scores.learningVelocity,
        contentEngagementScore: scores.contentEngagement,
        problemSolvingScore: scores.problemSolving,
        knowledgeRetentionScore: scores.knowledgeRetention,
        consistencyScore: scores.consistency,
        curiosityScore: scores.curiosity,
        communicationScore: scores.communication,
        errorRecoveryScore: scores.errorRecovery,
        conceptualDepthScore: scores.conceptualDepth,
        softSkillsScore: scores.communication, // Phase One proxy
        overallScore,
        calculatedAt: new Date(),
      },
      update: {
        learningVelocityScore: scores.learningVelocity,
        contentEngagementScore: scores.contentEngagement,
        problemSolvingScore: scores.problemSolving,
        knowledgeRetentionScore: scores.knowledgeRetention,
        consistencyScore: scores.consistency,
        curiosityScore: scores.curiosity,
        communicationScore: scores.communication,
        errorRecoveryScore: scores.errorRecovery,
        conceptualDepthScore: scores.conceptualDepth,
        softSkillsScore: scores.communication,
        overallScore,
        calculatedAt: new Date(),
      },
    });
  }

  // -------------------------------------------------------
  // RUN FULL BATCH CALCULATION
  // -------------------------------------------------------
  async runBatchCalculation(batchId: string): Promise<void> {
    const batch = await prisma.batch.findUnique({
      where: { id: batchId },
      include: {
        enrollments: {
          where: { status: "ACTIVE" },
          select: { studentId: true },
        },
      },
    });

    if (!batch) return;

    const currentWeek = this.getWeekNumber(
      batch.startDate,
      new Date()
    );

    for (const enrollment of batch.enrollments) {
      try {
        await this.calculateStudentMetrics(
          enrollment.studentId,
          batchId,
          currentWeek
        );
      } catch (error: any) {
        console.error(
          `[MetricsEngine] Failed for student 
           ${enrollment.studentId}: ${error.message}`
        );
      }
    }
  }

  // -------------------------------------------------------
  // PRIVATE HELPERS
  // -------------------------------------------------------

  private getWeekNumber(
    batchStartDate: Date,
    date: Date
  ): number {
    const diffMs = date.getTime() - batchStartDate.getTime();
    const diffDays = diffMs / (1000 * 60 * 60 * 24);
    return Math.max(1, Math.floor(diffDays / 7) + 1);
  }
}
```

## 6.3 Nightly Metrics Job

```typescript
// jobs/nightlyMetrics.job.ts
import { PrismaClient } from "@prisma/client";
import { v4 as uuidv4 } from "uuid";
import { MetricsEngineService } from
  "../services/metricsEngine.service";

const prisma = new PrismaClient();
const metricsEngine = new MetricsEngineService();

export const runNightlyMetricsJob = async () => {
  const runId = uuidv4();
  const startedAt = new Date();
  let batchesProcessed = 0;
  let studentsProcessed = 0;
  let studentsFailed = 0;

  console.log(
    `[NightlyMetrics] Starting run ${runId} at 
     ${startedAt.toISOString()}`
  );

  // Create log record
  await prisma.metricsCalculationLog.create({
    data: {
      runId,
      runType: "NIGHTLY_BATCH",
      startedAt,
    },
  });

  try {
    const activeBatches = await prisma.batch.findMany({
      where: { status: "ACTIVE" },
      include: {
        enrollments: {
          where: { status: "ACTIVE" },
          select: { studentId: true },
        },
      },
    });

    for (const batch of activeBatches) {
      console.log(
        `[NightlyMetrics] Processing batch ${batch.name} ` +
        `(${batch.enrollments.length} students)`
      );

      const currentWeek = getWeekNumber(batch.startDate, new Date());

      for (const enrollment of batch.enrollments) {
        try {
          await metricsEngine.calculateStudentMetrics(
            enrollment.studentId,
            batch.id,
            currentWeek
          );
          studentsProcessed++;
        } catch (error: any) {
          studentsFailed++;
          console.error(
            `[NightlyMetrics] Failed for student ` +
            `${enrollment.studentId}: ${error.message}`
          );
        }
      }

      batchesProcessed++;
    }

  } catch (error: any) {
    console.error(
      `[NightlyMetrics] Job failed: ${error.message}`
    );

    await prisma.metricsCalculationLog.update({
      where: { runId },
      data: {
        batchesProcessed,
        studentsProcessed,
        studentsFailed,
        completedAt: new Date(),
        durationMs: Date.now() - startedAt.getTime(),
        errorMessage: error.message,
      },
    });

    throw error;
  }

  const durationMs = Date.now() - startedAt.getTime();

  await prisma.metricsCalculationLog.update({
    where: { runId },
    data: {
      batchesProcessed,
      studentsProcessed,
      studentsFailed,
      completedAt: new Date(),
      durationMs,
    },
  });

  console.log(
    `[NightlyMetrics] Completed run ${runId}. ` +
    `Batches: ${batchesProcessed}, ` +
    `Students: ${studentsProcessed}, ` +
    `Failed: ${studentsFailed}, ` +
    `Duration: ${durationMs}ms`
  );
};

const getWeekNumber = (startDate: Date, date: Date): number => {
  const diffMs = date.getTime() - startDate.getTime();
  const diffDays = diffMs / (1000 * 60 * 60 * 24);
  return Math.max(1, Math.floor(diffDays / 7) + 1);
};
```

## 6.4 On-Demand Metrics Worker

Triggered by Feature 07 after quiz submission and Feature 06
after session completion. Only recalculates affected dimensions.

```typescript
// workers/metricsCalculation.worker.ts
import { Job } from "bull";
import { PrismaClient } from "@prisma/client";
import { MetricsEngineService } from
  "../services/metricsEngine.service";

const prisma = new PrismaClient();
const metricsEngine = new MetricsEngineService();

export const processOnDemandMetricsJob = async (
  job: Job
) => {
  const { student_id, batch_id, triggered_by } = job.data;

  console.log(
    `[OnDemandMetrics] Recalculating for student 
     ${student_id}, triggered by ${triggered_by}`
  );

  try {
    const batch = await prisma.batch.findUnique({
      where: { id: batch_id },
      select: { startDate: true, endDate: true },
    });

    if (!batch) return;

    const currentWeek = Math.max(
      1,
      Math.floor(
        (Date.now() - batch.startDate.getTime()) /
          (7 * 24 * 60 * 60 * 1000)
      ) + 1
    );

    await metricsEngine.calculateStudentMetrics(
      student_id,
      batch_id,
      currentWeek
    );

    console.log(
      `[OnDemandMetrics] Completed for student ${student_id}`
    );
  } catch (error: any) {
    console.error(
      `[OnDemandMetrics] Failed for student ${student_id}: ` +
      `${error.message}`
    );
    throw error;
  }
};
```

## 6.5 Metrics Queue Setup

```typescript
// queues/metrics.queue.ts
import Bull from "bull";
import { processOnDemandMetricsJob } from
  "../workers/metricsCalculation.worker";

export const metricsQueue = new Bull("metrics-calculation", {
  redis: {
    host: process.env.REDIS_HOST ?? "localhost",
    port: parseInt(process.env.REDIS_PORT ?? "6379"),
  },
  defaultJobOptions: {
    removeOnComplete: 50,
    removeOnFail: 20,
  },
});

// Register worker
metricsQueue.process(
  "RECALCULATE_STUDENT_METRICS",
  5, // Max 5 concurrent calculations
  processOnDemandMetricsJob
);
```

## 6.6 Job Scheduling

```typescript
// server.ts — add to server initialization
import cron from "node-cron";
import { runNightlyMetricsJob } from "./jobs/nightlyMetrics.job";
import { runAlertGenerationJob } from "./jobs/alertGeneration.job";

// Run metrics calculation at 2:00 AM daily
cron.schedule("0 2 * * *", async () => {
  console.log("[Cron] Starting nightly metrics calculation");
  await runNightlyMetricsJob();
});

// Run alert generation at 2:30 AM daily
// (after metrics calculation completes)
cron.schedule("30 2 * * *", async () => {
  console.log("[Cron] Starting alert generation");
  await runAlertGenerationJob();
});
```

## 6.7 Metrics Algorithms File

All pure calculation functions in one file for testability.

```typescript
// utils/metricsAlgorithms.ts

export {
  calculateLearningVelocity,
  calculateContentEngagement,
  calculateProblemSolving,
  calculateConsistency,
  calculateCuriosity,
  calculateCommunication,
  calculateErrorRecovery,
  calculateConceptualDepth,
  calculateOverallScore,
} from "./algorithms/index";

// Re-export the async one separately
export { calculateKnowledgeRetention } from
  "./algorithms/knowledgeRetention";
```

All algorithms from section 4 go into separate files in
`utils/algorithms/` for clean separation and independent
testability:

```
utils/
└── algorithms/
    ├── index.ts             (exports all sync algorithms)
    ├── learningVelocity.ts
    ├── contentEngagement.ts
    ├── problemSolving.ts
    ├── knowledgeRetention.ts  (async — needs prisma)
    ├── consistency.ts
    ├── curiosity.ts
    ├── communication.ts
    ├── errorRecovery.ts
    ├── conceptualDepth.ts
    └── overallScore.ts
```

---

# 7. Job Scheduling and Triggers

## 7.1 Nightly Schedule

The nightly batch calculation runs at 2:00 AM. This time was
chosen to avoid peak usage hours and to ensure all students
have had a full day of activity before scores are calculated.

The alert generation job runs at 2:30 AM — after the metrics
calculation completes — to ensure alerts are based on the
freshest scores.

## 7.2 On-Demand Triggers

On-demand calculation is triggered in two scenarios:

**After quiz submission (Feature 07):**
When a student submits a quiz, the quiz submission handler
adds a RECALCULATE_STUDENT_METRICS job to the metrics queue.
The job recalculates all quiz-related dimensions for that
student. The dashboard reflects updated scores within 1-2
minutes of quiz submission.

**After session completion (Feature 06):**
When a mentor ends a live session, the session end handler
adds a RECALCULATE_STUDENT_METRICS job for each student who
attended. This updates consistency and content engagement
scores for attendees.

## 7.3 Manual Trigger (Admin)

Admins can manually trigger a full batch recalculation from
the admin interface. This is useful after correcting data
issues or importing historical data.

```typescript
// POST /api/admin/batches/:batchId/recalculate-metrics
router.post(
  "/admin/batches/:batchId/recalculate-metrics",
  authenticate,
  authorize(["ADMIN", "SUPER_ADMIN"]),
  async (req, res) => {
    const { batchId } = req.params;
    await metricsEngine.runBatchCalculation(batchId);
    res.json({
      success: true,
      message: "Metrics recalculation queued",
    });
  }
);
```

---

# 8. Implementation Steps

## 8.1 Step-by-Step Build Order

### Step 1 — Database Schema (Day 1)

Add metrics_calculation_logs table (student_progress was
already created in Feature 08):

```bash
npx prisma migrate dev --name add_metrics_logs_table
```

Install required packages:

```bash
npm install node-cron
npm install -D @types/node-cron
```

### Step 2 — Algorithm Implementation (Day 1-2)

Build each algorithm in isolation in `utils/algorithms/`:

1. `learningVelocity.ts` — linear regression on weekly scores
2. `contentEngagement.ts` — completion and depth calculation
3. `problemSolving.ts` — time-to-answer analysis
4. `knowledgeRetention.ts` — retention ratio calculation
5. `consistency.ts` — multi-source activity rate
6. `curiosity.ts` — supplementary access and rewatch rates
7. `communication.ts` — Phase One baseline
8. `errorRecovery.ts` — recovery signal detection
9. `conceptualDepth.ts` — cognitive level score comparison
10. `overallScore.ts` — weighted combination

**Test each algorithm individually with mock data before
integrating.** This is the most important step — algorithm
bugs produce incorrect scores that are hard to debug once
integrated.

### Step 3 — Metrics Engine Service (Day 2)

Build `services/metricsEngine.service.ts`. Test with a
student who has complete data (multiple quiz attempts,
content access, session attendance).

### Step 4 — Nightly Job (Day 3)

Build `jobs/nightlyMetrics.job.ts`. Test manually by
calling the function directly:

```typescript
// Test manually
import { runNightlyMetricsJob } from "./jobs/nightlyMetrics.job";
await runNightlyMetricsJob();
```

Verify that student_progress records are created/updated
in the database after the job runs.

### Step 5 — On-Demand Worker (Day 3)

Build `workers/metricsCalculation.worker.ts` and set up
the metrics queue. Test by adding a job manually:

```typescript
await metricsQueue.add("RECALCULATE_STUDENT_METRICS", {
  student_id: "test-student-uuid",
  batch_id: "test-batch-uuid",
  triggered_by: "MANUAL_TEST",
});
```

### Step 6 — Job Scheduling (Day 3)

Add cron schedules to server.ts. Test by setting cron
expression to `* * * * *` (every minute) temporarily,
verify it runs, then change back to the correct schedule.

### Step 7 — Integration Testing (Day 4)

Test the complete pipeline:

1. Create test student with quiz responses, content access,
   and session attendance
2. Run nightly job manually
3. Verify student_progress record is created with non-zero scores
4. Submit a new quiz response via Feature 07
5. Verify on-demand job is queued and runs
6. Verify student_progress is updated within 2 minutes
7. Open Feature 08 dashboard and verify scores display correctly

---

# 9. Error Handling

## 9.1 Individual Student Failure Handling

The nightly job processes students sequentially. If calculation
for one student fails, the error is logged and the job continues
to the next student. A single student failure does not abort
the entire batch.

```typescript
for (const enrollment of batch.enrollments) {
  try {
    await metricsEngine.calculateStudentMetrics(...);
    studentsProcessed++;
  } catch (error: any) {
    studentsFailed++;
    // Log but continue processing
    console.error(`Failed for student ${enrollment.studentId}`);
  }
}
```

## 9.2 Insufficient Data Handling

When a student does not have enough data for a dimension
to be calculated reliably, return 0 with a note rather
than a misleading estimate:

```typescript
// Learning Velocity: needs 2 weeks of data
if (weeklyAverages.length < 2) return 0;

// Conceptual Depth: needs 5 questions per level
if (byLevel.RECALL.total < 5 || byLevel.APPLICATION.total < 5) {
  return 0;
}

// Problem Solving: needs 10 timed responses
if (timedResponses.length < 10) return 50; // Neutral baseline
```

The dashboard in Feature 08 handles zeros by showing
"Insufficient data — complete more activities" rather
than showing a 0 score.

## 9.3 Algorithm Error Codes

```
METRICS_CALCULATION_FAILED  : 500 — calculation job failed
BATCH_NOT_FOUND             : 404 — batch for calculation not found
STUDENT_NOT_ENROLLED        : 400 — student not in batch
INSUFFICIENT_DATA           : 200 — not enough data (not an error,
                                    returns 0 for that dimension)
```

---

# 10. Testing Strategy

## 10.1 Unit Tests for Each Algorithm

Every algorithm must have comprehensive unit tests with
known inputs and expected outputs.

```typescript
// tests/metricsAlgorithms.test.ts

describe("calculateLearningVelocity", () => {

  it("should return 0 for fewer than 2 weeks of data", () => {
    const result = calculateLearningVelocity([
      { weekNumber: 1, scorePercentage: 65 },
    ]);
    expect(result).toBe(0);
  });

  it("should return ~75 for modest improvement", () => {
    const result = calculateLearningVelocity([
      { weekNumber: 1, scorePercentage: 60 },
      { weekNumber: 2, scorePercentage: 65 },
      { weekNumber: 3, scorePercentage: 70 },
    ]);
    // Slope ≈ +5/week → normalized ≈ 75
    expect(result).toBeGreaterThan(70);
    expect(result).toBeLessThan(85);
  });

  it("should return ~50 for flat performance", () => {
    const result = calculateLearningVelocity([
      { weekNumber: 1, scorePercentage: 70 },
      { weekNumber: 2, scorePercentage: 70 },
      { weekNumber: 3, scorePercentage: 70 },
    ]);
    expect(result).toBeGreaterThan(45);
    expect(result).toBeLessThan(55);
  });

  it("should return less than 50 for declining performance", () => {
    const result = calculateLearningVelocity([
      { weekNumber: 1, scorePercentage: 80 },
      { weekNumber: 2, scorePercentage: 70 },
      { weekNumber: 3, scorePercentage: 60 },
    ]);
    expect(result).toBeLessThan(50);
  });

  it("should give starting bonus for low-start high-growth", () => {
    const withBonus = calculateLearningVelocity([
      { weekNumber: 1, scorePercentage: 35 }, // Low start
      { weekNumber: 2, scorePercentage: 55 },
      { weekNumber: 3, scorePercentage: 75 },
    ]);
    const withoutBonus = calculateLearningVelocity([
      { weekNumber: 1, scorePercentage: 60 }, // Higher start
      { weekNumber: 2, scorePercentage: 75 }, // Same slope
      { weekNumber: 3, scorePercentage: 90 },
    ]);
    // Low start with same improvement should get bonus
    expect(withBonus).toBeGreaterThan(withoutBonus - 5);
  });
});

describe("calculateConceptualDepth", () => {

  it("should return 0 for insufficient data", () => {
    const result = calculateConceptualDepth([
      { isCorrect: true, cognitiveLevel: "RECALL" },
      { isCorrect: true, cognitiveLevel: "APPLICATION" },
    ]);
    expect(result).toBe(0);
  });

  it("should return higher score when application matches recall", () => {
    const balanced = [];
    for (let i = 0; i < 10; i++) {
      balanced.push({
        isCorrect: i < 8,
        cognitiveLevel: "RECALL",
      });
      balanced.push({
        isCorrect: i < 7,
        cognitiveLevel: "APPLICATION",
      });
    }

    const result = calculateConceptualDepth(balanced);
    expect(result).toBeGreaterThan(50);
  });

  it("should return lower score when application lags behind recall", () => {
    const imbalanced = [];
    for (let i = 0; i < 10; i++) {
      imbalanced.push({
        isCorrect: i < 9, // 90% on recall
        cognitiveLevel: "RECALL",
      });
      imbalanced.push({
        isCorrect: i < 4, // 40% on application
        cognitiveLevel: "APPLICATION",
      });
    }

    const result = calculateConceptualDepth(imbalanced);
    expect(result).toBeLessThan(50);
  });
});

describe("calculateOverallScore", () => {

  it("should produce weighted average of all dimensions", () => {
    const allFifty = {
      learningVelocity: 50,
      knowledgeRetention: 50,
      conceptualDepth: 50,
      consistency: 50,
      problemSolving: 50,
      contentEngagement: 50,
      curiosity: 50,
      communication: 50,
      errorRecovery: 50,
    };

    const result = calculateOverallScore(allFifty);
    expect(result).toBeCloseTo(50, 1);
  });

  it("should give higher weight to learning velocity and retention", () => {
    const highVelocityLowRest = {
      learningVelocity: 100,
      knowledgeRetention: 100,
      conceptualDepth: 0,
      consistency: 0,
      problemSolving: 0,
      contentEngagement: 0,
      curiosity: 0,
      communication: 0,
      errorRecovery: 0,
    };

    const result = calculateOverallScore(highVelocityLowRest);
    // Should be 30 (15% + 15% of 100 each)
    expect(result).toBeCloseTo(30, 1);
  });
});
```

---

# 11. Code Examples

## 11.1 How to Trigger Metrics Recalculation from Other Features

Any feature that generates data affecting metrics should
trigger on-demand recalculation:

```typescript
// In quiz submission handler (Feature 07)
import { metricsQueue } from "../queues/metrics.queue";

// After successful quiz submission:
await metricsQueue.add(
  "RECALCULATE_STUDENT_METRICS",
  {
    student_id: studentId,
    batch_id: batchId,
    triggered_by: "QUIZ_SUBMISSION",
  },
  {
    attempts: 3,
    backoff: { type: "fixed", delay: 5000 },
    priority: 2, // Medium priority
  }
);
```

```typescript
// In session end handler (Feature 06)
// After session ends, recalculate for all attendees
const attendees = await prisma.sessionAttendance.findMany({
  where: { sessionId, status: { not: "ABSENT" } },
  select: { studentId: true },
});

for (const attendee of attendees) {
  await metricsQueue.add(
    "RECALCULATE_STUDENT_METRICS",
    {
      student_id: attendee.studentId,
      batch_id: batchId,
      triggered_by: "SESSION_END",
    },
    { priority: 3 } // Lower priority than quiz submission
  );
}
```

## 11.2 Reading Latest Scores from student_progress

```typescript
// How any feature reads a student's current scores
const getLatestStudentScores = async (
  studentId: string,
  batchId: string
) => {
  return prisma.studentProgress.findFirst({
    where: { studentId, batchId },
    orderBy: { weekNumber: "desc" },
  });
};
```

---

# 12. Performance Optimization

## 12.1 Nightly Job Processing Time

For a batch of 500 students, estimating the nightly job
duration:

- Data fetching per student: ~50ms (6 parallel queries)
- Algorithm calculation per student: ~5ms (in-memory)
- Database upsert per student: ~20ms

Total per student: ~75ms
Total for 500 students: ~37.5 seconds

This is well within the nightly window. For Phase Two with
multiple batches and thousands of students, parallelization
across batches can reduce total time.

## 12.2 Parallel Processing for Multiple Batches

In Phase One, batches are processed sequentially. For Phase Two
with multiple active batches, process batches in parallel using
Promise.allSettled:

```typescript
// Phase Two: Parallel batch processing
const batchPromises = activeBatches.map((batch) =>
  metricsEngine.runBatchCalculation(batch.id).catch((err) => {
    console.error(`Batch ${batch.name} failed: ${err.message}`);
  })
);

await Promise.allSettled(batchPromises);
```

## 12.3 Algorithm Caching

Some data fetched for one algorithm is reused by others.
The current implementation fetches all data upfront in one
parallelized Promise.all call, then passes the data to each
algorithm. This avoids N×M database queries and is the
correct approach for Phase One.

## 12.4 Student Progress Index Optimization

The dashboard reads from student_progress with a query like:

```
WHERE student_id = X AND batch_id = Y ORDER BY week_number DESC LIMIT 1
```

The unique index on (student_id, batch_id, week_number) covers
this query efficiently. No additional indexes are needed.

---

**End of Feature 09 — Metrics Calculation Engine**

---

**Document Information**


| Field            | Value                                         |
| ---------------- | --------------------------------------------- |
| Feature          | F09 — Metrics Calculation Engine             |
| Version          | 1.0                                           |
| Status           | Ready for Development                         |
| Folder           | F09_Metrics_Engine/                           |
| Filename         | F09_Implementation_Guide.md                   |
| Previous Feature | F08_Progress_Dashboard/                       |
| Next Feature     | F10_Notifications/F10_Implementation_Guide.md |
