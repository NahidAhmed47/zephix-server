import { Types } from "mongoose";

/**
 * Payload embedded inside JWT access/refresh tokens.
 * `role` is a dynamic role slug (roles live in the `roles` collection), not a
 * hardcoded enum — see the RBAC design.
 */
export type IJWtPayload = {
  id: string | Types.ObjectId;
  email: string;
  role: string;
  name?: string;
};

export type ILoginCredentials = {
  email: string;
  password: string;
};

export type IChangePassword = {
  old_password: string;
  new_password: string;
};

export type IResetPassword = {
  email: string;
  password: string;
};

export type IAddress = {
  line1?: string;
  line2?: string;
  city?: string;
  district?: string;
  country?: string;
  zip_code?: string;
};
