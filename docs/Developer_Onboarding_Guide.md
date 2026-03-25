# M2i_LMS — Developer Onboarding Guide
### Version 1.0 | March 2026
### Save As: Developer_Guides/M2i_LMS_Developer_Onboarding.md

---

# Table of Contents

1.  [Welcome](#1-welcome)
2.  [What You Are Building](#2-what-you-are-building)
3.  [Prerequisites](#3-prerequisites)
4.  [Repository Setup](#4-repository-setup)
5.  [Environment Configuration](#5-environment-configuration)
6.  [Database Setup](#6-database-setup)
7.  [AI Model Setup](#7-ai-model-setup)
8.  [Running the Stack](#8-running-the-stack)
9.  [Verifying Your Setup](#9-verifying-your-setup)
10. [Your First API Call](#10-your-first-api-call)
11. [Project Navigation Guide](#11-project-navigation-guide)
12. [Development Workflow](#12-development-workflow)
13. [Common Development Tasks](#13-common-development-tasks)
14. [Team Conventions](#14-team-conventions)
15. [Getting Unstuck](#15-getting-unstuck)

---

# 1. Welcome

This guide gets you from a blank laptop to a fully running
local M2i_LMS development environment. Follow it in order.
Do not skip sections — later steps depend on earlier ones.

**Estimated setup time:**
- With a fast internet connection and a GPU: 45-60 minutes
- Without a GPU (CPU-only AI): 30-40 minutes
  (AI processing will be slower but everything works)

**What you will have at the end:**
- The full M2i_LMS stack running locally
- A seeded database with test users, a batch, and sample content
- A working admin, mentor, and student account to explore
- An understanding of where everything lives in the codebase

**Who to ask when stuck:**
If this guide does not solve your problem, ask in the team
Slack channel before spending more than 30 minutes on any
single setup issue. Setup problems are almost always
environment-specific and faster to solve with a second pair
of eyes.

---

# 2. What You Are Building

M2i_LMS (Metrics to Internship Learning Management System)
is an AI-powered learning platform. Before touching any code,
spend 10 minutes understanding the product:

**The three user roles:**
- **Students** watch lecture videos, take AI-generated quizzes,
  attend live sessions, and track their progress across nine
  learning dimensions on a radar chart dashboard.
- **Mentors** upload videos, review AI-generated quiz questions
  before students see them, schedule and host live sessions,
  and monitor student progress with an alert system.
- **Admins** create batches (cohorts), enroll students, assign
  mentors, and manage user accounts.

**The automated pipeline you will work with most:**
When a mentor uploads a video, the platform automatically
extracts audio with FFmpeg, transcribes it with Whisper, and
generates multiple-choice quiz questions using Mistral 7B
running locally via Ollama. The mentor reviews these questions
before students can take them.

**Where to read more:**
The full product specification is in
`docs/Master_Documentation/M2i_LMS_Master_Documentation.md`.
Read at least the overview section before your first feature.

---

# 3. Prerequisites

## 3.1 Required Software

Install all of the following before proceeding. Version
numbers are minimums — newer versions generally work.

### Node.js 20 LTS
```bash
# Install via nvm (recommended — easy version switching)
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.7/install.sh | bash

# Reload shell
source ~/.bashrc   # or source ~/.zshrc

# Install and use Node 20
nvm install 20
nvm use 20
nvm alias default 20

# Verify
node --version   # Must show v20.x.x
npm --version    # Must show 10.x.x
```

### Docker Desktop

Required for running PostgreSQL and Redis locally.
```bash
# macOS: Download from https://www.docker.com/products/docker-desktop
# Ubuntu:
sudo apt-get update
sudo apt-get install -y docker.io docker-compose-plugin
sudo usermod -aG docker $USER
# Log out and back in after this

# Verify
docker --version          # Docker version 24+
docker compose version    # Docker Compose version v2+
```

### Git
```bash
# macOS: Comes with Xcode Command Line Tools
xcode-select --install

# Ubuntu:
sudo apt-get install -y git

# Verify
git --version  # git version 2.x
```

### FFmpeg

Required for audio extraction from uploaded videos.
```bash
# macOS
brew install ffmpeg

# Ubuntu
sudo apt-get update && sudo apt-get install -y ffmpeg

# Verify — must show version 4.x or 5.x or 6.x
ffmpeg -version
```

### Python 3.9+ and Whisper

Required for AI transcription.
```bash
# Check Python version first
python3 --version   # Must be 3.9 or higher

# macOS — if Python is too old or missing:
brew install python@3.11

# Ubuntu:
sudo apt-get install -y python3 python3-pip

# Install Whisper and PyTorch
# CPU-only version (works on any machine, slower):
pip3 install openai-whisper
pip3 install torch --index-url https://download.pytorch.org/whl/cpu

# GPU version (if you have an NVIDIA GPU):
pip3 install openai-whisper
pip3 install torch --index-url https://download.pytorch.org/whl/cu118

# Verify
python3 -c "import whisper; print('Whisper OK:', whisper.available_models())"
```

### Ollama

Required for AI quiz generation.
```bash
# macOS and Linux:
curl -fsSL https://ollama.ai/install.sh | sh

# Verify
ollama --version
```

### VS Code (Recommended)
```bash
# Download from https://code.visualstudio.com/

# Recommended extensions — install after opening the project:
# - Prisma (Prisma schema support)
# - ESLint
# - Prettier
# - TypeScript and JavaScript Language Features (built-in)
# - REST Client (for testing API endpoints)
# - GitLens
```

## 3.2 System Requirements
```
Minimum:
  CPU     : 4 cores
  RAM     : 16GB
  Storage : 20GB free (models + docker volumes)
  OS      : macOS 12+, Ubuntu 20.04+, Windows 11 with WSL2

Recommended:
  CPU     : 8 cores
  RAM     : 32GB
  Storage : 40GB free
  GPU     : NVIDIA GPU with 6GB+ VRAM (dramatically speeds up
             Whisper and Ollama processing)
```

**Windows users:** M2i_LMS development is supported on
Windows only via WSL2 (Windows Subsystem for Linux). Install
WSL2 with Ubuntu 22.04 and follow the Ubuntu instructions
throughout this guide. Do not try to run the stack in
native Windows — FFmpeg and Whisper have compatibility
issues outside of a Linux environment.

---

# 4. Repository Setup

## 4.1 Clone the Repository
```bash
# Clone the monorepo
git clone https://github.com/your-org/m2i-lms.git
cd m2i-lms

# You should see this structure:
ls
# backend/    frontend/    docs/    docker-compose.yml
# .env.example    README.md    .gitignore
```

## 4.2 Repository Structure Overview
```
m2i-lms/
├── backend/           Node.js + Express API server
│   ├── src/           TypeScript source
│   ├── prisma/        Database schema and migrations
│   ├── tests/         Unit and integration tests
│   ├── package.json
│   └── tsconfig.json
├── frontend/          Next.js frontend
│   ├── app/           Next.js App Router pages
│   ├── components/    Reusable React components
│   ├── lib/           Axios, Socket.io client
│   ├── package.json
│   └── tsconfig.json
├── docs/              All product documentation
│   ├── Master_Documentation/
│   ├── Feature_Documentation/
│   │   ├── F01_Authentication_And_RoleManagement/
│   │   ├── F02_Batch_Management/
│   │   └── ... (F03 through F10)
│   ├── Database_Schema/
│   ├── API_Endpoints/
│   ├── Tech_Stack/
│   ├── Quiz_Generation/
│   └── Developer_Guides/
├── docker-compose.yml
└── .env.example
```

## 4.3 Install Dependencies
```bash
# Install backend dependencies
cd backend
npm install
cd ..

# Install frontend dependencies
cd frontend
npm install
cd ..
```

This will take 2-4 minutes. You should see no errors.
Warnings about peer dependencies are acceptable.

---

# 5. Environment Configuration

## 5.1 Create Environment Files

M2i_LMS uses separate `.env` files for backend and frontend.
Both are gitignored — you create them from the examples.
```bash
# Backend environment
cp backend/.env.example backend/.env

# Frontend environment
cp frontend/.env.example frontend/.env.local
```

## 5.2 Configure Backend Environment

Open `backend/.env` in your editor. The following values
need to be set for local development:
```env
# =========================================================
# Already correct for local development — do not change:
# =========================================================
NODE_ENV=development
PORT=3001
CORS_ORIGIN=http://localhost:3000
REDIS_HOST=localhost
REDIS_PORT=6379
OLLAMA_URL=http://localhost:11434
OLLAMA_MODEL=mistral:7b-instruct-v0.2-q4_K_M
WHISPER_MODEL=medium
WHISPER_LANGUAGE=en

# =========================================================
# Set these — generate the secrets with the commands below:
# =========================================================
DATABASE_URL=postgresql://m2i_user:m2i_dev_password@localhost:5432/m2i_lms_dev

JWT_SECRET=           # Generate below
JWT_REFRESH_SECRET=   # Generate below — must differ from JWT_SECRET

# =========================================================
# AWS — use these placeholder values for local dev:
# (file uploads will fail but the rest works fine)
# =========================================================
AWS_REGION=ap-south-1
AWS_ACCESS_KEY_ID=AKIAIOSFODNN7EXAMPLE
AWS_SECRET_ACCESS_KEY=wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY
S3_BUCKET_NAME=m2i-lms-content-dev
CLOUDFRONT_DOMAIN=cdn-dev.m2ilms.com

# =========================================================
# Mux — leave empty for local dev (live streaming won't work)
# =========================================================
MUX_TOKEN_ID=
MUX_TOKEN_SECRET=
STREAMING_PROVIDER=MUX
```

**Generate the JWT secrets:**
```bash
# Run these two commands — copy each output into .env
openssl rand -base64 64   # → paste as JWT_SECRET
openssl rand -base64 64   # → paste as JWT_REFRESH_SECRET
```

The two values must be different from each other.

## 5.3 Configure Frontend Environment

Open `frontend/.env.local`. For local development the
defaults are correct — you do not need to change anything:
```env
NEXT_PUBLIC_API_URL=http://localhost:3001
NEXT_PUBLIC_SOCKET_URL=http://localhost:3001
NEXT_PUBLIC_APP_NAME=M2i LMS
NEXT_PUBLIC_APP_ENV=development
```

---

# 6. Database Setup

## 6.1 Start PostgreSQL and Redis with Docker
```bash
# From the root of the repository
docker compose up -d postgres redis

# Verify both are running
docker compose ps
# Should show: m2i_postgres (healthy), m2i_redis (healthy)

# If a container shows "unhealthy" wait 30 more seconds and check again
# The first start takes longer while Docker pulls the images
```

## 6.2 Run Database Migrations
```bash
cd backend

# Apply all migrations (creates all 20 tables)
npx prisma migrate deploy

# Verify migrations ran successfully
npx prisma migrate status
# Should show all migrations as "Applied"
```

## 6.3 Seed the Database
```bash
# Still inside backend/
npx prisma db seed

# Expected output:
# Seed data created successfully
# ─────────────────────────────────────
# Admin    login: admin@dev.com / ChangeMe123!
# Mentor   login: mentor@dev.com / ChangeMe123!
# Students login: student1@dev.com through student5@dev.com
# Password for all: ChangeMe123!
# ─────────────────────────────────────
```

## 6.4 Verify Database Contents
```bash
# Open Prisma Studio (visual database browser)
npx prisma studio
# Opens at http://localhost:5555

# Check that these tables have data:
# users          → 7 rows (1 admin, 1 mentor, 5 students)
# batches        → 1 row (active dev batch)
# enrollments    → 5 rows
# batch_mentors  → 1 row
```

---

# 7. AI Model Setup

## 7.1 Pull the Mistral 7B Model
```bash
# Start the Ollama service
ollama serve &   # Runs in background
# Or in a separate terminal: ollama serve

# Pull the model (downloads ~4.1GB — takes 5-15 min)
ollama pull mistral:7b-instruct-v0.2-q4_K_M

# Verify the model is available
ollama list
# Should show: mistral:7b-instruct-v0.2-q4_K_M
```

## 7.2 Test Ollama Is Working
```bash
# Quick test — should respond within 30 seconds
curl http://localhost:11434/api/generate \
  -d '{
    "model": "mistral:7b-instruct-v0.2-q4_K_M",
    "prompt": "Complete this JSON: {\"answer\": \"",
    "stream": false
  }'

# Expected: JSON response with a "response" field containing text
# If you get connection refused: ollama serve is not running
```

## 7.3 Test Whisper Is Working
```bash
# Download a short test audio file
curl -L "https://github.com/openai/whisper/raw/main/tests/jfk.flac" \
  -o /tmp/test_audio.flac

# Run Whisper on it (medium model takes 20-60 seconds)
python3 -m whisper /tmp/test_audio.flac \
  --model medium \
  --output_format json \
  --output_dir /tmp

# Check the output
cat /tmp/test_audio.json | python3 -m json.tool | head -20

# Expected: JSON with "text" field containing transcribed speech
# "And so my fellow Americans ask not..."
```

**If Whisper is slow:** On CPU-only machines, the medium model
takes 1-3 minutes for a 15-second clip. This is expected.
For development, set `WHISPER_MODEL=tiny` in `backend/.env` to
get near-instant transcription at lower accuracy. Never use
`tiny` in production.

---

# 8. Running the Stack

## 8.1 Start Everything

You need five things running simultaneously. Use separate
terminal tabs or a terminal multiplexer like tmux.

**Terminal 1 — Docker (PostgreSQL + Redis):**
```bash
cd m2i-lms
docker compose up -d postgres redis
# These run in the background, no need to keep terminal open
```

**Terminal 2 — Ollama AI Server:**
```bash
ollama serve
# Keep this terminal open — must stay running
# Output: Listening on 127.0.0.1:11434
```

**Terminal 3 — Backend API Server:**
```bash
cd m2i-lms/backend
npm run dev
# Keep this terminal open
# Output: Server running on port 3001
#         Socket.io attached
#         All cron jobs registered
```

**Terminal 4 — Frontend:**
```bash
cd m2i-lms/frontend
npm run dev
# Keep this terminal open
# Output: Ready - started server on 0.0.0.0:3000
```

## 8.2 Startup Checklist

After all four terminals are running, verify each service:
```
✓ PostgreSQL : docker compose ps → m2i_postgres healthy
✓ Redis      : docker compose ps → m2i_redis healthy
✓ Ollama     : curl http://localhost:11434 → returns {"ollama": "Ollama is running"}
✓ Backend    : curl http://localhost:3001/api/health → {"status": "ok"}
✓ Frontend   : Open http://localhost:3000 → M2i LMS login page
```

## 8.3 Stopping Everything
```bash
# Stop frontend and backend: Ctrl+C in their terminals

# Stop Ollama: Ctrl+C in its terminal

# Stop Docker services
docker compose down

# Stop Docker AND delete all data (full reset):
docker compose down -v
# ⚠️  The -v flag deletes the database volume — all data is lost
#     Only use this when you want a completely fresh start
```

---

# 9. Verifying Your Setup

Run through this checklist after setup. If anything fails,
the troubleshooting section at the end of this guide
covers the most common issues.

## 9.1 Health Check
```bash
# Backend health
curl http://localhost:3001/api/health
# Expected:
# {"status":"ok","timestamp":"...","version":"1.0.0","environment":"development"}

# Database connectivity
curl http://localhost:3001/api/health/db \
  -H "Cookie: $(curl -s -c - http://localhost:3001/api/auth/login \
    -H 'Content-Type: application/json' \
    -d '{"email":"admin@dev.com","password":"ChangeMe123!"}' | \
    grep access_token | awk '{print "access_token="$7}')"
# Expected: {"status":"ok","latency_ms":...}
```

## 9.2 Login Test
```bash
# Test admin login
curl -s -X POST http://localhost:3001/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@dev.com","password":"ChangeMe123!"}' \
  | python3 -m json.tool

# Expected: success:true with user data including role:"ADMIN"
```

## 9.3 Frontend Test

1. Open http://localhost:3000 in your browser
2. Log in with `admin@dev.com` / `ChangeMe123!`
3. You should see the admin dashboard
4. Log out and log in with `student1@dev.com` / `ChangeMe123!`
5. You should see the student dashboard

If both logins work and show different UIs, your setup is
complete and correct.

---

# 10. Your First API Call

This walkthrough makes a real API call through the complete
request lifecycle, so you understand how a request flows
through the codebase.

## 10.1 Log In and Get a Token
```bash
# Log in as the mentor
curl -s -c /tmp/m2i_cookies.txt \
  -X POST http://localhost:3001/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"mentor@dev.com","password":"ChangeMe123!"}' \
  | python3 -m json.tool

# The response contains user data
# The -c flag saves the auth cookies to /tmp/m2i_cookies.txt
```

## 10.2 Fetch Your Batch
```bash
# Use the saved cookie to call an authenticated endpoint
curl -s -b /tmp/m2i_cookies.txt \
  http://localhost:3001/api/batches \
  | python3 -m json.tool

# Expected: A list of batches including the dev batch
```

## 10.3 Trace the Request Through the Code

Now open the codebase and follow what happened:

**1. Request entry:**
`backend/src/routes/batch.routes.ts`
Find the `GET /` route handler — this is where the request
was matched.

**2. Middleware:**
`backend/src/middleware/authenticate.ts`
This ran first, verified the JWT cookie, and attached the
user object to the request.

**3. Controller:**
`backend/src/controllers/batch.controller.ts`
`listBatches()` was called, extracted query parameters,
and called the service.

**4. Service:**
`backend/src/services/batch.service.ts`
`listBatches()` contains the actual business logic.

**5. Database:**
`backend/src/lib/prisma.ts` (Prisma client)
The Prisma query was built and executed here.

**6. Response:**
The service returned data to the controller, which wrapped
it in the standard response envelope and sent it back.

This is the same pattern for every endpoint in the system.
Once you understand one endpoint end-to-end, you understand
all of them.

---

# 11. Project Navigation Guide

## 11.1 When You Need to Find Something

**"Where is the database schema?"**
→ `backend/prisma/schema.prisma`
→ Full reference: `docs/Database_Schema/M2i_LMS_Database_Schema.md`

**"Where is the API endpoint for X?"**
→ `backend/src/routes/` — find the relevant route file
→ Full reference: `docs/API_Endpoints/M2i_LMS_API_Endpoints.md`

**"Where is the business logic for X?"**
→ `backend/src/services/` — each feature has a service file

**"Where is the React component for X?"**
→ `frontend/components/` — organized by feature
→ `frontend/app/` — the pages that use those components

**"How does the quiz generation pipeline work?"**
→ `backend/src/workers/quizGeneration.worker.ts` — main worker
→ Full reference: `docs/Quiz_Generation/M2i_LMS_Quiz_Generation_Workflow.md`

**"Which features are built and which are pending?"**
→ Each Feature_Documentation folder has an Implementation Guide
→ Check git history or ask the team

**"How do I add a new notification type?"**
→ `docs/Feature_Documentation/F10_Notifications/F10_Implementation_Guide.md`
→ Section 8: Notification Events Reference

## 11.2 Key Files to Know
```
backend/src/server.ts              Entry point — HTTP server + Socket.io
backend/src/app.ts                 Express setup and middleware
backend/src/services/              One service file per feature
backend/src/queues/                Bull queue definitions
backend/src/workers/               Background job processors
backend/src/jobs/                  Scheduled cron jobs
backend/prisma/schema.prisma       The database — all 20 tables

frontend/app/layout.tsx            Root layout — auth + notifications
frontend/context/                  AuthContext, NotificationContext
frontend/lib/api.ts                Axios instance with auto-refresh
frontend/lib/socket.ts             Socket.io client setup
```

## 11.3 Documentation Map
```
You are working on...           Read this document first:
─────────────────────────────────────────────────────────
Authentication / JWT            F01_Implementation_Guide.md
User / batch management         F02_Implementation_Guide.md
Video upload / transcription    F03_Implementation_Guide.md
Quiz generation (AI pipeline)   F04 + Quiz_Generation_Workflow.md
Quiz review (mentor)            F05_Implementation_Guide.md
Live streaming                  F06_Implementation_Guide.md
Quiz taking (student)           F07_Implementation_Guide.md
Student dashboard / charts      F08_Implementation_Guide.md
Metrics / scoring algorithms    F09_Implementation_Guide.md
Notifications                   F10_Implementation_Guide.md
Any database question           M2i_LMS_Database_Schema.md
Any API question                M2i_LMS_API_Endpoints.md
Any infrastructure question     M2i_LMS_Tech_Stack.md
```

---

# 12. Development Workflow

## 12.1 Starting a New Feature

Before writing any code for a new feature or task:

1. **Read the feature document**
   Open the relevant F0X_Implementation_Guide.md.
   Read the overview and the data model sections first.
   Then read the API endpoints section for the specific
   endpoint you are building.

2. **Check the database schema**
   Open `backend/prisma/schema.prisma` and find the relevant
   models. If the tables do not exist yet, create a migration.

3. **Create a branch**
```bash
   git checkout -b feature/F03-content-upload
   # or
   git checkout -b fix/quiz-submission-idempotency
```

4. **Build in this order:**
   a. Prisma migration (if new tables needed)
   b. Validation schema (Joi)
   c. Service layer (business logic)
   d. Controller (request/response handling)
   e. Route registration
   f. Frontend component
   g. Tests

## 12.2 Making a Database Change
```bash
# After modifying backend/prisma/schema.prisma:

# Create a new migration (always name it descriptively)
npx prisma migrate dev --name add_quiz_attempts_table
# This: creates migration SQL, applies it, regenerates client

# If you just need to regenerate the client without migration:
npx prisma generate

# Never edit migration files by hand after they are created
# If you make a mistake, create a new migration to fix it
```

## 12.3 Running Tests
```bash
# All tests
cd backend
npm test

# Specific test file
npm test -- tests/unit/quizGeneration.test.ts

# Watch mode (re-runs on save — use during active development)
npm test -- --watch

# With coverage report
npm test -- --coverage
```

## 12.4 Code Formatting
```bash
# Format all files
cd backend && npm run format
cd frontend && npm run format

# Lint check
npm run lint

# These also run automatically on commit via Husky
# If a commit fails, run npm run format first
```

## 12.5 Git Commit Convention
```
Format: <type>(<scope>): <description>

Types:
  feat     : New feature
  fix      : Bug fix
  docs     : Documentation change
  refactor : Code change that is neither feat nor fix
  test     : Adding or fixing tests
  chore    : Build system, dependency updates

Examples:
  feat(F07): implement quiz submission endpoint
  fix(F06): close attendance records on session end
  test(F09): add unit tests for learning velocity algorithm
  docs(F03): update content upload flow diagram
  refactor(auth): extract token refresh into utility function

Keep the description under 72 characters.
Use the body for context when needed.
Reference issues: "Closes #42" at end of body.
```

---

# 13. Common Development Tasks

## 13.1 Add a New API Endpoint
```bash
# Example: Adding GET /api/batches/:batchId/summary

# 1. Add validation schema if needed
# backend/src/validators/batch.validator.ts

# 2. Add service method
# backend/src/services/batch.service.ts
async getBatchSummary(batchId: string) {
  // business logic here
}

# 3. Add controller method
# backend/src/controllers/batch.controller.ts
async getBatchSummary(req: AuthenticatedRequest, res: Response) {
  const { batchId } = req.params;
  const data = await this.batchService.getBatchSummary(batchId);
  res.json({ success: true, data });
}

# 4. Register route
# backend/src/routes/batch.routes.ts
router.get(
  "/:batchId/summary",
  authorize(["MENTOR", "ADMIN", "SUPER_ADMIN"]),
  controller.getBatchSummary
);

# 5. Test with curl
curl -s -b /tmp/m2i_cookies.txt \
  http://localhost:3001/api/batches/YOUR_BATCH_ID/summary
```

## 13.2 Add a New Database Table
```bash
# 1. Add the model to backend/prisma/schema.prisma

model NewTable {
  id        String   @id @default(dbgenerated("gen_random_uuid()")) @db.Uuid
  # ... columns
  createdAt DateTime @default(now()) @map("created_at") @db.Timestamptz

  @@map("new_table")
}

# 2. Create and apply migration
npx prisma migrate dev --name add_new_table

# 3. Import in service files that need it
import { prisma } from "../lib/prisma";
// prisma.newTable is now available with full TypeScript types
```

## 13.3 Add a Background Job
```bash
# 1. Define the job type in the relevant queue
# backend/src/queues/content.queue.ts
# (or create a new queue file if it belongs to a new domain)

# 2. Create the worker function
# backend/src/workers/myNewJob.worker.ts
export const processMyNewJob = async (job: Job): Promise<void> => {
  const { some_param } = job.data;
  // job logic here
};

# 3. Register the worker on the queue
contentQueue.process("MY_NEW_JOB", 3, processMyNewJob);
//                                  ↑ max concurrency

# 4. Queue a job from anywhere in the codebase
await contentQueue.add(
  "MY_NEW_JOB",
  { some_param: "value" },
  { attempts: 3 }
);
```

## 13.4 Add a New Notification Type
```bash
# 1. Add to the events reference in F10 documentation
# (keeps the team's understanding up to date)

# 2. Use it anywhere in the codebase:
await notificationService.send({
  userId: "some-user-uuid",
  type: "MY_NEW_NOTIFICATION_TYPE",
  title: "Something happened",
  message: "Details about what happened",
  metadata: { relevant_id: "..." },
  action_url: "/path/to/action",
});

# 3. Add an icon/color for the new type in the frontend
# frontend/components/notifications/NotificationItem.tsx
# Add to the NOTIFICATION_CONFIG object
```

## 13.5 Reset Your Local Database
```bash
# Option 1: Reset and re-run migrations + seed (keeps Docker running)
cd backend
npx prisma migrate reset
# Prompts for confirmation, then drops all tables and re-runs everything

# Option 2: Nuclear reset (deletes Docker volume, truly fresh start)
docker compose down -v   # Deletes postgres_data volume
docker compose up -d postgres redis
cd backend
npx prisma migrate deploy
npx prisma db seed
```

## 13.6 Check What Jobs Are in the Queue
```bash
# Open Bull Dashboard (dev only)
# Navigate to http://localhost:3001/admin/queues
# Shows all queues, waiting/active/completed/failed jobs
# You can retry failed jobs from here
```

## 13.7 Simulate the Quiz Generation Pipeline
```bash
# Manually trigger the quiz generation pipeline for a content item
# (useful for testing without uploading a video)

# 1. Insert a test content record with a transcript
psql postgresql://m2i_user:m2i_dev_password@localhost:5432/m2i_lms_dev

INSERT INTO content (
  id, batch_id, uploaded_by, title, content_type,
  storage_url, transcript, transcription_status, is_published
)
SELECT
  gen_random_uuid(),
  id,
  (SELECT id FROM users WHERE role = 'MENTOR' LIMIT 1),
  'Test Content for Quiz Generation',
  'VIDEO',
  'video/test/placeholder.mp4',
  'The Node.js event loop allows non-blocking I/O operations
   despite JavaScript being single-threaded. It achieves this
   by offloading operations to the system kernel. The event loop
   has several phases: timers, pending callbacks, idle and prepare,
   poll, check, and close callbacks. The require() function loads
   modules synchronously and caches them for future use.',
  'COMPLETE',
  TRUE
FROM batches WHERE status = 'ACTIVE' LIMIT 1;

# Copy the content id from the output, then:

# 2. Manually queue the generation job via the REPL
cd backend
node -e "
const { contentQueue } = require('./dist/queues/content.queue');
contentQueue.add('GENERATE_QUIZZES', {
  content_id: 'PASTE_CONTENT_ID_HERE',
  generation_run_id: require('uuid').v4()
});
console.log('Job queued');
setTimeout(() => process.exit(), 1000);
"

# 3. Watch the backend terminal for generation progress
# Takes 3-10 minutes depending on hardware
```

---

# 14. Team Conventions

## 14.1 TypeScript Conventions

**Never use `any` without a comment explaining why:**
```typescript
// BAD
const data: any = response.data;

// GOOD
const data = response.data as BatchSummary;

// ACCEPTABLE (with explanation)
const legacyField = (config as any).oldPropertyName;
// TODO: remove when config migration is complete
```

**Always handle the null/undefined case:**
```typescript
// BAD
const user = await prisma.user.findUnique({ where: { id } });
console.log(user.email);  // Will crash if user not found

// GOOD
const user = await prisma.user.findUnique({ where: { id } });
if (!user) {
  throw { code: "USER_NOT_FOUND", statusCode: 404 };
}
console.log(user.email);  // Safe
```

**Use the standard error throw pattern:**
```typescript
// All service-level errors use this pattern
// The errorHandler middleware catches and formats them
throw {
  code: "ERROR_CODE_IN_SCREAMING_SNAKE_CASE",
  message: "Human-readable message",
  statusCode: 400,
};
```

## 14.2 API Conventions

**Always use the standard response envelope:**
```typescript
// Success
res.status(200).json({
  success: true,
  data: { ... },
  message: "Optional message",
});

// Error (handled by errorHandler middleware — don't do this manually)
// Just throw the error object from the service layer
```

**Always validate request bodies with Joi before touching them:**
```typescript
// In the route:
router.post("/", validate(createBatchSchema), controller.create);

// Never read req.body in a controller without prior validation
```

**Always check authorization in the service, not just the route:**
```typescript
// Routes check role (MENTOR, ADMIN, etc.)
// Services check ownership (is this mentor assigned to this batch?)
// Both checks are needed — defense in depth
```

## 14.3 Database Conventions

**Always use transactions for multi-table writes:**
```typescript
// BAD — if second write fails, data is inconsistent
await prisma.quizAttempt.create({ data: attemptData });
await prisma.quizResponse.createMany({ data: responseData });

// GOOD — either both succeed or neither does
await prisma.$transaction([
  prisma.quizAttempt.create({ data: attemptData }),
  prisma.quizResponse.createMany({ data: responseData }),
]);
```

**Always include deleted_at check on soft-deleted tables:**
```typescript
// Tables with soft deletion: users, content
// Always filter out deleted records
await prisma.content.findMany({
  where: { batchId, deletedAt: null },  // ← Never forget this
});
```

## 14.4 Notification Conventions

**Notifications must never block the primary operation:**
```typescript
// BAD — if notification fails, the whole operation fails
await createQuiz(data);
await notificationService.send(...);  // If this throws, quiz is lost

// GOOD — notification failure is silent
await createQuiz(data);
try {
  await notificationService.send(...);
} catch (err) {
  logger.error("Notification send failed:", err);
  // Primary operation succeeded — do not re-throw
}
```

---

# 15. Getting Unstuck

## 15.1 Troubleshooting Checklist

Before asking for help, work through this list:
```
□ Is Docker running?
  → docker compose ps

□ Are all five services running?
  → PostgreSQL, Redis, Ollama, Backend, Frontend

□ Is the error in the backend terminal or browser console?
  → Check both

□ Is the database up to date?
  → cd backend && npx prisma migrate status

□ Have you tried restarting the affected service?
  → Ctrl+C and npm run dev again

□ Is the .env file missing or incorrect?
  → Compare with .env.example

□ Is the error a TypeScript compile error?
  → npm run build in backend/ to see full error list

□ Did you run npm install after pulling new changes?
  → cd backend && npm install
  → cd frontend && npm install
```

## 15.2 Common Errors and Fixes

**Error: `Cannot connect to database`**
```bash
# Check PostgreSQL is running
docker compose ps
# If not running:
docker compose up -d postgres
# Wait 10 seconds then try again
```

**Error: `Cannot connect to Redis`**
```bash
docker compose up -d redis
# If it keeps failing, check port 6379 is not in use:
lsof -i :6379
```

**Error: `Prisma client not generated`**
```bash
cd backend
npx prisma generate
npm run dev
```

**Error: `Ollama connection refused`**
```bash
# Ollama is not running
ollama serve
# In a separate terminal, leave it running
```

**Error: `JWT_SECRET is not defined`**
```bash
# .env file is missing or has empty JWT_SECRET
# Generate and add:
echo "JWT_SECRET=$(openssl rand -base64 64)" >> backend/.env
echo "JWT_REFRESH_SECRET=$(openssl rand -base64 64)" >> backend/.env
```

**Error: `Migration failed` during prisma migrate dev**
```bash
# Usually means database has diverged from migration history
# Safe nuclear option for development:
npx prisma migrate reset
```

**Error: `Port 3001 already in use`**
```bash
# Find and kill the process using port 3001
lsof -ti:3001 | xargs kill -9
# Then start the backend again
```

**Error: `Port 3000 already in use`**
```bash
lsof -ti:3000 | xargs kill -9
```

**Frontend shows blank page or crashes**
```bash
# Check the browser console (F12) for errors
# Most common cause: NEXT_PUBLIC_API_URL pointing to wrong backend URL
cat frontend/.env.local
# Should show: NEXT_PUBLIC_API_URL=http://localhost:3001
```

**Quiz generation produces no output**
```bash
# Check if Ollama has the model
ollama list
# If model missing:
ollama pull mistral:7b-instruct-v0.2-q4_K_M

# Check if job is queued
# Open http://localhost:3001/admin/queues
# Look for failed jobs in the content-processing queue
```

**Whisper transcription fails silently**
```bash
# Test Whisper directly
python3 -m whisper /tmp/test_audio.flac --model tiny
# If this fails, reinstall Whisper:
pip3 install --upgrade openai-whisper
```

## 15.3 Useful Debug Commands
```bash
# View all running Docker containers and their health
docker compose ps

# Tail PostgreSQL logs
docker compose logs -f postgres

# Tail Redis logs
docker compose logs -f redis

# Check what's in a specific database table
psql postgresql://m2i_user:m2i_dev_password@localhost:5432/m2i_lms_dev \
  -c "SELECT id, email, role FROM users;"

# Count records in all tables
psql postgresql://m2i_user:m2i_dev_password@localhost:5432/m2i_lms_dev \
  -c "SELECT schemaname, tablename, n_live_tup
      FROM pg_stat_user_tables
      ORDER BY n_live_tup DESC;"

# Check Bull queue job counts directly in Redis
redis-cli
> KEYS bull:*
> LLEN bull:content-processing:wait

# Check if a specific port is in use
lsof -i :3001
lsof -i :3000
lsof -i :5432
lsof -i :6379
lsof -i :11434
```

## 15.4 When to Ask for Help

Ask immediately if:
- You see a database migration conflict (migrations out of sync
  with team members)
- You get a permissions error accessing AWS S3 or Mux
- Ollama is returning consistent nonsense output that does not
  improve after model restart
- You are blocked on a setup step for more than 30 minutes

Ask in Slack with:
1. What you were trying to do
2. The exact error message (copy-paste, not a screenshot)
3. What you already tried from the troubleshooting checklist

---

**End of Developer Onboarding Guide**

---

**Document Information**

| Field | Value |
|-------|-------|
| Document Title | M2i_LMS Developer Onboarding Guide |
| Version | 1.0 |
| Status | Ready |
| Created | March 2026 |
| Last Updated | March 2026 |
| Estimated Setup Time | 45-60 minutes |
| Maintained By | Tech Lead |
| Repository | /docs/Developer_Guides/M2i_LMS_Developer_Onboarding.md |
| Next Document | M2i_LMS_Development_Milestones.md |