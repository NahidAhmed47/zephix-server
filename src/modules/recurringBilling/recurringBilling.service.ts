import ApiError from "@/middlewares/error";
import { HttpStatusCode } from "@/lib/httpStatus";
import { RecurringBillingModel } from "./recurringBilling.model";
import {
  RECURRING_STATUS,
  ACTIVE_RECURRING_STATUSES,
} from "./recurringBilling.enum";
import { InvoiceModel } from "@/modules/invoice/invoice.model";
import { InvoiceService } from "@/modules/invoice/invoice.service";
import { ClientService } from "@/modules/client/client.service";
import { IAuthUser } from "@/lib/rbac";
import { money, decimal128ToString, DEFAULT_CURRENCY } from "@/lib/money";
import {
  BILLING_FREQUENCY,
  addInterval,
  nextBillingDate,
  mrrOf,
} from "@/lib/billing";
import { MESSAGING_PREF } from "@/modules/client/client.enum";
import { paginationHelpers } from "@/helpers/paginationHelpers";
import { IPaginationOptions } from "@/interfaces/pagination.interfaces";

const populateRefs = [
  { path: "client", select: "name" },
  { path: "contract", select: "contract_number name" },
  { path: "service", select: "name" },
  { path: "project", select: "name" },
];

class RecurringBilling {
  private async clientScope(user: IAuthUser) {
    const ids = await ClientService.accessibleClientIds(user);
    if (ids === null) return {};
    return { client: { $in: ids } };
  }

  /** Upcoming billing date: the start itself if still in the future, else the
   *  next occurrence after now (via the tested billing engine). */
  private computeNext(
    start: Date,
    frequency: string,
    customMonths: number,
    from = new Date()
  ): Date {
    if (start.getTime() >= from.getTime()) return start;
    return nextBillingDate(start, frequency, customMonths, from);
  }

  async create(data: Record<string, unknown>, user: IAuthUser) {
    await ClientService.assertAccess(String(data.client), user);
    const currency = (data.currency as string) || DEFAULT_CURRENCY;
    const amount = money((data.amount as number | string) ?? 0, currency);
    const frequency = (data.frequency as string) || BILLING_FREQUENCY.MONTHLY;
    const customMonths = Number(data.custom_months ?? 1);
    const start = data.start_date ? new Date(data.start_date as string) : new Date();
    const msg = data.messaging as { sms?: string; email?: string } | undefined;

    const doc = await RecurringBillingModel.create({
      client: data.client,
      contract: data.contract || null,
      service: data.service || null,
      project: data.project || null,
      amount,
      currency,
      frequency,
      custom_months: customMonths,
      start_date: start,
      end_date: data.end_date || null,
      next_billing_date: this.computeNext(start, frequency, customMonths),
      previous_billing_date: null,
      auto_invoice:
        data.auto_invoice !== undefined ? Boolean(data.auto_invoice) : true,
      messaging: {
        sms: msg?.sms || MESSAGING_PREF.INHERIT,
        email: msg?.email || MESSAGING_PREF.INHERIT,
      },
      mrr_value: mrrOf(amount, frequency, customMonths),
      status: data.status || RECURRING_STATUS.ACTIVE,
      description: data.description || "",
      notes: data.notes || "",
      created_by: user.id,
    });
    return this.getById(String(doc._id), user);
  }

