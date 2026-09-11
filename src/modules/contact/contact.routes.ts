import { Router } from "express";
import { ContactController } from "./contact.controller";
import { auth } from "@/middlewares/auth";
import { requirePermission } from "@/middlewares/requirePermission";
import validateRequest from "@/middlewares/validateRequest";
import { createContactSchema, updateContactSchema } from "./contact.validate";

const router = Router();

router.use(auth);
router.get("/", requirePermission("contacts.view"), ContactController.list);
router.post(
  "/",
  requirePermission("contacts.create"),
  validateRequest(createContactSchema),
  ContactController.create
);
router.get("/:id", requirePermission("contacts.view"), ContactController.getOne);
router.patch(
  "/:id",
  requirePermission("contacts.edit"),
  validateRequest(updateContactSchema),
  ContactController.update
);
router.delete(
  "/:id",
  requirePermission("contacts.delete"),
  ContactController.remove
);

export const ContactRoutes = router;
