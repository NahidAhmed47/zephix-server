import { Types } from "mongoose";

export interface IReminderRule {
  _id?: string;
  name: string;
  /** Days relative to the invoice due date: negative = before, 0 = on due,
   *  positive = after (spec §21). */
  offset_days: number;
  sms_enabled: boolean;
  email_enabled: boolean;
  sms_template?: Types.ObjectId | string | null;
  email_template?: Types.ObjectId | string | null;
  is_active: boolean;
  created_by?: Types.ObjectId | string;
  is_Deleted: boolean;
  createdAt?: Date;
  updatedAt?: Date;
}
