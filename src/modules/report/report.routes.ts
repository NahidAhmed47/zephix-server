import { Router } from "express";
import { ReportController } from "./report.controller";
import { auth } from "@/middlewares/auth";
import { requirePermission } from "@/middlewares/requirePermission";

const router = Router();

router.use(auth);
router.get("/revenue", requirePermission("reports.view"), ReportController.revenue);
router.get(
  "/collections",
  requirePermission("reports.view"),
  ReportController.collections
);
router.get(
  "/outstanding",
  requirePermission("reports.view"),
  ReportController.outstanding
);
router.get(
  "/expenses",
  requirePermission("reports.view"),
  ReportController.expenses
);
router.get(
  "/services",
  requirePermission("reports.view"),
  ReportController.services
);
router.get("/clients", requirePermission("reports.view"), ReportController.clients);
// Sensitive financial analytics — gated by reports.view_financial (spec §44).
router.get(
  "/mrr-arr",
  requirePermission("reports.view_financial"),
  ReportController.mrrArr
);
router.get(
  "/forecast",
  requirePermission("reports.view_financial"),
  ReportController.forecast
);
router.get(
  "/profitability",
  requirePermission("reports.view_financial"),
  ReportController.profitability
);

export const ReportRoutes = router;
