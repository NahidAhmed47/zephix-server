import { Types } from "mongoose";
import { TRecordType, THostingType, THostingStatus } from "./hosting.enum";

export interface IHostingRecord {
  _id?: string;
  name: string; // hostname, e.g. abcltd.com or app.abcltd.com
  type: TRecordType;
  client: Types.ObjectId | string;
  project?: Types.ObjectId | string | null;
  // domain / registrar side
  registrar?: string;
  domain_expiry?: Date | null;
  auto_renew: boolean;
  nameservers?: string;
  // hosting / server side
  provider?: string;
  hosting_type: THostingType;
  server_location?: string;
  server_ip?: string;
  control_panel_url?: string;
  hosting_expiry?: Date | null;
  ssl_expiry?: Date | null;
  status: THostingStatus;
  credentials?: string; // encrypted at rest; never returned in plaintext
  notes?: string;
  created_by?: Types.ObjectId | string;
  is_Deleted: boolean;
  createdAt?: Date;
  updatedAt?: Date;
}
