// backend/src/routes/user.routes.ts
// All /api/users routes — admin only.

import { Router } from "express";
import { authenticate } from "../middleware/authenticate";
import { authorize } from "../middleware/authorize";
import { validate } from "../middleware/validate";
import {
  createUserSchema,
  updateUserSchema,
  listUsersQuerySchema,
} from "../validators/user.validators";
import {
  createUserController,
  listUsersController,
  getUserController,
  updateUserController,
  resetPasswordController,
} from "../controllers/user.controller";

const router = Router();
const adminOnly = [authenticate, authorize(["ADMIN", "SUPER_ADMIN"])];

router.post("/", ...adminOnly, validate(createUserSchema), createUserController);
router.get("/", ...adminOnly, validate(listUsersQuerySchema, "query"), listUsersController);
router.get("/:userId", ...adminOnly, getUserController);
router.put("/:userId", ...adminOnly, validate(updateUserSchema), updateUserController);
router.post("/:userId/reset-password", ...adminOnly, resetPasswordController);

export default router;
