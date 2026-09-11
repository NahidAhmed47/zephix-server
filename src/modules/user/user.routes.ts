import { Router } from "express";
import { UserController } from "./user.controller";
import { auth } from "@/middlewares/auth";
import { requirePermission } from "@/middlewares/requirePermission";
import validateRequest from "@/middlewares/validateRequest";
import { createUserSchema, updateUserSchema } from "./user.validate";

const router = Router();

router.use(auth);
router.get("/", requirePermission("users.view"), UserController.list);
router.post(
  "/",
  requirePermission("users.create"),
  validateRequest(createUserSchema),
  UserController.create
);
router.get("/:id", requirePermission("users.view"), UserController.getOne);
router.patch(
  "/:id",
  requirePermission("users.edit"),
  validateRequest(updateUserSchema),
  UserController.update
);
router.delete("/:id", requirePermission("users.delete"), UserController.remove);

export const UserRoutes = router;
