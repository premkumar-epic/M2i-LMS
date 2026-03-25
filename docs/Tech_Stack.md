# M2i_LMS — Tech Stack Sub-Document

### Version 1.0 | March 2026 | Sub-Document 04 of 05

### Save As: Tech_Stack/M2i_LMS_Tech_Stack.md

---

# Table of Contents

1. [Overview](#1-overview)
2. [Architecture Diagram](#2-architecture-diagram)
3. [Backend Runtime and Framework](#3-backend-runtime-and-framework)
4. [Frontend Framework](#4-frontend-framework)
5. [Database Layer](#5-database-layer)
6. [Authentication and Security](#6-authentication-and-security)
7. [File Storage and Delivery](#7-file-storage-and-delivery)
8. [AI and Machine Learning](#8-ai-and-machine-learning)
9. [Live Streaming](#9-live-streaming)
10. [Real-Time Communication](#10-real-time-communication)
11. [Background Jobs and Queues](#11-background-jobs-and-queues)
12. [Scheduling](#12-scheduling)
13. [Email (Phase Two)](#13-email-phase-two)
14. [Monitoring and Observability](#14-monitoring-and-observability)
15. [Development Tooling](#15-development-tooling)
16. [Infrastructure and Deployment](#16-infrastructure-and-deployment)
17. [Environment Variables Reference](#17-environment-variables-reference)
18. [Dependency Installation Guide](#18-dependency-installation-guide)
19. [Version Compatibility Matrix](#19-version-compatibility-matrix)
20. [Build-vs-Buy Decision Log](#20-build-vs-buy-decision-log)

---

# 1. Overview

## 1.1 Stack Philosophy

M2i_LMS is built on a pragmatic, production-proven tech stack
optimized for four constraints:

**Speed of development:** A four-person team with 8-9 weeks
to MVP needs well-documented, widely-used technologies with
large ecosystems and easy hiring pools. Exotic or cutting-edge
choices are explicitly avoided.

**Total cost of ownership:** As a free, open-source platform
M2i_LMS generates zero revenue. Infrastructure costs must be
minimized without sacrificing reliability. Local AI inference
(Whisper + Ollama) eliminates the most expensive recurring
cost line — per-token API fees — that would otherwise make
the platform financially unsustainable.

**Minimal operational complexity:** Phase One with one team
and no dedicated DevOps engineer means the stack must be
manageable by developers. Managed services (RDS, Elastic
Beanstalk) are preferred over self-managed infrastructure.

**Phase Two extensibility:** Every choice is evaluated not
just for Phase One needs but for how cleanly it allows Phase
Two features (multi-batch, forum, career matching, company
portal) to be added without architectural rewrites.

## 1.2 Layer Summary


| Layer            | Technology                 | Reason                    |
| ---------------- | -------------------------- | ------------------------- |
| Backend          | Node.js 20 LTS + Express 4 | Fast dev, vast ecosystem  |
| Frontend         | Next.js 14 + React 18      | SSR, routing, full-stack  |
| Database         | PostgreSQL 15              | Relational, JSONB, proven |
| ORM              | Prisma 5                   | Type safety, migrations   |
| Auth             | Passport.js + JWT + bcrypt | Flexible, standard        |
| File Storage     | AWS S3 + CloudFront        | Cost-effective CDN        |
| AI Transcription | OpenAI Whisper (local)     | Free, accurate, private   |
| AI Quiz Gen      | Mistral 7B via Ollama      | Free, runs locally        |
| Live Streaming   | Mux                        | Reliable, affordable      |
| Real-Time        | Socket.io 4                | Mature, battle-tested     |
| Job Queue        | Bull 4 + Redis 7           | Reliable, well-documented |
| Scheduler        | node-cron 3                | Simple, sufficient        |
| Styling          | Tailwind CSS 3 + shadcn/ui | Fast, consistent          |
| Language         | TypeScript 5 (full-stack)  | Type safety everywhere    |

---

# 2. Architecture Diagram

```
┌─────────────────────────────────────────────────────────┐
│                    CLIENT BROWSER                        │
│              Next.js 14 (React 18 + TypeScript)         │
│         Tailwind CSS 3 + shadcn/ui + Socket.io Client   │
└──────────────────────────┬──────────────────────────────┘
                           │ HTTPS + WSS
                           ▼
┌─────────────────────────────────────────────────────────┐
│                   APPLICATION SERVER                     │
│              Node.js 20 LTS + Express 4                 │
│                  TypeScript 5 (compiled)                 │
│                                                         │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐  │
│  │  REST API    │  │  Socket.io   │  │ Background   │  │
│  │  (Express)   │  │  Server      │  │ Job Workers  │  │
│  └──────────────┘  └──────────────┘  └──────────────┘  │
│                                                         │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐  │
│  │   Passport   │  │  Bull Queue  │  │  node-cron   │  │
│  │   JWT Auth   │  │  Workers     │  │  Scheduler   │  │
│  └──────────────┘  └──────────────┘  └──────────────┘  │
└──────┬──────┬──────┬──────────┬───────────┬────────────┘
       │      │      │          │           │
       ▼      ▼      ▼          ▼           ▼
  ┌────────┐ ┌─────┐ ┌───────┐ ┌────────┐ ┌──────────┐
  │Postgres│ │Redis│ │AWS S3 │ │  Mux   │ │ Ollama   │
  │  15    │ │  7  │ │  +    │ │Streaming│ │(Mistral  │
  │(Prisma)│ │     │ │Cloud  │ │   API  │ │  7B)     │
  └────────┘ └─────┘ │ Front │ └────────┘ │+Whisper  │
                      └───────┘            └──────────┘
```

## 2.1 Request Flow

```
Browser → Next.js Frontend
        → API Request to Node.js Backend (HTTPS)
        → Express Router → Middleware Chain
          (Auth → Rate Limit → Validate → Controller)
        → Service Layer (Business Logic)
        → Prisma ORM → PostgreSQL

Background Jobs:
        → Bull Queue (Redis) → Worker Process
        → Ollama (Mistral 7B) [local HTTP]
        → Whisper [local subprocess]
        → AWS S3 [direct API call]
        → Mux API [HTTP]

Real-Time:
        → Socket.io Server (same Node.js process)
        → User's Personal Room
        → Browser WebSocket
```

---

# 3. Backend Runtime and Framework

## 3.1 Node.js

**Version:** 20.x LTS (Long Term Support)
**Release Policy:** Active LTS until April 2026, Maintenance until April 2028

**Why Node.js 20 specifically:**
Node.js 20 introduced native test runner maturity, improved
performance in the V8 engine, and stable Fetch API. The LTS
guarantee means security patches without breaking changes for
the full Phase One and Phase Two development period.

**Why Node.js over alternatives:**


| Alternative    | Reason Rejected                                     |
| -------------- | --------------------------------------------------- |
| Deno           | Smaller ecosystem, fewer production-ready libraries |
| Bun            | Too young, production stability unproven            |
| Python/FastAPI | Team expertise in JavaScript, slower JSON handling  |
| Go             | Steeper learning curve for team, slower feature dev |

**Installation:**

```bash
# Using nvm (recommended)
nvm install 20
nvm use 20
nvm alias default 20

# Verify
node --version   # v20.x.x
npm --version    # 10.x.x
```

**package.json engine constraint:**

```json
{
  "engines": {
    "node": ">=20.0.0",
    "npm": ">=10.0.0"
  }
}
```

## 3.2 TypeScript

**Version:** 5.4.x

**Why TypeScript across the full stack:**
Type errors caught at compile time are infinitely cheaper than
runtime bugs discovered in production. With a 4-person team
building 87 endpoints, shared TypeScript types between frontend
and backend eliminate an entire category of API contract bugs —
the most common source of integration issues in full-stack
projects. The slight setup overhead pays back within the first
week of development.

**tsconfig.json (Backend):**

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "commonjs",
    "lib": ["ES2022"],
    "outDir": "./dist",
    "rootDir": "./src",
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "forceConsistentCasingInFileNames": true,
    "resolveJsonModule": true,
    "declaration": true,
    "declarationMap": true,
    "sourceMap": true,
    "experimentalDecorators": true,
    "emitDecoratorMetadata": true,
    "paths": {
      "@/*": ["./src/*"]
    }
  },
  "include": ["src/**/*"],
  "exclude": ["node_modules", "dist", "**/*.test.ts"]
}
```

## 3.3 Express.js

**Version:** 4.18.x

**Why Express over alternatives:**


| Alternative | Reason Rejected                                    |
| ----------- | -------------------------------------------------- |
| Fastify     | Better performance but fewer familiar middleware   |
| NestJS      | Too opinionated/complex for team size and timeline |
| Koa         | Smaller ecosystem, less middleware available       |
| Hapi        | More complex configuration, less widely known      |

Express is the most widely-known Node.js framework. Every
Node.js developer has used it. This eliminates onboarding
friction and makes Stack Overflow and documentation more
useful.

**Core middleware stack:**

```typescript
// src/app.ts — middleware registration order matters
import express from "express";
import cors from "cors";
import helmet from "helmet";
import cookieParser from "cookie-parser";
import { rateLimiter } from "./middleware/rateLimiter";
import { requestLogger } from "./middleware/requestLogger";
import { errorHandler } from "./middleware/errorHandler";

const app = express();

// Security headers
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      imgSrc: ["'self'", "data:", "https:"],
    },
  },
  crossOriginEmbedderPolicy: false,
}));

// CORS — allow frontend origin with credentials
app.use(cors({
  origin: process.env.CORS_ORIGIN ?? "http://localhost:3000",
  credentials: true,
  methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization"],
}));

// Body parsing
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true, limit: "10mb" }));

// Cookie parsing (for JWT HttpOnly cookies)
app.use(cookieParser());

// Request logging
app.use(requestLogger);

// Global rate limiter
app.use(rateLimiter);

// Routes
// ...

// Error handler (must be last)
app.use(errorHandler);
```

**Key Express packages:**


| Package            | Version | Purpose                   |
| ------------------ | ------- | ------------------------- |
| express            | 4.18.x  | Core framework            |
| cors               | 2.8.x   | CORS headers              |
| helmet             | 7.x     | Security headers          |
| cookie-parser      | 1.4.x   | Parse HttpOnly cookies    |
| express-rate-limit | 7.x     | Rate limiting middleware  |
| express-validator  | 7.x     | Request validation        |
| morgan             | 1.10.x  | HTTP request logging      |
| compression        | 1.7.x   | gzip response compression |

## 3.4 Project Structure (Backend)

```
backend/
├── src/
│   ├── app.ts                 Express app setup
│   ├── server.ts              HTTP server + Socket.io init
│   ├── controllers/           Request handlers
│   │   ├── auth.controller.ts
│   │   ├── batch.controller.ts
│   │   ├── content.controller.ts
│   │   ├── quiz.controller.ts
│   │   ├── liveSession.controller.ts
│   │   ├── dashboard.controller.ts
│   │   └── notification.controller.ts
│   ├── services/              Business logic
│   │   ├── auth.service.ts
│   │   ├── batch.service.ts
│   │   ├── content.service.ts
│   │   ├── quizGeneration.service.ts
│   │   ├── quizTaking.service.ts
│   │   ├── quizReview.service.ts
│   │   ├── liveSession.service.ts
│   │   ├── metricsEngine.service.ts
│   │   ├── dashboard.service.ts
│   │   └── notification.service.ts
│   ├── middleware/            Express middleware
│   │   ├── authenticate.ts    JWT verification
│   │   ├── authorize.ts       Role-based access
│   │   ├── rateLimiter.ts     Rate limiting
│   │   ├── validate.ts        Joi validation wrapper
│   │   ├── errorHandler.ts    Global error handler
│   │   └── requestLogger.ts   Morgan logging
│   ├── routes/                Express routers
│   │   ├── auth.routes.ts
│   │   ├── user.routes.ts
│   │   ├── batch.routes.ts
│   │   ├── content.routes.ts
│   │   ├── quiz.routes.ts
│   │   ├── liveSession.routes.ts
│   │   ├── dashboard.routes.ts
│   │   └── notification.routes.ts
│   ├── workers/               Bull job processors
│   │   ├── transcription.worker.ts
│   │   ├── quizGeneration.worker.ts
│   │   ├── recordingFetch.worker.ts
│   │   └── metricsCalculation.worker.ts
│   ├── jobs/                  Cron job functions
│   │   ├── nightlyMetrics.job.ts
│   │   ├── alertGeneration.job.ts
│   │   ├── batchStatusTransition.job.ts
│   │   ├── sessionMissedCheck.job.ts
│   │   └── notificationCleanup.job.ts
│   ├── queues/                Bull queue definitions
│   │   ├── content.queue.ts
│   │   ├── session.queue.ts
│   │   └── metrics.queue.ts
│   ├── sockets/               Socket.io handlers
│   │   └── notificationSocket.ts
│   ├── utils/                 Shared utilities
│   │   ├── algorithms/        Metrics calculation algorithms
│   │   │   ├── learningVelocity.ts
│   │   │   ├── contentEngagement.ts
│   │   │   ├── problemSolving.ts
│   │   │   ├── knowledgeRetention.ts
│   │   │   ├── consistency.ts
│   │   │   ├── curiosity.ts
│   │   │   ├── communication.ts
│   │   │   ├── errorRecovery.ts
│   │   │   ├── conceptualDepth.ts
│   │   │   └── overallScore.ts
│   │   ├── streamingProvider.utils.ts
│   │   ├── s3.utils.ts
│   │   ├── jwt.utils.ts
│   │   └── insights.utils.ts
│   ├── validators/            Joi schemas
│   │   ├── auth.validator.ts
│   │   ├── batch.validator.ts
│   │   ├── content.validator.ts
│   │   ├── quiz.validator.ts
│   │   ├── liveSession.validator.ts
│   │   └── quizTaking.validator.ts
│   └── types/                 Shared TypeScript types
│       ├── express.d.ts       Augmented Request type
│       └── index.ts           Shared interfaces
├── prisma/
│   ├── schema.prisma          Database schema
│   ├── migrations/            Migration history
│   └── seed.ts                Development seed data
├── tests/
│   ├── unit/                  Unit tests
│   ├── integration/           Integration tests
│   └── fixtures/              Test data
├── package.json
├── tsconfig.json
└── .env.example
```

---

# 4. Frontend Framework

## 4.1 Next.js

**Version:** 14.2.x (App Router)
**React Version:** 18.3.x

**Why Next.js over plain React:**


| Feature            | Plain React (CRA/Vite)          | Next.js 14                  |
| ------------------ | ------------------------------- | --------------------------- |
| Routing            | Client-side only, extra library | Built-in file-based routing |
| SSR                | Extra setup (Next.js or Remix)  | Native                      |
| API routes         | Separate backend needed         | Built-in /app/api           |
| Image optimization | Manual                          | Built-in next/image         |
| Font optimization  | Manual                          | Built-in next/font          |
| SEO                | Poor (client-rendered)          | Excellent                   |
| Code splitting     | Manual config                   | Automatic                   |
| Bundle size        | Larger without tree-shaking     | Optimized                   |

For an LMS with student dashboards, mentor tools, and admin
pages, Next.js's App Router provides clean separation of
server and client components, significantly reducing the
JavaScript shipped to the browser for static content.

**Next.js App Router Structure:**

```
frontend/
├── app/
│   ├── layout.tsx             Root layout with providers
│   ├── page.tsx               Home / landing
│   ├── (auth)/
│   │   ├── login/page.tsx
│   │   └── register/page.tsx
│   ├── student/
│   │   ├── layout.tsx         Student auth guard
│   │   ├── dashboard/page.tsx
│   │   ├── content/
│   │   │   ├── page.tsx       Content library
│   │   │   └── [contentId]/page.tsx
│   │   ├── sessions/
│   │   │   ├── page.tsx
│   │   │   └── [sessionId]/page.tsx
│   │   └── quizzes/
│   │       └── [contentId]/[quizType]/page.tsx
│   ├── mentor/
│   │   ├── layout.tsx         Mentor auth guard
│   │   ├── batches/
│   │   │   └── [batchId]/
│   │   │       ├── dashboard/page.tsx
│   │   │       ├── content/page.tsx
│   │   │       ├── review/page.tsx
│   │   │       ├── sessions/page.tsx
│   │   │       └── students/
│   │   │           └── [studentId]/dashboard/page.tsx
│   │   └── sessions/
│   │       └── [sessionId]/page.tsx
│   └── admin/
│       ├── layout.tsx         Admin auth guard
│       ├── dashboard/page.tsx
│       ├── users/page.tsx
│       └── batches/page.tsx
├── components/
│   ├── layout/                Nav, header, sidebar
│   ├── auth/                  Login form, guards
│   ├── dashboard/             RadarChart, DimensionCard etc
│   ├── content/               VideoPlayer, ContentCard etc
│   ├── quizzes/               QuizQuestion, QuizResults etc
│   ├── sessions/              SessionCard, StreamInterface etc
│   └── notifications/         Bell, Dropdown, Toast etc
├── context/
│   ├── AuthContext.tsx
│   └── NotificationContext.tsx
├── hooks/
│   ├── useQuizSession.ts
│   ├── useHeartbeat.ts
│   ├── useStudentDashboard.ts
│   ├── useBatchProgress.ts
│   └── useNotifications.ts
├── lib/
│   ├── api.ts                 Axios instance
│   ├── socket.ts              Socket.io client
│   └── auth.ts                Auth helpers
├── types/
│   └── index.ts               Shared frontend types
├── public/                    Static assets
├── next.config.ts
├── tailwind.config.ts
└── tsconfig.json
```

**next.config.ts:**

```typescript
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Standalone output for Docker deployment
  output: "standalone",

  // Allow images from CDN and avatars
  images: {
    domains: [
      "cdn.m2ilms.com",
      "s3.amazonaws.com",
    ],
  },

  // Proxy API calls to backend in development
  async rewrites() {
    return [
      {
        source: "/api/:path*",
        destination: `${process.env.NEXT_PUBLIC_API_URL}/api/:path*`,
      },
    ];
  },

  // Security headers
  async headers() {
    return [
      {
        source: "/(.*)",
        headers: [
          { key: "X-Frame-Options", value: "DENY" },
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
        ],
      },
    ];
  },
};

export default nextConfig;
```

## 4.2 Styling

### Tailwind CSS

**Version:** 3.4.x

Tailwind is the sole CSS framework. No component library
CSS is imported — only Tailwind utility classes plus
shadcn/ui which generates Tailwind-based component code.

**tailwind.config.ts:**

```typescript
import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./app/**/*.{js,ts,jsx,tsx}",
    "./components/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        brand: {
          50:  "#EEF2FF",
          100: "#E0E7FF",
          500: "#6366F1",
          600: "#4F46E5",
          700: "#4338CA",
          900: "#312E81",
        },
      },
      fontFamily: {
        sans: ["Inter var", "Inter", "system-ui", "sans-serif"],
      },
    },
  },
  plugins: [],
};

export default config;
```

### shadcn/ui

**Version:** latest (components copied into codebase)

shadcn/ui is not a library — it generates component source
files that are copied into the project and owned by the team.
This means no version lock-in and full customization ability.

Used for: Button, Input, Select, Dialog, Dropdown, Toast,
Table, Badge, Tabs, Card.

```bash
# Initialize shadcn/ui
npx shadcn-ui@latest init

# Add individual components as needed
npx shadcn-ui@latest add button
npx shadcn-ui@latest add dialog
npx shadcn-ui@latest add table
```

## 4.3 Axios HTTP Client

**Version:** 1.6.x

Axios is used for all HTTP requests from the frontend to
the backend. A pre-configured instance handles authentication
cookie forwarding, base URL, and automatic token refresh.

```typescript
// lib/api.ts
import axios from "axios";

const api = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3001",
  withCredentials: true,  // Send cookies with every request
  headers: {
    "Content-Type": "application/json",
  },
});

// Response interceptor for automatic token refresh
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;

    if (
      error.response?.status === 401 &&
      !originalRequest._retry &&
      !originalRequest.url?.includes("/auth/refresh-token")
    ) {
      originalRequest._retry = true;

      try {
        await api.post("/api/auth/refresh-token");
        return api(originalRequest);
      } catch {
        // Refresh failed — redirect to login
        window.location.href = "/login";
        return Promise.reject(error);
      }
    }

    return Promise.reject(error);
  }
);

