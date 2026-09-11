import { describe, it, expect } from "vitest";
import { encrypt, decrypt, isEncrypted } from "@/lib/encryption";

describe("encryption (AES-256-GCM)", () => {
  it("round-trips a secret", () => {
    const secret = "bulksmsbd-api-key-123456";
    const enc = encrypt(secret);
    expect(enc).not.toBe(secret);
    expect(isEncrypted(enc)).toBe(true);
    expect(decrypt(enc)).toBe(secret);
  });

  it("keeps empty values empty", () => {
    expect(encrypt("")).toBe("");
    expect(decrypt("")).toBe("");
    expect(isEncrypted("")).toBe(false);
  });

  it("fails closed on tampered ciphertext", () => {
    const enc = encrypt("smtp-password");
    const parts = enc.split(":");
    // corrupt the ciphertext segment → GCM auth tag verification fails
    const tampered = `${parts[0]}:${parts[1]}:${Buffer.from("garbage").toString("base64")}`;
    expect(decrypt(tampered)).toBe("");
  });
});
