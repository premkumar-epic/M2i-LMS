// backend/src/controllers/auth.controller.ts
// Thin request/response layer — delegates all logic to auth.service.ts.

import { Request, Response, NextFunction } from "express";
import * as authService from "../services/auth.service";

// =========================================================
// COOKIE HELPERS
// =========================================================

const COOKIE_BASE_OPTIONS = {
  httpOnly: true,
  secure: process.env.NODE_ENV === "production",
  sameSite: "strict" as const,
};

const setAuthCookies = (
  res: Response,
  accessToken: string,
  refreshToken: string
): void => {
  // Access token — short-lived, sent on every request
  res.cookie(authService.ACCESS_TOKEN_COOKIE, accessToken, {
    ...COOKIE_BASE_OPTIONS,
    path: "/",
    maxAge: 60 * 60 * 1000, // 1 hour in ms
  });

  // Refresh token — scoped to /api/auth so both the refresh and logout
  // endpoints receive it, but it is never sent to other routes.
  res.cookie(authService.REFRESH_TOKEN_COOKIE, refreshToken, {
    ...COOKIE_BASE_OPTIONS,
    path: "/api/auth",
    maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days in ms
  });
};

const clearAuthCookies = (res: Response): void => {
  res.clearCookie(authService.ACCESS_TOKEN_COOKIE, { path: "/" });
  res.clearCookie(authService.REFRESH_TOKEN_COOKIE, {
    path: "/api/auth",
  });
};

// =========================================================
// CONTROLLERS
// =========================================================

export const registerController = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const user = await authService.register(req.body as {
      email: string;
      password: string;
      full_name: string;
    });
    res.status(201).json({ success: true, data: { user } });
  } catch (err) {
    next(err);
  }
};

export const loginController = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const ipAddress =
      (req.headers["x-forwarded-for"] as string)?.split(",")[0]?.trim() ??
      req.socket.remoteAddress ??
      "unknown";

    const result = await authService.login({
      ...(req.body as { email: string; password: string }),
      ipAddress,
    });

    setAuthCookies(res, result.tokens.accessToken, result.tokens.refreshToken);
    res.status(200).json({ success: true, data: { user: result.user } });
  } catch (err) {
    next(err);
  }
};

export const logoutController = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const rawRefreshToken = req.cookies?.[authService.REFRESH_TOKEN_COOKIE] as
      | string
      | undefined;
    if (rawRefreshToken) {
      await authService.logout(rawRefreshToken);
    }
    clearAuthCookies(res);
    res.status(200).json({ success: true, data: { message: "Logged out successfully" } });
  } catch (err) {
    next(err);
  }
};

export const refreshTokenController = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const rawRefreshToken = req.cookies?.[authService.REFRESH_TOKEN_COOKIE] as
      | string
      | undefined;

    if (!rawRefreshToken) {
      next({
        code: "NO_REFRESH_TOKEN",
        message: "Refresh token not found",
        statusCode: 401,
      });
      return;
    }

    const newAccessToken = await authService.refreshAccessToken(rawRefreshToken);

    res.cookie(authService.ACCESS_TOKEN_COOKIE, newAccessToken, {
      ...COOKIE_BASE_OPTIONS,
      path: "/",
      maxAge: 60 * 60 * 1000,
    });

    res.status(200).json({ success: true, data: { message: "Token refreshed" } });
  } catch (err) {
    next(err);
  }
};

export const getMeController = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const user = await authService.getMe(req.user!.user_id);
    res.status(200).json({ success: true, data: { user } });
  } catch (err) {
    next(err);
  }
};

export const updateMeController = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const user = await authService.updateMe(req.user!.user_id, req.body as {
      full_name?: string;
      avatar_url?: string | null;
    });
    res.status(200).json({ success: true, data: { user } });
  } catch (err) {
    next(err);
  }
};

export const changePasswordController = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    await authService.changePassword(req.user!.user_id, req.body as {
      current_password: string;
      new_password: string;
    });
    // Revoke all sessions — force re-login on other devices
    clearAuthCookies(res);
    res.status(200).json({
      success: true,
      data: { message: "Password changed successfully. Please log in again." },
    });
  } catch (err) {
    next(err);
  }
};
