// backend/src/services/batch.service.ts
// Batch management business logic.

import { prisma } from "../lib/prisma";

// =========================================================
// HELPERS
// =========================================================

/** Calculate total_weeks from start and end dates */
const totalWeeks = (start: Date, end: Date): number =>
  Math.round((end.getTime() - start.getTime()) / (7 * 24 * 60 * 60 * 1000));

/** Calculate current_week — null if not ACTIVE */
const currentWeek = (status: string, start: Date): number | null => {
  if (status !== "ACTIVE") return null;
  const now = new Date();
  if (now < start) return null;
  const week = Math.floor((now.getTime() - start.getTime()) / (7 * 24 * 60 * 60 * 1000)) + 1;
  return week;
};

const toBatchSummary = (b: {
  id: string;
  name: string;
  description: string | null;
  startDate: Date;
  endDate: Date;
  status: string;
  createdAt: Date;
  updatedAt: Date;
  createdBy: string;
  _count?: { enrollments: number; mentors: number };
  creator?: { id: string; fullName: string };
  mentors?: { mentor: { id: string; fullName: string; email: string; avatarUrl: string | null } }[];
  content?: { id: string }[];
  liveSessions?: { id: string }[];
}) => ({
  batch_id: b.id,
  name: b.name,
  description: b.description,
  status: b.status,
  start_date: b.startDate.toISOString().split("T")[0],
  end_date: b.endDate.toISOString().split("T")[0],
  current_week: currentWeek(b.status, b.startDate),
  total_weeks: totalWeeks(b.startDate, b.endDate),
  enrolled_students_count: b._count?.enrollments ?? 0,
  assigned_mentors_count: b._count?.mentors ?? 0,
  created_at: b.createdAt,
});

// =========================================================
// CREATE
// =========================================================

export const createBatch = async (
  adminId: string,
  input: {
    name: string;
    description?: string | null;
    start_date: string;
    end_date: string;
  }
) => {
  const startDate = new Date(input.start_date);
  const endDate = new Date(input.end_date);

  if (endDate <= startDate) {
    throw {
      code: "VALIDATION_ERROR",
      message: "end_date must be after start_date",
      statusCode: 400,
    };
  }

  const gapDays = (endDate.getTime() - startDate.getTime()) / (24 * 60 * 60 * 1000);
  if (gapDays < 7) {
    throw {
      code: "VALIDATION_ERROR",
      message: "end_date must be at least 7 days after start_date",
      statusCode: 400,
    };
  }

  const existing = await prisma.batch.findUnique({ where: { name: input.name } });
  if (existing) {
    throw {
      code: "BATCH_NAME_EXISTS",
      message: "A batch with this name already exists",
      statusCode: 409,
    };
  }

  const batch = await prisma.batch.create({
    data: {
      name: input.name,
      description: input.description ?? null,
      startDate,
      endDate,
      createdBy: adminId,
    },
    include: { _count: { select: { enrollments: true, mentors: true } } },
  });

  return toBatchSummary(batch);
};

// =========================================================
// LIST
// =========================================================

export const listBatches = async (query: {
  status?: string;
  search?: string;
  page: number;
  limit: number;
}) => {
  const where = {
    ...(query.status ? { status: query.status as never } : {}),
    ...(query.search
      ? { name: { contains: query.search, mode: "insensitive" as const } }
      : {}),
  };

  const [total, batches] = await Promise.all([
    prisma.batch.count({ where }),
    prisma.batch.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip: (query.page - 1) * query.limit,
      take: query.limit,
      include: { _count: { select: { enrollments: true, mentors: true } } },
    }),
  ]);

  return {
    batches: batches.map(toBatchSummary),
    pagination: {
      page: query.page,
      limit: query.limit,
      total,
      total_pages: Math.ceil(total / query.limit),
    },
  };
};

// =========================================================
// GET ONE
// =========================================================

