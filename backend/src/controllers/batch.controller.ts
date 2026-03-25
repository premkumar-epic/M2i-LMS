// backend/src/controllers/batch.controller.ts
// Thin HTTP layer — delegates all logic to batch.service.ts.

import { Request, Response, NextFunction } from "express";
import * as batchService from "../services/batch.service";

export const createBatchController = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const batch = await batchService.createBatch(req.user!.user_id, req.body as {
      name: string;
      description?: string;
      start_date: string;
      end_date: string;
    });
    res.status(201).json({ success: true, data: batch, message: "Batch created successfully" });
  } catch (err) {
    next(err);
  }
};

export const listBatchesController = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const result = await batchService.listBatches(
      req.query as unknown as {
        status?: string;
        search?: string;
        page: number;
        limit: number;
      }
    );
    res.status(200).json({ success: true, ...result });
  } catch (err) {
    next(err);
  }
};

export const getBatchController = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const batch = await batchService.getBatchById(
      req.params.batchId as string,
      req.user!.user_id,
      req.user!.role ?? ""
    );
    res.status(200).json({ success: true, data: batch });
  } catch (err) {
    next(err);
  }
};

export const updateBatchController = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const batch = await batchService.updateBatch(
      req.params.batchId as string,
      req.body as { name?: string; description?: string; end_date?: string }
    );
    res.status(200).json({ success: true, data: batch, message: "Batch updated successfully" });
  } catch (err) {
    next(err);
  }
};

export const archiveBatchController = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const result = await batchService.archiveBatch(req.params.batchId as string);
    res.status(200).json({ success: true, data: result, message: "Batch archived successfully" });
  } catch (err) {
    next(err);
  }
};

export const enrollStudentsController = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const result = await batchService.enrollStudents(
      req.params.batchId as string,
      req.user!.user_id,
      (req.body as { student_ids: string[] }).student_ids
    );
    const { enrolled, skipped } = result;
    const msg = `${enrolled.length} student${enrolled.length !== 1 ? "s" : ""} enrolled. ${skipped.length} skipped.`;
    res.status(200).json({ success: true, data: result, message: msg });
  } catch (err) {
    next(err);
  }
};

export const withdrawStudentController = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const result = await batchService.withdrawStudent(
      req.params.batchId as string,
      req.params.studentId as string,
      req.user!.user_id
    );
    res.status(200).json({ success: true, data: result, message: "Student withdrawn from batch" });
  } catch (err) {
    next(err);
  }
};

export const listBatchStudentsController = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const result = await batchService.listBatchStudents(
      req.params.batchId as string,
      req.query as unknown as { status?: string; search?: string; page: number; limit: number }
    );
    res.status(200).json({ success: true, ...result });
  } catch (err) {
    next(err);
  }
};

export const assignMentorsController = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const result = await batchService.assignMentors(
      req.params.batchId as string,
      req.user!.user_id,
      (req.body as { mentor_ids: string[] }).mentor_ids
    );
    const msg = `${result.assigned.length} mentor${result.assigned.length !== 1 ? "s" : ""} assigned`;
    res.status(200).json({ success: true, data: result, message: msg });
  } catch (err) {
    next(err);
  }
};

export const getMyBatchController = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const batch = await batchService.getMyBatch(req.user!.user_id);
    res.status(200).json({ success: true, data: batch });
  } catch (err) {
    next(err);
  }
};
