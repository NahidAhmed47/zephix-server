import { DateTime } from "luxon";
import { InvoiceModel } from "@/modules/invoice/invoice.model";
import {
  INVOICE_STATUS,
  OPEN_INVOICE_STATUSES,
} from "@/modules/invoice/invoice.enum";
import { PaymentModel } from "@/modules/payment/payment.model";
import { ExpenseModel } from "@/modules/expense/expense.model";
import { RecurringBillingModel } from "@/modules/recurringBilling/recurringBilling.model";
import { ACTIVE_RECURRING_STATUSES } from "@/modules/recurringBilling/recurringBilling.enum";
import { RecurringExpenseModel } from "@/modules/recurringExpense/recurringExpense.model";
import { ACTIVE_RECURRING_EXPENSE_STATUSES } from "@/modules/recurringExpense/recurringExpense.enum";
import { DealModel } from "@/modules/deal/deal.model";
import { OPEN_STAGES } from "@/modules/deal/deal.enum";
import { IDateRange } from "@/shared/dateRange";

/* eslint-disable @typescript-eslint/no-explicit-any */

const num = (v: unknown): number => (typeof v === "number" ? v : 0);
const mKey = (y: number, m: number) => `${y}-${m}`;

/** Merge several monthly aggregations (each _id { y, m }) into unified rows. */
const mergeMonthly = (
  sources: { rows: any[]; key: string }[]
): Record<string, number>[] => {
  const map = new Map<string, any>();
  for (const { rows, key } of sources) {
    for (const r of rows) {
      const k = mKey(r._id.y, r._id.m);
      const entry = map.get(k) || { y: r._id.y, m: r._id.m };
      entry[key] = r[key];
      map.set(k, entry);
    }
  }
  return [...map.values()];
};

/** Produce a continuous monthly series over [start, end], filling gaps with 0. */
const fillMonths = (
  start: Date,
  end: Date,
  rows: Record<string, number>[],
  keys: string[]
) => {
  const map = new Map(rows.map((r) => [mKey(r.y, r.m), r]));
  const out: Record<string, any>[] = [];
  let cur = DateTime.local(start.getFullYear(), start.getMonth() + 1, 1);
  const last = DateTime.local(end.getFullYear(), end.getMonth() + 1, 1);
  let guard = 0;
  while (cur <= last && guard < 120) {
    const r = map.get(mKey(cur.year, cur.month));
    const entry: Record<string, any> = { label: cur.toFormat("MMM yy") };
    for (const key of keys) entry[key] = r ? num(r[key]) : 0;
    out.push(entry);
    cur = cur.plus({ months: 1 });
    guard++;
  }
  return out;
};

const NOT_CANCELLED = { $ne: INVOICE_STATUS.CANCELLED };

class Report {
  async revenue(range: IDateRange) {
    const inRange = {
      is_Deleted: false,
      status: NOT_CANCELLED,
      issue_date: { $gte: range.start, $lte: range.end },
    };
    const [invAgg, colAgg, outAgg, invMonth, colMonth] = await Promise.all([
      InvoiceModel.aggregate([
        { $match: inRange },
        { $group: { _id: null, v: { $sum: { $toDouble: "$total.amount" } } } },
      ]),
      PaymentModel.aggregate([
        {
          $match: {
            is_Deleted: false,
            payment_date: { $gte: range.start, $lte: range.end },
          },
        },
        { $group: { _id: null, v: { $sum: { $toDouble: "$amount.amount" } } } },
      ]),
      InvoiceModel.aggregate([
        { $match: { is_Deleted: false, status: { $in: OPEN_INVOICE_STATUSES } } },
        {
          $group: { _id: null, v: { $sum: { $toDouble: "$amount_due.amount" } } },
        },
      ]),
      InvoiceModel.aggregate([
        { $match: inRange },
        {
          $group: {
            _id: { y: { $year: "$issue_date" }, m: { $month: "$issue_date" } },
            invoiced: { $sum: { $toDouble: "$total.amount" } },
          },
        },
      ]),
      PaymentModel.aggregate([
        {
          $match: {
            is_Deleted: false,
            payment_date: { $gte: range.start, $lte: range.end },
          },
        },
        {
          $group: {
            _id: { y: { $year: "$payment_date" }, m: { $month: "$payment_date" } },
            collected: { $sum: { $toDouble: "$amount.amount" } },
          },
        },
      ]),
    ]);
    const by_month = fillMonths(
      range.start,
      range.end,
      mergeMonthly([
        { rows: invMonth, key: "invoiced" },
        { rows: colMonth, key: "collected" },
      ]),
      ["invoiced", "collected"]
    );
    return {
      invoiced: num(invAgg[0]?.v),
      collected: num(colAgg[0]?.v),
      outstanding: num(outAgg[0]?.v),
      by_month,
    };
  }

  async collections(range: IDateRange) {
    const match = {
      is_Deleted: false,
      payment_date: { $gte: range.start, $lte: range.end },
    };
    const [totalAgg, byMethod, byMonth] = await Promise.all([
      PaymentModel.aggregate([
        { $match: match },
        { $group: { _id: null, v: { $sum: { $toDouble: "$amount.amount" } } } },
      ]),
      PaymentModel.aggregate([
        { $match: match },
        {
          $group: {
            _id: "$method",
            total: { $sum: { $toDouble: "$amount.amount" } },
            count: { $sum: 1 },
          },
        },
        { $sort: { total: -1 } },
      ]),
      PaymentModel.aggregate([
        { $match: match },
        {
          $group: {
            _id: { y: { $year: "$payment_date" }, m: { $month: "$payment_date" } },
            collected: { $sum: { $toDouble: "$amount.amount" } },
          },
        },
      ]),
    ]);
    return {
      total: num(totalAgg[0]?.v),
      by_method: byMethod.map((r) => ({
        method: r._id,
        total: r.total,
        count: r.count,
      })),
      by_month: fillMonths(
        range.start,
        range.end,
        mergeMonthly([{ rows: byMonth, key: "collected" }]),
        ["collected"]
      ),
    };
  }

  async expenses(range: IDateRange) {
    const match = {
      is_Deleted: false,
      date: { $gte: range.start, $lte: range.end },
    };
    const [totalAgg, byCategory, byMonth] = await Promise.all([
      ExpenseModel.aggregate([
        { $match: match },
        { $group: { _id: null, v: { $sum: { $toDouble: "$amount.amount" } } } },
      ]),
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
        { $match: match },
        {
          $group: {
            _id: { y: { $year: "$date" }, m: { $month: "$date" } },
            expenses: { $sum: { $toDouble: "$amount.amount" } },
          },
        },
      ]),
    ]);
    return {
      total: num(totalAgg[0]?.v),
      by_category: byCategory.map((r) => ({
        category: r._id,
        total: r.total,
        count: r.count,
      })),
      by_month: fillMonths(
        range.start,
        range.end,
        mergeMonthly([{ rows: byMonth, key: "expenses" }]),
        ["expenses"]
      ),
    };
  }

  async mrrArr() {
    const [rb, re] = await Promise.all([
      RecurringBillingModel.aggregate([
        {
          $match: {
            is_Deleted: false,
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
      RecurringExpenseModel.aggregate([
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
          },
        },
      ]),
    ]);
    const mrr = num(rb[0]?.mrr);
    const recurringExpense = num(re[0]?.monthly);
    return {
      mrr,
      arr: mrr * 12,
      active_schedules: num(rb[0]?.count),
      recurring_expense_monthly: recurringExpense,
      net_recurring_monthly: mrr - recurringExpense,
      net_recurring_annual: (mrr - recurringExpense) * 12,
    };
  }

  async forecast(months = 6, now: Date = new Date()) {
    const [confirmed, recurring, pipeline] = await Promise.all([
      InvoiceModel.aggregate([
        {
          $match: {
            is_Deleted: false,
            status: { $in: OPEN_INVOICE_STATUSES },
            due_date: { $gte: now },
          },
        },
        {
          $group: {
            _id: { y: { $year: "$due_date" }, m: { $month: "$due_date" } },
            confirmed: { $sum: { $toDouble: "$amount_due.amount" } },
          },
        },
      ]),
      RecurringBillingModel.aggregate([
        {
          $match: {
            is_Deleted: false,
            status: { $in: ACTIVE_RECURRING_STATUSES },
            next_billing_date: { $gte: now },
          },
        },
        {
          $group: {
            _id: {
              y: { $year: "$next_billing_date" },
              m: { $month: "$next_billing_date" },
            },
            recurring: { $sum: { $toDouble: "$amount.amount" } },
          },
        },
      ]),
      DealModel.aggregate([
        {
          $match: {
            is_Deleted: false,
            stage: { $in: OPEN_STAGES },
            expected_close_date: { $gte: now },
          },
        },
        {
          $group: {
            _id: {
              y: { $year: "$expected_close_date" },
              m: { $month: "$expected_close_date" },
            },
            pipeline: { $sum: { $toDouble: "$weighted_value.amount" } },
          },
        },
      ]),
    ]);
    const end = new Date(now.getFullYear(), now.getMonth() + months, 1);
    const by_month = fillMonths(
      now,
      end,
      mergeMonthly([
        { rows: confirmed, key: "confirmed" },
        { rows: recurring, key: "recurring" },
        { rows: pipeline, key: "pipeline" },
      ]),
      ["confirmed", "recurring", "pipeline"]
    );
    return { by_month };
  }

  async serviceRevenue(range: IDateRange) {
    const [rev, mrr] = await Promise.all([
      InvoiceModel.aggregate([
        {
          $match: {
            is_Deleted: false,
            status: NOT_CANCELLED,
            issue_date: { $gte: range.start, $lte: range.end },
          },
        },
        { $unwind: "$lines" },
        { $match: { "lines.service": { $ne: null } } },
        {
          $group: {
            _id: "$lines.service",
            revenue: { $sum: { $toDouble: "$lines.amount.amount" } },
          },
        },
        {
          $lookup: {
            from: "services",
            localField: "_id",
            foreignField: "_id",
            as: "svc",
          },
        },
        { $unwind: { path: "$svc", preserveNullAndEmptyArrays: true } },
        {
          $project: {
            _id: 0,
            service_id: "$_id",
            name: { $ifNull: ["$svc.name", "Unknown"] },
            revenue: 1,
          },
        },
        { $sort: { revenue: -1 } },
      ]),
      RecurringBillingModel.aggregate([
        {
          $match: {
            is_Deleted: false,
            status: { $in: ACTIVE_RECURRING_STATUSES },
            service: { $ne: null },
          },
        },
        {
          $group: { _id: "$service", mrr: { $sum: { $toDouble: "$mrr_value.amount" } } },
        },
      ]),
    ]);
    const mrrMap = new Map(mrr.map((r) => [String(r._id), r.mrr]));
    return {
      by_service: rev.map((r) => ({
        ...r,
        service_id: String(r.service_id),
        mrr: num(mrrMap.get(String(r.service_id))),
      })),
    };
  }

  async clientRevenue(range: IDateRange) {
    const by_client = await InvoiceModel.aggregate([
      {
        $match: {
          is_Deleted: false,
          status: NOT_CANCELLED,
          issue_date: { $gte: range.start, $lte: range.end },
        },
      },
      {
        $group: {
          _id: "$client",
          invoiced: { $sum: { $toDouble: "$total.amount" } },
          collected: { $sum: { $toDouble: "$amount_paid.amount" } },
          outstanding: { $sum: { $toDouble: "$amount_due.amount" } },
        },
      },
      {
        $lookup: {
          from: "clients",
          localField: "_id",
          foreignField: "_id",
          as: "c",
        },
      },
      { $unwind: { path: "$c", preserveNullAndEmptyArrays: true } },
      {
        $project: {
          _id: 0,
          client_id: "$_id",
          name: { $ifNull: ["$c.name", "Unknown"] },
          invoiced: 1,
          collected: 1,
          outstanding: 1,
        },
      },
      { $sort: { invoiced: -1 } },
      { $limit: 50 },
    ]);
    return { by_client };
  }

  async profitability(range: IDateRange) {
    const [revenue, costs] = await Promise.all([
      InvoiceModel.aggregate([
        {
          $match: {
            is_Deleted: false,
            status: NOT_CANCELLED,
            issue_date: { $gte: range.start, $lte: range.end },
          },
        },
        {
          $group: {
            _id: "$client",
            revenue: { $sum: { $toDouble: "$total.amount" } },
          },
        },
      ]),
      ExpenseModel.aggregate([
        {
          $match: {
            is_Deleted: false,
            client: { $ne: null },
            date: { $gte: range.start, $lte: range.end },
          },
        },
        {
          $group: {
            _id: "$client",
            cost: { $sum: { $toDouble: "$amount.amount" } },
          },
        },
      ]),
    ]);
    const costMap = new Map(costs.map((r) => [String(r._id), r.cost]));
    const ids = revenue.map((r) => r._id);
    // resolve client names
    const { ClientModel } = await import("@/modules/client/client.model");
    const clients = await ClientModel.find({ _id: { $in: ids } })
      .select("name")
      .lean();
    const nameMap = new Map(clients.map((c) => [String(c._id), c.name]));
    const by_client = revenue
      .map((r) => {
        const rev = num(r.revenue);
        const cost = num(costMap.get(String(r._id)));
        const gross = rev - cost;
        return {
          client_id: String(r._id),
          name: nameMap.get(String(r._id)) || "Unknown",
          revenue: rev,
          cost,
          gross_profit: gross,
          margin: rev > 0 ? Math.round((gross / rev) * 1000) / 10 : 0,
        };
      })
      .sort((a, b) => b.gross_profit - a.gross_profit);
    return { by_client };
  }

  async outstandingAging() {
    const rows = await InvoiceModel.aggregate([
      { $match: { is_Deleted: false, status: { $in: OPEN_INVOICE_STATUSES } } },
      {
        $project: {
          due: { $toDouble: "$amount_due.amount" },
          days: {
            $dateDiff: { startDate: "$due_date", endDate: "$$NOW", unit: "day" },
          },
        },
      },
      {
        $addFields: {
          bucket: {
            $switch: {
              branches: [
                { case: { $lt: ["$days", 1] }, then: "current" },
                { case: { $lte: ["$days", 30] }, then: "1-30" },
                { case: { $lte: ["$days", 60] }, then: "31-60" },
                { case: { $lte: ["$days", 90] }, then: "61-90" },
              ],
              default: "90+",
            },
          },
        },
      },
      {
        $group: { _id: "$bucket", total: { $sum: "$due" }, count: { $sum: 1 } },
      },
    ]);
    const order = ["current", "1-30", "31-60", "61-90", "90+"];
    const map = new Map(rows.map((r) => [r._id, r]));
    const buckets = order.map((b) => ({
      bucket: b,
      total: num(map.get(b)?.total),
      count: num(map.get(b)?.count),
    }));
    const total = buckets.reduce((s, b) => s + b.total, 0);
    return { total, buckets };
  }
}

export const ReportService = new Report();