export default api;
```

---

# 5. Database Layer

## 5.1 PostgreSQL

**Version:** 15.x
**Connection:** Managed via Prisma connection pool

**Why PostgreSQL over alternatives:**


| Alternative | Reason Rejected                                  |
| ----------- | ------------------------------------------------ |
| MySQL       | Weaker JSONB support, inferior full-text search  |
| MongoDB     | Relational data model is clearer for this domain |
| SQLite      | Not suitable for multi-user production use       |
| CockroachDB | Overkill complexity for Phase One scale          |

PostgreSQL 15 provides everything M2i_LMS needs: strong
relational integrity, JSONB for quiz options and metadata,
partial indexes for query optimization, and excellent
Prisma support.

**Development setup:**

```bash
# With Docker (recommended)
docker run --name m2i-postgres \
  -e POSTGRES_DB=m2i_lms_dev \
  -e POSTGRES_USER=m2i_user \
  -e POSTGRES_PASSWORD=m2i_dev_password \
  -p 5432:5432 \
  -v m2i_postgres_data:/var/lib/postgresql/data \
  -d postgres:15

# Verify connection
psql postgresql://m2i_user:m2i_dev_password@localhost:5432/m2i_lms_dev
```

**docker-compose.yml (development):**

```yaml
version: "3.8"

