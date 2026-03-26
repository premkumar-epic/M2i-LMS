// backend/src/validators/content.validators.ts
// Joi schemas for all content and supplementary file request bodies.

import Joi from "joi";

const ALLOWED_VIDEO_MIME = [
  "video/mp4", "video/webm", "video/ogg", "video/quicktime",
  "video/x-msvideo", "video/x-matroska",
];
const ALLOWED_DOC_MIME = [
  "application/pdf",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/vnd.ms-powerpoint",
  "application/vnd.openxmlformats-officedocument.presentationml.presentation",
];
const ALLOWED_SUPPLEMENTARY_MIME = [
  ...ALLOWED_DOC_MIME,
  "application/pdf",
  "text/plain",
  "image/png",
  "image/jpeg",
  "application/zip",
];

export const generateUploadUrlSchema = Joi.object({
  batch_id: Joi.string().uuid().required(),
  filename: Joi.string().max(255).required(),
  mime_type: Joi.string()
    .valid(...ALLOWED_VIDEO_MIME, ...ALLOWED_DOC_MIME)
    .required(),
});

export const createContentSchema = Joi.object({
  batch_id: Joi.string().uuid().required(),
  title: Joi.string().max(255).required(),
  description: Joi.string().max(2000).optional().allow(null, ""),
  content_type: Joi.string()
    .valid("VIDEO", "DOCUMENT", "RESOURCE", "LIVE_RECORDING")
    .required(),
  storage_url: Joi.string().uri().required(),
  cdn_url: Joi.string().uri().optional().allow(null, ""),
  duration_seconds: Joi.number().integer().min(0).optional().allow(null),
  file_size_bytes: Joi.number().integer().min(0).optional().allow(null),
  mime_type: Joi.string().max(100).optional().allow(null, ""),
  topic_tags: Joi.array().items(Joi.string().max(100)).max(20).optional(),
  learning_objectives: Joi.string().max(2000).optional().allow(null, ""),
});

export const updateContentSchema = Joi.object({
  title: Joi.string().max(255).optional(),
  description: Joi.string().max(2000).optional().allow(null, ""),
  topic_tags: Joi.array().items(Joi.string().max(100)).max(20).optional(),
  learning_objectives: Joi.string().max(2000).optional().allow(null, ""),
}).min(1);

export const reorderContentSchema = Joi.object({
  batch_id: Joi.string().uuid().required(),
  items: Joi.array()
    .items(
      Joi.object({
        content_id: Joi.string().uuid().required(),
        sort_order: Joi.number().integer().min(0).required(),
      })
    )
    .min(1)
    .required(),
});

export const updateTranscriptSchema = Joi.object({
  transcript: Joi.string().required(),
});

export const watchProgressSchema = Joi.object({
  position_seconds: Joi.number().integer().min(0).required(),
  watch_time_delta_seconds: Joi.number().integer().min(0).required(),
});

export const generateFileUploadUrlSchema = Joi.object({
  filename: Joi.string().max(255).required(),
  mime_type: Joi.string()
    .valid(...ALLOWED_SUPPLEMENTARY_MIME)
    .required(),
});

export const createSupplementaryFileSchema = Joi.object({
  filename: Joi.string().max(255).required(),
  storage_url: Joi.string().uri().required(),
  cdn_url: Joi.string().uri().optional().allow(null, ""),
  file_size_bytes: Joi.number().integer().min(0).optional().allow(null),
  mime_type: Joi.string().max(100).optional().allow(null, ""),
});
