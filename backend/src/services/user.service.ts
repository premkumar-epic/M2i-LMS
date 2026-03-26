// backend/src/services/user.service.ts
// User management business logic — admin CRUD over users.

import bcrypt from "bcryptjs";
import crypto from "crypto";
import { prisma } from "../lib/prisma";

const BCRYPT_ROUNDS = 10;

// =========================================================
// TYPES
// =========================================================

type UserRow = {
  user_id: string;
  email: string;
  full_name: string;
  role: string | null;
  is_active: boolean;
  avatar_url: string | null;
  last_login_at: Date | null;
  created_at: Date;
  updated_at: Date;
};

type Pagination = {
  page: number;
  limit: number;
  total: number;
  total_pages: number;
};

// =========================================================
// HELPERS
// =========================================================

/** Generate a cryptographically secure temporary password: Xxxx@9999 format */
const generateTempPassword = (): string => {
  const upper = crypto.randomBytes(1).toString("hex").toUpperCase()[0];
  const lower = crypto.randomBytes(4).toString("hex").slice(0, 4);
  // Use crypto to generate 4 digits (0000–9999) instead of Math.random()
  const digits = (crypto.randomInt(0, 10000)).toString().padStart(4, "0");
  return `${upper}${lower}@${digits}`;
};

const toUserRow = (u: {
  id: string;
  email: string;
  fullName: string;
  role: string | null;
  isActive: boolean;
  avatarUrl: string | null;
  lastLoginAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}): UserRow => ({
  user_id: u.id,
  email: u.email,
  full_name: u.fullName,
  role: u.role,
  is_active: u.isActive,
  avatar_url: u.avatarUrl,
  last_login_at: u.lastLoginAt,
  created_at: u.createdAt,
  updated_at: u.updatedAt,
});

// =========================================================
// SERVICE METHODS
// =========================================================

/** Admin creates a new user with an assigned role + temp password. */
export const createUser = async (input: {
  full_name: string;
  email: string;
  role: string;
}): Promise<UserRow & { temporary_password: string }> => {
  const existing = await prisma.user.findUnique({
    where: { email: input.email },
  });
  if (existing) {
    throw {
      code: "EMAIL_ALREADY_EXISTS",
      message: "Email address is already registered",
      statusCode: 409,
    };
  }

  const temporaryPassword = generateTempPassword();
  const passwordHash = await bcrypt.hash(temporaryPassword, BCRYPT_ROUNDS);

  const user = await prisma.user.create({
    data: {
      email: input.email,
      fullName: input.full_name,
      role: input.role as never,
      passwordHash,
    },
  });

  return { ...toUserRow(user), temporary_password: temporaryPassword };
};

/** List users with optional filtering + pagination. */
export const listUsers = async (query: {
  role?: string;
  is_active?: boolean;
  search?: string;
  page: number;
  limit: number;
}): Promise<{ users: UserRow[]; pagination: Pagination }> => {
  const where = {
    deletedAt: null,
    ...(query.role ? { role: query.role as never } : {}),
    ...(query.is_active !== undefined ? { isActive: query.is_active } : {}),
    ...(query.search
      ? {
          OR: [
            { fullName: { contains: query.search, mode: "insensitive" as const } },
            { email: { contains: query.search, mode: "insensitive" as const } },
          ],
        }
      : {}),
  };

  const [total, users] = await Promise.all([
    prisma.user.count({ where }),
    prisma.user.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip: (query.page - 1) * query.limit,
      take: query.limit,
    }),
  ]);

  return {
    users: users.map(toUserRow),
    pagination: {
      page: query.page,
      limit: query.limit,
      total,
      total_pages: Math.ceil(total / query.limit),
    },
  };
};

/** Fetch one user by ID. */
export const getUserById = async (userId: string): Promise<UserRow> => {
  const user = await prisma.user.findFirst({
    where: { id: userId, deletedAt: null },
  });
  if (!user) {
    throw { code: "USER_NOT_FOUND", message: "User not found", statusCode: 404 };
  }
  return toUserRow(user);
};

/** Admin updates a user's name, role, or active status. */
export const updateUser = async (
  userId: string,
  input: { full_name?: string; role?: string; is_active?: boolean }
): Promise<UserRow> => {
  const user = await prisma.user.findFirst({
    where: { id: userId, deletedAt: null },
  });
  if (!user) {
    throw { code: "USER_NOT_FOUND", message: "User not found", statusCode: 404 };
  }

  // Guard: cannot deactivate the last active SUPER_ADMIN
  if (input.is_active === false && user.role === "SUPER_ADMIN") {
    const activeCount = await prisma.user.count({
      where: { role: "SUPER_ADMIN", isActive: true, deletedAt: null },
    });
    if (activeCount <= 1) {
      throw {
        code: "CANNOT_DEACTIVATE_LAST_SUPER_ADMIN",
        message: "Cannot deactivate the last active SUPER_ADMIN account",
        statusCode: 400,
      };
    }
  }

  const updated = await prisma.$transaction(async (tx) => {
    const u = await tx.user.update({
      where: { id: userId },
      data: {
        ...(input.full_name ? { fullName: input.full_name } : {}),
        ...(input.role ? { role: input.role as never } : {}),
        ...(input.is_active !== undefined ? { isActive: input.is_active } : {}),
      },
    });

    // If deactivated, revoke all refresh tokens immediately
    if (input.is_active === false) {
      await tx.refreshToken.updateMany({
        where: { userId, revokedAt: null },
        data: { revokedAt: new Date() },
      });
    }

    return u;
  });

  return toUserRow(updated);
};

/** Admin resets a user's password to a new temp password and revokes all tokens. */
export const resetUserPassword = async (
  userId: string
): Promise<{ temporary_password: string }> => {
  const user = await prisma.user.findFirst({
    where: { id: userId, deletedAt: null },
  });
  if (!user) {
    throw { code: "USER_NOT_FOUND", message: "User not found", statusCode: 404 };
  }

  const temporaryPassword = generateTempPassword();
  const passwordHash = await bcrypt.hash(temporaryPassword, BCRYPT_ROUNDS);

  await prisma.$transaction([
    prisma.user.update({ where: { id: userId }, data: { passwordHash } }),
    prisma.refreshToken.updateMany({
      where: { userId, revokedAt: null },
      data: { revokedAt: new Date() },
    }),
  ]);

  return { temporary_password: temporaryPassword };
};
