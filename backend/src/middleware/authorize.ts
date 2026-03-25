// backend/src/middleware/authorize.ts
// Role-based access control middleware.
// Use after authenticate() on protected routes.
// Usage: router.get("/admin", authenticate, authorize(["ADMIN", "SUPER_ADMIN"]), handler)

import { Request, Response, NextFunction } from "express";

export const authorize =
  (allowedRoles: string[]) =>
  (req: Request, _res: Response, next: NextFunction): void => {
    const user = req.user;

    if (!user) {
      next({
        code: "NOT_AUTHENTICATED",
        message: "Authentication required",
        statusCode: 401,
      });
      return;
    }

    if (!user.role || !allowedRoles.includes(user.role)) {
      next({
        code: "FORBIDDEN",
        message: "You do not have permission to perform this action",
        statusCode: 403,
      });
      return;
    }

    next();
  };
