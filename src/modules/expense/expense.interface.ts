import { Types } from "mongoose";
import { IMoney } from "@/lib/money";
import { TExpenseCategory } from "./expense.enum";
import { TPaymentMethod } from "@/modules/payment/payment.enum";

export interface IExpense {
  _id?: string;
  title: string;
  category: TExpenseCategory;
  amount: IMoney;
  currency: string;
  date: Date;
  vendor?: string;
  method: TPaymentMethod;
  client?: Types.ObjectId | string | null;
  project?: Types.ObjectId | string | null;
  notes?: string;
  attachment?: string;
  created_by?: Types.ObjectId | string;
  is_Deleted: boolean;
  createdAt?: Date;
  updatedAt?: Date;
}
