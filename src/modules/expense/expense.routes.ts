import { Router } from "express";
import { ExpenseController } from "./expense.controller";
import { auth } from "@/middlewares/auth";
import { requirePermission } from "@/middlewares/requirePermission";
import validateRequest from "@/middlewares/validateRequest";
import { createExpenseSchema, updateExpenseSchema } from "./expense.validate";

const router = Router();

router.use(auth);
router.get("/stats", requirePermission("expenses.view"), ExpenseController.stats);
router.get("/", requirePermission("expenses.view"), ExpenseController.list);
router.post(
  "/",
  requirePermission("expenses.create"),
  validateRequest(createExpenseSchema),
  ExpenseController.create
);
router.get("/:id", requirePermission("expenses.view"), ExpenseController.getOne);
router.patch(
  "/:id",
  requirePermission("expenses.edit"),
  validateRequest(updateExpenseSchema),
  ExpenseController.update
);
router.delete(
  "/:id",
  requirePermission("expenses.delete"),
  ExpenseController.remove
);

export const ExpenseRoutes = router;
