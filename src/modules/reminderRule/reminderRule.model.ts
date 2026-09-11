import { Schema, model } from "mongoose";
import { IReminderRule } from "./reminderRule.interface";
import { schemaOptions } from "@/utils/schemaOptions";

const reminderRuleSchema = new Schema<IReminderRule>(
  {
    name: { type: String, required: true, trim: true },
    offset_days: { type: Number, default: 0 },
    sms_enabled: { type: Boolean, default: false },
    email_enabled: { type: Boolean, default: true },
    sms_template: {
      type: Schema.Types.ObjectId,
      ref: "MessageTemplate",
      default: null,
    },
    email_template: {
      type: Schema.Types.ObjectId,
      ref: "MessageTemplate",
      default: null,
    },
    is_active: { type: Boolean, default: true },
    created_by: { type: Schema.Types.ObjectId, ref: "User", default: null },
    is_Deleted: { type: Boolean, default: false },
  },
  schemaOptions
);

reminderRuleSchema.index({ is_active: 1 });
reminderRuleSchema.index({ offset_days: 1 });

export const ReminderRuleModel = model<IReminderRule>(
  "ReminderRule",
  reminderRuleSchema
);
