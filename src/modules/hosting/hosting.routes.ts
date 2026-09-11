import { Router } from "express";
import { HostingController } from "./hosting.controller";
import { auth } from "@/middlewares/auth";
import { requirePermission } from "@/middlewares/requirePermission";
import validateRequest from "@/middlewares/validateRequest";
import { createHostingSchema, updateHostingSchema } from "./hosting.validate";

const router = Router();

router.use(auth);
// /expiring must be declared before /:id
router.get(
  "/expiring",
  requirePermission("hosting.view"),
  HostingController.expiring
);
router.get("/", requirePermission("hosting.view"), HostingController.list);
router.post(
  "/",
  requirePermission("hosting.create"),
  validateRequest(createHostingSchema),
  HostingController.create
);
router.get("/:id", requirePermission("hosting.view"), HostingController.getOne);
router.get(
  "/:id/credentials",
  requirePermission("hosting.view_credentials"),
  HostingController.reveal
);
router.patch(
  "/:id",
  requirePermission("hosting.edit"),
  validateRequest(updateHostingSchema),
  HostingController.update
);
router.delete(
  "/:id",
  requirePermission("hosting.delete"),
  HostingController.remove
);

export const HostingRoutes = router;
