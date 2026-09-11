import { ReportService } from "@/modules/report/report.service";
import { InvoiceModel } from "@/modules/invoice/invoice.model";
import { OPEN_INVOICE_STATUSES } from "@/modules/invoice/invoice.enum";
import { ClientModel } from "@/modules/client/client.model";
import { CLIENT_STATUS } from "@/modules/client/client.enum";
import { ProjectModel } from "@/modules/project/project.model";
import { ACTIVE_PROJECT_STATUSES } from "@/modules/project/project.enum";
import { HostingModel } from "@/modules/hosting/hosting.model";
import { ContractModel } from "@/modules/contract/contract.model";
import { LIVE_CONTRACT_STATUSES } from "@/modules/contract/contract.enum";
import { DealModel } from "@/modules/deal/deal.model";
import { OPEN_STAGES, DEAL_STAGE } from "@/modules/deal/deal.enum";
import { AuditLogModel } from "@/modules/auditLog/auditLog.model";

/* eslint-disable @typescript-eslint/no-explicit-any */
const num = (v: unknown): number => (typeof v === "number" ? v : 0);
const soonestExpiry = (r: any): number => {
  const t = [r.domain_expiry, r.hosting_expiry, r.ssl_expiry]
    .filter(Boolean)
    .map((d: any) => new Date(d).getTime());
  return t.length ? Math.min(...t) : Number.MAX_SAFE_INTEGER;
};

class Dashboard {
  /** The management command center (spec §47). All data is global (gated by
   *  reports.view). Composed from ReportService + a few direct queries. */
  async summary() {
    const now = new Date();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const monthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 1);
    const trendStart = new Date(now.getFullYear(), now.getMonth() - 5, 1);
    const in90 = new Date(now.getTime() + 90 * 86400000);

    const [
      revThisMonth,
      revTrend,
      mrr,
      expTrend,
      activeClients,
      activeProjects,
      overdueAgg,
      upcomingAgg,
      overdueList,
      renewals,
      pipelineAgg,
      recent,
      serviceRev,
      hostingExpiring,
    ] = await Promise.all([
      ReportService.revenue({ start: monthStart, end: now }),
      ReportService.revenue({ start: trendStart, end: now }),
      ReportService.mrrArr(),
      ReportService.expenses({ start: trendStart, end: now }),
      ClientModel.countDocuments({
        is_Deleted: false,
        status: CLIENT_STATUS.ACTIVE,
      }),
      ProjectModel.countDocuments({
        is_Deleted: false,
        status: { $in: ACTIVE_PROJECT_STATUSES },
      }),
      InvoiceModel.aggregate([
        {
          $match: {
            is_Deleted: false,
            status: { $in: OPEN_INVOICE_STATUSES },
            due_date: { $lt: now },
          },
        },
        { $group: { _id: null, total: { $sum: { $toDouble: "$amount_due.amount" } } } },
      ]),
      InvoiceModel.aggregate([
        {
          $match: {
            is_Deleted: false,
            status: { $in: OPEN_INVOICE_STATUSES },
            due_date: { $gte: now, $lt: monthEnd },
          },
        },
        { $group: { _id: null, total: { $sum: { $toDouble: "$amount_due.amount" } } } },
      ]),
      InvoiceModel.find({
        is_Deleted: false,
        status: { $in: OPEN_INVOICE_STATUSES },
        due_date: { $lt: now },
      })
        .populate({ path: "client", select: "name" })
        .sort({ due_date: 1 })
        .limit(5)
        .lean(),
      ContractModel.find({
        is_Deleted: false,
        status: { $in: LIVE_CONTRACT_STATUSES },
        end_date: { $gte: now, $lte: in90 },
      })
        .populate({ path: "client", select: "name" })
        .sort({ end_date: 1 })
        .limit(5)
        .lean(),
      DealModel.aggregate([
        { $match: { is_Deleted: false } },
        {
          $group: {
            _id: "$stage",
            count: { $sum: 1 },
            value: { $sum: { $toDouble: "$expected_value.amount" } },
            weighted: { $sum: { $toDouble: "$weighted_value.amount" } },
          },
        },
      ]),
      AuditLogModel.find({}).sort({ createdAt: -1 }).limit(8).lean(),
      ReportService.serviceRevenue({
        start: new Date(now.getFullYear(), 0, 1),
        end: now,
      }),
      HostingModel.find({
        is_Deleted: false,
        $or: [
          { domain_expiry: { $lte: in90 } },
          { hosting_expiry: { $lte: in90 } },
          { ssl_expiry: { $lte: in90 } },
        ],
      })
        .select(
          "name type client domain_expiry hosting_expiry ssl_expiry provider server_location status"
        )
        .populate({ path: "client", select: "name" })
        .lean(),
    ]);

    let totalPipeline = 0;
    let weightedPipeline = 0;
    let openCount = 0;
    let wonValue = 0;
    for (const g of pipelineAgg as any[]) {
      if (OPEN_STAGES.includes(g._id)) {
        totalPipeline += num(g.value);
        weightedPipeline += num(g.weighted);
        openCount += num(g.count);
      }
      if (g._id === DEAL_STAGE.WON) wonValue += num(g.value);
    }

    return {
      revenue_this_month: revThisMonth.invoiced,
      collected_this_month: revThisMonth.collected,
      outstanding: revThisMonth.outstanding,
      overdue: num((overdueAgg as any[])[0]?.total),
      upcoming_income: num((upcomingAgg as any[])[0]?.total),
      mrr: mrr.mrr,
      arr: mrr.arr,
      active_clients: activeClients,
      active_projects: activeProjects,
      revenue_trend: revTrend.by_month,
      expense_trend: expTrend.by_month,
      overdue_payments: overdueList,
      contract_renewals: renewals,
      hosting_expiring: (hostingExpiring as any[])
        .sort((a, b) => soonestExpiry(a) - soonestExpiry(b))
        .slice(0, 6),
      service_revenue: serviceRev.by_service.slice(0, 6),
      pipeline: {
        by_stage: (pipelineAgg as any[]).map((g) => ({
          stage: g._id,
          count: g.count,
          value: g.value,
          weighted: g.weighted,
        })),
        total_pipeline: totalPipeline,
        weighted_pipeline: weightedPipeline,
        won_value: wonValue,
        open_count: openCount,
      },
      recent_activity: recent,
    };
  }
}

export const DashboardService = new Dashboard();