export const getBatchById = async (batchId: string, requestingUserId: string, role: string) => {
  const batch = await prisma.batch.findUnique({
    where: { id: batchId },
    include: {
      _count: { select: { enrollments: true } },
      creator: { select: { id: true, fullName: true } },
      mentors: {
        include: {
          mentor: { select: { id: true, fullName: true, email: true, avatarUrl: true } },
        },
      },
      content: { select: { id: true } },
      liveSessions: { select: { id: true } },
    },
  });

  if (!batch) {
    throw { code: "BATCH_NOT_FOUND", message: "Batch not found", statusCode: 404 };
  }

  // Mentors can only see batches they're assigned to
  if (role === "MENTOR") {
    const isAssigned = batch.mentors.some((m) => m.mentorId === requestingUserId);
    if (!isAssigned) {
      throw {
        code: "PERMISSION_DENIED",
        message: "You are not assigned to this batch",
        statusCode: 403,
      };
    }
  }

  return {
    batch_id: batch.id,
    name: batch.name,
    description: batch.description,
    status: batch.status,
    start_date: batch.startDate.toISOString().split("T")[0],
    end_date: batch.endDate.toISOString().split("T")[0],
    current_week: currentWeek(batch.status, batch.startDate),
    total_weeks: totalWeeks(batch.startDate, batch.endDate),
    enrolled_students_count: batch._count.enrollments,
    assigned_mentors_count: batch.mentors.length,
    assigned_mentors: batch.mentors.map((m) => ({
      mentor_id: m.mentor.id,
      full_name: m.mentor.fullName,
      email: m.mentor.email,
      avatar_url: m.mentor.avatarUrl,
    })),
    content_count: batch.content.length,
    live_sessions_count: batch.liveSessions.length,
    created_by: { user_id: batch.creator.id, full_name: batch.creator.fullName },
    created_at: batch.createdAt,
    updated_at: batch.updatedAt,
  };
};

// =========================================================
// UPDATE
// =========================================================

export const updateBatch = async (
  batchId: string,
  input: { name?: string; description?: string | null; end_date?: string }
) => {
  const batch = await prisma.batch.findUnique({ where: { id: batchId } });
  if (!batch) {
    throw { code: "BATCH_NOT_FOUND", message: "Batch not found", statusCode: 404 };
  }

  // Check start_date change only relevant if input tries to set it (it's not in schema, but guard anyway)
  if (input.end_date) {
    const endDate = new Date(input.end_date);
    if (endDate <= batch.startDate) {
      throw {
        code: "VALIDATION_ERROR",
        message: "end_date must be after start_date",
        statusCode: 400,
      };
    }
  }

  if (input.name && input.name !== batch.name) {
    const existing = await prisma.batch.findUnique({ where: { name: input.name } });
    if (existing) {
      throw {
        code: "BATCH_NAME_EXISTS",
        message: "A batch with this name already exists",
        statusCode: 409,
      };
    }
  }

  const updated = await prisma.batch.update({
    where: { id: batchId },
    data: {
      ...(input.name ? { name: input.name } : {}),
      ...(input.description !== undefined ? { description: input.description } : {}),
      ...(input.end_date ? { endDate: new Date(input.end_date) } : {}),
    },
    include: { _count: { select: { enrollments: true, mentors: true } } },
  });

  return toBatchSummary(updated);
};

// =========================================================
// ARCHIVE
// =========================================================

export const archiveBatch = async (batchId: string) => {
  const batch = await prisma.batch.findUnique({ where: { id: batchId } });
  if (!batch) {
    throw { code: "BATCH_NOT_FOUND", message: "Batch not found", statusCode: 404 };
  }
  if (batch.status === "ARCHIVED") {
    throw {
      code: "BATCH_ALREADY_ARCHIVED",
      message: "Batch is already archived",
      statusCode: 400,
    };
  }

  const updated = await prisma.batch.update({
    where: { id: batchId },
    data: { status: "ARCHIVED" },
  });

  return { batch_id: updated.id, status: updated.status };
};

// =========================================================
// ENROLL STUDENTS
// =========================================================

