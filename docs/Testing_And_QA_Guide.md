# M2i_LMS — Testing and QA Guide

### Version 1.0 | March 2026

### Save As: Developer_Guides/M2i_LMS_Testing_And_QA_Guide.md

---

# Table of Contents

1. [Overview](#1-overview)
2. [Testing Philosophy](#2-testing-philosophy)
3. [Test Environment Setup](#3-test-environment-setup)
4. [Unit Testing](#4-unit-testing)
5. [Integration Testing](#5-integration-testing)
6. [End-to-End Manual Test Scripts](#6-end-to-end-manual-test-scripts)
7. [API Testing with REST Client](#7-api-testing-with-rest-client)
8. [Frontend Component Testing](#8-frontend-component-testing)
9. [AI Pipeline Testing](#9-ai-pipeline-testing)
10. [Security Testing Checklist](#10-security-testing-checklist)
11. [Performance Testing](#11-performance-testing)
12. [Regression Testing Checklist](#12-regression-testing-checklist)
13. [Bug Reporting Guide](#13-bug-reporting-guide)
14. [CI/CD Pipeline](#14-cicd-pipeline)
15. [Pre-Launch QA Checklist](#15-pre-launch-qa-checklist)

---

# 1. Overview

## 1.1 What This Document Covers

This guide is the complete testing reference for M2i_LMS
Phase One. It covers test environment setup, unit testing
patterns with real code examples, integration testing for
every feature, manual end-to-end test scripts organized by
user role, security testing, performance benchmarks, and the
definitive pre-launch QA checklist that must be completed
before the beta goes live.

## 1.2 Testing Stack


| Layer               | Tool                     | Version    | Purpose               |
| ------------------- | ------------------------ | ---------- | --------------------- |
| Unit tests          | Jest                     | 29.x       | Backend service logic |
| Integration tests   | Jest + Supertest         | 29.x / 6.x | API endpoint testing  |
| Frontend tests      | Vitest + RTL             | 1.x / 14.x | Component testing     |
| API manual testing  | REST Client (VS Code)    | 0.25.x     | Endpoint exploration  |
| Database assertions | Prisma test client       | 5.x        | Verify DB state       |
| Mocking             | jest-mock-extended       | 3.x        | Prisma mock           |
| Coverage            | Istanbul (Jest built-in) | —         | Coverage reports      |

## 1.3 Coverage Targets

```
Service files      : ≥ 70% line coverage
Utility functions  : ≥ 85% line coverage
Algorithm files    : ≥ 90% line coverage (metrics are critical)
Controllers        : ≥ 50% line coverage (integration tests cover rest)
Workers            : ≥ 60% line coverage
```

---

# 2. Testing Philosophy

## 2.1 What to Test and What Not to Test

**Always test:**

- Business logic in service files
- Algorithm calculations (metrics engine)
- Data transformations (JSON parsing, index mapping)
- Authorization rules (who can call what)
- Edge cases that would produce incorrect data
  (wrong scores, incorrect billing, wrong access)

**Test selectively:**

- Controller methods — basic happy path and auth failure
  Integration tests cover the rest more efficiently
- Database queries — test the query logic, not Prisma itself

**Do not test:**

- Third-party library behavior (Prisma, Express, Socket.io)
- Framework internals
- Simple CRUD that has no logic (a create that only inserts)
- Type definitions

## 2.2 Test Naming Convention

All test names follow the pattern:

```
describe("<ClassName or function>", () => {
  describe("<methodName>", () => {
    it("should <expected behavior> when <condition>", () => {
```

Examples:

```typescript
describe("QuizTakingService", () => {
  describe("submitQuiz", () => {
    it("should return existing result when attempt_id already exists")
    it("should throw QUIZ_ALREADY_SUBMITTED when different attempt_id")
    it("should map display index to canonical index correctly")
    it("should calculate score_percentage as correct/total * 100")
  });
});

describe("calculateLearningVelocity", () => {
  it("should return 0 when fewer than 2 weeks of data")
  it("should return ~50 when performance is flat")
  it("should return > 50 when performance is improving")
  it("should return < 50 when performance is declining")
  it("should apply starting bonus for low-start high-growth")
});
```

## 2.3 Arrange-Act-Assert Pattern

Every test follows the AAA pattern:

```typescript
it("should mark content as completed at 90% watch threshold", () => {
  // ARRANGE
  const accessLog = {
    completionPercentage: 89,
    isCompleted: false,
  };
  const newProgress = {
    currentPositionSeconds: 2610, // 90% of 2900 seconds
    sessionWatchTimeSeconds: 30,
  };

  // ACT
  const result = calculateCompletionPercentage(
    2900,
    newProgress.currentPositionSeconds
  );

  // ASSERT
  expect(result.completionPercentage).toBeCloseTo(90);
  expect(result.isCompleted).toBe(true);
});
```

---

# 3. Test Environment Setup

## 3.1 Test Database

Integration tests use a separate database to avoid corrupting
development data. The test database is created and destroyed
automatically per test run.

```bash
# Create test database
createdb m2i_lms_test
# Or with Docker:
docker exec m2i_postgres psql -U m2i_user \
  -c "CREATE DATABASE m2i_lms_test;"
```

**backend/.env.test:**

```env
NODE_ENV=test
DATABASE_URL=postgresql://m2i_user:m2i_dev_password@localhost:5432/m2i_lms_test
JWT_SECRET=test_jwt_secret_minimum_32_characters_long
JWT_REFRESH_SECRET=test_refresh_secret_different_from_jwt
REDIS_HOST=localhost
REDIS_PORT=6379
AWS_REGION=ap-south-1
AWS_ACCESS_KEY_ID=test_key
AWS_SECRET_ACCESS_KEY=test_secret
S3_BUCKET_NAME=test-bucket
MUX_TOKEN_ID=test_mux_id
MUX_TOKEN_SECRET=test_mux_secret
OLLAMA_URL=http://localhost:11434
OLLAMA_MODEL=mistral:7b-instruct-v0.2-q4_K_M
```

## 3.2 Jest Configuration

```typescript
// backend/jest.config.ts
import type { Config } from "jest";

const config: Config = {
  preset: "ts-jest",
  testEnvironment: "node",
  roots: ["<rootDir>/tests"],
  testMatch: [
    "**/*.test.ts",
    "**/*.spec.ts",
  ],
  collectCoverageFrom: [
    "src/**/*.ts",
    "!src/**/*.d.ts",
    "!src/types/**",
    "!src/server.ts",
    "!src/app.ts",
  ],
  coverageThreshold: {
    global: {
      branches: 70,
      functions: 70,
      lines: 70,
      statements: 70,
    },
    "./src/utils/algorithms/": {
      lines: 90,
    },
  },
  setupFilesAfterFramework: [
    "<rootDir>/tests/setup.ts",
  ],
  globalSetup: "<rootDir>/tests/globalSetup.ts",
  globalTeardown: "<rootDir>/tests/globalTeardown.ts",
  testTimeout: 30000,
};

export default config;
```

## 3.3 Test Setup Files

```typescript
// tests/globalSetup.ts
import { execSync } from "child_process";

export default async () => {
  // Run migrations on test database
  execSync("npx prisma migrate deploy", {
    env: {
      ...process.env,
      DATABASE_URL: process.env.DATABASE_URL,
    },
  });
  console.log("[Test Setup] Migrations applied to test database");
};
```

```typescript
// tests/globalTeardown.ts
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

export default async () => {
  await prisma.$disconnect();
  console.log("[Test Teardown] Database connection closed");
};
```

```typescript
// tests/setup.ts
import { prisma } from "../src/lib/prisma";
import { jest } from "@jest/globals";

// Clear all tables before each test
beforeEach(async () => {
  // Delete in reverse dependency order
  await prisma.notification.deleteMany();
  await prisma.studentAlert.deleteMany();
  await prisma.studentProgress.deleteMany();
  await prisma.metricsCalculationLog.deleteMany();
  await prisma.sessionAttendance.deleteMany();
  await prisma.sessionContentLink.deleteMany();
  await prisma.liveSession.deleteMany();
  await prisma.quizResponse.deleteMany();
  await prisma.quizAttempt.deleteMany();
  await prisma.quizGenerationLog.deleteMany();
  await prisma.quiz.deleteMany();
  await prisma.contentAccessLog.deleteMany();
  await prisma.supplementaryFile.deleteMany();
  await prisma.content.deleteMany();
  await prisma.batchMentor.deleteMany();
  await prisma.enrollment.deleteMany();
  await prisma.batch.deleteMany();
  await prisma.refreshToken.deleteMany();
  await prisma.loginAttempt.deleteMany();
  await prisma.user.deleteMany();
});

afterAll(async () => {
  await prisma.$disconnect();
});
```

## 3.4 Test Helpers and Factories

```typescript
// tests/helpers/factories.ts
import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";
import { v4 as uuidv4 } from "uuid";

const prisma = new PrismaClient();

const TEST_PASSWORD_HASH = bcrypt.hashSync("TestPass123!", 10);

export const createUser = async (overrides: Partial<{
  email: string;
  role: string;
  fullName: string;
  isActive: boolean;
}> = {}) => {
  return prisma.user.create({
    data: {
      email: overrides.email ?? `test-${uuidv4()}@test.com`,
      passwordHash: TEST_PASSWORD_HASH,
      fullName: overrides.fullName ?? "Test User",
      role: overrides.role as any ?? "STUDENT",
      isActive: overrides.isActive ?? true,
    },
  });
};

export const createAdmin = () =>
  createUser({ role: "ADMIN", email: "admin@test.com" });

export const createMentor = () =>
  createUser({ role: "MENTOR", email: "mentor@test.com",
               fullName: "Test Mentor" });

export const createStudent = (n: number = 1) =>
  createUser({ role: "STUDENT", email: `student${n}@test.com`,
               fullName: `Student ${n}` });

export const createBatch = async (
  createdById: string,
  overrides: Partial<{
    name: string;
    status: string;
    startDate: Date;
    endDate: Date;
  }> = {}
) => {
  const now = new Date();
  return prisma.batch.create({
    data: {
      name: overrides.name ?? `Test Batch ${uuidv4().slice(0, 8)}`,
      startDate: overrides.startDate ?? new Date(
        now.getTime() - 7 * 24 * 60 * 60 * 1000
      ),
      endDate: overrides.endDate ?? new Date(
        now.getTime() + 49 * 24 * 60 * 60 * 1000
      ),
      status: overrides.status as any ?? "ACTIVE",
      createdBy: createdById,
    },
  });
};

export const enrollStudent = async (
  studentId: string,
  batchId: string,
  enrolledById: string
) => {
  return prisma.enrollment.create({
    data: { studentId, batchId, enrolledBy: enrolledById },
  });
};

export const createContent = async (
  batchId: string,
  uploadedById: string,
  overrides: Partial<{
    title: string;
    transcript: string;
    transcriptionStatus: string;
    isPublished: boolean;
  }> = {}
) => {
  return prisma.content.create({
    data: {
      batchId,
      uploadedBy: uploadedById,
      title: overrides.title ?? "Test Content",
      contentType: "VIDEO",
      storageUrl: "video/test/placeholder.mp4",
      transcript: overrides.transcript ?? "Test transcript content.",
      transcriptionStatus: overrides.transcriptionStatus as any
        ?? "COMPLETE",
      isPublished: overrides.isPublished ?? true,
    },
  });
};

export const createQuiz = async (
  contentId: string,
  batchId: string,
  overrides: Partial<{
    quizType: string;
    generationStatus: string;
    cognitiveLevel: string;
    correctOptionIndex: number;
  }> = {}
) => {
  return prisma.quiz.create({
    data: {
      contentId,
      batchId,
      quizType: overrides.quizType as any ?? "QUICK_ASSESSMENT",
      questionText: "What is the primary purpose of X?",
      options: ["Option A", "Option B", "Option C", "Option D"],
      correctOptionIndex: overrides.correctOptionIndex ?? 0,
      explanation: "Option A is correct because...",
      cognitiveLevel: overrides.cognitiveLevel as any ?? "RECALL",
      difficulty: "MEDIUM",
      generationStatus: overrides.generationStatus as any
        ?? "APPROVED",
      availableFrom: new Date(Date.now() - 60000),
    },
  });
};

// Login helper — returns auth cookies as header string
export const loginAs = async (
  app: Express.Application,
  email: string,
  password: string = "TestPass123!"
): Promise<string> => {
  const response = await request(app)
    .post("/api/auth/login")
    .send({ email, password });

  const cookies = response.headers["set-cookie"] as string[];
  return cookies.join("; ");
};
```

---

# 4. Unit Testing

## 4.1 Metrics Algorithm Tests

The metrics algorithms are the most critical unit tests in
the system. Incorrect algorithms produce incorrect scores
which mislead students and mentors.

```typescript
// tests/unit/algorithms/learningVelocity.test.ts
import { calculateLearningVelocity } from
  "../../../src/utils/algorithms/learningVelocity";

describe("calculateLearningVelocity", () => {

  it("should return 0 for fewer than 2 weeks of data", () => {
    expect(calculateLearningVelocity([
      { weekNumber: 1, scorePercentage: 70 },
    ])).toBe(0);
  });

  it("should return 0 for empty array", () => {
    expect(calculateLearningVelocity([])).toBe(0);
  });

  it("should return ~50 for flat performance over 3 weeks", () => {
    const result = calculateLearningVelocity([
      { weekNumber: 1, scorePercentage: 70 },
      { weekNumber: 2, scorePercentage: 70 },
      { weekNumber: 3, scorePercentage: 70 },
    ]);
    expect(result).toBeGreaterThan(45);
    expect(result).toBeLessThan(55);
  });

  it("should return > 50 for consistently improving performance", () => {
    const result = calculateLearningVelocity([
      { weekNumber: 1, scorePercentage: 55 },
      { weekNumber: 2, scorePercentage: 65 },
      { weekNumber: 3, scorePercentage: 75 },
    ]);
    expect(result).toBeGreaterThan(60);
  });

  it("should return < 50 for consistently declining performance", () => {
    const result = calculateLearningVelocity([
      { weekNumber: 1, scorePercentage: 80 },
      { weekNumber: 2, scorePercentage: 65 },
      { weekNumber: 3, scorePercentage: 50 },
    ]);
    expect(result).toBeLessThan(40);
  });

  it("should clamp result to 0-100 range", () => {
    // Extremely steep improvement
    const highResult = calculateLearningVelocity([
      { weekNumber: 1, scorePercentage: 10 },
      { weekNumber: 2, scorePercentage: 100 },
    ]);
    expect(highResult).toBeLessThanOrEqual(100);
    expect(highResult).toBeGreaterThanOrEqual(0);

    // Extremely steep decline
    const lowResult = calculateLearningVelocity([
      { weekNumber: 1, scorePercentage: 100 },
      { weekNumber: 2, scorePercentage: 10 },
    ]);
    expect(lowResult).toBeLessThanOrEqual(100);
    expect(lowResult).toBeGreaterThanOrEqual(0);
  });

  it("should give higher score to low-start high-growth vs high-start same-slope", () => {
    const lowStart = calculateLearningVelocity([
      { weekNumber: 1, scorePercentage: 35 },
      { weekNumber: 2, scorePercentage: 55 },
      { weekNumber: 3, scorePercentage: 75 },
    ]);

    const highStart = calculateLearningVelocity([
      { weekNumber: 1, scorePercentage: 60 },
      { weekNumber: 2, scorePercentage: 75 },
      { weekNumber: 3, scorePercentage: 90 },
    ]);

    // Low start with same absolute improvement should get bonus
    // They should be within 15 points of each other after bonus
    expect(Math.abs(lowStart - highStart)).toBeLessThan(20);
  });

  it("should handle multiple scores per week by averaging", () => {
    // Student took 2 quizzes in week 1
    const result = calculateLearningVelocity([
      { weekNumber: 1, scorePercentage: 60 },
      { weekNumber: 1, scorePercentage: 80 },  // avg = 70
      { weekNumber: 2, scorePercentage: 85 },
    ]);

    // With week 1 avg = 70, week 2 = 85 → improvement
    expect(result).toBeGreaterThan(50);
  });
});
```

```typescript
// tests/unit/algorithms/conceptualDepth.test.ts
import { calculateConceptualDepth } from
  "../../../src/utils/algorithms/conceptualDepth";

describe("calculateConceptualDepth", () => {

  it("should return 0 when fewer than 5 recall questions", () => {
    const responses = Array.from({ length: 4 }, (_, i) => ({
      isCorrect: true,
      cognitiveLevel: "RECALL",
    }));
    expect(calculateConceptualDepth(responses)).toBe(0);
  });

  it("should return 0 when fewer than 5 application questions", () => {
    const responses = [
      ...Array.from({ length: 10 }, () => ({
        isCorrect: true,
        cognitiveLevel: "RECALL",
      })),
      ...Array.from({ length: 4 }, () => ({
        isCorrect: true,
        cognitiveLevel: "APPLICATION",
      })),
    ];
    expect(calculateConceptualDepth(responses)).toBe(0);
  });

  it("should return higher score when application matches recall", () => {
    const balanced = [
      ...Array.from({ length: 10 }, (_, i) => ({
        isCorrect: i < 8,
        cognitiveLevel: "RECALL",
      })),
      ...Array.from({ length: 10 }, (_, i) => ({
        isCorrect: i < 7,
        cognitiveLevel: "APPLICATION",
      })),
    ];
    const result = calculateConceptualDepth(balanced);
    expect(result).toBeGreaterThan(50);
  });

  it("should return lower score when application lags behind recall", () => {
    const imbalanced = [
      ...Array.from({ length: 10 }, (_, i) => ({
        isCorrect: i < 9,  // 90% recall
        cognitiveLevel: "RECALL",
      })),
      ...Array.from({ length: 10 }, (_, i) => ({
        isCorrect: i < 3,  // 30% application
        cognitiveLevel: "APPLICATION",
      })),
    ];
    const result = calculateConceptualDepth(imbalanced);
    expect(result).toBeLessThan(40);
  });

  it("should be within 0-100 range for all inputs", () => {
    const allCorrect = [
      ...Array.from({ length: 10 }, () => ({
        isCorrect: true,
        cognitiveLevel: "RECALL",
      })),
      ...Array.from({ length: 10 }, () => ({
        isCorrect: true,
        cognitiveLevel: "APPLICATION",
      })),
    ];
    const result = calculateConceptualDepth(allCorrect);
    expect(result).toBeGreaterThanOrEqual(0);
    expect(result).toBeLessThanOrEqual(100);
  });
});
```

## 4.2 Quiz Taking Logic Tests

```typescript
// tests/unit/quizTaking.service.test.ts
import { QuizTakingService } from
  "../../src/services/quizTaking.service";

describe("QuizTakingService", () => {

  describe("shuffleWithSeed", () => {
    const service = new (QuizTakingService as any)();
    const shuffle = (arr: number[], seed: string) =>
      (service as any).shuffleWithSeed(arr, seed);

    it("should return same order for identical seed", () => {
      const seed = "student-uuid-quiz-uuid-1";
      const r1 = shuffle([0, 1, 2, 3], seed);
      const r2 = shuffle([0, 1, 2, 3], seed);
      expect(r1).toEqual(r2);
    });

    it("should return all 4 values (no loss)", () => {
      const result = shuffle([0, 1, 2, 3], "any-seed");
      expect(result.sort()).toEqual([0, 1, 2, 3]);
    });

    it("should produce different orders for different seeds", () => {
      const orders = new Set<string>();
      // Generate 10 shuffles with different seeds
      for (let i = 0; i < 10; i++) {
        const order = shuffle([0, 1, 2, 3], `seed-${i}`);
        orders.add(order.join(","));
      }
      // With 10 different seeds, expect at least 5 different orders
      expect(orders.size).toBeGreaterThan(4);
    });
  });

  describe("display index to canonical index mapping", () => {

    it("should correctly map display index 0 to canonical", () => {
      // display_order: [2, 0, 3, 1] means:
      // display position 0 shows canonical option 2
      // display position 1 shows canonical option 0
      // etc.
      const displayOrder = [2, 0, 3, 1];
      const selectedDisplayIndex = 1;
      const canonicalIndex = displayOrder[selectedDisplayIndex];
      expect(canonicalIndex).toBe(0);
    });

    it("should detect correct answer when student selects it", () => {
      const correctOptionIndex = 2; // canonical correct answer
      const displayOrder = [3, 1, 2, 0]; // display_order
      // canonical 2 is at display position 2
      const correctDisplayIndex = displayOrder.indexOf(
        correctOptionIndex
      );
      expect(correctDisplayIndex).toBe(2);

      // Student selects display position 2
      const selectedDisplayIndex = 2;
      const studentCanonical = displayOrder[selectedDisplayIndex];
      expect(studentCanonical).toBe(correctOptionIndex);
      expect(studentCanonical === correctOptionIndex).toBe(true);
    });

    it("should detect wrong answer when student does not select correct", () => {
      const correctOptionIndex = 0;
      const displayOrder = [1, 0, 2, 3];
      const selectedDisplayIndex = 0; // display 0 → canonical 1
      const studentCanonical = displayOrder[selectedDisplayIndex];
      expect(studentCanonical).not.toBe(correctOptionIndex);
    });
  });

  describe("score calculation", () => {

    it("should calculate 100% for all correct", () => {
      const correct = 10;
      const total = 10;
      const score = (correct / total) * 100;
      expect(score).toBe(100);
    });

    it("should calculate 0% for all incorrect", () => {
      const correct = 0;
      const total = 10;
      const score = (correct / total) * 100;
      expect(score).toBe(0);
    });

    it("should calculate 70% for 7 out of 10", () => {
      const correct = 7;
      const total = 10;
      const score = (correct / total) * 100;
      expect(score).toBe(70);
    });
  });
});
```

## 4.3 JSON Parser Tests

```typescript
// tests/unit/jsonParser.test.ts
import { parseJsonFromResponse } from
  "../../src/utils/jsonParser.utils";

describe("parseJsonFromResponse", () => {

  it("should parse clean JSON object", () => {
    const raw = '{"key": "value", "number": 42}';
    const result = parseJsonFromResponse<any>(raw);
    expect(result.key).toBe("value");
    expect(result.number).toBe(42);
  });

  it("should parse clean JSON array", () => {
    const raw = '[{"concept": "Event Loop"}]';
    const result = parseJsonFromResponse<any[]>(raw);
    expect(result).toHaveLength(1);
    expect(result[0].concept).toBe("Event Loop");
  });

  it("should strip markdown json code fence", () => {
    const raw = "```json\n{\"key\": \"value\"}\n```";
    const result = parseJsonFromResponse<any>(raw);
    expect(result.key).toBe("value");
  });

  it("should strip plain code fence", () => {
    const raw = "```\n{\"key\": \"value\"}\n```";
    const result = parseJsonFromResponse<any>(raw);
    expect(result.key).toBe("value");
  });

  it("should extract JSON from text prefix", () => {
    const raw = 'Here is the JSON output:\n{"key": "value"}';
    const result = parseJsonFromResponse<any>(raw);
    expect(result.key).toBe("value");
  });

  it("should extract JSON from text suffix", () => {
    const raw = '{"key": "value"}\nHope this helps!';
    const result = parseJsonFromResponse<any>(raw);
    expect(result.key).toBe("value");
  });

  it("should fix trailing comma before closing brace", () => {
    const raw = '{"key": "value",}';
    const result = parseJsonFromResponse<any>(raw);
    expect(result.key).toBe("value");
  });

  it("should fix trailing comma before closing bracket", () => {
    const raw = '[{"key": "value"},]';
    const result = parseJsonFromResponse<any[]>(raw);
    expect(result[0].key).toBe("value");
  });

  it("should throw descriptive error for unparseable response", () => {
    expect(() =>
      parseJsonFromResponse("this is not json at all")
    ).toThrow("JSON parse failed");
  });

  it("should throw for empty response", () => {
    expect(() =>
      parseJsonFromResponse("")
    ).toThrow("Empty response");
  });
});
```

## 4.4 Auth Service Tests

```typescript
// tests/unit/auth.service.test.ts
import { AuthService } from "../../src/services/auth.service";
import { mockDeep } from "jest-mock-extended";
import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prismaMock = mockDeep<PrismaClient>();
jest.mock("../../src/lib/prisma", () => ({
  prisma: prismaMock,
}));

describe("AuthService", () => {
  const authService = new AuthService();

  describe("register", () => {

    it("should hash password before storing", async () => {
      prismaMock.user.findUnique.mockResolvedValue(null);
      prismaMock.user.create.mockResolvedValue({
        id: "test-uuid",
        email: "test@test.com",
        fullName: "Test User",
        role: "STUDENT",
      } as any);

      await authService.register({
        email: "test@test.com",
        password: "TestPass123!",
        full_name: "Test User",
      });

      const createCall = prismaMock.user.create.mock.calls[0][0];
      const storedHash = createCall.data.passwordHash;

      // Verify it is a bcrypt hash, not plaintext
      expect(storedHash).not.toBe("TestPass123!");
      expect(storedHash.startsWith("$2")).toBe(true);
      expect(await bcrypt.compare("TestPass123!", storedHash))
        .toBe(true);
    });

    it("should throw EMAIL_ALREADY_EXISTS for duplicate email", async () => {
      prismaMock.user.findUnique.mockResolvedValue({
        id: "existing-uuid",
        email: "test@test.com",
      } as any);

      await expect(
        authService.register({
          email: "test@test.com",
          password: "TestPass123!",
          full_name: "Test User",
        })
      ).rejects.toMatchObject({
        code: "EMAIL_ALREADY_EXISTS",
        statusCode: 409,
      });
    });
  });

  describe("login", () => {

    it("should throw INVALID_CREDENTIALS for wrong password", async () => {
      const hash = await bcrypt.hash("CorrectPass123!", 10);
      prismaMock.user.findUnique.mockResolvedValue({
        id: "test-uuid",
        email: "test@test.com",
        passwordHash: hash,
        isActive: true,
        deletedAt: null,
      } as any);

      await expect(
        authService.login("test@test.com", "WrongPass123!")
      ).rejects.toMatchObject({
        code: "INVALID_CREDENTIALS",
        statusCode: 401,
      });
    });

    it("should throw ACCOUNT_DEACTIVATED for inactive user", async () => {
      const hash = await bcrypt.hash("TestPass123!", 10);
      prismaMock.user.findUnique.mockResolvedValue({
        id: "test-uuid",
        email: "test@test.com",
        passwordHash: hash,
        isActive: false,
        deletedAt: null,
      } as any);

      await expect(
        authService.login("test@test.com", "TestPass123!")
      ).rejects.toMatchObject({
        code: "ACCOUNT_DEACTIVATED",
        statusCode: 403,
      });
    });
  });
});
```

---

# 5. Integration Testing

Integration tests use a real test database and the full
Express application, testing the complete request path
from HTTP call to database and back.

## 5.1 Test App Setup

```typescript
// tests/integration/helpers/testApp.ts
import { app } from "../../../src/app";
import request from "supertest";
import { prisma } from "../../../src/lib/prisma";
import {
  createAdmin, createMentor, createStudent,
  createBatch, enrollStudent,
} from "../helpers/factories";

export const getTestApp = () => app;

export const setupBasicTestData = async () => {
  const admin = await createAdmin();
  const mentor = await createMentor();
  const student1 = await createStudent(1);
  const student2 = await createStudent(2);

  const batch = await createBatch(admin.id, {
    status: "ACTIVE",
  });

  await prisma.batchMentor.create({
    data: { batchId: batch.id, mentorId: mentor.id,
            assignedBy: admin.id },
  });

  await enrollStudent(student1.id, batch.id, admin.id);
  await enrollStudent(student2.id, batch.id, admin.id);

  // Get auth cookies for each role
  const adminCookie = await loginAndGetCookie(
    app, "admin@test.com"
  );
  const mentorCookie = await loginAndGetCookie(
    app, "mentor@test.com"
  );
  const student1Cookie = await loginAndGetCookie(
    app, "student1@test.com"
  );

  return {
    admin, mentor, student1, student2, batch,
    adminCookie, mentorCookie, student1Cookie,
  };
};

const loginAndGetCookie = async (
  app: any,
  email: string
): Promise<string> => {
  const response = await request(app)
    .post("/api/auth/login")
    .send({ email, password: "TestPass123!" });

  const cookies = response.headers["set-cookie"] as string[];
  return cookies.map((c) => c.split(";")[0]).join("; ");
};
```

## 5.2 Authentication Integration Tests

```typescript
// tests/integration/auth.test.ts
import request from "supertest";
import { app } from "../../src/app";
import { createUser } from "../helpers/factories";

describe("POST /api/auth/login", () => {

  it("should set HttpOnly auth cookies on successful login", async () => {
    await createUser({
      email: "login-test@test.com",
      role: "STUDENT",
    });

    const response = await request(app)
      .post("/api/auth/login")
      .send({ email: "login-test@test.com",
              password: "TestPass123!" });

    expect(response.status).toBe(200);
    expect(response.body.success).toBe(true);

    const cookies = response.headers["set-cookie"] as string[];
    const accessTokenCookie = cookies.find(
      (c) => c.startsWith("access_token=")
    );
    const refreshTokenCookie = cookies.find(
      (c) => c.startsWith("refresh_token=")
    );

    expect(accessTokenCookie).toBeDefined();
    expect(accessTokenCookie).toContain("HttpOnly");
    expect(refreshTokenCookie).toBeDefined();
    expect(refreshTokenCookie).toContain("HttpOnly");
  });

  it("should return 401 for wrong password", async () => {
    await createUser({ email: "wrong-pw@test.com" });

    const response = await request(app)
      .post("/api/auth/login")
      .send({ email: "wrong-pw@test.com",
              password: "WrongPassword!" });

    expect(response.status).toBe(401);
    expect(response.body.error.code).toBe("INVALID_CREDENTIALS");
  });

  it("should return 401 for non-existent email", async () => {
    const response = await request(app)
      .post("/api/auth/login")
      .send({ email: "nobody@test.com",
              password: "TestPass123!" });

    expect(response.status).toBe(401);
    expect(response.body.error.code).toBe("INVALID_CREDENTIALS");
  });

  it("should return 401 without cookie after logout", async () => {
    const user = await createUser({
      email: "logout-test@test.com",
    });

    // Login
    const loginRes = await request(app)
      .post("/api/auth/login")
      .send({ email: "logout-test@test.com",
              password: "TestPass123!" });

    const cookies = (loginRes.headers["set-cookie"] as string[])
      .map((c) => c.split(";")[0]).join("; ");

    // Logout
    await request(app)
      .post("/api/auth/logout")
      .set("Cookie", cookies);

    // Try authenticated request after logout
    const meRes = await request(app)
      .get("/api/auth/me")
      .set("Cookie", cookies);

    expect(meRes.status).toBe(401);
  });
});
```

## 5.3 Quiz Submission Integration Tests

```typescript
// tests/integration/quizTaking.test.ts
import request from "supertest";
import { v4 as uuidv4 } from "uuid";
import { app } from "../../src/app";
import { prisma } from "../../src/lib/prisma";
import {
  setupBasicTestData,
  createContent,
  createQuiz,
} from "../helpers/factories";

describe("POST /api/quizzes/submit", () => {

  let testData: Awaited<ReturnType<typeof setupBasicTestData>>;
  let contentId: string;
  let quizzes: any[];

  beforeEach(async () => {
    testData = await setupBasicTestData();

    const content = await createContent(
      testData.batch.id,
      testData.mentor.id,
      { transcriptionStatus: "COMPLETE" }
    );
    contentId = content.id;

    // Create 5 approved questions (minimum for Quick Assessment)
    quizzes = await Promise.all(
      Array.from({ length: 5 }, () =>
        createQuiz(contentId, testData.batch.id, {
          generationStatus: "APPROVED",
        })
      )
    );
  });

  it("should create quiz_responses and quiz_attempt records", async () => {
    const attemptId = uuidv4();

    const displayOrders: Record<string, number[]> = {};
    const responses = quizzes.map((q) => {
      displayOrders[q.id] = [0, 1, 2, 3]; // Identity order
      return {
        quiz_id: q.id,
        selected_display_index: 0,
        time_to_answer_seconds: 30,
      };
    });

    const response = await request(app)
      .post("/api/quizzes/submit")
      .set("Cookie", testData.student1Cookie)
      .send({
        content_id: contentId,
        quiz_type: "QUICK_ASSESSMENT",
        attempt_id: attemptId,
        started_at: new Date(Date.now() - 300000).toISOString(),
        responses,
        display_orders: displayOrders,
      });

    expect(response.status).toBe(200);
    expect(response.body.success).toBe(true);
    expect(response.body.data.score.total_questions).toBe(5);

    // Verify database records created
    const attempt = await prisma.quizAttempt.findUnique({
      where: { attemptId },
    });
    expect(attempt).toBeTruthy();
    expect(attempt!.totalQuestions).toBe(5);

    const responseRecords = await prisma.quizResponse.findMany({
      where: { attemptId },
    });
    expect(responseRecords).toHaveLength(5);
  });

  it("should return same result for duplicate attempt_id (idempotency)", async () => {
    const attemptId = uuidv4();

    const displayOrders: Record<string, number[]> = {};
    const responses = quizzes.map((q) => {
      displayOrders[q.id] = [0, 1, 2, 3];
      return { quiz_id: q.id, selected_display_index: 0 };
    });

    const payload = {
      content_id: contentId,
      quiz_type: "QUICK_ASSESSMENT",
      attempt_id: attemptId,
      started_at: new Date().toISOString(),
      responses,
      display_orders: displayOrders,
    };

    // First submission
    const first = await request(app)
      .post("/api/quizzes/submit")
      .set("Cookie", testData.student1Cookie)
      .send(payload);

    // Second submission with same attempt_id
    const second = await request(app)
      .post("/api/quizzes/submit")
      .set("Cookie", testData.student1Cookie)
      .send(payload);

    expect(first.status).toBe(200);
    expect(second.status).toBe(200);

    // Should return same score
    expect(second.body.data.score.score_percentage).toBe(
      first.body.data.score.score_percentage
    );

    // Should NOT create duplicate records
    const attempts = await prisma.quizAttempt.findMany({
      where: {
        attemptId,
        studentId: testData.student1.id,
      },
    });
    expect(attempts).toHaveLength(1);
  });

  it("should return 409 for second submission with different attempt_id", async () => {
    const displayOrders: Record<string, number[]> = {};
    const responses = quizzes.map((q) => {
      displayOrders[q.id] = [0, 1, 2, 3];
      return { quiz_id: q.id, selected_display_index: 0 };
    });

    // First submission
    await request(app)
      .post("/api/quizzes/submit")
      .set("Cookie", testData.student1Cookie)
      .send({
        content_id: contentId,
        quiz_type: "QUICK_ASSESSMENT",
        attempt_id: uuidv4(),
        started_at: new Date().toISOString(),
        responses,
        display_orders: displayOrders,
      });

    // Second submission with different attempt_id
    const second = await request(app)
      .post("/api/quizzes/submit")
      .set("Cookie", testData.student1Cookie)
      .send({
        content_id: contentId,
        quiz_type: "QUICK_ASSESSMENT",
        attempt_id: uuidv4(),
        started_at: new Date().toISOString(),
        responses,
        display_orders: displayOrders,
      });

    expect(second.status).toBe(409);
    expect(second.body.error.code).toBe("QUIZ_ALREADY_SUBMITTED");
  });

  it("should return 403 for student not enrolled in batch", async () => {
    // student2 is enrolled, but create an unenrolled student
    const unenrolled = await createUser({
      email: "unenrolled@test.com",
      role: "STUDENT",
    });
    const unenrolledCookie = await loginAndGetCookie(
      app, "unenrolled@test.com"
    );

    const displayOrders: Record<string, number[]> = {};
    const responses = quizzes.map((q) => {
      displayOrders[q.id] = [0, 1, 2, 3];
      return { quiz_id: q.id, selected_display_index: 0 };
    });

    const response = await request(app)
      .post("/api/quizzes/submit")
      .set("Cookie", unenrolledCookie)
      .send({
        content_id: contentId,
        quiz_type: "QUICK_ASSESSMENT",
        attempt_id: uuidv4(),
        started_at: new Date().toISOString(),
        responses,
        display_orders: displayOrders,
      });

    expect(response.status).toBe(403);
    expect(response.body.error.code).toBe("NOT_ENROLLED");
  });
});
```

## 5.4 Batch Enrollment Integration Tests

```typescript
// tests/integration/batch.test.ts
import request from "supertest";
import { app } from "../../src/app";
import {
  createAdmin, createStudent, createBatch,
  loginAndGetCookie,
} from "../helpers/factories";
import { prisma } from "../../src/lib/prisma";

describe("POST /api/batches/:batchId/enroll", () => {

  it("should enroll multiple students and return breakdown", async () => {
    const admin = await createAdmin();
    const s1 = await createStudent(1);
    const s2 = await createStudent(2);
    const batch = await createBatch(admin.id);
    const adminCookie = await loginAndGetCookie(app, "admin@test.com");

    const response = await request(app)
      .post(`/api/batches/${batch.id}/enroll`)
      .set("Cookie", adminCookie)
      .send({ student_ids: [s1.id, s2.id] });

    expect(response.status).toBe(200);
    expect(response.body.data.enrolled).toHaveLength(2);
    expect(response.body.data.skipped).toHaveLength(0);
    expect(response.body.data.failed).toHaveLength(0);

    const enrollments = await prisma.enrollment.findMany({
      where: { batchId: batch.id, status: "ACTIVE" },
    });
    expect(enrollments).toHaveLength(2);
  });

  it("should skip already enrolled students", async () => {
    const admin = await createAdmin();
    const student = await createStudent(1);
    const batch = await createBatch(admin.id);
    const adminCookie = await loginAndGetCookie(app, "admin@test.com");

    // Enroll once
    await request(app)
      .post(`/api/batches/${batch.id}/enroll`)
      .set("Cookie", adminCookie)
      .send({ student_ids: [student.id] });

    // Enroll again
    const response = await request(app)
      .post(`/api/batches/${batch.id}/enroll`)
      .set("Cookie", adminCookie)
      .send({ student_ids: [student.id] });

    expect(response.status).toBe(200);
    expect(response.body.data.enrolled).toHaveLength(0);
    expect(response.body.data.skipped).toHaveLength(1);
    expect(response.body.data.skipped[0].reason).toContain(
      "Already enrolled"
    );
  });

  it("should return 401 for unauthenticated request", async () => {
    const admin = await createAdmin();
    const batch = await createBatch(admin.id);

    const response = await request(app)
      .post(`/api/batches/${batch.id}/enroll`)
      .send({ student_ids: ["some-uuid"] });

    expect(response.status).toBe(401);
  });

  it("should return 403 for student role", async () => {
    const admin = await createAdmin();
    const student = await createStudent(1);
    const batch = await createBatch(admin.id);

    const studentCookie = await loginAndGetCookie(
      app, "student1@test.com"
    );

    const response = await request(app)
      .post(`/api/batches/${batch.id}/enroll`)
      .set("Cookie", studentCookie)
      .send({ student_ids: [student.id] });

    expect(response.status).toBe(403);
  });
});
```

---

# 6. End-to-End Manual Test Scripts

These scripts are run manually during weekly checkpoints
and before launch. Each script covers one complete user
journey. Run them in a clean staging environment, not
development.

## 6.1 Script 01 — Admin Setup Flow

**Prerequisites:** Fresh staging environment with only
the super admin seed account.

```
SCRIPT 01: Admin Setup Flow
Estimated time: 15 minutes
Run as: Admin

STEP 1: Login
  Action: Navigate to /login
          Enter admin@staging.m2ilms.com / [password]
  Expected: Redirected to /admin/dashboard
  Pass/Fail: ___

STEP 2: Create Mentor Account
  Action: Navigate to /admin/users
          Click "Create User"
          Enter: Name="Test Mentor", Email="mentor@test.com",
                 Role=MENTOR
          Click Create
  Expected: Success message. Temporary password shown.
  Pass/Fail: ___

STEP 3: Create Student Accounts (create 3)
  Action: Repeat Step 2 for:
          student1@test.com (STUDENT)
          student2@test.com (STUDENT)
          student3@test.com (STUDENT)
  Expected: All 3 created successfully
  Pass/Fail: ___

STEP 4: Create Batch
  Action: Navigate to /admin/batches
          Click "Create Batch"
          Name: "QA Test Batch 01"
          Start Date: [today]
          End Date: [today + 56 days]
          Click Create
  Expected: Batch created with status DRAFT
  Pass/Fail: ___

STEP 5: Activate Batch
  Action: Open the created batch
          Click "Activate" (or wait for nightly job)
          For testing, set start_date to yesterday in DB
  Expected: Batch status = ACTIVE
  Pass/Fail: ___

STEP 6: Assign Mentor
  Action: In batch detail, click "Assign Mentor"
          Select "Test Mentor"
  Expected: Mentor appears in assigned mentors list
  Pass/Fail: ___

STEP 7: Enroll Students
  Action: In batch detail, click "Enroll Students"
          Select all 3 students
          Click Enroll
  Expected: 3/3 enrolled. No skipped. No failed.
  Pass/Fail: ___

STEP 8: Verify Student View
  Action: Log out. Log in as student1@test.com
  Expected: Redirected to /student/dashboard
            Batch name shows in header/dashboard
            Content library is empty (no content yet)
  Pass/Fail: ___

SCRIPT 01 RESULT: PASS / FAIL
Notes: _______________________________________________
```

## 6.2 Script 02 — Content Upload and Quiz Generation

```
SCRIPT 02: Content Upload and Quiz Generation
Estimated time: 20-40 minutes (AI processing time varies)
Run as: Mentor
Prerequisites: Script 01 completed

STEP 1: Login as Mentor
  Action: Login as mentor@test.com
  Expected: Redirected to /mentor/dashboard
  Pass/Fail: ___

STEP 2: Upload a Video
  Action: Navigate to batch content page
          Click "Upload Content"
          Select a video file (10-20 min lecture recommended)
          Fill title: "Introduction to Testing — Week 1"
          Fill learning objectives: "Students should understand
            what unit testing is, why it matters, and how to
            write a basic Jest test."
          Click Upload
  Expected: Progress bar shows upload progress
            Upload completes within 2 minutes
            Content appears in list as "Transcribing..."
  Pass/Fail: ___

STEP 3: Wait for Transcription
  Action: Wait (check every 2 minutes)
          Refresh content list
  Expected: Status changes to "Generating Quizzes"
            then to "Ready for Review"
            Mentor receives notification bell update
  Acceptable time: < 30 min CPU, < 10 min GPU
  Pass/Fail: ___

STEP 4: Check Notification
  Action: Click notification bell
  Expected: "Quizzes Ready for Review" notification visible
            Message shows correct question count
  Pass/Fail: ___

STEP 5: Open Review Queue
  Action: Click notification → opens review queue
  Expected: Questions visible, grouped by content
            Quick Assessment count shown
            Threshold indicator shows X/5 approved
  Pass/Fail: ___

STEP 6: Review 3 Questions
  Action: Approve 2 questions without changes
          Edit 1 question (change question text slightly)
          Reject 1 question (POORLY_WORDED)
  Expected: Approved count increments
            Edited question shows "Edited" badge
            Rejected question disappears from queue
  Pass/Fail: ___

STEP 7: Reach Threshold
  Action: Approve enough questions to reach 5 total
  Expected: Green threshold indicator appears: "5/5 minimum met"
            Student receives QUIZ_AVAILABLE notification
  Pass/Fail: ___

STEP 8: Publish Content
  Action: Return to content list
          Click "Publish" on the content item
  Expected: Content status changes to Published
            Students can now see it in their content library
  Pass/Fail: ___

SCRIPT 02 RESULT: PASS / FAIL
Notes: _______________________________________________
```

## 6.3 Script 03 — Student Quiz Taking Flow

```
SCRIPT 03: Student Quiz Taking Flow
Estimated time: 15 minutes
Run as: Student (student1@test.com)
Prerequisites: Scripts 01 and 02 completed

STEP 1: Login and See Content
  Action: Login as student1@test.com
          Navigate to content library
  Expected: Content item visible with "Take Quiz" badge
  Pass/Fail: ___

STEP 2: Start Watching Video
  Action: Click on content item
          Watch 30 seconds of video
          Note the progress percentage
  Expected: Progress updates after 30 seconds
            Last position saved (reload page → video resumes)
  Pass/Fail: ___

STEP 3: Open Quiz
  Action: Click "Take Quiz" button
  Expected: Quiz intro screen shows
            Correct question count shown
            Warning about no retakes shown
  Pass/Fail: ___

STEP 4: Take the Quiz
  Action: Click "Start Quiz"
          Answer all questions (deliberately answer 1 wrong
            to test the results screen)
          Use Question Navigator to jump to question 3
          Return to question 1 via navigator
          Use Previous button to navigate backward
  Expected: Navigator shows green for answered questions
            Auto-save works (verify: refresh page,
              answers should restore)
  Pass/Fail: ___

STEP 5: Review and Submit
  Action: On last question, click "Review Answers"
          Verify all answers shown in review screen
          Click "Submit Quiz"
          Click confirm in dialog
  Expected: Results screen appears immediately
            Score shown (e.g., 4/5 — 80%)
            Time taken shown
            Per-question breakdown shows
            Wrong answer shows correct answer + explanation
  Pass/Fail: ___

STEP 6: Check Quiz History
  Action: Click "View Quiz History"
  Expected: Completed attempt appears in history
            Score and date shown correctly
  Pass/Fail: ___

STEP 7: Verify Cannot Retake
  Action: Return to content page
  Expected: "Quick Quiz completed — Score: 80%" shown
            No "Take Quiz" button visible
  Pass/Fail: ___

STEP 8: Login as Different Student
  Action: Logout. Login as student2@test.com
          Navigate to same content → Start Quiz
          Note the option order for Question 1
  Expected: Option order for student2 is different from
            what student1 saw (option shuffle works)
  Pass/Fail: ___

SCRIPT 03 RESULT: PASS / FAIL
Notes: _______________________________________________
```

## 6.4 Script 04 — Live Session Flow

```
SCRIPT 04: Live Session Flow
Estimated time: 30 minutes
Run as: Mentor (streaming) + Student (joining)
Prerequisites: OBS Studio, Script 01 completed

STEP 1: Schedule Session (as Mentor)
  Action: Navigate to Sessions → "Schedule Session"
          Title: "QA Test Live Session"
          Date: [today] Time: [15 minutes from now]
          Estimated duration: 30 minutes
          Link to content from Script 02
          Click Schedule
  Expected: Session appears in session list as SCHEDULED
            Students receive SESSION_SCHEDULED notification
  Pass/Fail: ___

STEP 2: Verify Student Notification
  Action: Switch to student1@test.com
          Check notification bell
  Expected: "New live session scheduled" notification visible
  Pass/Fail: ___

STEP 3: Start Stream (as Mentor)
  Action: Wait until 15 minutes before scheduled time
          As mentor: Navigate to session detail
          Click "Start Stream"
  Expected: Stream key and RTMP URL appear
            Start Stream button replaced with End Stream
  Pass/Fail: ___

STEP 4: Configure OBS and Go Live
  Action: In OBS: Settings → Stream
          Set RTMP URL to provided RTMP URL
          Set Stream Key to provided key
          Click "Start Streaming" in OBS
  Expected: Mux receives stream within 30 seconds
            Student sees SESSION_STARTED notification/toast
  Pass/Fail: ___

STEP 5: Student Joins Session
  Action: As student1: Click "Join Live Session" button
  Expected: Video player loads with live stream
            Attendance record created in backend
  Pass/Fail: ___

STEP 6: Verify Attendance Tracking
  Action: As mentor: Check attendance in session detail
  Expected: student1 shows as ATTENDING with join time
  Pass/Fail: ___

STEP 7: End Session
  Action: As mentor: Click "End Stream" → Confirm
          OBS: Stop Streaming
  Expected: Session status → COMPLETED
            Student sees stream end
            Attendance records closed
            "Recording will be available within 10 minutes" message
  Pass/Fail: ___

STEP 8: Verify Recording
  Action: Wait 10 minutes
          Check session in student view
  Expected: "Watch Recording" button appears
            Recording plays correctly
  Pass/Fail: ___

STEP 9: Attendance Report
  Action: As mentor: Open attendance report for session
  Expected: student1 shows ATTENDED with correct duration
            Other students show ABSENT
  Pass/Fail: ___

SCRIPT 04 RESULT: PASS / FAIL
Notes: _______________________________________________
```

## 6.5 Script 05 — Progress Dashboard Flow

```
SCRIPT 05: Progress Dashboard Flow
Estimated time: 10 minutes
Run as: Student and Mentor
Prerequisites: Scripts 01-04 completed,
               Nightly metrics job run at least once

STEP 1: Trigger Metrics Calculation
  Action: As admin: POST /api/admin/batches/:id/recalculate-metrics
          (or wait for 2 AM nightly job)
  Expected: API returns success
            student_progress records exist in database
  Pass/Fail: ___

STEP 2: Student Dashboard
  Action: As student1: Navigate to /student/dashboard
  Expected: Overall score shown (non-zero if quiz taken)
            Radar chart renders with 9 dimensions
            At least one insight card shown
            Quiz history section shows completed attempts
            Content engagement shows correct completion rate
  Pass/Fail: ___

STEP 3: Click Radar Chart Axis
  Action: Click on "Consistency" axis in radar chart
  Expected: Dimension detail modal/panel opens
            Shows description of dimension
            Shows current score and history
            Shows improvement tip
  Pass/Fail: ___

STEP 4: Mentor Batch Overview
  Action: As mentor: Navigate to batch dashboard
  Expected: Table shows all enrolled students
            Each student row has dimension scores
            Sortable by clicking column headers
            Sort by "Consistency" — verify order
  Pass/Fail: ___

STEP 5: View Individual Student
  Action: Click on student1's row
  Expected: student1's full dashboard opens
            Same data student sees
  Pass/Fail: ___

STEP 6: Search Student Table
  Action: Type partial name in search box
  Expected: Table filters to matching students only
  Pass/Fail: ___

SCRIPT 05 RESULT: PASS / FAIL
Notes: _______________________________________________
```

---

# 7. API Testing with REST Client

Create these `.http` files in `backend/tests/http/`
for quick endpoint testing during development.
Requires the REST Client VS Code extension.

```http
### backend/tests/http/auth.http

@baseUrl = http://localhost:3001/api

### Login as Admin
POST {{baseUrl}}/auth/login
Content-Type: application/json

{
  "email": "admin@dev.com",
  "password": "ChangeMe123!"
}

### Get current user
GET {{baseUrl}}/auth/me

### Login as Mentor
POST {{baseUrl}}/auth/login
Content-Type: application/json

{
  "email": "mentor@dev.com",
  "password": "ChangeMe123!"
}

### Login as Student
POST {{baseUrl}}/auth/login
Content-Type: application/json

{
  "email": "student1@dev.com",
  "password": "ChangeMe123!"
}
```

```http
### backend/tests/http/batches.http

@baseUrl = http://localhost:3001/api
@batchId = PASTE_BATCH_ID_HERE

### Create Batch
POST {{baseUrl}}/batches
Content-Type: application/json

{
  "name": "REST Client Test Batch",
  "start_date": "2026-04-01",
  "end_date": "2026-05-31"
}

### Get All Batches
GET {{baseUrl}}/batches

### Get Specific Batch
GET {{baseUrl}}/batches/{{batchId}}

### Enroll Students
POST {{baseUrl}}/batches/{{batchId}}/enroll
Content-Type: application/json

{
  "student_ids": [
    "PASTE_STUDENT_ID_HERE"
  ]
}

### Get Batch Students
GET {{baseUrl}}/batches/{{batchId}}/students

### Get Batch Progress (mentor)
GET {{baseUrl}}/batches/{{batchId}}/students/progress?sort_by=overall_score&sort_dir=desc
```

```http
### backend/tests/http/quiz-taking.http

@baseUrl = http://localhost:3001/api
@contentId = PASTE_CONTENT_ID_HERE

### Get Quiz Status for Content
GET {{baseUrl}}/content/{{contentId}}/quizzes/status

### Get Available Quiz Questions
GET {{baseUrl}}/content/{{contentId}}/quizzes/available?quiz_type=QUICK_ASSESSMENT

### Submit Quiz
POST {{baseUrl}}/quizzes/submit
Content-Type: application/json

{
  "content_id": "{{contentId}}",
  "quiz_type": "QUICK_ASSESSMENT",
  "attempt_id": "{{$guid}}",
  "started_at": "{{$datetime iso8601 -5 m}}",
  "responses": [
    {
      "quiz_id": "PASTE_QUIZ_ID_1",
      "selected_display_index": 0,
      "time_to_answer_seconds": 35
    }
  ],
  "display_orders": {
    "PASTE_QUIZ_ID_1": [0, 1, 2, 3]
  }
}

### Get Quiz History
GET {{baseUrl}}/students/me/quiz-history
```

---

# 8. Frontend Component Testing

```typescript
// frontend/tests/components/DimensionCard.test.tsx
import { render, screen } from "@testing-library/react";
import DimensionCard from "@/components/dashboard/DimensionCard";

describe("DimensionCard", () => {

  it("renders score correctly", () => {
    render(
      <DimensionCard
        dimension="consistency"
        label="Consistency"
        currentScore={75.3}
      />
    );
    expect(screen.getByText("75")).toBeInTheDocument();
  });

  it("shows green styling for score >= 70", () => {
    const { container } = render(
      <DimensionCard
        dimension="consistency"
        label="Consistency"
        currentScore={80}
      />
    );
    // Green background color applied
    const card = container.firstChild as HTMLElement;
    expect(card.style.background).toContain("#D1FAE5");
  });

  it("shows amber styling for score 50-69", () => {
    const { container } = render(
      <DimensionCard
        dimension="consistency"
        label="Consistency"
        currentScore={60}
      />
    );
    const card = container.firstChild as HTMLElement;
    expect(card.style.background).toContain("#FEF3C7");
  });

  it("shows red styling for score < 50", () => {
    const { container } = render(
      <DimensionCard
        dimension="consistency"
        label="Consistency"
        currentScore={35}
      />
    );
    const card = container.firstChild as HTMLElement;
    expect(card.style.background).toContain("#FEE2E2");
  });

  it("shows up trend indicator for improvement", () => {
    render(
      <DimensionCard
        dimension="consistency"
        label="Consistency"
        currentScore={75}
        previousScore={65}
      />
    );
    expect(screen.getByText("↑")).toBeInTheDocument();
  });

  it("shows down trend indicator for decline", () => {
    render(
      <DimensionCard
        dimension="consistency"
        label="Consistency"
        currentScore={55}
        previousScore={70}
      />
    );
    expect(screen.getByText("↓")).toBeInTheDocument();
  });

  it("shows stable indicator for minimal change", () => {
    render(
      <DimensionCard
        dimension="consistency"
        label="Consistency"
        currentScore={70}
        previousScore={71}
      />
    );
    expect(screen.getByText("→")).toBeInTheDocument();
  });

  it("calls onClick when clicked", () => {
    const handleClick = jest.fn();
    render(
      <DimensionCard
        dimension="consistency"
        label="Consistency"
        currentScore={70}
        onClick={handleClick}
      />
    );

    screen.getByText("Consistency").click();
    expect(handleClick).toHaveBeenCalledTimes(1);
  });
});
```

```typescript
// frontend/tests/hooks/useQuizSession.test.ts
import { renderHook, act } from "@testing-library/react";
import { useQuizSession } from "@/hooks/useQuizSession";

// Mock Axios
jest.mock("@/lib/api", () => ({
  default: {
    get: jest.fn(),
    post: jest.fn(),
  },
}));
import api from "@/lib/api";

const mockQuestions = [
  {
    quiz_id: "quiz-1",
    question_text: "Question 1?",
    options: ["A", "B", "C", "D"],
    display_order: [0, 1, 2, 3],
    question_number: 1,
  },
  {
    quiz_id: "quiz-2",
    question_text: "Question 2?",
    options: ["A", "B", "C", "D"],
    display_order: [1, 0, 3, 2],
    question_number: 2,
  },
];

describe("useQuizSession", () => {

  beforeEach(() => {
    localStorage.clear();
    jest.clearAllMocks();
  });

  it("should start in intro state", () => {
    const { result } = renderHook(() =>
      useQuizSession("content-1", "QUICK_ASSESSMENT")
    );
    expect(result.current.sessionState).toBe("intro");
  });

  it("should transition to taking state after startQuiz", async () => {
    (api.get as jest.Mock).mockResolvedValue({
      data: {
        data: {
          quiz_session: { total_questions: 2 },
          questions: mockQuestions,
        },
      },
    });

    const { result } = renderHook(() =>
      useQuizSession("content-1", "QUICK_ASSESSMENT")
    );

    await act(async () => {
      await result.current.startQuiz();
    });

    expect(result.current.sessionState).toBe("taking");
    expect(result.current.questions).toHaveLength(2);
  });

  it("should save answers to localStorage on selection", async () => {
    (api.get as jest.Mock).mockResolvedValue({
      data: {
        data: {
          quiz_session: { total_questions: 2 },
          questions: mockQuestions,
        },
      },
    });

    const { result } = renderHook(() =>
      useQuizSession("content-1", "QUICK_ASSESSMENT")
    );

    await act(async () => {
      await result.current.startQuiz();
    });

    act(() => {
      result.current.selectAnswer("quiz-1", 2);
    });

    const saved = localStorage.getItem(
      "quiz_session_content-1_QUICK_ASSESSMENT"
    );
    expect(saved).toBeTruthy();
    const parsed = JSON.parse(saved!);
    expect(parsed.state.answers["quiz-1"]).toBe(2);
  });

  it("should count answered questions correctly", async () => {
    (api.get as jest.Mock).mockResolvedValue({
      data: {
        data: {
          quiz_session: { total_questions: 2 },
          questions: mockQuestions,
        },
      },
    });

    const { result } = renderHook(() =>
      useQuizSession("content-1", "QUICK_ASSESSMENT")
    );

    await act(async () => {
      await result.current.startQuiz();
    });

    expect(result.current.answeredCount).toBe(0);
    expect(result.current.isAllAnswered).toBe(false);

    act(() => { result.current.selectAnswer("quiz-1", 0); });
    expect(result.current.answeredCount).toBe(1);

    act(() => { result.current.selectAnswer("quiz-2", 1); });
    expect(result.current.answeredCount).toBe(2);
    expect(result.current.isAllAnswered).toBe(true);
  });
});
```

---

# 9. AI Pipeline Testing

## 9.1 Whisper Output Quality Tests

```typescript
// tests/integration/whisper.test.ts
// Note: These tests require Whisper and a test audio file
// Skip in CI without GPU — mark with @slow

import { processTranscribeJob } from
  "../../src/workers/transcription.worker";

describe("Whisper Transcription Quality @slow", () => {

  it("should transcribe English speech with >80% accuracy", async () => {
    // Use a known test audio file with known transcript
    const testAudioPath = "tests/fixtures/test_lecture_30sec.mp3";
    const expectedText = "the event loop is what allows node.js";

    const result = await runWhisperLocally(
      testAudioPath,
      "medium"
    );

    // Check known phrase appears (case insensitive)
    expect(result.text.toLowerCase()).toContain(
      expectedText.toLowerCase()
    );
  });

  it("should produce valid JSON output format", async () => {
    const testAudioPath = "tests/fixtures/test_lecture_30sec.mp3";
    const result = await runWhisperLocally(testAudioPath, "tiny");

    expect(result).toHaveProperty("text");
    expect(result).toHaveProperty("segments");
    expect(result).toHaveProperty("language");
    expect(Array.isArray(result.segments)).toBe(true);
    expect(typeof result.text).toBe("string");
    expect(result.text.length).toBeGreaterThan(0);
  });
});
```

## 9.2 Ollama Output Quality Tests

```typescript
// tests/integration/ollama.test.ts
// Note: These tests require Ollama running with Mistral 7B
// Skip in CI without Ollama — mark with @slow

import { extractConcepts } from
  "../../src/utils/quizGenerationPipeline.utils";
import { generateWithOllama } from
  "../../src/utils/ollama.utils";
import { parseJsonFromResponse } from
  "../../src/utils/jsonParser.utils";

const TEST_TRANSCRIPT = `
  The Node.js event loop is what allows Node.js to perform
  non-blocking I/O operations. The event loop has several
  phases including timers, poll, and check phases.
  The require() function loads modules synchronously and
  caches them. Express.js is a minimal web framework for
  Node.js that provides routing and middleware capabilities.
`;

describe("Ollama Quiz Generation Quality @slow", () => {

  it("should extract at least 2 concepts from test transcript", async () => {
    const concepts = await extractConcepts(
      TEST_TRANSCRIPT,
      "Node.js Fundamentals",
      null,
      "test-run-id",
      "test-content-id"
    );

    expect(concepts.length).toBeGreaterThanOrEqual(2);
    expect(concepts.length).toBeLessThanOrEqual(8);

    for (const concept of concepts) {
      expect(concept.concept).toBeTruthy();
      expect(concept.explanation).toBeTruthy();
      expect(concept.transcript_excerpt).toBeTruthy();
    }
  }, 120000);

  it("should return parseable JSON for concept extraction prompt", async () => {
    const prompt = `Extract 2 key concepts from: "The event loop handles async operations."
  
Respond with ONLY a JSON array: [{"concept": "...", "explanation": "...", "transcript_excerpt": "..."}]`;

    const response = await generateWithOllama(prompt, 512);
    const parsed = parseJsonFromResponse<any[]>(response);

    expect(Array.isArray(parsed)).toBe(true);
    expect(parsed.length).toBeGreaterThanOrEqual(1);
  }, 60000);

  it("should generate a valid 4-option question", async () => {
    const prompt = `Write ONE multiple choice question about the Node.js event loop.

Respond with ONLY JSON:
{"question": "What is...?", "options": ["A", "B", "C", "D"], "correct_option_index": 0, "explanation": "...", "cognitive_level": "RECALL", "difficulty": "MEDIUM"}`;

    const response = await generateWithOllama(prompt, 400);
    const parsed = parseJsonFromResponse<any>(response);

    expect(typeof parsed.question).toBe("string");
    expect(parsed.question).toContain("?");
    expect(Array.isArray(parsed.options)).toBe(true);
    expect(parsed.options).toHaveLength(4);
    expect([0, 1, 2, 3]).toContain(parsed.correct_option_index);
  }, 60000);
});
```

---

# 10. Security Testing Checklist

Run through this checklist manually before every release.
Every item must be PASS before the release proceeds.

## 10.1 Authentication and Authorization

```
□ Unauthenticated access returns 401
  Test: GET /api/auth/me (no cookie)
  Expected: 401 AUTHENTICATION_REQUIRED

□ Expired token returns 401
  Test: Manually expire a JWT in database, try to use it
  Expected: 401 TOKEN_EXPIRED

□ Student cannot access admin endpoints
  Test: Login as student, POST /api/batches
  Expected: 403 PERMISSION_DENIED

□ Student cannot access another student's data
  Test: Login as student1, GET /api/students/student2-id/dashboard
  Expected: 403 PERMISSION_DENIED

□ Student cannot access mentor's quiz review
  Test: Login as student, POST /api/quizzes/quiz-id/approve
  Expected: 403 PERMISSION_DENIED

□ Mentor cannot access unassigned batch
  Test: Login as mentor, GET /api/batches/other-batch-id
  Expected: 403 PERMISSION_DENIED

□ Mentor cannot start another mentor's session
  Test: Login as mentor1, POST /api/live-sessions/mentor2-session/start
  Expected: 403 PERMISSION_DENIED

□ Stream key never returned to students
  Test: Login as student, GET /api/live-sessions/live-session-id
  Expected: Response has no stream_key field

□ Soft-deleted content not accessible
  Test: Delete content, GET /api/content/deleted-id
  Expected: 404 CONTENT_NOT_FOUND
```

## 10.2 Input Validation

```
□ SQL injection attempt in name fields
  Test: POST /api/batches with name = "'; DROP TABLE batches; --"
  Expected: 400 VALIDATION_ERROR (not a 500)
  Note: Prisma uses parameterized queries — this should be safe
        but verify no 500 occurs

□ XSS attempt in text fields
  Test: POST /api/content with title = "<script>alert(1)</script>"
  Expected: 400 VALIDATION_ERROR or title stored as plain text
  Verify: GET the content back — no script tags executed

□ Oversized request body
  Test: POST with 50MB JSON body
  Expected: 413 Payload Too Large (Express limit)

□ Missing required fields
  Test: POST /api/auth/login with no password
  Expected: 400 VALIDATION_ERROR with field details

□ Invalid UUID in path parameter
  Test: GET /api/batches/not-a-uuid
  Expected: 400 or 404 (not a 500)

□ Negative page number
  Test: GET /api/notifications?page=-1
  Expected: Default to page 1 or 400

□ Extremely large limit parameter
  Test: GET /api/notifications?limit=99999
  Expected: Capped at 100 (max limit enforced)
```

## 10.3 Business Logic Security

```
□ Cannot enroll same student twice
  Test: Enroll student, enroll again
  Expected: Second enrollment returns skipped, not duplicate record

□ Cannot submit quiz after already submitted
  Test: Submit quiz, submit again with different attempt_id
  Expected: 409 QUIZ_ALREADY_SUBMITTED

□ Cannot approve own rejected question as student
  Test: Verified by authorization test above

□ Student cannot see PENDING_REVIEW quiz questions
  Test: Create quiz with PENDING_REVIEW status
        Login as student, GET /api/content/x/quizzes/available
  Expected: PENDING_REVIEW questions not in response

□ Retention quiz not available without Quick Assessment
  Test: Login as student who has not done Quick Assessment
        Try to take Retention quiz
  Expected: 403 PREREQUISITE_NOT_MET

□ Session cannot be started by wrong mentor
  Already tested in authorization section above
```

---

# 11. Performance Testing

## 11.1 API Response Time Benchmarks

These tests use `curl` with timing. Run against local dev,
not staging, to eliminate network latency.

```bash
# Test dashboard load time (most complex query)
time curl -s -b /tmp/m2i_cookies.txt \
  http://localhost:3001/api/students/me/dashboard > /dev/null
# Target: < 500ms

# Test batch student progress table (multiple students)
time curl -s -b /tmp/m2i_admin_cookies.txt \
  "http://localhost:3001/api/batches/$BATCH_ID/students/progress" \
  > /dev/null
# Target: < 300ms for 50 students

# Test quiz submission
time curl -s -b /tmp/m2i_student_cookies.txt \
  -X POST http://localhost:3001/api/quizzes/submit \
  -H "Content-Type: application/json" \
  -d "$QUIZ_SUBMIT_PAYLOAD" > /dev/null
# Target: < 500ms

# Test notification unread count (called on every page load)
time curl -s -b /tmp/m2i_cookies.txt \
  http://localhost:3001/api/notifications/unread-count > /dev/null
# Target: < 50ms
```

## 11.2 Database Query Analysis

```sql
-- Find slow queries in PostgreSQL logs
-- After enabling: log_min_duration_statement = 100 (ms)
-- Check logs at: docker compose logs postgres | grep duration

-- Check for missing indexes on common query patterns
EXPLAIN ANALYZE
SELECT * FROM quizzes
WHERE content_id = 'some-uuid'
  AND quiz_type = 'QUICK_ASSESSMENT'
  AND generation_status = 'APPROVED'
  AND available_from <= NOW();
-- Should show: Index Scan (not Seq Scan)
-- If Seq Scan: index missing

EXPLAIN ANALYZE
SELECT * FROM notifications
WHERE user_id = 'some-uuid'
  AND is_read = FALSE
ORDER BY created_at DESC
LIMIT 20;
-- Should show: Index Scan using idx_notifications_user_unread
```

## 11.3 Nightly Job Performance

```bash
# Measure nightly metrics job duration
# Add timing to runNightlyMetricsJob:
console.time("nightly-metrics");
await runNightlyMetricsJob();
console.timeEnd("nightly-metrics");

# Target benchmarks:
# 10 students  : < 30 seconds
# 50 students  : < 3 minutes
# 100 students : < 6 minutes
# 500 students : < 30 minutes (Phase Two concern)
```

---

# 12. Regression Testing Checklist

Run this checklist every time a major PR is merged to main.
Takes approximately 20 minutes. Catches integration regressions
before they reach staging.

```
CORE AUTH FLOW
□ Login returns 200 with cookies set
□ GET /api/auth/me returns user data
□ Logout clears cookies
□ Refresh token works after access token expires
□ 401 returned for all endpoints without cookie

BATCH MANAGEMENT
□ Create batch succeeds with valid data
□ Enroll student adds enrollment record
□ Student can fetch /api/my/batch after enrollment
□ Mentor can access batch after assignment

CONTENT PIPELINE
□ Upload URL generates (S3 call mocked in test)
□ Content record created after upload
□ Content appears in batch content list
□ Content publish changes visibility for students
□ Watch progress saves and resumes

QUIZ FLOW
□ Quiz available after 5 approved questions exist
□ Questions returned with display_order field
□ Submission creates quiz_responses records
□ Submission creates quiz_attempts record
□ Correct score calculated
□ Same attempt_id returns same result (idempotency)
□ Quiz history shows completed attempt

LIVE SESSIONS
□ Session scheduling creates record
□ Session appears in batch session list
□ Join creates attendance record
□ Leave calculates duration_seconds

NOTIFICATIONS
□ Creating notification via service stores to DB
□ GET /api/notifications returns correct list
□ Unread count reflects actual unread count
□ Mark as read decrements count

METRICS
□ calculateLearningVelocity returns 0-100
□ calculateOverallScore returns weighted average
□ Student progress upsert works

DASHBOARD
□ GET /api/students/me/dashboard returns data structure
□ Response includes current_scores, quiz_history, insights
```

---

# 13. Bug Reporting Guide

## 13.1 Bug Report Template

```markdown
## Bug Report

**Title:** [Short description — one line]

**Severity:** P1 / P2 / P3
  P1 = Data loss, auth failure, crash, core flow blocked
  P2 = Feature works but incorrectly, poor UX, confusing
  P3 = Cosmetic, minor, nice-to-have fix

**Environment:** Local Dev / Staging / Production

**Feature:** F01 Auth / F02 Batch / F03 Content / F04 QuizGen /
             F05 Review / F06 Streaming / F07 QuizTaking /
             F08 Dashboard / F09 Metrics / F10 Notifications

**Steps to Reproduce:**
1. Login as [role] with [email]
2. Navigate to [page]
3. Click [action]
4. [What happened]

**Expected Behavior:**
[What should have happened]

**Actual Behavior:**
[What actually happened]

**Evidence:**
- Screenshot: [attach]
- Console error: [copy-paste]
- Network request: [copy-paste response if relevant]
- Backend log: [copy-paste error if relevant]

**Workaround:** [Is there any workaround? Or none?]

**Assignee:** [Who should fix this?]
```

## 13.2 Severity Definitions

**P1 — Fix immediately before any other work:**

- User cannot log in
- Data is being corrupted or lost
- Application crashes for any user
- Security vulnerability
- Core quiz taking or scoring is wrong

**P2 — Fix in current sprint:**

- Feature works but gives wrong result in edge cases
- UI is confusing or misleading
- Performance is noticeably bad (> 3 second load)
- Notification not sent when it should be
- Error message is cryptic

**P3 — Fix when convenient:**

- Cosmetic issues
- Minor copy errors
- Missing loading state
- Empty state missing
- Minor layout issues

---

# 14. CI/CD Pipeline

## 14.1 GitHub Actions Workflow

```yaml
# .github/workflows/ci.yml
name: CI

on:
  push:
    branches: [main, develop]
  pull_request:
    branches: [main]

jobs:
  backend-test:
    name: Backend Tests
    runs-on: ubuntu-latest

    services:
      postgres:
        image: postgres:15
        env:
          POSTGRES_DB: m2i_lms_test
          POSTGRES_USER: m2i_user
          POSTGRES_PASSWORD: m2i_test_password
        options: >-
          --health-cmd pg_isready
          --health-interval 10s
          --health-timeout 5s
          --health-retries 5
        ports:
          - 5432:5432

      redis:
        image: redis:7-alpine
        options: >-
          --health-cmd "redis-cli ping"
          --health-interval 10s
        ports:
          - 6379:6379

    steps:
      - uses: actions/checkout@v4

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: "20"
          cache: "npm"
          cache-dependency-path: backend/package-lock.json

      - name: Install dependencies
        working-directory: backend
        run: npm ci

      - name: Run Prisma migrations
        working-directory: backend
        env:
          DATABASE_URL: postgresql://m2i_user:m2i_test_password@localhost:5432/m2i_lms_test
        run: npx prisma migrate deploy

      - name: TypeScript check
        working-directory: backend
        run: npx tsc --noEmit

      - name: ESLint check
        working-directory: backend
        run: npm run lint

      - name: Run unit and integration tests
        working-directory: backend
        env:
          NODE_ENV: test
          DATABASE_URL: postgresql://m2i_user:m2i_test_password@localhost:5432/m2i_lms_test
          JWT_SECRET: ci_test_jwt_secret_minimum_32_chars
          JWT_REFRESH_SECRET: ci_test_refresh_secret_min_32_chars
          REDIS_HOST: localhost
          REDIS_PORT: 6379
        run: npm test -- --coverage --ci
        # Note: AI tests (@slow) are skipped — no GPU in CI

      - name: Upload coverage report
        uses: codecov/codecov-action@v4
        with:
          directory: backend/coverage
          flags: backend

  frontend-test:
    name: Frontend Tests
    runs-on: ubuntu-latest

    steps:
      - uses: actions/checkout@v4

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: "20"
          cache: "npm"
          cache-dependency-path: frontend/package-lock.json

      - name: Install dependencies
        working-directory: frontend
        run: npm ci

      - name: TypeScript check
        working-directory: frontend
        run: npx tsc --noEmit

      - name: ESLint check
        working-directory: frontend
        run: npm run lint

      - name: Run component tests
        working-directory: frontend
        run: npm test -- --run

      - name: Build check
        working-directory: frontend
        env:
          NEXT_PUBLIC_API_URL: http://localhost:3001
          NEXT_PUBLIC_SOCKET_URL: http://localhost:3001
        run: npm run build
```

## 14.2 Branch Protection Rules

Configure in GitHub → Settings → Branches → main:

```
✓ Require pull request reviews before merging (1 reviewer)
✓ Require status checks to pass before merging:
    - backend-test
    - frontend-test
✓ Require branches to be up to date before merging
✓ Do not allow bypassing the above settings
```

## 14.3 Deployment Pipeline

```yaml
# .github/workflows/deploy-staging.yml
name: Deploy to Staging

on:
  push:
    branches: [main]

jobs:
  deploy:
    name: Deploy to Staging
    runs-on: ubuntu-latest
    needs: [backend-test, frontend-test]  # Only if CI passes

    steps:
      - uses: actions/checkout@v4

      # Backend: Deploy to Elastic Beanstalk
      - name: Deploy backend to Elastic Beanstalk
        uses: einaregilsson/beanstalk-deploy@v22
        with:
          aws_access_key: ${{ secrets.AWS_ACCESS_KEY_ID }}
          aws_secret_key: ${{ secrets.AWS_SECRET_ACCESS_KEY }}
          application_name: m2i-lms-backend
          environment_name: m2i-lms-staging
          region: ap-south-1
          version_label: ${{ github.sha }}

      # Frontend: Deploy to Vercel
      - name: Deploy frontend to Vercel
        uses: amondnet/vercel-action@v25
        with:
          vercel-token: ${{ secrets.VERCEL_TOKEN }}
          vercel-org-id: ${{ secrets.VERCEL_ORG_ID }}
          vercel-project-id: ${{ secrets.VERCEL_PROJECT_ID }}
```

---

# 15. Pre-Launch QA Checklist

This is the definitive checklist that must be completed and
signed off before the beta launch. Every item must show
PASS. Any FAIL blocks the launch.

## 15.1 Functional Completeness

```
FEATURE F01 — AUTHENTICATION
□ Register creates account
□ Login sets HttpOnly cookies
□ Logout clears cookies
□ Refresh token renews access token
□ GET /api/auth/me returns correct user data
□ Change password works and revokes all tokens
□ Rate limiter blocks 6th login attempt in 1 minute

FEATURE F02 — BATCH MANAGEMENT
□ Admin can create batch
□ Admin can enroll students
□ Admin can assign mentor
□ Student sees their batch on login
□ Batch status auto-transitions to ACTIVE on start date

FEATURE F03 — CONTENT MANAGEMENT
□ Mentor can upload video
□ Progress bar shows during upload
□ Content appears in list after upload
□ Transcription runs automatically after upload
□ Mentor can publish content
□ Student sees published content only
□ Video resumes from last position
□ Supplementary files downloadable

FEATURE F04 — QUIZ GENERATION
□ Concepts extracted after transcription
□ Questions generated for each concept
□ Questions stored with PENDING_REVIEW status
□ Mentor notified when questions ready
□ Quiz generation log entries created

FEATURE F05 — QUIZ REVIEW
□ Mentor sees pending questions in review queue
□ Approve changes status to APPROVED
□ Reject removes question from queue
□ Edit preserves original text
□ Threshold indicator updates correctly
□ Student notified when threshold met

FEATURE F06 — LIVE STREAMING
□ Session scheduling creates record
□ Session reminder sent 30 minutes before
□ Mentor can start stream (Mux key returned)
□ Students notified when session goes live
□ Student can join and see stream
□ Attendance record created on join
□ Duration calculated correctly on leave
□ Session end closes all attendance records
□ Recording available within 15 minutes of session end
□ Missed session marked after 30 minutes past schedule

FEATURE F07 — QUIZ TAKING
□ Student sees quiz available badge when threshold met
□ Quiz intro screen shows correct question count
□ Option order is randomized per student
□ localStorage saves answers every selection
□ Refresh restores saved answers
□ Submit creates correct response records
□ Score calculated correctly
□ Results screen shows per-question breakdown
□ Cannot retake after submission
□ Retention quiz requires Quick Assessment first

FEATURE F08 — DASHBOARD
□ Radar chart renders for all 9 dimensions
□ Scores are real data (not zeros)
□ Previous week scores show as outline
□ At least 2 insights generated
□ Mentor sees all students in batch table
□ Table sorts correctly by each column
□ Alert banner shows when alerts exist
□ Resolve alert marks it resolved

FEATURE F09 — METRICS ENGINE
□ Nightly job runs at 2 AM
□ student_progress records created
□ All 9 dimension scores in 0-100 range
□ On-demand job triggered after quiz submission
□ Alert job creates INACTIVE alert for 3+ day absent student

FEATURE F10 — NOTIFICATIONS
□ Bell count shows correct unread count
□ Real-time toast appears for SESSION_STARTED
□ Toast auto-dismisses after 5 seconds
□ Mark as read decrements count
□ Mark all as read clears all
□ All 18 notification types display correct icon
□ Clicking notification navigates to action_url
```

## 15.2 Security

```
□ Students cannot access other students' data (403)
□ Students cannot call mentor/admin endpoints (403)
□ Mentors cannot access unassigned batches (403)
□ Stream key never in student API responses
□ All endpoints return 401 without auth cookie
□ HTTPS enforced on staging (HTTP redirects to HTTPS)
□ Helmet security headers present in all responses
□ Rate limiting active on login endpoint
□ No sensitive data in error messages (no stack traces in prod)
```

## 15.3 Performance

```
□ Dashboard load < 2 seconds (measured in staging)
□ Quiz submission < 500ms
□ Notification unread count < 100ms
□ Content list loads < 500ms for 20+ items
□ Nightly job completes < 5 minutes for 50 students
□ No memory leaks (server memory stable after 30 minutes)
```

## 15.4 Infrastructure

```
□ Staging environment fully functional
□ All environment variables set in staging
□ All migrations applied to staging database
□ SSL certificate valid (check expiry date > 90 days)
□ Ollama running on AI instance with correct model
□ Whisper installed on AI instance
□ FFmpeg installed on AI instance
□ S3 bucket accessible with correct permissions
□ CloudFront distribution routing to S3
□ Mux webhooks configured
□ Redis connected and healthy
□ Winston logs writing to file
□ Bull queue dashboard accessible (admin only)
□ Health endpoints return 200
```

## 15.5 Data and Seed

```
□ Production database has only the super admin account
   (no test data, no dev seed)
□ Super admin password is NOT the default "ChangeMe123!"
□ Super admin has been told to change password on first login
□ No test email addresses in the database
□ S3 bucket has no test files
```

## 15.6 Sign-off

```
Date of QA completion  : _______________
Completed by           : _______________
Tech Lead sign-off     : _______________
PM sign-off            : _______________

Total items checked    : _____ / 95
Total PASS             : _____
Total FAIL             : _____

Launch decision: GO / NO-GO

If NO-GO, open P1 items:
  1. _______________________________________________
  2. _______________________________________________
  3. _______________________________________________

Estimated resolution date: _______________
Revised launch date       : _______________
```

---

**End of Testing and QA Guide**

---

**Document Information**


| Field                      | Value                                                  |
| -------------------------- | ------------------------------------------------------ |
| Document Title             | M2i_LMS Testing and QA Guide                           |
| Version                    | 1.0                                                    |
| Status                     | Ready                                                  |
| Created                    | March 2026                                             |
| Last Updated               | March 2026                                             |
| Pre-Launch Checklist Items | 95                                                     |
| Maintained By              | Tech Lead / QA                                         |
| Repository                 | /docs/Developer_Guides/M2i_LMS_Testing_And_QA_Guide.md |
