import ApiError from "@/middlewares/error";
import { HttpStatusCode } from "@/lib/httpStatus";
import { PaymentModel } from "./payment.model";
import { PAYMENT_METHOD } from "./payment.enum";
import { InvoiceModel } from "@/modules/invoice/invoice.model";
import { InvoiceService } from "@/modules/invoice/invoice.service";
import { ClientService } from "@/modules/client/client.service";
import { SettingModel } from "@/modules/setting/setting.model";
import { IAuthUser } from "@/lib/rbac";
import { money } from "@/lib/money";
import { paginationHelpers } from "@/helpers/paginationHelpers";
import { IPaginationOptions } from "@/interfaces/pagination.interfaces";

const populateRefs = [
  { path: "invoice", select: "invoice_number total amount_due status" },
  { path: "client", select: "name" },
  { path: "received_by", select: "name email" },
];

class Payment {
  /** Payments follow client data access (spec §41). */
  private async clientScope(user: IAuthUser) {
    const ids = await ClientService.accessibleClientIds(user);
    if (ids === null) return {};
    return { client: { $in: ids } };
  }

  private async genPaymentNumber(): Promise<string> {
    const setting = await SettingModel.findOne({ key: "global" }).select(
      "finance.payment_prefix"
    );
    const prefix = setting?.finance?.payment_prefix || "PAY";
    const year = new Date().getFullYear();
    const stem = `${prefix}-${year}-`;
    const count = await PaymentModel.countDocuments({
      payment_number: { $regex: `^${stem}` },
    });
    return `${stem}${String(count + 1).padStart(4, "0")}`;
  }

  async create(data: Record<string, unknown>, user: IAuthUser) {
    const invoice = await InvoiceModel.findOne({
      _id: data.invoice,
      is_Deleted: false,
    });
    if (!invoice)
      throw new ApiError(HttpStatusCode.NOT_FOUND, "Invoice not found.");
    await ClientService.assertAccess(String(invoice.client), user);

    const currency = invoice.currency;
    const payment_number = await this.genPaymentNumber();
    const doc = await PaymentModel.create({
      payment_number,
      invoice: invoice._id,
      client: invoice.client,
      contract: invoice.contract || null,
      project: invoice.project || null,
      amount: money((data.amount as number | string) ?? 0, currency),
      payment_date: data.payment_date
        ? new Date(data.payment_date as string)
        : new Date(),
      method: data.method || PAYMENT_METHOD.BANK,
      transaction_id: data.transaction_id || "",
      reference: data.reference || "",
      received_by: data.received_by || user.id,
      notes: data.notes || "",
      attachment: data.attachment || "",
      created_by: user.id,
    });

    await InvoiceService.recomputePayments(String(invoice._id));
    return this.getById(String(doc._id), user);
  }

  async list(
    options: IPaginationOptions,
    filters: {
      invoice?: string;
      client?: string;
      method?: string;
      search?: string;
    },
    user: IAuthUser
  ) {
    const { page, limit, skip, sortBy, sortOrder } =
      paginationHelpers.calculatePagination(options);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const cond: any = { is_Deleted: false, ...(await this.clientScope(user)) };
    if (filters.invoice) cond.invoice = filters.invoice;
    if (filters.client) cond.client = filters.client;
    if (filters.method) cond.method = filters.method;
    if (filters.search)
      cond.payment_number = { $regex: filters.search, $options: "i" };

    const [data, total] = await Promise.all([
      PaymentModel.find(cond)
        .populate(populateRefs)
        .sort({ [sortBy === "createdAt" ? "payment_date" : sortBy]: sortOrder === "desc" ? -1 : 1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      PaymentModel.countDocuments(cond),
    ]);
    return { meta: { page, limit, total }, data };
  }

  async getById(id: string, user: IAuthUser) {
    const payment = await PaymentModel.findOne({
      _id: id,
      is_Deleted: false,
      ...(await this.clientScope(user)),
    }).populate(populateRefs);
    if (!payment)
      throw new ApiError(HttpStatusCode.NOT_FOUND, "Payment not found.");
    return payment;
  }

  async update(id: string, data: Record<string, unknown>, user: IAuthUser) {
    const before = await PaymentModel.findOne({
      _id: id,
      is_Deleted: false,
      ...(await this.clientScope(user)),
    });
    if (!before)
      throw new ApiError(HttpStatusCode.NOT_FOUND, "Payment not found.");

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const patch: any = { ...data };
    delete patch.invoice;
    delete patch.currency;
    if (data.amount !== undefined)
      patch.amount = money(data.amount as number | string, before.amount.currency);
    if (data.payment_date)
      patch.payment_date = new Date(data.payment_date as string);

    const updated = await PaymentModel.findByIdAndUpdate(id, patch, {
      new: true,
    }).populate(populateRefs);
    await InvoiceService.recomputePayments(String(before.invoice));
    return { updated, before: before.toObject() };
  }

  async remove(id: string, user: IAuthUser) {
    const payment = await PaymentModel.findOne({
      _id: id,
      is_Deleted: false,
      ...(await this.clientScope(user)),
    });
    if (!payment)
      throw new ApiError(HttpStatusCode.NOT_FOUND, "Payment not found.");
    await PaymentModel.findByIdAndUpdate(id, { is_Deleted: true });
    await InvoiceService.recomputePayments(String(payment.invoice));
    return payment;
  }
}

export const PaymentService = new Payment();
