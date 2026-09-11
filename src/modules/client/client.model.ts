import { Schema, model } from "mongoose";
import { IClient } from "./client.interface";
import { schemaOptions } from "@/utils/schemaOptions";
import {
  CLIENT_STATUS,
  CLIENT_TYPE,
  CLIENT_SOURCE,
  MESSAGING_PREF,
} from "./client.enum";

const clientSchema = new Schema<IClient>(
  {
    name: { type: String, required: true, trim: true },
    type: {
      type: String,
      enum: Object.values(CLIENT_TYPE),
      default: CLIENT_TYPE.COMPANY,
    },
    industry: { type: String, default: "" },
    email: { type: String, default: "" },
    phone: { type: String, default: "" },
    website: { type: String, default: "" },
    address: {
      line1: { type: String, default: "" },
      line2: { type: String, default: "" },
      city: { type: String, default: "" },
      district: { type: String, default: "" },
      country: { type: String, default: "" },
      zip_code: { type: String, default: "" },
    },
    social: {
      facebook: { type: String, default: "" },
      linkedin: { type: String, default: "" },
      twitter: { type: String, default: "" },
    },
    source: { type: String, enum: Object.values(CLIENT_SOURCE), default: CLIENT_SOURCE.OTHER },
    account_manager: { type: Schema.Types.ObjectId, ref: "User", default: null },
    status: {
      type: String,
      enum: Object.values(CLIENT_STATUS),
      default: CLIENT_STATUS.LEAD,
    },
    messaging: {
      sms: {
        type: String,
        enum: Object.values(MESSAGING_PREF),
        default: MESSAGING_PREF.INHERIT,
      },
      email: {
        type: String,
        enum: Object.values(MESSAGING_PREF),
        default: MESSAGING_PREF.INHERIT,
      },
    },
    notes: { type: String, default: "" },
    created_by: { type: Schema.Types.ObjectId, ref: "User", default: null },
    is_Deleted: { type: Boolean, default: false },
  },
  schemaOptions
);

clientSchema.index({ status: 1 });
clientSchema.index({ account_manager: 1 });
clientSchema.index({ created_by: 1 });
clientSchema.index({ name: 1 });
clientSchema.index({ createdAt: -1 });

export const ClientModel = model<IClient>("Client", clientSchema);
