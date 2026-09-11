import { Router } from "express";
import { PermissionController } from "./permission.controller";
import { auth } from "@/middlewares/auth";
import { requirePermission } from "@/middlewares/requirePermission";

const router = Router();

// The catalog is needed by anyone who can view/manage roles.
router.get(
  "/",
  auth,
  requirePermission(["roles.view", "roles.create", "roles.edit"]),
  PermissionController.list
);

export const PermissionRoutes = router;
