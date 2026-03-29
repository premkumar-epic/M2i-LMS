// backend/src/services/content.service.ts
// Content management business logic (F03).

import { v4 as uuidv4 } from "uuid";
import { prisma } from "../lib/prisma";
import {
  generatePresignedUploadUrl,
  toCdnUrl,
  contentKey,
  supplementaryKey,
  deleteS3Object,
} from "../lib/s3";
import { contentQueue } from "../queues/queues";
import { sendToBatch } from "./notification.service";
import { logger } from "../lib/logger";

// ─── Helpers ──────────────────────────────────────────────────────────────────

const CONTENT_VIDEO_MIME = new Set([
  "video/mp4", "video/webm", "video/ogg", "video/quicktime",
  "video/x-msvideo", "video/x-matroska",
]);

const needsTranscription = (contentType: string, mimeType: string | null): boolean =>
  (contentType === "VIDEO" || contentType === "LIVE_RECORDING") &&
  (mimeType ? CONTENT_VIDEO_MIME.has(mimeType) : true);

const toContent = (c: {
  id: string;
  batchId: string;
  uploadedBy: string;
  title: string;
  description: string | null;
  contentType: string;
  storageUrl: string;
  cdnUrl: string | null;
  durationSeconds: number | null;
  fileSizeBytes: bigint | null;
  mimeType: string | null;
  topicTags: string[];
  learningObjectives: string | null;
  transcript: string | null;
  transcriptionStatus: string;
  isPublished: boolean;
  sortOrder: number;
  createdAt: Date;
  updatedAt: Date;
  supplementaryFiles?: {
    id: string;
    filename: string;
    cdnUrl: string | null;
    storageUrl: string;
    fileSizeBytes: bigint | null;
    mimeType: string | null;
    uploadedAt: Date;
  }[];
}) => ({
  content_id: c.id,
  batch_id: c.batchId,
  uploaded_by: c.uploadedBy,
  title: c.title,
  description: c.description,
  content_type: c.contentType,
  storage_url: c.storageUrl,
  cdn_url: c.cdnUrl,
  duration_seconds: c.durationSeconds,
  file_size_bytes: c.fileSizeBytes?.toString() ?? null, // BigInt → string
  mime_type: c.mimeType,
  topic_tags: c.topicTags,
  learning_objectives: c.learningObjectives,
  transcript: c.transcript,
  transcription_status: c.transcriptionStatus,
  is_published: c.isPublished,
  sort_order: c.sortOrder,
  created_at: c.createdAt,
  updated_at: c.updatedAt,
  supplementary_files: c.supplementaryFiles?.map((f) => ({
    file_id: f.id,
    filename: f.filename,
    cdn_url: f.cdnUrl,
    storage_url: f.storageUrl,
    file_size_bytes: f.fileSizeBytes?.toString() ?? null,
    mime_type: f.mimeType,
    uploaded_at: f.uploadedAt,
  })),
});

// Verify the requesting user has access to the batch
const assertBatchAccess = async (batchId: string, userId: string, role: string): Promise<void> => {
  if (role === "ADMIN" || role === "SUPER_ADMIN") return;

  if (role === "MENTOR") {
    const assignment = await prisma.batchMentor.findUnique({
      where: { batchId_mentorId: { batchId, mentorId: userId } },
    });
    if (!assignment) {
      throw { code: "FORBIDDEN", message: "You are not assigned to this batch", statusCode: 403 };
    }
    return;
  }

  if (role === "STUDENT") {
    const enrollment = await prisma.enrollment.findUnique({
      where: { studentId_batchId: { studentId: userId, batchId } },
    });
    if (!enrollment || enrollment.status !== "ACTIVE") {
      throw { code: "FORBIDDEN", message: "You are not enrolled in this batch", statusCode: 403 };
    }
    return;
  }

  throw { code: "FORBIDDEN", message: "Access denied", statusCode: 403 };
};

// ─── Upload URL ───────────────────────────────────────────────────────────────

