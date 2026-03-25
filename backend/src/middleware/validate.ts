// backend/src/middleware/validate.ts
// Joi request validation middleware.
// Usage: router.post("/register", validate(registerSchema), handler)

import { Request, Response, NextFunction } from "express";
import Joi from "joi";

type ValidateTarget = "body" | "query" | "params";

export const validate =
  (schema: Joi.ObjectSchema, target: ValidateTarget = "body") =>
  (req: Request, _res: Response, next: NextFunction): void => {
    const { error, value } = schema.validate(req[target], {
      abortEarly: false,
      stripUnknown: true,
    });

    if (error) {
      const message = error.details
        .map((d) => d.message)
        .join("; ");
      next({
        code: "VALIDATION_ERROR",
        message,
        statusCode: 400,
      });
      return;
    }

    // Replace req[target] with the validated (and stripped) value
    req[target] = value;
    next();
  };
