import nodemailer from "nodemailer";
import { envConfig } from "@/config";
import { SettingService } from "@/modules/setting/setting.service";

/**
 * SMTP email sender (spec §20). Credentials are read DB-first (encrypted at
 * rest) with an env fallback, never exposed to the browser, and every call is
 * failure-tolerant (spec §59) — returns a result, never throws.
 */

export interface IEmailInput {
  to: string;
  subject: string;
  html?: string;
  text?: string;
}

export interface IEmailResult {
  success: boolean;
  provider_response: string;
  error?: string;
}

const getCreds = async () => {
  try {
    const c = await SettingService.getSmtpCredentials();
    if (c.host && c.user)
      return {
        host: c.host,
        port: c.port,
        user: c.user,
        pass: c.pass,
        from_name: c.from_name,
        from_email: c.from_email || c.user,
        secure: c.secure,
      };
  } catch {
    /* fall through to env */
  }
  return {
    host: envConfig.smtp.host,
    port: envConfig.smtp.port,
    user: envConfig.smtp.user,
    pass: envConfig.smtp.pass,
    from_name: envConfig.smtp.from_name,
    from_email: envConfig.smtp.from_email || envConfig.smtp.user,
    secure: envConfig.smtp.secure,
  };
};

const buildTransport = (creds: Awaited<ReturnType<typeof getCreds>>) =>
  nodemailer.createTransport({
    host: creds.host,
    port: creds.port,
    secure: creds.secure,
    auth: { user: creds.user, pass: creds.pass },
  });

export const sendEmail = async (input: IEmailInput): Promise<IEmailResult> => {
  try {
    const creds = await getCreds();
    if (!creds.host || !creds.user)
      return {
        success: false,
        provider_response: "",
        error: "SMTP is not configured.",
      };
    if (!input.to)
      return { success: false, provider_response: "", error: "No recipient." };

    const info = await buildTransport(creds).sendMail({
      from: `"${creds.from_name}" <${creds.from_email}>`,
      to: input.to,
      subject: input.subject,
      html: input.html,
      text: input.text || input.subject,
    });
    return { success: true, provider_response: info.messageId || "sent" };
  } catch (e) {
    return { success: false, provider_response: "", error: (e as Error).message };
  }
};

export const verifySmtp = async (): Promise<{ ok: boolean; error?: string }> => {
  try {
    const creds = await getCreds();
    if (!creds.host || !creds.user)
      return { ok: false, error: "SMTP is not configured." };
    await buildTransport(creds).verify();
    return { ok: true };
  } catch (e) {
    return { ok: false, error: (e as Error).message };
  }
};
