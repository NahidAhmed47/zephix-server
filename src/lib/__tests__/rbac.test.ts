import { describe, it, expect } from "vitest";
import {
  can,
  canAll,
  getScope,
  isSuperUser,
  expandPermissions,
  IAuthUser,
} from "@/lib/rbac";
import { PERMISSION_KEYS } from "@/constants/permissions";

const user = (permissions: string[], scopes = {}): IAuthUser => ({
  id: "1",
  email: "x@y.z",
  role: "r",
  permissions,
  scopes,
});

describe("rbac", () => {
  it("can() checks membership", () => {
    expect(can(["clients.view"], "clients.view")).toBe(true);
    expect(can(["clients.view"], "clients.delete")).toBe(false);
  });

  it("wildcard grants everything", () => {
    expect(can(["*"], "payments.refund")).toBe(true);
    expect(isSuperUser(["*"])).toBe(true);
    expect(isSuperUser(["clients.view"])).toBe(false);
  });

  it("can() has OR semantics for arrays", () => {
    expect(can(["a.view"], ["a.edit", "a.view"])).toBe(true);
    expect(can(["a.view"], ["a.edit", "a.delete"])).toBe(false);
  });

  it("canAll() requires every key", () => {
    expect(canAll(["a.view", "a.edit"], ["a.view", "a.edit"])).toBe(true);
    expect(canAll(["a.view"], ["a.view", "a.edit"])).toBe(false);
    expect(canAll(["*"], ["x.y", "z.w"])).toBe(true);
  });

  it("getScope() defaults to all, respects role scopes, super=all", () => {
    expect(getScope(user([], { clients: "assigned" }), "clients")).toBe("assigned");
    expect(getScope(user([]), "clients")).toBe("all");
    expect(getScope(user(["*"], { clients: "assigned" }), "clients")).toBe("all");
  });

  it("expandPermissions() expands the wildcard", () => {
    expect(expandPermissions(["*"]).length).toBe(PERMISSION_KEYS.length);
    expect(expandPermissions(["clients.view"])).toEqual(["clients.view"]);
  });
});