export const generateUploadUrl = async (
  batchId: string,
  filename: string,
  mimeType: string,
  requesterId: string,
  requesterRole: string
) => {
  await assertBatchAccess(batchId, requesterId, requesterRole);

  // Validate the batch exists and is not archived
  const batch = await prisma.batch.findUnique({ where: { id: batchId } });
  if (!batch) {
    throw { code: "NOT_FOUND", message: "Batch not found", statusCode: 404 };
  }
  if (batch.status === "ARCHIVED") {
    throw { code: "VALIDATION_ERROR", message: "Cannot upload to an archived batch", statusCode: 400 };
  }

  const contentId = uuidv4();
  const key = contentKey(batchId, contentId, filename);
  const uploadUrl = await generatePresignedUploadUrl(key, mimeType);
  const cdnUrl = toCdnUrl(key);

  return { upload_url: uploadUrl, s3_key: key, cdn_url: cdnUrl, content_id: contentId };
};

// ─── Create ───────────────────────────────────────────────────────────────────

export const createContent = async (
  requesterId: string,
  requesterRole: string,
  input: {
    content_id?: string;   // When provided (S3 flow), the DB record is created with this ID so it matches the S3 key path
    batch_id: string;
    title: string;
    description?: string | null;
    content_type: string;
    storage_url: string;
    cdn_url?: string | null;
    duration_seconds?: number | null;
    file_size_bytes?: number | null;
    mime_type?: string | null;
    topic_tags?: string[];
    learning_objectives?: string | null;
  }
) => {
  await assertBatchAccess(input.batch_id, requesterId, requesterRole);

  const batch = await prisma.batch.findUnique({ where: { id: input.batch_id } });
  if (!batch) {
    throw { code: "NOT_FOUND", message: "Batch not found", statusCode: 404 };
  }
  if (batch.status === "ARCHIVED") {
    throw { code: "VALIDATION_ERROR", message: "Cannot add content to an archived batch", statusCode: 400 };
  }

  // Determine transcription requirement
  const transcriptionStatus = needsTranscription(input.content_type, input.mime_type ?? null)
    ? "PENDING"
    : "NOT_REQUIRED";

  // sortOrder = max existing + 1
  const maxOrder = await prisma.content.aggregate({
    where: { batchId: input.batch_id, deletedAt: null },
    _max: { sortOrder: true },
  });
  const sortOrder = (maxOrder._max.sortOrder ?? -1) + 1;

  const content = await prisma.content.create({
    data: {
      ...(input.content_id ? { id: input.content_id } : {}),
      batchId: input.batch_id,
      uploadedBy: requesterId,
      title: input.title,
      description: input.description ?? null,
      contentType: input.content_type as never,
      storageUrl: input.storage_url,
      cdnUrl: input.cdn_url ?? null,
      durationSeconds: input.duration_seconds ?? null,
      fileSizeBytes: input.file_size_bytes != null ? BigInt(input.file_size_bytes) : null,
      mimeType: input.mime_type ?? null,
      topicTags: input.topic_tags ?? [],
      learningObjectives: input.learning_objectives ?? null,
      transcriptionStatus: transcriptionStatus as never,
      sortOrder,
    },
  });

  // Enqueue audio extraction for video content
  if (transcriptionStatus === "PENDING") {
    await contentQueue.add(
      "EXTRACT_AUDIO",
      {
        jobName: "EXTRACT_AUDIO",
        contentId: content.id,
        batchId: input.batch_id,
        uploadedBy: requesterId,
        storageUrl: input.storage_url,
        mimeType: input.mime_type ?? "video/mp4",
        tempAudioDir: process.env.TEMP_AUDIO_DIR ?? "/tmp/m2i_audio",
      },
      { attempts: 3, backoff: { type: "exponential", delay: 10_000 }, removeOnComplete: 50, removeOnFail: 100 }
    );
  }

  logger.info(`[Content] Created content ${content.id} in batch ${input.batch_id}`);
  return toContent(content);
};

// ─── List ─────────────────────────────────────────────────────────────────────

export const listBatchContent = async (
  batchId: string,
  requesterId: string,
  requesterRole: string
) => {
  await assertBatchAccess(batchId, requesterId, requesterRole);

  const batch = await prisma.batch.findUnique({ where: { id: batchId } });
  if (!batch) {
    throw { code: "NOT_FOUND", message: "Batch not found", statusCode: 404 };
  }

  const isStudent = requesterRole === "STUDENT";

  const items = await prisma.content.findMany({
    where: {
      batchId,
      deletedAt: null,
      ...(isStudent ? { isPublished: true } : {}),
    },
    orderBy: { sortOrder: "asc" },
    include: { supplementaryFiles: true },
  });

  return items.map(toContent);
};

// ─── Get single ───────────────────────────────────────────────────────────────

