import { Router } from "express";
import { ContractController } from "./contract.controller";
import { auth } from "@/middlewares/auth";
import { requirePermission } from "@/middlewares/requirePermission";
import validateRequest from "@/middlewares/validateRequest";
import {
  createContractSchema,
  updateContractSchema,
  renewContractSchema,
} from "./contract.validate";

const router = Router();

router.use(auth);
// /expiring must be declared before /:id
router.get(
  "/expiring",
  requirePermission("contracts.view"),
  ContractController.expiring
);
router.get("/", requirePermission("contracts.view"), ContractController.list);
router.post(
  "/",
  requirePermission("contracts.create"),
  validateRequest(createContractSchema),
  ContractController.create
);
router.get(
  "/:id",
  requirePermission("contracts.view"),
  ContractController.getOne
);
router.post(
  "/:id/renew",
  requirePermission("contracts.renew"),
  validateRequest(renewContractSchema),
  ContractController.renew
);
router.patch(
  "/:id",
  requirePermission("contracts.edit"),
  validateRequest(updateContractSchema),
  ContractController.update
);
router.delete(
  "/:id",
  requirePermission("contracts.delete"),
  ContractController.remove
);

export const ContractRoutes = router;
