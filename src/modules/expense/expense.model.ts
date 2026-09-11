import { Schema, model } from "mongoose";
import { IExpense } from "./expense.interface";
import { schemaOptions } from "@/utils/schemaOptions";
import { moneyField } from "@/utils/moneySchema";
import { DEFAULT_CURRENCY } from "@/lib/money";
import { EXPENSE_CATEGORY } from "./expense.enum";
import { PAYMENT_METHOD } from "@/modules/payment/payment.enum";

const expenseSchema = new Schema<IExpense>(
  {
    title: { type: String, required: true, trim: true },
    category: {
      type: String,
      enum: Object.values(EXPENSE_CATEGORY),
      default: EXPENSE_CATEGORY.OTHER,
    },
    amount: moneyField(),
    currency: { type: String, default: DEFAULT_CURRENCY },
    date: { type: Date, default: () => new Date() },
    vendor: { type: String, default: "" },
    method: {
      type: String,
      enum: Object.values(PAYMENT_METHOD),
      default: PAYMENT_METHOD.BANK,
    },
    client: { type: Schema.Types.ObjectId, ref: "Client", default: null },
    project: { type: Schema.Types.ObjectId, ref: "Project", default: null },
    notes: { type: String, default: "" },
    attachment: { type: String, default: "" },
    created_by: { type: Schema.Types.ObjectId, ref: "User", default: null },
    is_Deleted: { type: Boolean, default: false },
  },
  schemaOptions
);

expenseSchema.index({ category: 1 });
expenseSchema.index({ date: -1 });
expenseSchema.index({ client: 1 });
expenseSchema.index({ project: 1 });
expenseSchema.index({ created_by: 1 });

export const ExpenseModel = model<IExpense>("Expense", expenseSchema);
