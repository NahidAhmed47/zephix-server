import { Types } from "mongoose";
import { TClientStatus, TMessagingPref } from "./client.enum";

export interface IClientAddress {
  line1?: string;
  line2?: string;
  city?: string;
  district?: string;
  country?: string;
  zip_code?: string;
}

export interface IClientMessaging {
  sms: TMessagingPref;
  email: TMessagingPref;
}

export interface IClient {
  _id?: string;
  name: string;
  type: string;
  industry?: string;
  email?: string;
  phone?: string;
  website?: string;
  address?: IClientAddress;
  social?: { facebook?: string; linkedin?: string; twitter?: string };
  source?: string;
  account_manager?: Types.ObjectId | string;
  status: TClientStatus;
  messaging: IClientMessaging;
  notes?: string;
  created_by?: Types.ObjectId | string;
  is_Deleted: boolean;
  createdAt?: Date;
  updatedAt?: Date;
}
