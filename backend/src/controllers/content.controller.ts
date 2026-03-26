// backend/src/controllers/content.controller.ts
// HTTP layer for content endpoints — thin wrappers around content.service.ts.

import { Request, Response, NextFunction } from "express";
import * as contentService from "../services/content.service";

const uid = (req: Request): string => req.user!.user_id;
const rol = (req: Request): string => req.user!.role ?? "";
const param = (req: Request, key: string): string => req.params[key] as string;

// POST /api/content/upload-url
export const generateUploadUrl = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const result = await contentService.generateUploadUrl(
      req.body.batch_id as string,
      req.body.filename as string,
      req.body.mime_type as string,
      uid(req), rol(req)
    );
    res.status(200).json(result);
  } catch (err) { next(err); }
};

// POST /api/content
export const createContent = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const content = await contentService.createContent(uid(req), rol(req), req.body as Parameters<typeof contentService.createContent>[2]);
    res.status(201).json(content);
  } catch (err) { next(err); }
};

// GET /api/batches/:batchId/content
export const listBatchContent = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const items = await contentService.listBatchContent(param(req, "batchId"), uid(req), rol(req));
    res.status(200).json({ content: items, total: items.length });
  } catch (err) { next(err); }
};

// GET /api/content/:contentId
export const getContent = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const content = await contentService.getContent(param(req, "contentId"), uid(req), rol(req));
    res.status(200).json(content);
  } catch (err) { next(err); }
};

// PUT /api/content/:contentId
export const updateContent = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const content = await contentService.updateContent(param(req, "contentId"), uid(req), rol(req), req.body as Parameters<typeof contentService.updateContent>[3]);
    res.status(200).json(content);
  } catch (err) { next(err); }
};

// POST /api/content/:contentId/publish
export const publishContent = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const content = await contentService.publishContent(param(req, "contentId"), uid(req), rol(req));
    res.status(200).json(content);
  } catch (err) { next(err); }
};

// POST /api/content/:contentId/unpublish
export const unpublishContent = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const content = await contentService.unpublishContent(param(req, "contentId"), uid(req), rol(req));
    res.status(200).json(content);
  } catch (err) { next(err); }
};

// DELETE /api/content/:contentId
export const deleteContent = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    await contentService.deleteContent(param(req, "contentId"), uid(req), rol(req));
    res.status(204).send();
  } catch (err) { next(err); }
};

// PUT /api/content/reorder
export const reorderContent = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    await contentService.reorderContent(
      req.body.batch_id as string,
      req.body.items as { content_id: string; sort_order: number }[],
      uid(req), rol(req)
    );
    res.status(204).send();
  } catch (err) { next(err); }
};

// GET /api/content/:contentId/transcript
export const getTranscript = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const result = await contentService.getTranscript(param(req, "contentId"), uid(req), rol(req));
    res.status(200).json(result);
  } catch (err) { next(err); }
};

// PUT /api/content/:contentId/transcript
export const updateTranscript = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const result = await contentService.updateTranscript(param(req, "contentId"), req.body.transcript as string, uid(req), rol(req));
    res.status(200).json(result);
  } catch (err) { next(err); }
};

// PATCH /api/content/:contentId/progress
export const updateWatchProgress = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const result = await contentService.updateWatchProgress(
      param(req, "contentId"), uid(req),
      req.body.position_seconds as number,
      req.body.watch_time_delta_seconds as number
    );
    res.status(200).json(result);
  } catch (err) { next(err); }
};

// POST /api/content/:contentId/files/upload-url
export const generateFileUploadUrl = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const result = await contentService.generateFileUploadUrl(
      param(req, "contentId"), req.body.filename as string, req.body.mime_type as string,
      uid(req), rol(req)
    );
    res.status(200).json(result);
  } catch (err) { next(err); }
};

// POST /api/content/:contentId/files
export const createSupplementaryFile = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const file = await contentService.createSupplementaryFile(param(req, "contentId"), uid(req), rol(req), req.body as Parameters<typeof contentService.createSupplementaryFile>[3]);
    res.status(201).json(file);
  } catch (err) { next(err); }
};

// DELETE /api/content/:contentId/files/:fileId
export const deleteSupplementaryFile = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    await contentService.deleteSupplementaryFile(param(req, "fileId"), param(req, "contentId"), uid(req), rol(req));
    res.status(204).send();
  } catch (err) { next(err); }
};
