import { Router } from "express";
import { ReminderRuleController } from "./reminderRule.controller";
import { auth } from "@/middlewares/auth";
import { requirePermission } from "@/middlewares/requirePermission";
import validateRequest from "@/middlewares/validateRequest";
import {
  createReminderRuleSchema,
  updateReminderRuleSchema,
} from "./reminderRule.validate";

const router = Router();

router.use(auth);
router.get(
  "/",
  requirePermission("communication.view"),
  ReminderRuleController.list
);
router.post(
  "/",
  requirePermission("communication.manage_rules"),
  validateRequest(createReminderRuleSchema),
  ReminderRuleController.create
);
router.get(
  "/:id",
  requirePermission("communication.view"),
  ReminderRuleController.getOne
);
router.patch(
  "/:id",
  requirePermission("communication.manage_rules"),
  validateRequest(updateReminderRuleSchema),
  ReminderRuleController.update
);
router.delete(
  "/:id",
  requirePermission("communication.manage_rules"),
  ReminderRuleController.remove
);

export const ReminderRuleRoutes = router;
