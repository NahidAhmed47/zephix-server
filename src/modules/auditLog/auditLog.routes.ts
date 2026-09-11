import { Router } from "express";
import { AuditLogController } from "./auditLog.controller";
import { auth } from "@/middlewares/auth";
import { requirePermission } from "@/middlewares/requirePermission";

const router = Router();

router.get(
  "/",
  auth,
  requirePermission("audit_logs.view"),
  AuditLogController.list
);

export const AuditLogRoutes = router;
