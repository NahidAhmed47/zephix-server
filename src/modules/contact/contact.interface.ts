import { Types } from "mongoose";

export interface IContact {
  _id?: string;
  client: Types.ObjectId | string;
  name: string;
  designation?: string;
  email?: string;
  phone?: string;
  whatsapp?: string;
  is_primary: boolean;
  is_billing: boolean;
  is_project: boolean;
  status: "active" | "inactive";
  notes?: string;
  is_Deleted: boolean;
  createdAt?: Date;
  updatedAt?: Date;
}
