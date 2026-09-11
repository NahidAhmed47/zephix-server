import {
  PERMISSION_KEYS,
  WILDCARD_PERMISSION,
} from "@/constants/permissions";

export type TScope = "all" | "own" | "assigned" | "team";

export interface IAuthUser {
  id: string;
  name?: string;
  email: string;
  role: string; // role slug
  permissions: string[]; // may contain WILDCARD_PERMISSION ("*")
  scopes?: Record<string, TScope>;
}

/** Super Admin holds the wildcard permission and bypasses all checks. */
export const isSuperUser = (permissions: string[]): boolean =>
  permissions.includes(WILDCARD_PERMISSION);

/** True if the user holds ANY of the given permission key(s). */
export const can = (permissions: string[], key: string | string[]): boolean => {
  if (isSuperUser(permissions)) return true;
  const keys = Array.isArray(key) ? key : [key];
  return keys.some((k) => permissions.includes(k));
};

/** True if the user holds ALL of the given permission keys. */
export const canAll = (permissions: string[], keys: string[]): boolean => {
  if (isSuperUser(permissions)) return true;
  return keys.every((k) => permissions.includes(k));
};

/**
 * Resolve the effective data scope for a module. Defaults to "all" when the
 * role does not narrow it (MVP). Modules apply this to their queries so
 * scoping can be tightened later without touching call sites.
 */
export const getScope = (user: IAuthUser, module: string): TScope => {
  if (isSuperUser(user.permissions)) return "all";
  return user.scopes?.[module] ?? "all";
};

/** Expand the wildcard into concrete keys (used for /auth/me responses). */
export const expandPermissions = (permissions: string[]): string[] =>
  permissions.includes(WILDCARD_PERMISSION)
    ? [...PERMISSION_KEYS]
    : permissions;
