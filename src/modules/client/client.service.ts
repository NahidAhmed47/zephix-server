import { Types } from "mongoose";
import ApiError from "@/middlewares/error";
import { HttpStatusCode } from "@/lib/httpStatus";
import { ClientModel } from "./client.model";
import { CLIENT_STATUS } from "./client.enum";
import { ContactModel } from "@/modules/contact/contact.model";
import { DealModel } from "@/modules/deal/deal.model";
import { OPEN_STAGES, DEAL_STAGE } from "@/modules/deal/deal.enum";
import { ContractModel } from "@/modules/contract/contract.model";
import { LIVE_CONTRACT_STATUSES } from "@/modules/contract/contract.enum";
import { ProjectModel } from "@/modules/project/project.model";
import { ACTIVE_PROJECT_STATUSES } from "@/modules/project/project.enum";
import { clientInvoiceFinancials } from "@/modules/invoice/invoice.finance";
import { RecurringBillingModel } from "@/modules/recurringBilling/recurringBilling.model";
import { ACTIVE_RECURRING_STATUSES } from "@/modules/recurringBilling/recurringBilling.enum";
import { scopeFilter } from "@/shared/scope";
import { IAuthUser } from "@/lib/rbac";
import { paginationHelpers } from "@/helpers/paginationHelpers";
import { IPaginationOptions } from "@/interfaces/pagination.interfaces";

const populateRefs = [
  { path: "account_manager", select: "name email" },
  { path: "created_by", select: "name email" },
];

class Service {
  private scope(user: IAuthUser) {
    return scopeFilter(user, "clients", {
      own: "created_by",
      assigned: "account_manager",
    });
  }

  async create(data: Record<string, unknown>, user: IAuthUser) {
    const doc = await ClientModel.create({
      ...data,
      created_by: user.id,
      account_manager: data.account_manager || user.id,
    });
    return ClientModel.findById(doc._id).populate(populateRefs);
  }

