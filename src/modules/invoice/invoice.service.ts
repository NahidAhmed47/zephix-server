import { Types } from "mongoose";
import ApiError from "@/middlewares/error";
import { HttpStatusCode } from "@/lib/httpStatus";
import { InvoiceModel } from "./invoice.model";
import { IInvoiceLine } from "./invoice.interface";
import { INVOICE_STATUS, OPEN_INVOICE_STATUSES } from "./invoice.enum";
import { invoiceFinancials } from "./invoice.finance";
import { PaymentModel } from "@/modules/payment/payment.model";
import { ClientService } from "@/modules/client/client.service";
import { SettingModel } from "@/modules/setting/setting.model";
import { IAuthUser } from "@/lib/rbac";
import {
  money,
  addMoney,
  subMoney,
  sumMoney,
  mulMoney,
  zeroMoney,
  compareMoney,
  IMoney,
  DEFAULT_CURRENCY,
} from "@/lib/money";
import { paginationHelpers } from "@/helpers/paginationHelpers";
import { IPaginationOptions } from "@/interfaces/pagination.interfaces";

const populateRefs = [
  { path: "client", select: "name" },
  { path: "contract", select: "contract_number name" },
  { path: "project", select: "name" },
];

interface LineInput {
  description: string;
  quantity?: number | string;
  unit_price?: number | string;
  service?: string | null;
}

class Invoice {
  /** Invoices follow client data access (spec §41): a caller sees invoices for
   *  the clients they can access. Returns a filter fragment. */
  private async clientScope(user: IAuthUser) {
    const ids = await ClientService.accessibleClientIds(user);
    if (ids === null) return {};
    return { client: { $in: ids } };
  }

  private async genInvoiceNumber(): Promise<string> {
    const setting = await SettingModel.findOne({ key: "global" }).select(
      "finance.invoice_prefix"
    );
    const prefix = setting?.finance?.invoice_prefix || "INV";
    const year = new Date().getFullYear();
    const stem = `${prefix}-${year}-`;
    const count = await InvoiceModel.countDocuments({
      invoice_number: { $regex: `^${stem}` },
    });
    return `${stem}${String(count + 1).padStart(4, "0")}`;
  }

  private buildLines(lines: LineInput[], currency: string): IInvoiceLine[] {
    return lines.map((l) => {
      const quantity = Number(l.quantity ?? 1);
      const unit_price = money(l.unit_price ?? 0, currency);
      return {
        description: l.description,
        quantity,
        unit_price,
        amount: mulMoney(unit_price, quantity),
        service: l.service || null,
      };
    });
  }

  private totals(
    lines: IInvoiceLine[],
    discount: IMoney,
    tax: IMoney,
    amountPaid: IMoney,
    currency: string
  ) {
    const subtotal = sumMoney(
      lines.map((l) => l.amount),
      currency
    );
    const total = addMoney(subMoney(subtotal, discount), tax);
    const amount_due = subMoney(total, amountPaid);
    return { subtotal, total, amount_due };
  }

  /** Display status from base intent (draft/issued/cancelled) + payments + dates. */
  private deriveStatus(
    base: string,
    total: IMoney,
    amountPaid: IMoney,
    issueDate: Date,
    dueDate: Date
  ): string {
    if (base === INVOICE_STATUS.CANCELLED) return INVOICE_STATUS.CANCELLED;
    if (base === INVOICE_STATUS.DRAFT) return INVOICE_STATUS.DRAFT;
    const now = new Date();
    const zero = zeroMoney(total.currency);
    if (compareMoney(total, zero) > 0 && compareMoney(amountPaid, total) >= 0)
      return INVOICE_STATUS.PAID;
    if (compareMoney(amountPaid, zero) > 0)
      return INVOICE_STATUS.PARTIALLY_PAID;
    if (dueDate < now) return INVOICE_STATUS.OVERDUE;
    if (issueDate > now) return INVOICE_STATUS.UPCOMING;
    return INVOICE_STATUS.ISSUED;
  }

  private baseOf(status: string): string {
    if (status === INVOICE_STATUS.CANCELLED) return INVOICE_STATUS.CANCELLED;
    if (status === INVOICE_STATUS.DRAFT) return INVOICE_STATUS.DRAFT;
    return INVOICE_STATUS.ISSUED;
  }

