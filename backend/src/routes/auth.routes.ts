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

// Logout does not require a valid access token — the controller reads the
// refresh_token cookie directly and revokes it. Requiring authenticate here
// would block revocation when the access token has already expired.
router.post("/logout", logoutController);

router.get("/me", authenticate, getMeController);
router.put("/me", authenticate, validate(updateProfileSchema), updateMeController);
router.put(
  "/change-password",
  authenticate,
  validate(changePasswordSchema),
  changePasswordController
);

export default router;
