import { Router } from "express";
import { PaymentController } from "./payment.controller";
import { auth } from "@/middlewares/auth";
import { requirePermission } from "@/middlewares/requirePermission";
import validateRequest from "@/middlewares/validateRequest";
import { createPaymentSchema, updatePaymentSchema } from "./payment.validate";

const router = Router();

router.use(auth);
router.get("/", requirePermission("payments.view"), PaymentController.list);
router.post(
  "/",
  requirePermission("payments.create"),
  validateRequest(createPaymentSchema),
  PaymentController.create
);
router.get("/:id", requirePermission("payments.view"), PaymentController.getOne);
router.get(
  "/:id/pdf",
  requirePermission("payments.view"),
  PaymentController.pdf
);
router.patch(
  "/:id",
  requirePermission("payments.edit"),
  validateRequest(updatePaymentSchema),
  PaymentController.update
);
router.delete(
  "/:id",
  requirePermission("payments.delete"),
  PaymentController.remove
);

export const PaymentRoutes = router;
