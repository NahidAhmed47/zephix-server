import { Router } from "express";
import { RecurringExpenseController } from "./recurringExpense.controller";
import { auth } from "@/middlewares/auth";
import { requirePermission } from "@/middlewares/requirePermission";
import validateRequest from "@/middlewares/validateRequest";
import {
  createRecurringExpenseSchema,
  updateRecurringExpenseSchema,
} from "./recurringExpense.validate";

const router = Router();

router.use(auth);
router.get(
  "/stats",
  requirePermission("recurring_expenses.view"),
  RecurringExpenseController.stats
);
router.get(
  "/",
  requirePermission("recurring_expenses.view"),
  RecurringExpenseController.list
);
router.post(
  "/",
  requirePermission("recurring_expenses.create"),
  validateRequest(createRecurringExpenseSchema),
  RecurringExpenseController.create
);
router.get(
  "/:id",
  requirePermission("recurring_expenses.view"),
  RecurringExpenseController.getOne
);
router.patch(
  "/:id",
  requirePermission("recurring_expenses.edit"),
  validateRequest(updateRecurringExpenseSchema),
  RecurringExpenseController.update
);
router.delete(
  "/:id",
  requirePermission("recurring_expenses.delete"),
  RecurringExpenseController.remove
);

export const RecurringExpenseRoutes = router;
