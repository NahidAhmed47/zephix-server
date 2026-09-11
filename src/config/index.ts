import dotenv from "dotenv";
import path from "path";

dotenv.config({ path: path.join(process.cwd(), ".env") });

const splitCsv = (v?: string): string[] =>
  v
    ? v
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean)
    : [];

export const envConfig = {
  app: {
    port: process.env.PORT ? Number(process.env.PORT) : 5006,
    env: (process.env.NODE_ENV as "development" | "production") || "development",
  },
  clients: {
    admin_url: process.env.ADMIN_CLIENT_URL as string,
    server_base_url: process.env.SERVER_BASE_URL as string,
  },
  cors_origins: splitCsv(process.env.CORS_ORIGINS),
  database: {
    mongodb_url: process.env.MONGODB_URL as string,
  },
  jwt: {
    secret: process.env.JWT_TOKEN_SECRET as string,
    access_token_expires: process.env.ACCESS_TOKEN_EXPIRES_IN || "1d",
    refresh_token_expires: process.env.REFRESH_TOKEN_EXPIRES_IN || "365d",
    access_cookie_name: "zpx_atkn",
    refresh_cookie_name: "zpx_rtkn",
  },
  security: {
    // 32-byte key (hex or utf8) used to encrypt SMS/SMTP credentials at rest.
    encryption_key: process.env.ENCRYPTION_KEY as string,
    // Shared secret required to trigger /internal/cron/* endpoints.
    cron_secret: process.env.CRON_SECRET as string,
  },
  company: {
    default_currency: process.env.DEFAULT_CURRENCY || "BDT",
  },
  aws: {
    access_key_id: process.env.AWS_ACCESS_KEY_ID as string,
    secret_access_key: process.env.AWS_SECRET_ACCESS_KEY as string,
    region: process.env.AWS_REGION as string,
    bucket_name: process.env.AWS_BUCKET_NAME as string,
    file_load_base_url: process.env.AWS_FILE_LOAD_BASE_URL as string,
  },
  // BulkSMSBD — never expose to the browser.
  sms: {
    api_key: process.env.SMS_API_KEY as string,
    sender_id: process.env.SMS_SENDER_ID as string,
    base_url: process.env.SMS_BASE_URL || "http://bulksmsbd.net/api/smsapi",
    balance_url:
      process.env.SMS_BALANCE_URL || "http://bulksmsbd.net/api/getBalanceApi",
  },
  // SMTP — never expose to the browser.
  smtp: {
    host: process.env.SMTP_HOST as string,
    port: process.env.SMTP_PORT ? Number(process.env.SMTP_PORT) : 587,
    user: process.env.SMTP_USER as string,
    pass: process.env.SMTP_PASS as string,
    from_name: process.env.SMTP_FROM_NAME || "Zephix",
    from_email: process.env.SMTP_FROM_EMAIL as string,
    secure: process.env.SMTP_SECURE === "true",
  },
};