  async list(
    options: IPaginationOptions,
    filters: { status?: string; client?: string; contract?: string },
    user: IAuthUser
  ) {
    const { page, limit, skip, sortBy, sortOrder } =
      paginationHelpers.calculatePagination(options);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const cond: any = { is_Deleted: false, ...(await this.clientScope(user)) };
    if (filters.status) cond.status = filters.status;
    if (filters.client) cond.client = filters.client;
    if (filters.contract) cond.contract = filters.contract;

    const [data, total] = await Promise.all([
      RecurringBillingModel.find(cond)
        .populate(populateRefs)
        .sort({ [sortBy === "createdAt" ? "next_billing_date" : sortBy]: sortOrder === "desc" ? -1 : 1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      RecurringBillingModel.countDocuments(cond),
    ]);
    return { meta: { page, limit, total }, data };
  }

  async getById(id: string, user: IAuthUser) {
    const schedule = await RecurringBillingModel.findOne({
      _id: id,
      is_Deleted: false,
      ...(await this.clientScope(user)),
    }).populate(populateRefs);
    if (!schedule)
      throw new ApiError(HttpStatusCode.NOT_FOUND, "Schedule not found.");
    return schedule;
  }

  async update(id: string, data: Record<string, unknown>, user: IAuthUser) {
    const before = await RecurringBillingModel.findOne({
      _id: id,
      is_Deleted: false,
      ...(await this.clientScope(user)),
    });
    if (!before)
      throw new ApiError(HttpStatusCode.NOT_FOUND, "Schedule not found.");

    const currency = (data.currency as string) || before.currency;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const patch: any = { ...data };
    patch.currency = currency;

    const frequency = (data.frequency as string) || before.frequency;
    const customMonths =
      data.custom_months !== undefined
        ? Number(data.custom_months)
        : before.custom_months;
    const amount =
      data.amount !== undefined
        ? money(data.amount as number | string, currency)
        : money(before.amount.amount.toString(), currency);

    if (
      data.amount !== undefined ||
      data.frequency !== undefined ||
      data.custom_months !== undefined ||
      data.currency !== undefined
    ) {
      patch.amount = amount;
      patch.mrr_value = mrrOf(amount, frequency, customMonths);
    }
    if (data.start_date !== undefined || data.frequency !== undefined) {
      const start = data.start_date
        ? new Date(data.start_date as string)
        : before.start_date;
      patch.start_date = start;
      patch.next_billing_date = this.computeNext(start, frequency, customMonths);
    }

    const msg = data.messaging as { sms?: string; email?: string } | undefined;
    if (msg) {
      patch.messaging = {
        sms: msg.sms || before.messaging.sms,
        email: msg.email || before.messaging.email,
      };
    }

    await RecurringBillingModel.findByIdAndUpdate(id, patch);
    return { updated: await this.getById(id, user), before: before.toObject() };
  }

  async setStatus(id: string, status: string, user: IAuthUser) {
    const before = await RecurringBillingModel.findOne({
      _id: id,
      is_Deleted: false,
      ...(await this.clientScope(user)),
    });
    if (!before)
      throw new ApiError(HttpStatusCode.NOT_FOUND, "Schedule not found.");
    await RecurringBillingModel.findByIdAndUpdate(id, { status });
    return { updated: await this.getById(id, user), before: before.toObject() };
  }

  /**
   * Generate the invoice for the current billing period and advance the
   * schedule. Idempotent (spec §27): refuses to double-bill the same period.
   */
  async generate(id: string, user: IAuthUser) {
    const schedule = await RecurringBillingModel.findOne({
      _id: id,
      is_Deleted: false,
      ...(await this.clientScope(user)),
    });
    if (!schedule)
      throw new ApiError(HttpStatusCode.NOT_FOUND, "Schedule not found.");
    if (schedule.status !== RECURRING_STATUS.ACTIVE)
      throw new ApiError(
        HttpStatusCode.BAD_REQUEST,
        "Only active schedules can be billed."
      );

    const periodStart = schedule.next_billing_date;
    const existing = await InvoiceModel.findOne({
      recurring_schedule: schedule._id,
      billing_period_start: periodStart,
      is_Deleted: false,
    });
    if (existing)
      throw new ApiError(
        HttpStatusCode.CONFLICT,
        "An invoice for this billing period already exists."
      );

    const periodEnd = addInterval(
      periodStart,
      schedule.frequency,
      schedule.custom_months
    );
    const invoice = await InvoiceService.create(
      {
        client: String(schedule.client),
        contract: schedule.contract ? String(schedule.contract) : "",
        project: schedule.project ? String(schedule.project) : "",
        recurring_schedule: String(schedule._id),
        currency: schedule.currency,
        issue_date: periodStart.toISOString(),
        billing_period_start: periodStart.toISOString(),
        billing_period_end: periodEnd.toISOString(),
        status: "issued",
        lines: [
          {
            description: schedule.description || "Recurring charge",
            quantity: 1,
            unit_price: decimal128ToString(schedule.amount.amount),
          },
        ],
      },
      user
    );

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const patch: any = {
      previous_billing_date: periodStart,
      next_billing_date: periodEnd,
    };
    if (schedule.end_date && periodEnd > schedule.end_date)
      patch.status = RECURRING_STATUS.COMPLETED;
    await RecurringBillingModel.findByIdAndUpdate(id, patch);

    return { invoice, schedule: await this.getById(id, user) };
  }

  /**
   * Batch generator for the cron (§28): raise invoices for every active
   * auto-invoice schedule whose next billing date has arrived, then advance it.
   * Idempotent per period (§27) and error-tolerant per schedule (§59).
   */
  async generateDue(now: Date = new Date()) {
    const due = await RecurringBillingModel.find({
      is_Deleted: false,
      status: RECURRING_STATUS.ACTIVE,
      auto_invoice: true,
      next_billing_date: { $lte: now },
    });

    let generated = 0;
    let skipped = 0;
    let failed = 0;
    for (const s of due) {
      try {
        const periodStart = s.next_billing_date;
        const existing = await InvoiceModel.findOne({
          recurring_schedule: s._id,
          billing_period_start: periodStart,
          is_Deleted: false,
        });
        if (existing) {
          skipped++;
          continue;
        }
        const periodEnd = addInterval(periodStart, s.frequency, s.custom_months);
        await InvoiceService.createInternal({
          client: String(s.client),
          contract: s.contract ? String(s.contract) : "",
          project: s.project ? String(s.project) : "",
          recurring_schedule: String(s._id),
          currency: s.currency,
          issue_date: periodStart.toISOString(),
          billing_period_start: periodStart.toISOString(),
          billing_period_end: periodEnd.toISOString(),
          status: "issued",
          lines: [
            {
              description: s.description || "Recurring charge",
              quantity: 1,
              unit_price: decimal128ToString(s.amount.amount),
            },
          ],
        });
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const patch: any = {
          previous_billing_date: periodStart,
          next_billing_date: periodEnd,
        };
        if (s.end_date && periodEnd > s.end_date)
          patch.status = RECURRING_STATUS.COMPLETED;
        await RecurringBillingModel.findByIdAndUpdate(s._id, patch);
        generated++;
      } catch (e) {
        failed++;
        console.error(
          "[cron] recurring invoice generation failed:",
          (e as Error).message
        );
      }
    }
    return { due: due.length, generated, skipped, failed };
  }

  async remove(id: string, user: IAuthUser) {
    const schedule = await RecurringBillingModel.findOne({
      _id: id,
      is_Deleted: false,
      ...(await this.clientScope(user)),
    });
    if (!schedule)
      throw new ApiError(HttpStatusCode.NOT_FOUND, "Schedule not found.");
    await RecurringBillingModel.findByIdAndUpdate(id, { is_Deleted: true });
    return schedule;
  }

  /** MRR / ARR + this-month upcoming across active schedules (spec §31). */
  async stats(user: IAuthUser) {
    const scope = await this.clientScope(user);
    const now = new Date();
    const monthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 1);

    const [mrrAgg, upAgg] = await Promise.all([
      RecurringBillingModel.aggregate([
        {
          $match: {
            is_Deleted: false,
            ...scope,
            status: { $in: ACTIVE_RECURRING_STATUSES },
          },
        },
        {
          $group: {
            _id: null,
            mrr: { $sum: { $toDouble: "$mrr_value.amount" } },
            count: { $sum: 1 },
          },
        },
      ]),
      RecurringBillingModel.aggregate([
        {
          $match: {
            is_Deleted: false,
            ...scope,
            status: { $in: ACTIVE_RECURRING_STATUSES },
            next_billing_date: { $gte: now, $lt: monthEnd },
          },
        },
        {
          $group: {
            _id: null,
            total: { $sum: { $toDouble: "$amount.amount" } },
          },
        },
      ]),
    ]);

    const mrr = (mrrAgg[0]?.mrr as number) || 0;
    return {
      active_count: (mrrAgg[0]?.count as number) || 0,
      mrr,
      arr: mrr * 12,
      upcoming_this_month: (upAgg[0]?.total as number) || 0,
    };
  }
}

export const RecurringBillingService = new RecurringBilling();