export const getContent = async (
  contentId: string,
  requesterId: string,
  requesterRole: string
) => {
  const content = await prisma.content.findFirst({
    where: { id: contentId, deletedAt: null },
    include: { supplementaryFiles: true },
  });

  if (!content) {
    throw { code: "NOT_FOUND", message: "Content not found", statusCode: 404 };
  }

  await assertBatchAccess(content.batchId, requesterId, requesterRole);

  if (requesterRole === "STUDENT" && !content.isPublished) {
    throw { code: "NOT_FOUND", message: "Content not found", statusCode: 404 };
  }

  return toContent(content);
};

// ─── Update ───────────────────────────────────────────────────────────────────

export const updateContent = async (
  contentId: string,
  requesterId: string,
  requesterRole: string,
  input: {
    title?: string;
    description?: string | null;
    topic_tags?: string[];
    learning_objectives?: string | null;
  }
) => {
  const content = await prisma.content.findFirst({
    where: { id: contentId, deletedAt: null },
  });
  if (!content) {
    throw { code: "NOT_FOUND", message: "Content not found", statusCode: 404 };
  }

  await assertBatchAccess(content.batchId, requesterId, requesterRole);

  // Mentors may only edit content they uploaded; admins may edit any content
  const isAdmin = requesterRole === "ADMIN" || requesterRole === "SUPER_ADMIN";
  if (!isAdmin && content.uploadedBy !== requesterId) {
    throw {
      code: "FORBIDDEN",
      message: "You can only edit content you uploaded",
      statusCode: 403,
    };
  }

  const updated = await prisma.content.update({
    where: { id: contentId },
    data: {
      ...(input.title !== undefined ? { title: input.title } : {}),
      ...(input.description !== undefined ? { description: input.description } : {}),
      ...(input.topic_tags !== undefined ? { topicTags: input.topic_tags } : {}),
      ...(input.learning_objectives !== undefined ? { learningObjectives: input.learning_objectives } : {}),
    },
    include: { supplementaryFiles: true },
  });

  return toContent(updated);
};

// ─── Publish / unpublish ──────────────────────────────────────────────────────

export const publishContent = async (
  contentId: string,
  requesterId: string,
  requesterRole: string
) => {
  const content = await prisma.content.findFirst({
    where: { id: contentId, deletedAt: null },
  });
  if (!content) {
    throw { code: "NOT_FOUND", message: "Content not found", statusCode: 404 };
  }

  await assertBatchAccess(content.batchId, requesterId, requesterRole);

  const updated = await prisma.content.update({
    where: { id: contentId },
    data: { isPublished: true },
  });

  // Notify enrolled students
  await sendToBatch(
    content.batchId,
    "CONTENT_PUBLISHED",
    "New content available",
    `"${content.title}" has been published in your batch.`,
    { content_id: contentId },
    `/student/content/${contentId}`
  ).catch((err: unknown) => {
    logger.warn("[Content] Failed to send publish notification", { err });
  });

  return toContent(updated);
};

export const unpublishContent = async (
  contentId: string,
  requesterId: string,
  requesterRole: string
) => {
  const content = await prisma.content.findFirst({
    where: { id: contentId, deletedAt: null },
  });
  if (!content) {
    throw { code: "NOT_FOUND", message: "Content not found", statusCode: 404 };
  }

  await assertBatchAccess(content.batchId, requesterId, requesterRole);

  const updated = await prisma.content.update({
    where: { id: contentId },
    data: { isPublished: false },
  });

  return toContent(updated);
};

// ─── Soft delete ──────────────────────────────────────────────────────────────

export const deleteContent = async (
  contentId: string,
  requesterId: string,
  requesterRole: string
) => {
  const content = await prisma.content.findFirst({
    where: { id: contentId, deletedAt: null },
  });
  if (!content) {
    throw { code: "NOT_FOUND", message: "Content not found", statusCode: 404 };
  }

  // Only admins can delete — mentors may only update/unpublish
  if (requesterRole !== "ADMIN" && requesterRole !== "SUPER_ADMIN") {
    throw { code: "FORBIDDEN", message: "Only admins can delete content", statusCode: 403 };
  }

  await prisma.content.update({
    where: { id: contentId },
    data: { deletedAt: new Date(), isPublished: false },
  });

  logger.info(`[Content] Soft-deleted content ${contentId} by ${requesterId}`);
};

