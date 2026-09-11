import { Router } from "express";
import {
  ServiceController,
  ServiceCategoryController,
} from "./service.controller";
import { auth } from "@/middlewares/auth";
import { requirePermission } from "@/middlewares/requirePermission";
import validateRequest from "@/middlewares/validateRequest";
import {
  createServiceSchema,
  updateServiceSchema,
  createServiceCategorySchema,
  updateServiceCategorySchema,
} from "./service.validate";

const router = Router();

router.use(auth);

// Categories — declared before "/:id" so they are not shadowed by it.
router.get(
  "/categories",
  requirePermission("services.view"),
  ServiceCategoryController.list
);
router.post(
  "/categories",
  requirePermission("services.create"),
  validateRequest(createServiceCategorySchema),
  ServiceCategoryController.create
);
router.get(
  "/categories/:id",
  requirePermission("services.view"),
  ServiceCategoryController.getOne
);
router.patch(
  "/categories/:id",
  requirePermission("services.edit"),
  validateRequest(updateServiceCategorySchema),
  ServiceCategoryController.update
);
router.delete(
  "/categories/:id",
  requirePermission("services.delete"),
  ServiceCategoryController.remove
);

// Service catalog
router.get("/", requirePermission("services.view"), ServiceController.list);
router.post(
  "/",
  requirePermission("services.create"),
  validateRequest(createServiceSchema),
  ServiceController.create
);
router.get(
  "/:id",
  requirePermission("services.view"),
  ServiceController.getOne
);
router.patch(
  "/:id",
  requirePermission("services.edit"),
  validateRequest(updateServiceSchema),
  ServiceController.update
);
router.delete(
  "/:id",
  requirePermission("services.delete"),
  ServiceController.remove
);

export const ServiceRoutes = router;
