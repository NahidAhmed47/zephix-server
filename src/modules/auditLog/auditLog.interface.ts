import { Types } from "mongoose";

export interface IAuditLog {
  _id?: string;
  actor?: Types.ObjectId | string | null;
  actor_name?: string;
  actor_email?: string;
  action: string; // e.g. "login", "user.create", "payment.update"
  module: string; // e.g. "auth", "users", "payments"
  resource_id?: string | null;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  before?: any;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  after?: any;
  ip?: string;
  user_agent?: string;
  createdAt?: Date;
}
