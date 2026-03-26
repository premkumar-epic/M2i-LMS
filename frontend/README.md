# M2i LMS — Frontend

Next.js 14 web application for the **Mentorship to Internship & Learning Management System**. Serves three role-based interfaces: Admin, Mentor, and Student.

---

## Tech Stack

| Layer | Technology |
|---|---|
| Framework | Next.js 14 (App Router) |
| Language | TypeScript 5 |
| Styling | Tailwind CSS 3 |
| HTTP Client | Axios (with silent token refresh interceptor) |
| Real-time | Socket.io client |
| Auth | HttpOnly JWT cookies — managed by backend |

---

## Project Structure

```
app/
  layout.tsx                    # Root layout — wraps app with AuthProvider
  page.tsx                      # Root redirect → role dashboard
  (auth)/
    login/page.tsx              # Login page
    register/page.tsx           # Registration page
  admin/
    layout.tsx                  # Admin layout — injects NavHeader
    dashboard/page.tsx          # Admin dashboard
    batches/
      page.tsx                  # Batch list (search + status filter)
      create/page.tsx           # Create batch form
      [batchId]/page.tsx        # Batch detail — students + mentors
      [batchId]/settings/page.tsx  # Batch settings + archive
    users/
      page.tsx                  # User management — list, create, edit, reset PW
  mentor/
    layout.tsx                  # Mentor layout — injects NavHeader
    dashboard/page.tsx          # Mentor dashboard (stub)
  student/
    layout.tsx                  # Student layout — injects NavHeader
    dashboard/page.tsx          # Student dashboard (stub)
  pending-role/page.tsx         # Shown when user has no role assigned yet
  api/
    auth/check-session/route.ts # Server-side token refresh + redirect handler
components/
  NavHeader.tsx                 # Shared nav — brand, bell icon, user info, sign out
  batches/
    BatchCard.tsx               # Batch summary card
    BatchStatusBadge.tsx        # Status pill (DRAFT / ACTIVE / COMPLETED / ARCHIVED)
    CreateBatchForm.tsx         # Batch creation form
    EnrollStudentsModal.tsx     # Bulk student enrollment modal
    AssignMentorsModal.tsx      # Mentor assignment modal
    StudentTable.tsx            # Enrolled students table with withdraw action
context/
  AuthContext.tsx               # Auth state — user, login, logout, register, refreshUser
lib/
  api.ts                        # Axios instance with silent refresh interceptor
  batch.api.ts                  # API client for /api/batches endpoints
  user.api.ts                   # API client for /api/users endpoints
middleware.ts                   # Route protection + role-based redirects
```

---

## Role-Based Routing

| Role | Default Route | Access |
|---|---|---|
| `ADMIN` / `SUPER_ADMIN` | `/admin/dashboard` | `/admin/*` |
| `MENTOR` | `/mentor/dashboard` | `/mentor/*` |
| `STUDENT` | `/student/dashboard` | `/student/*` |
| No role | `/pending-role` | `/pending-role` only |

Route protection is enforced in `middleware.ts` using JWT payload decoded client-side (no network call on every page load). Actual token verification happens on the backend for every API request.

---

## Getting Started

### Prerequisites

- Node.js 20+
- Backend API running on `http://localhost:3001`

### 1. Install dependencies

```bash
npm install
```

### 2. Configure environment

```bash
cp .env.example .env.local
```

Minimum required for local dev:

```env
NEXT_PUBLIC_API_URL=http://localhost:3001
NEXT_PUBLIC_SOCKET_URL=http://localhost:3001
```

### 3. Start dev server

```bash
npm run dev
```

App runs on `http://localhost:3000`.

---

## Pages Overview

### Admin

| Page | Route | Description |
|---|---|---|
| Dashboard | `/admin/dashboard` | Navigation hub with quick links |
| Batch List | `/admin/batches` | All batches with search + status filter |
| Create Batch | `/admin/batches/create` | Batch creation form |
| Batch Detail | `/admin/batches/:id` | Students, mentors, enrollment management |
| Batch Settings | `/admin/batches/:id/settings` | Edit + archive batch |
| User Management | `/admin/users` | Create, edit, reset passwords for all users |

### Auth

| Page | Route | Description |
|---|---|---|
| Login | `/login` | Email + password login |
| Register | `/register` | Self-registration (no role assigned until admin sets it) |
| Pending Role | `/pending-role` | Holding page until admin assigns a role |

---

## Auth Flow

1. User logs in → backend sets `access_token` + `refresh_token` as HttpOnly cookies
2. `AuthContext` calls `GET /api/auth/me` on mount to restore session
3. Axios interceptor catches `401 TOKEN_EXPIRED` → calls `/api/auth/refresh-token` → retries original request
4. `middleware.ts` reads `access_token` cookie on every navigation — decodes JWT role for routing without a network call
5. Expired token on navigation → redirected to `/api/auth/check-session` → server-side refresh → redirect to original page

---

## Scripts

```bash
npm run dev      # Start dev server (localhost:3000)
npm run build    # Production build
npm run start    # Serve production build
npm run lint     # ESLint
npm run format   # Prettier
```

---

## Environment Variables

| Variable | Default | Description |
|---|---|---|
| `NEXT_PUBLIC_API_URL` | `http://localhost:3001` | Backend API base URL |
| `NEXT_PUBLIC_SOCKET_URL` | `http://localhost:3001` | Socket.io server URL |
| `NEXT_PUBLIC_APP_NAME` | `M2i LMS` | App name shown in browser title |
| `NEXT_PUBLIC_APP_ENV` | `development` | Environment indicator |

---

## License

Proprietary — Netpy Technologies. All rights reserved.
