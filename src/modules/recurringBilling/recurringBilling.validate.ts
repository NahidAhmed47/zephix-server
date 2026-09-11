import { z } from "zod";
import { BILLING_FREQUENCY } from "@/lib/billing";
import { RECURRING_STATUS } from "./recurringBilling.enum";
import { MESSAGING_PREF } from "@/modules/client/client.enum";

const objectId = z.string().regex(/^[0-9a-fA-F]{24}$/, "Invalid id");
const optionalObjectId = z.union([objectId, z.literal("")]).optional();

const messaging = z
  .object({
    sms: z.nativeEnum(MESSAGING_PREF).optional(),
    email: z.nativeEnum(MESSAGING_PREF).optional(),
  })
  .optional();

const recurringBody = {
  contract: optionalObjectId,
  service: optionalObjectId,
  project: optionalObjectId,
  amount: z.coerce.number().min(0).optional(),
  currency: z.string().optional(),
  frequency: z.nativeEnum(BILLING_FREQUENCY).optional(),
  custom_months: z.coerce.number().min(1).optional(),
  start_date: z.string().optional(),
  end_date: z.string().optional(),
  auto_invoice: z.boolean().optional(),
  messaging,
  status: z.nativeEnum(RECURRING_STATUS).optional(),
  description: z.string().optional(),
  notes: z.string().optional(),
};

export const createRecurringBillingSchema = z.object({
  body: z.object({
    ...recurringBody,
    client: objectId,
    amount: z.coerce.number().positive("Amount must be greater than zero"),
  }),
});

export const updateRecurringBillingSchema = z.object({
  body: z.object(recurringBody),
});
