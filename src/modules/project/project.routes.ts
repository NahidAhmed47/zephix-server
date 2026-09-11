import { Router } from "express";
import { ProjectController } from "./project.controller";
import { auth } from "@/middlewares/auth";
import { requirePermission } from "@/middlewares/requirePermission";
import validateRequest from "@/middlewares/validateRequest";
import { createProjectSchema, updateProjectSchema } from "./project.validate";

const router = Router();

router.use(auth);
router.get("/", requirePermission("projects.view"), ProjectController.list);
router.post(
  "/",
  requirePermission("projects.create"),
  validateRequest(createProjectSchema),
  ProjectController.create
);
router.get("/:id", requirePermission("projects.view"), ProjectController.getOne);
router.get(
  "/:id/summary",
  requirePermission("projects.view"),
  ProjectController.summary
);
router.patch(
  "/:id",
  requirePermission("projects.edit"),
  validateRequest(updateProjectSchema),
  ProjectController.update
);
router.delete(
  "/:id",
  requirePermission("projects.delete"),
  ProjectController.remove
);

export const ProjectRoutes = router;
