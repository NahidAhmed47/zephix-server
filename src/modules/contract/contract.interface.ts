import { Types } from "mongoose";
import { IMoney } from "@/lib/money";
import { TContractStatus } from "./contract.enum";
import { TMessagingPref } from "@/modules/client/client.enum";
import { TPricingModel } from "@/modules/service/service.enum";

export interface IMessagingPrefs {
  sms: TMessagingPref;
  email: TMessagingPref;
}

/**
 * A single service line on a contract (collection `contract_services`). Kept as
 * its own collection — not embedded — so projects, billing schedules and
 * invoices can each reference an individual line (spec §52, §70).
 */
export interface IContractService {
  _id?: string;
  contract: Types.ObjectId | string;
  service?: Types.ObjectId | string | null; // catalog reference (nullable for ad-hoc)
  name: string; // snapshot label
  description?: string;
  pricing_model: TPricingModel;
  price: IMoney; // unit price
  quantity: number;
  line_total: IMoney; // server-computed = price × quantity
  start_date?: Date | null;
  end_date?: Date | null;
  messaging: IMessagingPrefs; // service-level override
  is_Deleted: boolean;
  createdAt?: Date;
  updatedAt?: Date;
}

export interface IContract {
  _id?: string;
  contract_number: string; // unique, auto-generated (ZPX-YYYY-####)
  client: Types.ObjectId | string;
  name: string;
  status: TContractStatus;
  start_date?: Date | null;
  end_date?: Date | null;
  renewal_date?: Date | null;
  currency: string;
  total_value: IMoney; // server-computed sum of line totals
  mrr_value: IMoney; // server-computed monthly-normalized recurring value
  payment_terms_days: number;
  account_manager?: Types.ObjectId | string | null;
  messaging: IMessagingPrefs; // contract-level override
  notes?: string;
  created_by?: Types.ObjectId | string;
  is_Deleted: boolean;
  createdAt?: Date;
  updatedAt?: Date;
}