export const enrollStudents = async (
  batchId: string,
  adminId: string,
  studentIds: string[]
) => {
  const batch = await prisma.batch.findUnique({ where: { id: batchId } });
  if (!batch) {
    throw { code: "BATCH_NOT_FOUND", message: "Batch not found", statusCode: 404 };
  }

  // Validate all IDs are real students
  const users = await prisma.user.findMany({
    where: { id: { in: studentIds }, role: "STUDENT", deletedAt: null },
    select: { id: true, fullName: true },
  });
  const validStudentIds = new Set(users.map((u) => u.id));

  // Fetch existing enrollments
  const existingEnrollments = await prisma.enrollment.findMany({
    where: { batchId, studentId: { in: studentIds } },
    select: { studentId: true, status: true },
  });
  const enrolledMap = new Map(existingEnrollments.map((e) => [e.studentId, e.status]));

  const enrolled: { student_id: string; full_name: string; enrolled_at: Date }[] = [];
  const skipped: { student_id: string; reason: string }[] = [];
  const failed: { student_id: string; reason: string }[] = [];

  const toReEnroll: string[] = [];
  const toCreate: string[] = [];

  for (const studentId of studentIds) {
    if (!validStudentIds.has(studentId)) {
      failed.push({ student_id: studentId, reason: "User not found or not a student" });
      continue;
    }
    const existingStatus = enrolledMap.get(studentId);
    if (existingStatus === "ACTIVE") {
      skipped.push({ student_id: studentId, reason: "Already enrolled in this batch" });
      continue;
    }
    if (existingStatus === "WITHDRAWN") {
      toReEnroll.push(studentId);
    } else {
      toCreate.push(studentId);
    }
  }

  const now = new Date();

  // Bulk re-enroll withdrawn students in one query
  if (toReEnroll.length > 0) {
    await prisma.enrollment.updateMany({
      where: { batchId, studentId: { in: toReEnroll } },
      data: { status: "ACTIVE", withdrawnAt: null, withdrawnBy: null, enrolledAt: now, enrolledBy: adminId },
    });
    for (const studentId of toReEnroll) {
      const user = users.find((u) => u.id === studentId)!;
      enrolled.push({ student_id: studentId, full_name: user.fullName, enrolled_at: now });
    }
  }

  // Bulk create new enrollments in one query
  if (toCreate.length > 0) {
    await prisma.enrollment.createMany({
      data: toCreate.map((studentId) => ({ studentId, batchId, enrolledBy: adminId })),
    });
    for (const studentId of toCreate) {
      const user = users.find((u) => u.id === studentId)!;
      enrolled.push({ student_id: studentId, full_name: user.fullName, enrolled_at: now });
    }
  }

  return {
    enrolled,
    skipped,
    failed,
  };
};

// =========================================================
// WITHDRAW STUDENT
// =========================================================

export const withdrawStudent = async (
  batchId: string,
  studentId: string,
  adminId: string
) => {
  const enrollment = await prisma.enrollment.findUnique({
    where: { studentId_batchId: { studentId, batchId } },
  });

  if (!enrollment) {
    throw {
      code: "ENROLLMENT_NOT_FOUND",
      message: "Student is not enrolled in this batch",
      statusCode: 404,
    };
  }
  if (enrollment.status === "WITHDRAWN") {
    throw {
      code: "ALREADY_WITHDRAWN",
      message: "Student is already withdrawn from this batch",
      statusCode: 400,
    };
  }

  const updated = await prisma.enrollment.update({
    where: { studentId_batchId: { studentId, batchId } },
    data: { status: "WITHDRAWN", withdrawnAt: new Date(), withdrawnBy: adminId },
  });

  return {
    student_id: studentId,
    batch_id: batchId,
    status: updated.status,
    withdrawn_at: updated.withdrawnAt,
  };
};

// =========================================================
// LIST STUDENTS IN BATCH
// =========================================================

