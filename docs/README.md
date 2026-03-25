# M2i_LMS — Mentoring to Internship Learning Management System

M2i_LMS is an AI-powered learning and career development platform designed to bridge the gap between academic education and employment. It integrates structured learning, real-time mentorship, and a sophisticated metrics engine to track and quantify student growth and career readiness.

## Overview

Unlike traditional LMS platforms, M2i_LMS focuses on **longitudinal tracking** of student behavior. Every interaction—from quiz performance and attendance to forum engagement and project commits—is processed to build a comprehensive profile of a student's technical and soft skills.

## 🛠 Tech Stack

- **Backend:** Node.js, Express, TypeScript, Prisma ORM
- **Frontend:** Next.js, TypeScript
- **Database:** PostgreSQL 15+
- **Infrastructure:** AWS S3 (planned for file uploads), GitHub OAuth for project tracking

## Project Structure

- `backend/`: Express server with Prisma integration.
- `frontend/`: Next.js application for students, mentors, and admins.
- `features/`: Detailed documentation for each system module (F01-F10).
- `docs/`: Root-level documentation covering architecture, guides, and planning.

## Key Documentation

- **Core Documentation:**

  - [M2i_LMS Master Product Doc](./M2i_LMS.md) - Full vision and system overview.
  - [Database Schema](./Database_Schema.md) - Tables, relationships, and Prisma definitions.
  - [API Endpoints](./API_Endpoints.md) - Specification of all backend routes.
  - [Tech Stack](./Tech_Stack.md) - Detailed tool and library specifications.
- **Feature Specifications (`features/`):**

  - `F01`: Authentication & Role Management
  - `F02`: Batch Management
  - `F03`: Content Management System
  - `F04`: AI-Powered Quiz Generation
  - `F05`: Mentor Quiz Review
  - `F06`: Live Streaming & Session Management
  - `F07`: Quiz Taking System
  - `F08`: Student Progress Dashboard
  - `F09`: Metrics Engine
  - `F10`: Notifications System
- **Guides & Planning:**

  - [Admin Operations Guide](./Admin_Operations_Guide.md)
  - [Developer Onboarding](./Developer_Onboarding_Guide.md)
  - [Testing & QA Guide](./Testing_And_QA_Guide.md)
  - [Weekly Milestones](./Weekly_Development_Milestones.md)

## Setup & Development

### Backend

1. Navigate to `backend/`
2. Install dependencies: `npm install`
3. Configure `.env` (refer to `.env.example`)
4. Run migrations: `npx prisma migrate dev`
5. Start development server: `npm run dev`

### Frontend

1. Navigate to `frontend/`
2. Install dependencies: `npm install`
3. Start development server: `npm run dev`

---