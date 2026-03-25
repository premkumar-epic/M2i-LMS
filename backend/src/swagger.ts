// backend/src/swagger.ts
// OpenAPI 3.0 specification for Swagger UI.
// Access at: http://localhost:3001/api-docs

export const swaggerSpec = {
  openapi: "3.0.0",
  info: {
    title: "M2i LMS API",
    version: "1.0.0",
    description: `
## M2i Learning Management System — API Documentation

This is the interactive API explorer. You can **test every endpoint directly from this page**.

### How to use:
1. **Register** a new user using \`POST /auth/register\`
2. **Login** using \`POST /auth/login\` — this sets a cookie automatically
3. All other endpoints will work once you are logged in

### Roles
| Role | What they can do |
|------|-----------------|
| STUDENT | View content, take quizzes, see own progress |
| MENTOR | Upload content, manage quizzes, view batch students |
| ADMIN | Manage users, batches, enrollments |
| SUPER_ADMIN | Everything ADMIN can do + system settings |

### Dev Credentials (all passwords: \`ChangeMe123!\`)
- \`admin@dev.com\` — ADMIN
- \`mentor@dev.com\` — MENTOR
- \`student1@dev.com\` — STUDENT
    `,
    contact: {
      name: "M2i LMS Dev Team",
    },
  },
  servers: [
    {
      url: "http://localhost:3001/api",
      description: "Local Development Server",
    },
  ],
  tags: [
    { name: "Health", description: "Server and database health checks" },
    { name: "Auth", description: "Login, register, logout, token refresh" },
    { name: "Users", description: "Admin user management" },
    { name: "Batches", description: "Batch (cohort) management" },
  ],
  paths: {
    // =========================================================
    // HEALTH
    // =========================================================
    "/health": {
      get: {
        tags: ["Health"],
        summary: "Server health check",
        description: "Returns OK if the server is running.",
        responses: {
          "200": {
            description: "Server is running",
            content: {
              "application/json": {
                example: {
                  success: true,
                  data: {
                    status: "ok",
                    timestamp: "2026-03-22T18:43:06.028Z",
                    environment: "development",
                  },
                },
              },
            },
          },
        },
      },
    },
    "/health/db": {
      get: {
        tags: ["Health"],
        summary: "Database health check",
        description: "Returns OK if PostgreSQL is reachable.",
        responses: {
          "200": {
            description: "Database connected",
            content: {
              "application/json": {
                example: {
                  success: true,
                  data: { status: "ok", database: "connected" },
                },
              },
            },
          },
          "503": {
            description: "Database unreachable",
          },
        },
      },
    },

    // =========================================================
    // AUTH
    // =========================================================
    "/auth/register": {
      post: {
        tags: ["Auth"],
        summary: "Register a new user account",
        description: `
Creates a new user account. The new user will have **no role** assigned —
an admin must assign a role before they can access role-specific features.

After registering, the user is redirected to a "pending role" page.
        `,
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                required: ["email", "password", "password_confirmation", "full_name"],
                properties: {
                  email: {
                    type: "string",
                    format: "email",
                    example: "newstudent@example.com",
                  },
                  password: {
                    type: "string",
                    minLength: 8,
                    example: "MyPass123!",
                    description: "Must have uppercase, lowercase, and a number",
                  },
                  password_confirmation: {
                    type: "string",
                    example: "MyPass123!",
                    description: "Must match password exactly",
                  },
                  full_name: {
                    type: "string",
                    example: "Priya Sharma",
                  },
                },
              },
            },
          },
        },
        responses: {
          "201": {
            description: "User created successfully",
            content: {
              "application/json": {
                example: {
                  success: true,
                  data: {
                    user: {
                      id: "49389c39-...",
                      email: "newstudent@example.com",
                      fullName: "Priya Sharma",
                      role: null,
                      isActive: true,
                      createdAt: "2026-03-22T18:44:20.077Z",
                    },
                  },
                },
              },
            },
          },
          "400": {
            description: "Validation error (missing fields, password mismatch, etc.)",
            content: {
              "application/json": {
                example: {
                  success: false,
                  error: {
                    code: "VALIDATION_ERROR",
                    message: "\"email\" must be a valid email",
                  },
                },
              },
            },
          },
          "409": {
            description: "Email already registered",
            content: {
              "application/json": {
                example: {
                  success: false,
                  error: {
                    code: "EMAIL_ALREADY_EXISTS",
                    message: "An account with this email already exists",
                  },
                },
              },
            },
          },
        },
      },
    },

    "/auth/login": {
      post: {
        tags: ["Auth"],
        summary: "Login and get an access token",
        description: `
Authenticates a user and sets **two HttpOnly cookies** in the browser:
- \`access_token\` — valid for **1 hour**, sent with every request
- \`refresh_token\` — valid for **7 days**, used to silently renew the access token

**Rate limiting:** Max 5 failed attempts per IP per minute, 10 per account per 15 minutes.

**Dev accounts to test with:**
- \`admin@dev.com\` / \`ChangeMe123!\`
- \`mentor@dev.com\` / \`ChangeMe123!\`
- \`student1@dev.com\` / \`ChangeMe123!\`
        `,
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                required: ["email", "password"],
                properties: {
                  email: {
                    type: "string",
                    format: "email",
                    example: "admin@dev.com",
                  },
                  password: {
                    type: "string",
                    example: "ChangeMe123!",
                  },
                },
              },
            },
          },
        },
        responses: {
          "200": {
            description: "Login successful — cookies set automatically",
            content: {
              "application/json": {
                example: {
                  success: true,
                  data: {
                    user: {
                      id: "d062b993-...",
                      email: "admin@dev.com",
                      fullName: "Dev Admin",
                      role: "ADMIN",
                      isActive: true,
                      lastLoginAt: "2026-03-22T18:43:43.143Z",
                      createdAt: "2026-03-22T18:42:50.225Z",
                    },
                  },
                },
              },
            },
          },
          "401": {
            description: "Wrong email or password",
            content: {
              "application/json": {
                example: {
                  success: false,
                  error: { code: "INVALID_CREDENTIALS", message: "Invalid email or password" },
                },
              },
            },
          },
          "403": {
            description: "Account deactivated",
          },
          "429": {
            description: "Too many failed attempts — rate limited",
          },
        },
      },
    },

    "/auth/logout": {
      post: {
        tags: ["Auth"],
        summary: "Logout — revoke session",
        description:
          "Revokes the refresh token (ends your session) and clears both auth cookies. Requires login.",
        security: [{ cookieAuth: [] }],
        responses: {
          "200": {
            description: "Logged out successfully",
            content: {
              "application/json": {
                example: {
                  success: true,
                  data: { message: "Logged out successfully" },
                },
              },
            },
          },
          "401": {
            description: "Not logged in",
          },
        },
      },
    },

    "/auth/refresh-token": {
      post: {
        tags: ["Auth"],
        summary: "Renew access token silently",
        description: `
Issues a new access token using the refresh token cookie.
The frontend calls this **automatically** when your access token expires (after 1 hour).
You do not need to call this manually.
        `,
        responses: {
          "200": {
            description: "New access token issued and set as cookie",
            content: {
              "application/json": {
                example: {
                  success: true,
                  data: { message: "Token refreshed" },
                },
              },
            },
          },
          "401": {
            description: "Refresh token missing, expired, or revoked",
          },
        },
      },
    },

    "/auth/me": {
      get: {
        tags: ["Auth"],
        summary: "Get my profile",
        description: "Returns the profile of the currently logged-in user.",
        security: [{ cookieAuth: [] }],
        responses: {
          "200": {
            description: "Your profile data",
            content: {
              "application/json": {
                example: {
                  success: true,
                  data: {
                    user: {
                      id: "d062b993-...",
                      email: "admin@dev.com",
                      fullName: "Dev Admin",
                      role: "ADMIN",
                      avatarUrl: null,
                      isActive: true,
                      lastLoginAt: "2026-03-22T18:43:43.143Z",
                      createdAt: "2026-03-22T18:42:50.225Z",
                    },
                  },
                },
              },
            },
          },
          "401": {
            description: "Not logged in — access token missing or expired",
          },
        },
      },
      put: {
        tags: ["Auth"],
        summary: "Update my profile",
        description: "Update your display name or avatar URL.",
        security: [{ cookieAuth: [] }],
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                properties: {
                  full_name: { type: "string", example: "Premkumar S" },
                  avatar_url: {
                    type: "string",
                    example: "https://example.com/avatar.jpg",
                  },
                },
              },
            },
          },
        },
        responses: {
          "200": {
            description: "Profile updated",
            content: {
              "application/json": {
                example: {
                  success: true,
                  data: { user: { fullName: "Premkumar S" } },
                },
              },
            },
          },
        },
      },
    },

    "/auth/change-password": {
      put: {
        tags: ["Auth"],
        summary: "Change my password",
        description:
          "Verifies your current password, sets the new one, and logs you out of all devices.",
        security: [{ cookieAuth: [] }],
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                required: ["current_password", "new_password", "new_password_confirmation"],
                properties: {
                  current_password: { type: "string", example: "ChangeMe123!" },
                  new_password: { type: "string", example: "NewSecurePass456!" },
                  new_password_confirmation: {
                    type: "string",
                    example: "NewSecurePass456!",
                  },
                },
              },
            },
          },
        },
        responses: {
          "200": {
            description: "Password changed — you will need to log in again",
          },
          "400": {
            description: "Current password is wrong",
          },
        },
      },
    },
  },

  components: {
    securitySchemes: {
      cookieAuth: {
        type: "apiKey",
        in: "cookie",
        name: "access_token",
        description:
          "Set automatically when you call `/auth/login`. You do not need to set this manually.",
      },
    },
  },
};
