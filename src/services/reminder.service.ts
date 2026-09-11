import { DateTime } from "luxon";
import { InvoiceModel } from "@/modules/invoice/invoice.model";
import { OPEN_INVOICE_STATUSES } from "@/modules/invoice/invoice.enum";
import { ReminderRuleService } from "@/modules/reminderRule/reminderRule.service";
import { SettingService } from "@/modules/setting/setting.service";
import { CommunicationLogService } from "@/modules/communicationLog/communicationLog.service";
import { COMMUNICATION_STATUS } from "@/modules/communicationLog/communicationLog.enum";
import { resolveMessaging } from "@/shared/messaging";
import { resolveRecipient } from "@/shared/recipient";
import { renderTemplate } from "@/lib/templateEngine";
import { formatMoney } from "@/lib/money";
import { sendSms } from "@/lib/sms";
import { sendEmail } from "@/lib/email";

/**
 * Payment-reminder engine (spec §21/§26/§60). For each active reminder rule it
 * finds invoices whose due date matches the rule's offset, then for each enabled
 * channel it: checks the messaging precedence, enforces idempotency (§27),
 * resolves the recipient, renders the template, sends, and logs — never
 * throwing so one failure can't stop the batch (§59).
 */

/* eslint-disable @typescript-eslint/no-explicit-any */

class Reminder {
  private buildVars(inv: any): Record<string, string> {
    return {
      client_name: inv.client?.name || "",
      company_name: "Zephix",
      invoice_number: inv.invoice_number || "",
      amount: inv.amount_due ? formatMoney(inv.amount_due) : "",
      due_date: inv.due_date
        ? DateTime.fromJSDate(new Date(inv.due_date)).toFormat("dd LLL yyyy")
        : "",
      contract_name: inv.contract?.name || "",
      project_name: inv.project?.name || "",
      zephix_contact: "",
    };
  }

  async processReminders(now: Date = new Date()) {
    const rules = (await ReminderRuleService.listActive()) as any[];
    const flags = await SettingService.getMessagingFlags();
    let processed = 0;
    let sent = 0;
    let skipped = 0;
    let failed = 0;

    for (const rule of rules) {
      // Fires when today === due_date + offset_days ⇒ due_date === today − offset.
      const target = new Date(now);
      target.setDate(target.getDate() - rule.offset_days);
      const dayStart = new Date(
        target.getFullYear(),
        target.getMonth(),
        target.getDate()
      );
      const dayEnd = new Date(dayStart);
      dayEnd.setDate(dayEnd.getDate() + 1);

      const invoices = (await InvoiceModel.find({
        is_Deleted: false,
        status: { $in: OPEN_INVOICE_STATUSES },
        due_date: { $gte: dayStart, $lt: dayEnd },
      })
        .populate([
          { path: "client", select: "name messaging" },
          { path: "contract", select: "name messaging" },
          { path: "project", select: "name messaging" },
          { path: "recurring_schedule", select: "messaging" },
        ])
        .lean()) as any[];

      for (const inv of invoices) {
        processed++;
        const resolved = resolveMessaging(
          [
            inv.recurring_schedule?.messaging,
            inv.project?.messaging,
            inv.contract?.messaging,
            inv.client?.messaging,
          ],
          flags
        );
        const channels: ("sms" | "email")[] = [];
        if (rule.sms_enabled && resolved.sms) channels.push("sms");
        if (rule.email_enabled && resolved.email) channels.push("email");

        const dueKey = DateTime.fromJSDate(new Date(inv.due_date)).toISODate();
        const clientId = inv.client?._id
          ? String(inv.client._id)
          : String(inv.client);

        for (const channel of channels) {
          const key = `${inv._id}:${rule._id}:${channel}:${dueKey}`;
          if (await CommunicationLogService.wasReminderSent(key)) {
            skipped++;
            continue;
          }
          const template = channel === "sms" ? rule.sms_template : rule.email_template;
          if (!template || !template.body) {
            skipped++;
            continue;
          }
          const recipient = await resolveRecipient(clientId, channel);
          if (!recipient) {
            await CommunicationLogService.log({
              client: inv.client?._id || inv.client,
              invoice: inv._id,
              type: channel,
              recipient: "",
              template: template._id,
              status: COMMUNICATION_STATUS.SKIPPED,
              error: "No recipient",
              reminder_key: key,
            });
            skipped++;
            continue;
          }
          const vars = this.buildVars(inv);
          const body = renderTemplate(template.body, vars);
          const subject =
            channel === "email"
              ? renderTemplate(template.subject || "Payment reminder", vars)
              : undefined;
          const result =
            channel === "sms"
              ? await sendSms(recipient, body)
              : await sendEmail({ to: recipient, subject: subject!, html: body, text: body });

          await CommunicationLogService.log({
            client: inv.client?._id || inv.client,
            contract: inv.contract?._id || inv.contract,
            project: inv.project?._id || inv.project,
            invoice: inv._id,
            type: channel,
            recipient,
            template: template._id,
            subject,
            body,
            status: result.success
              ? COMMUNICATION_STATUS.SENT
              : COMMUNICATION_STATUS.FAILED,
            provider_response: result.provider_response,
            error: result.error,
            reminder_key: key,
          });
          if (result.success) sent++;
          else failed++;
        }
      }
    }
    return { rules: rules.length, processed, sent, skipped, failed };
  }
}

export const ReminderService = new Reminder();
