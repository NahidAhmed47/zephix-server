import { Schema, model } from "mongoose";
import { IRole } from "./role.interface";
import { schemaOptions } from "@/utils/schemaOptions";

const roleSchema = new Schema<IRole>(
  {
    name: { type: String, required: true, trim: true },
    slug: { type: String, required: true, unique: true, lowercase: true, trim: true },
    description: { type: String, default: "" },
    permissions: { type: [String], default: [] },
    scopes: { type: Schema.Types.Mixed, default: {} },
    is_system: { type: Boolean, default: false },
    is_Deleted: { type: Boolean, default: false },
  },
  schemaOptions
);

roleSchema.index({ is_Deleted: 1 });

export const RoleModel = model<IRole>("Role", roleSchema);
