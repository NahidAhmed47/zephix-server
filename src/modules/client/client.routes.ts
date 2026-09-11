import { Router } from "express";
import { ClientController } from "./client.controller";
import { auth } from "@/middlewares/auth";
import { requirePermission } from "@/middlewares/requirePermission";
import validateRequest from "@/middlewares/validateRequest";
import { createClientSchema, updateClientSchema } from "./client.validate";

const router = Router();

router.use(auth);
router.get("/", requirePermission("clients.view"), ClientController.list);
router.post(
  "/",
  requirePermission("clients.create"),
  validateRequest(createClientSchema),
  ClientController.create
);
router.get("/:id", requirePermission("clients.view"), ClientController.getOne);
router.get(
  "/:id/summary",
  requirePermission("clients.view"),
  ClientController.summary
);
router.patch(
  "/:id",
  requirePermission("clients.edit"),
  validateRequest(updateClientSchema),
  ClientController.update
);
router.delete("/:id", requirePermission("clients.delete"), ClientController.remove);

export const ClientRoutes = router;
