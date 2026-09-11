import { Router } from "express";
import { NotificationController } from "./notification.controller";
import { auth } from "@/middlewares/auth";
import { requirePermission } from "@/middlewares/requirePermission";

const router = Router();

// Own notifications — gated by notifications.view; the service scopes to the
// authenticated user, so there is no cross-user access.
router.use(auth);
router.get(
  "/",
  requirePermission("notifications.view"),
  NotificationController.list
);
router.get(
  "/unread-count",
  requirePermission("notifications.view"),
  NotificationController.unreadCount
);
router.patch(
  "/:id/read",
  requirePermission("notifications.view"),
  NotificationController.markRead
);
router.post(
  "/read-all",
  requirePermission("notifications.view"),
  NotificationController.markAllRead
);

export const NotificationRoutes = router;
