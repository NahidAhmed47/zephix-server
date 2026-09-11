import { Schema, model } from "mongoose";
import { INotification } from "./notification.interface";
import { schemaOptions } from "@/utils/schemaOptions";
import { NOTIFICATION_TYPE } from "./notification.enum";

const notificationSchema = new Schema<INotification>(
  {
    user: { type: Schema.Types.ObjectId, ref: "User", required: true },
    type: {
      type: String,
      enum: Object.values(NOTIFICATION_TYPE),
      default: NOTIFICATION_TYPE.SYSTEM,
    },
    title: { type: String, required: true },
    message: { type: String, default: "" },
    link: { type: String, default: "" },
    is_read: { type: Boolean, default: false },
  },
  schemaOptions
);

notificationSchema.index({ user: 1, is_read: 1 });
notificationSchema.index({ user: 1, createdAt: -1 });

export const NotificationModel = model<INotification>(
  "Notification",
  notificationSchema
);
