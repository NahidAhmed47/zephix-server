import { Types } from "mongoose";
import { TNotificationType } from "./notification.enum";

export interface INotification {
  _id?: string;
  user: Types.ObjectId | string; // recipient
  type: TNotificationType;
  title: string;
  message?: string;
  link?: string;
  is_read: boolean;
  createdAt?: Date;
  updatedAt?: Date;
}
