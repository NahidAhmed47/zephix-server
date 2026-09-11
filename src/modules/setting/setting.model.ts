import { Schema, model } from "mongoose";
import { ISetting } from "./setting.interface";
import { envConfig } from "@/config";

const settingSchema = new Schema<ISetting>(
  {
    key: { type: String, required: true, unique: true, default: "global" },
    company: {
      name: { type: String, default: "Zephix" },
      logo: { type: String, default: "" },
      email: { type: String, default: "" },
      phone: { type: String, default: "" },
      address: { type: String, default: "" },
      website: { type: String, default: "" },
    },
    currency: { type: String, default: envConfig.company.default_currency },
    finance: {
      invoice_prefix: { type: String, default: "INV" },
      payment_prefix: { type: String, default: "PAY" },
      default_payment_terms_days: { type: Number, default: 15 },
      payment_methods: {
        type: [String],
        default: ["bank", "cash", "bkash", "nagad", "card", "online", "other"],
      },
    },
    messaging: {
      sms_enabled: { type: Boolean, default: true },
      email_enabled: { type: Boolean, default: true },
    },
    communication: {
      sms: {
        provider: { type: String, default: "bulksmsbd" },
        api_key: { type: String, default: "" }, // encrypted
        sender_id: { type: String, default: "" },
        base_url: { type: String, default: envConfig.sms.base_url },
      },
      smtp: {
        host: { type: String, default: "" },
        port: { type: Number, default: 587 },
        user: { type: String, default: "" },
        pass: { type: String, default: "" }, // encrypted
        from_name: { type: String, default: "Zephix" },
        from_email: { type: String, default: "" },
        secure: { type: Boolean, default: false },
      },
    },
    security: {
      session_timeout_minutes: { type: Number, default: 720 },
    },
  },
  { timestamps: true, versionKey: false }
);

export const SettingModel = model<ISetting>("Setting", settingSchema);
