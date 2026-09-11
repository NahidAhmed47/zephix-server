import { Schema, model } from "mongoose";
import { IHostingRecord } from "./hosting.interface";
import { schemaOptions } from "@/utils/schemaOptions";
import { RECORD_TYPE, HOSTING_TYPE, HOSTING_STATUS } from "./hosting.enum";

const hostingSchema = new Schema<IHostingRecord>(
  {
    name: { type: String, required: true, trim: true },
    type: {
      type: String,
      enum: Object.values(RECORD_TYPE),
      default: RECORD_TYPE.DOMAIN,
    },
    client: { type: Schema.Types.ObjectId, ref: "Client", required: true },
    project: { type: Schema.Types.ObjectId, ref: "Project", default: null },
    registrar: { type: String, default: "" },
    domain_expiry: { type: Date, default: null },
    auto_renew: { type: Boolean, default: false },
    nameservers: { type: String, default: "" },
    provider: { type: String, default: "" },
    hosting_type: {
      type: String,
      enum: Object.values(HOSTING_TYPE),
      default: HOSTING_TYPE.OTHER,
    },
    server_location: { type: String, default: "" },
    server_ip: { type: String, default: "" },
    control_panel_url: { type: String, default: "" },
    hosting_expiry: { type: Date, default: null },
    ssl_expiry: { type: Date, default: null },
    status: {
      type: String,
      enum: Object.values(HOSTING_STATUS),
      default: HOSTING_STATUS.ACTIVE,
    },
    credentials: { type: String, default: "" }, // encrypted at rest
    notes: { type: String, default: "" },
    created_by: { type: Schema.Types.ObjectId, ref: "User", default: null },
    is_Deleted: { type: Boolean, default: false },
  },
  schemaOptions
);

hostingSchema.index({ client: 1 });
hostingSchema.index({ project: 1 });
hostingSchema.index({ status: 1 });
hostingSchema.index({ domain_expiry: 1 });
hostingSchema.index({ hosting_expiry: 1 });
hostingSchema.index({ ssl_expiry: 1 });

export const HostingModel = model<IHostingRecord>("HostingRecord", hostingSchema);
