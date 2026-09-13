import cron from "node-cron";
import { InvoiceService } from "@/modules/invoice/invoice.service";
import { RecurringBillingService } from "@/modules/recurringBilling/recurringBilling.service";
import { ContractService } from "@/modules/contract/contract.service";
import { ReminderService } from "@/services/reminder.service";
import { NotificationService } from "@/modules/notification/notification.service";
import { HostingService } from "@/modules/hosting/hosting.service";

/**
 * Scheduled jobs (spec §28). Every job is idempotent and error-tolerant, so a
 * run can be repeated (cron retry, manual trigger) without duplicate side
 * effects, and one failing job never aborts the others.
 */

export const JOBS = [
  "recurring-invoices",
  "milestones",
  "overdue",
  "reminders",
  "notifications",
  "hosting-expiry",
  "all",
] as const;

export const runAllJobs = async () => {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const results: Record<string, any> = {};
  const steps: [string, () => Promise<unknown>][] = [
    ["recurring_invoices", () => RecurringBillingService.generateDue()],
    ["milestones", () => ContractService.generateDueMilestones()],
    ["overdue", () => InvoiceService.markOverdue()],
    ["reminders", () => ReminderService.processReminders()],
    ["notifications", () => NotificationService.generateAlerts()],
    ["hosting_expiry", () => HostingService.generateExpiryAlerts()],
  ];
  for (const [key, fn] of steps) {
    try {
      results[key] = await fn();
    } catch (e) {
      results[key] = { error: (e as Error).message };
      console.error(`[cron] ${key} failed:`, (e as Error).message);
    }
  }
  return results;
};

export const runJob = async (job: string) => {
  switch (job) {
    case "recurring-invoices":
      return { recurring_invoices: await RecurringBillingService.generateDue() };
    case "milestones":
      return { milestones: await ContractService.generateDueMilestones() };
    case "overdue":
      return { overdue: await InvoiceService.markOverdue() };
    case "reminders":
      return { reminders: await ReminderService.processReminders() };
    case "notifications":
      return { notifications: await NotificationService.generateAlerts() };
    case "hosting-expiry":
      return { hosting_expiry: await HostingService.generateExpiryAlerts() };
    case "all":
    default:
      return runAllJobs();
  }
};

/** Register in-process cron (daily 09:00). External schedulers can also hit the
 *  CRON_SECRET-gated /internal/cron/:job endpoints instead. */
export const registerCronJobs = () => {
  cron.schedule("0 9 * * *", () => {
    runAllJobs().catch((e) =>
      console.error("[cron] scheduled run failed:", (e as Error).message)
    );
  });
  console.info("🕒 Scheduled jobs registered (daily 09:00).");
};
