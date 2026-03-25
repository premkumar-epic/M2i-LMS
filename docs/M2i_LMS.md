# M2i_LMS — Master Product Documentation
### Version 1.0 | March 2026 | Confidential — Internal Use Only

---

# Table of Contents

1. [Project Overview](#1-project-overview)
2. [Problem Statement](#2-problem-statement)
3. [Product Vision & Mission](#3-product-vision--mission)
4. [Target Users & Personas](#4-target-users--personas)
5. [Phase One Scope](#5-phase-one-scope)
6. [Core Student Journey & Workflow](#6-core-student-journey--workflow)
7. [Learning Metrics Framework](#7-learning-metrics-framework)
8. [Core Features — Detailed Overview](#8-core-features--detailed-overview)
9. [Tech Stack — Full Specification](#9-tech-stack--full-specification)
10. [Database Design — Tables & Relationships](#10-database-design--tables--relationships)
11. [API Structure — Endpoint Groups](#11-api-structure--endpoint-groups)
12. [Quiz Generation Workflow](#12-quiz-generation-workflow)
13. [User Roles & Permissions](#13-user-roles--permissions)
14. [Data Flow Diagrams](#14-data-flow-diagrams)
15. [Team Responsibilities & Workload Split](#15-team-responsibilities--workload-split)
16. [Success Metrics for Phase One](#16-success-metrics-for-phase-one)
17. [Security Considerations](#17-security-considerations)
18. [Scalability Considerations](#18-scalability-considerations)
19. [Error Handling Strategy](#19-error-handling-strategy)
20. [Performance Considerations](#20-performance-considerations)
21. [Deployment Architecture](#21-deployment-architecture)
22. [Timeline & Weekly Milestones](#22-timeline--weekly-milestones)
23. [Assumptions & Dependencies](#23-assumptions--dependencies)
24. [Risk Assessment & Mitigation](#24-risk-assessment--mitigation)
25. [Phase Two — High-Level Overview](#25-phase-two--high-level-overview)
26. [Phase Three — High-Level Overview](#26-phase-three--high-level-overview)

---

# 1. Project Overview

## 1.1 What is M2i_LMS?

M2i_LMS, which stands for Metrics to Internship Learning Management System, is an AI-powered learning and career development platform designed from the ground up to bridge the critical gap between education and employment. It is not a traditional learning management system. It is not a job board. It is not a placement portal. It is all three of these things combined into a single cohesive platform, unified by an intelligent metrics engine that tracks every meaningful signal of a student's growth — from the first day they log in to the moment they get placed in an internship or a job.

The core philosophy behind M2i_LMS is that learning outcomes and career readiness are measurable. Every interaction a student has with the platform — watching a video, taking a quiz, attending a live session, asking a question in a forum, responding to feedback — generates data. That data, when intelligently processed and organized, tells a complete story about who that student is, how they think, how they learn, how they collaborate, and where they are headed. M2i_LMS is the system that captures that story and turns it into actionable intelligence for students, mentors, institutions, and hiring companies.

## 1.2 Why This Platform Exists

The Indian education and early-career market — and indeed the global market — suffers from a fundamental structural problem. Colleges produce graduates. Companies need talent. But there is a massive mismatch between the two. Graduates often do not know what they are good at. Companies do not know which graduates are actually capable. Placement processes rely on resumes, one-hour interviews, and gut feelings — all of which are deeply unreliable signals of actual potential.

Existing platforms address parts of this problem in isolation. Traditional LMS platforms like Moodle or Canvas focus purely on content delivery and do not track meaningful learning behavior. Job platforms like LinkedIn or Naukri rely on self-reported skills and apply-and-pray mechanisms. Assessment platforms like HackerRank test narrow coding ability and ignore soft skills, communication, and learning potential entirely. No platform today tracks a student longitudinally from the moment of learning through to demonstrated performance in real projects and then connects that tracked data directly to companies looking for early-stage talent.

M2i_LMS fills that gap entirely.

## 1.3 The Unique Value Proposition

What makes M2i_LMS different from everything that exists today can be summarized in three points.

First, it tracks the whole student, not just their scores. Most platforms measure outputs — did you pass the quiz, did you submit the assignment. M2i_LMS measures the process — how you learn, how you recover from failure, how consistent you are, how curious you are, how you communicate. These process signals are far stronger predictors of real-world performance than any single test score.

Second, it connects learning directly to opportunity. Rather than having students go through learning on one platform and then separately apply for jobs on another platform, M2i_LMS creates a seamless pipeline. The same data that tracks a student's learning journey becomes the profile that companies use to identify talent. There is no gap, no resume translation, no information loss.

Third, it is open source and free to use. This means colleges, individual learners, small institutions, and independent mentors can adopt it without financial barriers. The platform is built to be a public good — accessible, transparent, and community-driven.

---

# 2. Problem Statement

## 2.1 The Student Problem

Students entering higher education or the workforce today face a landscape of overwhelming choices and inadequate guidance. A student from a tier-two or tier-three college in India, for example, may have raw potential but absolutely no clarity on what career path suits them, what skills they actually possess, or how to bridge the gap between what they learned in college and what a real company needs. They spend months on generic online courses, collect certificates that do not reflect real ability, and then struggle through hundreds of job applications hoping something sticks.

Even students from top-tier institutions face a version of this problem. They may know what domain they want to enter but have no objective way to measure how ready they actually are, no structured path to develop the specific skills employers want, and no mechanism to get those skills in front of the right companies without going through the conventional hiring gauntlet.

## 2.2 The Company Problem

Companies — particularly startups, mid-size technology companies, and companies expanding their engineering or product teams — face a mirror-image problem. They need talent. They need it early, before candidates get expensive. They need it reliably, without wasting hundreds of hours on interview cycles that ultimately produce bad hires. They want to see demonstrated performance, not polished resumes. They want to know how someone behaves under pressure, how they learn new things, how they work in a team — not whether they can solve a contrived algorithm problem in 45 minutes on a whiteboard.

The tools available to companies today are inadequate. Job boards provide volume but not quality. Referrals are biased and limited. Campus hiring is expensive and logistically complex. There is no scalable way for a company today to continuously monitor a pool of emerging talent and reach out to the right person at exactly the right moment — when that person has just demonstrated the skills and growth trajectory the company needs.

## 2.3 The Institutional Problem

Colleges and training institutions face their own version of this challenge. They produce students but have limited visibility into how those students are actually developing. Placement cells work reactively — they wait until students are in their final year and then scramble to connect them with companies. They have no longitudinal view of student development. They cannot identify early which students are exceptional and which are struggling. They cannot customize learning paths for individual students at scale. And they have no direct pipeline that turns their best students into job-ready candidates in a structured, verifiable way.

## 2.4 The Gap M2i_LMS Closes

M2i_LMS closes all three of these gaps simultaneously. For students, it provides a structured learning environment, a clear metrics-based picture of their strengths and weaknesses, personalized career path guidance, and direct access to internship opportunities. For companies, it provides a continuously updated pool of talent with verified, longitudinal performance data — allowing them to identify the right candidate at the right time without extensive interviewing overhead. For institutions, it provides deep visibility into student development, tools to deliver structured curriculum, and a direct pipeline from their cohorts into employment.

---

# 3. Product Vision & Mission

## 3.1 Vision Statement

To create a world where every student — regardless of which college they attended, which city they live in, or what financial resources they have — can discover their genuine strengths, develop them through structured and measurable learning, and connect directly with the right career opportunity at the right time.

## 3.2 Mission Statement

To build and maintain an open-source platform that makes high-quality, metrics-driven education and career placement accessible to every learner, and that creates a transparent, data-backed bridge between student potential and employer need.

## 3.3 Core Design Principles

**Measure what matters.** Every feature built into M2i_LMS must generate data that meaningfully reflects a student's growth and potential. Features that are visually impressive but do not contribute to the metrics engine should not be built.

**Open by default.** The platform is open source. Every architectural decision should be made with the assumption that the codebase will be read, extended, and deployed by others. Code should be clean, documented, and modular.

**Student first.** When there is a conflict between what is convenient for an institution and what is best for a student, the student's interest takes priority.

**Progressive complexity.** The platform should be simple for a new student to start using and progressively reveal more complexity and capability as the student advances.

**Data privacy as a foundation.** Student data is sensitive. The platform should collect only what is necessary, store it securely, and never share it without explicit consent.

---

# 4. Target Users & Personas

## 4.1 Student / Individual Learner

**Who they are:** Students aged 18 to 30 who are either enrolled in a college or independently trying to upskill and find career opportunities. They may have no prior technical background or they may be mid-career professionals looking to pivot into a new domain.

**Their situation:** They have motivation but lack direction. They do not have a clear picture of what they are good at. They have access to endless online content but no structured, feedback-driven system that tells them how they are progressing. They want a career but do not know how to bridge the gap between studying and getting hired.

**What they need from M2i_LMS:**
- A structured curriculum with clear milestones
- Regular feedback on their performance and progress
- Objective data about their strengths and weaknesses across multiple dimensions
- Career path recommendations based on demonstrated behavior
- A direct pathway to internship and job opportunities without having to navigate the conventional hiring process

**How they use the platform:** They log in regularly, watch video content, attend live mentor sessions, take quizzes, and gradually build up a profile that reflects not just what they know but how they think and learn.

## 4.2 Mentor / Educator

**Who they are:** Subject matter experts, working professionals, or educators who are responsible for delivering curriculum and guiding students. They may be employed by an institution or operating independently.

**Their situation:** They have knowledge to share but are burdened by administrative overhead. Creating quizzes manually for every piece of content is time-consuming. Tracking how 50 or 100 students are progressing is impossible without automated tools. Providing personalized feedback at scale is exhausting.

**What they need from M2i_LMS:**
- Simple, fast content upload with minimal manual overhead
- AI-generated quizzes that they can review and approve rather than create from scratch
- Clear visibility into how each student in their batch is performing
- Tools to identify struggling students early so they can intervene
- Easy live session scheduling and streaming without technical complexity

**How they use the platform:** They upload videos and materials, review AI-generated quizzes, schedule and conduct live sessions, monitor the student progress dashboard, and provide feedback on student work.

## 4.3 Institution / College

**Who they are:** Educational institutions — colleges, universities, training centers, bootcamps — that want to use M2i_LMS to deliver curriculum to their students and improve placement outcomes.

**Their situation:** They have large student populations, multiple batches running simultaneously, and limited tools for tracking student development longitudinally. Their placement cells are reactive rather than proactive. They want better placement rates but lack the infrastructure to identify and develop talent systematically.

**What they need from M2i_LMS:**
- Batch and cohort management tools
- Curriculum upload and organization at scale
- Aggregate analytics across their entire student population
- A direct pipeline to companies for internship and job placement

**How they use the platform:** Through admin accounts, they create batches, enroll students, assign mentors, upload curriculum, and monitor overall cohort performance.

## 4.4 Company / Recruiter

**Who they are:** Startups, technology companies, and any organization looking to hire early-stage talent — interns, entry-level engineers, product managers, designers, or other roles.

**Their situation:** Conventional hiring is expensive, slow, and unreliable. They want to identify talent earlier — before final year placement season — and build relationships with promising students as they develop.

**What they need from M2i_LMS:**
- A continuously updated talent pool with verified, longitudinal performance data
- The ability to filter and search students by specific skills, metrics, and growth trajectory
- Direct communication and offer mechanisms built into the platform
- Confidence that the data they are seeing reflects genuine capability and not self-reported claims

**How they use the platform:** Through a company portal (Phase Three), they view leaderboards, filter by skills and performance metrics, reach out to promising students, and post internship opportunities.

## 4.5 Admin / Super Admin

**Who they are:** The technical or operational administrators of the M2i_LMS instance — either at the platform level or at the institutional level.

**Their situation:** They are responsible for the health, integrity, and configuration of the platform. They need tools to manage users, batches, and system configuration without having to touch the codebase directly.

**What they need from M2i_LMS:**
- User creation, editing, and deactivation
- Batch creation and management
- System configuration and settings management
- Platform-wide analytics and reporting
- Access to audit logs and system health data

---

# 5. Phase One Scope

## 5.1 Objective of Phase One

Phase One is the Minimum Viable Product of M2i_LMS. Its singular objective is to deliver a fully functional core LMS that enables mentors to upload content, deliver live sessions, generate AI-powered quizzes, and track student performance across nine core learning dimensions — all within a single cohort of students.

Phase One deliberately excludes features that, while valuable, are not necessary to validate the core thesis of the platform — that intelligent tracking of learning behavior produces meaningful, actionable data about student potential. Before building the project management module, the career recommendation engine, or the company hiring portal, we must first prove that the learning metrics engine works, that students engage with it, and that the data it produces is trustworthy.

## 5.2 Features Included in Phase One

The following features will be fully designed, developed, tested, and deployed as part of Phase One.

**User Authentication and Role Management:** A complete authentication system supporting four user roles — Student, Mentor, Admin, and Super Admin. Authentication is handled via JWT tokens with secure password hashing. Each role has a clearly defined set of permissions that restricts access to only the features and data relevant to that role.

**Batch Management:** The ability for admins to create and manage student batches. A batch represents a cohort of students going through a specific curriculum together. Phase One supports a single active batch but is architected to support multiple batches in Phase Two.

**Content Management System:** Mentors can upload video content, documents, and supplementary learning materials. Videos are stored in cloud storage (AWS S3 or Google Cloud Storage). Each piece of content is tagged with topic metadata and learning objectives, which are used by the quiz generation engine.

**Automatic Video Transcription:** Upon upload, videos are automatically transcribed using Whisper — an open-source, locally-run transcription model. The transcript is stored alongside the content and is used as the primary input for AI quiz generation.

**AI-Powered Quiz Generation:** After transcription, the platform uses Llama 2 — an open-source language model run locally via Ollama — to automatically generate two types of quizzes for each piece of content. A quick assessment quiz is generated for immediate post-session understanding, and a retention quiz is generated for delayed assessment 48 to 72 hours later. Mentor review and approval of generated quizzes is required before they are made visible to students.

**Mentor Quiz Review Interface:** A dedicated interface for mentors to review AI-generated quizzes. Mentors can approve, reject, or edit individual questions. Editing patterns are logged to improve prompt quality over time.

**Live Streaming and Session Management:** Mentors can schedule and conduct live classes using an integrated streaming solution (Mux or Agora). Students can join scheduled sessions. Attendance — including join time and session duration — is automatically tracked.

**Quiz Taking System:** Students can take approved quizzes. Answers are submitted, automatically graded for multiple-choice questions, and scored. Attempt history is preserved. Students cannot retake quizzes unless explicitly permitted by the mentor.

**Student Progress Dashboard:** A comprehensive dashboard that displays each student's performance across the nine core learning dimensions, quiz score history, content engagement data, and attendance records. The dashboard is visible to both students (their own data) and mentors (all students in their batch).

**Metrics Calculation Engine:** A backend system that continuously processes quiz responses, content access logs, and attendance data to calculate and update scores for each of the nine learning dimensions for every student.

**Notification System:** Real-time notifications via Socket.io informing students when new content is available, when quizzes are ready to take, and when live sessions are scheduled. Mentors receive notifications when AI-generated quizzes are ready for review.

## 5.3 Features Explicitly Deferred to Phase Two

The following features have been evaluated and deliberately deferred. They are important to the long-term vision of the platform but are not required to validate Phase One objectives.

- Project management module (team sprints, task boards, deliverables)
- GitHub integration for code quality analysis
- Slack integration for communication behavior analysis
- Peer feedback system
- Mentor structured feedback workflows beyond quiz review
- Soft skills tracking beyond basic forum participation
- Multi-batch management and cross-batch analytics
- Advanced reporting and export capabilities
- Email notification system (only in-platform notifications in Phase One)

## 5.4 Features Explicitly Deferred to Phase Three

- Career path recommendation engine
- Company and recruiter portal
- Student leaderboard for company visibility
- Direct internship matching and offer management
- ATS integration with company hiring tools
- Alumni and network features

---

# 6. Core Student Journey & Workflow

## 6.1 Onboarding (Days 1 to 3)

A student's journey begins when they are enrolled by an admin into a batch. They receive a platform invitation, set up their account with a secure password, and complete their basic profile including their educational background, current skill level, and career interests. This initial profile is important because it provides baseline context for the metrics engine — understanding where a student started is necessary to measure how far they have come.

On day one, the student is presented with an orientation session — a short video from the platform or the institution explaining how the platform works, how their progress will be measured, and what to expect from the curriculum. They are shown their initial dashboard, which at this point contains no performance data but displays the nine learning dimensions they will be tracked on, along with a brief explanation of what each dimension means and how it will be measured.

An optional diagnostic assessment is offered during onboarding. This is a short quiz covering foundational concepts relevant to the curriculum they are about to begin. The diagnostic is not graded in a pass-fail sense but is used by the metrics engine to establish a baseline for learning velocity measurement — we cannot measure how fast someone is learning if we do not know where they started.

## 6.2 Weekly Learning Cycle (Weeks 1 through 8)

The core learning rhythm of Phase One is organized around a repeating weekly cycle. This cycle is designed to expose students to new content, give them structured opportunities to demonstrate understanding, and generate the data the metrics engine needs to calculate meaningful scores.

**Content Access Phase (Monday through Wednesday):** At the beginning of each week, new content is made available to the batch. This content consists of video lessons uploaded by the mentor, supplementary reading materials, and any reference resources. Students are expected to work through this content at their own pace within the three-day window. The platform tracks which content each student accesses, how much time they spend on each piece, whether they complete it fully or partially, and whether they revisit it multiple times. These access patterns are rich signals for multiple learning dimensions including content engagement, curiosity, and consistency.

**Live Session (Tuesday or Wednesday):** Each week includes at least one live session conducted by the mentor. The session is scheduled through the platform, students receive a notification, and they join via the built-in streaming interface. Attendance is automatically tracked. The live session covers the week's content in an interactive format, allowing for questions and discussion. After the session ends, the platform automatically triggers the quiz generation pipeline for any content covered in the session.

**Quick Assessment Phase (Thursday and Friday):** By Thursday morning, the AI-generated quick assessment quiz for the week's content is expected to be reviewed and approved by the mentor. Students receive a notification and have until Friday end of day to complete the quick quiz. The quick quiz is intentionally short — five to ten multiple choice questions — designed to assess immediate comprehension of that week's core concepts. The timing and score of this quiz feed directly into the learning velocity and conceptual depth metrics.

**Retention Quiz (Sunday or following Monday):** Two to three days after the quick quiz, a longer retention quiz becomes available. This quiz contains a mix of questions from the current week's content and questions revisiting concepts from previous weeks. The purpose is to measure whether students are retaining knowledge over time or experiencing rapid forgetting. Performance on retention quizzes is the primary signal for the knowledge retention learning dimension.

## 6.3 End of Phase One Assessment

At the end of the eight-week assessment phase, each student's profile contains a rich set of data points across all nine learning dimensions. The metrics engine produces a comprehensive student report — not a single number or grade, but a multidimensional profile that describes how the student learns, what their strengths are, where their growth areas lie, and what kind of learner they are.

This report is shared with the student through their dashboard in a clear, non-judgmental format. It is also visible to their mentor and to institutional admins. It forms the foundation for Phase Two, where students move into team-based project work, and for Phase Three, where the data is used for career path recommendations and internship matching.

---

# 7. Learning Metrics Framework

## 7.1 Overview

The learning metrics framework is the intellectual core of M2i_LMS. It defines the nine dimensions along which every student is tracked during Phase One, explains what each dimension measures, describes how it is calculated from raw platform data, and articulates why it matters as a predictor of real-world performance.

The framework is deliberately multidimensional because single-metric systems are inadequate for measuring human learning potential. A student who scores high on quizzes but engages inconsistently and never explores beyond the required material is a very different kind of learner from a student who scores moderately on quizzes but is consistently present, asks thoughtful questions, and recovers quickly from mistakes. Both students have value. Both deserve to be understood clearly. The nine-dimension framework gives both of them a fair, nuanced representation.

## 7.2 Dimension 1 — Learning Velocity

**What it measures:** The rate at which a student improves their understanding of new material over time. This is not about how high they score, but about how quickly their scores increase relative to where they started.

**How it is calculated:** The metrics engine tracks quiz scores week over week on similar-difficulty material. A student who scored 40 percent in week one and 75 percent by week three has a high learning velocity even if their absolute scores are not at the top of the class. The calculation accounts for the difficulty level of quizzes to avoid rewarding easy material.

**Why it matters:** Learning velocity is one of the strongest predictors of long-term performance in a professional environment. A person who learns quickly can adapt to new technologies, new requirements, and new challenges. High learning velocity with moderate baseline knowledge is often more valuable to a company than high baseline knowledge with low learning velocity.

## 7.3 Dimension 2 — Content Engagement Patterns

**What it measures:** How a student interacts with different types of learning content — videos, text materials, interactive exercises. This dimension reveals a student's preferred learning modality and the depth of their engagement.

**How it is calculated:** The platform tracks time spent on each type of content, completion rates, rewatch rates for videos, and access patterns. A student who rewatches sections of a video multiple times is showing deeper engagement than one who watches it once at 2x speed. A student who accesses supplementary materials beyond what is assigned is showing higher curiosity.

**Why it matters:** Understanding a student's content engagement patterns helps mentors tailor future content delivery and helps companies understand how a candidate prefers to learn — which is highly relevant in fast-moving work environments where self-directed learning is essential.

## 7.4 Dimension 3 — Problem-Solving Approach

**What it measures:** How a student approaches problems they do not immediately know the answer to. Do they attempt problems independently before seeking help? Do they use available resources strategically? Do they show systematic thinking?

**How it is calculated:** This dimension is inferred from behavioral patterns — the time between when a quiz is opened and when the first answer is submitted, the number of attempts before submitting a final answer, whether the student accesses reference materials before or after attempting questions, and the pattern of answers across a multi-question quiz (random errors versus systematic errors suggest different problem-solving styles).

**Why it matters:** Problem-solving approach is a fundamental indicator of how someone will behave when faced with a real work challenge. People who attempt problems independently before seeking help, who use resources strategically, and who show systematic thinking are significantly more effective in professional environments.

## 7.5 Dimension 4 — Knowledge Retention

**What it measures:** How well a student retains information over time rather than merely memorizing it for an immediate test and then forgetting it.

**How it is calculated:** The retention quiz system is specifically designed to measure this. Each retention quiz contains questions revisiting concepts from two or more weeks prior. The metrics engine compares a student's performance on these historical questions relative to their original quiz scores on the same topics. Significant drops indicate poor retention; stable or improving scores indicate strong retention.

**Why it matters:** In professional environments, knowledge retention determines whether learning actually translates into capability. Someone who learns a concept thoroughly in a training session but cannot apply it three weeks later is not more capable than before the training. Knowledge retention is a key indicator of whether learning is creating durable capability.

## 7.6 Dimension 5 — Consistency and Discipline

**What it measures:** The regularity and reliability of a student's engagement with the platform. This covers login frequency, content access patterns, quiz submission timeliness, and attendance at live sessions.

**How it is calculated:** The platform calculates a consistency score based on the percentage of scheduled activities a student completes within their expected time windows, the regularity of their login patterns, and the deviation between their most engaged and least engaged weeks. A student who is always present and on time scores high. A student who disappears for a week and then tries to catch up scores lower.

**Why it matters:** Consistency is one of the most reliable predictors of professional performance. Companies are not looking for people who perform brilliantly occasionally but unreliably. They want people who show up, do the work, and maintain quality over time.

## 7.7 Dimension 6 — Curiosity and Self-Direction

**What it measures:** The degree to which a student goes beyond what is required — accessing additional resources, exploring topics not assigned, asking questions beyond the scope of the curriculum.

**How it is calculated:** The platform tracks access to optional and supplementary content, the number and quality of questions asked in discussion forums, any instances where a student engages with content from a previous week without being prompted, and the breadth of topics they explore relative to the minimum required.

**Why it matters:** Curiosity is a deeply important predictor of long-term career success. In rapidly evolving fields — technology, product, design — the ability to self-direct one's learning is not a nice-to-have but a requirement. Students who are intrinsically curious tend to grow faster and more sustainably than those who need to be pushed through every step.

## 7.8 Dimension 7 — Communication and Articulation

**What it measures:** How clearly and effectively a student communicates through text — in forum posts, in question submissions, in short-answer quiz responses. This dimension captures the ability to express thinking clearly in written form.

**How it is calculated:** In Phase One, this is measured through the quality of written contributions in discussion forums and the coherence of short-answer quiz responses. The metrics engine uses a combination of basic NLP analysis and mentor ratings of written contributions to calculate a communication score. Factors include clarity, conciseness, correct use of domain vocabulary, and the ability to ask precise questions.

**Why it matters:** Communication is a foundational professional skill that is often overlooked in technical education. The ability to articulate a problem clearly, explain a solution coherently, and write documentation that others can understand is as important as technical knowledge in most professional roles.

## 7.9 Dimension 8 — Error Recovery and Resilience

**What it measures:** How a student responds to failure, mistakes, and setbacks within the platform. Do they analyze what went wrong and adjust, or do they give up or repeat the same mistakes?

**How it is calculated:** The metrics engine tracks quiz retake patterns, score changes between retakes, and the time a student takes to re-engage after a poor performance. A student who scores poorly on a quiz, reviews the relevant content, and then scores significantly better on the retention quiz is demonstrating strong error recovery. A student who scores poorly and then disengages from the platform for several days is showing low resilience.

**Why it matters:** Professional environments are filled with failure. Code breaks. Products miss the mark. Presentations fall flat. The ability to recover from these setbacks, learn from them, and move forward is one of the most important qualities any employer looks for. It is very difficult to assess in an interview setting but becomes clearly visible over an eight-week learning cycle.

## 7.10 Dimension 9 — Conceptual Depth

**What it measures:** The difference between surface-level memorization and genuine conceptual understanding. Does a student understand principles well enough to apply them in novel situations, or can they only answer questions that look exactly like examples they have seen?

**How it is calculated:** The quiz generation system is specifically designed to generate questions at multiple cognitive levels — recall, comprehension, application, and analysis. The conceptual depth score is calculated by comparing a student's performance on recall-level questions versus application and analysis-level questions. A student who scores equally well on all levels demonstrates deep conceptual understanding. A student who scores well on recall but poorly on application is showing surface-level learning.

**Why it matters:** Conceptual depth determines whether a student can actually use what they have learned to solve real problems, or whether their knowledge is brittle and context-dependent. Companies need people who can take a principle they learned and apply it to a situation they have never seen before.

## 7.11 Soft Skills Overlay

In addition to the nine core learning dimensions, Phase One captures a preliminary layer of soft skills data. This data is less quantitative than the nine core dimensions but provides important qualitative context.

**Forum Participation Quality:** How frequently a student participates in discussion forums, whether their contributions are helpful to other students, and whether they ask thoughtful questions versus low-effort questions.

**Feedback Response Patterns:** When a mentor provides feedback on student work, how does the student respond? Do they acknowledge it, implement it, ask follow-up questions? Or do they ignore it?

**Written Communication Quality:** Beyond the communication dimension described above, this captures overall written quality across all text-based interactions on the platform.

**Peer Helpfulness:** Does the student help their fellow students in discussion forums, answer questions, or provide encouragement? This is an early signal of collaborative orientation.

---

# 8. Core Features — Detailed Overview

## 8.1 Feature: User Authentication and Role Management

### Description
The authentication system is the entry point for all users of M2i_LMS. It must be secure, reliable, and role-aware from the moment of registration. Every user in the system belongs to exactly one of four roles: Student, Mentor, Admin, or Super Admin. The role determines what data the user can see, what actions they can take, and what API endpoints they can access.

### Functional Requirements
The system must support user registration via email and password. Passwords must be hashed using bcrypt with a minimum salt round of 10. Authentication tokens must use JWT with a short expiration window of one hour. Refresh tokens with a seven-day expiration must be issued alongside access tokens to allow seamless re-authentication without requiring the user to log in repeatedly.

Token storage must use HttpOnly, Secure cookies to prevent XSS-based token theft. The system must implement token refresh logic that transparently refreshes the access token when it expires, provided the refresh token is still valid. On logout, both the access token and refresh token must be invalidated.

Role assignment is performed by admins at the time of user creation. Users cannot self-assign roles. Role changes can only be performed by admins or super admins.

### Authentication Flow
1. User submits email and password to POST /api/auth/login
2. System validates credentials against the database
3. On success, system issues a JWT access token (1 hour) and a refresh token (7 days)
4. Tokens are set as HttpOnly cookies
5. Subsequent requests include the access token automatically via cookie
6. When access token expires, the client automatically calls POST /api/auth/refresh-token
7. System validates the refresh token and issues a new access token
8. On logout, POST /api/auth/logout clears both cookies and invalidates the refresh token in the database

### Non-Functional Requirements
Login response time must be under 300 milliseconds for 95 percent of requests. The system must rate-limit login attempts to a maximum of five failed attempts per IP address per minute to prevent brute force attacks. Account lockout after ten consecutive failed attempts must be implemented with a 15-minute automatic unlock.

## 8.2 Feature: Content Management System

### Description
The Content Management System allows mentors to upload, organize, and manage all learning materials for their batch. It is the primary input mechanism for the quiz generation pipeline. The design principle here is simplicity for the mentor — uploading a video should be as frictionless as possible, and the system should handle all downstream processing automatically.

### Functional Requirements
Mentors must be able to upload video files in common formats including MP4, MOV, and WebM. Maximum file size per video upload is 2 GB. Videos are uploaded directly to cloud storage via pre-signed URLs to avoid routing large files through the application server. Alongside video uploads, mentors can upload supplementary materials in PDF, DOCX, and common image formats.

Each piece of content must be tagged with a topic title, a short description, and optional learning objectives. Learning objectives are particularly important because they serve as context for the quiz generation prompt — the more clearly defined the learning objectives, the better the generated quizzes will be.

Content must be organized by batch. A mentor can only upload content to batches they are assigned to. Content can be reordered within a batch, hidden from students (draft mode), and deleted (with a soft-delete pattern so data is preserved for historical analysis).

### Upload Flow
1. Mentor initiates upload from the content management interface
2. Frontend requests a pre-signed URL from the backend (POST /api/content/upload-url)
3. Frontend uploads the file directly to S3 using the pre-signed URL
4. On upload completion, frontend notifies the backend (POST /api/content)
5. Backend creates a content record in the database with metadata
6. Backend triggers an asynchronous transcription job via the job queue
7. Mentor receives a notification when transcription is complete
8. Backend triggers the quiz generation job after transcription
9. Mentor receives a notification when quizzes are ready for review

### Non-Functional Requirements
Upload must support resumable uploads for large files. If an upload is interrupted, it must be resumable without starting over. The upload progress must be displayed to the mentor in real time. Transcription processing time is expected to be 10 to 30 minutes for a typical 45-minute session video.

## 8.3 Feature: AI-Powered Quiz Generation

### Description
The quiz generation system is one of the most technically novel features of M2i_LMS. It eliminates the single largest time sink for mentors — manual quiz creation — while simultaneously ensuring that quizzes are closely aligned to the actual content delivered, cover multiple cognitive levels, and are available to students quickly after the content is published.

### Architecture Overview
The quiz generation pipeline consists of three stages: transcription, concept extraction, and question generation.

In the transcription stage, the Whisper model processes the video audio and produces a full text transcript. Whisper is run locally on the platform's infrastructure — not via API — to eliminate per-call costs and ensure data privacy. The quality of the transcript is sufficient for quiz generation purposes for clear speech. For videos with heavy accents or poor audio quality, mentors retain the ability to manually edit the transcript before triggering quiz generation.

In the concept extraction stage, the transcript is processed to identify key concepts, definitions, and procedural steps. This is done by constructing a prompt that instructs the Llama 2 model to identify the most important learnable concepts from the transcript. The output of this stage is a structured list of concepts that serves as the basis for question generation.

In the question generation stage, the Llama 2 model generates questions at multiple cognitive levels for each identified concept. For each concept, the model generates at minimum one recall question, one comprehension question, and one application question. Questions are generated in multiple-choice format with one correct answer and three plausible distractors.

### Quiz Types
Two quiz types are generated for each piece of content.

The Quick Assessment Quiz is designed for immediate post-session assessment. It contains five to ten questions focused on the most important concepts from the current content. Its purpose is to measure immediate comprehension. It becomes available to students within 24 hours of the content being published, after mentor approval.

The Retention Quiz is designed for delayed assessment. It contains ten to fifteen questions and mixes questions from the current content with questions revisiting concepts from one or two previous weeks. Its purpose is to measure knowledge retention over time. It becomes available 48 to 72 hours after the Quick Assessment Quiz.

### Mentor Review Interface
All AI-generated quizzes must be reviewed and approved by a mentor before they are visible to students. The mentor review interface presents each generated question with its correct answer and distractors. For each question, the mentor can take one of three actions:
- Approve the question as-is
- Edit the question, answer options, or correct answer and then approve
- Reject the question, which removes it from the quiz

The system logs all edits and rejections. This data is used to analyze the quality of the AI prompts and improve them over time. If a mentor rejects more than 50 percent of questions for a given piece of content, the system flags this for review so that prompt improvements can be targeted.

## 8.4 Feature: Live Streaming and Session Management

### Description
Live sessions are a core part of the M2i_LMS curriculum structure. They provide the interactive, synchronous learning experience that complements the asynchronous video content. The live streaming feature must support sessions of up to 200 concurrent participants, automatic recording, and seamless attendance tracking.

### Technical Approach
Live streaming is implemented using either Mux or Agora — third-party streaming infrastructure providers. This decision was made deliberately to avoid the significant engineering complexity of building a production-quality streaming system from scratch. Both Mux and Agora provide:

- WebRTC-based low-latency streaming
- CDN-backed video delivery for geographically distributed students
- Automatic recording and storage
- SDK support for web applications

The integration involves embedding the provider's web SDK into the Next.js frontend, with backend integration for session creation, token generation, and recording management.

### Session Lifecycle
1. Mentor creates a session via POST /api/live-sessions with title, date, time, and batch assignment
2. Students in the batch receive an in-platform notification about the upcoming session
3. At session time, the mentor starts the stream via the mentor interface
4. Students join via the student interface — their join time is recorded
5. The platform tracks each student's session duration (join time to leave time)
6. When the mentor ends the session, the recording is automatically saved
7. The recording is stored in cloud storage and linked to the session record
8. Students who missed the live session can watch the recording

## 8.5 Feature: Student Progress Dashboard

### Description
The student progress dashboard is the primary interface through which both students and mentors understand learning performance. It translates raw platform data into a clear, actionable view of a student's progress across all nine learning dimensions and supplementary soft skills signals.

### Student View
The student-facing dashboard shows the student their own progress only. It contains:

- A radar or spider chart showing their current scores across all nine learning dimensions
- A timeline view showing how each dimension score has changed week over week
- A quiz history table showing scores and dates for all attempted quizzes
- A content engagement summary showing time spent per content piece
- An attendance record for live sessions
- A written summary generated from their metrics explaining their key strengths and areas for development

### Mentor View
The mentor-facing dashboard shows all students in the batch. It contains:

- A sortable table of all students with their current scores across all nine dimensions
- Filters to identify students who are struggling on specific dimensions
- Individual student drill-down views for deeper analysis
- Alert indicators for students who have been inactive for more than three days
- Batch-level aggregate metrics showing overall cohort performance

---

# 9. Tech Stack — Full Specification

## 9.1 Decision Criteria

All technology decisions for M2i_LMS Phase One were evaluated against four criteria: development speed for a small team, suitability for the specific use case, long-term scalability, and open-source availability or cost. The following specifications reflect these decisions.

## 9.2 Frontend — Next.js

Next.js was selected over plain React for several reasons that are particularly relevant for a four-person team.

Next.js provides server-side rendering and static site generation out of the box, which improves initial page load performance and SEO without requiring additional configuration. The file-based routing system eliminates the need to configure React Router and provides a clean, conventional project structure that all team members can navigate easily.

Next.js API routes allow the frontend team to implement lightweight backend endpoints — for example, handling form submissions, simple data transformations, and webhook processing — without requiring involvement from the backend developer. This reduces the backend development bottleneck, which is significant when a single developer is responsible for the entire backend.

The Next.js ecosystem is mature and well-supported. Deployment to Vercel is trivially simple and includes automatic HTTPS, CDN delivery, and preview deployments for pull requests.

**Complementary libraries:**
- Tailwind CSS for utility-first styling, enabling rapid UI development without writing custom CSS
- shadcn/ui or Material-UI for pre-built, accessible UI components
- React Hook Form for performant form handling with built-in validation
- React Query or SWR for server state management and API data caching
- Socket.io-client for real-time WebSocket connections
- Chart.js or Recharts for data visualization on the progress dashboard
- Video.js or HLS.js for video playback

## 9.3 Backend — Node.js with Express

Node.js was selected as the backend runtime for its JavaScript consistency with the frontend, its non-blocking I/O model which is well-suited to the many concurrent connections expected from a live streaming environment, and the team's existing familiarity with the language.

Express was selected over alternative Node.js frameworks such as NestJS or Fastify because of its minimal overhead, high flexibility, and the very low learning curve it presents to developers who know Node.js. NestJS, while powerful, introduces significant architectural complexity — decorators, dependency injection, modules — that would slow down a small team working under time constraints. Express gives the team maximum control with minimum overhead.

**Complementary libraries:**
- Prisma as the ORM for type-safe database access and schema management
- Passport.js for authentication strategy management
- jsonwebtoken for JWT creation and validation
- bcryptjs for password hashing
- Multer for file upload handling
- Bull for background job queue management (transcription, quiz generation)
- Winston or Pino for structured logging
- Joi or Zod for request validation and input sanitization
- Helmet for security headers
- CORS middleware for cross-origin request management
- compression for response gzip compression

## 9.4 Database — PostgreSQL

PostgreSQL was selected over NoSQL alternatives such as MongoDB for several reasons specific to M2i_LMS's data model.

The data in M2i_LMS is highly relational. Users belong to batches via enrollments. Content belongs to batches. Quizzes belong to content. Quiz responses belong to users and quizzes. This relational structure maps naturally to a relational database and would require significant denormalization in a document database, introducing complexity and potential for data inconsistency.

PostgreSQL's ACID compliance guarantees are important for the metrics engine. When a quiz is submitted and scores are calculated, the data must be consistent — a partial write that records the submission but not the score update is unacceptable. PostgreSQL's transaction support makes this straightforward.

PostgreSQL's support for array columns, JSON columns, and full-text search provides the flexibility needed for storing quiz answer options (arrays), content metadata (JSON), and future full-text search functionality.

**Prisma as ORM:** Prisma provides a type-safe query interface that reduces the risk of SQL injection by default, auto-generates type definitions from the schema, and simplifies database migrations through its migration system. The Prisma schema file serves as the single source of truth for the database structure, making it easy for team members to understand the data model.

## 9.5 AI and ML Components

### Whisper — Video Transcription
Whisper is an open-source automatic speech recognition model released by OpenAI. It runs entirely locally on the platform's infrastructure, meaning no audio data is ever sent to an external API. This is important both for cost reasons and for data privacy.

Whisper is available in multiple model sizes. For production use, the medium or large model is recommended for acceptable accuracy on typical educational content audio. The base model may be sufficient for high-quality recordings but will struggle with accents or background noise.

Whisper is run as a background service on the server. When a video is uploaded and stored in S3, a background job is created in the Bull queue. The worker process downloads the video, extracts the audio, runs Whisper on the audio, and stores the resulting transcript in the database. This entire process happens asynchronously — the mentor is not blocked waiting for transcription to complete.

### Llama 2 — Quiz Generation
Llama 2 is an open-source large language model released by Meta. It is run locally via Ollama, a tool that simplifies running large language models on local or server infrastructure.

For quiz generation, the 7B or 13B parameter version of Llama 2 is recommended. The 7B model requires approximately 8 GB of RAM to run comfortably. The 13B model requires approximately 16 GB and produces significantly higher quality output. A GPU is strongly recommended for acceptable inference speed in a production environment — on CPU, generation times may be unacceptably slow.

The quiz generation prompt is constructed to include the transcript excerpt, the learning objectives defined by the mentor, the desired question type, and the cognitive level (recall, comprehension, application). Prompt engineering is an ongoing process — the initial prompts will be refined based on mentor rejection and edit patterns over the first several weeks of operation.

**Alternative:** Mistral 7B is an alternative to Llama 2 that has shown strong performance on instruction-following tasks. It requires similar resources and may produce better quiz generation results. The choice between Llama 2 and Mistral should be validated through testing with representative educational content.

## 9.6 Live Streaming — Mux or Agora

Both Mux and Agora provide production-quality streaming infrastructure that handles the hard problems of live streaming — encoding, CDN delivery, latency management, and recording — behind a well-documented SDK.

**Mux** is particularly strong for video-first use cases. Its Mux Live product provides a simple RTMP ingest URL and WebRTC-based playback. Pricing is based on usage, with a free tier sufficient for early testing. Mux automatically handles recording and stores recordings in its own storage, accessible via API.

**Agora** is particularly strong for interactive multi-party experiences. It supports both one-to-many broadcasting (appropriate for mentor-to-students sessions) and multi-party video conferencing. Agora's free tier allows up to 10,000 minutes per month — sufficient for Phase One testing.

The choice between Mux and Agora should be made based on a technical proof-of-concept that evaluates latency, reliability, and ease of SDK integration. Both are viable.

## 9.7 Cloud Storage — AWS S3 or Google Cloud Storage

Video content, supplementary materials, and session recordings must be stored in a cloud storage solution. Both AWS S3 and Google Cloud Storage are appropriate.

AWS S3 is the default recommendation due to its widespread adoption, extensive documentation, and tight integration with other AWS services that may be used in later phases. Pre-signed URLs are used for direct-to-storage uploads from the browser, eliminating the need to route large files through the application server.

## 9.8 Real-Time Notifications — Socket.io

Socket.io is used for delivering real-time notifications to both students and mentors. Notification events include: new content available, quiz ready to take, quiz approved by mentor, live session starting soon, and transcription complete.

Socket.io is integrated into the Express backend and the Next.js frontend. The Socket.io connection is established when a user logs in and maintained throughout their session. Notification events are emitted by the backend when relevant database state changes occur.

---

# 10. Database Design — Tables & Relationships

## 10.1 Overview

The Phase One database consists of nine core tables. The schema is designed to support the full data requirements of Phase One while being extensible for Phase Two and Three additions without requiring destructive schema changes.

All tables include created_at and updated_at timestamp columns, managed automatically by Prisma. Soft deletion via a deleted_at column is used for content and users to preserve historical data for the metrics engine.

## 10.2 Table: Users

**Purpose:** Stores all user accounts across all roles in the system.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | UUID | PRIMARY KEY, DEFAULT gen_random_uuid() | Unique user identifier |
| email | VARCHAR(255) | UNIQUE, NOT NULL | User's email address, used for login |
| password_hash | VARCHAR(255) | NOT NULL | Bcrypt-hashed password |
| full_name | VARCHAR(255) | NOT NULL | User's full name for display |
| role | ENUM | NOT NULL | One of: STUDENT, MENTOR, ADMIN, SUPER_ADMIN |
| avatar_url | TEXT | NULLABLE | URL to profile picture in cloud storage |
| is_active | BOOLEAN | DEFAULT TRUE | Soft deactivation flag |
| last_login_at | TIMESTAMP | NULLABLE | Timestamp of most recent login |
| created_at | TIMESTAMP | DEFAULT NOW() | Account creation timestamp |
| updated_at | TIMESTAMP | DEFAULT NOW() | Last update timestamp |
| deleted_at | TIMESTAMP | NULLABLE | Soft deletion timestamp |

**Indexes:** Index on email for fast login lookup. Index on role for filtering users by type.

## 10.3 Table: Batches

**Purpose:** Represents a cohort of students going through a curriculum together within a defined time period.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | UUID | PRIMARY KEY | Unique batch identifier |
| name | VARCHAR(255) | NOT NULL | Display name of the batch |
| description | TEXT | NULLABLE | Optional description of the batch curriculum |
| start_date | DATE | NOT NULL | Date the batch begins |
| end_date | DATE | NOT NULL | Projected date the batch ends |
| status | ENUM | DEFAULT 'ACTIVE' | One of: ACTIVE, COMPLETED, ARCHIVED |
| created_by | UUID | FOREIGN KEY → Users.id | Admin who created the batch |
| created_at | TIMESTAMP | DEFAULT NOW() | Batch creation timestamp |
| updated_at | TIMESTAMP | DEFAULT NOW() | Last update timestamp |

**Indexes:** Index on status for filtering active batches.

## 10.4 Table: Enrollments

**Purpose:** Junction table linking students to batches. Manages the many-to-many relationship between users with the STUDENT role and batches.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | UUID | PRIMARY KEY | Unique enrollment identifier |
| student_id | UUID | FOREIGN KEY → Users.id, NOT NULL | The enrolled student |
| batch_id | UUID | FOREIGN KEY → Batches.id, NOT NULL | The batch they are enrolled in |
| enrolled_at | TIMESTAMP | DEFAULT NOW() | When the student was enrolled |
| status | ENUM | DEFAULT 'ACTIVE' | One of: ACTIVE, WITHDRAWN, COMPLETED |
| enrolled_by | UUID | FOREIGN KEY → Users.id | Admin who created the enrollment |

**Unique Constraint:** (student_id, batch_id) — a student cannot be enrolled in the same batch twice.

**Indexes:** Index on student_id for looking up a student's enrollments. Index on batch_id for listing all students in a batch.

## 10.5 Table: Content

**Purpose:** Stores metadata for all learning materials uploaded to the platform, including videos and supplementary documents.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | UUID | PRIMARY KEY | Unique content identifier |
| batch_id | UUID | FOREIGN KEY → Batches.id, NOT NULL | The batch this content belongs to |
| uploaded_by | UUID | FOREIGN KEY → Users.id, NOT NULL | The mentor who uploaded it |
| title | VARCHAR(255) | NOT NULL | Display title of the content |
| description | TEXT | NULLABLE | Short description of what is covered |
| content_type | ENUM | NOT NULL | One of: VIDEO, DOCUMENT, RESOURCE |
| storage_url | TEXT | NOT NULL | URL to the file in cloud storage |
| duration_seconds | INTEGER | NULLABLE | Duration in seconds (for videos) |
| topic_tags | TEXT[] | DEFAULT '{}' | Array of topic tags |
| learning_objectives | TEXT | NULLABLE | Mentor-defined learning objectives for quiz generation |
| transcript | TEXT | NULLABLE | Auto-generated transcript from Whisper |
| transcription_status | ENUM | DEFAULT 'PENDING' | One of: PENDING, PROCESSING, COMPLETE, FAILED |
| is_published | BOOLEAN | DEFAULT FALSE | Whether content is visible to students |
| sort_order | INTEGER | DEFAULT 0 | Display order within the batch |
| created_at | TIMESTAMP | DEFAULT NOW() | Upload timestamp |
| updated_at | TIMESTAMP | DEFAULT NOW() | Last update timestamp |
| deleted_at | TIMESTAMP | NULLABLE | Soft deletion timestamp |

**Indexes:** Index on batch_id for listing batch content. Index on transcription_status for the background job system.

## 10.6 Table: Quizzes

**Purpose:** Stores individual quiz questions, their answer options, and their generation and approval status.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | UUID | PRIMARY KEY | Unique quiz question identifier |
| content_id | UUID | FOREIGN KEY → Content.id, NOT NULL | The content this quiz is based on |
| quiz_type | ENUM | NOT NULL | One of: QUICK_ASSESSMENT, RETENTION |
| question_text | TEXT | NOT NULL | The question as presented to students |
| options | JSONB | NOT NULL | Array of option objects: [{text, is_correct}] |
| cognitive_level | ENUM | NOT NULL | One of: RECALL, COMPREHENSION, APPLICATION, ANALYSIS |
| difficulty | ENUM | DEFAULT 'MEDIUM' | One of: EASY, MEDIUM, HARD |
| is_ai_generated | BOOLEAN | DEFAULT TRUE | Whether generated by AI or created manually |
| generation_status | ENUM | DEFAULT 'PENDING_REVIEW' | One of: PENDING_REVIEW, APPROVED, REJECTED |
| approved_by | UUID | FOREIGN KEY → Users.id, NULLABLE | Mentor who approved |
| approved_at | TIMESTAMP | NULLABLE | When it was approved |
| original_generated_text | TEXT | NULLABLE | Stores original AI output before edits |
| was_edited | BOOLEAN | DEFAULT FALSE | Whether mentor edited this question |
| created_at | TIMESTAMP | DEFAULT NOW() | Generation timestamp |
| updated_at | TIMESTAMP | DEFAULT NOW() | Last update timestamp |

**Indexes:** Index on content_id and quiz_type for fetching quizzes for a given content. Index on generation_status for the mentor review queue.

## 10.7 Table: QuizResponses

**Purpose:** Records every quiz attempt by every student, including their answers, scores, and timing.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | UUID | PRIMARY KEY | Unique response identifier |
| student_id | UUID | FOREIGN KEY → Users.id, NOT NULL | Student who attempted the quiz |
| quiz_id | UUID | FOREIGN KEY → Quizzes.id, NOT NULL | Quiz question being answered |
| selected_option_index | INTEGER | NOT NULL | Index of the option selected by the student |
| is_correct | BOOLEAN | NOT NULL | Whether the answer was correct |
| time_to_answer_seconds | INTEGER | NULLABLE | How long the student took to answer |
| attempt_number | INTEGER | DEFAULT 1 | Which attempt this is (1 = first attempt) |
| submitted_at | TIMESTAMP | DEFAULT NOW() | When the answer was submitted |

**Indexes:** Index on student_id for fetching a student's quiz history. Index on quiz_id for analytics. Composite index on (student_id, quiz_id) for checking if a student has already answered a question.

## 10.8 Table: LiveSessions

**Purpose:** Stores scheduled and completed live sessions conducted by mentors.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | UUID | PRIMARY KEY | Unique session identifier |
| batch_id | UUID | FOREIGN KEY → Batches.id, NOT NULL | The batch this session is for |
| mentor_id | UUID | FOREIGN KEY → Users.id, NOT NULL | The mentor conducting the session |
| title | VARCHAR(255) | NOT NULL | Session title |
| description | TEXT | NULLABLE | Session agenda or description |
| scheduled_at | TIMESTAMP | NOT NULL | Planned start time |
| started_at | TIMESTAMP | NULLABLE | Actual start time |
| ended_at | TIMESTAMP | NULLABLE | Actual end time |
| status | ENUM | DEFAULT 'SCHEDULED' | One of: SCHEDULED, LIVE, COMPLETED, CANCELLED |
| streaming_provider | VARCHAR(50) | NOT NULL | Mux or Agora |
| stream_key | TEXT | NULLABLE | Streaming provider session key |
| playback_url | TEXT | NULLABLE | URL for watching the recording |
| recording_url | TEXT | NULLABLE | URL for downloading the recording |
| created_at | TIMESTAMP | DEFAULT NOW() | When the session was scheduled |
| updated_at | TIMESTAMP | DEFAULT NOW() | Last update timestamp |

**Indexes:** Index on batch_id and scheduled_at for listing upcoming sessions. Index on status for filtering live sessions.

## 10.9 Table: SessionAttendance

**Purpose:** Records which students attended which live sessions, including their join and leave times.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | UUID | PRIMARY KEY | Unique attendance record identifier |
| session_id | UUID | FOREIGN KEY → LiveSessions.id, NOT NULL | The live session |
| student_id | UUID | FOREIGN KEY → Users.id, NOT NULL | The student |
| joined_at | TIMESTAMP | NOT NULL | When the student joined the session |
| left_at | TIMESTAMP | NULLABLE | When the student left (null if session is ongoing) |
| duration_seconds | INTEGER | NULLABLE | Calculated duration from join to leave |
| was_present | BOOLEAN | DEFAULT TRUE | Summary presence flag |

**Unique Constraint:** (session_id, student_id) — one attendance record per student per session.

**Indexes:** Index on session_id for listing attendees. Index on student_id for listing a student's attendance history.

## 10.10 Table: StudentProgress

**Purpose:** Stores the calculated learning dimension scores for each student, updated regularly by the metrics engine.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | UUID | PRIMARY KEY | Unique progress record identifier |
| student_id | UUID | FOREIGN KEY → Users.id, NOT NULL | The student |
| batch_id | UUID | FOREIGN KEY → Batches.id, NOT NULL | The batch context |
| week_number | INTEGER | NOT NULL | Which week of the curriculum this score covers |
| learning_velocity_score | DECIMAL(5,2) | DEFAULT 0 | Score 0–100 |
| content_engagement_score | DECIMAL(5,2) | DEFAULT 0 | Score 0–100 |
| problem_solving_score | DECIMAL(5,2) | DEFAULT 0 | Score 0–100 |
| knowledge_retention_score | DECIMAL(5,2) | DEFAULT 0 | Score 0–100 |
| consistency_score | DECIMAL(5,2) | DEFAULT 0 | Score 0–100 |
| curiosity_score | DECIMAL(5,2) | DEFAULT 0 | Score 0–100 |
| communication_score | DECIMAL(5,2) | DEFAULT 0 | Score 0–100 |
| error_recovery_score | DECIMAL(5,2) | DEFAULT 0 | Score 0–100 |
| conceptual_depth_score | DECIMAL(5,2) | DEFAULT 0 | Score 0–100 |
| soft_skills_score | DECIMAL(5,2) | DEFAULT 0 | Aggregate soft skills score 0–100 |
| overall_score | DECIMAL(5,2) | DEFAULT 0 | Weighted aggregate of all dimensions |
| calculated_at | TIMESTAMP | DEFAULT NOW() | When these scores were last calculated |

**Unique Constraint:** (student_id, batch_id, week_number) — one progress record per student per week per batch.

**Indexes:** Index on student_id and batch_id for fetching a student's progress history.

## 10.11 Summary of Relationships

The following describes the complete relationship graph of the Phase One schema:

- Users (STUDENT role) → Enrollments → Batches: A student is linked to a batch through an Enrollment record. One student can theoretically be enrolled in multiple batches across different time periods.
- Batches → Content: A batch contains many content items. Each piece of content belongs to exactly one batch.
- Content → Quizzes: Each piece of content generates multiple quiz questions — both Quick Assessment and Retention type.
- Quizzes → QuizResponses: Each quiz question can have many responses — one per student per attempt.
- Users (STUDENT role) → QuizResponses: Each student generates many quiz responses over the course of a batch.
- Users (MENTOR role) → LiveSessions: A mentor creates and owns live sessions.
- Batches → LiveSessions: Each live session belongs to one batch.
- LiveSessions → SessionAttendance: Each session generates one attendance record per attending student.
- Users (STUDENT role) → SessionAttendance: Each student has many attendance records.
- Users (STUDENT role) + Batches → StudentProgress: The metrics engine produces one StudentProgress record per student per week per batch, aggregating all available signals into the nine dimension scores.

---

# 11. API Structure — Endpoint Groups

## 11.1 API Design Principles

All API endpoints follow REST conventions. Request bodies and response bodies are in JSON format. All endpoints that modify data require authentication via JWT token. All endpoints that access user-specific data enforce role-based access control — a student cannot access another student's data, a mentor can only access data for their assigned batches, and admins have broader access.

All responses follow a consistent envelope format:
```json
{
  "success": true,
  "data": { ... },
  "message": "Optional human-readable message",
  "pagination": { "page": 1, "limit": 20, "total": 150 }
}
```

Error responses follow a consistent format:
```json
{
  "success": false,
  "error": {
    "code": "RESOURCE_NOT_FOUND",
    "message": "The requested quiz does not exist",
    "details": { "quizId": "abc-123" }
  },
  "timestamp": "2026-03-21T10:30:00Z"
}
```

## 11.2 Authentication Endpoints

| Method | Endpoint | Access | Description |
|--------|----------|--------|-------------|
| POST | /api/auth/register | Public | Register a new user account |
| POST | /api/auth/login | Public | Authenticate and receive tokens |
| POST | /api/auth/logout | Authenticated | Invalidate current session tokens |
| POST | /api/auth/refresh-token | Authenticated | Exchange refresh token for new access token |
| GET | /api/auth/me | Authenticated | Fetch current authenticated user's profile |
| PUT | /api/auth/me | Authenticated | Update current user's profile |
| POST | /api/auth/change-password | Authenticated | Change current user's password |

## 11.3 Batch Management Endpoints

| Method | Endpoint | Access | Description |
|--------|----------|--------|-------------|
| POST | /api/batches | Admin | Create a new batch |
| GET | /api/batches | Admin | List all batches with pagination |
| GET | /api/batches/:batchId | Admin, Mentor | Fetch batch details |
| PUT | /api/batches/:batchId | Admin | Update batch metadata |
| DELETE | /api/batches/:batchId | Admin | Soft-delete a batch |
| POST | /api/batches/:batchId/enroll | Admin | Enroll a student in the batch |
| DELETE | /api/batches/:batchId/enroll/:studentId | Admin | Remove a student from the batch |
| GET | /api/batches/:batchId/students | Admin, Mentor | List all students in a batch |

## 11.4 Content Management Endpoints

| Method | Endpoint | Access | Description |
|--------|----------|--------|-------------|
| POST | /api/content/upload-url | Mentor | Request a pre-signed S3 upload URL |
| POST | /api/content | Mentor | Create content record after upload |
| GET | /api/content/:contentId | Authenticated | Fetch content details and metadata |
| PUT | /api/content/:contentId | Mentor | Update content metadata |
| DELETE | /api/content/:contentId | Mentor, Admin | Soft-delete content |
| GET | /api/batches/:batchId/content | Authenticated | List all published content for a batch |
| POST | /api/content/:contentId/publish | Mentor | Make content visible to students |
| POST | /api/content/:contentId/unpublish | Mentor | Hide content from students |
| POST | /api/content/:contentId/regenerate-quizzes | Mentor | Trigger quiz regeneration for a content item |
| GET | /api/content/:contentId/transcript | Mentor | Fetch auto-generated transcript |
| PUT | /api/content/:contentId/transcript | Mentor | Update transcript before quiz regeneration |

## 11.5 Quiz Management Endpoints

| Method | Endpoint | Access | Description |
|--------|----------|--------|-------------|
| GET | /api/content/:contentId/quizzes | Mentor | Fetch all quizzes for content (including pending review) |
| GET | /api/content/:contentId/quizzes/approved | Student | Fetch approved quizzes for content |
| PUT | /api/quizzes/:quizId | Mentor | Edit a quiz question |
| POST | /api/quizzes/:quizId/approve | Mentor | Approve a quiz question |
| POST | /api/quizzes/:quizId/reject | Mentor | Reject a quiz question |
| POST | /api/quizzes/submit | Student | Submit answers for a set of quiz questions |
| GET | /api/students/:studentId/quiz-history | Student, Mentor | Fetch a student's full quiz attempt history |
| GET | /api/quizzes/:quizId/responses | Mentor | Fetch all student responses for a quiz |

## 11.6 Live Session Endpoints

| Method | Endpoint | Access | Description |
|--------|----------|--------|-------------|
| POST | /api/live-sessions | Mentor | Schedule a new live session |
| GET | /api/batches/:batchId/live-sessions | Authenticated | List sessions for a batch |
| GET | /api/live-sessions/:sessionId | Authenticated | Fetch session details |
| PUT | /api/live-sessions/:sessionId | Mentor | Update session details |
| DELETE | /api/live-sessions/:sessionId | Mentor, Admin | Cancel a session |
| POST | /api/live-sessions/:sessionId/start | Mentor | Start a live session |
| POST | /api/live-sessions/:sessionId/end | Mentor | End a live session |
| POST | /api/live-sessions/:sessionId/join | Student | Record student joining a session |
| POST | /api/live-sessions/:sessionId/leave | Student | Record student leaving a session |
| GET | /api/live-sessions/:sessionId/attendance | Mentor | Fetch attendance list for a session |

## 11.7 Progress and Analytics Endpoints

| Method | Endpoint | Access | Description |
|--------|----------|--------|-------------|
| GET | /api/students/:studentId/progress | Student, Mentor | Fetch student's learning dimension scores |
| GET | /api/students/:studentId/progress/history | Student, Mentor | Fetch weekly progress history |
| GET | /api/students/:studentId/engagement | Student, Mentor | Fetch content engagement metrics |
| GET | /api/students/:studentId/attendance | Student, Mentor | Fetch session attendance record |
| GET | /api/batches/:batchId/progress | Admin, Mentor | Fetch progress overview for entire batch |
| GET | /api/batches/:batchId/analytics | Admin, Mentor | Fetch aggregate batch analytics |

## 11.8 User Management Endpoints (Admin)

| Method | Endpoint | Access | Description |
|--------|----------|--------|-------------|
| POST | /api/users | Admin | Create a new user account |
| GET | /api/users | Admin | List all users with filters and pagination |
| GET | /api/users/:userId | Admin | Fetch user details |
| PUT | /api/users/:userId | Admin | Update user profile or role |
| DELETE | /api/users/:userId | Admin | Deactivate a user account |

---

# 12. Quiz Generation Workflow

## 12.1 Full Pipeline Description

The quiz generation pipeline is an asynchronous, multi-stage process that begins when content is uploaded and ends when a mentor approves quizzes for student access. The entire pipeline is managed by the Bull job queue system, which ensures that long-running processes like transcription and quiz generation do not block the main application server and are retried automatically in the event of failure.

## 12.2 Stage 1 — Content Upload and Storage

When a mentor uploads a video:

1. The frontend requests a pre-signed S3 URL from the backend via POST /api/content/upload-url
2. The frontend uploads the video directly to S3 using the pre-signed URL — the application server is not involved in the file transfer, which keeps server load low
3. On upload completion, the frontend calls POST /api/content with the content metadata including title, description, topic tags, and learning objectives
4. The backend creates a Content record in the database with transcription_status set to PENDING
5. The backend adds a TRANSCRIPTION job to the Bull queue with the content ID

## 12.3 Stage 2 — Transcription

The transcription worker picks up the TRANSCRIPTION job from the queue:

1. Updates the content record's transcription_status to PROCESSING
2. Downloads the video from S3 to the local filesystem (temporary storage)
3. Extracts the audio track from the video using FFmpeg
4. Runs Whisper on the audio file to generate a text transcript
5. Stores the transcript text in the Content table's transcript column
6. Updates transcription_status to COMPLETE
7. Cleans up the local temporary video and audio files
8. Adds a QUIZ_GENERATION job to the Bull queue with the content ID
9. Sends a real-time notification to the mentor via Socket.io: "Transcription complete for [content title]. Quiz generation in progress."

If transcription fails, the job is retried up to three times with exponential backoff. After three failures, the transcription_status is set to FAILED and the mentor is notified that manual transcript entry is required.

## 12.4 Stage 3 — Quiz Generation

The quiz generation worker picks up the QUIZ_GENERATION job from the queue:

1. Retrieves the content record including the transcript and learning objectives
2. Constructs the concept extraction prompt, including the full transcript and the mentor's learning objectives
3. Sends the prompt to Llama 2 running locally via Ollama
4. Parses the model's output to extract a list of key concepts from the content
5. For each key concept, constructs a question generation prompt specifying:
   - The concept to generate a question about
   - The desired cognitive level (rotating through RECALL, COMPREHENSION, APPLICATION)
   - The question format (multiple choice with one correct answer and three distractors)
   - Context from the transcript supporting this concept
6. Sends each question generation prompt to Llama 2 and parses the output
7. For each generated question, creates a Quiz record in the database with generation_status PENDING_REVIEW
8. Generates both QUICK_ASSESSMENT and RETENTION quiz sets
9. Sends a real-time notification to the mentor: "Quiz generation complete for [content title]. [N] questions ready for review."

## 12.5 Stage 4 — Mentor Review

The mentor opens the quiz review interface and sees a list of all pending review questions for a given piece of content. For each question, the mentor sees:

- The question text
- All four answer options, with the AI-designated correct answer highlighted
- The cognitive level designation
- The difficulty level designation
- The transcript excerpt that the question was based on (for context)

The mentor takes one of three actions per question:

**Approve:** The question is marked as APPROVED with the mentor's ID and timestamp recorded. No changes are made to the question text.

**Edit and Approve:** The mentor modifies the question text, answer options, or correct answer designation. The original AI-generated text is preserved in the original_generated_text column. The was_edited flag is set to TRUE. The question is marked as APPROVED.

**Reject:** The question is marked as REJECTED. The rejection is logged for prompt improvement analysis.

## 12.6 Stage 5 — Student Assessment

Once a sufficient number of questions in a quiz set have been approved (the threshold is configurable, defaulting to a minimum of five approved questions for a Quick Assessment and eight for a Retention quiz), the quiz becomes available to students.

Students are notified via Socket.io when a quiz is available. They navigate to the quiz interface, which presents questions one at a time with all answer options displayed. The time from quiz opening to each answer submission is recorded. On completing the quiz, the student receives immediate feedback showing which questions they answered correctly and which incorrectly, with explanations drawn from the transcript where available.

---

# 13. User Roles & Permissions

## 13.1 Permission Matrix

The following table defines the complete permission matrix for Phase One. Each row represents an action. Each column represents a role. A checkmark indicates the role can perform the action.

| Action | Student | Mentor | Admin | Super Admin |
|--------|---------|--------|-------|-------------|
| View own profile | ✓ | ✓ | ✓ | ✓ |
| Edit own profile | ✓ | ✓ | ✓ | ✓ |
| View own progress dashboard | ✓ | - | - | ✓ |
| View all students' progress in batch | - | ✓ | ✓ | ✓ |
| View platform-wide analytics | - | - | ✓ | ✓ |
| Access batch content | ✓ | ✓ | ✓ | ✓ |
| Upload content | - | ✓ | - | ✓ |
| Edit content | - | ✓ (own) | ✓ | ✓ |
| Delete content | - | ✓ (own) | ✓ | ✓ |
| Review quiz questions | - | ✓ | - | ✓ |
| Take quizzes | ✓ | - | - | - |
| View quiz responses | - | ✓ | ✓ | ✓ |
| Schedule live sessions | - | ✓ | - | ✓ |
| Attend live sessions | ✓ | - | - | - |
| View session attendance | - | ✓ | ✓ | ✓ |
| Create batches | - | - | ✓ | ✓ |
| Manage batches | - | - | ✓ | ✓ |
| Create users | - | - | ✓ | ✓ |
| Manage users | - | - | ✓ | ✓ |
| Assign roles | - | - | ✓ | ✓ |
| Access system settings | - | - | - | ✓ |
| View audit logs | - | - | ✓ | ✓ |

---

# 14. Data Flow Diagrams

## 14.1 Content to Quiz Generation Flow
```
[Mentor] 
   │
   │ 1. Uploads video via browser
   ↓
[Frontend (Next.js)]
   │
   │ 2. Requests pre-signed URL
   ↓
[Backend API (Express)]
   │
   │ 3. Returns pre-signed URL
   ↓
[Frontend]
   │
   │ 4. Uploads file directly to S3 (no app server involved)
   ↓
[AWS S3 / GCS]
   │
   │ 5. File stored. Frontend notifies backend.
   ↓
[Backend API]
   │
   │ 6. Creates Content record (transcription_status: PENDING)
   │ 7. Adds TRANSCRIPTION job to queue
   ↓
[Bull Queue]
   │
   │ 8. Worker picks up job
   ↓
[Transcription Worker]
   │
   │ 9. Downloads video from S3
   │ 10. Extracts audio (FFmpeg)
   │ 11. Runs Whisper on audio
   │ 12. Stores transcript in DB
   │ 13. Adds QUIZ_GENERATION job to queue
   ↓
[Bull Queue]
   │
   │ 14. Worker picks up job
   ↓
[Quiz Generation Worker]
   │
   │ 15. Extracts key concepts (Llama 2 via Ollama)
   │ 16. Generates questions per concept
   │ 17. Stores Quiz records (status: PENDING_REVIEW)
   │ 18. Notifies mentor via Socket.io
   ↓
[Mentor receives notification]
   │
   │ 19. Reviews questions in mentor interface
   │ 20. Approves / edits / rejects each question
   ↓
[Approved quizzes visible to students]
   │
   │ 21. Students receive notification
   │ 22. Students take quiz
   ↓
[QuizResponses stored in DB]
   │
   │ 23. Metrics engine processes responses
   ↓
[StudentProgress table updated]
   │
   │ 24. Student dashboard reflects new scores
```

## 14.2 Student Learning Journey Data Flow
```
[Student]
   │
   │ 1. Logs in → JWT token issued
   ↓
[Authenticated Session]
   │
   ├── 2. Accesses content
   │     ├── Content access event logged (time, content_id, student_id)
   │     ├── Time on page tracked
   │     └── Completion status updated
   │
   ├── 3. Attends live session
   │     ├── join event → SessionAttendance record created
   │     └── leave event → duration_seconds calculated
   │
   └── 4. Takes quiz
         ├── Each answer → QuizResponse record created
         ├── Score calculated immediately
         └── time_to_answer_seconds recorded
   │
   ↓
[Nightly Metrics Calculation Job]
   │
   ├── Reads all QuizResponses for student since last calculation
   ├── Reads all content access logs
   ├── Reads all SessionAttendance records
   ├── Calculates 9 dimension scores
   └── Updates StudentProgress record for current week
   │
   ↓
[Student Dashboard]
   │
   └── Displays updated dimension scores, history, and insights
```

---

# 15. Team Responsibilities & Workload Split

## 15.1 Team Composition

Phase One development is planned for a team of four people working full-time over nine weeks. The team consists of one backend developer, two to three frontend developers, and one product manager or technical lead. The following section details the specific responsibilities of each role.

## 15.2 Backend Developer Responsibilities

The backend developer owns the entire server-side codebase. This includes the Express API server, the PostgreSQL database schema and migrations, the Prisma ORM configuration, all background job workers (transcription and quiz generation), and the metrics calculation engine.

**Week-by-week backend priorities:**

Week 1: Express server setup, PostgreSQL setup, Prisma schema definition and initial migrations, JWT authentication implementation, role-based middleware.

Week 2: User management CRUD endpoints, batch management endpoints, enrollment system endpoints.

Week 3: Content management endpoints, S3 pre-signed URL generation, content metadata storage, content retrieval.

Week 4: Whisper integration, Llama 2 via Ollama integration, Bull queue setup, transcription worker, quiz generation worker, mentor quiz review endpoints.

Week 5: Mux or Agora integration, live session scheduling endpoints, session start/end endpoints, attendance tracking endpoints.

Week 6: Quiz submission endpoint, auto-grading logic, quiz history endpoints, duplicate submission prevention.

Week 7: Metrics calculation engine for all nine learning dimensions, StudentProgress table population, progress and analytics endpoints.

Week 8: Error handling hardening, input validation coverage, rate limiting, logging infrastructure, load testing, integration test coverage.

## 15.3 Frontend Developer Responsibilities

The frontend team owns the entire Next.js application. This includes all pages, components, state management, API integration, real-time Socket.io client logic, and responsive styling.

**Core pages and components to build:**

Authentication: Login page, registration page, forgot password flow, account settings.

Admin Interface: User management dashboard, batch creation and management, enrollment management, system settings.

Mentor Interface: Content upload page with drag-and-drop and progress indicator, content library view, quiz review interface, live session scheduling, student progress overview, batch analytics dashboard.

Student Interface: Home dashboard with upcoming sessions and pending quizzes, content library view, video player with progress tracking, quiz-taking interface with question-by-question flow and results summary, personal progress dashboard with radar chart and week-by-week trend charts, live session viewer.

Shared Components: Navigation header, notification bell with real-time Socket.io updates, loading states, error boundary components, confirmation dialogs.

## 15.4 Product Manager / Technical Lead Responsibilities

The product manager owns project planning, stakeholder communication, feature prioritization, and quality assurance coordination. They do not write production code but may write documentation, create test cases, manage the project board, and perform user acceptance testing on completed features.

**Ongoing responsibilities throughout Phase One:**
- Maintaining the project board and keeping tickets up to date
- Running weekly sprint planning and retrospective sessions
- Ensuring feature implementations match documented specifications
- Coordinating user acceptance testing with a small pilot group of students and mentors
- Managing the documentation repository and keeping sub-documents up to date as decisions evolve
- Tracking risks and escalating blockers early
- Gathering feedback from pilot users and converting it into actionable tickets for the next sprint

---

# 16. Success Metrics for Phase One

## 16.1 Technical Success Metrics

The following metrics define technical success for Phase One and must be met before the platform is considered ready for a broader rollout.

All seven core features must be fully functional with no critical bugs outstanding. A critical bug is defined as any issue that prevents a user from completing a primary flow — for example, an inability to submit a quiz, a failure in the live session join process, or a crash in the student progress dashboard.

API response times must be below 200 milliseconds at the 95th percentile for all non-AI endpoints. AI endpoints (quiz generation status checks, transcript status checks) may have response times up to 500 milliseconds.

The platform must maintain 99.5 percent uptime over a minimum two-week observation period prior to broader rollout.

The AI quiz generation pipeline must produce quizzes that mentors approve without editing at a rate of at least 60 percent of generated questions. If this threshold is not met, prompt engineering must be iterated before rollout.

The transcription pipeline must successfully complete transcription for at least 95 percent of uploaded videos within 45 minutes of upload.

## 16.2 User Adoption Success Metrics

Student engagement must meet the following minimum thresholds during the first two weeks of a pilot cohort:
- At least 80 percent of enrolled students must log in at least three times per week
- At least 85 percent of assigned quizzes must be completed by students within the designated time window
- At least 70 percent of enrolled students must attend at least one live session per week

Mentor engagement must meet the following minimum thresholds:
- 100 percent of mentors must upload at least one piece of content per week
- 100 percent of AI-generated quiz batches must be reviewed within 24 hours of generation

## 16.3 Learning Data Quality Metrics

The metrics engine must successfully calculate scores for all nine learning dimensions for 100 percent of students who have completed at least one quiz and accessed at least one piece of content.

The progress dashboard must display data that students and mentors describe as understandable and accurate when surveyed. A satisfaction score of at least 4 out of 5 on dashboard clarity must be achieved in pilot feedback.

---

# 17. Security Considerations

## 17.1 Authentication Security

Passwords must never be stored in plaintext. All passwords are hashed using bcrypt with a minimum of 10 salt rounds before storage. The bcrypt algorithm is deliberately slow, making brute-force attacks computationally infeasible.

JWT access tokens are issued with a one-hour expiration. Short expiration windows limit the damage window if a token is compromised. Refresh tokens have a seven-day expiration and are stored in the database — on logout, the refresh token is deleted from the database, making it impossible to use even if it was captured.

All tokens are transmitted and stored in HttpOnly, Secure cookies. HttpOnly prevents client-side JavaScript from accessing the token, blocking the most common XSS-based token theft vector.

Failed login attempts are rate-limited at five attempts per IP per minute. After ten consecutive failed attempts on a single account, the account is locked for 15 minutes. Admins receive an alert when account lockouts occur.

## 17.2 Authorization and Data Isolation

Every API endpoint that accesses or modifies data performs an authorization check before processing the request. This check verifies not only that the user is authenticated but that their role grants them access to the specific resource being requested and the specific action being performed.

Student data is strictly isolated. A student can only access their own quiz responses, their own progress data, and their own attendance records. Under no circumstances can a student query another student's data through any API endpoint.

Mentors are restricted to data within batches they are assigned to. A mentor cannot access content, quizzes, or student data from batches they do not manage.

Batch isolation is enforced at the query level using Prisma's where clauses. It is not sufficient to rely on frontend restrictions — all data isolation must be enforced server-side.

## 17.3 Input Validation and Injection Prevention

All user-provided input is validated before being processed by the application. Validation is performed using the Joi or Zod library. Validation rules define the expected type, format, length, and range of every input field. Requests that fail validation are rejected with a 400 Bad Request response before reaching any business logic or database code.

SQL injection is prevented by Prisma's parameterized query system. Raw SQL queries are not used anywhere in the application. All database interactions go through Prisma's type-safe query interface.

Cross-site scripting prevention is implemented through Content Security Policy headers, output encoding on all user-generated content rendered in the browser, and the React framework's default XSS-safe rendering behavior.

## 17.4 Data Privacy

Student data is sensitive and must be handled with care. The platform collects only data that is directly necessary for the learning metrics system. No behavioral data beyond what is described in this document is collected. Data retention policies must be defined and implemented — by default, student data is retained for the duration of the batch plus 12 months, after which it is anonymized.

Student data is never shared with companies or recruiters without explicit student consent. In Phase Three, when company access to student profiles is introduced, a robust consent mechanism must be in place before any data sharing occurs.

---

# 18. Scalability Considerations

## 18.1 Phase One Scale

Phase One is designed to support a single active batch of 100 to 500 students. At this scale, the infrastructure requirements are modest. A single PostgreSQL instance with adequate CPU and memory is sufficient. A single Node.js process managed by PM2 handles all API requests. The frontend is deployed to Vercel's global CDN, which handles traffic distribution and scaling automatically.

The Whisper and Llama 2 services are the most resource-intensive components. During Phase One, these services are expected to run on the same server as the application or on a dedicated instance. GPU access significantly reduces processing times — a 45-minute video takes approximately 3 to 5 minutes to transcribe on a GPU versus 20 to 30 minutes on CPU.

## 18.2 Phase Two Scale Considerations

As Phase Two introduces multiple concurrent batches, team features, GitHub integration, and Slack analysis, the infrastructure requirements increase significantly. The following architectural changes should be planned for Phase Two:

Database read replicas should be introduced to handle read-heavy analytics queries without impacting write performance. A Redis caching layer should be added for frequently accessed data such as student progress scores and batch content listings. The background job system should be expanded with dedicated worker instances separate from the application server to prevent job processing from impacting API response times.

## 18.3 Phase Three Scale Considerations

Phase Three introduces company access, leaderboards, and large-scale talent matching. At this scale, the platform may handle tens of thousands of students across hundreds of batches. The following architectural evolution should be planned:

Microservices decomposition may be warranted for high-load components such as the metrics calculation engine, the quiz generation service, and the talent matching system. A message broker such as RabbitMQ or Apache Kafka may replace Bull for inter-service communication. Database sharding or a distributed database solution may be required for the student progress data, which grows linearly with users and time.

---

# 19. Error Handling Strategy

## 19.1 Error Categories

All errors in M2i_LMS are classified into two broad categories: client errors and server errors.

Client errors (4xx responses) indicate that the request was malformed, unauthorized, or logically invalid. These errors are expected as part of normal operation and do not require alerting. They should be informative enough for the frontend to display a meaningful message to the user.

Server errors (5xx responses) indicate that the server encountered an unexpected condition. These errors are unexpected, should be logged with full context, and in production should trigger alerts to the development team.

## 19.2 Standard Error Codes

The following error codes are defined for use throughout the application. All error responses use these codes in the error.code field:

VALIDATION_ERROR — Input failed validation checks.
AUTHENTICATION_REQUIRED — Request requires authentication but no valid token was provided.
INVALID_CREDENTIALS — Login attempt with incorrect email or password.
TOKEN_EXPIRED — JWT access token has expired.
PERMISSION_DENIED — Authenticated user does not have permission for this action.
RESOURCE_NOT_FOUND — The requested resource does not exist.
RESOURCE_ALREADY_EXISTS — Attempted to create a resource that already exists (e.g., duplicate enrollment).
RATE_LIMIT_EXCEEDED — Too many requests from this IP.
QUIZ_ALREADY_SUBMITTED — Student attempted to submit a quiz they have already completed.
TRANSCRIPTION_FAILED — Video transcription pipeline encountered an unrecoverable error.
QUIZ_GENERATION_FAILED — Quiz generation pipeline encountered an unrecoverable error.
INTERNAL_SERVER_ERROR — Unexpected server error.

## 19.3 Graceful Degradation

The application must degrade gracefully when individual components fail. The following degradation behaviors are required:

If the quiz generation pipeline fails, the mentor must be notified and given the ability to create quiz questions manually. The platform must not leave the mentor with no path forward.

If the live streaming service is unavailable, the mentor must be notified before the session start time so they can communicate with students via alternative means. Session recordings from previous sessions must remain accessible even if the live service is down.

If the metrics calculation engine fails for a specific student, the last successfully calculated scores must be displayed with a timestamp indicating when they were calculated, rather than showing an error state.

If the database experiences high load, cached responses must be served where available rather than returning errors, with a visible freshness indicator showing when the data was last updated.

---

# 20. Performance Considerations

## 20.1 Target Performance Standards

The following performance standards define the minimum acceptable performance for Phase One:

API response time for all non-AI endpoints must be below 200 milliseconds at the 95th percentile under the expected load of 500 concurrent users. API response time must be below 500 milliseconds at the 99th percentile under the same load.

Video playback must begin within 2 seconds of the student clicking play, measured on a 10 Mbps internet connection.

The student progress dashboard must complete its initial load within 3 seconds on first visit and within 1 second on subsequent visits where data is cached.

Quiz submission and score display must complete within 500 milliseconds of the student submitting their final answer.

## 20.2 Performance Optimization Strategies

Database query performance is optimized through: appropriate indexing on all columns used in WHERE clauses and JOIN conditions, use of Prisma's select to fetch only required fields rather than full records, connection pooling to avoid connection overhead, and query analysis using EXPLAIN ANALYZE to identify slow queries.

API response performance is optimized through: gzip compression on all responses, appropriate use of HTTP caching headers for static and infrequently changing data, and payload optimization to avoid sending unnecessary data.

Frontend performance is optimized through: Next.js automatic code splitting by route so users only download JavaScript for the pages they visit, lazy loading of components below the fold, image optimization using Next.js's built-in image optimization, and React Query or SWR for client-side data caching that prevents unnecessary re-fetching.

---

# 21. Deployment Architecture

## 21.1 Local Development Environment

Every developer must be able to run the complete application stack locally with a single command. The local development environment uses Docker Compose to orchestrate the following services:

- PostgreSQL database container
- Redis container (for Bull queue)
- Node.js backend container with hot-reload via nodemon
- Ollama container with Llama 2 model loaded
- Whisper running as a Python service container

The Next.js frontend runs outside Docker using the standard npm run dev command for faster hot-reload performance.

Environment variables for local development are stored in a .env.local file that is never committed to the repository. A .env.example file with placeholder values is committed and serves as the template for new developer setup.

## 21.2 Production Architecture

The production environment for Phase One is designed for simplicity and reliability. The following components are deployed:

**Frontend:** The Next.js application is deployed to Vercel. Vercel provides automatic HTTPS, global CDN distribution, and automatic deployments from the main branch via GitHub integration. Preview deployments are created automatically for every pull request, enabling review of changes before they reach production.

**Backend API:** The Express application runs in a Docker container on a cloud virtual machine (AWS EC2, GCP Compute Engine, or similar). PM2 is used as the process manager to ensure the application restarts automatically after crashes and takes advantage of multi-core CPUs. A reverse proxy (Nginx) sits in front of the Node.js process to handle HTTPS termination, rate limiting, and request routing.

**Database:** PostgreSQL runs on a managed database service (AWS RDS, GCP Cloud SQL, or similar). Managed services handle automated backups, security patching, and failover without requiring manual database administration. Phase One uses a single instance with daily automated backups retained for 30 days.

**Background Workers:** The Whisper transcription service and the Bull queue workers run on a separate virtual machine from the API server. This ensures that long-running AI tasks do not compete for resources with API request handling.

**Storage:** AWS S3 or Google Cloud Storage stores video files, documents, and session recordings. A CloudFront or Cloud CDN distribution is placed in front of S3 to provide fast, geographically distributed delivery of video content.

## 21.3 Continuous Integration and Deployment

The CI/CD pipeline uses GitHub Actions. The following workflows are defined:

**Pull Request Workflow:** Triggered on every pull request to the main branch. Runs linting, unit tests, and integration tests. Pull requests cannot be merged without passing all checks.

**Backend Deployment Workflow:** Triggered on merge to main. Builds the Docker image, pushes it to the container registry, connects to the production server via SSH, pulls the new image, runs database migrations via Prisma, and restarts the application containers with zero-downtime deployment using PM2's rolling restart feature.

**Frontend Deployment Workflow:** Handled automatically by Vercel's GitHub integration. Every merge to main triggers a production deployment. Every pull request generates a preview deployment URL.

---

# 22. Timeline & Weekly Milestones

## Overview

Phase One development spans nine weeks. Weeks one through eight are active development weeks. Week nine is the beta launch week, during which the system goes live with a pilot cohort and the team focuses on monitoring, bug fixing, and iteration based on real user feedback.

---

## Week 1: Project Foundation and Authentication

### Backend Deliverables
- [ ] Initialize Node.js + Express project with full directory structure (routes, controllers, middleware, services, workers)
- [ ] Configure ESLint, Prettier, and Husky pre-commit hooks for code quality
- [ ] Define complete Prisma schema for all nine tables and run initial migration
- [ ] Implement user registration endpoint with input validation and bcrypt password hashing
- [ ] Implement user login endpoint with JWT access token and refresh token issuance
- [ ] Implement token refresh endpoint
- [ ] Implement logout endpoint with token invalidation
- [ ] Implement role-based authorization middleware used by all protected routes
- [ ] Write unit tests for authentication flows

### Frontend Deliverables
- [ ] Initialize Next.js project with Tailwind CSS, shadcn/ui, and React Hook Form
- [ ] Set up API client utility with automatic token refresh handling
- [ ] Build login page with form validation and error display
- [ ] Build registration page
- [ ] Build authenticated layout wrapper that redirects unauthenticated users
- [ ] Build role-based route guards that redirect users to the appropriate dashboard for their role

### End of Week Deliverable
A fully functional authentication system. A developer can register a user, log in, and receive a protected API response that confirms their role. All four user roles are testable.

---

## Week 2: User Management and Batch System

### Backend Deliverables
- [ ] Implement all user management CRUD endpoints (Admin only)
- [ ] Implement all batch management CRUD endpoints
- [ ] Implement student enrollment and withdrawal endpoints
- [ ] Add comprehensive input validation to all Week 2 endpoints
- [ ] Write integration tests for user management and batch flows

### Frontend Deliverables
- [ ] Build admin dashboard layout and navigation
- [ ] Build user listing page with search and filter functionality
- [ ] Build user creation form (admin creates accounts for students and mentors)
- [ ] Build batch creation and editing form
- [ ] Build batch detail page showing enrolled students and their status
- [ ] Build student enrollment interface (add/remove students from batch)

### End of Week Deliverable
An admin can create users with appropriate roles, create a batch, enroll students in the batch, and view the complete list of students in any batch.

---

## Week 3: Content Management System

### Backend Deliverables
- [ ] Implement pre-signed URL generation endpoint for S3 uploads
- [ ] Implement content creation endpoint (stores metadata after S3 upload)
- [ ] Implement content retrieval and listing endpoints
- [ ] Implement content update and soft-delete endpoints
- [ ] Implement content publish and unpublish endpoints
- [ ] Configure AWS S3 bucket with appropriate permissions and CORS settings
- [ ] Write integration tests for content management flows

### Frontend Deliverables
- [ ] Build mentor content library page
- [ ] Build content upload interface with drag-and-drop, file type validation, and upload progress bar
- [ ] Build content detail/edit page where mentors can update metadata, learning objectives, and tags
- [ ] Build student content listing page showing published content for their batch
- [ ] Build video player page using Video.js or HLS.js with progress tracking

### End of Week Deliverable
A mentor can upload a video with metadata. The video is stored in S3. Students can see published content and watch videos. Content access events are logged.

---

## Week 4: Transcription and Quiz Generation Pipeline

### Backend Deliverables
- [ ] Set up Bull queue with Redis connection
- [ ] Implement transcription worker using Whisper
- [ ] Implement quiz generation worker using Llama 2 via Ollama
- [ ] Implement mentor quiz review endpoints (fetch pending, approve, reject, edit)
- [ ] Implement quiz generation trigger endpoint (for manual regeneration)
- [ ] Implement transcript fetch and update endpoints
- [ ] Configure Socket.io server for real-time notifications
- [ ] Implement notification events for transcription complete and quiz ready for review
- [ ] Write integration tests for the full quiz generation pipeline

### Frontend Deliverables
- [ ] Build mentor quiz review page showing all pending questions for a content item
- [ ] Build individual question review component with approve, edit, and reject actions
- [ ] Build quiz editing form for mentor modifications
- [ ] Integrate Socket.io client to receive real-time notifications
- [ ] Build notification bell component showing recent notifications

### End of Week Deliverable
A mentor uploads a video. The system automatically transcribes it and generates quiz questions. The mentor receives a notification and can review, approve, edit, or reject each question.

---

## Week 5: Live Streaming and Session Management

### Backend Deliverables
- [ ] Integrate Mux or Agora SDK and implement session creation
- [ ] Implement live session scheduling, start, and end endpoints
- [ ] Implement student join and leave attendance tracking endpoints
- [ ] Implement session listing and retrieval endpoints
- [ ] Implement recording URL storage after session completion
- [ ] Write integration tests for live session flows

### Frontend Deliverables
- [ ] Build mentor session scheduling form
- [ ] Build mentor live session interface with stream start/stop controls
- [ ] Build student session listing page showing upcoming and past sessions
- [ ] Build student live session viewer with join/leave tracking
- [ ] Build session recording playback page for students who missed a live session

### End of Week Deliverable
A mentor can schedule and conduct a live session. Students can join via the browser. Attendance is recorded automatically. Session recordings are accessible after the session ends.

---

## Week 6: Quiz Taking System

### Backend Deliverables
- [ ] Implement quiz retrieval endpoint for students (approved quizzes only)
- [ ] Implement quiz submission endpoint with auto-grading logic
- [ ] Implement duplicate submission prevention
- [ ] Implement quiz history endpoint
- [ ] Implement quiz availability scheduling (quick quiz available 24h after content, retention quiz 48-72h later)
- [ ] Write integration tests for quiz submission and grading flows

### Frontend Deliverables
- [ ] Build student quiz listing page showing available quizzes with status (not started, in progress, completed)
- [ ] Build quiz-taking interface with question-by-question flow, answer selection, and navigation
- [ ] Build quiz completion and results page showing score, correct answers, and explanations
- [ ] Build quiz history view showing all past attempts with scores

### End of Week Deliverable
Students can take approved quizzes. Answers are submitted and automatically graded. Scores and responses are stored. Students can review their quiz history.

---

## Week 7: Metrics Calculation Engine and Progress Dashboard

### Backend Deliverables
- [ ] Implement learning velocity calculation algorithm
- [ ] Implement content engagement score calculation
- [ ] Implement problem-solving approach inference from behavioral data
- [ ] Implement knowledge retention calculation from retention quiz performance
- [ ] Implement consistency and discipline scoring
- [ ] Implement curiosity and self-direction scoring
- [ ] Implement communication and articulation preliminary scoring
- [ ] Implement error recovery and resilience scoring
- [ ] Implement conceptual depth scoring (recall vs application performance comparison)
- [ ] Implement nightly batch calculation job that processes all students
- [ ] Implement StudentProgress record creation and update logic
- [ ] Implement progress and analytics API endpoints
- [ ] Write unit tests for each scoring algorithm

### Frontend Deliverables
- [ ] Build student progress dashboard with radar chart for nine dimensions
- [ ] Build week-by-week trend chart for each dimension
- [ ] Build quiz score history table
- [ ] Build content engagement summary view
- [ ] Build attendance record view
- [ ] Build mentor batch progress overview showing all students' scores in sortable table
- [ ] Build mentor student drill-down view for detailed individual analysis

### End of Week Deliverable
The metrics engine calculates nine dimension scores for all students. The student progress dashboard displays all scores clearly. Mentors can see batch-level and individual-level progress data.

---

## Week 8: Polish, Testing, Security Hardening, and Launch Preparation

### Backend Deliverables
- [ ] Complete comprehensive error handling for all endpoints
- [ ] Complete input validation coverage for all endpoints
- [ ] Implement rate limiting on all endpoints
- [ ] Implement security headers using Helmet
- [ ] Set up Winston structured logging
- [ ] Write API documentation using Swagger/OpenAPI
- [ ] Complete integration test coverage for all critical flows
- [ ] Perform load testing simulating expected concurrent user count
- [ ] Fix all critical and high-priority bugs identified during testing

### Frontend Deliverables
- [ ] Complete responsive design across all pages for desktop and tablet
- [ ] Complete cross-browser testing (Chrome, Firefox, Safari, Edge)
- [ ] Implement loading states and skeleton screens for all data-fetching components
- [ ] Implement error boundary components for graceful failure handling
- [ ] Performance optimization — code splitting, image optimization, caching headers
- [ ] Accessibility review and fixes for keyboard navigation and screen reader compatibility
- [ ] End-to-end testing of all critical user flows using Playwright or Cypress

### DevOps and Infrastructure Deliverables
- [ ] Set up production PostgreSQL instance with automated backups
- [ ] Set up production S3 bucket with appropriate permissions
- [ ] Configure Nginx reverse proxy with HTTPS and rate limiting
- [ ] Set up Docker Compose or container deployment for backend
- [ ] Configure GitHub Actions CI/CD pipeline
- [ ] Set up Sentry for error monitoring
- [ ] Set up basic uptime monitoring
- [ ] Perform database restore drill to validate backup integrity
- [ ] Deploy to staging environment and run full smoke test

### End of Week Deliverable
The application is deployed to a production-equivalent staging environment, all critical flows pass end-to-end testing, and the platform is ready for a controlled beta launch with a pilot cohort.

---

## Week 9: Beta Launch and Iteration

### Activities
- [ ] Onboard pilot cohort of 20 to 50 students and 2 to 3 mentors
- [ ] Monitor system health, error rates, and performance in real-time during first days of operation
- [ ] Hold daily sync with the team to triage any issues that emerge from real usage
- [ ] Collect structured feedback from mentors and students at end of week
- [ ] Prioritize and fix critical bugs identified during beta
- [ ] Document known issues and planned improvements for the next iteration
- [ ] Evaluate AI quiz generation quality based on mentor approval and rejection patterns
- [ ] Begin planning Phase Two feature development

### Success Criteria for Week 9
- Zero critical bugs outstanding after day 3
- All enrolled students can complete the full weekly learning cycle without errors
- Mentor quiz approval workflow functioning smoothly
- Progress dashboard displaying accurate data for all students
- Positive feedback from pilot cohort on usability and value

---

# 23. Assumptions & Dependencies

## 23.1 Assumptions About the Operating Environment

The team assumes access to cloud infrastructure on either AWS or Google Cloud with a monthly budget sufficient to run the described production architecture. For Phase One at small scale, this is estimated at approximately USD 100 to 300 per month depending on provider and configuration choices.

The team assumes the Llama 2 model will generate quiz questions of acceptable quality with reasonable prompt engineering effort. This assumption should be validated with a proof-of-concept using representative educational content before Week 4 of development.

The team assumes that Whisper transcription quality will be acceptable for the types of content being uploaded — specifically, clearly spoken English in an educational setting. Videos with heavy background noise, strong regional accents, or low recording quality may produce transcripts of insufficient quality for quiz generation and will require manual review.

The team assumes a pilot cohort of 20 to 50 students and 2 to 3 mentors can be identified and onboarded by the end of Week 8, in time for the Week 9 beta launch.

The team assumes that the four-person team has the following skills: Node.js and Express backend development, React and Next.js frontend development, PostgreSQL database management, familiarity with Docker and cloud deployment, and basic familiarity with running language models locally.

## 23.2 External Dependencies

The following external services and tools are required for Phase One. Their availability and cost must be confirmed before development begins.

Mux or Agora is required for live streaming functionality. Both offer free tiers for development and testing. Production usage will incur costs based on streaming minutes. Confirm which provider is selected and that API keys are available before Week 5.

AWS S3 or Google Cloud Storage is required for video and content storage. An account with appropriate permissions must be set up and access keys must be available before Week 3.

Ollama must be installable on the production server infrastructure. Ollama supports Linux, macOS, and Windows. The production server must have sufficient RAM — minimum 8 GB for Llama 2 7B, recommended 16 GB for Llama 2 13B.

Whisper requires Python and the openai-whisper package to be installable on the production server. A GPU is strongly recommended for acceptable transcription speed.

FFmpeg must be installed on the server running the transcription worker, as it is required for audio extraction from video files.

---

# 24. Risk Assessment & Mitigation

## 24.1 Risk Register

The following risks have been identified for Phase One. Each risk is assessed on two axes: impact (how severe the consequence if it occurs) and likelihood (how probable it is to occur). Mitigations are defined for all medium-to-high risks.

---

**Risk 1: AI Quiz Generation Quality Below Acceptable Threshold**

Impact: High. If generated quizzes are consistently low quality, mentor review overhead eliminates the time-saving benefit, and mentor adoption of the platform suffers.

Likelihood: Medium. Quiz generation quality is highly dependent on prompt engineering, which requires iteration.

Mitigation: Dedicate Week 4 to prompt engineering iteration in parallel with implementation. Establish a quality benchmark early — test the generation pipeline on five to ten representative educational videos before declaring Week 4 complete. Define the 60 percent approval-without-editing threshold as the minimum acceptable baseline. If this threshold cannot be reached with reasonable prompt engineering, evaluate whether fine-tuning Llama 2 on educational quiz examples is feasible.

---

**Risk 2: Whisper Transcription Accuracy Insufficient for Technical Content**

Impact: High. Inaccurate transcripts lead to poorly targeted quiz questions, undermining the entire quiz generation pipeline.

Likelihood: Low for clear, well-recorded audio. Medium for technical vocabulary or non-native English speakers.

Mitigation: Test Whisper on representative sample videos early in Week 4. For technical content, provide custom vocabulary lists to Whisper where supported. Implement mentor transcript editing as a fallback pathway before quiz generation is triggered.

---

**Risk 3: Live Streaming Integration Complexity Exceeds Estimates**

Impact: Medium. Delayed live streaming implementation in Week 5 compresses the timeline for subsequent weeks.

Likelihood: Low. Both Mux and Agora provide well-documented SDKs with clear integration examples.

Mitigation: Complete a technical proof-of-concept for the chosen streaming provider before Week 5 begins. Ideally complete this during Week 3 or 4 as a parallel task. If integration proves unexpectedly complex, the live session recording playback feature can be descoped from Phase One (students watch recordings rather than attending live), reducing the streaming integration requirement significantly.

---

**Risk 4: Scope Creep During Development**

Impact: High. Feature additions mid-sprint consistently delay Phase One completion and increase technical debt.

Likelihood: High. Stakeholders often identify new features as development reveals capabilities and possibilities.

Mitigation: Enforce a strict feature freeze during Phase One development. All new feature ideas are logged in the backlog but not actioned until Phase Two planning. The product manager is responsible for defending the scope boundary. Any scope addition during Phase One requires explicit removal of an existing Phase One feature of comparable effort.

---

**Risk 5: Insufficient Server Resources for AI Workloads**

Impact: Medium. Transcription and quiz generation taking too long degrades mentor experience and delays quiz availability for students.

Likelihood: Medium. AI workloads are resource-intensive, and server costs may be higher than anticipated.

Mitigation: Use the smallest viable Whisper and Llama 2 model sizes during development. Profile actual resource consumption on representative workloads before selecting production server specifications. If GPU instances are too expensive, evaluate whether a queue-based batch processing approach with lower-spec hardware is acceptable for Phase One scale.

---

**Risk 6: PostgreSQL Performance Degradation Under Load**

Impact: Medium. Slow database queries cause poor API response times and degrade student and mentor experience.

Likelihood: Low for Phase One scale (under 500 students). Medium if the pilot cohort is larger than anticipated.

Mitigation: Index all foreign key columns and columns used in WHERE clauses as part of the Prisma schema definition. Use EXPLAIN ANALYZE during Week 8 load testing to identify slow queries. Implement Redis caching for the most frequently accessed data (student progress scores, content listings) if query times are unacceptable.

---

# 25. Phase Two — High-Level Overview

## 25.1 Objectives

Phase Two extends M2i_LMS beyond the individual learning assessment of Phase One into team-based project execution. The goal is to capture the second layer of the student profile — how they perform when working with others on real deliverables under real deadlines. Phase Two adds project tracking, team collaboration features, GitHub integration, soft skills measurement, and peer feedback mechanisms.

## 25.2 Key Features Planned for Phase Two

**Project Management Module:** Students form teams of four. Teams are assigned a real project with defined deliverables and a timeline. The platform provides a built-in project management interface — sprint boards, task assignment, deadline tracking, and progress reporting. This eliminates the need for students to use external tools, keeping all project activity data within the platform's metrics ecosystem.

**GitHub Integration:** Teams connect a GitHub repository to the platform. The platform reads commit history, pull request data, code review participation, and merge patterns. This data feeds into the project phase metrics engine, adding objective, tamper-proof signals of individual contribution and code quality.

**Slack Integration:** Teams communicate via a dedicated Slack workspace connected to the platform. The platform analyzes communication patterns — response times, question quality, helpfulness to teammates, sentiment — to generate soft skills scores. Students are informed of and consent to this analysis at enrollment.

**Peer Feedback System:** At the end of each sprint, team members complete structured feedback surveys about each other. Questions are carefully designed to capture collaboration quality, reliability, communication effectiveness, and contribution. Peer feedback is aggregated and anonymized before being shown to the rated student.

**Extended Metrics Engine:** The Phase Two metrics engine adds eight new dimensions to the student profile: execution quality, collaboration under pressure, feedback reception, adaptability, ownership and accountability, team contribution beyond assigned tasks, consistency across the project period, and resilience under uncertainty.

## 25.3 Timeline Estimate

Phase Two development is estimated at eight to ten weeks following the Phase One beta launch, with a brief two-week planning and feedback synthesis period after Phase One to incorporate lessons learned.

---

# 26. Phase Three — High-Level Overview

## 26.1 Objectives

Phase Three completes the M2i_LMS vision by building the bridge from student performance data to employment opportunity. It introduces the company-facing portal, the career path recommendation engine, and the direct internship hiring pipeline. At the end of Phase Three, M2i_LMS becomes a complete, end-to-end platform where a student with no prior experience can enter, learn, demonstrate their capabilities through real projects, receive a personalized career path recommendation, and be directly placed in an internship with a company that has been continuously watching their growth.

## 26.2 Key Features Planned for Phase Three

**Career Path Recommendation Engine:** An AI-driven system that analyzes a student's complete nine-plus-eight dimension profile from Phases One and Two and recommends career paths that align with their demonstrated strengths, learning style, and growth trajectory. Recommendations are not generic — they are specific to the student's actual data, explaining why each path is recommended based on which specific strengths and patterns support it.

**Company Portal:** A dedicated interface for company accounts that provides access to a continuously updated talent pool. Companies can filter students by specific skill dimensions, growth trajectory, domain expertise, and availability. The portal shows not just a student's current scores but their full growth history — allowing companies to identify students who are on an upward trajectory even if their current absolute scores are moderate.

**Student Leaderboard:** A ranked view of students within a batch or across the platform, based on configurable weightings of dimension scores. Companies can use the leaderboard to quickly identify top performers. Students are aware their rankings are visible to companies and consent to this visibility.

**Direct Internship Matching:** An AI-driven matching engine that pairs students with internship opportunities based on skill alignment and growth trajectory fit. Matches are presented to both students and companies for acceptance. The matching algorithm considers not just current skill level but projected growth, team fit, and role requirements.

**Direct Hiring Pipeline:** A built-in offer and acceptance mechanism allowing companies to make internship offers directly through the platform. Students receive notifications, can review offer details, and accept or decline within the platform. The entire process from company interest to offer acceptance is documented within the platform.

**ATS Integration:** For companies that use applicant tracking systems such as Greenhouse, Lever, or Workday, Phase Three provides direct integration allowing offer data from M2i_LMS to flow into the company's existing hiring infrastructure without manual re-entry.

## 26.3 Timeline Estimate

Phase Three development is estimated at ten to twelve weeks following Phase Two completion, after a two-week planning period to incorporate Phase Two learnings and gather early company partner feedback.

---

**End of Master Documentation**

---

**Document Information**

| Field | Value |
|-------|-------|
| Document Title | M2i_LMS Master Product Documentation |
| Version | 1.0 |
| Status | Draft — Pending Team Review |
| Created | March 2026 |
| Last Updated | March 2026 |
| Next Review | After Phase One Beta Launch |
| Maintained By | Product Team |
| Repository | /docs/master/M2i_LMS_Master_Documentation.md |