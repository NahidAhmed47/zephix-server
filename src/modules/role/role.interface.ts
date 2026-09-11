import { TScope } from "@/lib/rbac";

export interface IRole {
  _id?: string;
  name: string;
  slug: string;
  description?: string;
  permissions: string[]; // dotted keys, or ["*"] for Super Admin
  scopes?: Record<string, TScope>; // module → scope (defaults to "all")
  is_system: boolean; // protected built-in roles cannot be deleted/renamed
  is_Deleted: boolean;
  createdAt?: Date;
  updatedAt?: Date;
}
