import { Types } from "mongoose";

export const USER_STATUS = {
  ACTIVE: "active",
  INACTIVE: "inactive",
  SUSPENDED: "suspended",
} as const;

export type TUserStatus = (typeof USER_STATUS)[keyof typeof USER_STATUS];

export interface IUser {
  _id?: string;
  name: string;
  email: string;
  phone_number?: string;
  password: string;
  role: Types.ObjectId | string;
  image?: string;
  status: TUserStatus;
  department?: string;
  last_login_at?: Date | null;
  is_Deleted: boolean;
  createdAt?: Date;
  updatedAt?: Date;
}
