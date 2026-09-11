import ApiError from "@/middlewares/error";
import { HttpStatusCode } from "@/lib/httpStatus";
import { sendSms, getSmsBalance } from "@/lib/sms";
import { sendEmail, verifySmtp } from "@/lib/email";
import { renderTemplate } from "@/lib/templateEngine";
import { resolveRecipient } from "@/shared/recipient";
import { MessageTemplateModel } from "@/modules/messageTemplate/messageTemplate.model";
import { CommunicationLogService } from "@/modules/communicationLog/communicationLog.service";
import {
  COMMUNICATION_TYPE,
  COMMUNICATION_STATUS,
} from "@/modules/communicationLog/communicationLog.enum";
import { IAuthUser } from "@/lib/rbac";

class Communication {
  private async resolveBody(
    templateId: unknown,
    fallbackMessage?: string
  ): Promise<{ body: string; subject: string; templateId: string | null }> {
    if (templateId) {
      const t = await MessageTemplateModel.findById(templateId);
      if (t)
        return { body: t.body, subject: t.subject || "", templateId: String(t._id) };
    }
    return { body: fallbackMessage || "", subject: "", templateId: null };
  }

  async sendSmsMessage(data: Record<string, unknown>, user: IAuthUser) {
    let to = (data.to as string) || "";
    if (!to && data.client)
      to = await resolveRecipient(String(data.client), "sms");
    if (!to)
      throw new ApiError(HttpStatusCode.BAD_REQUEST, "No SMS recipient found.");

    const { body, templateId } = await this.resolveBody(
      data.template,
      data.message as string
    );
    if (!body)
      throw new ApiError(HttpStatusCode.BAD_REQUEST, "No message to send.");

    const rendered = renderTemplate(body, {});
    const result = await sendSms(to, rendered);
    const log = await CommunicationLogService.log({
      client: (data.client as string) || null,
      invoice: (data.invoice as string) || null,
      type: COMMUNICATION_TYPE.SMS,
      recipient: to,
      template: templateId,
      body: rendered,
      status: result.success
        ? COMMUNICATION_STATUS.SENT
        : COMMUNICATION_STATUS.FAILED,
      provider_response: result.provider_response,
      error: result.error,
      created_by: user.id,
    });
    return { result, log };
  }

  async sendEmailMessage(data: Record<string, unknown>, user: IAuthUser) {
    let to = (data.to as string) || "";
    if (!to && data.client)
      to = await resolveRecipient(String(data.client), "email");
    if (!to)
      throw new ApiError(HttpStatusCode.BAD_REQUEST, "No email recipient found.");

    const { body, subject, templateId } = await this.resolveBody(
      data.template,
      data.message as string
    );
    if (!body)
      throw new ApiError(HttpStatusCode.BAD_REQUEST, "No message to send.");

    const renderedBody = renderTemplate(body, {});
    const renderedSubject = renderTemplate(
      (data.subject as string) || subject || "Message from Zephix",
      {}
    );
    const result = await sendEmail({
      to,
      subject: renderedSubject,
      html: renderedBody,
      text: renderedBody,
    });
    const log = await CommunicationLogService.log({
      client: (data.client as string) || null,
      invoice: (data.invoice as string) || null,
      type: COMMUNICATION_TYPE.EMAIL,
      recipient: to,
      template: templateId,
      subject: renderedSubject,
      body: renderedBody,
      status: result.success
        ? COMMUNICATION_STATUS.SENT
        : COMMUNICATION_STATUS.FAILED,
      provider_response: result.provider_response,
      error: result.error,
      created_by: user.id,
    });
    return { result, log };
  }

  async testConnection(type: string) {
    if (type === COMMUNICATION_TYPE.SMS) {
      const bal = await getSmsBalance();
      return { channel: "sms", ok: !bal.error, ...bal };
    }
    const v = await verifySmtp();
    return { channel: "email", ...v };
  }

  async balance() {
    return getSmsBalance();
  }
}

export const CommunicationService = new Communication();
