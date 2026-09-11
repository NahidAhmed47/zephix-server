import { describe, it, expect } from "vitest";
import {
  PERMISSION_KEYS,
  SENSITIVE_PERMISSION_KEYS,
  WILDCARD_PERMISSION,
  isValidPermissionKey,
} from "@/constants/permissions";

describe("permission catalog", () => {
  it("keys are unique and well-formed module.action", () => {
    const set = new Set(PERMISSION_KEYS);
    expect(set.size).toBe(PERMISSION_KEYS.length);
    for (const key of PERMISSION_KEYS) {
      expect(key).toMatch(/^[a-z_]+\.[a-z_]+$/);
    }
  });

  it("validates known keys and the wildcard, rejects unknown", () => {
    expect(isValidPermissionKey("clients.view")).toBe(true);
    expect(isValidPermissionKey(WILDCARD_PERMISSION)).toBe(true);
    expect(isValidPermissionKey("not.real")).toBe(false);
  });

  it("flags sensitive financial permissions", () => {
    expect(SENSITIVE_PERMISSION_KEYS).toContain("payments.delete");
    expect(SENSITIVE_PERMISSION_KEYS).toContain("payments.refund");
    expect(SENSITIVE_PERMISSION_KEYS).toContain("invoices.cancel");
    expect(SENSITIVE_PERMISSION_KEYS).toContain("settings.manage_credentials");
  });
});
