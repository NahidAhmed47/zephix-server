import { z } from "zod";
import { BILLING_FREQUENCY } from "@/lib/billing";
import { EXPENSE_CATEGORY } from "@/modules/expense/expense.enum";
import { PAYMENT_METHOD } from "@/modules/payment/payment.enum";
import { RECURRING_EXPENSE_STATUS } from "./recurringExpense.enum";

const recurringExpenseBody = {
  title: z.string().min(1, "Title is required"),
  category: z.nativeEnum(EXPENSE_CATEGORY).optional(),
  amount: z.coerce.number().min(0).optional(),
  currency: z.string().optional(),
  frequency: z.nativeEnum(BILLING_FREQUENCY).optional(),
  custom_months: z.coerce.number().min(1).optional(),
  start_date: z.string().optional(),
  end_date: z.string().optional(),
  vendor: z.string().optional(),
  method: z.nativeEnum(PAYMENT_METHOD).optional(),
  status: z.nativeEnum(RECURRING_EXPENSE_STATUS).optional(),
  notes: z.string().optional(),
};

export const createRecurringExpenseSchema = z.object({
  body: z.object({
    ...recurringExpenseBody,
    amount: z.coerce.number().positive("Amount must be greater than zero"),
  }),
});

export const updateRecurringExpenseSchema = z.object({
  body: z.object(recurringExpenseBody),
});
