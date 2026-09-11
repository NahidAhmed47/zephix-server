import { Router } from "express";
import { InvoiceController } from "./invoice.controller";
import { auth } from "@/middlewares/auth";
import { requirePermission } from "@/middlewares/requirePermission";
import validateRequest from "@/middlewares/validateRequest";
import { createInvoiceSchema, updateInvoiceSchema } from "./invoice.validate";

const router = Router();

router.use(auth);
// specific routes before "/:id"
router.get(
  "/outstanding",
  requirePermission("invoices.view"),
  InvoiceController.outstanding
);
router.get(
  "/upcoming",
  requirePermission("invoices.view"),
  InvoiceController.upcoming
);
router.get("/", requirePermission("invoices.view"), InvoiceController.list);
router.post(
  "/",
  requirePermission("invoices.create"),
  validateRequest(createInvoiceSchema),
  InvoiceController.create
);
router.get("/:id", requirePermission("invoices.view"), InvoiceController.getOne);
router.post(
  "/:id/send",
  requirePermission("invoices.send"),
  InvoiceController.send
);
router.post(
  "/:id/cancel",
  requirePermission("invoices.cancel"),
  InvoiceController.cancel
);
router.patch(
  "/:id",
  requirePermission("invoices.edit"),
  validateRequest(updateInvoiceSchema),
  InvoiceController.update
);
router.delete(
  "/:id",
  requirePermission("invoices.delete"),
  InvoiceController.remove
);

export const InvoiceRoutes = router;
