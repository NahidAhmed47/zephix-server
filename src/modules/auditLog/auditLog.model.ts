import { Schema, model } from "mongoose";
import { IAuditLog } from "./auditLog.interface";

const auditLogSchema = new Schema<IAuditLog>(
  {
    actor: { type: Schema.Types.ObjectId, ref: "User", default: null },
    actor_name: { type: String, default: "" },
    actor_email: { type: String, default: "" },
    action: { type: String, required: true },
    module: { type: String, required: true },
    resource_id: { type: String, default: null },
    before: { type: Schema.Types.Mixed, default: null },
    after: { type: Schema.Types.Mixed, default: null },
    ip: { type: String, default: "" },
    user_agent: { type: String, default: "" },
  },
  { timestamps: { createdAt: true, updatedAt: false }, versionKey: false }
);

auditLogSchema.index({ actor: 1, createdAt: -1 });
auditLogSchema.index({ module: 1, resource_id: 1 });
auditLogSchema.index({ createdAt: -1 });

export const AuditLogModel = model<IAuditLog>("AuditLog", auditLogSchema);