services:
  postgres:
    image: postgres:15
    container_name: m2i_postgres
    environment:
      POSTGRES_DB: m2i_lms_dev
      POSTGRES_USER: m2i_user
      POSTGRES_PASSWORD: m2i_dev_password
    ports:
      - "5432:5432"
    volumes:
      - postgres_data:/var/lib/postgresql/data
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U m2i_user -d m2i_lms_dev"]
      interval: 10s
      timeout: 5s
      retries: 5

  redis:
    image: redis:7-alpine
    container_name: m2i_redis
    ports:
      - "6379:6379"
    volumes:
      - redis_data:/data
    command: redis-server --appendonly yes
    healthcheck:
      test: ["CMD", "redis-cli", "ping"]
      interval: 10s
      timeout: 3s
      retries: 5

volumes:
  postgres_data:
  redis_data:
```

## 5.2 Prisma ORM

**Version:** 5.12.x

Prisma provides three things: type-safe database client,
migration management, and schema-as-source-of-truth. The
generated client means database calls have full TypeScript
autocomplete and compile-time validation.

**Key Prisma commands:**

```bash
# Generate Prisma client after schema changes
npx prisma generate

# Create and apply new migration
npx prisma migrate dev --name descriptive_migration_name

# Apply migrations in production (no new migration)
npx prisma migrate deploy

# Open visual database browser
npx prisma studio

# Reset dev database and re-run all migrations
npx prisma migrate reset

# Run seed file
npx prisma db seed
```

**Prisma client singleton (prevents connection pool exhaustion):**

```typescript
// lib/prisma.ts
import { PrismaClient } from "@prisma/client";

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    log:
      process.env.NODE_ENV === "development"
        ? ["query", "error", "warn"]
        : ["error"],
  });

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}
```

**Connection pool configuration:**

```env
DATABASE_URL="postgresql://user:pass@host:5432/db?connection_limit=10&pool_timeout=20"
```

---

# 6. Authentication and Security

## 6.1 Passport.js

**Version:** 0.7.x
**Strategies used:** passport-local, passport-jwt

Passport.js provides the authentication middleware layer.
It handles credential verification and session management
in a way that is extensible to social login providers
in Phase Two (Google OAuth, LinkedIn).

```bash
npm install passport passport-local passport-jwt
npm install -D @types/passport @types/passport-local @types/passport-jwt
```

## 6.2 JSON Web Tokens

**Package:** jsonwebtoken 9.x
**Access token TTL:** 1 hour
**Refresh token TTL:** 7 days
**Algorithm:** HS256

JWTs are stored exclusively as HttpOnly, Secure, SameSite=Strict
cookies. They are NEVER stored in localStorage or returned in
response bodies (except the refresh token registration endpoint
which immediately sets the cookie).

```typescript
// utils/jwt.utils.ts
import jwt from "jsonwebtoken";

const JWT_SECRET = process.env.JWT_SECRET!;
const REFRESH_SECRET = process.env.JWT_REFRESH_SECRET!;

export const generateAccessToken = (userId: string): string => {
  return jwt.sign(
    { user_id: userId, type: "access" },
    JWT_SECRET,
    { expiresIn: "1h" }
  );
};

export const generateRefreshToken = (userId: string): string => {
  return jwt.sign(
    { user_id: userId, type: "refresh" },
    REFRESH_SECRET,
    { expiresIn: "7d" }
  );
};

