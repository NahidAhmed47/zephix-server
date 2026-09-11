import { Router } from "express";
import { DealController } from "./deal.controller";
import { auth } from "@/middlewares/auth";
import { requirePermission } from "@/middlewares/requirePermission";
import validateRequest from "@/middlewares/validateRequest";
import {
  createDealSchema,
  updateDealSchema,
  updateDealStageSchema,
} from "./deal.validate";

const router = Router();

router.use(auth);
// /pipeline must be declared before /:id
router.get("/pipeline", requirePermission("deals.view"), DealController.pipeline);
router.get("/", requirePermission("deals.view"), DealController.list);
router.post(
  "/",
  requirePermission("deals.create"),
  validateRequest(createDealSchema),
  DealController.create
);
router.get("/:id", requirePermission("deals.view"), DealController.getOne);
router.patch(
  "/:id/stage",
  requirePermission("deals.edit"),
  validateRequest(updateDealStageSchema),
  DealController.updateStage
);
router.patch(
  "/:id",
  requirePermission("deals.edit"),
  validateRequest(updateDealSchema),
  DealController.update
);
router.delete("/:id", requirePermission("deals.delete"), DealController.remove);

export const DealRoutes = router;
