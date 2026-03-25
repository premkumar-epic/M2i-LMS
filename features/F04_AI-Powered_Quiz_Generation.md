# Feature 04 — AI-Powered Quiz Generation
### Complete Implementation Guide | Version 1.0 | March 2026
### Save As: F04_Quiz_Generation/F04_Implementation_Guide.md

---

# Table of Contents

1. [Feature Overview](#1-feature-overview)
2. [Core Functionality](#2-core-functionality)
3. [Data Model](#3-data-model)
4. [API Endpoints](#4-api-endpoints)
5. [Frontend Components](#5-frontend-components)
6. [Backend Logic and Implementation](#6-backend-logic-and-implementation)
7. [Prompt Engineering](#7-prompt-engineering)
8. [Implementation Steps](#8-implementation-steps)
9. [Error Handling](#9-error-handling)
10. [Testing Strategy](#10-testing-strategy)
11. [Code Examples](#11-code-examples)
12. [Performance Optimization](#12-performance-optimization)

---

# 1. Feature Overview

## 1.1 What Is This Feature?

AI-Powered Quiz Generation is the most technically novel feature in
M2i_LMS Phase One. It is the system that takes a video transcript —
produced by Whisper after a mentor uploads a video — and automatically
generates a full set of quiz questions at multiple cognitive levels,
organized into two quiz types, ready for mentor review.

This feature eliminates the single largest time burden on mentors in
any learning platform — manual quiz creation. Creating high-quality
assessment questions that genuinely test understanding at multiple
cognitive levels is a skilled, time-consuming task. Most educators
either skip assessments entirely or produce low-quality questions
that test only surface-level recall. M2i_LMS solves this by automating
the creation process and keeping the mentor in the loop only for
quality control.

The feature uses two open-source, locally-run AI models:

**Whisper (OpenAI, open-source):** Transcribes video audio to text.
Runs locally on the server. No external API calls. No per-minute cost.
Produces accurate transcripts for clear, well-recorded educational
content.

**Llama 2 / Mistral (Meta / Mistral AI, open-source):** Generates
quiz questions from transcripts. Runs locally via Ollama. No external
API calls. No per-token cost. Capable of following structured
instructions and producing JSON-formatted output.

Both models run entirely on M2i_LMS infrastructure. No student or
mentor data is sent to any external service.

## 1.2 Why This Feature Exists

Without automated quiz generation:
- Mentors must manually create 15–25 questions per content item
- Quiz quality depends entirely on mentor effort and skill
- Cognitive level variation (recall vs application) requires deliberate
  effort most mentors do not have time for
- The metrics engine has no reliable assessment data to calculate
  learning dimension scores

With automated quiz generation:
- Quizzes are ready within minutes of video transcription completing
- Questions cover multiple cognitive levels automatically
- Mentor effort is reduced to quality control — review, not creation
- The metrics engine has consistent, high-quality assessment data

## 1.3 What This Feature Produces

For every video content item, this feature produces:

**Quick Assessment Quiz:** 8–15 multiple-choice questions focused on
the current content. Questions span RECALL (40%), COMPREHENSION (40%),
and APPLICATION (20%) cognitive levels. Available to students within
24 hours of content publication, after mentor approval.

**Retention Quiz:** 10–20 multiple-choice questions mixing current
content (60%) and historical content from previous weeks (40%).
Questions span RECALL (20%), COMPREHENSION (40%), APPLICATION (30%),
and ANALYSIS (10%) cognitive levels. Available 48–72 hours after the
Quick Assessment Quiz.

## 1.4 Key Design Decisions

**Two-stage generation:** Concept extraction is performed separately
from question generation. One Llama 2 call identifies key concepts
from the transcript. Subsequent calls generate questions for each
concept. This separation produces better results than asking the model
to do both in one call.

**JSON output format enforcement:** Every Llama 2 call uses structured
output prompting to enforce JSON responses. The worker parses JSON
output and retries if parsing fails. This makes the pipeline reliable
enough for production use.

**Mentor review is mandatory:** No AI-generated question ever reaches
a student without mentor approval. This maintains trust in the
assessment quality and creates the feedback loop needed to improve
prompts over time.

**Local inference only:** No OpenAI API, no Anthropic API, no external
calls. Everything runs on your own infrastructure. This eliminates
API costs, data privacy concerns, and external service dependencies.

---

# 2. Core Functionality

## 2.1 Complete Pipeline Overview

The quiz generation pipeline is a multi-stage asynchronous process
managed by Bull job queues. Each stage is independent and can be
retried individually without restarting the entire pipeline.
```
[Feature 03 — Transcription Complete]
          |
          v
QUIZ_GENERATION job added to Bull queue
          |
          v
Stage 1: Context Preparation
  - Fetch content record (transcript, learning objectives,
    topic tags, batch context)
  - Split transcript into chunks if too long for context window
  - Build context object for generation
          |
          v
Stage 2: Concept Extraction
  - Send prompt to Llama 2 via Ollama API
  - Prompt: "Extract the 8-12 most important learnable concepts
             from this transcript"
  - Parse JSON response
  - Validate and clean concept list
          |
          v
Stage 3: Quick Assessment Generation
  For each concept (up to 12):
    - Determine cognitive level for this question
      (rotate through RECALL, COMPREHENSION, APPLICATION)
    - Build question generation prompt
    - Send to Llama 2
    - Parse JSON response
    - Validate question structure
    - Retry up to 2x if JSON invalid
    - Store Quiz record with status PENDING_REVIEW
          |
          v
Stage 4: Retention Quiz Generation
  - Fetch 2-4 concepts from previous content items in batch
  - For each concept (mix of current and historical):
    - Determine cognitive level (include ANALYSIS)
    - Generate question
    - Store Quiz record with status PENDING_REVIEW
          |
          v
Stage 5: Notification
  - Count generated questions per quiz type
  - Send in-platform notification to all batch mentors:
    "Quiz generation complete for [title].
     [N] questions ready for review."
  - Update content record with quiz generation status
```

## 2.2 Concept Extraction Flow

Concept extraction identifies what the quiz questions should be about.
Good concept extraction is the most important determinant of quiz
quality.

### Input to Concept Extraction
```
Transcript excerpt (first 6000 tokens if longer)
Learning objectives (if provided by mentor)
Topic tags
Content title
```

### Concept Extraction Prompt Structure
```
System: You are an expert curriculum designer analyzing educational
        content to identify key learnable concepts.

User: Analyze the following educational content and identify the
      8-12 most important concepts that a student should understand
      after studying this material.

      Content Title: [title]
      Topic Tags: [tags]
      Learning Objectives: [objectives or "Not specified"]
      
      Transcript:
      [transcript excerpt]

      Return your response as a JSON array of concept objects.
      Each concept must have:
      - "concept": brief name of the concept (5-10 words)
      - "explanation": one-sentence explanation
      - "importance": "HIGH", "MEDIUM", or "LOW"
      - "transcript_reference": short quote from the transcript
        this concept comes from (under 20 words)

      Return ONLY valid JSON. No other text.
      Example format:
      [
        {
          "concept": "Node.js event loop architecture",
          "explanation": "The mechanism that allows Node.js to
                         perform non-blocking I/O operations.",
          "importance": "HIGH",
          "transcript_reference": "the event loop is what allows
                                  Node.js to perform non-blocking"
        }
      ]
```

### Expected Concept Extraction Output
```json
[
  {
    "concept": "Node.js event loop architecture",
    "explanation": "The mechanism allowing Node.js to handle
                   multiple operations without blocking.",
    "importance": "HIGH",
    "transcript_reference": "the event loop is what allows
                             Node.js to perform non-blocking"
  },
  {
    "concept": "CommonJS module system",
    "explanation": "The require() and module.exports pattern
                   used in Node.js for code organization.",
    "importance": "HIGH",
    "transcript_reference": "when you use require to import
                             a module"
  },
  {
    "concept": "Asynchronous callback pattern",
    "explanation": "Functions passed as arguments to be called
                   when async operations complete.",
    "importance": "MEDIUM",
    "transcript_reference": "callbacks are functions that get
                             called when the operation is done"
  }
]
```

## 2.3 Question Generation Flow

For each concept identified in Stage 2, one question is generated.
The cognitive level cycles through RECALL → COMPREHENSION → APPLICATION
for Quick Assessment, and adds ANALYSIS for Retention quizzes.

### Question Generation Prompt Structure
```
System: You are an expert educational assessment designer creating
        multiple-choice questions for adult learners studying
        software development.

User: Create a [COGNITIVE_LEVEL] multiple-choice question about
      the following concept from a Node.js course.

      Concept: [concept name]
      Concept Explanation: [explanation]
      Context from Transcript: [transcript_reference]
      
      Cognitive Level Definition:
      [RECALL: Tests whether the student can remember a fact,
               definition, or procedure exactly as taught.]
      [COMPREHENSION: Tests whether the student understands the
                      concept well enough to explain it in their
                      own words or identify examples.]
      [APPLICATION: Tests whether the student can apply the
                    concept to solve a new problem they have not
                    seen before.]
      [ANALYSIS: Tests whether the student can break down a
                 complex scenario and identify which concepts
                 apply and why.]

      Requirements:
      - Question must be clearly worded and unambiguous
      - All four options must be plausible to someone unfamiliar
        with the content
      - Only ONE option must be clearly correct
      - Incorrect options must be wrong but not obviously absurd
      - Question must be answerable from the transcript content alone
      - Do not use "all of the above" or "none of the above"

      Return ONLY valid JSON in this exact format:
      {
        "question": "The question text here?",
        "options": [
          "Option A text",
          "Option B text", 
          "Option C text",
          "Option D text"
        ],
        "correct_option_index": 0,
        "explanation": "Brief explanation of why the correct
                       answer is right and why the others
                       are wrong.",
        "difficulty": "EASY" | "MEDIUM" | "HARD"
      }

      Return ONLY valid JSON. No other text.
```

### Expected Question Generation Output
```json
{
  "question": "What is the primary purpose of the event loop in Node.js?",
  "options": [
    "To allow Node.js to handle multiple I/O operations concurrently without blocking execution",
    "To manage memory allocation for JavaScript objects",
    "To compile JavaScript code to machine code before execution",
    "To synchronize data between multiple Node.js processes"
  ],
  "correct_option_index": 0,
  "explanation": "The event loop enables Node.js to perform non-blocking I/O operations by offloading operations to the system kernel and receiving callbacks when operations complete, allowing the main thread to continue executing other code.",
  "difficulty": "MEDIUM"
}
```

---

# 3. Data Model

## 3.1 Quizzes Table

Stores individual quiz questions. Each question belongs to a content
item, has a type (QUICK_ASSESSMENT or RETENTION), a cognitive level,
and a generation/approval status.
```sql
CREATE TABLE quizzes (
  id                      UUID          PRIMARY KEY 
                                        DEFAULT gen_random_uuid(),
  content_id              UUID          NOT NULL 
                                        REFERENCES content(id),
  batch_id                UUID          NOT NULL 
                                        REFERENCES batches(id),
  quiz_type               VARCHAR(20)   NOT NULL 
                                        CHECK (quiz_type IN (
                                          'QUICK_ASSESSMENT',
                                          'RETENTION'
                                        )),
  question_text           TEXT          NOT NULL,
  options                 JSONB         NOT NULL,
  correct_option_index    INTEGER       NOT NULL 
                                        CHECK (correct_option_index 
                                          BETWEEN 0 AND 3),
  explanation             TEXT          DEFAULT NULL,
  cognitive_level         VARCHAR(20)   NOT NULL 
                                        CHECK (cognitive_level IN (
                                          'RECALL',
                                          'COMPREHENSION',
                                          'APPLICATION',
                                          'ANALYSIS'
                                        )),
  difficulty              VARCHAR(10)   NOT NULL DEFAULT 'MEDIUM'
                                        CHECK (difficulty IN (
                                          'EASY',
                                          'MEDIUM',
                                          'HARD'
                                        )),
  is_ai_generated         BOOLEAN       NOT NULL DEFAULT TRUE,
  generation_status       VARCHAR(20)   NOT NULL 
                                        DEFAULT 'PENDING_REVIEW'
                                        CHECK (generation_status IN (
                                          'PENDING_REVIEW',
                                          'APPROVED',
                                          'REJECTED'
                                        )),
  approved_by             UUID          DEFAULT NULL 
                                        REFERENCES users(id),
  approved_at             TIMESTAMP     DEFAULT NULL,
  rejection_reason        VARCHAR(50)   DEFAULT NULL,
  original_question_text  TEXT          DEFAULT NULL,
  original_options        JSONB         DEFAULT NULL,
  was_edited              BOOLEAN       NOT NULL DEFAULT FALSE,
  available_from          TIMESTAMP     DEFAULT NULL,
  source_concept          TEXT          DEFAULT NULL,
  transcript_reference    TEXT          DEFAULT NULL,
  created_at              TIMESTAMP     NOT NULL DEFAULT NOW(),
  updated_at              TIMESTAMP     NOT NULL DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_quizzes_content_id
  ON quizzes(content_id);

CREATE INDEX idx_quizzes_batch_id
  ON quizzes(batch_id);

CREATE INDEX idx_quizzes_content_type
  ON quizzes(content_id, quiz_type);

CREATE INDEX idx_quizzes_generation_status
  ON quizzes(generation_status)
  WHERE generation_status = 'PENDING_REVIEW';

CREATE INDEX idx_quizzes_approved_available
  ON quizzes(batch_id, quiz_type, available_from)
  WHERE generation_status = 'APPROVED';
```

### Column Definitions

**id:** UUID primary key.

**content_id:** The content item this quiz question belongs to.
Foreign key to content table.

**batch_id:** Denormalized for query efficiency. Allows fetching all
quizzes for a batch without joining through content.

**quiz_type:** QUICK_ASSESSMENT (immediate comprehension check) or
RETENTION (delayed mixed assessment).

**question_text:** The actual question text shown to students.

**options:** JSONB array of exactly four option strings. Example:
```json
["Option A", "Option B", "Option C", "Option D"]
```

**correct_option_index:** Integer 0–3 indicating which option in the
options array is correct. The display order presented to students is
randomized — this index refers to the canonical storage order, not
the display order.

**explanation:** AI-generated explanation of why the correct answer
is right. Shown to students after quiz submission.

**cognitive_level:** RECALL, COMPREHENSION, APPLICATION, or ANALYSIS.
This is used by the metrics engine to calculate the Conceptual Depth
dimension score.

**difficulty:** EASY, MEDIUM, or HARD. AI-assigned. Used to balance
quiz difficulty and for analytics.

**is_ai_generated:** FALSE only for questions manually created by
mentors. Used for analytics to measure AI generation quality.

**generation_status:** PENDING_REVIEW (waiting for mentor), APPROVED
(visible to students), REJECTED (removed from quizzes).

**approved_by / approved_at:** Which mentor approved and when.

**rejection_reason:** Controlled vocabulary: FACTUALLY_INCORRECT,
POORLY_WORDED, OFF_TOPIC, TOO_EASY, TOO_HARD, DUPLICATE, OTHER.

**original_question_text / original_options:** The original AI output
before any mentor edits. If was_edited = TRUE, these fields preserve
the pre-edit version.

**was_edited:** TRUE if mentor changed the question or options.

**available_from:** When this quiz becomes visible to students.
Quick Assessment: 24h after content publication. Retention: 72h after
Quick Assessment.

**source_concept:** The concept extracted in Stage 2 that this
question is testing. Stored for analytics.

**transcript_reference:** Short excerpt from transcript this question
is based on. Shown to mentor during review for context.

## 3.2 QuizGenerationLogs Table

Tracks each quiz generation run for debugging and prompt improvement.
```sql
CREATE TABLE quiz_generation_logs (
  id                  UUID          PRIMARY KEY 
                                    DEFAULT gen_random_uuid(),
  content_id          UUID          NOT NULL 
                                    REFERENCES content(id),
  generation_run_id   UUID          NOT NULL,
  stage               VARCHAR(30)   NOT NULL,
  model_used          VARCHAR(50)   NOT NULL,
  prompt_tokens       INTEGER       DEFAULT NULL,
  completion_tokens   INTEGER       DEFAULT NULL,
  duration_ms         INTEGER       DEFAULT NULL,
  success             BOOLEAN       NOT NULL,
  error_message       TEXT          DEFAULT NULL,
  concepts_extracted  INTEGER       DEFAULT NULL,
  questions_generated INTEGER       DEFAULT NULL,
  created_at          TIMESTAMP     NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_gen_logs_content_id
  ON quiz_generation_logs(content_id);

CREATE INDEX idx_gen_logs_run_id
  ON quiz_generation_logs(generation_run_id);
```

## 3.3 Prisma Schema
```prisma
model Quiz {
  id                    String          @id 
                                        @default(dbgenerated(
                                          "gen_random_uuid()")) 
                                        @db.Uuid
  contentId             String          @map("content_id") @db.Uuid
  batchId               String          @map("batch_id") @db.Uuid
  quizType              QuizType        @map("quiz_type")
  questionText          String          @map("question_text") @db.Text
  options               Json
  correctOptionIndex    Int             @map("correct_option_index")
  explanation           String?         @db.Text
  cognitiveLevel        CognitiveLevel  @map("cognitive_level")
  difficulty            Difficulty      @default(MEDIUM)
  isAiGenerated         Boolean         @default(true) 
                                        @map("is_ai_generated")
  generationStatus      GenerationStatus @default(PENDING_REVIEW) 
                                        @map("generation_status")
  approvedBy            String?         @map("approved_by") @db.Uuid
  approvedAt            DateTime?       @map("approved_at")
  rejectionReason       String?         @map("rejection_reason") 
                                        @db.VarChar(50)
  originalQuestionText  String?         @map("original_question_text") 
                                        @db.Text
  originalOptions       Json?           @map("original_options")
  wasEdited             Boolean         @default(false) 
                                        @map("was_edited")
  availableFrom         DateTime?       @map("available_from")
  sourceConcept         String?         @map("source_concept") @db.Text
  transcriptReference   String?         @map("transcript_reference") 
                                        @db.Text
  createdAt             DateTime        @default(now()) 
                                        @map("created_at")
  updatedAt             DateTime        @updatedAt @map("updated_at")

  content               Content         @relation(
                                          fields: [contentId], 
                                          references: [id])
  approver              User?           @relation(
                                          fields: [approvedBy], 
                                          references: [id])
  responses             QuizResponse[]

  @@map("quizzes")
}

model QuizGenerationLog {
  id                  String    @id 
                                @default(dbgenerated(
                                  "gen_random_uuid()")) 
                                @db.Uuid
  contentId           String    @map("content_id") @db.Uuid
  generationRunId     String    @map("generation_run_id") @db.Uuid
  stage               String    @db.VarChar(30)
  modelUsed           String    @map("model_used") @db.VarChar(50)
  promptTokens        Int?      @map("prompt_tokens")
  completionTokens    Int?      @map("completion_tokens")
  durationMs          Int?      @map("duration_ms")
  success             Boolean
  errorMessage        String?   @map("error_message") @db.Text
  conceptsExtracted   Int?      @map("concepts_extracted")
  questionsGenerated  Int?      @map("questions_generated")
  createdAt           DateTime  @default(now()) @map("created_at")

  @@map("quiz_generation_logs")
}

enum QuizType {
  QUICK_ASSESSMENT
  RETENTION
}

enum CognitiveLevel {
  RECALL
  COMPREHENSION
  APPLICATION
  ANALYSIS
}

enum Difficulty {
  EASY
  MEDIUM
  HARD
}

enum GenerationStatus {
  PENDING_REVIEW
  APPROVED
  REJECTED
}
```

---

# 4. API Endpoints

## 4.1 Quiz Generation Endpoints

### POST /api/content/:contentId/regenerate-quizzes

**Access:** MENTOR (assigned to batch), ADMIN, SUPER_ADMIN

**Purpose:** Manually trigger quiz regeneration. Used after mentor
edits the transcript.

**Request:** No body required.

**Success Response (200 OK):**
```json
{
  "success": true,
  "message": "Quiz generation queued. You will be notified 
              when questions are ready for review.",
  "data": {
    "job_id": "bull-job-id-123",
    "estimated_minutes": 5
  }
}
```

**Error Responses:**
```json
// 400 - Transcription not yet complete
{
  "success": false,
  "error": {
    "code": "TRANSCRIPTION_NOT_COMPLETE",
    "message": "Quiz generation requires a completed transcript. 
                Current status: PROCESSING"
  }
}

// 400 - Generation already in progress
{
  "success": false,
  "error": {
    "code": "GENERATION_IN_PROGRESS",
    "message": "Quiz generation is already running for this content."
  }
}
```

---

## 4.2 Quiz Review Endpoints

### GET /api/batches/:batchId/quizzes/pending

**Access:** MENTOR (assigned to batch), ADMIN, SUPER_ADMIN

**Purpose:** Fetch all quiz questions pending review across all content
items in the batch. This is the mentor's primary review queue.

**Query Parameters:**
```
content_id     : filter by specific content item
quiz_type      : QUICK_ASSESSMENT or RETENTION
cognitive_level: RECALL, COMPREHENSION, APPLICATION, ANALYSIS
page           : page number (default: 1)
limit          : results per page (default: 30)
```

**Success Response (200 OK):**
```json
{
  "success": true,
  "data": {
    "summary": {
      "total_pending": 24,
      "total_approved": 18,
      "total_rejected": 3,
      "by_content": [
        {
          "content_id": "content-uuid-1",
          "content_title": "Introduction to Node.js",
          "pending_count": 12,
          "approved_count": 0
        },
        {
          "content_id": "content-uuid-2",
          "content_title": "Express.js Fundamentals",
          "pending_count": 12,
          "approved_count": 18
        }
      ]
    },
    "questions": [
      {
        "quiz_id": "quiz-uuid-1",
        "content_id": "content-uuid-1",
        "content_title": "Introduction to Node.js",
        "quiz_type": "QUICK_ASSESSMENT",
        "question_text": "What is the primary purpose of the 
                         event loop in Node.js?",
        "options": [
          "To allow Node.js to handle multiple I/O operations 
           concurrently without blocking execution",
          "To manage memory allocation for JavaScript objects",
          "To compile JavaScript code to machine code",
          "To synchronize data between multiple Node.js processes"
        ],
        "correct_option_index": 0,
        "explanation": "The event loop enables non-blocking I/O...",
        "cognitive_level": "RECALL",
        "difficulty": "MEDIUM",
        "source_concept": "Node.js event loop architecture",
        "transcript_reference": "the event loop is what allows 
                                 Node.js to perform non-blocking",
        "is_ai_generated": true,
        "was_edited": false,
        "created_at": "2026-03-21T12:00:00Z"
      }
    ]
  },
  "pagination": {
    "page": 1,
    "limit": 30,
    "total": 24,
    "total_pages": 1
  }
}
```

---

### POST /api/quizzes/:quizId/approve

**Access:** MENTOR (assigned to batch), ADMIN, SUPER_ADMIN

**Purpose:** Approve a quiz question for student access

**Request:** No body required.

**Success Response (200 OK):**
```json
{
  "success": true,
  "data": {
    "quiz_id": "quiz-uuid-1",
    "generation_status": "APPROVED",
    "approved_by": "mentor-uuid-1",
    "approved_at": "2026-03-21T14:00:00Z"
  },
  "message": "Question approved"
}
```

---

### POST /api/quizzes/batch-approve

**Access:** MENTOR (assigned to batch), ADMIN, SUPER_ADMIN

**Purpose:** Approve multiple questions at once

**Request Body:**
```json
{
  "quiz_ids": [
    "quiz-uuid-1",
    "quiz-uuid-2",
    "quiz-uuid-3"
  ]
}
```

**Success Response (200 OK):**
```json
{
  "success": true,
  "data": {
    "approved_count": 3,
    "failed_count": 0
  },
  "message": "3 questions approved"
}
```

---

### PUT /api/quizzes/:quizId

**Access:** MENTOR (assigned to batch), ADMIN, SUPER_ADMIN

**Purpose:** Edit a quiz question before approving it

**Request Body (all fields optional):**
```json
{
  "question_text": "Updated question text?",
  "options": [
    "Updated option A",
    "Updated option B",
    "Updated option C",
    "Updated option D"
  ],
  "correct_option_index": 2,
  "cognitive_level": "COMPREHENSION",
  "difficulty": "HARD",
  "explanation": "Updated explanation..."
}
```

**Behavior:**
- Saves the original AI-generated text to original_question_text
  and original_options before applying edits
- Sets was_edited = TRUE
- Does NOT automatically approve — mentor must call approve
  after editing

**Success Response (200 OK):**
```json
{
  "success": true,
  "data": {
    "quiz_id": "quiz-uuid-1",
    "question_text": "Updated question text?",
    "was_edited": true,
    "generation_status": "PENDING_REVIEW"
  },
  "message": "Question updated. Please approve to make it 
              available to students."
}
```

---

### POST /api/quizzes/:quizId/reject

**Access:** MENTOR (assigned to batch), ADMIN, SUPER_ADMIN

**Purpose:** Reject a quiz question

**Request Body:**
```json
{
  "reason": "FACTUALLY_INCORRECT"
}
```

**Valid rejection reasons:**
```
FACTUALLY_INCORRECT  — The question or answer contains factual errors
POORLY_WORDED        — The question is unclear or ambiguous
OFF_TOPIC            — The question is not relevant to this content
TOO_EASY             — The question does not test meaningful understanding
TOO_HARD             — The question is beyond the scope of this content
DUPLICATE            — Very similar question already approved
OTHER                — Other reason
```

**Success Response (200 OK):**
```json
{
  "success": true,
  "data": {
    "quiz_id": "quiz-uuid-1",
    "generation_status": "REJECTED",
    "rejection_reason": "FACTUALLY_INCORRECT"
  },
  "message": "Question rejected"
}
```

---

### POST /api/content/:contentId/quizzes/manual

**Access:** MENTOR (assigned to batch), ADMIN, SUPER_ADMIN

**Purpose:** Create a quiz question manually

**Request Body:**
```json
{
  "quiz_type": "QUICK_ASSESSMENT",
  "question_text": "What does the require() function do in Node.js?",
  "options": [
    "Imports a module and returns its exported object",
    "Declares a variable in the current scope",
    "Sends an HTTP request to a remote server",
    "Creates a new instance of a JavaScript class"
  ],
  "correct_option_index": 0,
  "cognitive_level": "RECALL",
  "difficulty": "EASY",
  "explanation": "require() is Node.js's module import function..."
}
```

**Behavior:** Manually created questions are immediately set to
APPROVED status. They are marked with is_ai_generated = FALSE.

**Success Response (201 Created):**
```json
{
  "success": true,
  "data": {
    "quiz_id": "quiz-uuid-new",
    "generation_status": "APPROVED",
    "is_ai_generated": false
  },
  "message": "Question created and approved"
}
```

---

## 4.3 Quiz Availability Endpoints

### GET /api/content/:contentId/quizzes/available

**Access:** STUDENT (enrolled in batch)

**Purpose:** Fetch available (approved, past available_from) quiz
questions for a specific content item

**Query Parameters:**
```
quiz_type : QUICK_ASSESSMENT or RETENTION
```

**Success Response (200 OK):**
```json
{
  "success": true,
  "data": {
    "quiz_type": "QUICK_ASSESSMENT",
    "content_id": "content-uuid-1",
    "content_title": "Introduction to Node.js",
    "total_questions": 10,
    "already_completed": false,
    "available_until": null,
    "questions": [
      {
        "quiz_id": "quiz-uuid-1",
        "question_text": "What is the primary purpose of the 
                         event loop in Node.js?",
        "options": [
          "To manage memory allocation for JavaScript objects",
          "To allow Node.js to handle multiple I/O operations 
           concurrently without blocking execution",
          "To compile JavaScript code to machine code",
          "To synchronize data between multiple Node.js processes"
        ],
        "display_order": [1, 0, 2, 3],
        "cognitive_level": "RECALL"
      }
    ]
  }
}
```

**Important note on options:** The options array returned to students
has options in a RANDOMIZED order (different from the canonical storage
order). The display_order array maps display position to canonical
index. This is used by the submission endpoint to correctly record
which canonical option the student selected.

---

### GET /api/content/:contentId/quizzes/status

**Access:** STUDENT (enrolled), MENTOR, ADMIN

**Purpose:** Check quiz availability status for a content item

**Success Response (200 OK):**
```json
{
  "success": true,
  "data": {
    "content_id": "content-uuid-1",
    "quick_assessment": {
      "approved_count": 10,
      "is_available": true,
      "available_since": "2026-03-22T10:00:00Z",
      "student_completed": false
    },
    "retention": {
      "approved_count": 14,
      "is_available": false,
      "available_at": "2026-03-24T10:00:00Z",
      "student_completed": false
    }
  }
}
```

---

## 4.4 Analytics Endpoints

### GET /api/batches/:batchId/quizzes/analytics

**Access:** MENTOR, ADMIN, SUPER_ADMIN

**Purpose:** Quiz generation quality analytics for the batch

**Success Response (200 OK):**
```json
{
  "success": true,
  "data": {
    "total_generated": 156,
    "total_approved_without_edit": 98,
    "total_approved_with_edit": 34,
    "total_rejected": 24,
    "approval_rate_without_edit": 62.8,
    "overall_approval_rate": 84.6,
    "rejection_reasons": {
      "FACTUALLY_INCORRECT": 8,
      "POORLY_WORDED": 7,
      "OFF_TOPIC": 4,
      "TOO_EASY": 3,
      "DUPLICATE": 2
    },
    "by_cognitive_level": {
      "RECALL": { "generated": 52, "approved": 48, "rejected": 4 },
      "COMPREHENSION": { "generated": 52, "approved": 46, "rejected": 6 },
      "APPLICATION": { "generated": 36, "approved": 28, "rejected": 8 },
      "ANALYSIS": { "generated": 16, "approved": 10, "rejected": 6 }
    }
  }
}
```

---

# 5. Frontend Components

## 5.1 Component Structure
```
src/
├── app/
│   └── mentor/
│       └── batches/
│           └── [batchId]/
│               └── quizzes/
│                   ├── page.tsx              (review queue)
│                   └── [contentId]/
│                       └── page.tsx          (per-content review)
├── components/
│   └── quizzes/
│       ├── QuizReviewQueue.tsx
│       ├── QuizQuestionCard.tsx
│       ├── QuizEditForm.tsx
│       ├── RejectReasonSelector.tsx
│       ├── QuizGenerationStatus.tsx
│       ├── BatchApproveButton.tsx
│       ├── ReviewProgressBar.tsx
│       └── ManualQuizCreateForm.tsx
```

## 5.2 QuizQuestionCard Component

The core review component. Displays one generated question with all
the context a mentor needs to evaluate it.
```tsx
// components/quizzes/QuizQuestionCard.tsx
"use client";

import { useState } from "react";
import api from "@/lib/api";

type Quiz = {
  quiz_id: string;
  content_title: string;
  quiz_type: string;
  question_text: string;
  options: string[];
  correct_option_index: number;
  explanation: string;
  cognitive_level: string;
  difficulty: string;
  source_concept: string;
  transcript_reference: string;
  was_edited: boolean;
};

type CardState = "idle" | "editing" | "approving" | "rejecting";

type Props = {
  quiz: Quiz;
  onApproved: (quizId: string) => void;
  onRejected: (quizId: string) => void;
};

const COGNITIVE_LEVEL_COLORS: Record<string, string> = {
  RECALL: "#6366F1",
  COMPREHENSION: "#0891B2",
  APPLICATION: "#059669",
  ANALYSIS: "#D97706",
};

const REJECTION_REASONS = [
  { value: "FACTUALLY_INCORRECT", label: "Factually incorrect" },
  { value: "POORLY_WORDED", label: "Poorly worded / unclear" },
  { value: "OFF_TOPIC", label: "Off topic" },
  { value: "TOO_EASY", label: "Too easy" },
  { value: "TOO_HARD", label: "Too hard" },
  { value: "DUPLICATE", label: "Duplicate question" },
  { value: "OTHER", label: "Other" },
];

export default function QuizQuestionCard({
  quiz,
  onApproved,
  onRejected,
}: Props) {
  const [cardState, setCardState] = useState<CardState>("idle");
  const [selectedRejectionReason, setSelectedRejectionReason] =
    useState("");
  const [showTranscriptRef, setShowTranscriptRef] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Edit form state
  const [editedQuestion, setEditedQuestion] = useState(
    quiz.question_text
  );
  const [editedOptions, setEditedOptions] = useState([...quiz.options]);
  const [editedCorrectIndex, setEditedCorrectIndex] = useState(
    quiz.correct_option_index
  );

  const handleApprove = async () => {
    setIsProcessing(true);
    setError(null);

    try {
      await api.post(`/api/quizzes/${quiz.quiz_id}/approve`);
      onApproved(quiz.quiz_id);
    } catch {
      setError("Failed to approve. Please try again.");
    } finally {
      setIsProcessing(false);
    }
  };

  const handleSaveAndApprove = async () => {
    setIsProcessing(true);
    setError(null);

    try {
      // Save edits first
      await api.put(`/api/quizzes/${quiz.quiz_id}`, {
        question_text: editedQuestion,
        options: editedOptions,
        correct_option_index: editedCorrectIndex,
      });

      // Then approve
      await api.post(`/api/quizzes/${quiz.quiz_id}/approve`);
      onApproved(quiz.quiz_id);
    } catch {
      setError("Failed to save and approve. Please try again.");
    } finally {
      setIsProcessing(false);
      setCardState("idle");
    }
  };

  const handleReject = async () => {
    if (!selectedRejectionReason) return;

    setIsProcessing(true);
    setError(null);

    try {
      await api.post(`/api/quizzes/${quiz.quiz_id}/reject`, {
        reason: selectedRejectionReason,
      });
      onRejected(quiz.quiz_id);
    } catch {
      setError("Failed to reject. Please try again.");
    } finally {
      setIsProcessing(false);
      setCardState("idle");
    }
  };

  return (
    <div
      style={{
        border: "1px solid #E5E7EB",
        borderRadius: "12px",
        padding: "1.5rem",
        background: "#FFFFFF",
        marginBottom: "1rem",
      }}
    >
      {/* Header */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "flex-start",
          marginBottom: "1rem",
        }}
      >
        <div>
          <span style={{ fontSize: "12px", color: "#6B7280" }}>
            {quiz.content_title} — {quiz.quiz_type.replace("_", " ")}
          </span>
          <div style={{ display: "flex", gap: "8px", marginTop: "4px" }}>
            <span
              style={{
                fontSize: "11px",
                padding: "2px 8px",
                borderRadius: "9999px",
                background: `${
                  COGNITIVE_LEVEL_COLORS[quiz.cognitive_level]
                }20`,
                color: COGNITIVE_LEVEL_COLORS[quiz.cognitive_level],
                fontWeight: 500,
              }}
            >
              {quiz.cognitive_level}
            </span>
            <span
              style={{
                fontSize: "11px",
                padding: "2px 8px",
                borderRadius: "9999px",
                background: "#F3F4F6",
                color: "#4B5563",
              }}
            >
              {quiz.difficulty}
            </span>
            {quiz.was_edited && (
              <span
                style={{
                  fontSize: "11px",
                  padding: "2px 8px",
                  borderRadius: "9999px",
                  background: "#FEF3C7",
                  color: "#92400E",
                }}
              >
                Edited
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Concept Label */}
      <p
        style={{
          fontSize: "12px",
          color: "#6B7280",
          marginBottom: "0.75rem",
        }}
      >
        Testing concept: <strong>{quiz.source_concept}</strong>
      </p>

      {/* Question — idle or editing */}
      {cardState !== "editing" ? (
        <>
          <p
            style={{
              fontSize: "16px",
              fontWeight: 500,
              marginBottom: "1rem",
              lineHeight: 1.5,
            }}
          >
            {quiz.question_text}
          </p>

          {/* Options */}
          <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
            {quiz.options.map((option, index) => (
              <div
                key={index}
                style={{
                  padding: "10px 14px",
                  borderRadius: "8px",
                  border: `1px solid ${
                    index === quiz.correct_option_index
                      ? "#059669"
                      : "#E5E7EB"
                  }`,
                  background:
                    index === quiz.correct_option_index
                      ? "#D1FAE5"
                      : "#F9FAFB",
                  fontSize: "14px",
                  display: "flex",
                  alignItems: "center",
                  gap: "8px",
                }}
              >
                <span
                  style={{
                    width: "20px",
                    height: "20px",
                    borderRadius: "50%",
                    border: "1px solid #D1D5DB",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontSize: "11px",
                    flexShrink: 0,
                    background:
                      index === quiz.correct_option_index
                        ? "#059669"
                        : "white",
                    color:
                      index === quiz.correct_option_index
                        ? "white"
                        : "#6B7280",
                  }}
                >
                  {String.fromCharCode(65 + index)}
                </span>
                {option}
                {index === quiz.correct_option_index && (
                  <span
                    style={{
                      marginLeft: "auto",
                      fontSize: "11px",
                      color: "#059669",
                      fontWeight: 500,
                    }}
                  >
                    Correct
                  </span>
                )}
              </div>
            ))}
          </div>

          {/* Explanation */}
          {quiz.explanation && (
            <p
              style={{
                fontSize: "13px",
                color: "#6B7280",
                marginTop: "0.75rem",
                padding: "10px",
                background: "#F9FAFB",
                borderRadius: "6px",
                lineHeight: 1.6,
              }}
            >
              <strong>Explanation: </strong>
              {quiz.explanation}
            </p>
          )}

          {/* Transcript Reference */}
          <button
            onClick={() => setShowTranscriptRef(!showTranscriptRef)}
            style={{
              fontSize: "12px",
              color: "#6366F1",
              background: "none",
              border: "none",
              cursor: "pointer",
              padding: "4px 0",
              marginTop: "8px",
            }}
          >
            {showTranscriptRef ? "Hide" : "Show"} transcript reference
          </button>

          {showTranscriptRef && quiz.transcript_reference && (
            <blockquote
              style={{
                fontSize: "13px",
                color: "#6B7280",
                fontStyle: "italic",
                borderLeft: "3px solid #E5E7EB",
                paddingLeft: "12px",
                margin: "8px 0",
              }}
            >
              "{quiz.transcript_reference}"
            </blockquote>
          )}
        </>
      ) : (
        /* Editing Mode */
        <div>
          <div style={{ marginBottom: "1rem" }}>
            <label style={{ fontSize: "13px", fontWeight: 500 }}>
              Question
            </label>
            <textarea
              value={editedQuestion}
              onChange={(e) => setEditedQuestion(e.target.value)}
              rows={3}
              style={{
                width: "100%",
                padding: "8px",
                borderRadius: "6px",
                border: "1px solid #D1D5DB",
                fontSize: "14px",
                marginTop: "4px",
              }}
            />
          </div>

          {editedOptions.map((option, index) => (
            <div key={index} style={{ marginBottom: "8px" }}>
              <label style={{ fontSize: "13px", fontWeight: 500 }}>
                Option {String.fromCharCode(65 + index)}
                {index === editedCorrectIndex && " (Correct)"}
              </label>
              <div style={{ display: "flex", gap: "8px", marginTop: "4px" }}>
                <input
                  type="radio"
                  name="correct_option"
                  checked={editedCorrectIndex === index}
                  onChange={() => setEditedCorrectIndex(index)}
                  title="Mark as correct answer"
                />
                <input
                  type="text"
                  value={option}
                  onChange={(e) => {
                    const newOptions = [...editedOptions];
                    newOptions[index] = e.target.value;
                    setEditedOptions(newOptions);
                  }}
                  style={{
                    flex: 1,
                    padding: "6px 8px",
                    borderRadius: "6px",
                    border: "1px solid #D1D5DB",
                    fontSize: "14px",
                  }}
                />
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Rejection Panel */}
      {cardState === "rejecting" && (
        <div
          style={{
            marginTop: "1rem",
            padding: "12px",
            background: "#FEF2F2",
            borderRadius: "8px",
          }}
        >
          <p
            style={{
              fontSize: "13px",
              fontWeight: 500,
              marginBottom: "8px",
            }}
          >
            Select rejection reason:
          </p>
          <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
            {REJECTION_REASONS.map((reason) => (
              <label
                key={reason.value}
                style={{ fontSize: "13px", cursor: "pointer" }}
              >
                <input
                  type="radio"
                  name="rejection_reason"
                  value={reason.value}
                  checked={selectedRejectionReason === reason.value}
                  onChange={(e) =>
                    setSelectedRejectionReason(e.target.value)
                  }
                  style={{ marginRight: "8px" }}
                />
                {reason.label}
              </label>
            ))}
          </div>
        </div>
      )}

      {/* Error */}
      {error && (
        <p
          role="alert"
          style={{
            fontSize: "13px",
            color: "#DC2626",
            marginTop: "8px",
          }}
        >
          {error}
        </p>
      )}

      {/* Action Buttons */}
      <div
        style={{
          display: "flex",
          gap: "8px",
          marginTop: "1rem",
          justifyContent: "flex-end",
        }}
      >
        {cardState === "idle" && (
          <>
            <button
              onClick={() => setCardState("rejecting")}
              disabled={isProcessing}
              style={{
                padding: "8px 16px",
                borderRadius: "6px",
                border: "1px solid #FECACA",
                background: "#FEF2F2",
                color: "#DC2626",
                fontSize: "13px",
                cursor: "pointer",
              }}
            >
              Reject
            </button>
            <button
              onClick={() => setCardState("editing")}
              disabled={isProcessing}
              style={{
                padding: "8px 16px",
                borderRadius: "6px",
                border: "1px solid #D1D5DB",
                background: "#F9FAFB",
                color: "#374151",
                fontSize: "13px",
                cursor: "pointer",
              }}
            >
              Edit
            </button>
            <button
              onClick={handleApprove}
              disabled={isProcessing}
              style={{
                padding: "8px 16px",
                borderRadius: "6px",
                border: "none",
                background: "#059669",
                color: "white",
                fontSize: "13px",
                fontWeight: 500,
                cursor: "pointer",
              }}
            >
              {isProcessing ? "Approving..." : "Approve"}
            </button>
          </>
        )}

        {cardState === "editing" && (
          <>
            <button
              onClick={() => setCardState("idle")}
              disabled={isProcessing}
              style={{
                padding: "8px 16px",
                borderRadius: "6px",
                border: "1px solid #D1D5DB",
                background: "#F9FAFB",
                color: "#374151",
                fontSize: "13px",
                cursor: "pointer",
              }}
            >
              Cancel
            </button>
            <button
              onClick={handleSaveAndApprove}
              disabled={isProcessing}
              style={{
                padding: "8px 16px",
                borderRadius: "6px",
                border: "none",
                background: "#4F46E5",
                color: "white",
                fontSize: "13px",
                fontWeight: 500,
                cursor: "pointer",
              }}
            >
              {isProcessing ? "Saving..." : "Save and Approve"}
            </button>
          </>
        )}

        {cardState === "rejecting" && (
          <>
            <button
              onClick={() => setCardState("idle")}
              disabled={isProcessing}
              style={{
                padding: "8px 16px",
                borderRadius: "6px",
                border: "1px solid #D1D5DB",
                background: "#F9FAFB",
                color: "#374151",
                fontSize: "13px",
                cursor: "pointer",
              }}
            >
              Cancel
            </button>
            <button
              onClick={handleReject}
              disabled={
                isProcessing || !selectedRejectionReason
              }
              style={{
                padding: "8px 16px",
                borderRadius: "6px",
                border: "none",
                background: "#DC2626",
                color: "white",
                fontSize: "13px",
                fontWeight: 500,
                cursor: "pointer",
                opacity: !selectedRejectionReason ? 0.5 : 1,
              }}
            >
              {isProcessing ? "Rejecting..." : "Confirm Reject"}
            </button>
          </>
        )}
      </div>
    </div>
  );
}
```

---

# 6. Backend Logic and Implementation

## 6.1 Ollama Integration Utility

Ollama is used to run Llama 2 locally. It exposes a simple HTTP API
on localhost:11434. The integration is a straightforward HTTP client.
```typescript
// utils/ollama.utils.ts
import axios from "axios";

const OLLAMA_BASE_URL =
  process.env.OLLAMA_URL ?? "http://localhost:11434";
const DEFAULT_MODEL = process.env.OLLAMA_MODEL ?? "llama2";

type OllamaResponse = {
  model: string;
  response: string;
  done: boolean;
  total_duration: number;
  prompt_eval_count: number;
  eval_count: number;
};

export const ollamaGenerate = async (
  prompt: string,
  model = DEFAULT_MODEL,
  options: {
    temperature?: number;
    num_predict?: number;
  } = {}
): Promise<{
  text: string;
  prompt_tokens: number;
  completion_tokens: number;
  duration_ms: number;
}> => {
  const startTime = Date.now();

  const response = await axios.post<OllamaResponse>(
    `${OLLAMA_BASE_URL}/api/generate`,
    {
      model,
      prompt,
      stream: false,
      options: {
        temperature: options.temperature ?? 0.3,
        num_predict: options.num_predict ?? 1024,
        stop: ["```", "\n\n\n"],
      },
    },
    { timeout: 120000 }   // 2 minute timeout
  );

  return {
    text: response.data.response,
    prompt_tokens: response.data.prompt_eval_count,
    completion_tokens: response.data.eval_count,
    duration_ms: Date.now() - startTime,
  };
};

export const parseJsonFromResponse = <T>(text: string): T => {
  // Clean the response — models sometimes add markdown code blocks
  let cleaned = text.trim();

  // Remove markdown code block if present
  if (cleaned.startsWith("```json")) {
    cleaned = cleaned.slice(7);
  } else if (cleaned.startsWith("```")) {
    cleaned = cleaned.slice(3);
  }

  if (cleaned.endsWith("```")) {
    cleaned = cleaned.slice(0, -3);
  }

  cleaned = cleaned.trim();

  return JSON.parse(cleaned) as T;
};
```

## 6.2 Quiz Generation Worker

This is the core of Feature 04. It orchestrates the complete pipeline
from transcript to approved-ready quiz questions.
```typescript
// workers/quizGeneration.worker.ts
import { Job } from "bull";
import { PrismaClient } from "@prisma/client";
import { v4 as uuidv4 } from "uuid";
import { ollamaGenerate, parseJsonFromResponse } from
  "../utils/ollama.utils";
import { notificationService } from
  "../services/notification.service";
import {
  buildConceptExtractionPrompt,
  buildQuestionGenerationPrompt,
} from "../prompts/quiz.prompts";

const prisma = new PrismaClient();

// Cognitive level rotation sequences
const QUICK_ASSESSMENT_LEVELS = [
  "RECALL",
  "COMPREHENSION",
  "RECALL",
  "COMPREHENSION",
  "APPLICATION",
  "RECALL",
  "COMPREHENSION",
  "APPLICATION",
  "RECALL",
  "COMPREHENSION",
  "APPLICATION",
  "RECALL",
];

const RETENTION_LEVELS = [
  "COMPREHENSION",
  "RECALL",
  "APPLICATION",
  "COMPREHENSION",
  "ANALYSIS",
  "APPLICATION",
  "RECALL",
  "COMPREHENSION",
  "APPLICATION",
  "ANALYSIS",
  "COMPREHENSION",
  "APPLICATION",
  "RECALL",
  "ANALYSIS",
  "COMPREHENSION",
];

type Concept = {
  concept: string;
  explanation: string;
  importance: "HIGH" | "MEDIUM" | "LOW";
  transcript_reference: string;
};

type GeneratedQuestion = {
  question: string;
  options: string[];
  correct_option_index: number;
  explanation: string;
  difficulty: "EASY" | "MEDIUM" | "HARD";
};

export const processQuizGenerationJob = async (job: Job) => {
  const { content_id } = job.data;
  const generationRunId = uuidv4();

  console.log(
    `[QuizGenWorker] Starting generation for content ${content_id}`
  );

  try {
    // -------------------------------------------------------
    // Stage 1: Fetch content and validate
    // -------------------------------------------------------
    const content = await prisma.content.findUnique({
      where: { id: content_id },
      include: {
        batch: {
          include: {
            content: {
              where: {
                deletedAt: null,
                transcriptionStatus: "COMPLETE",
                id: { not: content_id },
              },
              orderBy: { sortOrder: "asc" },
              take: 3,
              select: {
                id: true,
                title: true,
                transcript: true,
              },
            },
            mentors: { select: { mentorId: true } },
          },
        },
      },
    });

    if (!content) throw new Error("Content not found");
    if (!content.transcript) {
      throw new Error("Content has no transcript");
    }

    // -------------------------------------------------------
    // Stage 2: Concept Extraction
    // -------------------------------------------------------
    console.log(`[QuizGenWorker] Extracting concepts...`);
    const startConceptExtraction = Date.now();

    const conceptPrompt = buildConceptExtractionPrompt({
      title: content.title,
      transcript: content.transcript,
      learning_objectives: content.learningObjectives ?? undefined,
      topic_tags: content.topicTags,
    });

    const conceptResult = await ollamaGenerate(conceptPrompt, undefined, {
      temperature: 0.2,
      num_predict: 2048,
    });

    let concepts: Concept[] = [];
    try {
      concepts = parseJsonFromResponse<Concept[]>(conceptResult.text);
      // Keep only HIGH and MEDIUM importance concepts
      // Cap at 12 concepts
      concepts = concepts
        .filter((c) => c.importance !== "LOW")
        .slice(0, 12);
    } catch (parseError) {
      console.error(
        `[QuizGenWorker] Concept parsing failed, retrying...`
      );
      // One retry with explicit JSON instruction
      const retryResult = await ollamaGenerate(
        conceptPrompt + "\n\nIMPORTANT: Return ONLY valid JSON array.",
        undefined,
        { temperature: 0.1 }
      );
      concepts = parseJsonFromResponse<Concept[]>(retryResult.text);
      concepts = concepts
        .filter((c) => c.importance !== "LOW")
        .slice(0, 12);
    }

    await logGenerationEvent({
      content_id,
      generation_run_id: generationRunId,
      stage: "CONCEPT_EXTRACTION",
      model_used: process.env.OLLAMA_MODEL ?? "llama2",
      prompt_tokens: conceptResult.prompt_tokens,
      completion_tokens: conceptResult.completion_tokens,
      duration_ms: Date.now() - startConceptExtraction,
      success: true,
      concepts_extracted: concepts.length,
    });

    console.log(
      `[QuizGenWorker] Extracted ${concepts.length} concepts`
    );

    // -------------------------------------------------------
    // Stage 3: Generate Quick Assessment Questions
    // -------------------------------------------------------
    console.log(
      `[QuizGenWorker] Generating Quick Assessment questions...`
    );

    const quickAssessmentQuizzes = await generateQuestionsForConcepts(
      concepts,
      QUICK_ASSESSMENT_LEVELS,
      {
        content_id,
        batch_id: content.batchId,
        quiz_type: "QUICK_ASSESSMENT",
        generation_run_id: generationRunId,
        available_from: calculateQuickAssessmentAvailability(
          content.createdAt
        ),
      }
    );

    // -------------------------------------------------------
    // Stage 4: Generate Retention Questions
    // -------------------------------------------------------
    console.log(
      `[QuizGenWorker] Generating Retention questions...`
    );

    // Mix current concepts (60%) with historical concepts (40%)
    const historicalConcepts =
      await extractHistoricalConcepts(content.batch.content);

    const retentionConceptPool = [
      ...concepts.slice(0, Math.ceil(concepts.length * 0.6)),
      ...historicalConcepts.slice(
        0,
        Math.floor(concepts.length * 0.4)
      ),
    ];

    const retentionQuizzes = await generateQuestionsForConcepts(
      retentionConceptPool,
      RETENTION_LEVELS,
      {
        content_id,
        batch_id: content.batchId,
        quiz_type: "RETENTION",
        generation_run_id: generationRunId,
        available_from: calculateRetentionAvailability(
          content.createdAt
        ),
      }
    );

    // -------------------------------------------------------
    // Stage 5: Notify mentors
    // -------------------------------------------------------
    const mentorIds = content.batch.mentors.map((bm) => bm.mentorId);

    for (const mentorId of mentorIds) {
      await notificationService.send({
        userId: mentorId,
        type: "QUIZZES_READY_FOR_REVIEW",
        title: "Quizzes Ready for Review",
        message: `Quiz generation complete for "${content.title}". 
                  ${quickAssessmentQuizzes.length} quick assessment 
                  and ${retentionQuizzes.length} retention questions 
                  are ready for your review.`,
        metadata: {
          content_id,
          quick_count: quickAssessmentQuizzes.length,
          retention_count: retentionQuizzes.length,
        },
      });
    }

    console.log(
      `[QuizGenWorker] Generation complete. ` +
      `Quick: ${quickAssessmentQuizzes.length}, ` +
      `Retention: ${retentionQuizzes.length}`
    );

  } catch (error: any) {
    console.error(
      `[QuizGenWorker] Failed for content ${content_id}:`,
      error
    );

    await logGenerationEvent({
      content_id,
      generation_run_id: generationRunId,
      stage: "PIPELINE_FAILURE",
      model_used: process.env.OLLAMA_MODEL ?? "llama2",
      success: false,
      error_message: error.message,
    });

    throw error;
  }
};

// -------------------------------------------------------
// PRIVATE HELPERS
// -------------------------------------------------------

const generateQuestionsForConcepts = async (
  concepts: Concept[],
  levelSequence: string[],
  options: {
    content_id: string;
    batch_id: string;
    quiz_type: string;
    generation_run_id: string;
    available_from: Date;
  }
): Promise<any[]> => {
  const generatedQuizzes = [];

  for (let i = 0; i < concepts.length; i++) {
    const concept = concepts[i];
    const cognitiveLevel = levelSequence[i % levelSequence.length];

    let question: GeneratedQuestion | null = null;
    let attempts = 0;

    while (!question && attempts < 3) {
      try {
        const prompt = buildQuestionGenerationPrompt({
          concept: concept.concept,
          concept_explanation: concept.explanation,
          transcript_reference: concept.transcript_reference,
          cognitive_level: cognitiveLevel,
        });

        const result = await ollamaGenerate(prompt, undefined, {
          temperature: 0.4,
          num_predict: 1024,
        });

        const parsed = parseJsonFromResponse<GeneratedQuestion>(
          result.text
        );

        // Validate structure
        if (
          parsed.question &&
          Array.isArray(parsed.options) &&
          parsed.options.length === 4 &&
          typeof parsed.correct_option_index === "number" &&
          parsed.correct_option_index >= 0 &&
          parsed.correct_option_index <= 3
        ) {
          question = parsed;
        } else {
          throw new Error("Invalid question structure");
        }

      } catch (err) {
        attempts++;
        if (attempts >= 3) {
          console.error(
            `[QuizGenWorker] Failed to generate question for ` +
            `concept "${concept.concept}" after 3 attempts`
          );
        }
      }
    }

    if (!question) continue;

    // Save to database
    const quiz = await prisma.quiz.create({
      data: {
        contentId: options.content_id,
        batchId: options.batch_id,
        quizType: options.quiz_type as any,
        questionText: question.question,
        options: question.options,
        correctOptionIndex: question.correct_option_index,
        explanation: question.explanation ?? null,
        cognitiveLevel: cognitiveLevel as any,
        difficulty: question.difficulty as any,
        isAiGenerated: true,
        generationStatus: "PENDING_REVIEW",
        availableFrom: options.available_from,
        sourceConcept: concept.concept,
        transcriptReference: concept.transcript_reference,
      },
    });

    generatedQuizzes.push(quiz);
  }

  return generatedQuizzes;
};

const extractHistoricalConcepts = async (
  previousContent: Array<{
    id: string;
    title: string;
    transcript: string | null;
  }>
): Promise<Concept[]> => {
  const historicalConcepts: Concept[] = [];

  for (const prevContent of previousContent.slice(0, 2)) {
    if (!prevContent.transcript) continue;

    try {
      // Get previously generated concepts from quiz records
      const existingQuizzes = await prisma.quiz.findMany({
        where: {
          contentId: prevContent.id,
          generationStatus: "APPROVED",
        },
        select: {
          sourceConcept: true,
          transcriptReference: true,
        },
        distinct: ["sourceConcept"],
        take: 3,
      });

      for (const quiz of existingQuizzes) {
        if (quiz.sourceConcept) {
          historicalConcepts.push({
            concept: quiz.sourceConcept,
            explanation: `Concept from: ${prevContent.title}`,
            importance: "HIGH",
            transcript_reference:
              quiz.transcriptReference ?? "",
          });
        }
      }
    } catch {
      // Ignore errors from historical concept extraction
    }
  }

  return historicalConcepts;
};

const calculateQuickAssessmentAvailability = (
  contentCreatedAt: Date
): Date => {
  // Available 24 hours after content creation
  return new Date(contentCreatedAt.getTime() + 24 * 60 * 60 * 1000);
};

const calculateRetentionAvailability = (
  contentCreatedAt: Date
): Date => {
  // Available 72 hours after content creation
  return new Date(contentCreatedAt.getTime() + 72 * 60 * 60 * 1000);
};

const logGenerationEvent = async (data: {
  content_id: string;
  generation_run_id: string;
  stage: string;
  model_used: string;
  prompt_tokens?: number;
  completion_tokens?: number;
  duration_ms?: number;
  success: boolean;
  error_message?: string;
  concepts_extracted?: number;
  questions_generated?: number;
}) => {
  try {
    await prisma.quizGenerationLog.create({ data: {
      contentId: data.content_id,
      generationRunId: data.generation_run_id,
      stage: data.stage,
      modelUsed: data.model_used,
      promptTokens: data.prompt_tokens ?? null,
      completionTokens: data.completion_tokens ?? null,
      durationMs: data.duration_ms ?? null,
      success: data.success,
      errorMessage: data.error_message ?? null,
      conceptsExtracted: data.concepts_extracted ?? null,
      questionsGenerated: data.questions_generated ?? null,
    }});
  } catch {
    // Logging failure should never crash the main pipeline
  }
};
```

## 6.3 Quiz Service
```typescript
// services/quiz.service.ts
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

export class QuizService {

  // -------------------------------------------------------
  // APPROVE QUIZ
  // -------------------------------------------------------
  async approveQuiz(quizId: string, approvedBy: string) {
    const quiz = await prisma.quiz.findUnique({
      where: { id: quizId },
    });

    if (!quiz) {
      throw { code: "QUIZ_NOT_FOUND", statusCode: 404 };
    }

    if (quiz.generationStatus === "APPROVED") {
      throw {
        code: "ALREADY_APPROVED",
        message: "This question is already approved",
        statusCode: 400,
      };
    }

    return prisma.quiz.update({
      where: { id: quizId },
      data: {
        generationStatus: "APPROVED",
        approvedBy,
        approvedAt: new Date(),
      },
    });
  }

  // -------------------------------------------------------
  // BATCH APPROVE
  // -------------------------------------------------------
  async batchApprove(quizIds: string[], approvedBy: string) {
    const results = await Promise.allSettled(
      quizIds.map((id) => this.approveQuiz(id, approvedBy))
    );

    const approved = results.filter(
      (r) => r.status === "fulfilled"
    ).length;
    const failed = results.filter(
      (r) => r.status === "rejected"
    ).length;

    return { approved_count: approved, failed_count: failed };
  }

  // -------------------------------------------------------
  // REJECT QUIZ
  // -------------------------------------------------------
  async rejectQuiz(
    quizId: string,
    reason: string
  ) {
    const quiz = await prisma.quiz.findUnique({
      where: { id: quizId },
    });

    if (!quiz) {
      throw { code: "QUIZ_NOT_FOUND", statusCode: 404 };
    }

    return prisma.quiz.update({
      where: { id: quizId },
      data: {
        generationStatus: "REJECTED",
        rejectionReason: reason,
      },
    });
  }

  // -------------------------------------------------------
  // EDIT QUIZ
  // -------------------------------------------------------
  async editQuiz(
    quizId: string,
    data: {
      question_text?: string;
      options?: string[];
      correct_option_index?: number;
      cognitive_level?: string;
      difficulty?: string;
      explanation?: string;
    }
  ) {
    const quiz = await prisma.quiz.findUnique({
      where: { id: quizId },
    });

    if (!quiz) {
      throw { code: "QUIZ_NOT_FOUND", statusCode: 404 };
    }

    // Preserve original if first edit
    const updateData: any = {
      wasEdited: true,
      updatedAt: new Date(),
    };

    if (data.question_text !== undefined) {
      if (!quiz.wasEdited) {
        // First edit — preserve original
        updateData.originalQuestionText = quiz.questionText;
      }
      updateData.questionText = data.question_text;
    }

    if (data.options !== undefined) {
      if (!quiz.wasEdited) {
        updateData.originalOptions = quiz.options;
      }
      // Validate exactly 4 options
      if (data.options.length !== 4) {
        throw {
          code: "VALIDATION_ERROR",
          message: "Exactly 4 options are required",
          statusCode: 400,
        };
      }
      updateData.options = data.options;
    }

    if (data.correct_option_index !== undefined) {
      if (
        data.correct_option_index < 0 ||
        data.correct_option_index > 3
      ) {
        throw {
          code: "VALIDATION_ERROR",
          message: "correct_option_index must be 0, 1, 2, or 3",
          statusCode: 400,
        };
      }
      updateData.correctOptionIndex = data.correct_option_index;
    }

    if (data.cognitive_level) {
      updateData.cognitiveLevel = data.cognitive_level;
    }

    if (data.difficulty) {
      updateData.difficulty = data.difficulty;
    }

    if (data.explanation !== undefined) {
      updateData.explanation = data.explanation;
    }

    return prisma.quiz.update({
      where: { id: quizId },
      data: updateData,
    });
  }

  // -------------------------------------------------------
  // GET AVAILABLE QUIZZES (Student)
  // -------------------------------------------------------
  async getAvailableQuizzes(
    contentId: string,
    quizType: string,
    studentId: string
  ) {
    const now = new Date();

    const quizzes = await prisma.quiz.findMany({
      where: {
        contentId,
        quizType: quizType as any,
        generationStatus: "APPROVED",
        availableFrom: { lte: now },
      },
      select: {
        id: true,
        questionText: true,
        options: true,
        cognitiveLevel: true,
      },
      orderBy: { createdAt: "asc" },
    });

    if (quizzes.length === 0) {
      throw { code: "NO_QUIZZES_AVAILABLE", statusCode: 404 };
    }

    // Randomize option order for each question
    return quizzes.map((quiz) => {
      const options = quiz.options as string[];
      const indices = [0, 1, 2, 3];

      // Fisher-Yates shuffle
      for (let i = indices.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [indices[i], indices[j]] = [indices[j], indices[i]];
      }

      return {
        quiz_id: quiz.id,
        question_text: quiz.questionText,
        options: indices.map((i) => options[i]),
        display_order: indices,
        cognitive_level: quiz.cognitiveLevel,
      };
    });
  }
}
```

---

# 7. Prompt Engineering

## 7.1 Concept Extraction Prompt
```typescript
// prompts/quiz.prompts.ts

export const buildConceptExtractionPrompt = (data: {
  title: string;
  transcript: string;
  learning_objectives?: string;
  topic_tags: string[];
}): string => {
  // Limit transcript to ~4000 words to stay within context window
  const transcriptExcerpt = data.transcript
    .split(" ")
    .slice(0, 4000)
    .join(" ");

  return `You are an expert curriculum designer analyzing educational
content to identify key learnable concepts.

Analyze the following educational content and identify the 8-12 most
important concepts that a student should understand after studying
this material.

Content Title: ${data.title}
Topic Tags: ${data.topic_tags.join(", ") || "Not specified"}
Learning Objectives: ${data.learning_objectives || "Not specified"}

Transcript:
${transcriptExcerpt}

Return your response as a JSON array of concept objects.
Each concept must have:
- "concept": brief name of the concept (maximum 10 words)
- "explanation": one clear sentence explaining what this concept is
- "importance": "HIGH" if central to understanding, "MEDIUM" if 
  supporting, "LOW" if peripheral
- "transcript_reference": exact short quote from the transcript 
  where this concept appears (under 20 words)

Rules:
- Focus on concepts that can be tested with a multiple-choice question
- Include only concepts clearly explained in the transcript
- Do not include concepts that are merely mentioned in passing
- Order from most important to least important

Return ONLY valid JSON array. No explanation text. No markdown. 
Just the JSON.`;
};
```

## 7.2 Question Generation Prompt
```typescript
export const buildQuestionGenerationPrompt = (data: {
  concept: string;
  concept_explanation: string;
  transcript_reference: string;
  cognitive_level: string;
}): string => {
  const levelDefinitions: Record<string, string> = {
    RECALL:
      "The student must remember a specific fact, definition, or " +
      "procedure exactly as it was taught. The answer should be " +
      "directly stated in the content.",
    COMPREHENSION:
      "The student must demonstrate they understand the concept — " +
      "not just repeat a definition but show they can explain it, " +
      "identify an example of it, or describe how it works.",
    APPLICATION:
      "The student must apply the concept to a new situation or " +
      "problem they have not seen before. The answer requires " +
      "using the concept, not just knowing it.",
    ANALYSIS:
      "The student must analyze a complex scenario, break it down " +
      "into components, and identify which concepts apply and why. " +
      "Requires higher-order thinking.",
  };

  return `You are an expert educational assessment designer creating 
multiple-choice questions for adult learners in a software development 
course.

Create ONE ${data.cognitive_level} level multiple-choice question about 
the following concept.

Concept: ${data.concept}
Concept Explanation: ${data.concept_explanation}
Context from transcript: "${data.transcript_reference}"

Cognitive Level — ${data.cognitive_level}:
${levelDefinitions[data.cognitive_level]}

Requirements for the question:
1. The question must be clearly and unambiguously worded
2. All four options must be plausible to someone who studied the content
3. Exactly ONE option must be clearly correct
4. Incorrect options should be wrong but not obviously ridiculous
5. The question must be fully answerable from the course content alone
6. Do NOT use "all of the above" or "none of the above"
7. Options should be roughly similar in length
8. The question should be between 15 and 35 words

Return ONLY this JSON object. No other text. No markdown fences.
{
  "question": "The question text ending with a question mark?",
  "options": [
    "First option text",
    "Second option text",
    "Third option text",
    "Fourth option text"
  ],
  "correct_option_index": 0,
  "explanation": "One or two sentences explaining why the correct 
                 answer is right and briefly why the others 
                 are wrong.",
  "difficulty": "EASY"
}

The correct_option_index must be 0, 1, 2, or 3 (position in options 
array). Vary which position you put the correct answer — do not always 
use index 0.`;
};
```

---

# 8. Implementation Steps

## 8.1 Step-by-Step Build Order

### Step 1 — Install and Configure Ollama (Day 1)
```bash
# Install Ollama on the server (Linux)
curl -fsSL https://ollama.com/install.sh | sh

# Pull Llama 2 model (this downloads ~4GB)
ollama pull llama2

# Alternative: Mistral 7B (better instruction following, smaller)
ollama pull mistral

# Test the model
ollama run llama2 "What is the Node.js event loop?"

# Verify Ollama API is running
curl http://localhost:11434/api/generate \
  -d '{"model": "llama2", "prompt": "Hello", "stream": false}'
```

Add environment variables:
```env
OLLAMA_URL=http://localhost:11434
OLLAMA_MODEL=mistral
```

### Step 2 — Database Schema (Day 1)

Add to Prisma schema:
- quizzes table
- quiz_generation_logs table

Run migration:
```bash
npx prisma migrate dev --name add_quiz_tables
```

### Step 3 — Prompt Engineering (Day 1-2)

Before writing any generation code, test your prompts manually:
```bash
# Test concept extraction
curl http://localhost:11434/api/generate \
  -d '{
    "model": "mistral",
    "prompt": "[your concept extraction prompt here]",
    "stream": false
  }' | jq '.response'

# Test question generation
curl http://localhost:11434/api/generate \
  -d '{
    "model": "mistral",
    "prompt": "[your question generation prompt here]",
    "stream": false
  }' | jq '.response'
```

Iterate on prompts until:
- Concept extraction reliably produces valid JSON with 6-12 concepts
- Question generation reliably produces valid JSON with correct structure
- Correct_option_index varies (not always 0)
- Options are plausible distractors

This step is critical and should not be rushed. Poor prompts produce
poor quizzes that mentors will reject at high rates.

### Step 4 — Ollama Utility (Day 2)

Build utils/ollama.utils.ts from section 6.1. Test:
- Normal generation produces parseable JSON
- Timeout handling works (set to 2 minutes)
- parseJsonFromResponse handles markdown-wrapped JSON

### Step 5 — Quiz Generation Worker (Day 2-3)

Build workers/quizGeneration.worker.ts from section 6.2.
Test each stage independently:

1. Test concept extraction on 3-4 sample transcripts
2. Test question generation for each cognitive level
3. Test the full pipeline on a complete content item
4. Verify quiz records appear in database after run
5. Verify generation logs are written

### Step 6 — Quiz Service (Day 3)

Build services/quiz.service.ts from section 6.3. Test:
- Approve, reject, edit flows
- Batch approve
- getAvailableQuizzes with correct option shuffling

### Step 7 — API Routes and Controllers (Day 3)

Build all quiz-related routes and controllers.
Test every endpoint with Postman.

### Step 8 — Frontend — Review Queue (Day 4)

Build:
1. QuizQuestionCard component from section 5.2
2. QuizReviewQueue page that lists pending questions
3. ReviewProgressBar showing approve/reject counts
4. BatchApproveButton for approving all at once

### Step 9 — Integration Testing (Day 5)

Run the complete pipeline:
1. Upload a video (Feature 03 must be working)
2. Verify transcription completes
3. Verify quiz generation triggers automatically
4. Verify quiz records appear in database
5. Log in as mentor and review quiz queue
6. Approve, reject, and edit questions
7. Verify approved questions are visible on student side

---

# 9. Error Handling

## 9.1 Error Code Reference
```
QUIZ_NOT_FOUND              : 404 — Quiz ID does not exist
ALREADY_APPROVED            : 400 — Quiz already approved
TRANSCRIPTION_NOT_COMPLETE  : 400 — Cannot generate without transcript
GENERATION_IN_PROGRESS      : 400 — Job already queued
NO_QUIZZES_AVAILABLE        : 404 — No approved quizzes for this content
INVALID_REJECTION_REASON    : 400 — Reason not in allowed list
QUIZ_GENERATION_FAILED      : 500 — Ollama generation pipeline failed
MINIMUM_QUESTIONS_NOT_MET   : 400 — Not enough approved questions
                                    to release quiz to students
```

## 9.2 Ollama Failure Handling

If Ollama is unreachable or times out:
- Bull retries the job up to 3 times with exponential backoff
- After 3 failures, mark content with quiz_generation_status = FAILED
- Notify mentors that manual quiz creation is required
- The mentor can trigger regeneration later via the
  POST /api/content/:id/regenerate-quizzes endpoint

If JSON parsing fails after 2 retry attempts per question:
- Skip that specific question and continue with the next concept
- Log the failure in quiz_generation_logs
- The pipeline continues — partial question generation is better
  than complete failure

---

# 10. Testing Strategy

## 10.1 Unit Tests
```typescript
// tests/quizGeneration.test.ts

describe("parseJsonFromResponse", () => {

  it("should parse clean JSON", () => {
    const input = '[{"concept": "test", "importance": "HIGH"}]';
    const result = parseJsonFromResponse(input);
    expect(result).toHaveLength(1);
  });

  it("should parse JSON wrapped in markdown code block", () => {
    const input = "```json\n[{\"concept\": \"test\"}]\n```";
    const result = parseJsonFromResponse(input);
    expect(result).toHaveLength(1);
  });

  it("should throw on invalid JSON", () => {
    expect(() => parseJsonFromResponse("not json")).toThrow();
  });
});

describe("QuizService.editQuiz", () => {

  it("should preserve original text on first edit", async () => {
    const originalText = "Original question?";
    prismaMock.quiz.findUnique.mockResolvedValue({
      id: "quiz-uuid",
      questionText: originalText,
      wasEdited: false,
      options: ["A", "B", "C", "D"],
    } as any);

    prismaMock.quiz.update.mockResolvedValue({} as any);

    await quizService.editQuiz("quiz-uuid", {
      question_text: "Updated question?",
    });

    expect(prismaMock.quiz.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          originalQuestionText: originalText,
          wasEdited: true,
        }),
      })
    );
  });
});
```

---

# 11. Code Examples

## 11.1 How to Check Minimum Quiz Threshold Before Releasing to Students

Before showing quizzes to students, other features should use this
helper to verify the minimum approval threshold is met:
```typescript
// utils/quiz.utils.ts
export const checkQuizThreshold = async (
  contentId: string,
  quizType: "QUICK_ASSESSMENT" | "RETENTION"
): Promise<{ meets_threshold: boolean; approved_count: number }> => {
  const MINIMUM_QUICK = 5;
  const MINIMUM_RETENTION = 8;
  const minimum =
    quizType === "QUICK_ASSESSMENT" ? MINIMUM_QUICK : MINIMUM_RETENTION;

  const approvedCount = await prisma.quiz.count({
    where: {
      contentId,
      quizType,
      generationStatus: "APPROVED",
      availableFrom: { lte: new Date() },
    },
  });

  return {
    meets_threshold: approvedCount >= minimum,
    approved_count: approvedCount,
  };
};
```

---

# 12. Performance Optimization

## 12.1 Generation Time Estimates

On a server with a GPU (NVIDIA T4 or better):
- Concept extraction: 15–30 seconds
- Per-question generation: 5–10 seconds
- Full Quick Assessment (12 questions): 75–150 seconds (~2 minutes)
- Full Retention (14 questions): 90–170 seconds (~3 minutes)
- Total pipeline per content item: 5–7 minutes

On CPU-only server:
- Multiply all times by 5–8x
- Full pipeline: 25–50 minutes

For Phase One with low content volume, CPU is acceptable. For Phase
Two with multiple concurrent batches and regular uploads, a GPU
instance is strongly recommended.

## 12.2 Concurrency Control

Configure Bull to run only 1 quiz generation job at a time to prevent
multiple concurrent Ollama requests from degrading quality:
```typescript
// queues/content.queue.ts
export const contentQueue = new Bull("content-processing", {
  redis: { host: process.env.REDIS_HOST, port: 6379 },
});

// Register worker with concurrency = 1 for quiz generation
contentQueue.process("QUIZ_GENERATION", 1, processQuizGenerationJob);

// Transcription can run slightly more concurrently
contentQueue.process("TRANSCRIPTION", 2, processTranscriptionJob);
```

## 12.3 Model Selection Trade-offs

| Model | Size | RAM Required | Quality | Speed (GPU) |
|-------|------|-------------|---------|-------------|
| Llama 2 7B | 4GB | 8GB | Good | Fast |
| Llama 2 13B | 8GB | 16GB | Better | Medium |
| Mistral 7B | 4GB | 8GB | Very Good | Fast |
| Mixtral 8x7B | 26GB | 48GB | Excellent | Slow |

**Recommendation for Phase One:** Start with Mistral 7B. It produces
better instruction-following output than Llama 2 7B at the same
resource cost, and is well-suited to structured JSON generation tasks.

---

**End of Feature 04 — AI-Powered Quiz Generation**

---

**Document Information**

| Field | Value |
|-------|-------|
| Feature | F04 — AI-Powered Quiz Generation |
| Version | 1.0 |
| Status | Ready for Development |
| Folder | F04_Quiz_Generation/ |
| Filename | F04_Implementation_Guide.md |
| Previous Feature | F03_Content_Management/ |
| Next Feature | F05_Quiz_Review/F05_Implementation_Guide.md |