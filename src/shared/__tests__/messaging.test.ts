import { describe, it, expect } from "vitest";
import { resolveChannel, resolveMessaging } from "@/shared/messaging";

describe("resolveChannel precedence (spec §22/§23)", () => {
  it("a more specific 'off' overrides a global 'on'", () => {
    // Global ON, Client ON, Project OFF → OFF (spec §22 example)
    expect(resolveChannel(["off", "on"], true)).toBe(false);
  });

  it("a specific 'on' wins even when global is off", () => {
    expect(resolveChannel(["on", "inherit"], false)).toBe(true);
  });

  it("all inherit → falls back to the global setting", () => {
    expect(resolveChannel(["inherit", "inherit"], true)).toBe(true);
    expect(resolveChannel([undefined, "inherit"], false)).toBe(false);
  });

  it("stops at the first concrete override", () => {
    // project inherit, contract off, client on → off (contract is more specific)
    expect(resolveChannel(["inherit", "off", "on"], true)).toBe(false);
  });
});

describe("resolveMessaging", () => {
  it("resolves sms + email independently", () => {
    const res = resolveMessaging(
      [{ sms: "off", email: "inherit" }, { sms: "on", email: "on" }],
      { sms_enabled: true, email_enabled: false }
    );
    expect(res).toEqual({ sms: false, email: true });
  });
});
