// backend/src/validators/batch.validators.ts
// Joi schemas for batch management endpoints.

import Joi from "joi";

const BATCH_STATUSES = ["DRAFT", "ACTIVE", "COMPLETED", "ARCHIVED"];
const ENROLLMENT_STATUSES = ["ACTIVE", "WITHDRAWN", "COMPLETED"];

export const createBatchSchema = Joi.object({
  name: Joi.string().min(3).max(255).required().trim(),
  description: Joi.string().max(2000).trim().allow("", null),
  start_date: Joi.string()
    .pattern(/^\d{4}-\d{2}-\d{2}$/)
    .required()
    .messages({ "string.pattern.base": "start_date must be YYYY-MM-DD" }),
  end_date: Joi.string()
    .pattern(/^\d{4}-\d{2}-\d{2}$/)
    .required()
    .messages({ "string.pattern.base": "end_date must be YYYY-MM-DD" }),
});

export const updateBatchSchema = Joi.object({
  name: Joi.string().min(3).max(255).trim(),
  description: Joi.string().max(2000).trim().allow("", null),
  end_date: Joi.string()
    .pattern(/^\d{4}-\d{2}-\d{2}$/)
    .messages({ "string.pattern.base": "end_date must be YYYY-MM-DD" }),
}).min(1);

export const listBatchesQuerySchema = Joi.object({
  status: Joi.string().valid(...BATCH_STATUSES),
  search: Joi.string().max(255).trim(),
  page: Joi.number().integer().min(1).default(1),
  limit: Joi.number().integer().min(1).max(100).default(20),
});

export const archiveBatchSchema = Joi.object({
  confirmation: Joi.string().valid("ARCHIVE").required().messages({
    "any.only": 'confirmation must be the string "ARCHIVE"',
  }),
});

export const enrollStudentsSchema = Joi.object({
  student_ids: Joi.array()
    .items(Joi.string().uuid())
    .min(1)
    .max(100)
    .required(),
});

export const assignMentorsSchema = Joi.object({
  mentor_ids: Joi.array()
    .items(Joi.string().uuid())
    .min(1)
    .required(),
});

export const listStudentsQuerySchema = Joi.object({
  status: Joi.string().valid(...ENROLLMENT_STATUSES),
  search: Joi.string().max(255).trim(),
  page: Joi.number().integer().min(1).default(1),
  limit: Joi.number().integer().min(1).max(100).default(50),
});
