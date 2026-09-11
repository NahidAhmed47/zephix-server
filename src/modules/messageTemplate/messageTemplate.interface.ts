import { Types } from "mongoose";
import { TCommunicationType } from "@/modules/communicationLog/communicationLog.enum";

export interface IMessageTemplate {
  _id?: string;
  name: string;
  type: TCommunicationType; // sms | email
  subject?: string; // email only
  body: string;
  variables: string[]; // server-extracted from subject + body
  is_active: boolean;
  created_by?: Types.ObjectId | string;
  is_Deleted: boolean;
  createdAt?: Date;
  updatedAt?: Date;
}
