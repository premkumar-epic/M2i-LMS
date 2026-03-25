# M2i_LMS — Phase Two Feature Overview

### Version 1.0 | March 2026

### Save As: Developer_Guides/M2i_LMS_Phase_Two_Overview.md

---

# Table of Contents

1. [What Phase Two Is](#1-what-phase-two-is)
2. [Feature Roadmap](#2-feature-roadmap)
3. [F11 — Forum and Peer Discussion](#3-f11--forum-and-peer-discussion)
4. [F12 — Project Management and GitHub Integration](#4-f12--project-management-and-github-integration)
5. [F13 — Peer Feedback System](#5-f13--peer-feedback-system)
6. [F14 — Career Path Recommendation Engine](#6-f14--career-path-recommendation-engine)
7. [F15 — Company Portal and Internship Matching](#7-f15--company-portal-and-internship-matching)
8. [F16 — Student Leaderboard](#8-f16--student-leaderboard)
9. [F17 — Enhanced Notifications (Email + Push)](#9-f17--enhanced-notifications-email--push)
10. [F18 — Multi-Batch Management](#10-f18--multi-batch-management)
11. [Metrics Engine Upgrades](#11-metrics-engine-upgrades)
12. [Infrastructure Upgrades](#12-infrastructure-upgrades)
13. [Phase Two Timeline Estimate](#13-phase-two-timeline-estimate)
14. [What Phase One Must Get Right for Phase Two to Work](#14-what-phase-one-must-get-right-for-phase-two-to-work)

---

# 1. What Phase Two Is

Phase One turns M2i_LMS into a functional LMS with AI-powered
assessment. Phase Two turns it into a career pipeline — a
platform that not only teaches students but actively matches
them with internship opportunities based on measured learning
outcomes and demonstrated project work.

The core insight driving Phase Two is that the nine learning
dimension scores accumulated during Phase One have value beyond
the classroom. A student with a high conceptual depth score,
strong error recovery, and consistent engagement is a
demonstrably better candidate than one whose only credential
is "completed a bootcamp." Phase Two makes this data visible
and actionable for companies.

Phase Two also addresses the weaknesses of Phase One:

- Communication and Articulation (currently a fixed 50) becomes
  fully calculated from forum participation and peer feedback
- Curiosity gets richer signals from project exploration
- Soft skills get dedicated data sources beyond proxy signals

---

# 2. Feature Roadmap

```
Phase Two features grouped by delivery order:

Batch A (Weeks 1-4 of Phase Two):
  F11 Forum and Peer Discussion
  F12 Project Management and GitHub Integration
  F17 Enhanced Notifications (Email + Push)
  F18 Multi-Batch Management improvements

Batch B (Weeks 5-8):
  F13 Peer Feedback System
  F16 Student Leaderboard
  Metrics Engine upgrades (Communication, Curiosity, Soft Skills)

Batch C (Weeks 9-14):
  F14 Career Path Recommendation Engine
  F15 Company Portal and Internship Matching
```

---

# 3. F11 — Forum and Peer Discussion

## What It Is

A structured discussion forum scoped to each batch, where
students can ask questions, share discoveries, respond to
peers, and discuss lecture content. Not a general chat —
a threaded Q&A system organized by content item and week.

## Why It Matters for Metrics

Phase One has no data source for Communication and Articulation.
The forum provides that data: post quality, response clarity,
upvotes from peers, and the helpfulness of answers can all be
measured and fed into the Communication score.

## Key Design Decisions

**Scoped to batch:** Forum posts are only visible within the
batch. Students in different batches cannot see each other's
discussions. This keeps discussions relevant and prevents
spoilers for later batches.

**Content-linked threads:** Every thread is linked to a
specific content item. This makes it easy for mentors to
see what students are confused about after a specific video.

**Mentor endorsement:** Mentors can mark a response as the
"accepted answer." Endorsed responses count more heavily in
the Communication dimension score.

## New Database Tables Required

```sql
forum_threads (id, batch_id, content_id, author_id,
               title, body, is_resolved, created_at)

forum_replies (id, thread_id, author_id, body,
               parent_reply_id, is_endorsed, created_at)

forum_votes (id, reply_id, voter_id, vote_type,
             created_at)
```

## Impact on Communication Score

```
Current Phase One formula:
  communication_score = 50 (fixed baseline)

Phase Two formula:
  posts_created         : weighted by upvotes received
  questions_answered    : weighted by endorsements
  response_quality      : clarity score (LLM-evaluated)
  response_timeliness   : answered within 24h of question

  communication_score = weighted_average(
    post_volume_score,
    answer_quality_score,
    peer_helpfulness_score
  )
```

---

# 4. F12 — Project Management and GitHub Integration

## What It Is

A lightweight project tracking system where mentors assign
projects, students link their GitHub repositories, and the
platform tracks commit activity, PR quality, and project
milestone completion.

## Why It Matters for Metrics

Projects provide the richest signal for Conceptual Depth
and Application-level understanding. A student who can
build a working project demonstrates deeper understanding
than one who can only answer multiple-choice questions.

GitHub commit frequency also provides an additional signal
for Consistency — a student who codes every day is more
consistent than one who commits in bursts.

## Key Design Decisions

**GitHub OAuth, not personal tokens:** Students connect
their GitHub account via OAuth so they do not have to
manage API tokens. The platform reads public repository
data only — no write access is ever requested.

**Project milestones, not tasks:** The platform tracks
milestone-level progress (Phase 1 complete, Phase 2
complete) rather than individual tasks. Granular task
tracking is a different product (Jira, Linear) and
out of scope.

**Mentor-defined rubrics:** Mentors define what "good"
looks like for each project. The platform provides the
data; mentors provide the judgment.

## New Database Tables Required

```sql
projects (id, batch_id, title, description, github_repo_url,
          student_id, mentor_id, status, created_at)

project_milestones (id, project_id, title, description,
                    due_date, completed_at, created_at)

github_connections (id, user_id, github_username,
                    access_token_encrypted, connected_at)

commit_snapshots (id, project_id, date, commit_count,
                  lines_added, lines_deleted, fetched_at)
```

---

# 5. F13 — Peer Feedback System

## What It Is

A structured peer review system where students give and
receive feedback on each other's project work using
mentor-defined rubrics. Each student reviews 2-3 peers
per project cycle and receives reviews from 2-3 peers.

## Why It Matters for Metrics

Peer feedback data improves two currently weak dimensions:

**Communication (giving feedback):** The quality and
constructiveness of feedback a student gives to peers
is a strong signal for communication ability.

**Soft Skills (receiving feedback):** How a student
responds to peer feedback — do they engage constructively
or defensively? — is a proxy for professional maturity.

## Key Design Decisions

**Anonymous submission, non-anonymous results:** Feedback
is submitted anonymously to reduce social pressure, but
mentors can see who gave what feedback to monitor for
abuse. Students see aggregated feedback without knowing
who said what.

**Structured rubric, not free text only:** Each feedback
item has a rubric dimension (e.g., "Code Quality",
"Documentation") with a 1-5 scale plus optional comment.
This makes feedback quantifiable and comparable.

---

# 6. F14 — Career Path Recommendation Engine

## What It Is

An AI-powered recommendation system that analyzes a
student's nine learning dimension scores, project work,
and skill signals to suggest specific career paths and
the specific skills they should develop to pursue them.

## Why It Matters

The entire M2i platform is called "Metrics to Internship"
because the endgame is internship placement. The career
path engine is what closes the loop — it translates
learning metrics into career guidance.

## How It Works

```
Student completes Phase One batch
    ↓
System has:
  - 9 learning dimension scores over 8 weeks
  - Quiz performance breakdown by cognitive level
  - Project completion data (Phase Two)
  - Peer feedback scores (Phase Two)
    ↓
Career Path Engine analyzes profile:
  - High conceptual depth + strong application scores
    → Backend development
  - Strong communication + moderate technical scores
    → Technical writing / developer relations
  - High curiosity + strong self-direction
    → Research / open source contribution
  - High consistency + strong collaboration signals
    → Enterprise development / team lead track
    ↓
Outputs:
  - Top 3 recommended career paths with match percentages
  - Specific skills to develop for each path
  - Content recommendations (external resources)
  - Estimated timeline to internship readiness
```

## Technical Approach

Phase Two uses a hybrid approach:

1. Rule-based matching for primary path suggestions
   (no AI needed for initial version)
2. Mistral 7B for generating personalized narrative
   explanations of the recommendations

---

# 7. F15 — Company Portal and Internship Matching

## What It Is

A separate interface for partner companies to view
anonymized student profiles, express interest in students,
and coordinate with the M2i team for internship placements.

## How It Works

```
Company signs up for M2i partner portal
    ↓
Company sets hiring criteria:
  - Minimum overall score
  - Specific dimension requirements
    (e.g., "consistency > 70, conceptual depth > 65")
  - Skills / technologies required
    ↓
System surfaces matching student profiles:
  - Anonymized by default (Student A, Student B)
  - Shows dimension radar chart
  - Shows project portfolio
  - Shows batch completion status
    ↓
Company expresses interest in specific profiles
    ↓
M2i team facilitates introduction with student consent
    ↓
Placement tracked in platform
```

## Privacy Architecture

Student identity is never revealed to companies without
explicit student opt-in. Students can:

- Choose to make their profile visible to all partner companies
- Choose specific companies to share with
- Opt out entirely (profile never shown to companies)

## New Database Tables Required

```sql
companies (id, name, website, description, logo_url,
           is_active, created_at)

company_users (id, company_id, user_id, role, created_at)

internship_interests (id, company_id, student_id,
                      status, notes, created_at)

placements (id, student_id, company_id, start_date,
            stipend, role_title, created_at)

student_visibility_settings (id, student_id,
  is_visible_to_all_companies, created_at)
```

---

# 8. F16 — Student Leaderboard

## What It Is

An opt-in leaderboard showing batch rankings across the
nine learning dimensions. Students can choose whether
their name appears or whether they are listed anonymously.

## Design Decisions

**Opt-in, not opt-out:** The leaderboard is hidden to all
students by default. Students who want to see their ranking
explicitly enable it. This prevents the leaderboard from
demotivating lower-ranked students who did not choose
to participate.

**Dimension-specific rankings:** Rather than a single
overall ranking, the leaderboard shows rankings per
dimension. The student ranked #1 overall might be #8
in curiosity — this nuance is more motivating and
informative than a single number.

**No real-time updates:** Rankings update once per day
(after the nightly metrics job) to avoid gamification
behavior where students take quizzes purely to climb the
leaderboard in real time.

---

# 9. F17 — Enhanced Notifications (Email + Push)

## What It Is

Phase One notifications are in-platform only (bell + toast).
Phase Two adds email notifications for time-sensitive events
and browser push notifications for mobile users.

## Email Notification Events (Phase Two)

```
IMMEDIATE (sent within 5 minutes of event):
  - SESSION_STARTED (live session went live)
  - SESSION_REMINDER (30 minutes before session)
  - QUIZ_AVAILABLE (quiz is now available)

DAILY DIGEST (one email per day, summarizing):
  - New content published
  - Mentor comments on forum posts
  - Peer feedback received

WEEKLY SUMMARY:
  - Weekly progress report with dimension scores
  - Comparison to previous week
  - Insights from the dashboard
```

## Technical Implementation

AWS SES for email delivery. Templates built with
React Email (converts React components to HTML email).

```
npm install @aws-sdk/client-ses
npm install react-email @react-email/components
```

---

# 10. F18 — Multi-Batch Management

## What It Is

Phase One allows one admin to manage everything but lacks
features for operating multiple simultaneous batches at
scale. Phase Two adds:

**Batch templates:** Save a batch configuration (mentors,
content structure, session schedule) as a template and
create new batches from it in minutes.

**Cross-batch analytics:** Compare performance across
batches — which batch had the highest learning velocity?
Which content item consistently produces the lowest
retention scores?

**Batch cohort tracking:** Follow students across multiple
batches (some students may repeat or take advanced batches).

---

# 11. Metrics Engine Upgrades

## Communication Score (F11 data)

```typescript
// Phase Two formula replaces the Phase One fixed baseline
const calculateCommunication = async (
  studentId: string,
  batchId: string,
  prisma: PrismaClient
): Promise<number> => {
  const [threads, replies, endorsements, votes] =
    await Promise.all([
      prisma.forumThread.count({
        where: { authorId: studentId, batchId },
      }),
      prisma.forumReply.count({
        where: { authorId: studentId,
                 thread: { batchId } },
      }),
      prisma.forumReply.count({
        where: { authorId: studentId,
                 isEndorsed: true,
                 thread: { batchId } },
      }),
      prisma.forumVote.count({
        where: { reply: { authorId: studentId,
                          thread: { batchId } } },
      }),
    ]);

  if (threads + replies === 0) return 50; // Baseline if no activity

  const activityScore = Math.min(
    (threads * 5 + replies * 3) / 10,
    40
  );
  const qualityScore = Math.min(
    (endorsements * 20 + votes * 5) / 10,
    60
  );

  return Math.min(activityScore + qualityScore, 100);
};
```

## Curiosity Score Upgrade (F12 data)

```typescript
// Add GitHub activity signals to curiosity calculation
const curiosityBonus = async (
  studentId: string,
  batchId: string
): Promise<number> => {
  const project = await prisma.project.findFirst({
    where: { studentId, batchId },
    include: {
      commitSnapshots: {
        orderBy: { date: "asc" },
        take: 30,
      },
    },
  });

  if (!project) return 0;

  // Bonus for consistent commit activity
  const daysWithCommits = project.commitSnapshots.filter(
    (s) => s.commitCount > 0
  ).length;

  return Math.min(daysWithCommits * 2, 20);
};
```

---

# 12. Infrastructure Upgrades

## Socket.io Redis Adapter (Multiple Server Instances)

Phase Two with higher user load requires multiple backend
instances behind a load balancer. Socket.io must be
configured with a Redis adapter so all instances share
the same room state.

```typescript
import { createAdapter } from "@socket.io/redis-adapter";
import { createClient } from "redis";

const pubClient = createClient({ url: process.env.REDIS_URL });
const subClient = pubClient.duplicate();

await Promise.all([pubClient.connect(), subClient.connect()]);
io.adapter(createAdapter(pubClient, subClient));
```

## Database Read Replicas

Phase Two analytics queries (cross-batch comparisons,
career path recommendations) are expensive. Add a read
replica and route analytics queries to it:

```typescript
const prismaRead = new PrismaClient({
  datasources: {
    db: { url: process.env.DATABASE_READ_REPLICA_URL },
  },
});

// Use prismaRead for analytics, prisma for writes
```

## Caching Layer

Dashboard scores are currently calculated and stored in
student_progress (already cached). Phase Two adds Redis
caching for:

- Forum thread lists (updated on new post, TTL 5 minutes)
- Leaderboard rankings (updated daily, TTL 24 hours)
- Career path recommendations (updated weekly, TTL 7 days)

---

# 13. Phase Two Timeline Estimate

Based on Phase One velocity (10 features in 8 weeks with
a 4-person team), Phase Two with 8 features of comparable
complexity is estimated at:

```
Batch A (F11, F12, F17, F18) : 6 weeks
Batch B (F13, F16, metrics)  : 4 weeks
Batch C (F14, F15)           : 6 weeks

Total Phase Two              : ~16 weeks (4 months)
```

**Team recommendation:** Add one full-time backend developer
for Phase Two. The career path engine (F14) and company portal
(F15) are each as complex as two Phase One features.

---

# 14. What Phase One Must Get Right for Phase Two to Work

Phase Two features depend heavily on Phase One data quality.
These are the Phase One decisions that have the biggest
impact on Phase Two success:

**Quiz cognitive level accuracy:** The career path engine
uses the ratio of recall/comprehension/application scores
to identify whether a student is a surface learner or a
deep learner. If quiz generation consistently assigns wrong
cognitive levels, the recommendation engine will be wrong.
Invest time in Whisper and prompt quality during Phase One.

**Consistent student IDs across sessions:** The metrics
engine uses student_id as the primary key for all
historical data. If a student account is ever recreated
(rather than reactivated), their history is lost. Never
delete and recreate accounts — always deactivate/reactivate.

**Transcript quality:** Forum discussions in Phase Two will
reference specific transcript segments. Low-quality transcripts
make forum content harder to link to learning material.
Consider upgrading to Whisper large-v2 before Phase Two begins
if transcript quality has been an issue.

**Batch naming consistency:** Cross-batch analytics compare
batches by name pattern. Use a consistent naming convention
from day one: `[Curriculum Name] Batch [Month] [Year]`
e.g. `Full Stack Dev Batch Jan 2026`.

**Enrollment data completeness:** The career path engine
uses a student's full enrollment history. Students who were
enrolled, withdrawn, and re-enrolled have fragmented data.
Minimize withdrawals and never hard-delete enrollment records.

---

**End of Phase Two Feature Overview**

---

**Document Information**


| Field              | Value                                                |
| ------------------ | ---------------------------------------------------- |
| Document Title     | M2i_LMS Phase Two Feature Overview                   |
| Version            | 1.0                                                  |
| Status             | Planning                                             |
| Created            | March 2026                                           |
| Features Planned   | 8                                                    |
| Estimated Duration | 16 weeks                                             |
| Maintained By      | Product Team                                         |
| Repository         | /docs/Developer_Guides/M2i_LMS_Phase_Two_Overview.md |
