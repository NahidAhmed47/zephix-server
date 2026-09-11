import { Schema, model } from "mongoose";
import { IMessageTemplate } from "./messageTemplate.interface";
import { schemaOptions } from "@/utils/schemaOptions";
import { COMMUNICATION_TYPE } from "@/modules/communicationLog/communicationLog.enum";

const messageTemplateSchema = new Schema<IMessageTemplate>(
  {
    name: { type: String, required: true, trim: true },
    type: {
      type: String,
      enum: Object.values(COMMUNICATION_TYPE),
      default: COMMUNICATION_TYPE.SMS,
    },
    subject: { type: String, default: "" },
    body: { type: String, required: true },
    variables: { type: [String], default: [] },
    is_active: { type: Boolean, default: true },
    created_by: { type: Schema.Types.ObjectId, ref: "User", default: null },
    is_Deleted: { type: Boolean, default: false },
  },
  schemaOptions
);

messageTemplateSchema.index({ type: 1 });
messageTemplateSchema.index({ is_active: 1 });
messageTemplateSchema.index({ name: 1 });

export const MessageTemplateModel = model<IMessageTemplate>(
  "MessageTemplate",
  messageTemplateSchema
);
