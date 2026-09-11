import { z } from "zod";
import { EXPENSE_CATEGORY } from "./expense.enum";
import { PAYMENT_METHOD } from "@/modules/payment/payment.enum";

const objectId = z.string().regex(/^[0-9a-fA-F]{24}$/, "Invalid id");
const optionalObjectId = z.union([objectId, z.literal("")]).optional();

const expenseBody = {
  title: z.string().min(1, "Title is required"),
  category: z.nativeEnum(EXPENSE_CATEGORY).optional(),
  amount: z.coerce.number().min(0).optional(),
  currency: z.string().optional(),
  date: z.string().optional(),
  vendor: z.string().optional(),
  method: z.nativeEnum(PAYMENT_METHOD).optional(),
  client: optionalObjectId,
  project: optionalObjectId,
  notes: z.string().optional(),
  attachment: z.string().optional(),
};

export const createExpenseSchema = z.object({
  body: z.object({
    ...expenseBody,
    amount: z.coerce.number().positive("Amount must be greater than zero"),
  }),
});

export const updateExpenseSchema = z.object({
  body: z.object({
    ...expenseBody,
    title: z.string().min(1).optional(),
  }),
});
