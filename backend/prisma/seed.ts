// backend/prisma/seed.ts
// Run with: npx prisma db seed
// Configured in backend/package.json under "prisma": { "seed": "ts-node prisma/seed.ts" }

import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

const SEED_PASSWORD = "ChangeMe123!";
const PASSWORD_HASH = bcrypt.hashSync(SEED_PASSWORD, 10);

const log = (msg: string) => console.log(`[Seed] ${msg}`);
const divider = () => console.log("─".repeat(50));

async function main() {
  divider();
  log("Starting M2i_LMS development seed...");
  divider();

  // =========================================================
  // CLEAN EXISTING DATA
  // Order matters — delete children before parents
  // =========================================================
  log("Cleaning existing data...");

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

  log("Existing data cleared.");

  // =========================================================
  // CREATE USERS
  // =========================================================
  log("Creating users...");

  const superAdmin = await prisma.user.create({
    data: {
      email: "superadmin@dev.com",
      passwordHash: PASSWORD_HASH,
      fullName: "Super Admin",
      role: "SUPER_ADMIN",
      isActive: true,
    },
  });
  log(`  Created SUPER_ADMIN: ${superAdmin.email}`);

  const admin = await prisma.user.create({
    data: {
      email: "admin@dev.com",
      passwordHash: PASSWORD_HASH,
      fullName: "Dev Admin",
      role: "ADMIN",
      isActive: true,
    },
  });
  log(`  Created ADMIN: ${admin.email}`);

  const mentor1 = await prisma.user.create({
    data: {
      email: "mentor@dev.com",
      passwordHash: PASSWORD_HASH,
      fullName: "Arjun Nair",
      role: "MENTOR",
      isActive: true,
    },
  });
  log(`  Created MENTOR: ${mentor1.email}`);

  const mentor2 = await prisma.user.create({
    data: {
      email: "mentor2@dev.com",
      passwordHash: PASSWORD_HASH,
      fullName: "Priya Mehta",
      role: "MENTOR",
      isActive: true,
    },
  });
  log(`  Created MENTOR: ${mentor2.email}`);

  const studentData = [
    { email: "student1@dev.com", fullName: "Rahul Sharma" },
    { email: "student2@dev.com", fullName: "Priya Patel" },
    { email: "student3@dev.com", fullName: "Amit Singh" },
    { email: "student4@dev.com", fullName: "Sneha Reddy" },
    { email: "student5@dev.com", fullName: "Vikram Kumar" },
  ];

  const students = await Promise.all(
    studentData.map((s) =>
      prisma.user.create({
        data: {
          email: s.email,
          passwordHash: PASSWORD_HASH,
          fullName: s.fullName,
          role: "STUDENT",
          isActive: true,
        },
      })
    )
  );

  students.forEach((s) =>
    log(`  Created STUDENT: ${s.email}`)
  );

  // =========================================================
  // CREATE BATCH
  // Starts 10 days ago so it is in week 2 for testing
  // =========================================================
  log("Creating batch...");

  const now = new Date();
  const startDate = new Date(
    now.getTime() - 10 * 24 * 60 * 60 * 1000
  );
  const endDate = new Date(
    now.getTime() + 46 * 24 * 60 * 60 * 1000
  );

  const batch = await prisma.batch.create({
    data: {
      name: "Full Stack Development Batch Dev 01",
      description:
        "Development test batch covering Node.js, " +
        "Express, PostgreSQL, and React over 8 weeks.",
      startDate,
      endDate,
      status: "ACTIVE",
      createdBy: admin.id,
    },
  });
  log(`  Created batch: "${batch.name}" (ACTIVE, Week 2)`);

  // =========================================================
  // ASSIGN MENTORS TO BATCH
  // =========================================================
  log("Assigning mentors...");

  await prisma.batchMentor.create({
    data: {
      batchId: batch.id,
      mentorId: mentor1.id,
      assignedBy: admin.id,
    },
  });
  log(`  Assigned ${mentor1.fullName} to batch`);

  // =========================================================
  // ENROLL STUDENTS
  // =========================================================
  log("Enrolling students...");

  await Promise.all(
    students.map((student) =>
      prisma.enrollment.create({
        data: {
          studentId: student.id,
          batchId: batch.id,
          enrolledBy: admin.id,
          status: "ACTIVE",
        },
      })
    )
  );
  log(`  Enrolled ${students.length} students`);

  // =========================================================
  // CREATE SAMPLE CONTENT
  // Two published content items with complete transcripts
  // so the AI pipeline can be tested immediately
  // =========================================================
  log("Creating sample content...");

  const content1 = await prisma.content.create({
    data: {
      batchId: batch.id,
      uploadedBy: mentor1.id,
      title: "Introduction to Node.js — Week 1",
      description:
        "Covering the event loop, require(), modules, " +
        "and asynchronous programming fundamentals.",
      contentType: "VIDEO",
      storageUrl: "video/dev/placeholder-nodejs-intro.mp4",
      cdnUrl:
        "https://cdn-dev.m2ilms.com/video/dev/" +
        "placeholder-nodejs-intro.mp4",
      durationSeconds: 2700,
      topicTags: ["nodejs", "javascript", "backend", "eventloop"],
      learningObjectives:
        "Students should understand: " +
        "1) What Node.js is and why it exists. " +
        "2) How the event loop enables non-blocking I/O. " +
        "3) How to import modules using require(). " +
        "4) The difference between synchronous and " +
        "asynchronous code.",
      transcript: `
Welcome to week one of our full stack development curriculum.
Today we are covering Node.js, which is one of the most
important technologies in modern web development.

Node.js is a JavaScript runtime built on Chrome's V8 engine.
It allows developers to run JavaScript outside of the browser,
on the server side. This was a revolutionary idea when it was
introduced in 2009 because JavaScript developers could suddenly
use the same language for both frontend and backend development.

The most important concept in Node.js is the event loop. The
event loop is what allows Node.js to perform non-blocking I/O
operations despite the fact that JavaScript is single-threaded.
It achieves this by offloading operations to the system kernel
whenever possible. When an operation completes, such as reading
a file or receiving a network response, a callback is added to
the event queue and executed when the call stack is empty.

This architecture is fundamentally different from traditional
server environments like Apache, which creates a new thread for
each incoming connection. Node.js uses a single thread for all
requests, which makes it extremely efficient for I/O-heavy
workloads like web APIs and real-time applications.

The require function is used to import modules in Node.js.
When you call require with a module name, Node.js first checks
its module cache to see if that module has been loaded before.
If it has, it returns the cached version immediately. If not,
it locates the module file, reads and executes it, and then
caches the exported object for future calls. This caching
behavior means that modules are singletons by default.

Node.js has three types of modules. Built-in modules like
fs, http, and path come with Node.js and do not need to be
installed. Third-party modules are installed via npm and live
in the node_modules directory. Local modules are files you
create yourself within your project.

Asynchronous programming is central to Node.js development.
Rather than blocking the execution thread while waiting for
I/O operations to complete, Node.js uses callbacks, promises,
and async/await to handle operations that take time. This
allows a single Node.js process to handle thousands of
concurrent connections without creating thousands of threads.

The callback pattern was the original way to handle
asynchronous operations in Node.js. A callback is a function
passed as an argument to another function, to be called when
that operation completes. Promises were introduced to improve
on callbacks and avoid callback hell. Async/await syntax,
introduced in ES2017, makes asynchronous code look and behave
more like synchronous code while still being non-blocking.
      `.trim(),
      transcriptionStatus: "COMPLETE",
      isPublished: true,
      sortOrder: 1,
    },
  });
  log(`  Created content: "${content1.title}"`);

  const content2 = await prisma.content.create({
    data: {
      batchId: batch.id,
      uploadedBy: mentor1.id,
      title: "Express.js Fundamentals — Week 2",
      description:
        "Building REST APIs with Express, routing, " +
        "middleware, and error handling.",
      contentType: "VIDEO",
      storageUrl: "video/dev/placeholder-express-fundamentals.mp4",
      cdnUrl:
        "https://cdn-dev.m2ilms.com/video/dev/" +
        "placeholder-express-fundamentals.mp4",
      durationSeconds: 3240,
      topicTags: ["express", "nodejs", "api", "middleware"],
      learningObjectives:
        "Students should understand: " +
        "1) What Express.js is and why we use it. " +
        "2) How to define routes and handle HTTP methods. " +
        "3) What middleware is and how it works. " +
        "4) How to handle errors in Express applications.",
      transcript: `
Welcome to week two. This week we are building on our Node.js
knowledge and learning Express.js, which is the most popular
web framework for Node.js.

Express.js is a minimal and flexible Node.js web application
framework that provides a robust set of features for web and
mobile applications. It is essentially a thin layer on top of
Node.js's built-in http module that makes it much easier to
build web servers and APIs.

Routing is one of the core concepts in Express. A route
defines how your application responds to a client request at
a particular endpoint, which is a URI or path, and a specific
HTTP request method such as GET, POST, PUT, or DELETE.

Middleware functions are functions that have access to the
request object, the response object, and the next middleware
function in the application's request-response cycle. The
name of the next middleware function is commonly denoted by a
variable called next. Middleware functions can execute any
code, make changes to the request and response objects, end
the request-response cycle, and call the next middleware
function in the stack.

Error handling middleware is defined in the same way as other
middleware functions, except that error handling functions have
four arguments instead of three. The signature is err, req,
res, and next. Error handling middleware must always be defined
after all app.use and route calls.

The req object represents the HTTP request and has properties
for the request query string, parameters, body, HTTP headers,
and so on. The res object represents the HTTP response that an
Express app sends when it gets an HTTP request. It has methods
like res.send, res.json, and res.status.

Express supports template engines for server-side rendering,
but in modern development we typically use Express purely as
an API server and handle the frontend separately using React
or another framework. This is called a REST API architecture.

JSON is the standard data format for API communication.
Express makes it easy to parse JSON request bodies using the
express.json middleware and to send JSON responses using
res.json. The Content-Type header of application/json tells
the client that the response body contains JSON data.
      `.trim(),
      transcriptionStatus: "COMPLETE",
      isPublished: true,
      sortOrder: 2,
    },
  });
  log(`  Created content: "${content2.title}"`);

  // =========================================================
  // CREATE APPROVED QUIZ QUESTIONS FOR CONTENT 1
  // 6 questions so the threshold of 5 is met and
  // students can take the quiz immediately
  // =========================================================
  log("Creating approved quiz questions for Content 1...");

  const content1Quizzes = [
    {
      questionText:
        "What is the primary purpose of the event loop in Node.js?",
      options: [
        "To allow Node.js to handle multiple I/O operations " +
          "concurrently without blocking execution",
        "To manage memory allocation for JavaScript objects",
        "To compile JavaScript code to native machine code " +
          "before execution",
        "To synchronize data between multiple Node.js processes",
      ],
      correctOptionIndex: 0,
      explanation:
        "The event loop enables Node.js to perform non-blocking " +
        "I/O by offloading operations to the system kernel and " +
        "processing callbacks when operations complete, allowing " +
        "a single thread to handle many concurrent connections.",
      cognitiveLevel: "RECALL" as const,
      difficulty: "MEDIUM" as const,
      sourceConcept: "Node.js event loop",
    },
    {
      questionText:
        "What does the require() function return when called with " +
        "a module that has already been loaded?",
      options: [
        "A new fresh copy of the module",
        "The cached exported object from the first load",
        "A Promise that resolves with the module exports",
        "Undefined, because modules can only be loaded once",
      ],
      correctOptionIndex: 1,
      explanation:
        "Node.js caches modules after the first load. " +
        "Subsequent calls to require() with the same module path " +
        "return the cached version immediately, making modules " +
        "effectively singletons.",
      cognitiveLevel: "RECALL" as const,
      difficulty: "EASY" as const,
      sourceConcept: "require() module caching",
    },
    {
      questionText:
        "Why does Node.js use a single thread rather than creating " +
        "a new thread for each incoming connection?",
      options: [
        "Because JavaScript does not support multi-threading",
        "To reduce hardware costs by using less CPU",
        "Because single threads are more efficient for I/O-heavy " +
          "workloads and avoid the overhead of thread management",
        "Because Node.js was designed only for small applications",
      ],
      correctOptionIndex: 2,
      explanation:
        "Node.js's single-threaded event loop model is " +
        "highly efficient for I/O-bound workloads. It avoids the " +
        "memory and CPU overhead of managing thousands of threads " +
        "while still handling thousands of concurrent connections " +
        "through asynchronous callbacks.",
      cognitiveLevel: "COMPREHENSION" as const,
      difficulty: "MEDIUM" as const,
      sourceConcept: "Single-threaded architecture",
    },
    {
      questionText:
        "Which of the following best describes what happens when " +
        "you call require('fs') in a Node.js application?",
      options: [
        "Node.js downloads the fs module from the npm registry",
        "Node.js creates a new instance of the file system module",
        "Node.js returns the built-in fs module, loading it from " +
          "cache if previously required",
        "Node.js opens a direct connection to the file system",
      ],
      correctOptionIndex: 2,
      explanation:
        "The fs module is a built-in Node.js module that comes " +
        "pre-installed. require('fs') returns this built-in module " +
        "from cache if already loaded, or loads it fresh on first " +
        "call. No npm installation is needed for built-in modules.",
      cognitiveLevel: "COMPREHENSION" as const,
      difficulty: "MEDIUM" as const,
      sourceConcept: "Built-in modules",
    },
    {
      questionText:
        "A developer has code that reads a large file and then " +
        "processes it. Which approach best follows Node.js best " +
        "practices for handling this operation?",
      options: [
        "Use fs.readFileSync() so the code is easier to read",
        "Use fs.readFile() with a callback to avoid blocking " +
          "the event loop while reading",
        "Create a new thread to handle the file reading",
        "Use a for loop to read the file in small chunks " +
          "synchronously",
      ],
      correctOptionIndex: 1,
      explanation:
        "fs.readFile() is the asynchronous version that does not " +
        "block the event loop. While the file is being read, " +
        "Node.js can handle other requests. Using fs.readFileSync() " +
        "would block the entire event loop, preventing any other " +
        "requests from being processed.",
      cognitiveLevel: "APPLICATION" as const,
      difficulty: "MEDIUM" as const,
      sourceConcept: "Asynchronous programming",
    },
    {
      questionText:
        "What is the key difference between callbacks and " +
        "async/await in Node.js?",
      options: [
        "Async/await is faster than callbacks at runtime",
        "Callbacks can handle errors but async/await cannot",
        "Async/await provides synchronous-looking syntax for " +
          "asynchronous operations, making code easier to read " +
          "and maintain than nested callbacks",
        "Async/await creates new threads while callbacks do not",
      ],
      correctOptionIndex: 2,
      explanation:
        "Async/await is syntactic sugar built on top of Promises " +
        "that makes asynchronous code look synchronous. Both " +
        "approaches are non-blocking, but async/await significantly " +
        "improves readability and avoids callback hell — deeply " +
        "nested callback functions that are hard to maintain.",
      cognitiveLevel: "COMPREHENSION" as const,
      difficulty: "HARD" as const,
      sourceConcept: "Async/await vs callbacks",
    },
  ];

  const approvedAt = new Date();

  await Promise.all(
    content1Quizzes.map((q) =>
      prisma.quiz.create({
        data: {
          contentId: content1.id,
          batchId: batch.id,
          quizType: "QUICK_ASSESSMENT",
          questionText: q.questionText,
          options: q.options,
          correctOptionIndex: q.correctOptionIndex,
          explanation: q.explanation,
          cognitiveLevel: q.cognitiveLevel,
          difficulty: q.difficulty,
          isAiGenerated: false,
          generationStatus: "APPROVED",
          approvedBy: mentor1.id,
          approvedAt,
          availableFrom: approvedAt,
          sourceConcept: q.sourceConcept,
        },
      })
    )
  );
  log(
    `  Created ${content1Quizzes.length} approved quiz questions ` +
    `for "${content1.title}"`
  );

  // =========================================================
  // CREATE PENDING REVIEW QUESTIONS FOR CONTENT 2
  // These are awaiting mentor review — demonstrates the
  // review queue without needing to run the AI pipeline
  // =========================================================
  log(
    "Creating pending review quiz questions for Content 2..."
  );

  const content2Quizzes = [
    {
      questionText:
        "What is Express.js best described as in relation to Node.js?",
      options: [
        "A replacement for Node.js that adds full framework features",
        "A minimal web framework that provides routing and " +
          "middleware on top of Node.js",
        "A templating engine for rendering HTML in Node.js",
        "A database ORM for connecting Node.js to SQL databases",
      ],
      correctOptionIndex: 1,
      explanation:
        "Express.js is a thin layer on top of Node.js's built-in " +
        "http module. It does not replace Node.js but adds " +
        "convenient routing, middleware, and request/response " +
        "handling utilities.",
      cognitiveLevel: "RECALL" as const,
      difficulty: "EASY" as const,
      sourceConcept: "Express.js overview",
    },
    {
      questionText:
        "In Express.js, what are middleware functions primarily " +
        "responsible for?",
      options: [
        "Connecting to the database and running SQL queries",
        "Processing requests and responses, and optionally " +
          "passing control to the next middleware function",
        "Rendering HTML templates to send to the client",
        "Managing the Node.js event loop phases",
      ],
      correctOptionIndex: 1,
      explanation:
        "Middleware functions have access to req, res, and next. " +
        "They can process the request, modify req/res objects, " +
        "end the cycle, or call next() to pass control to the " +
        "next middleware. This chain pattern is fundamental to " +
        "how Express processes requests.",
      cognitiveLevel: "COMPREHENSION" as const,
      difficulty: "MEDIUM" as const,
      sourceConcept: "Express middleware",
    },
    {
      questionText:
        "What distinguishes error-handling middleware from " +
        "regular middleware in Express.js?",
      options: [
        "Error middleware uses a different HTTP method",
        "Error middleware must be registered before routes",
        "Error middleware takes four parameters: err, req, res, next",
        "Error middleware can only handle 500 status errors",
      ],
      correctOptionIndex: 2,
      explanation:
        "Error-handling middleware is identified by Express by " +
        "its four-parameter signature (err, req, res, next). " +
        "Regular middleware takes three parameters. Error handlers " +
        "must be defined after all routes and other middleware.",
      cognitiveLevel: "RECALL" as const,
      difficulty: "MEDIUM" as const,
      sourceConcept: "Express error handling",
    },
    {
      questionText:
        "A developer wants to build a REST API with Express that " +
        "accepts JSON request bodies. What middleware must they add?",
      options: [
        "express.urlencoded()",
        "express.static()",
        "express.json()",
        "express.compress()",
      ],
      correctOptionIndex: 2,
      explanation:
        "express.json() is built-in middleware that parses " +
        "incoming requests with JSON payloads. Without it, " +
        "req.body will be undefined for JSON requests. It must " +
        "be registered before route handlers that read req.body.",
      cognitiveLevel: "APPLICATION" as const,
      difficulty: "EASY" as const,
      sourceConcept: "JSON middleware",
    },
  ];

  await Promise.all(
    content2Quizzes.map((q) =>
      prisma.quiz.create({
        data: {
          contentId: content2.id,
          batchId: batch.id,
          quizType: "QUICK_ASSESSMENT",
          questionText: q.questionText,
          options: q.options,
          correctOptionIndex: q.correctOptionIndex,
          explanation: q.explanation,
          cognitiveLevel: q.cognitiveLevel,
          difficulty: q.difficulty,
          isAiGenerated: true,
          generationStatus: "PENDING_REVIEW",
          sourceConcept: q.sourceConcept,
        },
      })
    )
  );
  log(
    `  Created ${content2Quizzes.length} pending review questions ` +
    `for "${content2.title}"`
  );

  // =========================================================
  // CREATE SAMPLE QUIZ ATTEMPTS FOR STUDENT 1
  // So the dashboard and metrics have real data
  // to calculate from on first run
  // =========================================================
  log("Creating sample quiz attempts for student1...");

  const { v4: uuidv4 } = await import("uuid");

  const attempt1Id = uuidv4();
  const attempt1CompletedAt = new Date(
    now.getTime() - 8 * 24 * 60 * 60 * 1000
  );

  await prisma.quizAttempt.create({
    data: {
      attemptId: attempt1Id,
      studentId: students[0].id,
      contentId: content1.id,
      batchId: batch.id,
      quizType: "QUICK_ASSESSMENT",
      totalQuestions: 6,
      correctAnswers: 4,
      scorePercentage: 66.67,
      timeTakenSeconds: 412,
      startedAt: new Date(
        attempt1CompletedAt.getTime() - 412000
      ),
      completedAt: attempt1CompletedAt,
    },
  });

  const content1QuizRecords = await prisma.quiz.findMany({
    where: {
      contentId: content1.id,
      generationStatus: "APPROVED",
    },
    take: 6,
  });

  if (content1QuizRecords.length > 0) {
    await prisma.quizResponse.createMany({
      data: content1QuizRecords.map((q, index) => ({
        studentId: students[0].id,
        quizId: q.id,
        contentId: content1.id,
        batchId: batch.id,
        attemptId: attempt1Id,
        selectedOptionIndex: index < 4
          ? q.correctOptionIndex
          : (q.correctOptionIndex + 1) % 4,
        isCorrect: index < 4,
        timeToAnswerSeconds: Math.floor(Math.random() * 60) + 20,
        submittedAt: attempt1CompletedAt,
      })),
    });
  }
  log(
    `  Created quiz attempt for ${students[0].fullName}: ` +
    `4/6 (66.67%)`
  );

  // =========================================================
  // CREATE CONTENT ACCESS LOG FOR STUDENT 1
  // =========================================================
  log("Creating content access logs...");

  await prisma.contentAccessLog.create({
    data: {
      studentId: students[0].id,
      contentId: content1.id,
      batchId: batch.id,
      firstAccessedAt: new Date(
        now.getTime() - 9 * 24 * 60 * 60 * 1000
      ),
      lastAccessedAt: new Date(
        now.getTime() - 8 * 24 * 60 * 60 * 1000
      ),
      totalWatchTimeSeconds: 2450,
      lastPositionSeconds: 2450,
      completionPercentage: 90.74,
      isCompleted: true,
      accessCount: 2,
      rewatchCount: 0,
    },
  });

  await prisma.contentAccessLog.create({
    data: {
      studentId: students[0].id,
      contentId: content2.id,
      batchId: batch.id,
      firstAccessedAt: new Date(
        now.getTime() - 2 * 24 * 60 * 60 * 1000
      ),
      lastAccessedAt: new Date(
        now.getTime() - 1 * 24 * 60 * 60 * 1000
      ),
      totalWatchTimeSeconds: 1200,
      lastPositionSeconds: 1200,
      completionPercentage: 37.04,
      isCompleted: false,
      accessCount: 1,
      rewatchCount: 0,
    },
  });
  log(
    `  Created content access logs for ${students[0].fullName}`
  );

  // =========================================================
  // CREATE SAMPLE LIVE SESSION
  // Scheduled 2 days from now so the mentor can test
  // the session scheduling flow without creating one
  // =========================================================
  log("Creating sample live session...");

  const sessionDate = new Date(
    now.getTime() + 2 * 24 * 60 * 60 * 1000
  );
  sessionDate.setHours(10, 0, 0, 0);

  const liveSession = await prisma.liveSession.create({
    data: {
      batchId: batch.id,
      mentorId: mentor1.id,
      title: "Node.js Deep Dive — Week 2 Live Session",
      description:
        "Live Q&A and practical demonstration of the event loop " +
        "and asynchronous patterns covered in Week 1 and 2.",
      scheduledAt: sessionDate,
      estimatedDurationMinutes: 90,
      status: "SCHEDULED",
      streamingProvider: "MUX",
    },
  });
  log(
    `  Created live session: "${liveSession.title}" ` +
    `(scheduled in 2 days)`
  );

  // Link session to content
  await prisma.sessionContentLink.create({
    data: {
      sessionId: liveSession.id,
      contentId: content1.id,
    },
  });
  log(`  Linked session to "${content1.title}"`);

  // =========================================================
  // CREATE SAMPLE STUDENT PROGRESS
  // Pre-calculated Week 1 scores so the dashboard
  // has data to display without running the metrics job
  // =========================================================
  log("Creating sample student progress scores...");

  const week1ScoresData = [
    {
      student: students[0],
      scores: {
        learningVelocityScore: 0,     // Only 1 week so far
        contentEngagementScore: 72.5,
        problemSolvingScore: 55.0,
        knowledgeRetentionScore: 0,   // No retention quiz yet
        consistencyScore: 70.0,
        curiosityScore: 40.0,
        communicationScore: 50.0,
        errorRecoveryScore: 65.0,
        conceptualDepthScore: 48.0,
        softSkillsScore: 50.0,
        overallScore: 52.0,
      },
    },
    {
      student: students[1],
      scores: {
        learningVelocityScore: 0,
        contentEngagementScore: 45.0,
        problemSolvingScore: 50.0,
        knowledgeRetentionScore: 0,
        consistencyScore: 55.0,
        curiosityScore: 35.0,
        communicationScore: 50.0,
        errorRecoveryScore: 50.0,
        conceptualDepthScore: 42.0,
        softSkillsScore: 50.0,
        overallScore: 43.5,
      },
    },
  ];

  await Promise.all(
    week1ScoresData.map(({ student, scores }) =>
      prisma.studentProgress.create({
        data: {
          studentId: student.id,
          batchId: batch.id,
          weekNumber: 1,
          ...scores,
          calculatedAt: new Date(
            now.getTime() - 3 * 24 * 60 * 60 * 1000
          ),
        },
      })
    )
  );
  log(
    `  Created Week 1 progress scores for ` +
    `${week1ScoresData.length} students`
  );

  // =========================================================
  // SUMMARY
  // =========================================================
  divider();
  log("Seed completed successfully!");
  divider();
  console.log("");
  console.log("  ACCOUNTS CREATED:");
  console.log(
    `  Super Admin : superadmin@dev.com / ${SEED_PASSWORD}`
  );
  console.log(`  Admin       : admin@dev.com / ${SEED_PASSWORD}`);
  console.log(`  Mentor 1    : mentor@dev.com / ${SEED_PASSWORD}`);
  console.log(`  Mentor 2    : mentor2@dev.com / ${SEED_PASSWORD}`);
  console.log("");
  students.forEach((s, i) => {
    console.log(
      `  Student ${i + 1}   : ${s.email} / ${SEED_PASSWORD}`
    );
  });
  console.log("");
  console.log("  TEST DATA:");
  console.log(`  Batch       : "${batch.name}" (ACTIVE, Week 2)`);
  console.log(
    `  Content 1   : "${content1.title}" ` +
    `(published, 6 approved quizzes)`
  );
  console.log(
    `  Content 2   : "${content2.title}" ` +
    `(published, 4 pending review quizzes)`
  );
  console.log(
    `  Session     : "${liveSession.title}" ` +
    `(scheduled in 2 days)`
  );
  console.log(
    `  Progress    : Week 1 scores pre-calculated ` +
    `for student1 and student2`
  );
  console.log("");
  console.log("  QUICK STARTS:");
  console.log(
    "  Take a quiz  : Login as student1, open Content 1"
  );
  console.log(
    "  Review queue : Login as mentor, open batch review queue"
  );
  console.log(
    "  Dashboard    : Login as student1, open dashboard"
  );
  console.log(
    "  Admin view   : Login as admin, open batch overview"
  );
  divider();
}

main()
  .catch((e) => {
    console.error("[Seed] Fatal error:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });