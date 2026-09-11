import { Types } from "mongoose";
import ApiError from "@/middlewares/error";
import { HttpStatusCode } from "@/lib/httpStatus";
import { ExpenseModel } from "./expense.model";
import { EXPENSE_CATEGORY } from "./expense.enum";
import { PAYMENT_METHOD } from "@/modules/payment/payment.enum";
import { scopeFilter } from "@/shared/scope";
import { IAuthUser } from "@/lib/rbac";
import { money, DEFAULT_CURRENCY } from "@/lib/money";
import { paginationHelpers } from "@/helpers/paginationHelpers";
import { IPaginationOptions } from "@/interfaces/pagination.interfaces";

const populateRefs = [
  { path: "client", select: "name" },
  { path: "project", select: "name" },
  { path: "created_by", select: "name email" },
];

class Expense {
  private scope(user: IAuthUser) {
    return scopeFilter(user, "expenses", {
      own: "created_by",
      assigned: "created_by",
    });
  }

  /** ObjectId-cast scope for aggregation $match (which does not auto-cast). */
  private aggScope(user: IAuthUser) {
    const scope = this.scope(user);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const match: any = {};
    for (const [k, v] of Object.entries(scope)) {
      match[k] =
        typeof v === "string" && Types.ObjectId.isValid(v)
          ? new Types.ObjectId(v)
          : v;
    }
    return match;
  }

  async create(data: Record<string, unknown>, user: IAuthUser) {
    const currency = (data.currency as string) || DEFAULT_CURRENCY;
    const doc = await ExpenseModel.create({
      title: data.title,
      category: data.category || EXPENSE_CATEGORY.OTHER,
      amount: money((data.amount as number | string) ?? 0, currency),
      currency,
      date: data.date ? new Date(data.date as string) : new Date(),
      vendor: data.vendor || "",
      method: data.method || PAYMENT_METHOD.BANK,
      client: data.client || null,
      project: data.project || null,
      notes: data.notes || "",
      attachment: data.attachment || "",
      created_by: user.id,
    });
    return ExpenseModel.findById(doc._id).populate(populateRefs);
  }

  async list(
    options: IPaginationOptions,
    filters: {
      category?: string;
      client?: string;
      project?: string;
      search?: string;
    },
    user: IAuthUser
  ) {
    const { page, limit, skip, sortBy, sortOrder } =
      paginationHelpers.calculatePagination(options);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const cond: any = { is_Deleted: false, ...this.scope(user) };
    if (filters.category) cond.category = filters.category;
    if (filters.client) cond.client = filters.client;
    if (filters.project) cond.project = filters.project;
    if (filters.search) cond.title = { $regex: filters.search, $options: "i" };

    const [data, total] = await Promise.all([
      ExpenseModel.find(cond)
        .populate(populateRefs)
        .sort({ [sortBy === "createdAt" ? "date" : sortBy]: sortOrder === "desc" ? -1 : 1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      ExpenseModel.countDocuments(cond),
    ]);
    return { meta: { page, limit, total }, data };
  }

  async getById(id: string, user: IAuthUser) {
    const expense = await ExpenseModel.findOne({
      _id: id,
      is_Deleted: false,
      ...this.scope(user),
    }).populate(populateRefs);
    if (!expense)
      throw new ApiError(HttpStatusCode.NOT_FOUND, "Expense not found.");
    return expense;
  }

  async update(id: string, data: Record<string, unknown>, user: IAuthUser) {
    const before = await ExpenseModel.findOne({
      _id: id,
      is_Deleted: false,
      ...this.scope(user),
    });
    if (!before)
      throw new ApiError(HttpStatusCode.NOT_FOUND, "Expense not found.");

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const patch: any = { ...data };
    const currency = (data.currency as string) || before.currency;
    if (data.amount !== undefined || data.currency !== undefined) {
      const amount =
        data.amount !== undefined
          ? (data.amount as number | string)
          : before.amount.amount.toString();
      patch.amount = money(amount, currency);
      patch.currency = currency;
    }
    if (data.date) patch.date = new Date(data.date as string);

    const updated = await ExpenseModel.findByIdAndUpdate(id, patch, {
      new: true,
    }).populate(populateRefs);
    return { updated, before: before.toObject() };
  }

  async remove(id: string, user: IAuthUser) {
    const expense = await ExpenseModel.findOne({
      _id: id,
      is_Deleted: false,
      ...this.scope(user),
    });
    if (!expense)
      throw new ApiError(HttpStatusCode.NOT_FOUND, "Expense not found.");
    await ExpenseModel.findByIdAndUpdate(id, { is_Deleted: true });
    return expense;
  }

  /** Totals by category + this month (spec §32). */
  async stats(user: IAuthUser) {
    const match = { is_Deleted: false, ...this.aggScope(user) };
    const now = new Date();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const monthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 1);

    const [byCategory, monthAgg] = await Promise.all([
      ExpenseModel.aggregate([
        { $match: match },
        {
          $group: {
            _id: "$category",
            total: { $sum: { $toDouble: "$amount.amount" } },
            count: { $sum: 1 },
          },
        },
        { $sort: { total: -1 } },
      ]),
      ExpenseModel.aggregate([
        { $match: { ...match, date: { $gte: monthStart, $lt: monthEnd } } },
        {
          $group: {
            _id: null,
            total: { $sum: { $toDouble: "$amount.amount" } },
          },
        },
      ]),
    ]);

    const total = byCategory.reduce((s, c) => s + (c.total || 0), 0);
    return {
      total,
      this_month: (monthAgg[0]?.total as number) || 0,
      by_category: byCategory.map((c) => ({
        category: c._id,
        total: c.total,
        count: c.count,
      })),
    };
  }
}

export const ExpenseService = new Expense();