  /** Build + persist an invoice. Shared by the user-facing `create` (after an
   *  access check) and the system `createInternal` (cron / recurring billing). */
  private async build(
    data: Record<string, unknown>,
    createdBy: string | null
  ): Promise<string> {
    const currency = (data.currency as string) || DEFAULT_CURRENCY;
    const lines = this.buildLines((data.lines as LineInput[]) || [], currency);
    const discount = money((data.discount as number | string) ?? 0, currency);
    const tax = money((data.tax as number | string) ?? 0, currency);
    const amountPaid = zeroMoney(currency);
    const { subtotal, total, amount_due } = this.totals(
      lines,
      discount,
      tax,
      amountPaid,
      currency
    );

    const issue_date = data.issue_date
      ? new Date(data.issue_date as string)
      : new Date();
    let due_date: Date;
    if (data.due_date) due_date = new Date(data.due_date as string);
    else {
      const setting = await SettingModel.findOne({ key: "global" }).select(
        "finance.default_payment_terms_days"
      );
      const terms = setting?.finance?.default_payment_terms_days ?? 15;
      due_date = new Date(issue_date);
      due_date.setDate(due_date.getDate() + terms);
    }

    const base = (data.status as string) || INVOICE_STATUS.ISSUED;
    const status = this.deriveStatus(base, total, amountPaid, issue_date, due_date);
    const invoice_number = await this.genInvoiceNumber();

    const doc = await InvoiceModel.create({
      invoice_number,
      client: data.client,
      contract: data.contract || null,
      project: data.project || null,
      recurring_schedule: data.recurring_schedule || null,
      lines,
      issue_date,
      due_date,
      billing_period_start: data.billing_period_start || null,
      billing_period_end: data.billing_period_end || null,
      currency,
      subtotal,
      discount,
      tax,
      total,
      amount_paid: amountPaid,
      amount_due,
      status,
      notes: data.notes || "",
      created_by: createdBy,
    });
    return String(doc._id);
  }

  async create(data: Record<string, unknown>, user: IAuthUser) {
    await ClientService.assertAccess(String(data.client), user);
    const id = await this.build(data, user.id);
    return this.getById(id, user);
  }

  /** System-initiated creation (cron / recurring billing) — no access scope,
   *  `created_by` left null. */
  async createInternal(data: Record<string, unknown>) {
    const id = await this.build(data, null);
    return InvoiceModel.findById(id).populate(populateRefs);
  }

  /** Flip unpaid issued/upcoming invoices past their due date to overdue.
   *  Idempotent — safe to run repeatedly (used by the daily cron, §28). */
  async markOverdue(now: Date = new Date()) {
    const res = await InvoiceModel.updateMany(
      {
        is_Deleted: false,
        status: { $in: [INVOICE_STATUS.ISSUED, INVOICE_STATUS.UPCOMING] },
        due_date: { $lt: now },
      },
      { $set: { status: INVOICE_STATUS.OVERDUE } }
    );
    return { matched: res.matchedCount, modified: res.modifiedCount };
  }

