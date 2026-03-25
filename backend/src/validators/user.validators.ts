// backend/src/validators/user.validators.ts
// Joi schemas for user management endpoints.

import Joi from "joi";

const VALID_ROLES = ["STUDENT", "MENTOR", "ADMIN", "SUPER_ADMIN"];

export const createUserSchema = Joi.object({
  full_name: Joi.string().min(2).max(100).required().trim(),
  email: Joi.string().email().max(255).required().lowercase().trim(),
  role: Joi.string()
    .valid(...VALID_ROLES)
    .required(),
});

export const updateUserSchema = Joi.object({
  full_name: Joi.string().min(2).max(100).trim(),
  role: Joi.string().valid(...VALID_ROLES),
  is_active: Joi.boolean(),
}).min(1);

export const listUsersQuerySchema = Joi.object({
  role: Joi.string().valid(...VALID_ROLES),
  is_active: Joi.boolean(),
  search: Joi.string().max(255).trim(),
  page: Joi.number().integer().min(1).default(1),
  limit: Joi.number().integer().min(1).max(100).default(20),
});