export const verifyAccessToken = (
  token: string
): { user_id: string } => {
  return jwt.verify(token, JWT_SECRET) as { user_id: string };
};
```

## 6.3 bcrypt

**Package:** bcryptjs 2.4.x (pure JS, no native deps)
**Salt rounds:** 10

```bash
npm install bcryptjs
npm install -D @types/bcryptjs
```

**Why bcryptjs over bcrypt:** bcrypt requires native compilation
which adds CI/CD complexity. bcryptjs is pure JavaScript with
identical API and sufficient performance for Phase One (10 rounds
≈ 100ms per hash, which is acceptable for login operations).

## 6.4 Helmet.js

**Version:** 7.x

Helmet sets 11 security-related HTTP headers automatically:
X-Content-Type-Options, X-Frame-Options, Strict-Transport-Security,
Content-Security-Policy, and others. One line of middleware
eliminates the most common web security misconfiguration issues.

## 6.5 express-rate-limit

**Version:** 7.x

Applied at three levels:

1. Global: 200 requests per minute per IP for all routes
2. Auth: 5 failed logins per minute per IP
3. Specific: Custom limits for expensive endpoints
   (upload URL generation, quiz regeneration)

```typescript
// middleware/rateLimiter.ts
import rateLimit from "express-rate-limit";

export const rateLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 200,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    error: {
      code: "RATE_LIMIT_EXCEEDED",
      message: "Too many requests. Please try again in a minute.",
    },
  },
});

export const authRateLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 5,
  skipSuccessfulRequests: true,
  message: {
    success: false,
    error: {
      code: "RATE_LIMIT_EXCEEDED",
      message: "Too many failed login attempts. Try again in 1 minute.",
    },
  },
});
```

## 6.6 Joi Validation

**Version:** 17.x

Every request body and query parameter set is validated by a
Joi schema before reaching the controller. This enforces data
types, required fields, string lengths, enum membership, and
cross-field rules at the entry point.

```typescript
// middleware/validate.ts
import Joi from "joi";
import { Request, Response, NextFunction } from "express";

export const validate = (schema: Joi.ObjectSchema) => {
  return (req: Request, res: Response, next: NextFunction) => {
    const { error, value } = schema.validate(req.body, {
      abortEarly: false,
      stripUnknown: true,
    });

    if (error) {
      return res.status(400).json({
        success: false,
        error: {
          code: "VALIDATION_ERROR",
          message: "Request validation failed",
          details: error.details.map((d) => ({
            field: d.path.join("."),
            message: d.message,
          })),
        },
      });
    }

    req.body = value;
    next();
  };
};
```

---

# 7. File Storage and Delivery

## 7.1 AWS S3

**SDK:** @aws-sdk/client-s3 v3.x (AWS SDK v3)
**Purpose:** Store all uploaded videos and documents permanently

**Why S3:**
S3 is the industry standard for object storage with 99.999999999%
durability guarantee, lifecycle policies, and straightforward
pricing. At Phase One scale (under 100 videos) costs are
negligible — approximately $0.023 per GB per month for storage
plus transfer costs. For 50 videos averaging 200MB each,
total storage cost is under $0.25 per month.

**S3 bucket configuration:**

```
Bucket name    : m2i-lms-content-{env}
Region         : ap-south-1 (Mumbai — closest to India)
Versioning     : Disabled (not needed, overwrite is not used)
Encryption     : SSE-S3 (server-side encryption)
Public access  : All public access BLOCKED
CORS           : Allow PUT from frontend origin (for direct upload)
Lifecycle      : None in Phase One
```

**S3 CORS configuration:**

```json
[
  {
    "AllowedHeaders": ["*"],
    "AllowedMethods": ["PUT", "POST"],
    "AllowedOrigins": ["https://app.m2ilms.com"],
    "ExposeHeaders": ["ETag"],
    "MaxAgeSeconds": 3000
  }
]
```

**Pre-signed URL generation:**

```typescript
// utils/s3.utils.ts
import {
  S3Client,
  PutObjectCommand,
  GetObjectCommand,
} from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

const s3Client = new S3Client({
  region: process.env.AWS_REGION!,
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID!,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!,
  },
});

const BUCKET = process.env.S3_BUCKET_NAME!;

export const generateUploadUrl = async (
  s3Key: string,
  mimeType: string
): Promise<string> => {
  const command = new PutObjectCommand({
    Bucket: BUCKET,
    Key: s3Key,
    ContentType: mimeType,
  });

  return getSignedUrl(s3Client, command, { expiresIn: 900 });
};

export const generateDownloadUrl = async (
  s3Key: string
): Promise<string> => {
  const command = new GetObjectCommand({
    Bucket: BUCKET,
    Key: s3Key,
  });

  return getSignedUrl(s3Client, command, { expiresIn: 3600 });
};
```

## 7.2 AWS CloudFront CDN

**Purpose:** Deliver videos and documents to students with
low latency from S3 origin

**Configuration:**

```
Distribution origin : S3 bucket (private)
Access control      : Origin Access Control (OAC)
Price class         : PriceClass_200 (North America, Europe, Asia)
Default TTL         : 86400 seconds (1 day) for video
                      3600 seconds (1 hour) for documents
HTTPS               : Required (HTTP redirects to HTTPS)
```

**CDN URL format:**

```
https://cdn.m2ilms.com/video/{batch_id}/{content_id}/filename.mp4
https://cdn.m2ilms.com/files/{batch_id}/{content_id}/slides.pdf
```

**Why CloudFront over alternatives:**


| Alternative | Reason                                      |
| ----------- | ------------------------------------------- |
| Cloudflare  | Would require moving DNS — adds complexity |
| BunnyCDN    | Cheaper but less native S3 integration      |
| No CDN      | Unacceptable for video delivery performance |

---

# 8. AI and Machine Learning

## 8.1 Whisper (Audio Transcription)

**Model:** openai/whisper
**Runtime:** Local subprocess (Python)
**Model size used:** medium (769M parameters, ~1.5GB VRAM)

**Why local Whisper over cloud APIs:**


| Approach               | Cost             | Privacy            | Speed        |
| ---------------------- | ---------------- | ------------------ | ------------ |
| OpenAI Whisper API     | $0.006/min audio | Data leaves server | Fast         |
| AWS Transcribe         | $0.024/min audio | Data on AWS        | Fast         |
| Local Whisper (medium) | Free             | Data stays local   | ~2x realtime |
| Local Whisper (large)  | Free             | Data stays local   | ~4x realtime |

For a 45-minute lecture video, OpenAI API cost is $0.27.
Across 100 videos that is $27. This seems cheap but for a
free platform with no revenue, any recurring cost creates
sustainability risk. Local Whisper eliminates this entirely.

**Installation:**

```bash
# Install Python dependencies
pip install openai-whisper
pip install torch torchvision torchaudio --index-url \
  https://download.pytorch.org/whl/cu118

# Download model on first run (automatic)
# Medium model: ~1.5GB download

# Verify installation
python -c "import whisper; print(whisper.available_models())"
```

**Node.js integration — spawning Whisper as subprocess:**

```typescript
// utils/whisper.utils.ts
import { spawn } from "child_process";
import { promises as fs } from "fs";
import path from "path";

type WhisperResult = {
  text: string;
  segments: Array<{
    start: number;
    end: number;
    text: string;
  }>;
  language: string;
};

export const transcribeAudio = (
  audioFilePath: string,
  model: string = "medium"
): Promise<WhisperResult> => {
  return new Promise((resolve, reject) => {
    const outputDir = path.dirname(audioFilePath);
    const baseName = path.basename(audioFilePath, ".mp3");

    const process = spawn("whisper", [
      audioFilePath,
      "--model", model,
      "--output_format", "json",
      "--output_dir", outputDir,
      "--language", "en",
      "--task", "transcribe",
      "--fp16", "False",
    ]);

    let stderr = "";
    process.stderr.on("data", (data) => {
      stderr += data.toString();
    });

    process.on("close", async (code) => {
      if (code !== 0) {
        reject(new Error(`Whisper failed: ${stderr}`));
        return;
      }

      try {
        const jsonPath = path.join(outputDir, `${baseName}.json`);
        const raw = await fs.readFile(jsonPath, "utf-8");
        const result = JSON.parse(raw) as WhisperResult;
        resolve(result);
      } catch (err) {
        reject(err);
      }
    });
  });
};
```

**Audio extraction from video (FFmpeg):**

```typescript
// utils/ffmpeg.utils.ts
import { spawn } from "child_process";
import path from "path";