  async list(
    options: IPaginationOptions,
    filters: {
      status?: string;
      client?: string;
      contract?: string;
      project?: string;
      search?: string;
    },
    user: IAuthUser
  ) {
    const { page, limit, skip, sortBy, sortOrder } =
      paginationHelpers.calculatePagination(options);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const cond: any = { is_Deleted: false, ...(await this.clientScope(user)) };
    if (filters.status) cond.status = filters.status;
    if (filters.client) cond.client = filters.client;
    if (filters.contract) cond.contract = filters.contract;
    if (filters.project) cond.project = filters.project;
    if (filters.search)
      cond.invoice_number = { $regex: filters.search, $options: "i" };

    const [data, total] = await Promise.all([
      InvoiceModel.find(cond)
        .populate(populateRefs)
        .sort({ [sortBy]: sortOrder === "desc" ? -1 : 1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      InvoiceModel.countDocuments(cond),
    ]);
    return { meta: { page, limit, total }, data };
  }

  async getById(id: string, user: IAuthUser) {
    const invoice = await InvoiceModel.findOne({
      _id: id,
      is_Deleted: false,
      ...(await this.clientScope(user)),
    }).populate(populateRefs);
    if (!invoice)
      throw new ApiError(HttpStatusCode.NOT_FOUND, "Invoice not found.");
    return invoice;
  }

  async update(id: string, data: Record<string, unknown>, user: IAuthUser) {
    const before = await InvoiceModel.findOne({
      _id: id,
      is_Deleted: false,
      ...(await this.clientScope(user)),
    });
    if (!before)
      throw new ApiError(HttpStatusCode.NOT_FOUND, "Invoice not found.");

    const currency = (data.currency as string) || before.currency;
    const lines =
      data.lines !== undefined
        ? this.buildLines(data.lines as LineInput[], currency)
        : before.lines;
    const discount =
      data.discount !== undefined
        ? money(data.discount as number | string, currency)
        : before.discount;
    const tax =
      data.tax !== undefined ? money(data.tax as number | string, currency) : before.tax;

    const issue_date = data.issue_date
      ? new Date(data.issue_date as string)
      : before.issue_date;
    const due_date = data.due_date
      ? new Date(data.due_date as string)
      : before.due_date;

    const { subtotal, total, amount_due } = this.totals(
      lines,
      discount,
      tax,
      before.amount_paid,
      currency
    );
    const base = (data.status as string) || this.baseOf(before.status);
    const status = this.deriveStatus(
      base,
      total,
      before.amount_paid,
      issue_date,
      due_date
    );

    const updated = await InvoiceModel.findByIdAndUpdate(
      id,
      {
        ...data,
        lines,
        currency,
        discount,
        tax,
        issue_date,
        due_date,
        subtotal,
        total,
        amount_due,
        status,
      },
      { new: true }
    ).populate(populateRefs);
    return { updated, before: before.toObject() };
  }

  private async setBase(id: string, base: string, user: IAuthUser) {
    const before = await InvoiceModel.findOne({
      _id: id,
      is_Deleted: false,
      ...(await this.clientScope(user)),
    });
    if (!before)
      throw new ApiError(HttpStatusCode.NOT_FOUND, "Invoice not found.");
    const status = this.deriveStatus(
      base,
      before.total,
      before.amount_paid,
      before.issue_date,
      before.due_date
    );
    const updated = await InvoiceModel.findByIdAndUpdate(
      id,
      { status },
      { new: true }
    ).populate(populateRefs);
    return { updated, before: before.toObject() };
  }

  async send(id: string, user: IAuthUser) {
    return this.setBase(id, INVOICE_STATUS.ISSUED, user);
  }

  async cancel(id: string, user: IAuthUser) {
    return this.setBase(id, INVOICE_STATUS.CANCELLED, user);
  }

  async remove(id: string, user: IAuthUser) {
    const invoice = await InvoiceModel.findOne({
      _id: id,
      is_Deleted: false,
      ...(await this.clientScope(user)),
    });
    if (!invoice)
      throw new ApiError(HttpStatusCode.NOT_FOUND, "Invoice not found.");
    await InvoiceModel.findByIdAndUpdate(id, { is_Deleted: true });
    return invoice;
  }

  /** Recompute amount_paid / amount_due / status from live payments. Called by
   *  the payment service after any payment change. */
  async recomputePayments(invoiceId: string) {
    const invoice = await InvoiceModel.findById(invoiceId);
    if (!invoice) return;
    const agg = await PaymentModel.aggregate([
      {
        $match: {
          invoice: new Types.ObjectId(invoiceId),
          is_Deleted: false,
        },
      },
      { $group: { _id: null, paid: { $sum: { $toDouble: "$amount.amount" } } } },
    ]);
    const paid = (agg[0]?.paid as number) || 0;
    const currency = invoice.currency;
    const amount_paid = money(paid, currency);
    const amount_due = subMoney(invoice.total, amount_paid);
    const status = this.deriveStatus(
      this.baseOf(invoice.status),
      invoice.total,
      amount_paid,
      invoice.issue_date,
      invoice.due_date
    );
    await InvoiceModel.findByIdAndUpdate(invoiceId, {
      amount_paid,
      amount_due,
      status,
    });
  }

  /** Open invoices (still owe money), newest-due first, plus scope totals. */
  async outstanding(
    options: IPaginationOptions,
    filters: { client?: string; search?: string },
    user: IAuthUser
  ) {
    const { page, limit, skip } = paginationHelpers.calculatePagination(options);
    const scope = await this.clientScope(user);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const cond: any = {
      is_Deleted: false,
      ...scope,
      status: { $in: OPEN_INVOICE_STATUSES },
    };
    if (filters.client) cond.client = filters.client;
    if (filters.search)
      cond.invoice_number = { $regex: filters.search, $options: "i" };

    const [data, total, summary] = await Promise.all([
      InvoiceModel.find(cond)
        .populate(populateRefs)
        .sort({ due_date: 1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      InvoiceModel.countDocuments(cond),
      invoiceFinancials(scope),
    ]);
    return { meta: { page, limit, total }, data, summary };
  }

  /** Confirmed upcoming income: open invoices due today or later, by month. */
  async upcoming(user: IAuthUser) {
    const scope = await this.clientScope(user);
    const now = new Date();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const match: any = {
      is_Deleted: false,
      ...scope,
      status: { $in: OPEN_INVOICE_STATUSES },
      due_date: { $gte: now },
    };
    const [byMonth, data] = await Promise.all([
      InvoiceModel.aggregate([
        { $match: match },
        {
          $group: {
            _id: { y: { $year: "$due_date" }, m: { $month: "$due_date" } },
            total: { $sum: { $toDouble: "$amount_due.amount" } },
            count: { $sum: 1 },
          },
        },
        { $sort: { "_id.y": 1, "_id.m": 1 } },
      ]),
      InvoiceModel.find(match)
        .populate(populateRefs)
        .sort({ due_date: 1 })
        .limit(100)
        .lean(),
    ]);
    const total = byMonth.reduce((s, b) => s + (b.total || 0), 0);
    return {
      total,
      by_month: byMonth.map((b) => ({
        year: b._id.y,
        month: b._id.m,
        total: b.total,
        count: b.count,
      })),
      data,
    };
  }
}

export const InvoiceService = new Invoice();
