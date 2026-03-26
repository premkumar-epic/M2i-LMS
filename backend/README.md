# M2i LMS — Backend API

REST API server for the **Mentorship to Internship & Learning Management System**. Built with Node.js, Express, PostgreSQL, and Redis.

---

## Tech Stack

| Layer | Technology |
|---|---|
| Runtime | Node.js 20 + TypeScript 5 |
| Framework | Express 4 |
| Database | PostgreSQL 15 (Prisma 5 ORM) |
| Cache / Queues | Redis 7 + Bull |
| Auth | JWT — access + refresh tokens via HttpOnly cookies |
| Validation | Joi |
| Real-time | Socket.io |
| Logging | Winston + Morgan |
| API Docs | Swagger UI (`/api-docs`) |
| Scheduler | node-cron |
| AI (Phase 2) | Ollama (Mistral 7B) + Whisper |

---

## Project Structure

```
src/
  app.ts              # Express app — middleware stack, routes, Swagger
  server.ts           # HTTP server — Socket.io, scheduler, graceful shutdown
  scheduler.ts        # node-cron job registration
  swagger.ts          # OpenAPI spec
  controllers/        # HTTP layer — thin wrappers around services
    auth.controller.ts
    batch.controller.ts
    user.controller.ts
  services/           # Business logic
    auth.service.ts
    batch.service.ts
    user.service.ts
  routes/             # Route definitions with auth + validation middleware
    auth.routes.ts
    batch.routes.ts
    user.routes.ts
    health.routes.ts
  middleware/
    authenticate.ts   # JWT access token verification
    authorize.ts      # Role-based access control
    validate.ts       # Joi request body validation
    errorHandler.ts   # Global error handler
  validators/         # Joi schemas
  queues/
    queues.ts         # Bull Queue instances (content, metrics, session, notification)
    processors.ts     # Worker stubs — wired at startup
  sockets/
    notificationSocket.ts  # Socket.io real-time handler
  jobs/
    cleanup.job.ts    # Nightly login attempt cleanup
  lib/
    prisma.ts         # Prisma singleton client
    logger.ts         # Winston logger
prisma/
  schema.prisma       # 20-table database schema
  seed.ts             # Dev seed data
  migrations/         # Applied Prisma migrations
```

---

## API Endpoints

### Authentication — `/api/auth`

| Method | Endpoint | Auth | Description |
|---|---|---|---|
| POST | `/register` | Public | Register a new user |
| POST | `/login` | Public | Login — sets JWT cookies |
| POST | `/logout` | Public | Revoke refresh token + clear cookies |
| POST | `/refresh-token` | Public | Silent access token refresh |
| GET | `/me` | Required | Get current user profile |
| PUT | `/me` | Required | Update own profile |
| PUT | `/change-password` | Required | Change password + revoke all sessions |

### Batch Management — `/api/batches`

| Method | Endpoint | Role | Description |
|---|---|---|---|
| POST | `/` | Admin | Create batch |
| GET | `/` | Admin | List batches (search + status filter) |
| GET | `/:batchId` | Admin / Mentor | Get batch details |
| PUT | `/:batchId` | Admin | Update batch |
| POST | `/:batchId/archive` | Admin | Archive batch |
| POST | `/:batchId/enroll` | Admin | Bulk enroll students |
| DELETE | `/:batchId/enroll/:studentId` | Admin | Withdraw student |
| GET | `/:batchId/students` | Admin / Mentor | List enrolled students |
| POST | `/:batchId/mentors` | Admin | Assign mentors |
| GET | `/my/batch` | Student | Get own enrolled batch |

### User Management — `/api/users`

| Method | Endpoint | Role | Description |
|---|---|---|---|
| POST | `/` | Admin | Create user with temp password |
| GET | `/` | Admin | List users (search + role filter) |
| GET | `/:userId` | Admin | Get user by ID |
| PUT | `/:userId` | Admin | Update name, role, or active status |
| POST | `/:userId/reset-password` | Admin | Reset password + revoke all sessions |

