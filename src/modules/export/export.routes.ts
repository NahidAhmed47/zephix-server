import { Router } from "express";
import { ExportController } from "./export.controller";
import { auth } from "@/middlewares/auth";
import { requirePermission } from "@/middlewares/requirePermission";

const router = Router();

// CSV export (spec §63). Each is gated by the resource's own export permission —
// a user can never export data they cannot view.
router.use(auth);
router.get(
  "/clients.csv",
  requirePermission("clients.export"),
  ExportController.clients
);
router.get(
  "/invoices.csv",
  requirePermission("invoices.export"),
  ExportController.invoices
);
router.get(
  "/payments.csv",
  requirePermission("payments.export"),
  ExportController.payments
);
router.get(
  "/expenses.csv",
  requirePermission("expenses.export"),
  ExportController.expenses
);

export const ExportRoutes = router;