  async list(
    options: IPaginationOptions,
    filters: {
      status?: string;
      type?: string;
      source?: string;
      account_manager?: string;
      search?: string;
    },
    user: IAuthUser
  ) {
    const { page, limit, skip, sortBy, sortOrder } =
      paginationHelpers.calculatePagination(options);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const cond: any = { is_Deleted: false, ...this.scope(user) };
    if (filters.status) cond.status = filters.status;
    if (filters.type) cond.type = filters.type;
    if (filters.source) cond.source = filters.source;
    if (filters.account_manager) cond.account_manager = filters.account_manager;
    if (filters.search) {
      cond.$or = [
        { name: { $regex: filters.search, $options: "i" } },
        { email: { $regex: filters.search, $options: "i" } },
        { phone: { $regex: filters.search, $options: "i" } },
      ];
    }

    const [data, total] = await Promise.all([
      ClientModel.find(cond)
        .populate(populateRefs)
        .sort({ [sortBy]: sortOrder === "desc" ? -1 : 1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      ClientModel.countDocuments(cond),
    ]);
    return { meta: { page, limit, total }, data };
  }

  async getById(id: string, user: IAuthUser) {
    const client = await ClientModel.findOne({
      _id: id,
      is_Deleted: false,
      ...this.scope(user),
    }).populate(populateRefs);
    if (!client) throw new ApiError(HttpStatusCode.NOT_FOUND, "Client not found.");
    return client;
  }

  async update(id: string, data: Record<string, unknown>, user: IAuthUser) {
    const before = await ClientModel.findOne({
      _id: id,
      is_Deleted: false,
      ...this.scope(user),
    });
    if (!before) throw new ApiError(HttpStatusCode.NOT_FOUND, "Client not found.");
    const updated = await ClientModel.findByIdAndUpdate(id, data, {
      new: true,
    }).populate(populateRefs);
    return { updated, before: before.toObject() };
  }

  async remove(id: string, user: IAuthUser) {
    const client = await ClientModel.findOne({
      _id: id,
      is_Deleted: false,
      ...this.scope(user),
    });
    if (!client) throw new ApiError(HttpStatusCode.NOT_FOUND, "Client not found.");
    await ClientModel.findByIdAndUpdate(id, { is_Deleted: true });
    return client;
  }

  /** Throws 404 if the caller cannot access this client (used by other modules). */
  async assertAccess(id: string, user: IAuthUser) {
    const client = await ClientModel.findOne({
      _id: id,
      is_Deleted: false,
      ...this.scope(user),
    }).select("_id");
    if (!client) throw new ApiError(HttpStatusCode.NOT_FOUND, "Client not found.");
    return client;
  }

  /**
   * Promote a lead/prospect client to `active`. Called when a contract goes live
   * or a payment lands (spec §F8/A4). No-op for any other status and never
   * throws — activation must not break the operation that triggered it.
   */
  async markActive(
    clientId: string | Types.ObjectId | null | undefined
  ): Promise<void> {
    if (!clientId) return;
    try {
      await ClientModel.updateOne(
        {
          _id: clientId,
          is_Deleted: false,
          status: { $in: [CLIENT_STATUS.LEAD, CLIENT_STATUS.PROSPECT] },
        },
        { $set: { status: CLIENT_STATUS.ACTIVE } }
      );
    } catch (e) {
      console.error("[client] markActive failed:", (e as Error).message);
    }
  }

  /** null → caller can access all clients; otherwise the accessible ids. */
  async accessibleClientIds(user: IAuthUser): Promise<Types.ObjectId[] | null> {
    const scope = this.scope(user);
    if (Object.keys(scope).length === 0) return null;
    const ids = await ClientModel.find({ is_Deleted: false, ...scope }).distinct(
      "_id"
    );
    return ids as unknown as Types.ObjectId[];
  }

  /** 360° overview aggregates. Financial fields are wired up in later phases. */
  async summary(id: string, user: IAuthUser) {
    await this.assertAccess(id, user);
    const clientId = new Types.ObjectId(id);

    const [
      contactsCount,
      dealAgg,
      contractAgg,
      activeContracts,
      activeProjects,
      invoiceFin,
      recurringAgg,
    ] = await Promise.all([
      ContactModel.countDocuments({ client: clientId, is_Deleted: false }),
      DealModel.aggregate([
        { $match: { client: clientId, is_Deleted: false } },
        {
          $group: {
            _id: "$stage",
            count: { $sum: 1 },
            expected: { $sum: { $toDouble: "$expected_value.amount" } },
            weighted: { $sum: { $toDouble: "$weighted_value.amount" } },
          },
        },
      ]),
      ContractModel.aggregate([
        { $match: { client: clientId, is_Deleted: false } },
        {
          $group: {
            _id: null,
            total_value: { $sum: { $toDouble: "$total_value.amount" } },
            mrr: { $sum: { $toDouble: "$mrr_value.amount" } },
          },
        },
      ]),
      ContractModel.countDocuments({
        client: clientId,
        is_Deleted: false,
        status: { $in: LIVE_CONTRACT_STATUSES },
      }),
      ProjectModel.countDocuments({
        client: clientId,
        is_Deleted: false,
        status: { $in: ACTIVE_PROJECT_STATUSES },
      }),
      clientInvoiceFinancials(id),
      RecurringBillingModel.aggregate([
        {
          $match: {
            client: clientId,
            is_Deleted: false,
            status: { $in: ACTIVE_RECURRING_STATUSES },
          },
        },
        {
          $group: {
            _id: null,
            mrr: { $sum: { $toDouble: "$mrr_value.amount" } },
          },
        },
      ]),
    ]);

    let openCount = 0;
    let pipeline = 0;
    let weighted = 0;
    let won = 0;
    for (const g of dealAgg) {
      if (OPEN_STAGES.includes(g._id)) {
        openCount += g.count;
        pipeline += g.expected;
        weighted += g.weighted;
      }
      if (g._id === DEAL_STAGE.WON) won += g.expected;
    }

    const contractTotals = (contractAgg[0] as
      | { total_value?: number; mrr?: number }
      | undefined) || { total_value: 0, mrr: 0 };

    return {
      contacts_count: contactsCount,
      deals: {
        open_count: openCount,
        pipeline_value: pipeline,
        weighted_pipeline: weighted,
        won_value: won,
      },
      // contract value from contracts; invoiced/collected/outstanding/overdue
      // from invoices + payments; MRR from active recurring billing schedules.
      financials: {
        total_contract_value: contractTotals.total_value || 0,
        total_invoiced: invoiceFin.invoiced,
        total_collected: invoiceFin.collected,
        total_outstanding: invoiceFin.outstanding,
        overdue: invoiceFin.overdue,
        mrr: (recurringAgg[0]?.mrr as number) || 0,
      },
      active_projects: activeProjects,
      active_contracts: activeContracts,
    };
  }
}

export const ClientService = new Service();
