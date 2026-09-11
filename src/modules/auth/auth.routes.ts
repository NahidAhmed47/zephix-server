import { Router } from "express";
import { AuthController } from "./auth.controller";
import validateRequest from "@/middlewares/validateRequest";
import { loginSchema, changePasswordSchema } from "./auth.validate";
import { auth } from "@/middlewares/auth";
import { authLimiter } from "@/middlewares/rateLimit";

const router = Router();

router.post("/login", authLimiter, validateRequest(loginSchema), AuthController.login);
router.post("/refresh", authLimiter, AuthController.refresh);
router.post("/logout", AuthController.logout);
router.get("/me", auth, AuthController.me);
router.post(
  "/change-password",
  auth,
  authLimiter,
  validateRequest(changePasswordSchema),
  AuthController.changePassword
);

export const AuthRoutes = router;
