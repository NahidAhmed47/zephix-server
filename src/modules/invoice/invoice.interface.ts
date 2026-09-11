import { Types } from "mongoose";
import { IMoney } from "@/lib/money";
import { TInvoiceStatus } from "./invoice.enum";

export interface IInvoiceLine {
  description: string;
  quantity: number;
  unit_price: IMoney;
  amount: IMoney; // server-computed = unit_price × quantity
  service?: Types.ObjectId | string | null;
}

export interface IInvoice {
  _id?: string;
  invoice_number: string; // unique, auto (e.g. INV-2026-0001)
  client: Types.ObjectId | string;
  contract?: Types.ObjectId | string | null;
  project?: Types.ObjectId | string | null;
  recurring_schedule?: Types.ObjectId | string | null;
  lines: IInvoiceLine[];
  issue_date: Date;
  due_date: Date;
  billing_period_start?: Date | null;
  billing_period_end?: Date | null;
  currency: string;
  subtotal: IMoney; // server-computed sum of line amounts
  discount: IMoney;
  tax: IMoney;
  total: IMoney; // subtotal − discount + tax
  amount_paid: IMoney; // sum of payments
  amount_due: IMoney; // total − amount_paid
  status: TInvoiceStatus;
  notes?: string;
  created_by?: Types.ObjectId | string;
  is_Deleted: boolean;
  createdAt?: Date;
  updatedAt?: Date;
}