// ─── Reorder ──────────────────────────────────────────────────────────────────

export const reorderContent = async (
  batchId: string,
  items: { content_id: string; sort_order: number }[],
  requesterId: string,
  requesterRole: string
) => {
  await assertBatchAccess(batchId, requesterId, requesterRole);

  const sortOrders = items.map((i) => i.sort_order);
  if (new Set(sortOrders).size !== sortOrders.length) {
    throw { code: "VALIDATION_ERROR", message: "Duplicate sort_order values are not allowed", statusCode: 400 };
  }

  const contentIds = items.map((i) => i.content_id);

  // Validate all items belong to this batch and are not soft-deleted
  const existing = await prisma.content.findMany({
    where: { id: { in: contentIds }, batchId, deletedAt: null },
    select: { id: true },
  });

  if (existing.length !== contentIds.length) {
    throw {
      code: "VALIDATION_ERROR",
      message: "One or more content items not found in this batch",
      statusCode: 400,
    };
  }

  await prisma.$transaction(
    items.map((item) =>
      prisma.content.update({
        where: { id: item.content_id },
        data: { sortOrder: item.sort_order },
      })
    )
  );
};

// ─── Transcript ───────────────────────────────────────────────────────────────

export const getTranscript = async (
  contentId: string,
  requesterId: string,
  requesterRole: string
) => {
  const content = await prisma.content.findFirst({
    where: { id: contentId, deletedAt: null },
    select: { id: true, batchId: true, transcript: true, transcriptionStatus: true },
  });
  if (!content) {
    throw { code: "NOT_FOUND", message: "Content not found", statusCode: 404 };
  }

  await assertBatchAccess(content.batchId, requesterId, requesterRole);

  return {
    content_id: content.id,
    transcript: content.transcript,
    transcription_status: content.transcriptionStatus,
  };
};

export const updateTranscript = async (
  contentId: string,
  transcript: string,
  requesterId: string,
  requesterRole: string
) => {
  const content = await prisma.content.findFirst({
    where: { id: contentId, deletedAt: null },
  });
  if (!content) {
    throw { code: "NOT_FOUND", message: "Content not found", statusCode: 404 };
  }

  await assertBatchAccess(content.batchId, requesterId, requesterRole);

  const updated = await prisma.content.update({
    where: { id: contentId },
    data: { transcript, transcriptionStatus: "COMPLETE" },
  });

  return {
    content_id: updated.id,
    transcript: updated.transcript,
    transcription_status: updated.transcriptionStatus,
  };
};

// ─── Watch progress ───────────────────────────────────────────────────────────

export const updateWatchProgress = async (
  contentId: string,
  studentId: string,
  positionSeconds: number,
  watchTimeDeltaSeconds: number
) => {
  const content = await prisma.content.findFirst({
    where: { id: contentId, deletedAt: null, isPublished: true },
    select: { id: true, batchId: true, durationSeconds: true },
  });
  if (!content) {
    throw { code: "NOT_FOUND", message: "Content not found", statusCode: 404 };
  }

  // Verify student enrollment
  const enrollment = await prisma.enrollment.findUnique({
    where: { studentId_batchId: { studentId, batchId: content.batchId } },
  });
  if (!enrollment || enrollment.status !== "ACTIVE") {
    throw { code: "FORBIDDEN", message: "You are not enrolled in this batch", statusCode: 403 };
  }

  const now = new Date();

  // Compute completion percentage based on video duration
  const completionPercentage =
    content.durationSeconds && content.durationSeconds > 0
      ? Math.min(100, (positionSeconds / content.durationSeconds) * 100)
      : 0;

  const isCompleted = completionPercentage >= 90;

  const existing = await prisma.contentAccessLog.findUnique({
    where: { studentId_contentId: { studentId, contentId } },
  });

  // Increment when student had NOT yet completed this video but just crossed the 90% threshold.
  // Fires on initial completion and each subsequent re-completion (after scrubbing back below 90%).
  const rewatchIncrement = existing && !existing.isCompleted && isCompleted ? 1 : 0;

  await prisma.contentAccessLog.upsert({
    where: { studentId_contentId: { studentId, contentId } },
    create: {
      studentId,
      contentId,
      batchId: content.batchId,
      lastAccessedAt: now,
      totalWatchTimeSeconds: watchTimeDeltaSeconds,
      lastPositionSeconds: positionSeconds,
      completionPercentage,
      isCompleted,
      accessCount: 1,
      rewatchCount: 0,
    },
    update: {
      lastAccessedAt: now,
      totalWatchTimeSeconds: { increment: watchTimeDeltaSeconds },
      lastPositionSeconds: positionSeconds,
      completionPercentage,
      isCompleted,
      rewatchCount: rewatchIncrement > 0 ? { increment: rewatchIncrement } : undefined,
    },
  });

  return { content_id: contentId, completion_percentage: completionPercentage, is_completed: isCompleted };
};

