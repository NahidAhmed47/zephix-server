import { Types } from "mongoose";
import { IMoney } from "@/lib/money";
import { TProjectStatus, TProjectPriority } from "./project.enum";
import { TMessagingPref } from "@/modules/client/client.enum";

export interface IProject {
  _id?: string;
  name: string;
  client: Types.ObjectId | string;
  contract?: Types.ObjectId | string | null;
  services: (Types.ObjectId | string)[]; // catalog services delivered
  project_manager?: Types.ObjectId | string | null;
  team: (Types.ObjectId | string)[];
  start_date?: Date | null;
  deadline?: Date | null;
  status: TProjectStatus;
  priority: TProjectPriority;
  budget: IMoney;
  messaging: { sms: TMessagingPref; email: TMessagingPref };
  notes?: string;
  created_by?: Types.ObjectId | string;
  is_Deleted: boolean;
  createdAt?: Date;
  updatedAt?: Date;
}
