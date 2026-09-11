import { Router } from "express";
import { MessageTemplateController } from "./messageTemplate.controller";
import { auth } from "@/middlewares/auth";
import { requirePermission } from "@/middlewares/requirePermission";
import validateRequest from "@/middlewares/validateRequest";
import {
  createMessageTemplateSchema,
  updateMessageTemplateSchema,
} from "./messageTemplate.validate";

const router = Router();

router.use(auth);
router.get(
  "/",
  requirePermission("communication.view"),
  MessageTemplateController.list
);
router.post(
  "/",
  requirePermission("communication.manage_templates"),
  validateRequest(createMessageTemplateSchema),
  MessageTemplateController.create
);
router.get(
  "/:id",
  requirePermission("communication.view"),
  MessageTemplateController.getOne
);
router.patch(
  "/:id",
  requirePermission("communication.manage_templates"),
  validateRequest(updateMessageTemplateSchema),
  MessageTemplateController.update
);
router.delete(
  "/:id",
  requirePermission("communication.manage_templates"),
  MessageTemplateController.remove
);

export const MessageTemplateRoutes = router;