export const extractAudio = (
  videoPath: string,
  outputPath: string
): Promise<void> => {
  return new Promise((resolve, reject) => {
    const process = spawn("ffmpeg", [
      "-i", videoPath,
      "-vn",                // No video
      "-acodec", "libmp3lame",
      "-ar", "16000",       // 16kHz — optimal for Whisper
      "-ac", "1",           // Mono
      "-q:a", "9",          // Lowest quality sufficient for transcription
      "-y",                 // Overwrite without asking
      outputPath,
    ]);

    process.on("close", (code) => {
      if (code === 0) resolve();
      else reject(new Error(`FFmpeg exited with code ${code}`));
    });
  });
};
```

**System requirements for Whisper:**

```
Minimum: 8GB RAM, any modern CPU (slow — ~10x realtime)
Recommended: 16GB RAM + NVIDIA GPU with 6GB+ VRAM
Production: GPU strongly recommended
  NVIDIA T4 (AWS g4dn.xlarge): ~2x realtime
  NVIDIA A10G (AWS g5.xlarge): ~8x realtime faster
```

## 8.2 Ollama + Mistral 7B (Quiz Generation)

**Ollama version:** 0.1.x
**Model:** mistral:7b-instruct-v0.2-q4_K_M (quantized)
**Model size:** ~4.1GB

**Why Mistral 7B over alternatives:**


| Model       | Size  | Quiz Quality | Instruction Following | Cost             |
| ----------- | ----- | ------------ | --------------------- | ---------------- |
| Llama 2 7B  | 3.8GB | Good         | Moderate              | Free             |
| Mistral 7B  | 4.1GB | Very Good    | Excellent             | Free             |
| Llama 2 13B | 7.4GB | Very Good    | Good                  | Free             |
| GPT-4 API   | Cloud | Excellent    | Excellent             | $0.03/1k tokens  |
| GPT-3.5 API | Cloud | Good         | Good                  | $0.002/1k tokens |

Mistral 7B Instruct v0.2 outperforms Llama 2 13B on instruction
following benchmarks while requiring less memory. For quiz
generation, instruction following is the critical capability —
the model must reliably output valid JSON in a specific schema.

**Installation:**

```bash
# Install Ollama
curl -fsSL https://ollama.ai/install.sh | sh

# Pull Mistral 7B quantized model
ollama pull mistral:7b-instruct-v0.2-q4_K_M

# Verify running
ollama serve  # Starts on http://localhost:11434
curl http://localhost:11434/api/tags
```

**Ollama HTTP API integration:**

```typescript
// utils/ollama.utils.ts
import axios from "axios";

const OLLAMA_URL = process.env.OLLAMA_URL ?? "http://localhost:11434";
const MODEL = process.env.OLLAMA_MODEL ?? "mistral:7b-instruct-v0.2-q4_K_M";

type OllamaResponse = {
  model: string;
  response: string;
  done: boolean;
};

export const generateWithOllama = async (
  prompt: string,
  maxTokens: number = 2048
): Promise<string> => {
  const response = await axios.post<OllamaResponse>(
    `${OLLAMA_URL}/api/generate`,
    {
      model: MODEL,
      prompt,
      stream: false,
      options: {
        temperature: 0.3,
        top_p: 0.9,
        num_predict: maxTokens,
        stop: ["```", "\n\n\n"],
      },
    },
    { timeout: 120000 } // 2-minute timeout
  );

  return response.data.response;
};
```

**System requirements for Ollama:**

```
Minimum: 8GB RAM (model runs in RAM if no GPU)
Recommended: 16GB RAM + GPU with 6GB+ VRAM

GPU acceleration:
  NVIDIA: CUDA support via Ollama (automatic detection)
  Apple Silicon: Metal support via Ollama (automatic)
  AMD: ROCm support (requires manual setup)

Processing speed without GPU (CPU-only):
  Mistral 7B: ~5-8 tokens/second → ~25-50 min per full generation
  
Processing speed with NVIDIA GPU (6GB VRAM):
  Mistral 7B: ~30-50 tokens/second → ~5-8 min per full generation
```

---

# 9. Live Streaming

## 9.1 Mux

**SDK:** @mux/mux-node 8.x
**Service:** Mux Video (Live Streaming + Asset Storage)

**Why Mux:**


| Provider          | Live Streaming | Recording | Pricing     | SDK Quality |
| ----------------- | -------------- | --------- | ----------- | ----------- |
| Mux               | Yes            | Auto      | Pay-per-use | Excellent   |
| Agora             | Yes            | Manual    | Complex     | Good        |
| AWS IVS           | Yes            | Manual    | Pay-per-use | Good        |
| Twilio Video      | No (meeting)   | Yes       | Per-minute  | Good        |
| Cloudflare Stream | Yes            | Auto      | Pay-per-use | Good        |

Mux is purpose-built for video platforms, has the cleanest
developer experience, automatic recording, and competitive
pricing. Agora is kept as the documented alternative.

**Pricing estimate for Phase One:**

```
Live streaming: $0.015/minute (encoding)
               + $0.005/minute/viewer (delivery)

For a 90-minute session with 45 students:
  Encoding: 90 × $0.015 = $1.35
  Delivery: 90 × 45 × $0.005 = $20.25
  Total per session: ~$21.60

For 6 sessions per batch: ~$130 per batch
```

**Configuration:**

```typescript
// utils/streamingProvider.utils.ts
import Mux from "@mux/mux-node";

const muxClient = new Mux({
  tokenId: process.env.MUX_TOKEN_ID!,
  tokenSecret: process.env.MUX_TOKEN_SECRET!,
});

export const createLiveStream = async (
  sessionId: string,
  title: string
) => {
  const stream = await muxClient.video.liveStreams.create({
    playback_policy: ["public"],
    new_asset_settings: {
      playback_policy: ["public"],
    },
    passthrough: sessionId,
    latency_mode: "reduced",
    reconnect_window: 60,
  });

  return {
    stream_id: stream.id,
    stream_key: stream.stream_key!,
    playback_url: `https://stream.mux.com/${stream.playback_ids![0].id}.m3u8`,
  };
};
```

---

# 10. Real-Time Communication

## 10.1 Socket.io

**Version:** 4.7.x
**Client:** socket.io-client 4.7.x

**Why Socket.io over alternatives:**


| Alternative           | Reason                                            |
| --------------------- | ------------------------------------------------- |
| native WebSocket      | No room abstraction, no auto-reconnect, more code |
| Pusher                | Monthly cost, third-party dependency              |
| Ably                  | Monthly cost, third-party dependency              |
| GraphQL Subscriptions | Overkill for Phase One notification use case      |

Socket.io's room abstraction is exactly what is needed:
each user has a personal room (`user:{userId}`) and each live
session has a session room (`session:{sessionId}`). Events
are emitted to rooms, not individual sockets, which handles
multi-tab browsing transparently.

**Server setup:**

```typescript
// server.ts
import { createServer } from "http";
import { Server } from "socket.io";
import express from "express";

const app = express();
const httpServer = createServer(app);

export const io = new Server(httpServer, {
  cors: {
    origin: process.env.CORS_ORIGIN,
    credentials: true,
  },
  transports: ["websocket", "polling"],
  pingTimeout: 60000,
  pingInterval: 25000,
  connectionStateRecovery: {
    maxDisconnectionDuration: 2 * 60 * 1000,
    skipMiddlewares: true,
  },
});
```

---

# 11. Background Jobs and Queues

## 11.1 Redis

**Version:** 7.2.x
**Usage:** Bull job queue backend and session store

Redis is the sole cache/queue layer. It runs as a separate
process and persists queue data to disk with AOF (Append Only
File) mode enabled.

```bash
# With Docker
docker run --name m2i-redis \
  -p 6379:6379 \
  -v redis_data:/data \
  -d redis:7-alpine \
  redis-server --appendonly yes

# Verify
redis-cli ping  # PONG
```

## 11.2 Bull

**Version:** 4.12.x
**Note:** Bull (v4) not BullMQ (v2). Bull is mature,
widely deployed, and has better documentation for the
use cases in M2i_LMS. BullMQ is a rewrite that is
excellent but Bull is sufficient and more familiar.

**Queue definitions:**

```typescript
// queues/content.queue.ts
import Bull from "bull";

