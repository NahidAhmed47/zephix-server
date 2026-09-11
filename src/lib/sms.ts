import axios from "axios";
import { envConfig } from "@/config";
import { SettingService } from "@/modules/setting/setting.service";

/**
 * BulkSMSBD sender (spec §19). Credentials are read DB-first (admin-configured,
 * encrypted at rest) with an env fallback, and are NEVER exposed to the browser.
 * All calls are failure-tolerant — a provider error returns a result object, it
 * never throws, so a failing send can be logged without breaking the caller
 * (spec §59).
 */

export interface ISmsResult {
  success: boolean;
  provider_response: string;
  error?: string;
}

const getCreds = async () => {
  try {
    const c = await SettingService.getSmsCredentials();
    if (c.api_key)
      return {
        api_key: c.api_key,
        sender_id: c.sender_id,
        base_url: c.base_url || envConfig.sms.base_url,
        balance_url: envConfig.sms.balance_url,
      };
  } catch {
    /* fall through to env */
  }
  return {
    api_key: envConfig.sms.api_key,
    sender_id: envConfig.sms.sender_id,
    base_url: envConfig.sms.base_url,
    balance_url: envConfig.sms.balance_url,
  };
};

export const sendSms = async (
  to: string,
  message: string
): Promise<ISmsResult> => {
  try {
    const creds = await getCreds();
    if (!creds.api_key)
      return {
        success: false,
        provider_response: "",
        error: "SMS credentials are not configured.",
      };
    if (!to)
      return { success: false, provider_response: "", error: "No recipient." };

    const res = await axios.get(creds.base_url, {
      params: {
        api_key: creds.api_key,
        type: "text",
        number: to,
        senderid: creds.sender_id,
        message,
      },
      timeout: 15000,
    });
    const body =
      typeof res.data === "string" ? res.data : JSON.stringify(res.data);
    // BulkSMSBD returns 202 / "SMS SUBMITTED SUCCESSFULLY" on success.
    const ok = /202|success|submitted/i.test(body) && !/error|invalid/i.test(body);
    return {
      success: ok,
      provider_response: body,
      error: ok ? undefined : body,
    };
  } catch (e) {
    return { success: false, provider_response: "", error: (e as Error).message };
  }
};

export const getSmsBalance = async (): Promise<{
  balance?: string;
  error?: string;
}> => {
  try {
    const creds = await getCreds();
    if (!creds.api_key) return { error: "SMS credentials are not configured." };
    const res = await axios.get(creds.balance_url, {
      params: { api_key: creds.api_key },
      timeout: 15000,
    });
    return {
      balance:
        typeof res.data === "string" ? res.data : JSON.stringify(res.data),
    };
  } catch (e) {
    return { error: (e as Error).message };
  }
};
