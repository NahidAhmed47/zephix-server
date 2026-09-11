import { Schema, model } from "mongoose";
import { ICommunicationLog } from "./communicationLog.interface";
import { schemaOptions } from "@/utils/schemaOptions";
import {
  COMMUNICATION_TYPE,
  COMMUNICATION_STATUS,
} from "./communicationLog.enum";

const communicationLogSchema = new Schema<ICommunicationLog>(
  {
    client: { type: Schema.Types.ObjectId, ref: "Client", default: null },
    contract: { type: Schema.Types.ObjectId, ref: "Contract", default: null },
    project: { type: Schema.Types.ObjectId, ref: "Project", default: null },
    invoice: { type: Schema.Types.ObjectId, ref: "Invoice", default: null },
    type: { type: String, enum: Object.values(COMMUNICATION_TYPE), required: true },
    recipient: { type: String, default: "" },
    template: {
      type: Schema.Types.ObjectId,
      ref: "MessageTemplate",
      default: null,
    },
    subject: { type: String, default: "" },
    body: { type: String, default: "" },
    status: {
      type: String,
      enum: Object.values(COMMUNICATION_STATUS),
      default: COMMUNICATION_STATUS.PENDING,
    },
    provider_response: { type: String, default: "" },
    error: { type: String, default: "" },
    reminder_key: { type: String, default: "" },
    sent_at: { type: Date, default: () => new Date() },
    created_by: { type: Schema.Types.ObjectId, ref: "User", default: null },
  },
  schemaOptions
);

communicationLogSchema.index({ client: 1 });
communicationLogSchema.index({ invoice: 1 });
communicationLogSchema.index({ type: 1 });
communicationLogSchema.index({ status: 1 });
communicationLogSchema.index({ sent_at: -1 });
communicationLogSchema.index({ reminder_key: 1 });

export const CommunicationLogModel = model<ICommunicationLog>(
  "CommunicationLog",
  communicationLogSchema
);
