import { Types } from "mongoose";
import { IMoney } from "@/lib/money";
import { TBillingFrequency } from "@/lib/billing";
import { TRecurringStatus } from "./recurringBilling.enum";
import { TMessagingPref } from "@/modules/client/client.enum";

export interface IRecurringBilling {
  _id?: string;
  client: Types.ObjectId | string;
  contract?: Types.ObjectId | string | null;
  service?: Types.ObjectId | string | null;
  project?: Types.ObjectId | string | null;
  amount: IMoney; // charge per interval
  currency: string;
  frequency: TBillingFrequency;
  custom_months: number; // used when frequency = custom
  start_date: Date;
  end_date?: Date | null;
  next_billing_date: Date; // engine-computed
  previous_billing_date?: Date | null;
  auto_invoice: boolean;
  messaging: { sms: TMessagingPref; email: TMessagingPref };
  mrr_value: IMoney; // engine-computed monthly-normalized value
  status: TRecurringStatus;
  description?: string; // used as the generated invoice line description
  notes?: string;
  created_by?: Types.ObjectId | string;
  is_Deleted: boolean;
  createdAt?: Date;
  updatedAt?: Date;
}
