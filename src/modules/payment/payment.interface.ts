import { Types } from "mongoose";
import { IMoney } from "@/lib/money";
import { TPaymentMethod } from "./payment.enum";

export interface IPayment {
  _id?: string;
  payment_number: string; // unique, auto (e.g. PAY-2026-0001)
  invoice: Types.ObjectId | string;
  client: Types.ObjectId | string; // snapshot from the invoice
  contract?: Types.ObjectId | string | null;
  project?: Types.ObjectId | string | null;
  amount: IMoney;
  payment_date: Date;
  method: TPaymentMethod;
  transaction_id?: string;
  reference?: string;
  received_by?: Types.ObjectId | string;
  notes?: string;
  attachment?: string;
  created_by?: Types.ObjectId | string;
  is_Deleted: boolean;
  createdAt?: Date;
  updatedAt?: Date;
}
