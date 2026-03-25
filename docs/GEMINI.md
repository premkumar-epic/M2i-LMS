# M2i_LMS — Gemini CLI Context File

## Tech Stack
Node.js 20, Express 4, TypeScript 5, Prisma 5,
PostgreSQL 15, Redis 7, Next.js 14 App Router,
Tailwind CSS 3, shadcn/ui, Socket.io, Bull queues,
Ollama (Mistral 7B), bcryptjs, jsonwebtoken, Joi

## Project Structure
```
backend/src/
  app.ts              Express app + middleware stack
  server.ts           HTTP server + Socket.io + cron entry point
  lib/prisma.ts       Singleton Prisma client
  scheduler.ts        node-cron job scheduler
  routes/             One file per domain
  controllers/        Thin request/response handlers
  services/           All business logic
  middleware/         authenticate, authorize, validate, errorHandler
  validators/         Joi schemas (used via validate() middleware)
  queues/             Bull queue definitions + processors
  workers/            Background job processors
  jobs/               Scheduled cron jobs
  sockets/            Socket.io event handlers
  scripts/            Manual job runners

frontend/
  app/                App Router pages (role-prefixed: /student, /mentor, /admin)
  components/         Reusable UI components
  context/            AuthContext, NotificationContext
  lib/api.ts          Axios instance with token refresh interceptor
  lib/socket.ts       Socket.io client setup
  middleware.ts       JWT-based route protection (no backend call)
```

## Key Patterns

### Error throwing (services)
```typescript
throw { code: "ERROR_CODE", message: "Human message", statusCode: 400 };
```

### API response format
```typescript
res.status(200).json({ success: true, data: { ... } });
```

### Authorization (two layers)
1. `authorize(["MENTOR", "ADMIN"])` on routes
2. Ownership check in service layer

### Database
- All PKs are UUIDs via `gen_random_uuid()`
- Soft delete: filter `deletedAt: null` on users/content
- Multi-table writes: `prisma.$transaction([...])`

## Current Task
Week 1 — Foundation: Authentication (F01) + Batch Management (F02)

## File Scope for Today
- backend/src/services/auth.service.ts
- backend/src/middleware/ (all files)
- backend/prisma/schema.prisma
- backend/src/routes/auth.routes.ts
- backend/src/controllers/auth.controller.ts

## Do NOT Read Unless Asked
- features/ (reference docs, paste from them as needed)
- docs/ (same)
- frontend/app/ (handled separately)

## Seed Credentials (all: ChangeMe123!)
- admin@dev.com (ADMIN)
- mentor@dev.com (MENTOR)
- student1-5@dev.com (STUDENT)