const redisConfig = {
  host: process.env.REDIS_HOST ?? "localhost",
  port: parseInt(process.env.REDIS_PORT ?? "6379"),
};

// Content processing queue:
// EXTRACT_AUDIO → TRANSCRIPTION → QUIZ_GENERATION
export const contentQueue = new Bull("content-processing", {
  redis: redisConfig,
  defaultJobOptions: {
    removeOnComplete: 100,
    removeOnFail: 50,
    attempts: 3,
    backoff: { type: "exponential", delay: 30000 },
  },
});

// Metrics queue: on-demand recalculation after quiz submission
export const metricsQueue = new Bull("metrics-calculation", {
  redis: redisConfig,
  defaultJobOptions: {
    removeOnComplete: 50,
    removeOnFail: 20,
    attempts: 3,
    backoff: { type: "fixed", delay: 5000 },
  },
});

// Session queue: recording fetch, session reminders
export const sessionQueue = new Bull("session-processing", {
  redis: redisConfig,
  defaultJobOptions: {
    removeOnComplete: 100,
    removeOnFail: 20,
  },
});
```

**Job priority levels:**

```
Priority 1 (highest): Transcription complete notification
Priority 2           : Quiz generation
Priority 3           : Metrics recalculation (post-quiz)
Priority 4           : Recording fetch
Priority 5 (lowest)  : Session reminders
```

**Bull Dashboard (development monitoring):**

```bash
npm install bull-board
```

```typescript
// Accessible at http://localhost:3001/admin/queues
// Only in development
import { createBullBoard } from "@bull-board/api";
import { BullAdapter } from "@bull-board/api/bullAdapter";
import { ExpressAdapter } from "@bull-board/express";

if (process.env.NODE_ENV === "development") {
  const serverAdapter = new ExpressAdapter();
  serverAdapter.setBasePath("/admin/queues");

  createBullBoard({
    queues: [
      new BullAdapter(contentQueue),
      new BullAdapter(metricsQueue),
      new BullAdapter(sessionQueue),
    ],
    serverAdapter,
  });

  app.use("/admin/queues", serverAdapter.getRouter());
}
```

---

# 12. Scheduling

## 12.1 node-cron

**Version:** 3.0.x

node-cron runs scheduled jobs inside the Node.js process.
For Phase One, this is simpler than a separate job scheduler
service. The only risk is that scheduled jobs stop if the
server crashes — but the nightly metrics and alert jobs are
idempotent, so they can be re-run manually if needed.

**Job schedule:**

```typescript
// scheduler.ts
import cron from "node-cron";
import { runNightlyMetricsJob }
  from "./jobs/nightlyMetrics.job";
import { runAlertGenerationJob }
  from "./jobs/alertGeneration.job";
import { runBatchStatusTransitionJob }
  from "./jobs/batchStatusTransition.job";
import { runSessionMissedCheckJob }
  from "./jobs/sessionMissedCheck.job";
import { runNotificationCleanupJob }
  from "./jobs/notificationCleanup.job";

export const startScheduler = () => {
  // 2:00 AM daily — metrics calculation
  cron.schedule("0 2 * * *", async () => {
    console.log("[Cron] Nightly metrics job starting");
    await runNightlyMetricsJob();
  });

  // 2:30 AM daily — alert generation (after metrics)
  cron.schedule("30 2 * * *", async () => {
    console.log("[Cron] Alert generation job starting");
    await runAlertGenerationJob();
  });

  // 12:00 AM daily — batch status transitions
  cron.schedule("0 0 * * *", async () => {
    console.log("[Cron] Batch status transition job starting");
    await runBatchStatusTransitionJob();
  });

  // Every 30 minutes — mark missed sessions
  cron.schedule("*/30 * * * *", async () => {
    await runSessionMissedCheckJob();
  });

  // 3:00 AM daily — notification cleanup
  cron.schedule("0 3 * * *", async () => {
    console.log("[Cron] Notification cleanup job starting");
    await runNotificationCleanupJob();
  });

  console.log("[Scheduler] All cron jobs registered");
};
```

---

# 13. Email (Phase Two)

Email notifications are explicitly deferred to Phase Two.
When implemented, the recommended provider is:

**Recommended:** AWS SES (Simple Email Service)

- Cheapest at scale: $0.10 per 1,000 emails
- Native AWS integration (already using S3)
- High deliverability with DKIM/SPF setup
- SDK: @aws-sdk/client-ses v3.x

**Alternative:** SendGrid

- Better developer experience
- Free tier: 100 emails/day
- SDK: @sendgrid/mail

**Phase Two email events to implement:**

- Welcome email on registration
- Session reminder (30 min before)
- Weekly progress digest
- Mentor alert digest
- Password reset link (replacing temporary password)

---

# 14. Monitoring and Observability

## 14.1 Application Logging

**Package:** winston 3.x

```typescript
// utils/logger.ts
import winston from "winston";

export const logger = winston.createLogger({
  level: process.env.LOG_LEVEL ?? "info",
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.errors({ stack: true }),
    process.env.NODE_ENV === "production"
      ? winston.format.json()
      : winston.format.colorize()
  ),
  transports: [
    new winston.transports.Console(),
    new winston.transports.File({
      filename: "logs/error.log",
      level: "error",
      maxsize: 5242880, // 5MB
      maxFiles: 5,
    }),
    new winston.transports.File({
      filename: "logs/combined.log",
      maxsize: 5242880,
      maxFiles: 5,
    }),
  ],
});
```

## 14.2 HTTP Request Logging

**Package:** morgan 1.x

```typescript
import morgan from "morgan";

// Development: colored, verbose output
// Production: JSON structured logging
app.use(
  morgan(
    process.env.NODE_ENV === "production" ? "combined" : "dev"
  )
);
```

## 14.3 Error Tracking

**Phase One:** Console logging + Winston file logs
**Phase Two Recommendation:** Sentry (free tier covers Phase Two needs)

```typescript
// middleware/errorHandler.ts
import { Request, Response, NextFunction } from "express";
import { logger } from "../utils/logger";

export const errorHandler = (
  err: any,
  req: Request,
  res: Response,
  next: NextFunction
) => {
  const statusCode = err.statusCode ?? 500;
  const errorCode = err.code ?? "INTERNAL_SERVER_ERROR";

  logger.error({
    message: err.message,
    code: errorCode,
    statusCode,
    stack: err.stack,
    path: req.path,
    method: req.method,
    userId: (req as any).user?.user_id,
  });

  res.status(statusCode).json({
    success: false,
    error: {
      code: errorCode,
      message:
        statusCode === 500
          ? "An unexpected error occurred"
          : err.message,
    },
    timestamp: new Date().toISOString(),
  });
};
```

## 14.4 Health Checks

Three health endpoints are provided for monitoring systems
and load balancers:

```
GET /api/health        — Basic liveness check (public)
GET /api/health/db     — Database connectivity (admin only)
GET /api/health/queues — Queue job counts (admin only)
```

---

# 15. Development Tooling

## 15.1 Testing

**Unit and Integration Tests:**

```
Framework : Jest 29.x
Runner    : ts-jest (TypeScript support)
Mocking   : jest-mock-extended (Prisma mocking)
Coverage  : Istanbul (built into Jest)
```

```bash
npm install -D jest ts-jest @types/jest jest-mock-extended
```

**jest.config.ts:**

```typescript
export default {
  preset: "ts-jest",
  testEnvironment: "node",
  roots: ["<rootDir>/tests"],
  collectCoverageFrom: [
    "src/**/*.ts",
    "!src/**/*.d.ts",
    "!src/types/**",
  ],
  coverageThreshold: {
    global: {
      branches: 70,
      functions: 70,
      lines: 70,
      statements: 70,
    },
  },
  setupFilesAfterFramework: ["<rootDir>/tests/setup.ts"],
};
```

**Frontend Testing:**

```
Framework   : Vitest + React Testing Library
E2E Testing : Playwright (Phase Two)
```

## 15.2 Code Quality

**ESLint:**

```json
{
  "extends": [
    "eslint:recommended",
    "plugin:@typescript-eslint/recommended",
    "plugin:@typescript-eslint/recommended-requiring-type-checking"
  ],
  "rules": {
    "@typescript-eslint/no-explicit-any": "warn",
    "@typescript-eslint/no-unused-vars": "error",
    "no-console": "warn"
  }
}
```

**Prettier:**

```json
{
  "semi": true,
  "trailingComma": "es5",
  "singleQuote": false,
  "printWidth": 80,
  "tabWidth": 2
}
```

**Husky + lint-staged (pre-commit hooks):**

```json
{
  "lint-staged": {
    "*.ts": ["eslint --fix", "prettier --write"],
    "*.tsx": ["eslint --fix", "prettier --write"]
  }
}
```

## 15.3 Hot Reloading

**Backend:** tsx (replaces ts-node, faster)

```bash
npm install -D tsx
# package.json dev script:
"dev": "tsx watch src/server.ts"
```

**Frontend:** Next.js built-in Fast Refresh (automatic)

## 15.4 Package Management

**Package manager:** npm (not yarn or pnpm)
**Why npm:** Pre-installed with Node.js, team familiarity,
lock file committed to git.

**Lock file policy:** `package-lock.json` is always committed.
`npm ci` is used in CI/CD instead of `npm install` to ensure
reproducible builds.

---

# 16. Infrastructure and Deployment

## 16.1 Phase One Deployment Target

**Backend:** AWS Elastic Beanstalk (Node.js platform)
**Frontend:** Vercel (Next.js hosting, zero config)
**Database:** AWS RDS PostgreSQL 15 (managed)
**Redis:** AWS ElastiCache Redis 7 (managed)
**Files:** AWS S3 + CloudFront (as specified above)
**AI Models:** Separate EC2 instance (GPU-enabled)

## 16.2 EC2 Instance Recommendations

**Backend + Queues:**

```
Type     : t3.medium
vCPUs    : 2
RAM      : 4GB
Storage  : 20GB SSD
Cost     : ~$0.04/hr (~$30/month)
Suitable for: Up to 200 concurrent users
```

**AI Processing (Whisper + Ollama):**

```
Type         : g4dn.xlarge (GPU instance)
vCPUs        : 4
RAM          : 16GB
GPU          : NVIDIA T4 (16GB VRAM)
Storage      : 100GB SSD (for models)
Cost         : ~$0.526/hr (~$380/month)

