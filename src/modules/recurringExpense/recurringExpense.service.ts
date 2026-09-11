import ApiError from "@/middlewares/error";
import { HttpStatusCode } from "@/lib/httpStatus";
import { RecurringExpenseModel } from "./recurringExpense.model";
import {
  RECURRING_EXPENSE_STATUS,
  ACTIVE_RECURRING_EXPENSE_STATUSES,
} from "./recurringExpense.enum";
import { EXPENSE_CATEGORY } from "@/modules/expense/expense.enum";
import { PAYMENT_METHOD } from "@/modules/payment/payment.enum";
import { money, DEFAULT_CURRENCY } from "@/lib/money";
import { BILLING_FREQUENCY, nextBillingDate, mrrOf } from "@/lib/billing";
import { paginationHelpers } from "@/helpers/paginationHelpers";
import { IPaginationOptions } from "@/interfaces/pagination.interfaces";

// (recurring_expenses is not in SCOPED_MODULES → a global, company-wide list.)

class RecurringExpense {
  private computeNext(
    start: Date,
    frequency: string,
    customMonths: number,
    from = new Date()
  ): Date {
    if (start.getTime() >= from.getTime()) return start;
    return nextBillingDate(start, frequency, customMonths, from);
  }

  async create(data: Record<string, unknown>) {
    const currency = (data.currency as string) || DEFAULT_CURRENCY;
    const amount = money((data.amount as number | string) ?? 0, currency);
    const frequency = (data.frequency as string) || BILLING_FREQUENCY.MONTHLY;
    const customMonths = Number(data.custom_months ?? 1);
    const start = data.start_date ? new Date(data.start_date as string) : new Date();

    return RecurringExpenseModel.create({
      title: data.title,
      category: data.category || EXPENSE_CATEGORY.OTHER,
      amount,
      currency,
      frequency,
      custom_months: customMonths,
      start_date: start,
      end_date: data.end_date || null,
      next_date: this.computeNext(start, frequency, customMonths),
      vendor: data.vendor || "",
      method: data.method || PAYMENT_METHOD.BANK,
      monthly_value: mrrOf(amount, frequency, customMonths),
      status: data.status || RECURRING_EXPENSE_STATUS.ACTIVE,
      notes: data.notes || "",
    });
  }

  async list(
    options: IPaginationOptions,
    filters: { status?: string; category?: string; search?: string }
  ) {
    const { page, limit, skip, sortBy, sortOrder } =
      paginationHelpers.calculatePagination(options);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const cond: any = { is_Deleted: false };
    if (filters.status) cond.status = filters.status;
    if (filters.category) cond.category = filters.category;
    if (filters.search) cond.title = { $regex: filters.search, $options: "i" };

    const [data, total] = await Promise.all([
      RecurringExpenseModel.find(cond)
        .sort({ [sortBy === "createdAt" ? "next_date" : sortBy]: sortOrder === "desc" ? -1 : 1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      RecurringExpenseModel.countDocuments(cond),
    ]);
    return { meta: { page, limit, total }, data };
  }

  async getById(id: string) {
    const doc = await RecurringExpenseModel.findOne({
      _id: id,
      is_Deleted: false,
    });
    if (!doc)
      throw new ApiError(
        HttpStatusCode.NOT_FOUND,
        "Recurring expense not found."
      );
    return doc;
  }

  async update(id: string, data: Record<string, unknown>) {
    const before = await RecurringExpenseModel.findOne({
      _id: id,
      is_Deleted: false,
    });
    if (!before)
      throw new ApiError(
        HttpStatusCode.NOT_FOUND,
        "Recurring expense not found."
      );

    const currency = (data.currency as string) || before.currency;
    const frequency = (data.frequency as string) || before.frequency;
    const customMonths =
      data.custom_months !== undefined
        ? Number(data.custom_months)
        : before.custom_months;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const patch: any = { ...data };
    patch.currency = currency;

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
      patch.monthly_value = mrrOf(amount, frequency, customMonths);
    }
    if (data.start_date !== undefined || data.frequency !== undefined) {
      const start = data.start_date
        ? new Date(data.start_date as string)
        : before.start_date;
      patch.start_date = start;
      patch.next_date = this.computeNext(start, frequency, customMonths);
    }

    const updated = await RecurringExpenseModel.findByIdAndUpdate(id, patch, {
      new: true,
    });
    return { updated, before: before.toObject() };
  }

  async remove(id: string) {
    const doc = await RecurringExpenseModel.findOne({
      _id: id,
      is_Deleted: false,
    });
    if (!doc)
      throw new ApiError(
        HttpStatusCode.NOT_FOUND,
        "Recurring expense not found."
      );
    await RecurringExpenseModel.findByIdAndUpdate(id, { is_Deleted: true });
    return doc;
  }

  /** Monthly + annual recurring expense totals (spec §30). */
  async stats() {
    const agg = await RecurringExpenseModel.aggregate([
      {
        $match: {
          is_Deleted: false,
          status: { $in: ACTIVE_RECURRING_EXPENSE_STATUSES },
        },
      },
      {
        $group: {
          _id: null,
          monthly: { $sum: { $toDouble: "$monthly_value.amount" } },
          count: { $sum: 1 },
        },
      },
    ]);
    const monthly = (agg[0]?.monthly as number) || 0;
    return {
      active_count: (agg[0]?.count as number) || 0,
      monthly,
      annual: monthly * 12,
    };
  }
}

export const RecurringExpenseService = new RecurringExpense();
