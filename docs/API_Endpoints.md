# M2i_LMS — API Endpoints Sub-Document
### Version 1.0 | March 2026 | Sub-Document 03 of 05
### Save As: API_Endpoints/M2i_LMS_API_Endpoints.md

---

# Table of Contents

1. [Overview](#1-overview)
2. [Global Conventions](#2-global-conventions)
3. [Authentication Endpoints](#3-authentication-endpoints)
4. [User Management Endpoints](#4-user-management-endpoints)
5. [Batch Management Endpoints](#5-batch-management-endpoints)
6. [Content Management Endpoints](#6-content-management-endpoints)
7. [Quiz Generation and Review Endpoints](#7-quiz-generation-and-review-endpoints)
8. [Quiz Taking Endpoints](#8-quiz-taking-endpoints)
9. [Live Session Endpoints](#9-live-session-endpoints)
10. [Progress and Dashboard Endpoints](#10-progress-and-dashboard-endpoints)
11. [Notification Endpoints](#11-notification-endpoints)
12. [Admin Utility Endpoints](#12-admin-utility-endpoints)
13. [Error Code Reference](#13-error-code-reference)
14. [Rate Limiting Reference](#14-rate-limiting-reference)
15. [Authentication and Authorization Matrix](#15-authentication-and-authorization-matrix)

---

# 1. Overview

## 1.1 What This Document Covers

This document is the complete, authoritative reference for every
API endpoint in M2i_LMS Phase One. It covers all 10 features
in a single consolidated document, organized by domain. Every
endpoint includes:

- HTTP method and path
- Access control (which roles can call it)
- Request body schema with field types and validation rules
- Query parameter definitions
- Complete success response with example JSON
- All possible error responses with error codes
- Business rules that affect behavior
- Notes on edge cases

## 1.2 Total Endpoint Count

Phase One contains **87 API endpoints** across 11 domains:

| Domain | Endpoints |
|--------|-----------|
| Authentication | 7 |
| User Management | 5 |
| Batch Management | 10 |
| Content Management | 14 |
| Quiz Generation and Review | 11 |
| Quiz Taking | 6 |
| Live Sessions | 11 |
| Progress and Dashboard | 10 |
| Notifications | 6 |
| Admin Utilities | 4 |
| Health and System | 3 |
| **Total** | **87** |

---

# 2. Global Conventions

## 2.1 Base URL
```
Development : http://localhost:3001/api
Staging     : https://api-staging.m2ilms.com/api
Production  : https://api.m2ilms.com/api
```

## 2.2 Authentication

All endpoints except the ones explicitly marked as **Public**
require a valid JWT access token. The token is sent
automatically via the HttpOnly `access_token` cookie set
during login.

If the access token is expired, the frontend automatically
calls `POST /api/auth/refresh-token` using the refresh token
cookie. If the refresh token is also expired or invalid, the
user is redirected to the login page.

## 2.3 Standard Response Envelope

**All successful responses:**
```json
{
  "success": true,
  "data": { ... },
  "message": "Optional human-readable message",
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 150,
    "total_pages": 8
  }
}
```

**All error responses:**
```json
{
  "success": false,
  "error": {
    "code": "ERROR_CODE_IN_SCREAMING_SNAKE_CASE",
    "message": "Human-readable description of the error",
    "details": {
      "field": "optional field that caused the error",
      "additional": "any additional context"
    }
  },
  "timestamp": "2026-03-21T10:30:00Z"
}
```

## 2.4 HTTP Status Codes Used

| Code | Meaning | When Used |
|------|---------|-----------|
| 200 | OK | Successful GET, PUT, PATCH, DELETE |
| 201 | Created | Successful POST that creates a resource |
| 400 | Bad Request | Validation error, invalid input |
| 401 | Unauthorized | Missing or invalid authentication token |
| 403 | Forbidden | Authenticated but insufficient permissions |
| 404 | Not Found | Resource does not exist |
| 409 | Conflict | Duplicate resource or state conflict |
| 429 | Too Many Requests | Rate limit exceeded |
| 500 | Internal Server Error | Unexpected server error |
| 502 | Bad Gateway | External service (Mux, Agora) failed |

## 2.5 Pagination

All list endpoints support cursor-free offset pagination:
```
GET /api/batches?page=2&limit=20
```

Default page: 1
Default limit: 20
Maximum limit: 100 (enforced server-side)

Pagination metadata is always included in the response:
```json
"pagination": {
  "page": 2,
  "limit": 20,
  "total": 87,
  "total_pages": 5
}
```

## 2.6 Date and Time Format

All timestamps are ISO 8601 format in UTC:
```
2026-04-15T10:30:00Z
```

All date-only fields (start_date, end_date) are YYYY-MM-DD:
```
2026-04-15
```

## 2.7 UUID Format

All IDs are UUIDs in lowercase hyphenated format:
```
550e8400-e29b-41d4-a716-446655440000
```

---

# 3. Authentication Endpoints

## 3.1 POST /api/auth/register

**Access:** Public
**Feature:** F01

**Description:** Create a new user account. New accounts have
no role assigned. An admin must assign a role before the
user can access role-specific features.

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
full_name             : required | string | min:2 | max:100
email                 : required | email | max:255 | unique
password              : required | min:8 | regex:/[A-Z]/
                        | regex:/[a-z]/ | regex:/[0-9]/
password_confirmation : required | same:password
```

**Success Response (201):**
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

| Code | Error Code | Condition |
|------|-----------|-----------|
| 400 | VALIDATION_ERROR | Any field fails validation |
| 409 | EMAIL_ALREADY_EXISTS | Email address already registered |

---

## 3.2 POST /api/auth/login

**Access:** Public
**Feature:** F01

**Description:** Authenticate a user and issue JWT tokens
as HttpOnly cookies. Returns user profile including role
for frontend routing.

**Request Body:**
```json
{
  "email": "rahul@example.com",
  "password": "SecurePass123"
}
```

**Validation Rules:**
```
email    : required | email
password : required | string
```

**Success Response (200):**
```json
{
  "success": true,
  "data": {
    "user_id": "550e8400-e29b-41d4-a716-446655440000",
    "email": "rahul@example.com",
    "full_name": "Rahul Sharma",
    "role": "STUDENT",
    "avatar_url": null,
    "last_login_at": "2026-04-14T09:30:00Z"
  },
  "message": "Login successful"
}
```

**Cookies Set:**
```
Set-Cookie: access_token=eyJ...; HttpOnly; Secure;
            SameSite=Strict; Path=/; Max-Age=3600
Set-Cookie: refresh_token=abc123...; HttpOnly; Secure;
            SameSite=Strict; Path=/api/auth/refresh-token;
            Max-Age=604800
```

**Error Responses:**

| Code | Error Code | Condition |
|------|-----------|-----------|
| 400 | VALIDATION_ERROR | Email or password missing |
| 401 | INVALID_CREDENTIALS | Wrong email or password |
| 403 | ACCOUNT_DEACTIVATED | Account has been deactivated |
| 429 | RATE_LIMIT_EXCEEDED | 5+ failed attempts in 1 minute |

---

## 3.3 POST /api/auth/logout

**Access:** Authenticated (any role)
**Feature:** F01

**Description:** Invalidate all refresh tokens for the
current user and clear authentication cookies.

**Request Body:** None

**Success Response (200):**
```json
{
  "success": true,
  "message": "Logged out successfully"
}
```

**Cookies Cleared:**
```
Set-Cookie: access_token=; Max-Age=0; Path=/
Set-Cookie: refresh_token=; Max-Age=0;
            Path=/api/auth/refresh-token
```

---

## 3.4 POST /api/auth/refresh-token

**Access:** Requires valid refresh_token cookie
**Feature:** F01

**Description:** Exchange a valid refresh token for a new
access token. Called automatically by the frontend when
a 401 is received. Not called directly by users.

**Request Body:** None (refresh token sent via cookie)

**Success Response (200):**
```json
{
  "success": true,
  "data": {
    "user_id": "550e8400-e29b-41d4-a716-446655440000"
  },
  "message": "Token refreshed"
}
```

**New Cookie Set:**
```
Set-Cookie: access_token=eyJ...; HttpOnly; Secure;
            SameSite=Strict; Path=/; Max-Age=3600
```

**Error Responses:**

| Code | Error Code | Condition |
|------|-----------|-----------|
| 401 | INVALID_REFRESH_TOKEN | Token invalid, expired, or revoked |
| 403 | ACCOUNT_DEACTIVATED | Account deactivated since token issued |

---

## 3.5 GET /api/auth/me

**Access:** Authenticated (any role)
**Feature:** F01

**Description:** Fetch the currently authenticated user's
profile. Called on app startup to restore session.

**Success Response (200):**
```json
{
  "success": true,
  "data": {
    "user_id": "550e8400-e29b-41d4-a716-446655440000",
    "email": "rahul@example.com",
    "full_name": "Rahul Sharma",
    "role": "STUDENT",
    "avatar_url": null,
    "last_login_at": "2026-04-14T09:30:00Z",
    "created_at": "2026-01-15T08:00:00Z"
  }
}
```

---

## 3.6 PUT /api/auth/me

**Access:** Authenticated (any role)
**Feature:** F01

**Description:** Update the authenticated user's own profile.

**Request Body (all fields optional):**
```json
{
  "full_name": "Rahul Kumar Sharma",
  "avatar_url": "https://cdn.example.com/avatars/user.jpg"
}
```

**Validation Rules:**
```
full_name  : optional | string | min:2 | max:100
avatar_url : optional | url | nullable
```

**Success Response (200):**
```json
{
  "success": true,
  "data": {
    "user_id": "550e8400-e29b-41d4-a716-446655440000",
    "full_name": "Rahul Kumar Sharma",
    "avatar_url": "https://cdn.example.com/avatars/user.jpg",
    "updated_at": "2026-04-14T10:00:00Z"
  },
  "message": "Profile updated successfully"
}
```

---

## 3.7 POST /api/auth/change-password

**Access:** Authenticated (any role)
**Feature:** F01

**Description:** Change the authenticated user's password.
On success, all refresh tokens are revoked — user must
re-login on all devices.

**Request Body:**
```json
{
  "current_password": "SecurePass123",
  "new_password": "NewSecurePass456",
  "new_password_confirmation": "NewSecurePass456"
}
```

**Validation Rules:**
```
current_password          : required | string
new_password              : required | min:8 | regex:/[A-Z]/
                            | regex:/[a-z]/ | regex:/[0-9]/
new_password_confirmation : required | same:new_password
```

**Success Response (200):**
```json
{
  "success": true,
  "message": "Password changed. Please log in again with your
              new password."
}
```

**Error Responses:**

| Code | Error Code | Condition |
|------|-----------|-----------|
| 400 | VALIDATION_ERROR | New password fails complexity rules |
| 401 | INVALID_CURRENT_PASSWORD | Current password is incorrect |

---

# 4. User Management Endpoints

## 4.1 POST /api/users

**Access:** ADMIN, SUPER_ADMIN
**Feature:** F01

**Description:** Admin creates a new user with an assigned
role. System generates a temporary password. Admin must
share this password with the new user out-of-band.

**Request Body:**
```json
{
  "full_name": "Priya Patel",
  "email": "priya@example.com",
  "role": "STUDENT"
}
```

**Validation Rules:**
```
full_name : required | string | min:2 | max:100
email     : required | email | max:255 | unique
role      : required | in:STUDENT,MENTOR,ADMIN,SUPER_ADMIN
```

**Success Response (201):**
```json
{
  "success": true,
  "data": {
    "user_id": "660e9500-f30c-52e5-b827-557766551111",
    "email": "priya@example.com",
    "full_name": "Priya Patel",
    "role": "STUDENT",
    "temporary_password": "TempP@ss789"
  },
  "message": "User created. Share the temporary password with the user."
}
```

**Error Responses:**

| Code | Error Code | Condition |
|------|-----------|-----------|
| 400 | VALIDATION_ERROR | Any field fails validation |
| 403 | PERMISSION_DENIED | Non-admin attempting user creation |
| 409 | EMAIL_ALREADY_EXISTS | Email already registered |

---

## 4.2 GET /api/users

**Access:** ADMIN, SUPER_ADMIN
**Feature:** F01

**Description:** List all users with filtering and pagination.

**Query Parameters:**
```
role      : filter by role (STUDENT | MENTOR | ADMIN | SUPER_ADMIN)
is_active : filter by status (true | false)
search    : search by name or email (partial match)
page      : page number (default: 1)
limit     : results per page (default: 20, max: 100)
```

**Success Response (200):**
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
        "avatar_url": null,
        "last_login_at": "2026-04-14T09:30:00Z",
        "created_at": "2026-01-15T08:00:00Z"
      }
    ]
  },
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 47,
    "total_pages": 3
  }
}
```

---

## 4.3 GET /api/users/:userId

**Access:** ADMIN, SUPER_ADMIN
**Feature:** F01

**Description:** Fetch full details for a specific user.

**Success Response (200):**
```json
{
  "success": true,
  "data": {
    "user_id": "550e8400-e29b-41d4-a716-446655440000",
    "email": "rahul@example.com",
    "full_name": "Rahul Sharma",
    "role": "STUDENT",
    "is_active": true,
    "avatar_url": null,
    "last_login_at": "2026-04-14T09:30:00Z",
    "created_at": "2026-01-15T08:00:00Z",
    "updated_at": "2026-04-14T09:30:00Z"
  }
}
```

**Error Responses:**

| Code | Error Code | Condition |
|------|-----------|-----------|
| 404 | USER_NOT_FOUND | User ID does not exist |

---

## 4.4 PUT /api/users/:userId

**Access:** ADMIN, SUPER_ADMIN
**Feature:** F01

**Description:** Update a user's profile, role, or active
status. Setting is_active to false immediately revokes all
refresh tokens and logs the user out.

**Request Body (all optional, at least one required):**
```json
{
  "full_name": "Rahul Kumar",
  "role": "MENTOR",
  "is_active": false
}
```

**Validation Rules:**
```
full_name : optional | string | min:2 | max:100
role      : optional | in:STUDENT,MENTOR,ADMIN,SUPER_ADMIN
is_active : optional | boolean
```

**Business Rules:**
- A SUPER_ADMIN cannot deactivate the last SUPER_ADMIN account
- Role changes take effect immediately on next API call

**Success Response (200):**
```json
{
  "success": true,
  "data": {
    "user_id": "550e8400-e29b-41d4-a716-446655440000",
    "full_name": "Rahul Kumar",
    "role": "MENTOR",
    "is_active": false,
    "updated_at": "2026-04-14T11:00:00Z"
  },
  "message": "User updated successfully"
}
```

**Error Responses:**

| Code | Error Code | Condition |
|------|-----------|-----------|
| 400 | CANNOT_DEACTIVATE_LAST_SUPER_ADMIN | Would leave no active SUPER_ADMIN |
| 404 | USER_NOT_FOUND | User ID does not exist |

---

## 4.5 POST /api/users/:userId/reset-password

**Access:** ADMIN, SUPER_ADMIN
**Feature:** F01

**Description:** Generate a new temporary password for a user
and revoke all their refresh tokens. Admin must share the
temporary password out-of-band.

**Request Body:** None

**Success Response (200):**
```json
{
  "success": true,
  "data": {
    "temporary_password": "ResetP@ss321"
  },
  "message": "Password reset. Share the temporary password with the user."
}
```

---

# 5. Batch Management Endpoints

## 5.1 POST /api/batches

**Access:** ADMIN, SUPER_ADMIN
**Feature:** F02

**Description:** Create a new batch. New batches are created
in DRAFT status and are not visible to students until activated.

**Request Body:**
```json
{
  "name": "Full Stack Development Batch Jan 2026",
  "description": "An 8-week comprehensive curriculum covering
                 Node.js, React, PostgreSQL, and deployment.",
  "start_date": "2026-04-01",
  "end_date": "2026-05-31"
}
```

**Validation Rules:**
```
name        : required | string | min:3 | max:255 | unique
description : optional | string | max:2000
start_date  : required | date:YYYY-MM-DD | after_or_equal:today
end_date    : required | date:YYYY-MM-DD | after:start_date
              | min_gap:7 days after start_date
```

**Success Response (201):**
```json
{
  "success": true,
  "data": {
    "batch_id": "770f1234-a12b-43c5-d678-998877665544",
    "name": "Full Stack Development Batch Jan 2026",
    "description": "An 8-week comprehensive curriculum...",
    "start_date": "2026-04-01",
    "end_date": "2026-05-31",
    "status": "DRAFT",
    "current_week": null,
    "total_weeks": 8,
    "enrolled_students_count": 0,
    "assigned_mentors_count": 0,
    "created_at": "2026-03-21T10:00:00Z"
  },
  "message": "Batch created successfully"
}
```

**Error Responses:**

| Code | Error Code | Condition |
|------|-----------|-----------|
| 400 | VALIDATION_ERROR | Date gap less than 7 days |
| 409 | BATCH_NAME_EXISTS | Batch name already in use |

---

## 5.2 GET /api/batches

**Access:** ADMIN, SUPER_ADMIN
**Feature:** F02

**Query Parameters:**
```
status : filter (DRAFT | ACTIVE | COMPLETED | ARCHIVED)
search : search by batch name
page   : page number (default: 1)
limit  : results per page (default: 20)
```

**Success Response (200):**
```json
{
  "success": true,
  "data": {
    "batches": [
      {
        "batch_id": "770f1234-a12b-43c5-d678-998877665544",
        "name": "Full Stack Development Batch Jan 2026",
        "status": "ACTIVE",
        "start_date": "2026-04-01",
        "end_date": "2026-05-31",
        "current_week": 3,
        "total_weeks": 8,
        "enrolled_students_count": 45,
        "assigned_mentors_count": 2,
        "created_at": "2026-03-21T10:00:00Z"
      }
    ]
  },
  "pagination": { "page": 1, "limit": 20, "total": 3, "total_pages": 1 }
}
```

---

## 5.3 GET /api/batches/:batchId

**Access:** ADMIN, SUPER_ADMIN, MENTOR (assigned to batch)
**Feature:** F02

**Success Response (200):**
```json
{
  "success": true,
  "data": {
    "batch_id": "770f1234-a12b-43c5-d678-998877665544",
    "name": "Full Stack Development Batch Jan 2026",
    "description": "An 8-week comprehensive curriculum...",
    "status": "ACTIVE",
    "start_date": "2026-04-01",
    "end_date": "2026-05-31",
    "current_week": 3,
    "total_weeks": 8,
    "enrolled_students_count": 45,
    "assigned_mentors": [
      {
        "mentor_id": "mentor-uuid-1",
        "full_name": "Arjun Nair",
        "email": "arjun@example.com",
        "avatar_url": null
      }
    ],
    "content_count": 12,
    "live_sessions_count": 6,
    "created_by": {
      "user_id": "admin-uuid-1",
      "full_name": "Platform Admin"
    },
    "created_at": "2026-03-21T10:00:00Z",
    "updated_at": "2026-03-21T10:00:00Z"
  }
}
```

**Error Responses:**

| Code | Error Code | Condition |
|------|-----------|-----------|
| 403 | PERMISSION_DENIED | Mentor not assigned to this batch |
| 404 | BATCH_NOT_FOUND | Batch ID does not exist |

---

## 5.4 PUT /api/batches/:batchId

**Access:** ADMIN, SUPER_ADMIN
**Feature:** F02

**Request Body (all optional, at least one required):**
```json
{
  "name": "Full Stack Development Batch Jan 2026 (Extended)",
  "description": "Updated description...",
  "end_date": "2026-06-15"
}
```

**Business Rules:**
- start_date cannot be changed if any students are enrolled
- status cannot be changed via this endpoint

**Error Responses:**

| Code | Error Code | Condition |
|------|-----------|-----------|
| 400 | CANNOT_CHANGE_START_DATE | Students enrolled |
| 400 | VALIDATION_ERROR | New end_date before start_date |
| 409 | BATCH_NAME_EXISTS | New name already taken |

---

## 5.5 POST /api/batches/:batchId/archive

**Access:** ADMIN, SUPER_ADMIN
**Feature:** F02

**Request Body:**
```json
{
  "confirmation": "ARCHIVE"
}
```

**Success Response (200):**
```json
{
  "success": true,
  "data": {
    "batch_id": "770f1234-a12b-43c5-d678-998877665544",
    "status": "ARCHIVED"
  },
  "message": "Batch archived successfully"
}
```

**Error Responses:**

| Code | Error Code | Condition |
|------|-----------|-----------|
| 400 | INVALID_ARCHIVE_CONFIRMATION | confirmation field not "ARCHIVE" |
| 400 | BATCH_ALREADY_ARCHIVED | Batch is already archived |

---

## 5.6 POST /api/batches/:batchId/enroll

**Access:** ADMIN, SUPER_ADMIN
**Feature:** F02

**Request Body:**
```json
{
  "student_ids": [
    "student-uuid-1",
    "student-uuid-2",
    "student-uuid-3"
  ]
}
```

**Validation Rules:**
```
student_ids : required | array | min:1 | max:100
              Each item: UUID | exists:users,id | role=STUDENT
```

**Success Response (200):**
```json
{
  "success": true,
  "data": {
    "enrolled": [
      {
        "student_id": "student-uuid-1",
        "full_name": "Rahul Sharma",
        "enrolled_at": "2026-03-21T10:00:00Z"
      }
    ],
    "skipped": [
      {
        "student_id": "student-uuid-2",
        "reason": "Already enrolled in this batch"
      }
    ],
    "failed": []
  },
  "message": "1 student enrolled. 1 skipped."
}
```

---

## 5.7 DELETE /api/batches/:batchId/enroll/:studentId

**Access:** ADMIN, SUPER_ADMIN
**Feature:** F02

**Description:** Withdraw a student from a batch. Historical
data (quiz responses, attendance, progress) is preserved.

**Success Response (200):**
```json
{
  "success": true,
  "data": {
    "student_id": "student-uuid-1",
    "batch_id": "770f1234-a12b-43c5-d678-998877665544",
    "status": "WITHDRAWN",
    "withdrawn_at": "2026-04-14T10:00:00Z"
  },
  "message": "Student withdrawn from batch"
}
```

**Error Responses:**

| Code | Error Code | Condition |
|------|-----------|-----------|
| 400 | ALREADY_WITHDRAWN | Student already withdrawn |
| 404 | ENROLLMENT_NOT_FOUND | Student not enrolled in this batch |

---

## 5.8 GET /api/batches/:batchId/students

**Access:** ADMIN, SUPER_ADMIN, MENTOR (assigned to batch)
**Feature:** F02

**Query Parameters:**
```
status : filter (ACTIVE | WITHDRAWN | COMPLETED)
search : search by name or email
page   : page number
limit  : results per page (default: 50)
```

**Success Response (200):**
```json
{
  "success": true,
  "data": {
    "students": [
      {
        "enrollment_id": "enrollment-uuid-1",
        "student_id": "student-uuid-1",
        "full_name": "Rahul Sharma",
        "email": "rahul@example.com",
        "avatar_url": null,
        "enrollment_status": "ACTIVE",
        "enrolled_at": "2026-03-21T10:00:00Z",
        "last_login_at": "2026-04-14T09:30:00Z",
        "overall_progress_score": 72.5
      }
    ]
  },
  "pagination": { "page": 1, "limit": 50, "total": 45, "total_pages": 1 }
}
```

---

## 5.9 POST /api/batches/:batchId/mentors

**Access:** ADMIN, SUPER_ADMIN
**Feature:** F02

**Request Body:**
```json
{
  "mentor_ids": ["mentor-uuid-1", "mentor-uuid-2"]
}
```

**Success Response (200):**
```json
{
  "success": true,
  "data": {
    "assigned": [
      {
        "mentor_id": "mentor-uuid-1",
        "full_name": "Arjun Nair",
        "assigned_at": "2026-03-21T10:00:00Z"
      }
    ],
    "skipped": []
  },
  "message": "1 mentor assigned"
}
```

---

## 5.10 GET /api/my/batch

**Access:** STUDENT
**Feature:** F02

**Description:** Fetch the batch the currently authenticated
student is enrolled in.

**Success Response (200):**
```json
{
  "success": true,
  "data": {
    "batch_id": "770f1234-a12b-43c5-d678-998877665544",
    "name": "Full Stack Development Batch Jan 2026",
    "description": "An 8-week curriculum...",
    "status": "ACTIVE",
    "start_date": "2026-04-01",
    "end_date": "2026-05-31",
    "current_week": 3,
    "total_weeks": 8,
    "weeks_remaining": 5,
    "assigned_mentors": [
      {
        "mentor_id": "mentor-uuid-1",
        "full_name": "Arjun Nair",
        "avatar_url": null
      }
    ],
    "enrollment_status": "ACTIVE",
    "enrolled_at": "2026-03-21T10:00:00Z"
  }
}
```

**Error Responses:**

| Code | Error Code | Condition |
|------|-----------|-----------|
| 404 | NOT_ENROLLED | Student not enrolled in any active batch |

---

# 6. Content Management Endpoints

## 6.1 POST /api/content/upload-url

**Access:** MENTOR, ADMIN, SUPER_ADMIN
**Feature:** F03

**Description:** Request a pre-signed S3 URL for direct
browser-to-S3 file upload. Step 1 of the 3-step upload flow.
Returns a content_id pre-generated so the content record can
be created atomically after upload.

**Request Body:**
```json
{
  "filename": "nodejs-introduction-week1.mp4",
  "mime_type": "video/mp4",
  "file_size_bytes": 524288000,
  "batch_id": "770f1234-a12b-43c5-d678-998877665544"
}
```

**Validation Rules:**
```
filename       : required | string | max:255
mime_type      : required | in:video/mp4,video/quicktime,
                 video/webm,application/pdf,
                 application/vnd.openxmlformats-officedocument
                   .wordprocessingml.document,
                 application/vnd.ms-powerpoint,
                 application/vnd.openxmlformats-officedocument
                   .presentationml.presentation
file_size_bytes: required | integer | min:1
                 | max:2147483648 (2GB for video)
                 | max:52428800 (50MB for documents)
batch_id       : required | UUID | exists:batches
                 | mentor must be assigned
```

**Success Response (200):**
```json
{
  "success": true,
  "data": {
    "upload_url": "https://s3.amazonaws.com/m2i-lms/...",
    "content_id": "880g2345-b23c-54d6-e789-009988776655",
    "s3_key": "video/batch-id/content-id/timestamp-filename.mp4",
    "expires_in_seconds": 900
  }
}
```

**Error Responses:**

| Code | Error Code | Condition |
|------|-----------|-----------|
| 400 | UNSUPPORTED_FILE_TYPE | MIME type not allowed |
| 400 | FILE_TOO_LARGE | File exceeds size limit |
| 403 | MENTOR_NOT_ASSIGNED | Mentor not assigned to this batch |
| 404 | BATCH_NOT_FOUND | Batch does not exist |

---

## 6.2 POST /api/content

**Access:** MENTOR, ADMIN, SUPER_ADMIN
**Feature:** F03

**Description:** Create content record after successful S3
upload. Step 3 of the upload flow (step 2 is the S3 upload
itself which bypasses this server).

**Request Body:**
```json
{
  "content_id": "880g2345-b23c-54d6-e789-009988776655",
  "s3_key": "video/batch-id/content-id/timestamp-video.mp4",
  "title": "Introduction to Node.js — Week 1",
  "description": "Covering the event loop, modules, and async.",
  "content_type": "VIDEO",
  "batch_id": "770f1234-a12b-43c5-d678-998877665544",
  "topic_tags": ["nodejs", "javascript", "backend"],
  "learning_objectives": "Students should understand: 1) What
                         Node.js is. 2) How the event loop works.
                         3) How to use require().",
  "mime_type": "video/mp4",
  "file_size_bytes": 524288000
}
```

**Success Response (201):**
```json
{
  "success": true,
  "data": {
    "content_id": "880g2345-b23c-54d6-e789-009988776655",
    "title": "Introduction to Node.js — Week 1",
    "content_type": "VIDEO",
    "is_published": false,
    "transcription_status": "PENDING",
    "sort_order": 5,
    "created_at": "2026-04-14T10:00:00Z"
  },
  "message": "Content created. Transcription queued."
}
```

---

## 6.3 GET /api/batches/:batchId/content

**Access:**
- MENTOR/ADMIN: All content including drafts
- STUDENT: Published content only

**Feature:** F03

**Query Parameters:**
```
page  : page number (default: 1)
limit : results per page (default: 50)
```

**Success Response (200) — Student view:**
```json
{
  "success": true,
  "data": {
    "content": [
      {
        "content_id": "880g2345-b23c-54d6-e789-009988776655",
        "title": "Introduction to Node.js — Week 1",
        "description": "Covering the event loop...",
        "content_type": "VIDEO",
        "duration_seconds": 2700,
        "topic_tags": ["nodejs", "javascript"],
        "sort_order": 1,
        "has_quizzes": true,
        "my_progress": {
          "completion_percentage": 65.5,
          "is_completed": false,
          "last_position_seconds": 1768,
          "last_accessed_at": "2026-04-14T09:00:00Z"
        },
        "quiz_status": {
          "quick_quiz_available": true,
          "quick_quiz_completed": false,
          "retention_quiz_available": false,
          "retention_quiz_available_at": "2026-04-17T10:00:00Z"
        }
      }
    ]
  },
  "pagination": { "page": 1, "limit": 50, "total": 8, "total_pages": 1 }
}
```

---

## 6.4 GET /api/content/:contentId

**Access:** MENTOR (own batch), STUDENT (published only)
**Feature:** F03

**Success Response (200):**
```json
{
  "success": true,
  "data": {
    "content_id": "880g2345-b23c-54d6-e789-009988776655",
    "title": "Introduction to Node.js — Week 1",
    "description": "Covering the event loop...",
    "content_type": "VIDEO",
    "playback_url": "https://cdn.example.com/videos/880g2345.mp4",
    "duration_seconds": 2700,
    "topic_tags": ["nodejs", "javascript"],
    "learning_objectives": "Students should understand...",
    "is_published": true,
    "transcription_status": "COMPLETE",
    "supplementary_files": [
      {
        "file_id": "file-uuid-1",
        "filename": "nodejs-slides-week1.pdf",
        "download_url": "https://cdn.example.com/files/slides.pdf",
        "file_size_bytes": 2048000,
        "mime_type": "application/pdf"
      }
    ],
    "my_progress": {
      "completion_percentage": 65.5,
      "last_position_seconds": 1768,
      "is_completed": false
    }
  }
}
```

**Error Responses:**

| Code | Error Code | Condition |
|------|-----------|-----------|
| 403 | CONTENT_NOT_PUBLISHED | Student accessing unpublished content |
| 403 | NOT_ENROLLED | Student not in content's batch |
| 404 | CONTENT_NOT_FOUND | Content does not exist or deleted |

---

## 6.5 PUT /api/content/:contentId

**Access:** MENTOR (own content), ADMIN, SUPER_ADMIN
**Feature:** F03

**Request Body (all optional, at least one required):**
```json
{
  "title": "Introduction to Node.js — Week 1 (Updated)",
  "description": "Updated description...",
  "topic_tags": ["nodejs", "javascript", "backend", "eventloop"],
  "learning_objectives": "Updated objectives..."
}
```

**Success Response (200):**
```json
{
  "success": true,
  "data": {
    "content_id": "880g2345-b23c-54d6-e789-009988776655",
    "title": "Introduction to Node.js — Week 1 (Updated)",
    "updated_at": "2026-04-14T11:00:00Z"
  },
  "message": "Content updated"
}
```

---

## 6.6 POST /api/content/:contentId/publish

**Access:** MENTOR (own content), ADMIN, SUPER_ADMIN
**Feature:** F03

**Request Body:** None

**Success Response (200):**
```json
{
  "success": true,
  "data": {
    "content_id": "880g2345-b23c-54d6-e789-009988776655",
    "is_published": true
  },
  "message": "Content published. Students can now access it."
}
```

---

## 6.7 POST /api/content/:contentId/unpublish

**Access:** MENTOR (own content), ADMIN, SUPER_ADMIN
**Feature:** F03

**Request Body:** None

**Success Response (200):**
```json
{
  "success": true,
  "data": {
    "content_id": "880g2345-b23c-54d6-e789-009988776655",
    "is_published": false
  },
  "message": "Content unpublished"
}
```

---

## 6.8 DELETE /api/content/:contentId

**Access:** MENTOR (own content), ADMIN, SUPER_ADMIN
**Feature:** F03

**Request Body:**
```json
{
  "confirmation": "DELETE"
}
```

**Success Response (200):**
```json
{
  "success": true,
  "message": "Content deleted. Student data is preserved."
}
```

---

## 6.9 PUT /api/content/reorder

**Access:** MENTOR, ADMIN, SUPER_ADMIN
**Feature:** F03

**Request Body:**
```json
{
  "batch_id": "770f1234-a12b-43c5-d678-998877665544",
  "content_order": [
    { "content_id": "content-uuid-3", "sort_order": 1 },
    { "content_id": "content-uuid-1", "sort_order": 2 },
    { "content_id": "content-uuid-2", "sort_order": 3 }
  ]
}
```

**Success Response (200):**
```json
{
  "success": true,
  "message": "Content order updated"
}
```

---

## 6.10 GET /api/content/:contentId/transcript

**Access:** MENTOR, ADMIN, SUPER_ADMIN
**Feature:** F03

**Success Response (200):**
```json
{
  "success": true,
  "data": {
    "content_id": "880g2345-b23c-54d6-e789-009988776655",
    "transcript": "Hello everyone, welcome to week one...",
    "transcription_status": "COMPLETE",
    "word_count": 3450,
    "last_edited_at": null
  }
}
```

---

## 6.11 PUT /api/content/:contentId/transcript

**Access:** MENTOR, ADMIN, SUPER_ADMIN
**Feature:** F03

**Request Body:**
```json
{
  "transcript": "Hello everyone, welcome to week one of our
                Node.js curriculum..."
}
```

**Success Response (200):**
```json
{
  "success": true,
  "data": {
    "word_count": 3450,
    "updated_at": "2026-04-14T11:00:00Z"
  },
  "message": "Transcript updated. Click Regenerate Quizzes to
              generate new quizzes from the updated transcript."
}
```

---

## 6.12 POST /api/content/:contentId/regenerate-quizzes

**Access:** MENTOR, ADMIN, SUPER_ADMIN
**Feature:** F03/F04

**Request Body:** None

**Success Response (200):**
```json
{
  "success": true,
  "message": "Quiz regeneration queued. You will be notified
              when questions are ready for review.",
  "data": {
    "estimated_minutes": 5
  }
}
```

**Error Responses:**

| Code | Error Code | Condition |
|------|-----------|-----------|
| 400 | TRANSCRIPTION_NOT_COMPLETE | No transcript to generate from |
| 400 | GENERATION_IN_PROGRESS | Job already queued |

---

## 6.13 PATCH /api/content/:contentId/progress

**Access:** STUDENT
**Feature:** F03

**Description:** Update video watch progress. Called every
30 seconds during active playback.

**Request Body:**
```json
{
  "current_position_seconds": 1800,
  "session_watch_time_seconds": 30
}
```

**Success Response (200):**
```json
{
  "success": true,
  "data": {
    "completion_percentage": 66.7,
    "is_completed": false,
    "total_watch_time_seconds": 2010
  }
}
```

---

## 6.14 POST /api/content/:contentId/files

**Access:** MENTOR, ADMIN, SUPER_ADMIN
**Feature:** F03

**Description:** Register a supplementary file after S3 upload.

**Request Body:**
```json
{
  "file_id": "file-uuid-1",
  "filename": "nodejs-slides-week1.pdf",
  "s3_key": "files/batch-id/content-id/slides.pdf",
  "file_size_bytes": 2048000,
  "mime_type": "application/pdf"
}
```

**Success Response (201):**
```json
{
  "success": true,
  "data": {
    "file_id": "file-uuid-1",
    "filename": "nodejs-slides-week1.pdf",
    "download_url": "https://cdn.example.com/files/slides.pdf"
  },
  "message": "File uploaded"
}
```

---

# 7. Quiz Generation and Review Endpoints

## 7.1 GET /api/batches/:batchId/quizzes/review-queue

**Access:** MENTOR, ADMIN, SUPER_ADMIN
**Feature:** F05

**Description:** Fetch all pending review quiz questions for
the batch, grouped by content item with summary statistics.

**Query Parameters:**
```
content_id      : filter by content
quiz_type       : QUICK_ASSESSMENT | RETENTION
cognitive_level : RECALL | COMPREHENSION | APPLICATION | ANALYSIS
page            : page number
limit           : results per page (default: 30)
```

**Success Response (200):**
```json
{
  "success": true,
  "data": {
    "batch_summary": {
      "total_pending": 36,
      "total_approved": 28,
      "total_rejected": 6,
      "content_items_with_pending": 3
    },
    "content_groups": [
      {
        "content_id": "content-uuid-1",
        "content_title": "Introduction to Node.js",
        "pending_count": 12,
        "approved_count": 0,
        "quick_assessment": {
          "pending": 8,
          "approved": 0,
          "minimum_required": 5,
          "threshold_met": false
        },
        "retention": {
          "pending": 4,
          "approved": 0,
          "minimum_required": 8,
          "threshold_met": false
        }
      }
    ],
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
           concurrently",
          "To manage memory allocation",
          "To compile JavaScript to machine code",
          "To synchronize multiple Node.js processes"
        ],
        "correct_option_index": 0,
        "explanation": "The event loop enables non-blocking I/O...",
        "cognitive_level": "RECALL",
        "difficulty": "MEDIUM",
        "source_concept": "Node.js event loop architecture",
        "transcript_reference": "the event loop is what allows...",
        "is_ai_generated": true,
        "was_edited": false,
        "created_at": "2026-04-14T12:00:00Z"
      }
    ]
  },
  "pagination": { "page": 1, "limit": 30, "total": 36, "total_pages": 2 }
}
```

---

## 7.2 POST /api/quizzes/:quizId/approve

**Access:** MENTOR, ADMIN, SUPER_ADMIN
**Feature:** F05

**Request Body:** None

**Success Response (200):**
```json
{
  "success": true,
  "data": {
    "quiz_id": "quiz-uuid-1",
    "generation_status": "APPROVED",
    "approved_by": "mentor-uuid-1",
    "approved_at": "2026-04-14T14:00:00Z",
    "content_threshold_status": {
      "quiz_type": "QUICK_ASSESSMENT",
      "approved_count": 6,
      "minimum_required": 5,
      "threshold_met": true
    }
  },
  "message": "Question approved"
}
```

**Error Responses:**

| Code | Error Code | Condition |
|------|-----------|-----------|
| 400 | ALREADY_APPROVED | Question already approved |
| 404 | QUIZ_NOT_FOUND | Quiz ID does not exist |

---

## 7.3 POST /api/quizzes/batch-approve

**Access:** MENTOR, ADMIN, SUPER_ADMIN
**Feature:** F05

**Request Body:**
```json
{
  "quiz_ids": ["quiz-uuid-1", "quiz-uuid-2", "quiz-uuid-3"]
}
```

**Validation Rules:**
```
quiz_ids : required | array | min:1 | max:50
           Each item: UUID
```

**Success Response (200):**
```json
{
  "success": true,
  "data": {
    "approved_count": 3,
    "failed_count": 0,
    "threshold_updates": [
      {
        "content_id": "content-uuid-1",
        "quiz_type": "QUICK_ASSESSMENT",
        "approved_count": 8,
        "threshold_met": true
      }
    ]
  },
  "message": "3 questions approved"
}
```

---

## 7.4 PUT /api/quizzes/:quizId

**Access:** MENTOR, ADMIN, SUPER_ADMIN
**Feature:** F05

**Description:** Edit a quiz question. Does NOT automatically
approve — mentor must call approve after editing.

**Request Body (all optional, at least one required):**
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

**Validation Rules:**
```
question_text       : optional | string | min:10 | max:500
options             : optional | array | length:4
                      Each: string | min:2 | max:300
correct_option_index: optional | integer | between:0,3
cognitive_level     : optional | in:RECALL,COMPREHENSION,
                      APPLICATION,ANALYSIS
difficulty          : optional | in:EASY,MEDIUM,HARD
explanation         : optional | string | max:1000 | nullable
```

**Success Response (200):**
```json
{
  "success": true,
  "data": {
    "quiz_id": "quiz-uuid-1",
    "question_text": "Updated question text?",
    "was_edited": true,
    "generation_status": "PENDING_REVIEW",
    "updated_at": "2026-04-14T14:25:00Z"
  },
  "message": "Question updated. Approve to make it available."
}
```

---

## 7.5 POST /api/quizzes/:quizId/reject

**Access:** MENTOR, ADMIN, SUPER_ADMIN
**Feature:** F05

**Request Body:**
```json
{
  "reason": "FACTUALLY_INCORRECT"
}
```

**Valid reason values:**
```
FACTUALLY_INCORRECT | POORLY_WORDED | OFF_TOPIC |
TOO_EASY | TOO_HARD | DUPLICATE | OTHER
```

**Success Response (200):**
```json
{
  "success": true,
  "data": {
    "quiz_id": "quiz-uuid-1",
    "generation_status": "REJECTED",
    "rejection_reason": "FACTUALLY_INCORRECT",
    "content_threshold_status": {
      "quiz_type": "QUICK_ASSESSMENT",
      "approved_count": 4,
      "minimum_required": 5,
      "threshold_met": false
    }
  },
  "message": "Question rejected"
}
```

**Error Responses:**

| Code | Error Code | Condition |
|------|-----------|-----------|
| 400 | INVALID_REJECTION_REASON | Reason not in allowed list |

---

## 7.6 POST /api/quizzes/:quizId/revoke-approval

**Access:** MENTOR, ADMIN, SUPER_ADMIN
**Feature:** F05

**Description:** Revoke approval and return question to
PENDING_REVIEW. Only possible if no students have answered it.

**Request Body:** None

**Success Response (200):**
```json
{
  "success": true,
  "data": {
    "quiz_id": "quiz-uuid-1",
    "generation_status": "PENDING_REVIEW"
  },
  "message": "Approval revoked. Question returned to review queue."
}
```

**Error Responses:**

| Code | Error Code | Condition |
|------|-----------|-----------|
| 400 | CANNOT_REVOKE_ANSWERED_QUESTION | Students have answered |
| 400 | NOT_APPROVED | Question is not currently approved |

---

## 7.7 POST /api/content/:contentId/quizzes/manual

**Access:** MENTOR, ADMIN, SUPER_ADMIN
**Feature:** F05

**Description:** Manually create a quiz question. Auto-approved
immediately (no review needed — creator implicitly approves).

**Request Body:**
```json
{
  "quiz_type": "QUICK_ASSESSMENT",
  "question_text": "What does require() return in Node.js?",
  "options": [
    "The module's exported object",
    "A Promise that resolves on load",
    "A string of the module's source",
    "A boolean indicating success"
  ],
  "correct_option_index": 0,
  "cognitive_level": "RECALL",
  "difficulty": "EASY",
  "explanation": "require() synchronously loads a module..."
}
```

**Success Response (201):**
```json
{
  "success": true,
  "data": {
    "quiz_id": "quiz-uuid-new",
    "generation_status": "APPROVED",
    "is_ai_generated": false,
    "content_threshold_status": {
      "quiz_type": "QUICK_ASSESSMENT",
      "approved_count": 5,
      "minimum_required": 5,
      "threshold_met": true
    }
  },
  "message": "Question created and approved"
}
```

---

## 7.8 GET /api/content/:contentId/quizzes/approved

**Access:** MENTOR, ADMIN, SUPER_ADMIN
**Feature:** F05

**Description:** View all approved questions for a content
item. Used by mentors to manage the approved question set.

**Query Parameters:**
```
quiz_type : QUICK_ASSESSMENT | RETENTION
```

**Success Response (200):**
```json
{
  "success": true,
  "data": {
    "quiz_type": "QUICK_ASSESSMENT",
    "approved_count": 8,
    "minimum_required": 5,
    "threshold_met": true,
    "questions": [
      {
        "quiz_id": "quiz-uuid-1",
        "question_text": "What is the primary purpose...",
        "options": ["Option A", "Option B", "Option C", "Option D"],
        "correct_option_index": 0,
        "cognitive_level": "RECALL",
        "difficulty": "MEDIUM",
        "is_ai_generated": true,
        "was_edited": false,
        "approved_at": "2026-04-14T14:00:00Z"
      }
    ]
  }
}
```

---

## 7.9 GET /api/batches/:batchId/quizzes/review-stats

**Access:** MENTOR, ADMIN, SUPER_ADMIN
**Feature:** F05

**Description:** Quality analytics for quiz generation in
the batch — approval rates, rejection reasons by category.

**Success Response (200):**
```json
{
  "success": true,
  "data": {
    "overall": {
      "total_generated": 180,
      "total_approved_without_edit": 112,
      "total_approved_with_edit": 38,
      "total_rejected": 30,
      "approval_rate_without_edit": 62.2,
      "overall_approval_rate": 83.3
    },
    "rejection_breakdown": {
      "FACTUALLY_INCORRECT": 10,
      "POORLY_WORDED": 8,
      "OFF_TOPIC": 5,
      "TOO_EASY": 4,
      "TOO_HARD": 2,
      "DUPLICATE": 1,
      "OTHER": 0
    },
    "by_cognitive_level": {
      "RECALL": { "generated": 60, "approved": 54, "approval_rate": 90.0 },
      "COMPREHENSION": { "generated": 60, "approved": 52, "approval_rate": 86.7 },
      "APPLICATION": { "generated": 42, "approved": 32, "approval_rate": 76.2 },
      "ANALYSIS": { "generated": 18, "approved": 12, "approval_rate": 66.7 }
    }
  }
}
```

---

## 7.10 GET /api/content/:contentId/quizzes/status

**Access:** STUDENT, MENTOR, ADMIN
**Feature:** F07

**Description:** Check quiz availability and the student's
completion status for a content item. Called when student
opens a content detail page.

**Success Response (200):**
```json
{
  "success": true,
  "data": {
    "content_id": "content-uuid-1",
    "content_title": "Introduction to Node.js",
    "quick_assessment": {
      "available": true,
      "available_since": "2026-04-02T10:00:00Z",
      "question_count": 10,
      "student_attempt": {
        "completed": true,
        "score_percentage": 70.0,
        "correct_answers": 7,
        "total_questions": 10,
        "completed_at": "2026-04-02T11:30:00Z",
        "attempt_id": "attempt-uuid-1"
      }
    },
    "retention": {
      "available": false,
      "available_at": "2026-04-05T10:00:00Z",
      "question_count": 14,
      "requires_quick_assessment_first": true,
      "quick_assessment_completed": true,
      "student_attempt": null
    }
  }
}
```

---

## 7.11 GET /api/content/:contentId/quizzes/available

**Access:** STUDENT
**Feature:** F07

**Description:** Fetch quiz questions for a student to take.
Returns questions with randomized option order — each student
gets a different order for the same questions.

**Query Parameters:**
```
quiz_type : required | QUICK_ASSESSMENT | RETENTION
```

**Success Response (200):**
```json
{
  "success": true,
  "data": {
    "quiz_session": {
      "content_id": "content-uuid-1",
      "content_title": "Introduction to Node.js",
      "quiz_type": "QUICK_ASSESSMENT",
      "total_questions": 10,
      "estimated_minutes": 10
    },
    "questions": [
      {
        "quiz_id": "quiz-uuid-1",
        "question_text": "What is the primary purpose of the
                         event loop in Node.js?",
        "options": [
          "To manage memory allocation for JavaScript objects",
          "To allow Node.js to handle multiple I/O operations",
          "To compile JavaScript to machine code",
          "To synchronize multiple Node.js processes"
        ],
        "display_order": [1, 0, 2, 3],
        "question_number": 1
      }
    ]
  }
}
```

**Error Responses:**

| Code | Error Code | Condition |
|------|-----------|-----------|
| 403 | PREREQUISITE_NOT_MET | Retention attempted before Quick |
| 403 | NOT_ENROLLED | Student not in batch |
| 404 | NO_QUIZZES_AVAILABLE | Below minimum threshold |
| 409 | QUIZ_ALREADY_SUBMITTED | Student already completed |

---

# 8. Quiz Taking Endpoints

## 8.1 POST /api/quizzes/submit

**Access:** STUDENT
**Feature:** F07

**Description:** Submit all quiz responses in a single atomic
operation. Idempotent — submitting same attempt_id twice
returns first result without creating duplicates.

**Request Body:**
```json
{
  "content_id": "content-uuid-1",
  "quiz_type": "QUICK_ASSESSMENT",
  "attempt_id": "new-uuid-generated-by-client",
  "started_at": "2026-04-02T11:00:00Z",
  "responses": [
    {
      "quiz_id": "quiz-uuid-1",
      "selected_display_index": 1,
      "time_to_answer_seconds": 45
    },
    {
      "quiz_id": "quiz-uuid-2",
      "selected_display_index": 0,
      "time_to_answer_seconds": 23
    }
  ],
  "display_orders": {
    "quiz-uuid-1": [1, 0, 2, 3],
    "quiz-uuid-2": [2, 3, 0, 1]
  }
}
```

**Validation Rules:**
```
content_id      : required | UUID
quiz_type       : required | in:QUICK_ASSESSMENT,RETENTION
attempt_id      : required | UUID
started_at      : required | ISO 8601 datetime
responses       : required | array | min:1 | max:50
display_orders  : required | object (quiz_id → array of 4 integers)

Each response:
  quiz_id                : required | UUID
  selected_display_index : required | integer | between:0,3
  time_to_answer_seconds : optional | integer | min:0 | max:3600
```

**Success Response (200):**
```json
{
  "success": true,
  "data": {
    "attempt_id": "new-uuid-generated-by-client",
    "quiz_type": "QUICK_ASSESSMENT",
    "content_title": "Introduction to Node.js",
    "score": {
      "correct_answers": 7,
      "total_questions": 10,
      "score_percentage": 70.0,
      "time_taken_seconds": 487
    },
    "results": [
      {
        "quiz_id": "quiz-uuid-1",
        "question_text": "What is the primary purpose...",
        "your_answer": "To manage memory allocation",
        "correct_answer": "To allow Node.js to handle multiple I/O...",
        "is_correct": false,
        "explanation": "The event loop enables Node.js..."
      }
    ]
  },
  "message": "Quiz submitted successfully"
}
```

**Error Responses:**

| Code | Error Code | Condition |
|------|-----------|-----------|
| 400 | INCOMPLETE_SUBMISSION | Missing responses for some questions |
| 400 | INVALID_QUIZ_IDS | Quiz IDs don't belong to this content |
| 403 | PREREQUISITE_NOT_MET | Quick Assessment not done yet |
| 409 | QUIZ_ALREADY_SUBMITTED | Different attempt_id, same quiz |

---

## 8.2 GET /api/students/:studentId/quiz-history

**Access:** STUDENT (own), MENTOR, ADMIN
**Feature:** F07

**Query Parameters:**
```
content_id : filter by content
quiz_type  : QUICK_ASSESSMENT | RETENTION
batch_id   : filter by batch
page       : page number
limit      : results per page (default: 20)
```

**Success Response (200):**
```json
{
  "success": true,
  "data": {
    "attempts": [
      {
        "attempt_id": "attempt-uuid-1",
        "content_id": "content-uuid-1",
        "content_title": "Introduction to Node.js",
        "quiz_type": "QUICK_ASSESSMENT",
        "score_percentage": 70.0,
        "correct_answers": 7,
        "total_questions": 10,
        "time_taken_seconds": 487,
        "completed_at": "2026-04-02T11:30:00Z"
      }
    ],
    "summary": {
      "total_quizzes_taken": 8,
      "average_score": 74.5,
      "highest_score": 90.0,
      "lowest_score": 50.0,
      "total_time_minutes": 87
    }
  },
  "pagination": { "page": 1, "limit": 20, "total": 8, "total_pages": 1 }
}
```

---

## 8.3 GET /api/quiz-attempts/:attemptId/detail

**Access:** STUDENT (own), MENTOR, ADMIN
**Feature:** F07

**Description:** Fetch per-question breakdown for a completed
quiz attempt.

**Success Response (200):**
```json
{
  "success": true,
  "data": {
    "attempt_id": "attempt-uuid-1",
    "content_title": "Introduction to Node.js",
    "quiz_type": "QUICK_ASSESSMENT",
    "score_percentage": 70.0,
    "correct_answers": 7,
    "total_questions": 10,
    "time_taken_seconds": 487,
    "completed_at": "2026-04-02T11:30:00Z",
    "responses": [
      {
        "question_number": 1,
        "question_text": "What is the primary purpose...",
        "all_options": ["Option A", "Option B", "Option C", "Option D"],
        "your_answer_index": 1,
        "your_answer_text": "To manage memory allocation",
        "correct_answer_index": 0,
        "correct_answer_text": "To allow Node.js to handle...",
        "is_correct": false,
        "time_to_answer_seconds": 45,
        "cognitive_level": "RECALL",
        "explanation": "The event loop enables..."
      }
    ]
  }
}
```

---

## 8.4 GET /api/batches/:batchId/quiz-analytics

**Access:** MENTOR, ADMIN, SUPER_ADMIN
**Feature:** F07

**Description:** Batch-level quiz performance analytics for
the mentor dashboard.

**Success Response (200):**
```json
{
  "success": true,
  "data": {
    "overall": {
      "total_quiz_attempts": 342,
      "average_score": 71.4,
      "completion_rate": 84.2
    },
    "by_content": [
      {
        "content_id": "content-uuid-1",
        "content_title": "Introduction to Node.js",
        "quick_assessment": {
          "attempts": 42,
          "average_score": 68.5,
          "completion_rate": 93.3
        },
        "retention": {
          "attempts": 38,
          "average_score": 72.1,
          "completion_rate": 84.4
        }
      }
    ],
    "score_distribution": {
      "0_to_50": 24,
      "51_to_70": 87,
      "71_to_85": 142,
      "86_to_100": 89
    },
    "struggling_students": [
      {
        "student_id": "student-uuid-3",
        "full_name": "Amit Singh",
        "average_score": 48.3,
        "quizzes_completed": 6
      }
    ]
  }
}
```

---

## 8.5 DELETE /api/content/:contentId/files/:fileId

**Access:** MENTOR, ADMIN, SUPER_ADMIN
**Feature:** F03

**Success Response (200):**
```json
{
  "success": true,
  "message": "File removed"
}
```

---

## 8.6 POST /api/content/:contentId/files/upload-url

**Access:** MENTOR, ADMIN, SUPER_ADMIN
**Feature:** F03

**Description:** Generate pre-signed URL for supplementary
file upload.

**Request Body:**
```json
{
  "filename": "nodejs-slides-week1.pdf",
  "mime_type": "application/pdf",
  "file_size_bytes": 2048000
}
```

**Success Response (200):**
```json
{
  "success": true,
  "data": {
    "upload_url": "https://s3.amazonaws.com/...",
    "file_id": "file-uuid-1",
    "s3_key": "files/batch-id/content-id/slides.pdf",
    "expires_in_seconds": 900
  }
}
```

---

# 9. Live Session Endpoints

## 9.1 POST /api/live-sessions

**Access:** MENTOR, ADMIN, SUPER_ADMIN
**Feature:** F06

**Request Body:**
```json
{
  "batch_id": "770f1234-a12b-43c5-d678-998877665544",
  "title": "Node.js Event Loop Deep Dive — Week 3",
  "description": "Deep dive into the call stack and event loop.",
  "scheduled_at": "2026-04-15T10:00:00Z",
  "estimated_duration_minutes": 90,
  "content_ids": ["content-uuid-1", "content-uuid-2"]
}
```

**Validation Rules:**
```
batch_id                   : required | UUID | exists:batches
                             | mentor must be assigned
title                      : required | string | min:3 | max:255
description                : optional | string | max:2000
scheduled_at               : required | ISO 8601 | at_least:15_minutes_future
estimated_duration_minutes : optional | integer | min:15 | max:480
content_ids                : optional | array of UUIDs
                             Each: exists:content | same batch
```

**Success Response (201):**
```json
{
  "success": true,
  "data": {
    "session_id": "990h3456-c34d-65e7-f890-110099887766",
    "title": "Node.js Event Loop Deep Dive — Week 3",
    "scheduled_at": "2026-04-15T10:00:00Z",
    "status": "SCHEDULED",
    "streaming_provider": "MUX"
  },
  "message": "Session scheduled. Students have been notified."
}
```

**Error Responses:**

| Code | Error Code | Condition |
|------|-----------|-----------|
| 400 | INVALID_SCHEDULED_TIME | Less than 15 minutes in future |
| 409 | SESSION_TIME_CONFLICT | Another session within 30 minutes |

---

## 9.2 GET /api/batches/:batchId/live-sessions

**Access:** Enrolled students and assigned mentors
**Feature:** F06

**Query Parameters:**
```
status   : SCHEDULED | LIVE | COMPLETED | CANCELLED | MISSED
upcoming : boolean — only future sessions
past     : boolean — only past sessions
page     : page number
limit    : results per page (default: 20)
```

**Success Response (200):**
```json
{
  "success": true,
  "data": {
    "sessions": [
      {
        "session_id": "990h3456-c34d-65e7-f890-110099887766",
        "title": "Node.js Event Loop Deep Dive",
        "scheduled_at": "2026-04-15T10:00:00Z",
        "estimated_duration_minutes": 90,
        "status": "SCHEDULED",
        "mentor": {
          "mentor_id": "mentor-uuid-1",
          "full_name": "Arjun Nair",
          "avatar_url": null
        },
        "is_live": false,
        "recording_available": false,
        "my_attendance": null
      }
    ]
  },
  "pagination": { "page": 1, "limit": 20, "total": 6, "total_pages": 1 }
}
```

---

## 9.3 GET /api/live-sessions/:sessionId

**Access:** Enrolled students and assigned mentors
**Feature:** F06

**Note:** stream_key is ONLY returned to the owning mentor.
Never returned to students.

**Success Response (200) — for LIVE session:**
```json
{
  "success": true,
  "data": {
    "session_id": "990h3456-c34d-65e7-f890-110099887766",
    "title": "Node.js Event Loop Deep Dive",
    "scheduled_at": "2026-04-15T10:00:00Z",
    "started_at": "2026-04-15T10:03:00Z",
    "status": "LIVE",
    "playback_url": "https://stream.mux.com/abc123.m3u8",
    "estimated_duration_minutes": 90,
    "mentor": { "mentor_id": "...", "full_name": "Arjun Nair" },
    "current_viewer_count": 38,
    "my_attendance": {
      "status": "ATTENDING",
      "joined_at": "2026-04-15T10:05:00Z"
    }
  }
}
```

---

## 9.4 PUT /api/live-sessions/:sessionId

**Access:** MENTOR (owner), ADMIN, SUPER_ADMIN
**Feature:** F06

**Request Body (all optional):**
```json
{
  "title": "Updated Session Title",
  "description": "Updated agenda...",
  "scheduled_at": "2026-04-15T11:00:00Z",
  "estimated_duration_minutes": 120,
  "content_ids": ["content-uuid-1"]
}
```

**Business Rules:**
- Cannot update scheduled_at once LIVE or COMPLETED
- Updating scheduled_at notifies students

---

## 9.5 POST /api/live-sessions/:sessionId/cancel

**Access:** MENTOR (owner), ADMIN, SUPER_ADMIN
**Feature:** F06

**Request Body:**
```json
{
  "reason": "Mentor unavailable due to schedule conflict"
}
```

**Success Response (200):**
```json
{
  "success": true,
  "data": { "session_id": "...", "status": "CANCELLED" },
  "message": "Session cancelled. Students have been notified."
}
```

**Error Responses:**

| Code | Error Code | Condition |
|------|-----------|-----------|
| 400 | CANNOT_CANCEL_LIVE | Cannot cancel a live session |

---

## 9.6 POST /api/live-sessions/:sessionId/start

**Access:** MENTOR (owner only), SUPER_ADMIN
**Feature:** F06

**Request Body:** None

**Success Response (200):**
```json
{
  "success": true,
  "data": {
    "session_id": "...",
    "status": "LIVE",
    "started_at": "2026-04-15T10:03:00Z",
    "stream_key": "live_abc123xyz789_stream_key",
    "playback_url": "https://stream.mux.com/abc123.m3u8",
    "streaming_instructions": {
      "rtmp_url": "rtmps://global-live.mux.com:443/app",
      "stream_key": "live_abc123xyz789_stream_key",
      "recommended_settings": {
        "video_bitrate_kbps": 3000,
        "audio_bitrate_kbps": 128,
        "resolution": "1280x720",
        "fps": 30
      }
    }
  },
  "message": "Stream started. Students have been notified."
}
```

**Error Responses:**

| Code | Error Code | Condition |
|------|-----------|-----------|
| 400 | TOO_EARLY_TO_START | More than 15 min before scheduled |
| 400 | INVALID_SESSION_STATUS | Session not in SCHEDULED status |
| 409 | SESSION_ALREADY_LIVE | Another session live for this batch |
| 502 | STREAMING_PROVIDER_ERROR | Mux/Agora API failed |

---

## 9.7 POST /api/live-sessions/:sessionId/end

**Access:** MENTOR (owner only), SUPER_ADMIN
**Feature:** F06

**Request Body:** None

**Success Response (200):**
```json
{
  "success": true,
  "data": {
    "session_id": "...",
    "status": "COMPLETED",
    "ended_at": "2026-04-15T11:32:00Z",
    "actual_duration_minutes": 89,
    "attendance_summary": {
      "total_enrolled": 45,
      "attended_live": 38,
      "absent": 7
    }
  },
  "message": "Session ended. Recording will be available within 10 minutes."
}
```

---

## 9.8 POST /api/live-sessions/:sessionId/join

**Access:** STUDENT
**Feature:** F06

**Request Body:** None

**Success Response (200):**
```json
{
  "success": true,
  "data": {
    "session_id": "...",
    "playback_url": "https://stream.mux.com/abc123.m3u8",
    "joined_at": "2026-04-15T10:05:00Z",
    "session_title": "Node.js Event Loop Deep Dive",
    "mentor_name": "Arjun Nair"
  }
}
```

**Error Responses:**

| Code | Error Code | Condition |
|------|-----------|-----------|
| 400 | SESSION_NOT_LIVE | Session is not currently live |
| 403 | NOT_ENROLLED | Student not in batch |

---

## 9.9 POST /api/live-sessions/:sessionId/leave

**Access:** STUDENT
**Feature:** F06

**Request Body:** None

**Success Response (200):**
```json
{
  "success": true,
  "data": {
    "session_id": "...",
    "left_at": "2026-04-15T11:30:00Z",
    "duration_seconds": 5100,
    "duration_minutes": 85
  }
}
```

---

## 9.10 POST /api/live-sessions/:sessionId/heartbeat

**Access:** STUDENT
**Feature:** F06

**Description:** Periodic ping every 30 seconds confirming
student is still watching. Returns session status so frontend
knows if session has ended.

**Request Body:** None

**Success Response (200):**
```json
{
  "success": true,
  "data": {
    "session_status": "LIVE"
  }
}
```

---

## 9.11 GET /api/live-sessions/:sessionId/attendance

**Access:** MENTOR, ADMIN, SUPER_ADMIN
**Feature:** F06

**Success Response (200):**
```json
{
  "success": true,
  "data": {
    "session_id": "...",
    "session_title": "Node.js Event Loop Deep Dive",
    "total_enrolled": 45,
    "attended_live": 38,
    "attended_recording": 4,
    "absent": 3,
    "average_duration_minutes": 82,
    "attendance_records": [
      {
        "student_id": "student-uuid-1",
        "full_name": "Rahul Sharma",
        "status": "ATTENDED",
        "joined_at": "2026-04-15T10:02:00Z",
        "left_at": "2026-04-15T11:32:00Z",
        "duration_seconds": 5400,
        "duration_minutes": 90
      }
    ]
  }
}
```

---

# 10. Progress and Dashboard Endpoints

## 10.1 GET /api/students/me/dashboard

**Access:** STUDENT
**Feature:** F08

**Description:** Complete dashboard data for the authenticated
student — current scores, history, quiz performance, content
engagement, attendance, and insights.

**Success Response (200):**
```json
{
  "success": true,
  "data": {
    "student": {
      "student_id": "student-uuid-1",
      "full_name": "Rahul Sharma",
      "avatar_url": null,
      "enrolled_at": "2026-03-21T10:00:00Z"
    },
    "batch": {
      "batch_id": "batch-uuid-1",
      "name": "Full Stack Development Batch Jan 2026",
      "current_week": 3,
      "total_weeks": 8,
      "weeks_remaining": 5,
      "mentor_name": "Arjun Nair"
    },
    "current_scores": {
      "week_number": 3,
      "overall_score": 68.4,
      "learning_velocity": 72.5,
      "content_engagement": 65.0,
      "problem_solving": 58.3,
      "knowledge_retention": 70.1,
      "consistency": 80.0,
      "curiosity": 55.0,
      "communication": 60.0,
      "error_recovery": 74.2,
      "conceptual_depth": 62.5,
      "calculated_at": "2026-04-14T02:00:00Z"
    },
    "previous_scores": {
      "week_number": 2,
      "overall_score": 61.2
    },
    "score_history": [
      { "week_number": 1, "overall_score": 55.0 },
      { "week_number": 2, "overall_score": 61.2 },
      { "week_number": 3, "overall_score": 68.4 }
    ],
    "insights": [
      {
        "type": "STRENGTH",
        "dimension": "consistency",
        "title": "Strong consistency",
        "message": "You have completed 80% of scheduled
                   activities on time..."
      }
    ],
    "quiz_history": [
      {
        "attempt_id": "attempt-uuid-1",
        "content_title": "Introduction to Node.js",
        "quiz_type": "QUICK_ASSESSMENT",
        "score_percentage": 70.0,
        "completed_at": "2026-04-02T11:30:00Z"
      }
    ],
    "content_engagement": {
      "total_content_items": 8,
      "completed": 5,
      "in_progress": 2,
      "not_started": 1,
      "completion_rate": 62.5
    },
    "session_attendance": {
      "total_sessions": 4,
      "attended_live": 3,
      "attended_recording": 0,
      "absent": 1,
      "attendance_rate": 75.0
    }
  }
}
```

---

## 10.2 GET /api/students/me/progress/history

**Access:** STUDENT
**Feature:** F08

**Success Response (200):**
```json
{
  "success": true,
  "data": {
    "history": [
      {
        "week_number": 1,
        "overall_score": 55.0,
        "learning_velocity": 50.0,
        "content_engagement": 60.0,
        "problem_solving": 45.0,
        "knowledge_retention": 0,
        "consistency": 70.0,
        "curiosity": 40.0,
        "communication": 55.0,
        "error_recovery": 65.0,
        "conceptual_depth": 48.0,
        "calculated_at": "2026-04-07T02:00:00Z"
      }
    ]
  }
}
```

---

## 10.3 GET /api/students/:studentId/dashboard

**Access:** MENTOR (student in batch), ADMIN, SUPER_ADMIN
**Feature:** F08

**Description:** Mentor views a specific student's full dashboard.
Same response structure as GET /api/students/me/dashboard.

---

## 10.4 GET /api/students/:studentId/dimensions/:dimension

**Access:** STUDENT (own), MENTOR, ADMIN
**Feature:** F08

**Valid dimension values:**
```
learning_velocity | content_engagement | problem_solving |
knowledge_retention | consistency | curiosity | communication |
error_recovery | conceptual_depth
```

**Success Response (200):**
```json
{
  "success": true,
  "data": {
    "dimension": "learning_velocity",
    "current_score": 72.5,
    "score_label": "Good",
    "description": "Measures how quickly you are improving
                   your quiz performance over time.",
    "how_calculated": "Calculated from the slope of your quiz
                      scores over the past 4 weeks.",
    "history": [
      { "week": 1, "score": 50.0 },
      { "week": 2, "score": 65.0 },
      { "week": 3, "score": 72.5 }
    ],
    "contributing_data": {
      "quiz_scores_this_week": [70.0, 85.0, 60.0],
      "average_this_week": 71.7,
      "improvement_from_week_1": 22.5
    },
    "improvement_tip": "Continue completing quizzes promptly
                       after watching content."
  }
}
```

**Error Responses:**

| Code | Error Code | Condition |
|------|-----------|-----------|
| 400 | INVALID_DIMENSION | Dimension name not recognized |

---

## 10.5 GET /api/batches/:batchId/students/progress

**Access:** MENTOR, ADMIN, SUPER_ADMIN
**Feature:** F08

**Query Parameters:**
```
sort_by  : dimension to sort by (default: overall_score)
sort_dir : asc | desc (default: desc)
search   : search by student name
flagged  : boolean — show only flagged students
page     : page number
limit    : results per page (default: 50)
```

**Success Response (200):**
```json
{
  "success": true,
  "data": {
    "batch_summary": {
      "total_students": 45,
      "active_students": 42,
      "flagged_students": 4,
      "batch_average_score": 67.3,
      "current_week": 3
    },
    "students": [
      {
        "student_id": "student-uuid-1",
        "full_name": "Rahul Sharma",
        "email": "rahul@example.com",
        "last_active": "2026-04-14T09:30:00Z",
        "is_flagged": false,
        "alerts": [],
        "progress": {
          "week_number": 3,
          "overall_score": 68.4,
          "learning_velocity": 72.5,
          "content_engagement": 65.0,
          "problem_solving": 58.3,
          "knowledge_retention": 70.1,
          "consistency": 80.0,
          "curiosity": 55.0,
          "communication": 60.0,
          "error_recovery": 74.2,
          "conceptual_depth": 62.5
        }
      }
    ]
  },
  "pagination": { "page": 1, "limit": 50, "total": 45, "total_pages": 1 }
}
```

---

## 10.6 GET /api/batches/:batchId/alerts

**Access:** MENTOR, ADMIN, SUPER_ADMIN
**Feature:** F08

**Success Response (200):**
```json
{
  "success": true,
  "data": {
    "total_unresolved": 6,
    "alerts": [
      {
        "alert_id": "alert-uuid-1",
        "student_id": "student-uuid-3",
        "student_name": "Amit Singh",
        "alert_type": "INACTIVE",
        "severity": "WARNING",
        "message": "Amit Singh has not logged in for 3 days",
        "metadata": {
          "last_login": "2026-04-11T14:00:00Z",
          "days_inactive": 3
        },
        "created_at": "2026-04-14T02:00:00Z"
      }
    ]
  }
}
```

---

## 10.7 POST /api/batches/:batchId/alerts/:alertId/resolve

**Access:** MENTOR, ADMIN, SUPER_ADMIN
**Feature:** F08

**Request Body:**
```json
{
  "resolution_note": "Spoke with student — was unwell. Will catch up."
}
```

**Success Response (200):**
```json
{
  "success": true,
  "data": {
    "alert_id": "alert-uuid-1",
    "is_resolved": true,
    "resolved_at": "2026-04-14T10:30:00Z"
  },
  "message": "Alert resolved"
}
```

---

## 10.8 PATCH /api/live-sessions/:sessionId/recording-progress

**Access:** STUDENT
**Feature:** F06

**Description:** Update recording watch progress for a
completed session's recording.

**Request Body:**
```json
{
  "current_position_seconds": 2400,
  "session_watch_time_seconds": 30
}
```

**Success Response (200):**
```json
{
  "success": true,
  "data": {
    "recording_watch_percentage": 45.8,
    "attendance_status": "ATTENDED_RECORDING"
  }
}
```

---

## 10.9 POST /api/admin/batches/:batchId/recalculate-metrics

**Access:** ADMIN, SUPER_ADMIN
**Feature:** F09

**Description:** Manually trigger a full metrics recalculation
for all students in a batch.

**Request Body:** None

**Success Response (200):**
```json
{
  "success": true,
  "message": "Metrics recalculation queued for batch.
              Results will be available within 5 minutes."
}
```

---

## 10.10 GET /api/batches/:batchId/metrics-log

**Access:** ADMIN, SUPER_ADMIN
**Feature:** F09

**Description:** View recent metrics calculation runs for
a batch — for monitoring job health.

**Success Response (200):**
```json
{
  "success": true,
  "data": {
    "logs": [
      {
        "run_id": "run-uuid-1",
        "run_type": "NIGHTLY_BATCH",
        "students_processed": 45,
        "students_failed": 0,
        "duration_ms": 3240,
        "started_at": "2026-04-14T02:00:00Z",
        "completed_at": "2026-04-14T02:00:03Z"
      }
    ]
  }
}
```

---

# 11. Notification Endpoints

## 11.1 GET /api/notifications

**Access:** Authenticated (any role)
**Feature:** F10

**Query Parameters:**
```
page   : page number (default: 1)
limit  : results per page (default: 20, max: 50)
unread : boolean — only unread notifications
type   : filter by notification type
```

**Success Response (200):**
```json
{
  "success": true,
  "data": {
    "notifications": [
      {
        "notification_id": "notif-uuid-1",
        "type": "QUIZZES_READY_FOR_REVIEW",
        "title": "Quizzes Ready for Review",
        "message": "8 questions ready for 'Introduction to Node.js'",
        "metadata": {
          "content_id": "content-uuid-1",
          "quiz_count": 8
        },
        "action_url": "/mentor/batches/.../review",
        "is_read": false,
        "created_at": "2026-04-14T12:30:00Z",
        "time_ago": "2 hours ago"
      }
    ],
    "unread_count": 5,
    "has_more": false
  },
  "pagination": { "page": 1, "limit": 20, "total": 8, "total_pages": 1 }
}
```

---

## 11.2 GET /api/notifications/unread-count

**Access:** Authenticated (any role)
**Feature:** F10

**Description:** Fetch unread count only. Used for bell badge
without fetching full list.

**Success Response (200):**
```json
{
  "success": true,
  "data": {
    "unread_count": 5
  }
}
```

---

## 11.3 POST /api/notifications/:notificationId/read

**Access:** Authenticated (own notifications)
**Feature:** F10

**Request Body:** None

**Success Response (200):**
```json
{
  "success": true,
  "data": {
    "notification_id": "notif-uuid-1",
    "is_read": true,
    "read_at": "2026-04-14T14:30:00Z"
  }
}
```

**Error Responses:**

| Code | Error Code | Condition |
|------|-----------|-----------|
| 404 | NOTIFICATION_NOT_FOUND | Notification not found or belongs to another user |

---

## 11.4 POST /api/notifications/mark-all-read

**Access:** Authenticated (any role)
**Feature:** F10

**Request Body:** None

**Success Response (200):**
```json
{
  "success": true,
  "data": { "marked_count": 5 },
  "message": "5 notifications marked as read"
}
```

---

## 11.5 DELETE /api/notifications/:notificationId

**Access:** Authenticated (own notifications)
**Feature:** F10

**Success Response (200):**
```json
{
  "success": true,
  "message": "Notification deleted"
}
```

---

## 11.6 DELETE /api/notifications/clear-all

**Access:** Authenticated (any role)
**Feature:** F10

**Description:** Delete all READ notifications. Unread
notifications are NOT deleted.

**Success Response (200):**
```json
{
  "success": true,
  "data": { "deleted_count": 12 },
  "message": "12 read notifications cleared"
}
```

---

# 12. Admin Utility Endpoints

## 12.1 GET /api/health

**Access:** Public
**Feature:** System

**Description:** Server health check for monitoring systems.

**Success Response (200):**
```json
{
  "status": "ok",
  "timestamp": "2026-04-14T10:30:00Z",
  "version": "1.0.0",
  "environment": "production"
}
```

---

## 12.2 GET /api/health/db

**Access:** ADMIN, SUPER_ADMIN

**Description:** Database connection health check.

**Success Response (200):**
```json
{
  "status": "ok",
  "latency_ms": 12,
  "timestamp": "2026-04-14T10:30:00Z"
}
```

---

## 12.3 GET /api/health/queues

**Access:** ADMIN, SUPER_ADMIN

**Description:** Bull queue health — job counts per queue.

**Success Response (200):**
```json
{
  "success": true,
  "data": {
    "content_processing": {
      "waiting": 2,
      "active": 1,
      "completed": 145,
      "failed": 3
    },
    "metrics_calculation": {
      "waiting": 0,
      "active": 0,
      "completed": 890,
      "failed": 0
    },
    "session_processing": {
      "waiting": 1,
      "active": 0,
      "completed": 28,
      "failed": 0
    }
  }
}
```

---

## 12.4 POST /api/admin/cleanup

**Access:** SUPER_ADMIN only

**Description:** Manually trigger data cleanup jobs —
expired tokens, old login attempts, old notifications.
Normally run by cron but can be triggered manually.

**Request Body:**
```json
{
  "jobs": ["refresh_tokens", "login_attempts", "notifications"]
}
```

**Success Response (200):**
```json
{
  "success": true,
  "data": {
    "refresh_tokens_deleted": 142,
    "login_attempts_deleted": 2847,
    "notifications_deleted": 891
  },
  "message": "Cleanup completed"
}
```

---

# 13. Error Code Reference

Complete list of all error codes used across all endpoints.

## 13.1 Authentication Errors (4xx)

| Code | HTTP | Description |
|------|------|-------------|
| AUTHENTICATION_REQUIRED | 401 | No token provided |
| TOKEN_EXPIRED | 401 | JWT access token expired |
| INVALID_TOKEN | 401 | JWT signature invalid |
| INVALID_REFRESH_TOKEN | 401 | Refresh token invalid/expired/revoked |
| INVALID_CREDENTIALS | 401 | Wrong email or password |
| ACCOUNT_DEACTIVATED | 403 | Account is deactivated |
| PERMISSION_DENIED | 403 | Role not permitted for this action |

## 13.2 Validation Errors (4xx)

| Code | HTTP | Description |
|------|------|-------------|
| VALIDATION_ERROR | 400 | Input fails validation rules |
| EMAIL_ALREADY_EXISTS | 409 | Email already registered |
| INVALID_REJECTION_REASON | 400 | Reason not in allowed list |
| INVALID_DIMENSION | 400 | Dimension name not recognized |
| INVALID_ARCHIVE_CONFIRMATION | 400 | Confirmation string incorrect |
| INVALID_DISPLAY_ORDER | 400 | Display order array malformed |
| INVALID_SCHEDULED_TIME | 400 | Session not 15+ min in future |
| INVALID_SESSION_STATUS | 400 | Operation not valid for current status |
| INCOMPLETE_SUBMISSION | 400 | Not all quiz questions answered |
| FILE_TOO_LARGE | 400 | File exceeds size limit |
| UNSUPPORTED_FILE_TYPE | 400 | MIME type not allowed |

## 13.3 Resource Errors (4xx)

| Code | HTTP | Description |
|------|------|-------------|
| USER_NOT_FOUND | 404 | User ID does not exist |
| BATCH_NOT_FOUND | 404 | Batch ID does not exist |
| CONTENT_NOT_FOUND | 404 | Content deleted or does not exist |
| QUIZ_NOT_FOUND | 404 | Quiz ID does not exist |
| ENROLLMENT_NOT_FOUND | 404 | Student not enrolled in batch |
| ATTENDANCE_NOT_FOUND | 404 | No active attendance record |
| NOTIFICATION_NOT_FOUND | 404 | Notification does not exist |
| SESSION_NOT_FOUND | 404 | Session ID does not exist |
| ALERT_NOT_FOUND | 404 | Alert ID does not exist |
| NOT_ENROLLED | 403/404 | Student not in batch |
| CONTENT_NOT_PUBLISHED | 403 | Student accessing draft content |
| NO_QUIZZES_AVAILABLE | 404 | Below minimum threshold |

## 13.4 Conflict Errors (4xx)

| Code | HTTP | Description |
|------|------|-------------|
| BATCH_NAME_EXISTS | 409 | Batch name already taken |
| ALREADY_WITHDRAWN | 400 | Student already withdrawn |
| ALREADY_APPROVED | 400 | Quiz already approved |
| NOT_APPROVED | 400 | Cannot revoke non-approved quiz |
| CANNOT_REVOKE_ANSWERED_QUESTION | 400 | Students answered this question |
| QUIZ_ALREADY_SUBMITTED | 409 | Student already completed quiz |
| PREREQUISITE_NOT_MET | 403 | Quick Assessment not done yet |
| SESSION_ALREADY_LIVE | 409 | Another session currently live |
| SESSION_TIME_CONFLICT | 409 | Scheduling conflict |
| CANNOT_CANCEL_LIVE | 400 | Cannot cancel active live session |
| STUDENT_ALREADY_IN_ACTIVE_BATCH | 400 | Phase One: one batch limit |
| CANNOT_CHANGE_START_DATE | 400 | Students enrolled |
| BATCH_ALREADY_ARCHIVED | 400 | Already archived |
| CANNOT_DEACTIVATE_LAST_SUPER_ADMIN | 400 | Platform safety check |
| TRANSCRIPTION_NOT_COMPLETE | 400 | Quiz generation needs transcript |
| GENERATION_IN_PROGRESS | 400 | Job already queued |
| TOO_EARLY_TO_START | 400 | Before 15-minute window |
| SESSION_NOT_LIVE | 400 | Session not currently live |
| UPLOAD_URL_EXPIRED | 400 | Pre-signed URL expired |

## 13.5 Rate Limiting Errors (4xx)

| Code | HTTP | Description |
|------|------|-------------|
| RATE_LIMIT_EXCEEDED | 429 | Too many requests |

## 13.6 Server Errors (5xx)

| Code | HTTP | Description |
|------|------|-------------|
| INTERNAL_SERVER_ERROR | 500 | Unexpected server error |
| STREAMING_PROVIDER_ERROR | 502 | Mux/Agora API unavailable |
| METRICS_CALCULATION_FAILED | 500 | Metrics job failed |
| QUIZ_GENERATION_FAILED | 500 | AI generation pipeline failed |

---

# 14. Rate Limiting Reference

## 14.1 Rate Limits by Endpoint Category

| Category | Limit | Window | Applies To |
|----------|-------|--------|-----------|
| Login attempts (by IP) | 5 failed | 1 minute | POST /api/auth/login |
| Login attempts (by account) | 10 failed | 15 minutes | POST /api/auth/login |
| General API | 200 requests | 1 minute | All authenticated endpoints |
| File upload URL generation | 20 requests | 1 hour | POST /api/content/upload-url |
| Quiz regeneration | 5 requests | 1 hour | POST /api/content/.../regenerate-quizzes |
| Progress updates | 120 requests | 1 hour | PATCH /api/content/.../progress |
| Heartbeat | 120 requests | 1 hour | POST /api/live-sessions/.../heartbeat |

## 14.2 Rate Limit Response Headers

When a rate limit is exceeded, the response includes:
```
HTTP/1.1 429 Too Many Requests
X-RateLimit-Limit: 200
X-RateLimit-Remaining: 0
X-RateLimit-Reset: 1744632600
Retry-After: 45
```

---

# 15. Authentication and Authorization Matrix

The following matrix shows which roles can access which
endpoint groups. ✓ = full access, P = partial access
(own data only), — = no access.

| Endpoint Group | STUDENT | MENTOR | ADMIN | SUPER_ADMIN |
|---------------|---------|--------|-------|-------------|
| Auth (own account) | ✓ | ✓ | ✓ | ✓ |
| User management | — | — | ✓ | ✓ |
| Batch CRUD | — | — | ✓ | ✓ |
| Batch enrollment | — | — | ✓ | ✓ |
| Batch mentor assignment | — | — | ✓ | ✓ |
| View batch details | P | P | ✓ | ✓ |
| View students in batch | — | P | ✓ | ✓ |
| Content upload | — | ✓ | ✓ | ✓ |
| Content management | — | P | ✓ | ✓ |
| Content viewing | ✓ | ✓ | ✓ | ✓ |
| Progress tracking | ✓ | — | — | — |
| Quiz review | — | ✓ | ✓ | ✓ |
| Quiz taking | ✓ | — | — | — |
| Quiz history (own) | ✓ | — | — | — |
| Quiz history (others) | — | P | ✓ | ✓ |
| Session scheduling | — | ✓ | ✓ | ✓ |
| Session start/end | — | P | — | ✓ |
| Session joining | ✓ | — | — | — |
| Attendance reports | — | ✓ | ✓ | ✓ |
| Dashboard (own) | ✓ | — | — | — |
| Dashboard (others) | — | P | ✓ | ✓ |
| Batch progress overview | — | P | ✓ | ✓ |
| Alerts management | — | P | ✓ | ✓ |
| Notifications (own) | ✓ | ✓ | ✓ | ✓ |
| Metrics recalculation | — | — | ✓ | ✓ |
| Health endpoints | Public | Public | ✓ | ✓ |
| Admin cleanup | — | — | — | ✓ |

**Notes on partial access (P):**
- MENTOR batch details: Only batches they are assigned to
- MENTOR content management: Only content they uploaded
- MENTOR session start/end: Only sessions they created
- MENTOR quiz history/dashboard: Only students in their batches
- MENTOR batch progress: Only their assigned batches
- MENTOR alerts: Only their assigned batches
- STUDENT dashboard: Own data only
- STUDENT quiz history: Own attempts only

---

**End of API Endpoints Sub-Document**

---

**Document Information**

| Field | Value |
|-------|-------|
| Sub-Document Title | M2i_LMS API Endpoints Sub-Document |
| Sub-Document Number | 03 of 05 |
| Version | 1.0 |
| Status | Ready for Development |
| Total Endpoints | 87 |
| Parent Document | M2i_LMS Master Product Documentation v1.0 |
| Created | March 2026 |
| Last Updated | March 2026 |
| Previous Sub-Document | M2i_LMS_Database_Schema.md |
| Next Sub-Document | M2i_LMS_Tech_Stack_SubDocument.md |
| Maintained By | Product Team |
| Repository | /docs/sub/M2i_LMS_API_Endpoints.md |