export const getWatchProgress = async (contentId: string, studentId: string) => {
  const log = await prisma.contentAccessLog.findUnique({
    where: { studentId_contentId: { studentId, contentId } },
    select: { completionPercentage: true, isCompleted: true, lastPositionSeconds: true },
  });
  return {
    content_id: contentId,
    completion_percentage: log?.completionPercentage ?? 0,
    is_completed: log?.isCompleted ?? false,
    last_position_seconds: log?.lastPositionSeconds ?? 0,
  };
};

// ─── Supplementary files ──────────────────────────────────────────────────────

export const generateFileUploadUrl = async (
  contentId: string,
  filename: string,
  mimeType: string,
  requesterId: string,
  requesterRole: string
) => {
  const content = await prisma.content.findFirst({
    where: { id: contentId, deletedAt: null },
    select: { id: true, batchId: true },
  });
  if (!content) {
    throw { code: "NOT_FOUND", message: "Content not found", statusCode: 404 };
  }

  await assertBatchAccess(content.batchId, requesterId, requesterRole);

  const fileId = uuidv4();
  const key = supplementaryKey(content.batchId, contentId, fileId, filename);
  const uploadUrl = await generatePresignedUploadUrl(key, mimeType);
  const cdnUrl = toCdnUrl(key);

  return { upload_url: uploadUrl, s3_key: key, cdn_url: cdnUrl, file_id: fileId };
};

export const createSupplementaryFile = async (
  contentId: string,
  requesterId: string,
  requesterRole: string,
  input: {
    filename: string;
    storage_url: string;
    cdn_url?: string | null;
    file_size_bytes?: number | null;
    mime_type?: string | null;
  }
) => {
  const content = await prisma.content.findFirst({
    where: { id: contentId, deletedAt: null },
    select: { id: true, batchId: true },
  });
  if (!content) {
    throw { code: "NOT_FOUND", message: "Content not found", statusCode: 404 };
  }

  await assertBatchAccess(content.batchId, requesterId, requesterRole);

  const file = await prisma.supplementaryFile.create({
    data: {
      contentId,
      filename: input.filename,
      storageUrl: input.storage_url,
      cdnUrl: input.cdn_url ?? null,
      fileSizeBytes: input.file_size_bytes != null ? BigInt(input.file_size_bytes) : null,
      mimeType: input.mime_type ?? null,
    },
  });

  return {
    file_id: file.id,
    content_id: contentId,
    filename: file.filename,
    cdn_url: file.cdnUrl,
    storage_url: file.storageUrl,
    file_size_bytes: file.fileSizeBytes?.toString() ?? null,
    mime_type: file.mimeType,
    uploaded_at: file.uploadedAt,
  };
};

export const deleteSupplementaryFile = async (
  fileId: string,
  contentId: string,
  requesterId: string,
  requesterRole: string
) => {
  const file = await prisma.supplementaryFile.findFirst({
    where: { id: fileId, contentId },
    include: { content: { select: { batchId: true, deletedAt: true } } },
  });

  if (!file || file.content.deletedAt !== null) {
    throw { code: "NOT_FOUND", message: "File not found", statusCode: 404 };
  }

  // Only admins can hard-delete supplementary files
  if (requesterRole !== "ADMIN" && requesterRole !== "SUPER_ADMIN") {
    throw { code: "FORBIDDEN", message: "Only admins can delete files", statusCode: 403 };
  }

  await assertBatchAccess(file.content.batchId, requesterId, requesterRole);
  await prisma.supplementaryFile.delete({ where: { id: fileId } });

  // Best-effort S3 cleanup — log on failure but don't fail the request
  try {
    const s3Key = new URL(file.storageUrl).pathname.replace(/^\//, "");
    await deleteS3Object(s3Key);
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    logger.warn(`[deleteSupplementaryFile] S3 cleanup failed for file ${fileId}: ${msg}`);
  }
};