export const listBatchStudents = async (
  batchId: string,
  query: { status?: string; search?: string; page: number; limit: number }
) => {
  const batch = await prisma.batch.findUnique({ where: { id: batchId } });
  if (!batch) {
    throw { code: "BATCH_NOT_FOUND", message: "Batch not found", statusCode: 404 };
  }

  const where = {
    batchId,
    ...(query.status ? { status: query.status as never } : {}),
    ...(query.search
      ? {
          student: {
            OR: [
              { fullName: { contains: query.search, mode: "insensitive" as const } },
              { email: { contains: query.search, mode: "insensitive" as const } },
            ],
          },
        }
      : {}),
  };

  const [total, enrollments] = await Promise.all([
    prisma.enrollment.count({ where }),
    prisma.enrollment.findMany({
      where,
      orderBy: { enrolledAt: "asc" },
      skip: (query.page - 1) * query.limit,
      take: query.limit,
      include: {
        student: {
          select: {
            id: true,
            fullName: true,
            email: true,
            avatarUrl: true,
            lastLoginAt: true,
          },
        },
      },
    }),
  ]);

  const students = enrollments.map((e) => ({
    enrollment_id: e.id,
    student_id: e.student.id,
    full_name: e.student.fullName,
    email: e.student.email,
    avatar_url: e.student.avatarUrl,
    enrollment_status: e.status,
    enrolled_at: e.enrolledAt,
    last_login_at: e.student.lastLoginAt,
    overall_progress_score: null, // populated by metrics engine (F09)
  }));

  return {
    students,
    pagination: {
      page: query.page,
      limit: query.limit,
      total,
      total_pages: Math.ceil(total / query.limit),
    },
  };
};

// =========================================================
// ASSIGN MENTORS
// =========================================================

export const assignMentors = async (
  batchId: string,
  adminId: string,
  mentorIds: string[]
) => {
  const batch = await prisma.batch.findUnique({ where: { id: batchId } });
  if (!batch) {
    throw { code: "BATCH_NOT_FOUND", message: "Batch not found", statusCode: 404 };
  }

  const users = await prisma.user.findMany({
    where: { id: { in: mentorIds }, role: "MENTOR", deletedAt: null },
    select: { id: true, fullName: true },
  });
  const validMentorIds = new Set(users.map((u) => u.id));

  const existing = await prisma.batchMentor.findMany({
    where: { batchId, mentorId: { in: mentorIds } },
    select: { mentorId: true },
  });
  const alreadyAssigned = new Set(existing.map((e) => e.mentorId));

  const assigned: { mentor_id: string; full_name: string; assigned_at: Date }[] = [];
  const skipped: { mentor_id: string; reason: string }[] = [];
  const toAssign: string[] = [];

  for (const mentorId of mentorIds) {
    if (!validMentorIds.has(mentorId)) {
      skipped.push({ mentor_id: mentorId, reason: "User not found or not a mentor" });
      continue;
    }
    if (alreadyAssigned.has(mentorId)) {
      skipped.push({ mentor_id: mentorId, reason: "Already assigned to this batch" });
      continue;
    }
    toAssign.push(mentorId);
  }

  if (toAssign.length > 0) {
    const now = new Date();
    await prisma.batchMentor.createMany({
      data: toAssign.map((mentorId) => ({ batchId, mentorId, assignedBy: adminId })),
    });
    for (const mentorId of toAssign) {
      const user = users.find((u) => u.id === mentorId)!;
      assigned.push({ mentor_id: mentorId, full_name: user.fullName, assigned_at: now });
    }
  }

  return { assigned, skipped };
};

// =========================================================
// STUDENT: GET MY BATCH
// =========================================================

export const getMyBatch = async (studentId: string) => {
  const enrollment = await prisma.enrollment.findFirst({
    where: { studentId, status: "ACTIVE" },
    include: {
      batch: {
        include: {
          mentors: {
            include: {
              mentor: { select: { id: true, fullName: true, avatarUrl: true } },
            },
          },
        },
      },
    },
    orderBy: { enrolledAt: "desc" },
  });

  if (!enrollment) {
    throw {
      code: "NOT_ENROLLED",
      message: "You are not enrolled in any active batch",
      statusCode: 404,
    };
  }

  const { batch } = enrollment;
  const tw = totalWeeks(batch.startDate, batch.endDate);
  const cw = currentWeek(batch.status, batch.startDate);

  return {
    batch_id: batch.id,
    name: batch.name,
    description: batch.description,
    status: batch.status,
    start_date: batch.startDate.toISOString().split("T")[0],
    end_date: batch.endDate.toISOString().split("T")[0],
    current_week: cw,
    total_weeks: tw,
    weeks_remaining: cw !== null ? Math.max(0, tw - cw) : null,
    assigned_mentors: batch.mentors.map((m) => ({
      mentor_id: m.mentor.id,
      full_name: m.mentor.fullName,
      avatar_url: m.mentor.avatarUrl,
    })),
    enrollment_status: enrollment.status,
    enrolled_at: enrollment.enrolledAt,
  };
};
