import { Router } from "express";
import { SettingController } from "./setting.controller";
import { auth } from "@/middlewares/auth";
import { requirePermission } from "@/middlewares/requirePermission";
import validateRequest from "@/middlewares/validateRequest";
import { updateSettingSchema } from "./setting.validate";

const router = Router();

router.get("/", auth, requirePermission("settings.view"), SettingController.get);
router.patch(
  "/",
  auth,
  requirePermission("settings.edit"),
  validateRequest(updateSettingSchema),
  SettingController.update
);

export const SettingRoutes = router;
