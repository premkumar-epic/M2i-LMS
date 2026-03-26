// backend/src/middleware/authenticate.ts
// Verifies the JWT access_token cookie on every protected request.
// Attaches decoded payload to req.user.

import { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";

export type AuthUser = {
  user_id: string;
  role: string | null;
};

// Extend Express Request type to include our user
declare global {
  namespace Express {
    interface Request {
      user?: AuthUser;
    }
  }
}

export const authenticate = (
  req: Request,
  _res: Response,
  next: NextFunction
): void => {
  const token = req.cookies?.access_token as string | undefined;

  if (!token) {
    next({
      code: "NO_TOKEN",
      message: "Authentication required",
      statusCode: 401,
    });
    return;
  }

  const secret = process.env.JWT_SECRET;
  if (!secret) {
    next({
      code: "SERVER_MISCONFIGURATION",
      message: "Server configuration error",
      statusCode: 500,
    });
    return;
  }

  try {
    const payload = jwt.verify(token, secret) as AuthUser;
    req.user = payload;
    next();
  } catch (err) {
    if (err instanceof jwt.TokenExpiredError) {
      next({
        code: "TOKEN_EXPIRED",
        message: "Access token has expired",
        statusCode: 401,
      });
    } else {
      next({
        code: "INVALID_TOKEN",
        message: "Invalid access token",
        statusCode: 401,
      });
    }
  }
};
