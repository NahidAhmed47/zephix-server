import crypto from "crypto";
import { envConfig } from "@/config";

/**
 * AES-256-GCM encryption for credentials at rest (SMS/SMTP).
 * Format: base64(iv):base64(authTag):base64(ciphertext).
 * The key is derived from ENCRYPTION_KEY via SHA-256 (always 32 bytes).
 */
const ALGORITHM = "aes-256-gcm";

const getKey = (): Buffer =>
  crypto
    .createHash("sha256")
    .update(String(envConfig.security.encryption_key || "zephix-fallback-key"))
    .digest();

export const encrypt = (plain: string | null | undefined): string => {
  if (plain === null || plain === undefined || plain === "") return "";
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv(ALGORITHM, getKey(), iv);
  const encrypted = Buffer.concat([
    cipher.update(String(plain), "utf8"),
    cipher.final(),
  ]);
  const authTag = cipher.getAuthTag();
  return [
    iv.toString("base64"),
    authTag.toString("base64"),
    encrypted.toString("base64"),
  ].join(":");
};

export const decrypt = (payload: string | null | undefined): string => {
  if (!payload) return "";
  const parts = payload.split(":");
  if (parts.length !== 3) return "";
  const [ivB64, tagB64, dataB64] = parts;
  try {
    const decipher = crypto.createDecipheriv(
      ALGORITHM,
      getKey(),
      Buffer.from(ivB64, "base64")
    );
    decipher.setAuthTag(Buffer.from(tagB64, "base64"));
    const decrypted = Buffer.concat([
      decipher.update(Buffer.from(dataB64, "base64")),
      decipher.final(),
    ]);
    return decrypted.toString("utf8");
  } catch {
    return "";
  }
};

export const isEncrypted = (value: string | null | undefined): boolean =>
  !!value && value.split(":").length === 3;
