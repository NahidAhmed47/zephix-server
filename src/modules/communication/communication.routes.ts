import { Router } from "express";
import { CommunicationController } from "./communication.controller";
import { auth } from "@/middlewares/auth";
import { requirePermission } from "@/middlewares/requirePermission";
import validateRequest from "@/middlewares/validateRequest";
import { sensitiveLimiter } from "@/middlewares/rateLimit";
import {
  sendSmsSchema,
  sendEmailSchema,
  testConnectionSchema,
} from "./communication.validate";

const router = Router();

router.use(auth);
router.get(
  "/logs",
  requirePermission("communication.view"),
  CommunicationController.logs
);
router.get(
  "/balance",
  requirePermission("communication.view"),
  CommunicationController.balance
);
router.post(
  "/test",
  requirePermission("communication.send"),
  sensitiveLimiter,
  validateRequest(testConnectionSchema),
  CommunicationController.test
);
router.post(
  "/sms",
  requirePermission("communication.send"),
  sensitiveLimiter,
  validateRequest(sendSmsSchema),
  CommunicationController.sendSms
);
router.post(
  "/email",
  requirePermission("communication.send"),
  sensitiveLimiter,
  validateRequest(sendEmailSchema),
  CommunicationController.sendEmail
);

export const CommunicationRoutes = router;