### Health — `/api/health`

| Method | Endpoint | Description |
|---|---|---|
| GET | `/` | Liveness check |
| GET | `/db` | Database connectivity check |

---

## Database Schema

20 tables:

`User` · `RefreshToken` · `LoginAttempt` · `Batch` · `Enrollment` · `BatchMentor` · `Content` · `ContentAccessLog` · `SupplementaryFile` · `Quiz` · `QuizResponse` · `QuizAttempt` · `QuizGenerationLog` · `LiveSession` · `SessionAttendance` · `SessionContentLink` · `StudentProgress` · `StudentAlert` · `Notification` · `MetricsCalculationLog`

---

## Getting Started

### Prerequisites

- Node.js 20+
- Docker (or local PostgreSQL 15 + Redis 7)

### 1. Install dependencies

```bash
npm install
```

### 2. Start infrastructure

```bash
# From the monorepo root (or use your own Postgres + Redis)
docker-compose up -d
```

Starts PostgreSQL on `5432` and Redis on `6379`.

### 3. Configure environment

```bash
cp .env.example .env
```

Minimum required for local dev:

```env
DATABASE_URL=postgresql://m2i_user:m2i_dev_password@localhost:5432/m2i_lms_dev
JWT_SECRET=<random-string-min-32-chars>
JWT_REFRESH_SECRET=<different-random-string-min-32-chars>
```

Generate secrets:
```bash
openssl rand -base64 64
```

### 4. Run migrations and seed

```bash
npx prisma migrate dev
npx prisma db seed
```

### 5. Start dev server

```bash
npm run dev
```

Server: `http://localhost:3001`
API docs: `http://localhost:3001/api-docs`

---

## Seeded Dev Accounts

| Role | Email | Password |
|---|---|---|
| Super Admin | `admin@m2ilms.com` | `Admin@1234` |
| Mentor | `mentor@m2ilms.com` | `Mentor@1234` |
| Student | `student@m2ilms.com` | `Student@1234` |

---

## Scripts

```bash
npm run dev          # Dev server with hot reload
npm run build        # Compile TypeScript → dist/
npm run start        # Run compiled build
npm run test         # Jest test suite
npm run lint         # ESLint
npm run format       # Prettier
npm run job:metrics  # Manually trigger metrics job
npm run job:alerts   # Manually trigger alert detection job
```

---

## Queue Architecture

Four Bull queues initialized on startup. Workers are stubs — implemented progressively in Weeks 2–6:

| Queue | Feature | Planned Jobs |
|---|---|---|
| `content` | F03/F04 — AI pipeline | `EXTRACT_AUDIO`, `TRANSCRIBE`, `GENERATE_QUIZ` |
| `metrics` | F09 — Metrics engine | `CALCULATE_STUDENT_METRICS`, `CALCULATE_BATCH_METRICS` |
| `session` | F06 — Live streaming | `SESSION_STARTED`, `SESSION_ENDED`, `RECORD_ATTENDANCE` |
| `notification` | F10 — Notifications | `SEND_NOTIFICATION`, `SEND_BATCH_NOTIFICATION` |

---

## Environment Variables

See `.env.example` for the full annotated list. Key variables:

| Variable | Default | Required | Description |
|---|---|---|---|
| `PORT` | `3001` | No | Express server port |
| `DATABASE_URL` | — | Yes | PostgreSQL connection string |
| `JWT_SECRET` | — | Yes | Access token signing secret |
| `JWT_REFRESH_SECRET` | — | Yes | Refresh token signing secret |
| `REDIS_HOST` | `localhost` | No | Redis host |
| `REDIS_PORT` | `6379` | No | Redis port |
| `CORS_ORIGIN` | `http://localhost:3000` | No | Allowed frontend origin |
| `LOG_LEVEL` | `debug` | No | Winston log level |

---

## License

Proprietary — Netpy Technologies. All rights reserved.
