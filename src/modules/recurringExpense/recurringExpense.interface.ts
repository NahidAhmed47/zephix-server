import { Types } from "mongoose";
import { IMoney } from "@/lib/money";
import { TBillingFrequency } from "@/lib/billing";
import { TExpenseCategory } from "@/modules/expense/expense.enum";
import { TPaymentMethod } from "@/modules/payment/payment.enum";
import { TRecurringExpenseStatus } from "./recurringExpense.enum";

export interface IRecurringExpense {
  _id?: string;
  title: string;
  category: TExpenseCategory;
  amount: IMoney;
  currency: string;
  frequency: TBillingFrequency;
  custom_months: number;
  start_date: Date;
  end_date?: Date | null;
  next_date: Date;
  vendor?: string;
  method: TPaymentMethod;
  monthly_value: IMoney; // engine-computed monthly-normalized cost
  status: TRecurringExpenseStatus;
  notes?: string;
  created_by?: Types.ObjectId | string;
  is_Deleted: boolean;
  createdAt?: Date;
  updatedAt?: Date;
}
