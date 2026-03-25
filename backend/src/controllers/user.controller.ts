// backend/src/controllers/user.controller.ts
// Thin HTTP layer — delegates all logic to user.service.ts.

import { Request, Response, NextFunction } from "express";
import * as userService from "../services/user.service";

export const createUserController = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const user = await userService.createUser(req.body as {
      full_name: string;
      email: string;
      role: string;
    });
    res.status(201).json({
      success: true,
      data: user,
      message: "User created. Share the temporary password with the user.",
    });
  } catch (err) {
    next(err);
  }
};

export const listUsersController = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const result = await userService.listUsers(
      req.query as unknown as {
        role?: string;
        is_active?: boolean;
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

export const getUserController = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const user = await userService.getUserById(req.params.userId as string);
    res.status(200).json({ success: true, data: user });
  } catch (err) {
    next(err);
  }
};

export const updateUserController = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const user = await userService.updateUser(
      req.params.userId as string,
      req.body as { full_name?: string; role?: string; is_active?: boolean }
    );
    res.status(200).json({ success: true, data: user, message: "User updated successfully" });
  } catch (err) {
    next(err);
  }
};

export const resetPasswordController = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const result = await userService.resetUserPassword(req.params.userId as string);
    res.status(200).json({
      success: true,
      data: result,
      message: "Password reset. Share the temporary password with the user.",
    });
  } catch (err) {
    next(err);
  }
};
