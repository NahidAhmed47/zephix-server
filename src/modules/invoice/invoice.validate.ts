import { z } from "zod";
import { INVOICE_STATUS } from "./invoice.enum";

const objectId = z.string().regex(/^[0-9a-fA-F]{24}$/, "Invalid id");
const optionalObjectId = z.union([objectId, z.literal("")]).optional();

const line = z.object({
  description: z.string().min(1, "Line description is required"),
  quantity: z.coerce.number().min(0).optional(),
  unit_price: z.coerce.number().min(0).optional(),
  service: optionalObjectId,
});

const invoiceBody = {
  contract: optionalObjectId,
  project: optionalObjectId,
  recurring_schedule: optionalObjectId,
  lines: z.array(line).optional(),
  issue_date: z.string().optional(),
  due_date: z.string().optional(),
  billing_period_start: z.string().optional(),
  billing_period_end: z.string().optional(),
  currency: z.string().optional(),
  discount: z.coerce.number().min(0).optional(),
  tax: z.coerce.number().min(0).optional(),
  status: z.nativeEnum(INVOICE_STATUS).optional(),
  notes: z.string().optional(),
};

export const createInvoiceSchema = z.object({
  body: z.object({
    ...invoiceBody,
    client: objectId,
    lines: z.array(line).min(1, "At least one line item is required"),
  }),
});

export const updateInvoiceSchema = z.object({
  body: z.object(invoiceBody),
});
