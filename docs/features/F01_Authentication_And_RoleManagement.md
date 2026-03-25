# Feature 01 — Authentication and Role Management

# Table of Contents

###### 1. [Feature Overview](#1-feature-overview)

2. [Core Functionality](#2-core-functionality)
3. [Data Model](#3-data-model)
4. [API Endpoints](#4-api-endpoints)
5. [Frontend Components](#5-frontend-components)
6. [Backend Logic and Implementation](#6-backend-logic-and-implementation)
7. [Implementation Steps](#7-implementation-steps)
8. [Error Handling](#8-error-handling)
9. [Testing Strategy](#9-testing-strategy)
10. [Security Considerations](#10-security-considerations)
11. [Code Examples](#11-code-examples)
12. [Performance Optimization](#12-performance-optimization)

---

# 1. Feature Overview

## 1.1 What Is This Feature?

Authentication and Role Management is the foundational security layer of
M2i_LMS. It controls who can access the platform, who they are, what
they can do, and how long they stay logged in. Every single other
feature in the platform depends on this feature working correctly. A
security failure here is a security failure for the entire system.

The feature consists of four core subsystems:

**Authentication Subsystem:** Handles registration, login, logout, and
token lifecycle. Verifies that a person is who they claim to be before
granting them access to any platform data.

**Session Management Subsystem:** Handles JWT access tokens and refresh
tokens. Keeps users logged in seamlessly without requiring them to
re-enter credentials every hour while still maintaining short-lived
access windows for security purposes.

**Profile Management Subsystem:** Handles user profile data — name,
avatar, password changes. Separate from authentication itself but
closely related and managed within the same feature boundary.

**Authorization Subsystem:** Enforces role-based permissions on every
single API endpoint. Determines not just whether you are logged in but
whether your specific role permits the specific action you are
attempting to perform on the specific resource you are accessing.

## 1.2 Why This Feature Exists

Educational platforms handle sensitive data — student performance,
personal information, learning profiles, progress metrics. This data
must be protected with robust security. Additionally, different users
need completely different capabilities on the same platform. A student
must not be able to create batches or upload content. A mentor must not
be able to see another batch's student data. An admin must not be able
to bypass audit trails. Role-based access control makes all of this
possible in a clean, maintainable way.

## 1.3 Four Roles in Phase One

**STUDENT:** Enrolled learner. Can access their batch content, take
quizzes, attend live sessions, and view their own progress dashboard.
Cannot create, modify, or delete any platform resources.

**MENTOR:** Content creator and instructor. Can upload content, manage
quizzes for their assigned batches, conduct live sessions, and view
student progress for their batch. Cannot manage users or batches.

**ADMIN:** Platform operator. Can create and manage users, create and
manage batches, enroll students, assign mentors, and view system-wide
analytics. Cannot access Super Admin system configuration.

**SUPER_ADMIN:** Platform owner. Has all Admin capabilities plus access
to system configuration, audit logs, and platform-wide settings.

---

# 2. Core Functionality

## 2.1 Registration Flow

Registration creates a new user account in the system. New registrations
do not have a role assigned by default. An admin must explicitly assign
a role before the user can access any role-specific features. This is a
deliberate design decision — it prevents unauthorized access even if
someone discovers the registration endpoint.

### Complete Registration Sequence

```
User fills registration form (full_name, email, password, 
password_confirmation)
          |
          v
Frontend validates all fields inline as user types
          |
          v
User submits form
          |
          v
Backend receives request
          |
          v
Backend validates all fields again server-side (never trust client)
          |
    ------+------
    |           |
Validation   Validation
fails        passes
    |           |
    v           v
Return      Check if email
400 error   already exists
            |
      ------+------
      |           |
  Email         Email
  exists        not found
      |           |
      v           v
  Return      Hash password
  409 error   with bcrypt
              (10 salt rounds)
                  |
                  v
              Create user record
              (role = null)
                  |
                  v
              Return 201 success
                  |
                  v
              Frontend redirects
              to login page
```

## 2.2 Login Flow

Login authenticates an existing user and issues JWT tokens. The login
process is rate-limited to prevent brute force attacks. Failed attempts
are logged in the database for security auditing.

### Complete Login Sequence

```
User fills login form (email, password)
          |
          v
Frontend validates fields are not empty
          |
          v
Backend receives request
          |
          v
Log login attempt to login_attempts table
          |
          v
Check rate limits:
  - More than 5 failed attempts from this IP in last 1 minute?
  - More than 10 failed attempts on this account in last 15 minutes?
          |
    ------+------
    |           |
Rate limit   Not rate
exceeded     limited
    |           |
    v           v
Return      Look up user
429 error   by email
            |
      ------+------
      |           |
  User not     User found
  found            |
      |            v
      v        Check is_active
  Return       flag
  401 error        |
           --------+--------
           |               |
       is_active        is_active
       = false          = true
           |               |
           v               v
       Return          Compare submitted
       403 error       password with
                       bcrypt hash
                           |
                    -------+-------
                    |             |
                Password       Password
                mismatch       matches
                    |             |
                    v             v
                Increment     Reset
                failed        failed_login
                attempts      attempts to 0
                    |             |
                    v             v
                Return        Update
                401 error     last_login_at
                                  |
                                  v
                              Generate JWT
                              access token
                              (1hr expiry)
                                  |
                                  v
                              Generate refresh
                              token, hash it,
                              store in DB
                              (7 day expiry)
                                  |
                                  v
                              Set HttpOnly
                              cookies
                                  |
                                  v
                              Return 200
                              with user
                              profile
                                  |
                                  v
                              Frontend redirects
                              to role dashboard
```

## 2.3 Token Refresh Flow

JWT access tokens expire after 1 hour. Rather than forcing the user to
log in again every hour, the refresh token system silently obtains a
new access token using the longer-lived refresh token. This entire
process is transparent to the user.

### Complete Token Refresh Sequence

```
User makes any authenticated API request
          |
          v
Backend authenticate middleware reads access token from cookie
          |
          v
Verify JWT signature and expiration
          |
    ------+------
    |           |
Token        Token
expired      valid
    |           |
    v           v
Return      Attach user
401         to request,
            continue
                |
                v
            Normal request
            processing
              
--- Frontend intercepts 401 ---

Frontend receives 401 response
          |
          v
Frontend automatically calls
POST /api/auth/refresh-token
          |
          v
Backend reads refresh token from cookie
          |
          v
Hash the received refresh token
          |
          v
Look up token_hash in refresh_tokens table
          |
    ------+------
    |           |
Not found   Found
    |           |
    v           v
Return      Check expires_at
401         and revoked_at
            |
      ------+------
      |           |
  Expired or   Valid
  revoked         |
      |            v
      v        Generate new
  Return       access token
  401              |
  (force login)    v
              Set new access
              token cookie
                  |
                  v
              Return 200
                  |
                  v
              Frontend retries
              original request
              with new token
```

## 2.4 Logout Flow

Logout invalidates the refresh token in the database so it cannot be
used again even if captured. The access token cookie is also cleared
from the browser.

### Complete Logout Sequence

```
User clicks logout button
          |
          v
Frontend calls POST /api/auth/logout
          |
          v
Backend reads user_id from access token
          |
          v
Delete all refresh tokens for this user
from refresh_tokens table
          |
          v
Return 200 success
          |
          v
Frontend clears access_token cookie
Frontend clears refresh_token cookie
          |
          v
Frontend redirects to login page
```

## 2.5 Role-Based Authorization Flow

Every protected API endpoint runs two middleware functions before
reaching the controller: authenticate and authorize. Authenticate
verifies the token. Authorize verifies the role.

### Authorization Sequence on Every Protected Request

```
Incoming request to protected endpoint
          |
          v
authenticate middleware runs
  - Read access_token from cookie
  - Verify JWT signature
  - Check token expiration
  - Decode user_id and role from payload
  - Attach { user_id, role } to req.user
          |
    ------+------
    |           |
Auth        Auth
failed      passed
    |           |
    v           v
Return      authorize middleware runs
401           - Check if req.user.role
              is in the allowed roles
              for this endpoint
              |
        ------+------
        |           |
    Role not    Role
    permitted   permitted
        |           |
        v           v
    Return      Controller
    403         runs and
                processes
                request
```

---

# 3. Data Model

## 3.1 Users Table

This is the central table for all user accounts in the system. Every
other table that stores user-related data references this table via
foreign keys.

```sql
CREATE TABLE users (
  id              UUID          PRIMARY KEY DEFAULT gen_random_uuid(),
  email           VARCHAR(255)  UNIQUE NOT NULL,
  password_hash   VARCHAR(255)  NOT NULL,
  full_name       VARCHAR(255)  NOT NULL,
  role            VARCHAR(20)   CHECK (
                                  role IN (
                                    'STUDENT',
                                    'MENTOR',
                                    'ADMIN',
                                    'SUPER_ADMIN'
                                  )
                                ) DEFAULT NULL,
  avatar_url      TEXT          DEFAULT NULL,
  is_active       BOOLEAN       NOT NULL DEFAULT TRUE,
  last_login_at   TIMESTAMP     DEFAULT NULL,
  created_at      TIMESTAMP     NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMP     NOT NULL DEFAULT NOW(),
  deleted_at      TIMESTAMP     DEFAULT NULL
);

-- Indexes
CREATE INDEX idx_users_email 
  ON users(email);

CREATE INDEX idx_users_role 
  ON users(role) 
  WHERE deleted_at IS NULL;

CREATE INDEX idx_users_is_active 
  ON users(is_active) 
  WHERE deleted_at IS NULL;
```

### Column Definitions

**id:** UUID primary key. Auto-generated using PostgreSQL's
gen_random_uuid(). UUIDs are used instead of integer sequences to
prevent enumeration attacks — an attacker cannot guess other user IDs
by incrementing a number.

**email:** The user's email address. Used as the login identifier. Must
be unique across all users including soft-deleted users (because the
email could not be re-used if a deleted account had it). Maximum 255
characters matches the email RFC specification.

**password_hash:** The bcrypt hash of the user's password. This field
NEVER contains a plaintext password. The bcrypt algorithm produces a
60-character string. VARCHAR(255) provides comfortable headroom.

**full_name:** The user's display name shown throughout the platform.
Between 2 and 255 characters.

**role:** The user's role determining their permissions. NULL means no
role assigned — this user can log in but cannot access any
role-specific features. The CHECK constraint enforces only valid role
values at the database level as a second line of defense.

**avatar_url:** S3 URL to the user's profile picture. NULL means no
avatar has been uploaded.

**is_active:** FALSE means the account is deactivated. The user cannot
log in. Their data is preserved. This is used instead of deletion to
prevent orphaned foreign key references.

**last_login_at:** Timestamp of the most recent successful login.
Updated on every successful login. Used by admin dashboards to identify
inactive users.

**created_at:** Auto-set to current timestamp on insert. Never updated.

**updated_at:** Auto-set to current timestamp on insert and on every
update. Managed via a PostgreSQL trigger or application layer.

**deleted_at:** NULL means not deleted. A timestamp means soft-deleted.
Soft deletion is used instead of hard deletion to preserve referential
integrity with quiz responses, attendance records, and progress data.

## 3.2 RefreshTokens Table

Stores hashed refresh tokens. Storing the hash rather than the raw token
means that even if this table is compromised, the tokens cannot be used.

```sql
CREATE TABLE refresh_tokens (
  id          UUID          PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID          NOT NULL 
                            REFERENCES users(id) ON DELETE CASCADE,
  token_hash  VARCHAR(255)  NOT NULL UNIQUE,
  expires_at  TIMESTAMP     NOT NULL,
  created_at  TIMESTAMP     NOT NULL DEFAULT NOW(),
  revoked_at  TIMESTAMP     DEFAULT NULL
);

-- Indexes
CREATE INDEX idx_refresh_tokens_user_id 
  ON refresh_tokens(user_id);

CREATE INDEX idx_refresh_tokens_expires_at 
  ON refresh_tokens(expires_at);

CREATE INDEX idx_refresh_tokens_token_hash 
  ON refresh_tokens(token_hash);
```

### Column Definitions

**id:** UUID primary key.

**user_id:** Foreign key to users.id. ON DELETE CASCADE means if a user
is hard-deleted, their refresh tokens are automatically removed. Soft
deletion of users does not trigger this cascade — the token remains but
login is blocked by the is_active check.

**token_hash:** SHA-256 hash of the actual refresh token string. The
raw token is sent to the client in the cookie. The server stores only
the hash. On each refresh request, the server hashes the received token
and compares it against this column.

**expires_at:** Expiration timestamp. Tokens past this timestamp are
invalid even if revoked_at is NULL.

**created_at:** When the token was issued.

**revoked_at:** NULL = active. Timestamp = revoked. Tokens are revoked
when: user logs out, user changes password, admin deactivates account,
security event is detected.

## 3.3 LoginAttempts Table

Stores a log of all login attempts for rate limiting and security
auditing.

```sql
CREATE TABLE login_attempts (
  id            UUID          PRIMARY KEY DEFAULT gen_random_uuid(),
  email         VARCHAR(255)  NOT NULL,
  ip_address    VARCHAR(45)   NOT NULL,
  success       BOOLEAN       NOT NULL,
  attempted_at  TIMESTAMP     NOT NULL DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_login_attempts_email_time 
  ON login_attempts(email, attempted_at DESC);

CREATE INDEX idx_login_attempts_ip_time 
  ON login_attempts(ip_address, attempted_at DESC);
```

### Note on VARCHAR(45)

IPv4 addresses are up to 15 characters. IPv6 addresses are up to 39
characters. VARCHAR(45) covers both formats with headroom.

## 3.4 Prisma Schema

```prisma
generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

model User {
  id            String    @id @default(dbgenerated("gen_random_uuid()")) @db.Uuid
  email         String    @unique @db.VarChar(255)
  passwordHash  String    @map("password_hash") @db.VarChar(255)
  fullName      String    @map("full_name") @db.VarChar(255)
  role          Role?
  avatarUrl     String?   @map("avatar_url")
  isActive      Boolean   @default(true) @map("is_active")
  lastLoginAt   DateTime? @map("last_login_at")
  createdAt     DateTime  @default(now()) @map("created_at")
  updatedAt     DateTime  @updatedAt @map("updated_at")
  deletedAt     DateTime? @map("deleted_at")

  refreshTokens RefreshToken[]
  loginAttempts LoginAttempt[]

  @@map("users")
}

model RefreshToken {
  id         String    @id @default(dbgenerated("gen_random_uuid()")) @db.Uuid
  userId     String    @map("user_id") @db.Uuid
  tokenHash  String    @unique @map("token_hash") @db.VarChar(255)
  expiresAt  DateTime  @map("expires_at")
  createdAt  DateTime  @default(now()) @map("created_at")
  revokedAt  DateTime? @map("revoked_at")

  user User @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@map("refresh_tokens")
}

model LoginAttempt {
  id          String   @id @default(dbgenerated("gen_random_uuid()")) @db.Uuid
  email       String   @db.VarChar(255)
  ipAddress   String   @map("ip_address") @db.VarChar(45)
  success     Boolean
  attemptedAt DateTime @default(now()) @map("attempted_at")

  @@map("login_attempts")
}

enum Role {
  STUDENT
  MENTOR
  ADMIN
  SUPER_ADMIN
}
```

---

# 4. API Endpoints

## 4.1 Complete Endpoint Specifications

### POST /api/auth/register

**Access:** Public

**Request Body:**

```json
{
  "full_name": "Rahul Sharma",
  "email": "rahul@example.com",
  "password": "SecurePass123",
  "password_confirmation": "SecurePass123"
}
```

**Validation Rules:**

```
full_name     : required, string, min 2 chars, max 100 chars
email         : required, valid email format, max 255 chars
password      : required, min 8 chars, must contain:
                  - at least one uppercase letter (A-Z)
                  - at least one lowercase letter (a-z)
                  - at least one digit (0-9)
password_confirmation : required, must match password exactly
```

**Success Response (201 Created):**

```json
{
  "success": true,
  "data": {
    "user_id": "550e8400-e29b-41d4-a716-446655440000",
    "email": "rahul@example.com",
    "full_name": "Rahul Sharma"
  },
  "message": "Account created successfully. Please log in."
}
```

**Error Responses:**

```json
// 400 - Validation error
{
  "success": false,
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Password must be at least 8 characters and contain 
                uppercase, lowercase, and numeric characters",
    "details": { "field": "password" }
  }
}

// 400 - Passwords do not match
{
  "success": false,
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Password confirmation does not match password",
    "details": { "field": "password_confirmation" }
  }
}

// 409 - Email already registered
{
  "success": false,
  "error": {
    "code": "EMAIL_ALREADY_EXISTS",
    "message": "An account with this email address already exists"
  }
}
```

---

### POST /api/auth/login

**Access:** Public

**Request Body:**

```json
{
  "email": "rahul@example.com",
  "password": "SecurePass123"
}
```

**Success Response (200 OK):**

```json
{
  "success": true,
  "data": {
    "user_id": "550e8400-e29b-41d4-a716-446655440000",
    "email": "rahul@example.com",
    "full_name": "Rahul Sharma",
    "role": "STUDENT",
    "avatar_url": null,
    "last_login_at": "2026-03-21T10:30:00Z"
  },
  "message": "Login successful"
}
```

**Response Headers (Cookies Set):**

```
Set-Cookie: access_token=eyJhbGci...; 
            HttpOnly; Secure; SameSite=Strict; 
            Path=/; Max-Age=3600

Set-Cookie: refresh_token=abc123xyz...; 
            HttpOnly; Secure; SameSite=Strict; 
            Path=/api/auth/refresh-token; 
            Max-Age=604800
```

**Note on refresh_token cookie path:** Setting the refresh token cookie
path to /api/auth/refresh-token means the browser only sends this
cookie when calling that specific endpoint. This limits exposure of the
refresh token to only the one endpoint that needs it.

**Error Responses:**

```json
// 401 - Invalid credentials
{
  "success": false,
  "error": {
    "code": "INVALID_CREDENTIALS",
    "message": "Invalid email or password"
  }
}

// 403 - Account deactivated
{
  "success": false,
  "error": {
    "code": "ACCOUNT_DEACTIVATED",
    "message": "This account has been deactivated. 
                Please contact your administrator."
  }
}

// 429 - Rate limited
{
  "success": false,
  "error": {
    "code": "RATE_LIMIT_EXCEEDED",
    "message": "Too many login attempts. 
                Please try again in 15 minutes.",
    "details": {
      "retry_after_seconds": 900
    }
  }
}
```

---

### POST /api/auth/logout

**Access:** Authenticated (any role)

**Request:** No body required. Access token sent via cookie automatically.

**Success Response (200 OK):**

```json
{
  "success": true,
  "message": "Logged out successfully"
}
```

**Response Headers (Cookies Cleared):**

```
Set-Cookie: access_token=; Max-Age=0; Path=/
Set-Cookie: refresh_token=; Max-Age=0; 
            Path=/api/auth/refresh-token
```

---

### POST /api/auth/refresh-token

**Access:** Requires valid refresh token cookie

**Request:** No body. Refresh token sent via cookie automatically.

**Success Response (200 OK):**

```json
{
  "success": true,
  "data": {
    "user_id": "550e8400-e29b-41d4-a716-446655440000"
  },
  "message": "Token refreshed successfully"
}
```

**Response Headers (New Access Token Set):**

```
Set-Cookie: access_token=eyJhbGci...; 
            HttpOnly; Secure; SameSite=Strict; 
            Path=/; Max-Age=3600
```

**Error Response:**

```json
// 401 - Invalid or expired refresh token
{
  "success": false,
  "error": {
    "code": "INVALID_REFRESH_TOKEN",
    "message": "Session expired. Please log in again."
  }
}
```

---

### GET /api/auth/me

**Access:** Authenticated (any role)

**Success Response (200 OK):**

```json
{
  "success": true,
  "data": {
    "user_id": "550e8400-e29b-41d4-a716-446655440000",
    "email": "rahul@example.com",
    "full_name": "Rahul Sharma",
    "role": "STUDENT",
    "avatar_url": "https://s3.amazonaws.com/m2ilms/avatars/550e8400.jpg",
    "last_login_at": "2026-03-21T10:30:00Z",
    "created_at": "2026-01-15T08:00:00Z"
  }
}
```

---

### PUT /api/auth/me

**Access:** Authenticated (any role)

**Request Body (all fields optional):**

```json
{
  "full_name": "Rahul Kumar Sharma",
  "avatar_url": "https://s3.amazonaws.com/m2ilms/avatars/new.jpg"
}
```

**Success Response (200 OK):**

```json
{
  "success": true,
  "data": {
    "user_id": "550e8400-e29b-41d4-a716-446655440000",
    "full_name": "Rahul Kumar Sharma",
    "avatar_url": "https://s3.amazonaws.com/m2ilms/avatars/new.jpg"
  },
  "message": "Profile updated successfully"
}
```

---

### POST /api/auth/change-password

**Access:** Authenticated (any role)

**Request Body:**

```json
{
  "current_password": "SecurePass123",
  "new_password": "NewSecurePass456",
  "new_password_confirmation": "NewSecurePass456"
}
```

**Success Response (200 OK):**

```json
{
  "success": true,
  "message": "Password changed successfully. 
              Please log in again with your new password."
}
```

**Behavior on Success:** All refresh tokens for this user are
immediately revoked. The user is effectively logged out of all sessions.
They must log in again with the new password.

**Error Responses:**

```json
// 401 - Current password is wrong
{
  "success": false,
  "error": {
    "code": "INVALID_CURRENT_PASSWORD",
    "message": "Current password is incorrect"
  }
}

// 400 - New password does not meet requirements
{
  "success": false,
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "New password must be at least 8 characters and 
                contain uppercase, lowercase, and numeric characters",
    "details": { "field": "new_password" }
  }
}
```

---

### POST /api/users (Admin)

**Access:** ADMIN, SUPER_ADMIN only

**Purpose:** Admin creates a new user account and assigns their role.

**Request Body:**

```json
{
  "full_name": "Priya Patel",
  "email": "priya@example.com",
  "role": "STUDENT"
}
```

**Behavior:** System generates a temporary password. Admin receives the
temporary password in the response to share with the new user. User must
change their password on first login.

**Success Response (201 Created):**

```json
{
  "success": true,
  "data": {
    "user_id": "660e9500-f30c-52e5-b827-557766551111",
    "email": "priya@example.com",
    "full_name": "Priya Patel",
    "role": "STUDENT",
    "temporary_password": "TempPass789"
  },
  "message": "User created. Share the temporary password with the user."
}
```

---

### GET /api/users (Admin)

**Access:** ADMIN, SUPER_ADMIN only

**Query Parameters:**

```
role        : filter by role (STUDENT, MENTOR, ADMIN, SUPER_ADMIN)
is_active   : filter by active status (true, false)
search      : search by name or email
page        : page number for pagination (default: 1)
limit       : results per page (default: 20, max: 100)
```

**Example Request:**

```
GET /api/users?role=STUDENT&is_active=true&search=rahul&page=1&limit=20
```

**Success Response (200 OK):**

```json
{
  "success": true,
  "data": {
    "users": [
      {
        "user_id": "550e8400-e29b-41d4-a716-446655440000",
        "email": "rahul@example.com",
        "full_name": "Rahul Sharma",
        "role": "STUDENT",
        "is_active": true,
        "last_login_at": "2026-03-21T10:30:00Z",
        "created_at": "2026-01-15T08:00:00Z"
      }
    ]
  },
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 45,
    "total_pages": 3
  }
}
```

---

### PUT /api/users/:userId (Admin)

**Access:** ADMIN, SUPER_ADMIN only

**Request Body (all fields optional):**

```json
{
  "full_name": "Rahul Kumar",
  "role": "MENTOR",
  "is_active": false
}
```

**Success Response (200 OK):**

```json
{
  "success": true,
  "data": {
    "user_id": "550e8400-e29b-41d4-a716-446655440000",
    "full_name": "Rahul Kumar",
    "role": "MENTOR",
    "is_active": false
  },
  "message": "User updated successfully"
}
```

**Behavior when is_active is set to false:** All refresh tokens for
this user are immediately revoked. User is logged out of all active
sessions.

---

### POST /api/users/:userId/reset-password (Admin)

**Access:** ADMIN, SUPER_ADMIN only

**Request:** No body required.

**Success Response (200 OK):**

```json
{
  "success": true,
  "data": {
    "temporary_password": "ResetPass123"
  },
  "message": "Password reset successfully. 
              Share the temporary password with the user."
}
```

---

# 5. Frontend Components

## 5.1 Component Structure

```
src/
├── app/
│   ├── (auth)/
│   │   ├── login/
│   │   │   └── page.tsx
│   │   ├── register/
│   │   │   └── page.tsx
│   │   └── layout.tsx         (auth layout - no nav header)
│   └── (dashboard)/
│       ├── layout.tsx          (dashboard layout - with nav header)
│       ├── student/
│       │   └── dashboard/page.tsx
│       ├── mentor/
│       │   └── dashboard/page.tsx
│       └── admin/
│           └── dashboard/page.tsx
├── components/
│   ├── auth/
│   │   ├── LoginForm.tsx
│   │   ├── RegisterForm.tsx
│   │   ├── ChangePasswordForm.tsx
│   │   └── ProfileEditForm.tsx
│   └── layout/
│       ├── NavHeader.tsx
│       ├── NotificationBell.tsx
│       └── UserMenu.tsx
├── hooks/
│   ├── useAuth.ts
│   └── useCurrentUser.ts
├── lib/
│   ├── api.ts                  (axios instance with interceptors)
│   └── auth.ts                 (auth helper functions)
└── middleware.ts               (Next.js route protection)
```

## 5.2 LoginForm Component

### What It Does

Renders the login form, validates inputs, submits to the API, handles
errors, and redirects on success.

### States to Handle

- **Idle:** Empty form waiting for input
- **Typing:** User is entering credentials, inline validation active
- **Submitting:** Form submitted, waiting for API response, button
  disabled with loading spinner
- **Error:** API returned error, error message displayed
- **Success:** Login successful, redirecting to dashboard

### Component Implementation

```tsx
// components/auth/LoginForm.tsx
"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";

type LoginFormData = {
  email: string;
  password: string;
};

export default function LoginForm() {
  const router = useRouter();
  const [serverError, setServerError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginFormData>();

  const onSubmit = async (data: LoginFormData) => {
    setServerError(null);
    setIsSubmitting(true);

    try {
      const response = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
        credentials: "include",
      });

      const result = await response.json();

      if (!response.ok) {
        // Handle specific error codes
        if (result.error.code === "RATE_LIMIT_EXCEEDED") {
          setServerError(
            "Too many login attempts. Please try again in 15 minutes."
          );
        } else if (result.error.code === "ACCOUNT_DEACTIVATED") {
          setServerError(
            "Your account has been deactivated. Contact your administrator."
          );
        } else {
          setServerError("Invalid email or password. Please try again.");
        }
        return;
      }

      // Redirect based on role
      const role = result.data.role;
      const redirectMap: Record<string, string> = {
        STUDENT: "/student/dashboard",
        MENTOR: "/mentor/dashboard",
        ADMIN: "/admin/dashboard",
        SUPER_ADMIN: "/admin/dashboard",
      };

      router.push(redirectMap[role] ?? "/dashboard");
    } catch (error) {
      setServerError("Something went wrong. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} noValidate>
      <div>
        <label htmlFor="email">Email Address</label>
        <input
          id="email"
          type="email"
          {...register("email", {
            required: "Email is required",
            pattern: {
              value: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
              message: "Please enter a valid email address",
            },
          })}
          aria-invalid={!!errors.email}
        />
        {errors.email && (
          <span role="alert">{errors.email.message}</span>
        )}
      </div>

      <div>
        <label htmlFor="password">Password</label>
        <input
          id="password"
          type="password"
          {...register("password", {
            required: "Password is required",
          })}
          aria-invalid={!!errors.password}
        />
        {errors.password && (
          <span role="alert">{errors.password.message}</span>
        )}
      </div>

      {serverError && (
        <div role="alert" aria-live="polite">
          {serverError}
        </div>
      )}

      <button type="submit" disabled={isSubmitting}>
        {isSubmitting ? "Signing in..." : "Sign In"}
      </button>
    </form>
  );
}
```

## 5.3 API Client with Auto Refresh Interceptor

### What It Does

Creates an Axios instance that automatically intercepts 401 responses,
attempts token refresh, and retries the original request. This makes
token refresh completely transparent to all other parts of the
application.

```typescript
// lib/api.ts
import axios, { AxiosInstance, AxiosError } from "axios";

const api: AxiosInstance = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL,
  withCredentials: true,          // Always send cookies
  headers: {
    "Content-Type": "application/json",
  },
});

let isRefreshing = false;
let failedQueue: Array<{
  resolve: (value: unknown) => void;
  reject: (reason?: unknown) => void;
}> = [];

// Process the queue of failed requests after token refresh
const processQueue = (error: AxiosError | null) => {
  failedQueue.forEach((promise) => {
    if (error) {
      promise.reject(error);
    } else {
      promise.resolve(undefined);
    }
  });
  failedQueue = [];
};

// Response interceptor to handle 401 errors
api.interceptors.response.use(
  (response) => response,
  async (error: AxiosError) => {
    const originalRequest = error.config as typeof error.config & {
      _retry?: boolean;
    };

    // If 401 and not already retrying and not the refresh endpoint itself
    if (
      error.response?.status === 401 &&
      !originalRequest._retry &&
      originalRequest.url !== "/api/auth/refresh-token"
    ) {
      if (isRefreshing) {
        // If already refreshing, queue this request
        return new Promise((resolve, reject) => {
          failedQueue.push({ resolve, reject });
        }).then(() => api(originalRequest));
      }

      originalRequest._retry = true;
      isRefreshing = true;

      try {
        await api.post("/api/auth/refresh-token");
        processQueue(null);
        return api(originalRequest);
      } catch (refreshError) {
        processQueue(refreshError as AxiosError);
        // Redirect to login if refresh fails
        window.location.href = "/login?reason=session_expired";
        return Promise.reject(refreshError);
      } finally {
        isRefreshing = false;
      }
    }

    return Promise.reject(error);
  }
);

export default api;
```

## 5.4 Route Protection Middleware

### What It Does

Next.js middleware that runs on every request. Checks if the user is
authenticated and redirects unauthenticated users to login. Also checks
if the user is trying to access a route they do not have permission for
and redirects them to the correct dashboard.

```typescript
// middleware.ts (root of Next.js project)
import { NextRequest, NextResponse } from "next/server";
import { jwtVerify } from "jose";

const PUBLIC_ROUTES = ["/login", "/register", "/forgot-password"];

const ROLE_ROUTES: Record<string, string[]> = {
  STUDENT: ["/student"],
  MENTOR: ["/mentor"],
  ADMIN: ["/admin"],
  SUPER_ADMIN: ["/admin"],
};

const ROLE_DEFAULT_ROUTES: Record<string, string> = {
  STUDENT: "/student/dashboard",
  MENTOR: "/mentor/dashboard",
  ADMIN: "/admin/dashboard",
  SUPER_ADMIN: "/admin/dashboard",
};

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Allow public routes
  if (PUBLIC_ROUTES.some((route) => pathname.startsWith(route))) {
    return NextResponse.next();
  }

  // Allow API routes (they handle their own auth)
  if (pathname.startsWith("/api")) {
    return NextResponse.next();
  }

  // Get access token from cookie
  const accessToken = request.cookies.get("access_token")?.value;

  if (!accessToken) {
    return NextResponse.redirect(
      new URL(`/login?redirect=${pathname}`, request.url)
    );
  }

  try {
    // Verify token and extract role
    const secret = new TextEncoder().encode(process.env.JWT_SECRET);
    const { payload } = await jwtVerify(accessToken, secret);
    const role = payload.role as string;

    // Check if user is trying to access a route for a different role
    for (const [routeRole, routes] of Object.entries(ROLE_ROUTES)) {
      if (routes.some((route) => pathname.startsWith(route))) {
        if (role !== routeRole && !(role === "SUPER_ADMIN" && routeRole === "ADMIN")) {
          // Redirect to their own dashboard
          return NextResponse.redirect(
            new URL(ROLE_DEFAULT_ROUTES[role] ?? "/login", request.url)
          );
        }
      }
    }

    return NextResponse.next();
  } catch (error) {
    // Token is invalid or expired, redirect to login
    return NextResponse.redirect(
      new URL(`/login?redirect=${pathname}`, request.url)
    );
  }
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
```

---

# 6. Backend Logic and Implementation

## 6.1 Directory Structure

```
src/
├── controllers/
│   ├── auth.controller.ts
│   └── users.controller.ts
├── middleware/
│   ├── authenticate.middleware.ts
│   ├── authorize.middleware.ts
│   ├── rateLimiter.middleware.ts
│   └── validate.middleware.ts
├── services/
│   ├── auth.service.ts
│   └── users.service.ts
├── utils/
│   ├── jwt.utils.ts
│   ├── password.utils.ts
│   └── token.utils.ts
├── validators/
│   ├── auth.validator.ts
│   └── users.validator.ts
└── routes/
    ├── auth.routes.ts
    └── users.routes.ts
```

## 6.2 Authentication Middleware

### authenticate.middleware.ts

This middleware runs on every protected route. It reads the access token
from the cookie, verifies it, and attaches the decoded user to
req.user.

```typescript
// middleware/authenticate.middleware.ts
import { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";

export interface AuthenticatedRequest extends Request {
  user?: {
    user_id: string;
    role: string;
    email: string;
  };
}

export const authenticate = (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    // Read token from cookie
    const token = req.cookies.access_token;

    if (!token) {
      return res.status(401).json({
        success: false,
        error: {
          code: "AUTHENTICATION_REQUIRED",
          message: "Authentication required",
        },
      });
    }

    // Verify token
    const decoded = jwt.verify(token, process.env.JWT_SECRET!) as {
      user_id: string;
      role: string;
      email: string;
      iat: number;
      exp: number;
    };

    // Attach user to request
    req.user = {
      user_id: decoded.user_id,
      role: decoded.role,
      email: decoded.email,
    };

    next();
  } catch (error) {
    if (error instanceof jwt.TokenExpiredError) {
      return res.status(401).json({
        success: false,
        error: {
          code: "TOKEN_EXPIRED",
          message: "Access token has expired",
        },
      });
    }

    return res.status(401).json({
      success: false,
      error: {
        code: "INVALID_TOKEN",
        message: "Invalid authentication token",
      },
    });
  }
};
```

### authorize.middleware.ts

This middleware runs after authenticate. It checks whether the
authenticated user's role is in the list of permitted roles for the
endpoint.

```typescript
// middleware/authorize.middleware.ts
import { Response, NextFunction } from "express";
import { AuthenticatedRequest } from "./authenticate.middleware";

export const authorize = (allowedRoles: string[]) => {
  return (
    req: AuthenticatedRequest,
    res: Response,
    next: NextFunction
  ) => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        error: {
          code: "AUTHENTICATION_REQUIRED",
          message: "Authentication required",
        },
      });
    }

    if (!allowedRoles.includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        error: {
          code: "PERMISSION_DENIED",
          message: "You do not have permission to perform this action",
          details: {
            required_roles: allowedRoles,
            your_role: req.user.role,
          },
        },
      });
    }

    next();
  };
};
```

## 6.3 Auth Service

### auth.service.ts

Contains all the business logic for authentication. Controllers are thin
and delegate to this service.

```typescript
// services/auth.service.ts
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import crypto from "crypto";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

export class AuthService {

  // -------------------------------------------------------
  // REGISTER
  // -------------------------------------------------------
  async register(data: {
    full_name: string;
    email: string;
    password: string;
  }) {
    // Check if email already exists
    const existingUser = await prisma.user.findUnique({
      where: { email: data.email.toLowerCase() },
    });

    if (existingUser) {
      throw { code: "EMAIL_ALREADY_EXISTS", statusCode: 409 };
    }

    // Hash password
    const passwordHash = await bcrypt.hash(data.password, 10);

    // Create user
    const user = await prisma.user.create({
      data: {
        email: data.email.toLowerCase(),
        passwordHash,
        fullName: data.full_name,
        role: null,
      },
    });

    return {
      user_id: user.id,
      email: user.email,
      full_name: user.fullName,
    };
  }

  // -------------------------------------------------------
  // LOGIN
  // -------------------------------------------------------
  async login(
    email: string,
    password: string,
    ipAddress: string
  ) {
    // Log attempt
    await this.logLoginAttempt(email, ipAddress, false);

    // Find user
    const user = await prisma.user.findUnique({
      where: { email: email.toLowerCase() },
    });

    // Generic error for missing user (do not reveal whether
    // user exists)
    if (!user || user.deletedAt) {
      throw { code: "INVALID_CREDENTIALS", statusCode: 401 };
    }

    // Check if active
    if (!user.isActive) {
      throw { code: "ACCOUNT_DEACTIVATED", statusCode: 403 };
    }

    // Verify password
    const passwordMatch = await bcrypt.compare(password, user.passwordHash);
    if (!passwordMatch) {
      throw { code: "INVALID_CREDENTIALS", statusCode: 401 };
    }

    // Update login attempt to success
    await this.logLoginAttempt(email, ipAddress, true);

    // Update last_login_at
    await prisma.user.update({
      where: { id: user.id },
      data: { lastLoginAt: new Date() },
    });

    // Generate tokens
    const accessToken = this.generateAccessToken(user);
    const { rawToken, hashedToken } = this.generateRefreshToken();

    // Store refresh token
    await prisma.refreshToken.create({
      data: {
        userId: user.id,
        tokenHash: hashedToken,
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      },
    });

    return {
      user: {
        user_id: user.id,
        email: user.email,
        full_name: user.fullName,
        role: user.role,
        avatar_url: user.avatarUrl,
        last_login_at: user.lastLoginAt,
      },
      accessToken,
      refreshToken: rawToken,
    };
  }

  // -------------------------------------------------------
  // REFRESH TOKEN
  // -------------------------------------------------------
  async refreshToken(rawRefreshToken: string) {
    // Hash received token to compare with stored hash
    const hashedToken = this.hashToken(rawRefreshToken);

    // Find token in database
    const storedToken = await prisma.refreshToken.findUnique({
      where: { tokenHash: hashedToken },
      include: { user: true },
    });

    if (!storedToken) {
      throw { code: "INVALID_REFRESH_TOKEN", statusCode: 401 };
    }

    // Check not revoked
    if (storedToken.revokedAt) {
      throw { code: "INVALID_REFRESH_TOKEN", statusCode: 401 };
    }

    // Check not expired
    if (storedToken.expiresAt < new Date()) {
      throw { code: "INVALID_REFRESH_TOKEN", statusCode: 401 };
    }

    // Check user is still active
    if (!storedToken.user.isActive) {
      throw { code: "ACCOUNT_DEACTIVATED", statusCode: 403 };
    }

    // Generate new access token
    const accessToken = this.generateAccessToken(storedToken.user);

    return {
      user_id: storedToken.user.id,
      accessToken,
    };
  }

  // -------------------------------------------------------
  // LOGOUT
  // -------------------------------------------------------
  async logout(userId: string) {
    // Revoke all refresh tokens for this user
    await prisma.refreshToken.updateMany({
      where: {
        userId,
        revokedAt: null,
      },
      data: {
        revokedAt: new Date(),
      },
    });
  }

  // -------------------------------------------------------
  // CHANGE PASSWORD
  // -------------------------------------------------------
  async changePassword(
    userId: string,
    currentPassword: string,
    newPassword: string
  ) {
    const user = await prisma.user.findUnique({ where: { id: userId } });

    if (!user) {
      throw { code: "USER_NOT_FOUND", statusCode: 404 };
    }

    // Verify current password
    const match = await bcrypt.compare(currentPassword, user.passwordHash);
    if (!match) {
      throw { code: "INVALID_CURRENT_PASSWORD", statusCode: 401 };
    }

    // Hash new password
    const newHash = await bcrypt.hash(newPassword, 10);

    // Update password
    await prisma.user.update({
      where: { id: userId },
      data: { passwordHash: newHash },
    });

    // Revoke all refresh tokens (force re-login everywhere)
    await prisma.refreshToken.updateMany({
      where: { userId, revokedAt: null },
      data: { revokedAt: new Date() },
    });
  }

  // -------------------------------------------------------
  // PRIVATE HELPERS
  // -------------------------------------------------------

  private generateAccessToken(user: {
    id: string;
    email: string;
    role: string | null;
  }) {
    return jwt.sign(
      {
        user_id: user.id,
        email: user.email,
        role: user.role,
      },
      process.env.JWT_SECRET!,
      { expiresIn: "1h" }
    );
  }

  private generateRefreshToken() {
    const rawToken = crypto.randomBytes(64).toString("hex");
    const hashedToken = this.hashToken(rawToken);
    return { rawToken, hashedToken };
  }

  private hashToken(token: string) {
    return crypto.createHash("sha256").update(token).digest("hex");
  }

  private async logLoginAttempt(
    email: string,
    ipAddress: string,
    success: boolean
  ) {
    await prisma.loginAttempt.create({
      data: { email, ipAddress, success },
    });
  }
}
```

## 6.4 Rate Limiting Middleware

```typescript
// middleware/rateLimiter.middleware.ts
import { Request, Response, NextFunction } from "express";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

export const loginRateLimiter = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  const ipAddress = req.ip;
  const email = req.body.email?.toLowerCase();
  const oneMinuteAgo = new Date(Date.now() - 60 * 1000);
  const fifteenMinutesAgo = new Date(Date.now() - 15 * 60 * 1000);

  // Check IP-based rate limit (5 failed attempts per minute per IP)
  const ipAttempts = await prisma.loginAttempt.count({
    where: {
      ipAddress,
      success: false,
      attemptedAt: { gte: oneMinuteAgo },
    },
  });

  if (ipAttempts >= 5) {
    return res.status(429).json({
      success: false,
      error: {
        code: "RATE_LIMIT_EXCEEDED",
        message: "Too many login attempts. Please try again in a minute.",
        details: { retry_after_seconds: 60 },
      },
    });
  }

  // Check account-based rate limit (10 failed attempts 
  // per 15 minutes per account)
  if (email) {
    const accountAttempts = await prisma.loginAttempt.count({
      where: {
        email,
        success: false,
        attemptedAt: { gte: fifteenMinutesAgo },
      },
    });

    if (accountAttempts >= 10) {
      return res.status(429).json({
        success: false,
        error: {
          code: "RATE_LIMIT_EXCEEDED",
          message:
            "Account temporarily locked due to too many failed attempts. " +
            "Please try again in 15 minutes.",
          details: { retry_after_seconds: 900 },
        },
      });
    }
  }

  next();
};
```

## 6.5 Auth Routes

```typescript
// routes/auth.routes.ts
import { Router } from "express";
import { AuthController } from "../controllers/auth.controller";
import { authenticate } from "../middleware/authenticate.middleware";
import { loginRateLimiter } from "../middleware/rateLimiter.middleware";
import { validate } from "../middleware/validate.middleware";
import {
  registerSchema,
  loginSchema,
  changePasswordSchema,
  updateProfileSchema,
} from "../validators/auth.validator";

const router = Router();
const controller = new AuthController();

// Public routes
router.post(
  "/register",
  validate(registerSchema),
  controller.register
);

router.post(
  "/login",
  loginRateLimiter,
  validate(loginSchema),
  controller.login
);

router.post(
  "/refresh-token",
  controller.refreshToken
);

// Protected routes
router.post(
  "/logout",
  authenticate,
  controller.logout
);

router.get(
  "/me",
  authenticate,
  controller.getMe
);

router.put(
  "/me",
  authenticate,
  validate(updateProfileSchema),
  controller.updateMe
);

router.post(
  "/change-password",
  authenticate,
  validate(changePasswordSchema),
  controller.changePassword
);

export default router;
```

## 6.6 Input Validation Schemas

```typescript
// validators/auth.validator.ts
import Joi from "joi";

export const registerSchema = Joi.object({
  full_name: Joi.string().min(2).max(100).required().messages({
    "string.min": "Full name must be at least 2 characters",
    "string.max": "Full name cannot exceed 100 characters",
    "any.required": "Full name is required",
  }),
  email: Joi.string().email().max(255).required().messages({
    "string.email": "Please provide a valid email address",
    "any.required": "Email is required",
  }),
  password: Joi.string()
    .min(8)
    .pattern(/[A-Z]/, "uppercase")
    .pattern(/[a-z]/, "lowercase")
    .pattern(/[0-9]/, "digit")
    .required()
    .messages({
      "string.min": "Password must be at least 8 characters",
      "string.pattern.name":
        "Password must contain uppercase, lowercase, and numeric characters",
      "any.required": "Password is required",
    }),
  password_confirmation: Joi.string()
    .valid(Joi.ref("password"))
    .required()
    .messages({
      "any.only": "Password confirmation must match password",
      "any.required": "Password confirmation is required",
    }),
});

export const loginSchema = Joi.object({
  email: Joi.string().email().required().messages({
    "string.email": "Please provide a valid email address",
    "any.required": "Email is required",
  }),
  password: Joi.string().required().messages({
    "any.required": "Password is required",
  }),
});

export const changePasswordSchema = Joi.object({
  current_password: Joi.string().required().messages({
    "any.required": "Current password is required",
  }),
  new_password: Joi.string()
    .min(8)
    .pattern(/[A-Z]/, "uppercase")
    .pattern(/[a-z]/, "lowercase")
    .pattern(/[0-9]/, "digit")
    .required()
    .messages({
      "string.min": "New password must be at least 8 characters",
      "string.pattern.name":
        "New password must contain uppercase, lowercase, and numeric characters",
      "any.required": "New password is required",
    }),
  new_password_confirmation: Joi.string()
    .valid(Joi.ref("new_password"))
    .required()
    .messages({
      "any.only": "Password confirmation must match new password",
      "any.required": "Password confirmation is required",
    }),
});

export const updateProfileSchema = Joi.object({
  full_name: Joi.string().min(2).max(100).optional(),
  avatar_url: Joi.string().uri().optional().allow(null),
});
```

---

# 7. Implementation Steps

## 7.1 Step-by-Step Build Order

Follow this exact order. Each step builds on the previous one. Do not
skip ahead.

### Step 1 — Set Up Project Foundation (Day 1)

```bash
# Initialize Node.js project
mkdir m2i-lms-backend
cd m2i-lms-backend
npm init -y

# Install core dependencies
npm install express cors cookie-parser helmet morgan dotenv
npm install @prisma/client prisma
npm install jsonwebtoken bcryptjs joi
npm install socket.io

# Install dev dependencies
npm install -D typescript ts-node nodemon
npm install -D @types/express @types/cors @types/cookie-parser
npm install -D @types/jsonwebtoken @types/bcryptjs
npm install -D @types/node eslint prettier

# Initialize TypeScript
npx tsc --init

# Initialize Prisma
npx prisma init
```

### Step 2 — Configure Environment Variables (Day 1)

Create `.env` file:

```env
DATABASE_URL="postgresql://postgres:password@localhost:5432/m2i_lms"
JWT_SECRET="your-256-bit-secret-key-minimum-32-characters-long"
NODE_ENV="development"
PORT=3001
CORS_ORIGIN="http://localhost:3000"
```

Create `.env.example` for team sharing (no actual secrets):

```env
DATABASE_URL="postgresql://USER:PASSWORD@HOST:PORT/DATABASE"
JWT_SECRET="generate-a-strong-random-string-here"
NODE_ENV="development"
PORT=3001
CORS_ORIGIN="http://localhost:3000"
```

### Step 3 — Define Prisma Schema (Day 1)

Copy the Prisma schema from section 3.4 into `prisma/schema.prisma`.

Run migrations:

```bash
npx prisma migrate dev --name init_auth_tables
npx prisma generate
```

### Step 4 — Set Up Express Server (Day 1)

```typescript
// src/server.ts
import express from "express";
import cors from "cors";
import cookieParser from "cookie-parser";
import helmet from "helmet";
import morgan from "morgan";

const app = express();

// Security headers
app.use(helmet());

// CORS
app.use(cors({
  origin: process.env.CORS_ORIGIN,
  credentials: true,              // Required for cookies
}));

// Body parsing
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Cookie parsing
app.use(cookieParser());

// Logging
app.use(morgan("dev"));

// Health check
app.get("/api/health", (req, res) => {
  res.json({ status: "ok", timestamp: new Date().toISOString() });
});

// Routes (add as you build them)
// app.use("/api/auth", authRouter);
// app.use("/api/users", usersRouter);

export default app;
```

### Step 5 — Build Auth Service (Day 2)

Implement the AuthService class from section 6.3. Build and test these
methods in this order:

1. `register()` — test with a simple Prisma call
2. `generateAccessToken()` — test by decoding the generated token
3. `generateRefreshToken()` and `hashToken()` — test hash consistency
4. `login()` — test full login flow
5. `refreshToken()` — test with a valid refresh token from login
6. `logout()` — test that refresh token is revoked after logout
7. `changePassword()` — test full flow including forced re-login

### Step 6 — Build Middleware (Day 2)

Build in this order:

1. `validate.middleware.ts` — generic schema validation wrapper
2. `authenticate.middleware.ts` — JWT cookie verification
3. `authorize.middleware.ts` — role-based permission check
4. `rateLimiter.middleware.ts` — login rate limiting

### Step 7 — Build Controllers and Routes (Day 3)

Build the AuthController by wiring up the AuthService methods. Keep
controllers thin — they should only: validate input (using the validate
middleware), call the service, set cookies, and return the response.

### Step 8 — Set Up Next.js Frontend (Day 3)

```bash
npx create-next-app@latest m2i-lms-frontend \
  --typescript \
  --tailwind \
  --app \
  --no-src-dir
```

Install additional dependencies:

```bash
npm install react-hook-form axios
npm install @radix-ui/react-label @radix-ui/react-slot
npm install class-variance-authority clsx tailwind-merge
```

### Step 9 — Build Frontend Auth Components (Day 4)

Build in this order:

1. `lib/api.ts` — Axios instance with refresh interceptor
2. `LoginForm.tsx` — login form with validation and error handling
3. `RegisterForm.tsx` — registration form
4. `middleware.ts` — Next.js route protection
5. `app/(auth)/login/page.tsx` — login page
6. `app/(auth)/register/page.tsx` — registration page
7. `useAuth.ts` — custom hook for auth state
8. Role-specific dashboard skeleton pages

### Step 10 — Integration Testing (Day 5)

Test the complete flow end to end:

1. Register a new user
2. Admin assigns role to new user
3. User logs in, verify redirect to correct dashboard
4. Verify token expiry and refresh works transparently
5. Verify logout clears all tokens
6. Verify deactivated user cannot log in
7. Verify rate limiting triggers correctly

---

# 8. Error Handling

## 8.1 Error Code Reference

```
VALIDATION_ERROR          : 400 — Input failed validation
EMAIL_ALREADY_EXISTS      : 409 — Email already registered
INVALID_CREDENTIALS       : 401 — Wrong email or password
ACCOUNT_DEACTIVATED       : 403 — Account is deactivated
TOKEN_EXPIRED             : 401 — JWT access token expired
INVALID_TOKEN             : 401 — JWT signature invalid or malformed
INVALID_REFRESH_TOKEN     : 401 — Refresh token invalid, expired, revoked
RATE_LIMIT_EXCEEDED       : 429 — Too many login attempts
INVALID_CURRENT_PASSWORD  : 401 — Wrong current password on change
USER_NOT_FOUND            : 404 — User ID does not exist
PERMISSION_DENIED         : 403 — Role not permitted for this action
AUTHENTICATION_REQUIRED   : 401 — No token provided
INTERNAL_SERVER_ERROR     : 500 — Unexpected server error
```

## 8.2 Global Error Handler

```typescript
// middleware/errorHandler.middleware.ts
import { Request, Response, NextFunction } from "express";

interface AppError {
  code: string;
  statusCode: number;
  message?: string;
  details?: Record<string, unknown>;
}

export const errorHandler = (
  error: AppError | Error,
  req: Request,
  res: Response,
  next: NextFunction
) => {
  // Known application errors
  if ("code" in error && "statusCode" in error) {
    return res.status(error.statusCode).json({
      success: false,
      error: {
        code: error.code,
        message: error.message ?? "An error occurred",
        details: error.details,
      },
      timestamp: new Date().toISOString(),
    });
  }

  // Unknown errors — log and return generic 500
  console.error("Unexpected error:", error);

  return res.status(500).json({
    success: false,
    error: {
      code: "INTERNAL_SERVER_ERROR",
      message: "An unexpected error occurred",
    },
    timestamp: new Date().toISOString(),
  });
};
```

---

# 9. Testing Strategy

## 9.1 What to Test

### Unit Tests

Test each service method in isolation with mocked Prisma client:

```typescript
// tests/auth.service.test.ts
describe("AuthService.register", () => {

  it("should create a new user with hashed password", async () => {
    // Arrange
    const mockUser = {
      id: "uuid-123",
      email: "test@example.com",
      fullName: "Test User",
    };
    prismaMock.user.findUnique.mockResolvedValue(null);
    prismaMock.user.create.mockResolvedValue(mockUser as any);

    // Act
    const result = await authService.register({
      full_name: "Test User",
      email: "test@example.com",
      password: "TestPass123",
    });

    // Assert
    expect(result.email).toBe("test@example.com");
    expect(prismaMock.user.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          email: "test@example.com",
          passwordHash: expect.not.stringContaining("TestPass123"),
        }),
      })
    );
  });

  it("should throw EMAIL_ALREADY_EXISTS when email is taken", async () => {
    prismaMock.user.findUnique.mockResolvedValue({
      id: "existing-uuid",
    } as any);

    await expect(
      authService.register({
        full_name: "Test User",
        email: "existing@example.com",
        password: "TestPass123",
      })
    ).rejects.toMatchObject({ code: "EMAIL_ALREADY_EXISTS" });
  });
});
```

### Integration Tests

Test full HTTP request/response cycle with a test database:

```typescript
// tests/auth.integration.test.ts
describe("POST /api/auth/login", () => {

  it("should return 200 and set cookies on valid credentials", async () => {
    const response = await request(app)
      .post("/api/auth/login")
      .send({
        email: "test@example.com",
        password: "TestPass123",
      });

    expect(response.status).toBe(200);
    expect(response.body.success).toBe(true);
    expect(response.body.data.email).toBe("test@example.com");
    expect(response.headers["set-cookie"]).toBeDefined();

    const cookies = response.headers["set-cookie"] as string[];
    expect(cookies.some((c) => c.startsWith("access_token="))).toBe(true);
    expect(cookies.some((c) => c.startsWith("refresh_token="))).toBe(true);
    expect(cookies.every((c) => c.includes("HttpOnly"))).toBe(true);
  });

  it("should return 401 for invalid password", async () => {
    const response = await request(app)
      .post("/api/auth/login")
      .send({
        email: "test@example.com",
        password: "WrongPassword",
      });

    expect(response.status).toBe(401);
    expect(response.body.error.code).toBe("INVALID_CREDENTIALS");
  });

  it("should return 429 after 5 failed attempts from same IP", async () => {
    for (let i = 0; i < 5; i++) {
      await request(app)
        .post("/api/auth/login")
        .send({ email: "test@example.com", password: "wrong" });
    }

    const response = await request(app)
      .post("/api/auth/login")
      .send({ email: "test@example.com", password: "wrong" });

    expect(response.status).toBe(429);
    expect(response.body.error.code).toBe("RATE_LIMIT_EXCEEDED");
  });
});
```

---

# 10. Security Considerations

## 10.1 Password Security

**Never store plaintext passwords.** bcrypt with salt rounds of 10 is
used. Each additional salt round doubles the computation time, making
brute force exponentially harder.

**Minimum password requirements:** 8 characters, uppercase, lowercase,
digit. These are enforced at both frontend and backend. Frontend
validation is UX. Backend validation is security.

**Timing attack prevention:** bcrypt.compare() takes constant time
regardless of whether the hash matches or not. Do not short-circuit
the comparison.

## 10.2 Token Security

**Access tokens expire in 1 hour.** Short expiry limits damage window
if a token is stolen.

**Refresh tokens are hashed before storage.** Even if the database is
compromised, stored token hashes cannot be used without the original
raw token (which only exists in the user's cookie).

**HttpOnly cookies prevent XSS.** JavaScript cannot read HttpOnly
cookies. Even if an attacker injects malicious JavaScript, they cannot
steal the tokens.

**SameSite=Strict prevents CSRF.** Cookies are not sent on cross-origin
requests, preventing cross-site request forgery attacks.

**Refresh token cookie path is restricted** to /api/auth/refresh-token.
The refresh token cookie is only sent when calling that specific
endpoint.

## 10.3 Brute Force Prevention

**IP-based rate limiting:** 5 failed attempts per minute per IP.

**Account-based rate limiting:** 10 failed attempts per 15 minutes
per account.

**Generic error messages:** "Invalid email or password" — never reveals
whether the email exists or the password is wrong. This prevents user
enumeration attacks.

## 10.4 Audit Trail

All login attempts (success and failure) are logged with IP address and
timestamp. This enables: detection of brute force attacks, forensic
investigation of unauthorized access, compliance reporting if required.

---

# 11. Code Examples

## 11.1 Using Auth Middleware in Routes

```typescript
// How to protect any route in the application
import { Router } from "express";
import { authenticate } from "../middleware/authenticate.middleware";
import { authorize } from "../middleware/authorize.middleware";

const router = Router();

// Only authenticated users can access
router.get("/profile", authenticate, controller.getProfile);

// Only ADMIN or SUPER_ADMIN can access
router.post(
  "/batches",
  authenticate,
  authorize(["ADMIN", "SUPER_ADMIN"]),
  controller.createBatch
);

// Only MENTOR can access
router.post(
  "/content",
  authenticate,
  authorize(["MENTOR"]),
  controller.uploadContent
);

// Only STUDENT can access
router.post(
  "/quizzes/:id/submit",
  authenticate,
  authorize(["STUDENT"]),
  controller.submitQuiz
);
```

## 11.2 Setting Cookies in Controller

```typescript
// How to set cookies consistently throughout auth controller
const setCookies = (
  res: Response,
  accessToken: string,
  refreshToken?: string
) => {
  const isProduction = process.env.NODE_ENV === "production";

  res.cookie("access_token", accessToken, {
    httpOnly: true,
    secure: isProduction,
    sameSite: "strict",
    maxAge: 60 * 60 * 1000,        // 1 hour in milliseconds
    path: "/",
  });

  if (refreshToken) {
    res.cookie("refresh_token", refreshToken, {
      httpOnly: true,
      secure: isProduction,
      sameSite: "strict",
      maxAge: 7 * 24 * 60 * 60 * 1000,   // 7 days in milliseconds
      path: "/api/auth/refresh-token",
    });
  }
};

const clearCookies = (res: Response) => {
  res.clearCookie("access_token", { path: "/" });
  res.clearCookie("refresh_token", {
    path: "/api/auth/refresh-token",
  });
};
```

---

# 12. Performance Optimization

## 12.1 Database Query Optimization

The email index on the users table ensures that login lookups by email
are O(log n) instead of O(n) full table scans. This is critical because
every login attempt hits this query.

The token_hash index on the refresh_tokens table ensures refresh token
lookups are fast. Every API call that requires token refresh hits this
query.

Login attempts table will grow large over time. Add a cleanup job that
deletes records older than 30 days:

```typescript
// Run nightly via a cron job
const cleanupOldLoginAttempts = async () => {
  const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
  await prisma.loginAttempt.deleteMany({
    where: { attemptedAt: { lt: thirtyDaysAgo } },
  });
};
```

## 12.2 Token Verification Performance

JWT verification is a CPU-bound operation. For 500 concurrent users
each making several API calls per minute, this is negligible on modern
hardware. If it ever becomes a bottleneck (thousands of concurrent
users), consider caching decoded tokens in Redis with a TTL matching
the remaining token lifetime.

---

**End of Feature 01 — Authentication and Role Management**

---

**Document Information**


| Field        | Value                                            |
| ------------ | ------------------------------------------------ |
| Feature      | F01 — Authentication and Role Management        |
| Version      | 1.0                                              |
| Status       | Ready for Development                            |
| Folder       | F01_Authentication_And_RoleManagement/           |
| Filename     | F01_Implementation_Guide.md                      |
| Next Feature | F02_Batch_Management/F02_Implementation_Guide.md |
