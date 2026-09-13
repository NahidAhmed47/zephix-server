import { Types } from "mongoose";
import { TDealStage } from "./deal.enum";

export interface IEmbeddedMoney {
  amount: Types.Decimal128;
  currency: string;
}

export interface IDeal {
  _id?: string;
  name: string;
  client?: Types.ObjectId | string | null;
  lead_name?: string; // for raw leads not yet linked to a client
  service?: Types.ObjectId | string | null; // Service catalog (Phase 3)
  expected_value: IEmbeddedMoney;
  probability: number; // 0–100
  weighted_value: IEmbeddedMoney; // server-computed = expected × probability
  expected_close_date?: Date | null;
  stage: TDealStage;
  owner?: Types.ObjectId | string;
  converted_contract?: Types.ObjectId | string | null; // set on deal→contract conversion
  notes?: string;
  created_by?: Types.ObjectId | string;
  is_Deleted: boolean;
  createdAt?: Date;
  updatedAt?: Date;
}