Alternative — CPU-only (lower cost, slower processing):
Type         : c5.2xlarge
vCPUs        : 8
RAM          : 16GB
Storage      : 50GB SSD
Cost         : ~$0.34/hr (~$245/month)
Processing   : ~10x slower than GPU
```

**RDS PostgreSQL:**

```
Instance : db.t3.medium
RAM      : 4GB
Storage  : 20GB SSD
Cost     : ~$0.048/hr (~$35/month)
```

**ElastiCache Redis:**

```
Instance : cache.t3.micro
RAM      : 0.5GB
Cost     : ~$0.017/hr (~$13/month)
```

**Total Phase One Infrastructure Cost:**

```
Elastic Beanstalk (t3.medium) : ~$30/month
RDS PostgreSQL                : ~$35/month
ElastiCache Redis             : ~$13/month
AI EC2 (g4dn.xlarge)         : ~$380/month
  (or c5.2xlarge CPU-only    :  ~$245/month)
S3 + CloudFront               : ~$5-15/month
Mux live streaming            : ~$130/batch variable
                                ─────────────────
Total (with GPU)             : ~$593/month
Total (CPU-only AI)          : ~$448/month
```

## 16.3 Environment Configuration

**Three environments:**

```
Development : Local machine (docker-compose for Postgres + Redis)
Staging     : AWS (identical to production, smaller instances)
Production  : AWS (full specification above)
```

## 16.4 Docker Configuration

**Backend Dockerfile:**

```dockerfile
FROM node:20-alpine AS base
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production

FROM base AS build
RUN npm ci
COPY . .
RUN npm run build

FROM base AS production
COPY --from=build /app/dist ./dist
COPY --from=build /app/node_modules ./node_modules
COPY prisma ./prisma

EXPOSE 3001
CMD ["node", "dist/server.js"]
```

**Frontend Dockerfile:**

```dockerfile
FROM node:20-alpine AS base
WORKDIR /app
COPY package*.json ./
RUN npm ci

FROM base AS build
COPY . .
RUN npm run build

FROM base AS production
COPY --from=build /app/.next/standalone ./
COPY --from=build /app/.next/static ./.next/static
COPY --from=build /app/public ./public

EXPOSE 3000
CMD ["node", "server.js"]
```

---

# 17. Environment Variables Reference

Complete list of all environment variables required.
Copy `.env.example` and fill in values for each environment.

## 17.1 Backend Environment Variables

```env
# =========================================================
# SERVER
# =========================================================
NODE_ENV=development
PORT=3001
CORS_ORIGIN=http://localhost:3000

# =========================================================
# DATABASE
# =========================================================
DATABASE_URL=postgresql://m2i_user:password@localhost:5432/m2i_lms_dev
DATABASE_POOL_MIN=2
DATABASE_POOL_MAX=10

# =========================================================
# REDIS
# =========================================================
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_PASSWORD=

# =========================================================
# JWT AUTHENTICATION
# =========================================================
# Generate with: openssl rand -base64 64
JWT_SECRET=your_jwt_secret_minimum_32_characters_long
JWT_REFRESH_SECRET=your_refresh_secret_different_from_jwt_secret
JWT_ACCESS_EXPIRY=1h
JWT_REFRESH_EXPIRY=7d

# =========================================================
# AWS
# =========================================================
AWS_REGION=ap-south-1
AWS_ACCESS_KEY_ID=AKIAIOSFODNN7EXAMPLE
AWS_SECRET_ACCESS_KEY=wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY
S3_BUCKET_NAME=m2i-lms-content-dev
CLOUDFRONT_DOMAIN=cdn-dev.m2ilms.com

# =========================================================
# MUX LIVE STREAMING
# =========================================================
MUX_TOKEN_ID=your_mux_token_id
MUX_TOKEN_SECRET=your_mux_token_secret
STREAMING_PROVIDER=MUX

# =========================================================
# AI — OLLAMA
# =========================================================
OLLAMA_URL=http://localhost:11434
OLLAMA_MODEL=mistral:7b-instruct-v0.2-q4_K_M
OLLAMA_TIMEOUT_MS=120000

# =========================================================
# AI — WHISPER
# =========================================================
WHISPER_MODEL=medium
WHISPER_LANGUAGE=en
TEMP_AUDIO_DIR=/tmp/m2i_audio

# =========================================================
# LOGGING
# =========================================================
LOG_LEVEL=debug

# =========================================================
# EMAIL (Phase Two — leave empty for Phase One)
# =========================================================
# SMTP_HOST=
# SMTP_PORT=
# SMTP_USER=
# SMTP_PASS=
# FROM_EMAIL=
```

## 17.2 Frontend Environment Variables

```env
# =========================================================
# NEXT.JS FRONTEND
# =========================================================
NEXT_PUBLIC_API_URL=http://localhost:3001
NEXT_PUBLIC_SOCKET_URL=http://localhost:3001
NEXT_PUBLIC_APP_NAME=M2i LMS
NEXT_PUBLIC_APP_ENV=development
```

## 17.3 Secret Generation Commands

```bash
# Generate JWT_SECRET
openssl rand -base64 64

# Generate JWT_REFRESH_SECRET (different from JWT_SECRET)
openssl rand -base64 64

# Verify they are different
echo "JWT_SECRET: $(openssl rand -base64 64)"
echo "JWT_REFRESH_SECRET: $(openssl rand -base64 64)"
```

---

# 18. Dependency Installation Guide

## 18.1 Backend Installation

```bash
# Create project and install all dependencies
mkdir m2i-lms-backend && cd m2i-lms-backend
npm init -y

# Core framework
npm install express cors helmet cookie-parser morgan compression

# TypeScript
npm install -D typescript ts-node tsx @types/node @types/express \
  @types/cors @types/cookie-parser @types/morgan @types/compression

# Database
npm install prisma @prisma/client
npx prisma init

# Authentication
npm install passport passport-local passport-jwt jsonwebtoken \
  bcryptjs
npm install -D @types/passport @types/passport-local \
  @types/passport-jwt @types/jsonwebtoken @types/bcryptjs

# Validation and security
npm install joi express-rate-limit

# AWS SDK
npm install @aws-sdk/client-s3 @aws-sdk/s3-request-presigner \
  @aws-sdk/client-ses

# Mux (live streaming)
npm install @mux/mux-node

# Socket.io
npm install socket.io

# Background jobs
npm install bull redis
npm install -D @types/bull @types/redis

