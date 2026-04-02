# M2i LMS — Mentorship to Internship Learning Management System

An AI-powered learning and career development platform that connects students with mentors through structured batch-based courses, real-time sessions, video content, quizzes, and a metrics engine that tracks student progress.

**Stack:** Node.js + Express + Prisma + PostgreSQL + Redis (backend) · Next.js 14 App Router + Tailwind CSS (frontend)

---

## Table of Contents

1. [Prerequisites](#1-prerequisites)
2. [Repository Structure](#2-repository-structure)
3. [First-Time Setup](#3-first-time-setup)
4. [Running the Project](#4-running-the-project)
5. [Dev Seed Accounts](#5-dev-seed-accounts)
6. [Environment Variables](#6-environment-variables)
7. [Useful Commands](#7-useful-commands)
8. [Documentation](#8-documentation)

---

## 1. Prerequisites

Install these before anything else.

| Tool | Version | Notes |
|------|---------|-------|
| Node.js | 20+ | Use [nvm](https://github.com/nvm-sh/nvm) to manage versions |
| npm | 10+ | Comes with Node |
| Podman | 4+ | Used instead of Docker on this project |
| Git | any | — |
| FFmpeg | any | Required for audio extraction worker |

> **Why Podman?** Docker is not used on this project. All container commands use `podman`. The syntax is identical to Docker.

---

## 2. Repository Structure

```
M2i-LMS/
├── backend/          # Node.js + Express + Prisma API server (port 3001)
├── frontend/         # Next.js 14 App Router (port 3000)
└── docs/
    ├── features/         # Implementation guides for each module (F01–F10)
    ├── API_Endpoints.md  # All 87 API endpoints
    ├── Database_Schema.md
    ├── M2i_LMS.md        # Master product document
    └── Weekly_Development_Milestones.md
```

---

## 3. First-Time Setup

Follow these steps in order.

### Step 1 — Clone the repo

```bash
git clone https://github.com/premkumar-epic/M2i-LMS.git
cd M2i-LMS
```

### Step 2 — Start Postgres and Redis

```bash
# Pull images (first time only)
podman pull docker.io/postgres:15-alpine
podman pull docker.io/redis:7-alpine

# Create and start containers (first time only)
podman run -d \
  --name m2i-postgres \
  -e POSTGRES_USER=m2i_user \
  -e POSTGRES_PASSWORD=m2i_dev_password \
  -e POSTGRES_DB=m2i_lms_dev \
  -p 5432:5432 \
  docker.io/postgres:15-alpine

podman run -d \
  --name m2i-redis \
  -p 6379:6379 \
  docker.io/redis:7-alpine
```

On subsequent runs, just start the existing containers:

```bash
podman start m2i-postgres m2i-redis
```

### Step 3 — Set up backend

```bash
cd backend

# Install dependencies
npm install

# Copy environment file and fill in values
cp .env.example .env
# Edit .env — at minimum set JWT_SECRET and JWT_REFRESH_SECRET:
# openssl rand -base64 64   ← run this twice, use each output for one secret

# Run database migrations
npx prisma migrate dev

# Seed the database with dev accounts and sample data
export $(grep -v '^#' .env | grep DATABASE_URL | xargs) && npx tsx prisma/seed.ts
```

### Step 4 — Set up frontend

```bash
cd ../frontend

# Install dependencies
npm install

# Copy environment file
cp .env.example .env.local
# Default values work for local dev — no changes needed
```

### Step 5 — Verify

```bash
# Check Postgres is accepting connections
podman exec m2i-postgres psql -U m2i_user -d m2i_lms_dev -c "\dt" | head -5

# Check Redis is responding
podman exec m2i-redis redis-cli ping
# Expected: PONG
```

---

## 4. Running the Project

Open two terminal tabs.

**Terminal 1 — Backend (port 3001)**
```bash
cd backend
npm run dev
```

You should see:
```
[Server] M2i_LMS API running on port 3001
[Queues] Bull queues initialized: content, metrics, session, notification
[Scheduler] Cron scheduler initialized
```

**Terminal 2 — Frontend (port 3000)**
```bash
cd frontend
npm run dev
```

You should see:
```
▲ Next.js 14.x
- Local: http://localhost:3000
✓ Ready
```

Open **http://localhost:3000** in your browser.

---

## 5. Dev Seed Accounts

These accounts are created by `npx tsx prisma/seed.ts`.

| Role | Email | Password |
|------|-------|----------|
| Super Admin | `superadmin@dev.com` | `ChangeMe123!` |
| Admin | `admin@dev.com` | `ChangeMe123!` |
| Mentor | `mentor@dev.com` | `ChangeMe123!` |
| Mentor 2 | `mentor2@dev.com` | `ChangeMe123!` |
| Student | `student1@dev.com` | `ChangeMe123!` |
| Student 2–5 | `student2@dev.com` … `student5@dev.com` | `ChangeMe123!` |

### Role-based routing

| Role | Landing page after login |
|------|--------------------------|
| Admin / Super Admin | `/admin/dashboard` |
| Mentor | `/mentor/dashboard` |
| Student | `/student/dashboard` |
| No role assigned | `/pending-role` |

---

## 6. Environment Variables

### Backend (`backend/.env`)

| Variable | Required | Description |
|----------|----------|-------------|
| `DATABASE_URL` | Yes | PostgreSQL connection string |
| `REDIS_HOST` / `REDIS_PORT` | Yes | Redis connection |
| `JWT_SECRET` | Yes | Generate: `openssl rand -base64 64` |
| `JWT_REFRESH_SECRET` | Yes | Must be different from `JWT_SECRET` |
| `AWS_ACCESS_KEY_ID` / `AWS_SECRET_ACCESS_KEY` | No* | S3 file uploads. Leave empty to use local uploads in dev |
| `S3_BUCKET_NAME` | No* | S3 bucket name |
| `CLOUDFRONT_DOMAIN` | No* | CDN domain for file URLs |
| `MUX_TOKEN_ID` / `MUX_TOKEN_SECRET` | No | Only needed for live streaming (Week 5+) |
| `OLLAMA_URL` | No | Only needed for AI quiz generation (Week 3+) |

> *Without S3 credentials, the backend falls back to local file storage in dev mode (`/uploads` folder). Uploads and video playback still work.

### Frontend (`frontend/.env.local`)

| Variable | Default | Description |
|----------|---------|-------------|
| `NEXT_PUBLIC_API_URL` | `http://localhost:3001` | Backend API URL |
| `NEXT_PUBLIC_SOCKET_URL` | `http://localhost:3001` | Socket.io URL (same as API) |

The default values work out of the box for local development.

---

## 7. Useful Commands

### Database

```bash
# Apply new migrations after pulling changes
cd backend && npx prisma migrate dev

# Re-seed the database (resets dev data)
cd backend && export $(grep -v '^#' .env | grep DATABASE_URL | xargs) && npx tsx prisma/seed.ts

# Open Prisma Studio (visual DB browser)
cd backend && npx prisma studio
```

### Manually trigger background jobs

```bash
cd backend
npm run job:metrics   # Recalculate student metrics
npm run job:alerts    # Run student alert checks
```

### Swagger API docs

Available at http://localhost:3001/api-docs when the backend is running.

---

## 8. Documentation

| Document | What it covers |
|----------|---------------|
| [docs/M2i_LMS.md](docs/M2i_LMS.md) | Full product vision and architecture |
| [docs/API_Endpoints.md](docs/API_Endpoints.md) | All 87 API endpoints with request/response schemas |
| [docs/Database_Schema.md](docs/Database_Schema.md) | 20-table Prisma schema explained |
| [docs/features/](docs/features/) | Implementation guides per feature (F01–F10) |
| [docs/Weekly_Development_Milestones.md](docs/Weekly_Development_Milestones.md) | Week-by-week build plan and go/no-go criteria |

---

*M2i LMS — Version 1.0 | Netpy Technologies*
