import { Schema, model } from "mongoose";
import { IUser, USER_STATUS } from "./user.interface";
import { schemaOptions } from "@/utils/schemaOptions";

const userSchema = new Schema<IUser>(
  {
    name: { type: String, required: true, trim: true },
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
    },
    phone_number: { type: String, default: "" },
    // never returned by default; auth explicitly selects it
    password: { type: String, required: true, select: false },
    role: { type: Schema.Types.ObjectId, ref: "Role", required: true },
    image: { type: String, default: "" },
    status: {
      type: String,
      enum: Object.values(USER_STATUS),
      default: USER_STATUS.ACTIVE,
    },
    department: { type: String, default: "" },
    last_login_at: { type: Date, default: null },
    is_Deleted: { type: Boolean, default: false },
  },
  schemaOptions
);

userSchema.index({ role: 1 });
userSchema.index({ status: 1 });
userSchema.index({ is_Deleted: 1 });

export const UserModel = model<IUser>("User", userSchema);
