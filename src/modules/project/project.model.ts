import { Schema, model } from "mongoose";
import { IProject } from "./project.interface";
import { schemaOptions } from "@/utils/schemaOptions";
import { moneyField } from "@/utils/moneySchema";
import { PROJECT_STATUS, PROJECT_PRIORITY } from "./project.enum";
import { MESSAGING_PREF } from "@/modules/client/client.enum";

const messagingField = () => ({
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
});

const projectSchema = new Schema<IProject>(
  {
    name: { type: String, required: true, trim: true },
    client: { type: Schema.Types.ObjectId, ref: "Client", required: true },
    contract: { type: Schema.Types.ObjectId, ref: "Contract", default: null },
    services: [{ type: Schema.Types.ObjectId, ref: "Service" }],
    project_manager: {
      type: Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },
    team: [{ type: Schema.Types.ObjectId, ref: "User" }],
    start_date: { type: Date, default: null },
    deadline: { type: Date, default: null },
    status: {
      type: String,
      enum: Object.values(PROJECT_STATUS),
      default: PROJECT_STATUS.PLANNING,
    },
    priority: {
      type: String,
      enum: Object.values(PROJECT_PRIORITY),
      default: PROJECT_PRIORITY.MEDIUM,
    },
    budget: moneyField(),
    messaging: messagingField(),
    notes: { type: String, default: "" },
    created_by: { type: Schema.Types.ObjectId, ref: "User", default: null },
    is_Deleted: { type: Boolean, default: false },
  },
  schemaOptions
);

projectSchema.index({ client: 1 });
projectSchema.index({ contract: 1 });
projectSchema.index({ status: 1 });
projectSchema.index({ deadline: 1 });
projectSchema.index({ project_manager: 1 });
projectSchema.index({ created_by: 1 });

export const ProjectModel = model<IProject>("Project", projectSchema);
