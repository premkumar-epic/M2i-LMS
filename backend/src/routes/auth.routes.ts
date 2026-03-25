// backend/src/routes/auth.routes.ts
// F01 Authentication routes.

import { Router } from "express";
import { authenticate } from "../middleware/authenticate";
import { validate } from "../middleware/validate";
import {
  registerSchema,
  loginSchema,
  updateProfileSchema,
  changePasswordSchema,
} from "../validators/auth.validators";
import {
  registerController,
  loginController,
  logoutController,
  refreshTokenController,
  getMeController,
  updateMeController,
  changePasswordController,
} from "../controllers/auth.controller";

const router = Router();

// Public endpoints (no authentication required)
router.post("/register", validate(registerSchema), registerController);
router.post("/login", validate(loginSchema), loginController);
router.post("/refresh-token", refreshTokenController);

// Protected endpoints
router.post("/logout", authenticate, logoutController);
router.get("/me", authenticate, getMeController);
router.put("/me", authenticate, validate(updateProfileSchema), updateMeController);
router.put(
  "/change-password",
  authenticate,
  validate(changePasswordSchema),
  changePasswordController
);

export default router;
