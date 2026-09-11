import { getScope, IAuthUser } from "@/lib/rbac";

export interface ScopeConfig {
  own?: string; // field holding the creator id (e.g. "created_by")
  assigned?: string | string[]; // field(s) holding assignee id(s)
}

/**
 * Builds a Mongo filter fragment that narrows a query to the caller's data
 * scope for a module. Returns `{}` for "all" (Super Admin, Management, etc.).
 * Merge the result into your query conditions (AND semantics).
 */
export const scopeFilter = (
  user: IAuthUser,
  moduleName: string,
  config: ScopeConfig
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
): Record<string, any> => {
  const scope = getScope(user, moduleName);

  if (scope === "all") return {};

  if (scope === "own" && config.own) {
    return { [config.own]: user.id };
  }

  if (scope === "assigned" && config.assigned) {
    const fields = Array.isArray(config.assigned)
      ? config.assigned
      : [config.assigned];
    return fields.length === 1
      ? { [fields[0]]: user.id }
      : { $or: fields.map((f) => ({ [f]: user.id })) };
  }

  if (scope === "team") {
    // Department scoping is not modeled yet → fall back to "own" where possible.
    return config.own ? { [config.own]: user.id } : {};
  }

  return {};
};
