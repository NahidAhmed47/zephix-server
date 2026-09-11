import { Types } from "mongoose";
import {
  TCommunicationType,
  TCommunicationStatus,
} from "./communicationLog.enum";

export interface ICommunicationLog {
  _id?: string;
  client?: Types.ObjectId | string | null;
  contract?: Types.ObjectId | string | null;
  project?: Types.ObjectId | string | null;
  invoice?: Types.ObjectId | string | null;
  type: TCommunicationType;
  recipient: string; // phone or email
  template?: Types.ObjectId | string | null;
  subject?: string;
  body?: string;
  status: TCommunicationStatus;
  provider_response?: string;
  error?: string;
  reminder_key?: string; // idempotency key for automated reminders (spec §27)
  sent_at?: Date;
  created_by?: Types.ObjectId | string | null;
  createdAt?: Date;
  updatedAt?: Date;
}
