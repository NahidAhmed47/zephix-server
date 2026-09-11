import { Router } from "express";
import { RoleController } from "./role.controller";
import { auth } from "@/middlewares/auth";
import { requirePermission } from "@/middlewares/requirePermission";
import validateRequest from "@/middlewares/validateRequest";
import { createRoleSchema, updateRoleSchema } from "./role.validate";

const router = Router();

router.use(auth);
router.get("/", requirePermission("roles.view"), RoleController.list);
router.post(
  "/",
  requirePermission("roles.create"),
  validateRequest(createRoleSchema),
  RoleController.create
);
router.get("/:id", requirePermission("roles.view"), RoleController.getOne);
router.patch(
  "/:id",
  requirePermission("roles.edit"),
  validateRequest(updateRoleSchema),
  RoleController.update
);
router.delete("/:id", requirePermission("roles.delete"), RoleController.remove);

export const RoleRoutes = router;
