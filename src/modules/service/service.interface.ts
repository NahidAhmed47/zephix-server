import { Types } from "mongoose";
import { IMoney } from "@/lib/money";
import { TPricingModel } from "./service.enum";

export interface IServiceCategory {
  _id?: string;
  name: string;
  description?: string;
  is_active: boolean;
  created_by?: Types.ObjectId | string;
  is_Deleted: boolean;
  createdAt?: Date;
  updatedAt?: Date;
}

export interface IService {
  _id?: string;
  name: string;
  code?: string; // short SKU / reference code
  description?: string;
  category?: Types.ObjectId | string | null;
  price: IMoney; // default/base price — deals, contracts & invoices reference this
  pricing_model: TPricingModel;
  estimated_duration_days: number; // 0 = not applicable
  cost: IMoney; // internal cost estimate — basis for profitability (spec §34)
  unit?: string; // display label, e.g. "per project" / "per hour" / "per month"
  tax_rate: number; // percent 0–100, applied by invoices in later phases
  is_active: boolean;
  notes?: string;
  created_by?: Types.ObjectId | string;
  is_Deleted: boolean;
  createdAt?: Date;
  updatedAt?: Date;
}
