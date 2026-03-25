// backend/src/services/auth.service.ts
// All authentication and session management business logic.
// Every public method has an explicit return type.

import bcrypt from "bcryptjs";
import crypto from "crypto";
import jwt from "jsonwebtoken";
import { prisma } from "../lib/prisma";

// =========================================================
// TYPES
// =========================================================

type SafeUser = {
  id: string;
  email: string;
  fullName: string;
  role: string | null;
  avatarUrl: string | null;
  isActive: boolean;
  lastLoginAt: Date | null;
  createdAt: Date;
};

type TokenPair = {
  accessToken: string;
  refreshToken: string;
};

type LoginResult = {
  user: SafeUser;
  tokens: TokenPair;
};

// =========================================================
// CONSTANTS
// =========================================================

const BCRYPT_ROUNDS = 10;

// Rate limiting thresholds
const MAX_FAILED_PER_IP_PER_MINUTE = 5;
const MAX_FAILED_PER_ACCOUNT_PER_15_MIN = 10;

// Cookie names used in cookie-setting helpers
export const ACCESS_TOKEN_COOKIE = "access_token";
export const REFRESH_TOKEN_COOKIE = "refresh_token";

// =========================================================
// INTERNAL HELPERS
// =========================================================

const JWT_SECRET = (): string => {
  const secret = process.env.JWT_SECRET;
  if (!secret) throw new Error("JWT_SECRET is not set");
  return secret;
};

const JWT_REFRESH_SECRET = (): string => {
  const secret = process.env.JWT_REFRESH_SECRET;
  if (!secret) throw new Error("JWT_REFRESH_SECRET is not set");
  return secret;
};

const ACCESS_EXPIRY = process.env.JWT_ACCESS_EXPIRY ?? "1h";
const REFRESH_EXPIRY = process.env.JWT_REFRESH_EXPIRY ?? "7d";

/** Build the JWT payload we sign into both tokens. */
const buildJwtPayload = (userId: string, role: string | null) => ({
  user_id: userId,
  role,
});

/**
 * Generate a signed JWT access token (short-lived).
 * Payload contains user_id + role for frontend middleware decoding.
 */
const generateAccessToken = (
  userId: string,
  role: string | null
): string =>
  jwt.sign(buildJwtPayload(userId, role), JWT_SECRET(), {
    expiresIn: ACCESS_EXPIRY,
  } as jwt.SignOptions);

/**
 * Generate a cryptographically random refresh token string,
 * hash it for storage, and store the hash in the DB.
 * Returns the raw (unhashed) token for the cookie.
 */
const generateAndStoreRefreshToken = async (
  userId: string
): Promise<string> => {
  const rawToken = crypto.randomBytes(64).toString("hex");
  const tokenHash = crypto
    .createHash("sha256")
    .update(rawToken)
    .digest("hex");

  const expiresAt = new Date();
  const refreshDays = parseInt(REFRESH_EXPIRY.replace("d", ""), 10) || 7;
  expiresAt.setDate(expiresAt.getDate() + refreshDays);

  await prisma.refreshToken.create({
    data: { userId, tokenHash, expiresAt },
  });

  return rawToken;
};

/** Strip password hash from a user record before returning to client. */
const toSafeUser = (user: {
  id: string;
  email: string;
  fullName: string;
  role: string | null;
  avatarUrl: string | null;
  isActive: boolean;
  lastLoginAt: Date | null;
  createdAt: Date;
}): SafeUser => ({
  id: user.id,
  email: user.email,
  fullName: user.fullName,
  role: user.role,
  avatarUrl: user.avatarUrl,
  isActive: user.isActive,
  lastLoginAt: user.lastLoginAt,
  createdAt: user.createdAt,
});

// =========================================================
// RATE LIMITING HELPERS
// =========================================================

const checkIpRateLimit = async (
  ipAddress: string
): Promise<void> => {
  const oneMinuteAgo = new Date(Date.now() - 60 * 1000);
  const count = await prisma.loginAttempt.count({
    where: {
      ipAddress,
      success: false,
      attemptedAt: { gte: oneMinuteAgo },
    },
  });

  if (count >= MAX_FAILED_PER_IP_PER_MINUTE) {
    throw {
      code: "RATE_LIMIT_IP",
      message: "Too many login attempts from this IP. Try again in 1 minute.",
      statusCode: 429,
    };
  }
};

const checkAccountRateLimit = async (email: string): Promise<void> => {
  const fifteenMinutesAgo = new Date(Date.now() - 15 * 60 * 1000);
  const count = await prisma.loginAttempt.count({
    where: {
      email,
      success: false,
      attemptedAt: { gte: fifteenMinutesAgo },
    },
  });

  if (count >= MAX_FAILED_PER_ACCOUNT_PER_15_MIN) {
    throw {
      code: "RATE_LIMIT_ACCOUNT",
      message: "Too many failed attempts on this account. Try again in 15 minutes.",
      statusCode: 429,
    };
  }
};

const logAttempt = async (
  email: string,
  ipAddress: string,
  success: boolean
): Promise<void> => {
  await prisma.loginAttempt.create({
    data: { email, ipAddress, success },
  });
};

// =========================================================
// PUBLIC SERVICE METHODS
// =========================================================

/**
 * Register a new user account.
 * New users have role = null — admin must assign a role.
 */
export const register = async (data: {
  email: string;
  password: string;
  full_name: string;
}): Promise<SafeUser> => {
  const existing = await prisma.user.findUnique({
    where: { email: data.email },
  });

  if (existing) {
    throw {
      code: "EMAIL_ALREADY_EXISTS",
      message: "An account with this email already exists",
      statusCode: 409,
    };
  }

  const passwordHash = await bcrypt.hash(data.password, BCRYPT_ROUNDS);

  const user = await prisma.user.create({
    data: {
      email: data.email,
      passwordHash,
      fullName: data.full_name,
      role: null,
    },
  });

  return toSafeUser(user);
};

