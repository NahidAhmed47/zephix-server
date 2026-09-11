import { z } from "zod";
import { PAYMENT_METHOD } from "./payment.enum";

const objectId = z.string().regex(/^[0-9a-fA-F]{24}$/, "Invalid id");
const optionalObjectId = z.union([objectId, z.literal("")]).optional();

export const createPaymentSchema = z.object({
  body: z.object({
    invoice: objectId,
    amount: z.coerce.number().positive("Amount must be greater than zero"),
    currency: z.string().optional(),
    payment_date: z.string().optional(),
    method: z.nativeEnum(PAYMENT_METHOD).optional(),
    transaction_id: z.string().optional(),
    reference: z.string().optional(),
    received_by: optionalObjectId,
    notes: z.string().optional(),
    attachment: z.string().optional(),
  }),
});

export const updatePaymentSchema = z.object({
  body: z.object({
    amount: z.coerce.number().positive().optional(),
    payment_date: z.string().optional(),
    method: z.nativeEnum(PAYMENT_METHOD).optional(),
    transaction_id: z.string().optional(),
    reference: z.string().optional(),
    received_by: optionalObjectId,
    notes: z.string().optional(),
    attachment: z.string().optional(),
  }),
});
