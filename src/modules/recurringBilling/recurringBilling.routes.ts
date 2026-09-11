import { Router } from "express";
import { RecurringBillingController } from "./recurringBilling.controller";
import { auth } from "@/middlewares/auth";
import { requirePermission } from "@/middlewares/requirePermission";
import validateRequest from "@/middlewares/validateRequest";
import {
  createRecurringBillingSchema,
  updateRecurringBillingSchema,
} from "./recurringBilling.validate";

const router = Router();

router.use(auth);
router.get(
  "/stats",
  requirePermission("recurring_billing.view"),
  RecurringBillingController.stats
);
router.get(
  "/",
  requirePermission("recurring_billing.view"),
  RecurringBillingController.list
);
router.post(
  "/",
  requirePermission("recurring_billing.create"),
  validateRequest(createRecurringBillingSchema),
  RecurringBillingController.create
);
router.get(
  "/:id",
  requirePermission("recurring_billing.view"),
  RecurringBillingController.getOne
);
router.post(
  "/:id/generate",
  requirePermission("recurring_billing.edit"),
  RecurringBillingController.generate
);
router.post(
  "/:id/pause",
  requirePermission("recurring_billing.edit"),
  RecurringBillingController.pause
);
router.post(
  "/:id/resume",
  requirePermission("recurring_billing.edit"),
  RecurringBillingController.resume
);
router.patch(
  "/:id",
  requirePermission("recurring_billing.edit"),
  validateRequest(updateRecurringBillingSchema),
  RecurringBillingController.update
);
router.delete(
  "/:id",
  requirePermission("recurring_billing.delete"),
  RecurringBillingController.remove
);

export const RecurringBillingRoutes = router;