/**
 * Authenticate a user and issue JWT tokens.
 * Applies IP + account rate limiting.
 */
export const login = async (data: {
  email: string;
  password: string;
  ipAddress: string;
}): Promise<LoginResult> => {
  // Rate limit checks before any DB user lookup
  await checkIpRateLimit(data.ipAddress);
  await checkAccountRateLimit(data.email);

  const user = await prisma.user.findUnique({
    where: { email: data.email, deletedAt: null },
  });

  if (!user) {
    await logAttempt(data.email, data.ipAddress, false);
    throw {
      code: "INVALID_CREDENTIALS",
      message: "Invalid email or password",
      statusCode: 401,
    };
  }

  if (!user.isActive) {
    await logAttempt(data.email, data.ipAddress, false);
    throw {
      code: "ACCOUNT_INACTIVE",
      message: "Your account has been deactivated. Contact support.",
      statusCode: 403,
    };
  }

  const passwordMatch = await bcrypt.compare(
    data.password,
    user.passwordHash
  );

  if (!passwordMatch) {
    await logAttempt(data.email, data.ipAddress, false);
    throw {
      code: "INVALID_CREDENTIALS",
      message: "Invalid email or password",
      statusCode: 401,
    };
  }

  // Successful login
  await logAttempt(data.email, data.ipAddress, true);
  await prisma.user.update({
    where: { id: user.id },
    data: { lastLoginAt: new Date() },
  });

  const accessToken = generateAccessToken(user.id, user.role);
  const refreshToken = await generateAndStoreRefreshToken(user.id);

  return {
    user: toSafeUser(user),
    tokens: { accessToken, refreshToken },
  };
};

/**
 * Revoke the user's refresh token to log them out.
 * The access token will expire naturally (1hr).
 */
export const logout = async (rawRefreshToken: string): Promise<void> => {
  if (!rawRefreshToken) return;

  const tokenHash = crypto
    .createHash("sha256")
    .update(rawRefreshToken)
    .digest("hex");

  await prisma.refreshToken.updateMany({
    where: { tokenHash, revokedAt: null },
    data: { revokedAt: new Date() },
  });
};

/**
 * Issue a new access token using a valid refresh token.
 * The refresh token itself is NOT rotated (keep it simple for Phase 1).
 */
export const refreshAccessToken = async (
  rawRefreshToken: string
): Promise<string> => {
  const tokenHash = crypto
    .createHash("sha256")
    .update(rawRefreshToken)
    .digest("hex");

  const stored = await prisma.refreshToken.findUnique({
    where: { tokenHash },
    include: { user: { select: { id: true, role: true, isActive: true, deletedAt: true } } },
  });

  if (!stored) {
    throw {
      code: "INVALID_REFRESH_TOKEN",
      message: "Invalid refresh token",
      statusCode: 401,
    };
  }

  if (stored.revokedAt) {
    throw {
      code: "REFRESH_TOKEN_REVOKED",
      message: "Refresh token has been revoked. Please log in again.",
      statusCode: 401,
    };
  }

  if (stored.expiresAt < new Date()) {
    throw {
      code: "REFRESH_TOKEN_EXPIRED",
      message: "Refresh token has expired. Please log in again.",
      statusCode: 401,
    };
  }

  const user = stored.user;
  if (!user.isActive || user.deletedAt) {
    throw {
      code: "ACCOUNT_INACTIVE",
      message: "Your account has been deactivated",
      statusCode: 403,
    };
  }

  return generateAccessToken(user.id, user.role);
};

/**
 * Get a user's profile by their ID.
 */
export const getMe = async (userId: string): Promise<SafeUser> => {
  const user = await prisma.user.findUnique({
    where: { id: userId, deletedAt: null },
  });

  if (!user) {
    throw {
      code: "USER_NOT_FOUND",
      message: "User not found",
      statusCode: 404,
    };
  }

  return toSafeUser(user);
};

/**
 * Update name or avatar URL of the authenticated user.
 */
export const updateMe = async (
  userId: string,
  data: { full_name?: string; avatar_url?: string | null }
): Promise<SafeUser> => {
  const updateData: Record<string, unknown> = {};
  if (data.full_name !== undefined) updateData.fullName = data.full_name;
  if (data.avatar_url !== undefined) updateData.avatarUrl = data.avatar_url;

  const user = await prisma.user.update({
    where: { id: userId },
    data: updateData,
  });

  return toSafeUser(user);
};

/**
 * Change the authenticated user's password.
 * Verifies the current password before allowing the change.
 * All refresh tokens are revoked on password change.
 */
export const changePassword = async (
  userId: string,
  data: { current_password: string; new_password: string }
): Promise<void> => {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { passwordHash: true },
  });

  if (!user) {
    throw {
      code: "USER_NOT_FOUND",
      message: "User not found",
      statusCode: 404,
    };
  }

  const currentPasswordMatch = await bcrypt.compare(
    data.current_password,
    user.passwordHash
  );

  if (!currentPasswordMatch) {
    throw {
      code: "INVALID_CURRENT_PASSWORD",
      message: "Current password is incorrect",
      statusCode: 400,
    };
  }

  const newPasswordHash = await bcrypt.hash(data.new_password, BCRYPT_ROUNDS);

  // Update password and revoke all sessions atomically
  await prisma.$transaction([
    prisma.user.update({
      where: { id: userId },
      data: { passwordHash: newPasswordHash },
    }),
    prisma.refreshToken.updateMany({
      where: { userId, revokedAt: null },
      data: { revokedAt: new Date() },
    }),
  ]);
};