# Scheduling
npm install node-cron
npm install -D @types/node-cron

# Utilities
npm install uuid axios winston
npm install -D @types/uuid

# Testing
npm install -D jest ts-jest @types/jest jest-mock-extended

# Code quality
npm install -D eslint @typescript-eslint/eslint-plugin \
  @typescript-eslint/parser prettier eslint-config-prettier \
  husky lint-staged

# Development
npm install -D bull-board @bull-board/api @bull-board/express

# Initialize Husky
npx husky install
```

## 18.2 Frontend Installation

```bash
# Create Next.js project
npx create-next-app@latest m2i-lms-frontend \
  --typescript \
  --tailwind \
  --eslint \
  --app \
  --src-dir \
  --import-alias "@/*"

cd m2i-lms-frontend

# HTTP client and real-time
npm install axios socket.io-client

# UI components (shadcn/ui)
npx shadcn-ui@latest init
npx shadcn-ui@latest add button input select dialog \
  dropdown-menu table badge tabs card toast

# Utilities
npm install uuid
npm install -D @types/uuid

# Testing
npm install -D vitest @testing-library/react @testing-library/jest-dom \
  @vitejs/plugin-react jsdom
```

## 18.3 System Dependencies

```bash
# FFmpeg (audio extraction for Whisper)
# Ubuntu/Debian
sudo apt-get update && sudo apt-get install -y ffmpeg

# macOS
brew install ffmpeg

# Verify
ffmpeg -version

# Python + Whisper
python3 --version  # Must be 3.8+
pip3 install openai-whisper torch

# Verify
python3 -c "import whisper; print('Whisper OK')"

# Ollama
curl -fsSL https://ollama.ai/install.sh | sh

# Pull model
ollama pull mistral:7b-instruct-v0.2-q4_K_M

# Verify
ollama list  # Should show mistral:7b-instruct-v0.2-q4_K_M
```

---

# 19. Version Compatibility Matrix

The following versions are tested and known to work together.
Do not upgrade any version without testing the integration.


| Package            | Version  | Compatible With                     |
| ------------------ | -------- | ----------------------------------- |
| node               | 20.x LTS | All packages below                  |
| typescript         | 5.4.x    | ts-jest 29.x, tsx 4.x               |
| express            | 4.18.x   | passport 0.7.x, helmet 7.x          |
| prisma             | 5.12.x   | postgresql 15.x                     |
| @prisma/client     | 5.12.x   | prisma 5.12.x (must match)          |
| socket.io          | 4.7.x    | socket.io-client 4.7.x (must match) |
| bull               | 4.12.x   | redis 7.x, ioredis 5.x              |
| next               | 14.2.x   | react 18.3.x                        |
| react              | 18.3.x   | next 14.2.x                         |
| tailwindcss        | 3.4.x    | next 14.x, postcss 8.x              |
| jest               | 29.x     | ts-jest 29.x                        |
| @aws-sdk/client-s3 | 3.x      | @aws-sdk/s3-request-presigner 3.x   |
| @mux/mux-node      | 8.x      | mux API v1                          |
| jsonwebtoken       | 9.x      | passport-jwt 4.x                    |
| ollama             | 0.1.x    | mistral:7b-instruct-v0.2-q4_K_M     |

**Critical version constraints:**

- `socket.io` server and `socket.io-client` MUST be the same
  major.minor version
- `prisma` and `@prisma/client` MUST be the exact same version
- `bull` v4 is NOT compatible with `bullmq` — do not mix them

---

# 20. Build-vs-Buy Decision Log

Every significant technology choice made during Phase One
architecture planning, with the reasoning captured for
future reference.

## 20.1 Local AI vs. Cloud AI APIs

**Decision:** Local AI (Whisper + Ollama) for both transcription
and quiz generation.

**Considered alternatives:** OpenAI API, AWS Transcribe,
Google Cloud Speech-to-Text, Anthropic Claude API.

**Reasoning:** M2i_LMS generates zero revenue as a free
open-source platform. Any per-token or per-minute API cost
creates a recurring expense that scales with usage and has
no revenue to cover it. Local inference eliminates this
entirely. The trade-offs — slower processing, higher upfront
hardware cost — are acceptable. Processing a 45-minute video
takes 5-8 minutes on a GPU instance vs. 1-2 minutes via API.
Students do not need instant quiz availability. Hardware cost
is one-time vs. ongoing.

**Review trigger:** If GPU instance costs become problematic
or if quiz quality is consistently poor, revisit cloud APIs.
GPT-4 produces noticeably better quiz questions; the cost
may justify a hybrid approach in Phase Two.

## 20.2 Mux vs. Self-Hosted Live Streaming

**Decision:** Mux for live streaming.

**Considered alternatives:** Mediasoup (WebRTC, self-hosted),
Janus (WebRTC), AWS IVS, Agora.

**Reasoning:** Building production-quality live streaming
infrastructure — WebRTC signaling, encoding, CDN delivery,
recording, playback compatibility — is a 3-6 month engineering
project for a dedicated team. With one backend developer and
8 weeks total, this is not feasible. Mux reduces live streaming
to a 1-week integration. The cost (~$130/batch) is real but
manageable compared to the engineering cost of building it.

**Review trigger:** If live streaming costs exceed $500/month
consistently, evaluate self-hosted options at that scale.

## 20.3 PostgreSQL vs. NoSQL

**Decision:** PostgreSQL with Prisma ORM.

**Considered alternatives:** MongoDB, DynamoDB, Supabase.

**Reasoning:** The core data model is highly relational —
students belong to batches, quiz responses belong to quizzes,
which belong to content, which belongs to batches. Foreign key
constraints and JOIN queries are more natural in a relational
database. PostgreSQL's JSONB type handles the flexible metadata
use cases (quiz options, notification metadata) that would
benefit from NoSQL. Prisma provides the ORM ergonomics of
Mongoose with the reliability of PostgreSQL.

## 20.4 Bull vs. BullMQ vs. Celery

**Decision:** Bull v4 for background job processing.

**Considered alternatives:** BullMQ v2 (Bull rewrite), Celery
(Python), AWS SQS + Lambda.

**Reasoning:** Bull v4 is mature, battle-tested, and has
extensive documentation. The entire team knows JavaScript/
TypeScript, so keeping background jobs in the same language
as the rest of the backend reduces context switching. BullMQ
is the superior technical choice but has a shorter track
record and fewer Stack Overflow answers. AWS SQS was rejected
because it adds significant infrastructure complexity for
Phase One. Celery was rejected because adding Python to the
backend stack doubles the operational surface area.

## 20.5 Socket.io vs. Server-Sent Events

**Decision:** Socket.io for real-time notifications and
live session events.

**Considered alternatives:** Server-Sent Events (SSE),
native WebSocket, Pusher.

**Reasoning:** Live sessions need bidirectional communication
(student join/leave events must go both from server to client
AND from client to server). SSE is unidirectional. Native
WebSocket requires more code for rooms, reconnection logic, and
multi-server sync. Socket.io provides all of this out of the
box. Pusher was rejected due to recurring cost.

## 20.6 Next.js vs. Separate SPA

**Decision:** Next.js 14 with App Router for the frontend.

**Considered alternatives:** Create React App, Vite + React,
Vue 3, Angular.

**Reasoning:** Next.js provides routing, SSR, image
optimization, and API routes in a single framework. For an
LMS with many page types (student dashboard, mentor tools,
admin, quiz taking, live streaming), file-based routing
is significantly cleaner than managing a single-page
router configuration. The App Router's server components
reduce client-side JavaScript for content-heavy pages.
Vue and Angular were rejected on team expertise grounds.

---

**End of Tech Stack Sub-Document**

---

**Document Information**


| Field                 | Value                                     |
| --------------------- | ----------------------------------------- |
| Sub-Document Title    | M2i_LMS Tech Stack Sub-Document           |
| Sub-Document Number   | 04 of 05                                  |
| Version               | 1.0                                       |
| Status                | Ready for Development                     |
| Parent Document       | M2i_LMS Master Product Documentation v1.0 |
| Created               | March 2026                                |
| Last Updated          | March 2026                                |
| Previous Sub-Document | M2i_LMS_API_Endpoints.md                  |
| Next Sub-Document     | M2i_LMS_Quiz_Generation_Workflow.md       |
| Maintained By         | Product Team                              |
| Repository            | /docs/sub/M2i_LMS_Tech_Stack.md           |
