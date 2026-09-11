import { Schema, model } from "mongoose";
import { IRecurringExpense } from "./recurringExpense.interface";
import { schemaOptions } from "@/utils/schemaOptions";
import { moneyField } from "@/utils/moneySchema";
import { DEFAULT_CURRENCY } from "@/lib/money";
import { BILLING_FREQUENCY } from "@/lib/billing";
import { EXPENSE_CATEGORY } from "@/modules/expense/expense.enum";
import { PAYMENT_METHOD } from "@/modules/payment/payment.enum";
import { RECURRING_EXPENSE_STATUS } from "./recurringExpense.enum";

const recurringExpenseSchema = new Schema<IRecurringExpense>(
  {
    title: { type: String, required: true, trim: true },
    category: {
      type: String,
      enum: Object.values(EXPENSE_CATEGORY),
      default: EXPENSE_CATEGORY.OTHER,
    },
    amount: moneyField(),
    currency: { type: String, default: DEFAULT_CURRENCY },
    frequency: {
      type: String,
      enum: Object.values(BILLING_FREQUENCY),
      default: BILLING_FREQUENCY.MONTHLY,
    },
    custom_months: { type: Number, default: 1, min: 1 },
    start_date: { type: Date, default: () => new Date() },
    end_date: { type: Date, default: null },
    next_date: { type: Date, default: () => new Date() },
    vendor: { type: String, default: "" },
    method: {
      type: String,
      enum: Object.values(PAYMENT_METHOD),
      default: PAYMENT_METHOD.BANK,
    },
    monthly_value: moneyField(),
    status: {
      type: String,
      enum: Object.values(RECURRING_EXPENSE_STATUS),
      default: RECURRING_EXPENSE_STATUS.ACTIVE,
    },
    notes: { type: String, default: "" },
    created_by: { type: Schema.Types.ObjectId, ref: "User", default: null },
    is_Deleted: { type: Boolean, default: false },
  },
  schemaOptions
);

recurringExpenseSchema.index({ category: 1 });
recurringExpenseSchema.index({ status: 1 });
recurringExpenseSchema.index({ next_date: 1 });

export const RecurringExpenseModel = model<IRecurringExpense>(
  "RecurringExpense",
  recurringExpenseSchema
);
