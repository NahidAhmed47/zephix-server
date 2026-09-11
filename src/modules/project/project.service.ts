import ApiError from "@/middlewares/error";
import { HttpStatusCode } from "@/lib/httpStatus";
import { ProjectModel } from "./project.model";
import { PROJECT_STATUS, PROJECT_PRIORITY } from "./project.enum";
import { ContractModel } from "@/modules/contract/contract.model";
import { ClientService } from "@/modules/client/client.service";
import { scopeFilter } from "@/shared/scope";
import { IAuthUser } from "@/lib/rbac";
import { money, decimal128ToNumber, DEFAULT_CURRENCY } from "@/lib/money";
import { projectInvoiceFinancials } from "@/modules/invoice/invoice.finance";
import { MESSAGING_PREF } from "@/modules/client/client.enum";
import { paginationHelpers } from "@/helpers/paginationHelpers";
import { IPaginationOptions } from "@/interfaces/pagination.interfaces";

const populateRefs = [
  { path: "client", select: "name" },
  { path: "contract", select: "contract_number name" },
  { path: "project_manager", select: "name email" },
  { path: "team", select: "name email" },
  { path: "services", select: "name" },
  { path: "created_by", select: "name email" },
];

class Project {
  private scope(user: IAuthUser) {
    return scopeFilter(user, "projects", {
      own: "created_by",
      assigned: "project_manager",
    });
  }

  async create(data: Record<string, unknown>, user: IAuthUser) {
    await ClientService.assertAccess(String(data.client), user);
    const currency = (data.currency as string) || DEFAULT_CURRENCY;
    const msg = data.messaging as { sms?: string; email?: string } | undefined;

    const doc = await ProjectModel.create({
      name: data.name,
      client: data.client,
      contract: data.contract || null,
      services: (data.services as string[]) || [],
      project_manager: data.project_manager || user.id,
      team: (data.team as string[]) || [],
      start_date: data.start_date || null,
      deadline: data.deadline || null,
      status: data.status || PROJECT_STATUS.PLANNING,
      priority: data.priority || PROJECT_PRIORITY.MEDIUM,
      budget: money((data.budget as string | number) ?? 0, currency),
      messaging: {
        sms: msg?.sms || MESSAGING_PREF.INHERIT,
        email: msg?.email || MESSAGING_PREF.INHERIT,
      },
      notes: data.notes || "",
      created_by: user.id,
    });
    return this.getById(String(doc._id), user);
  }

  async list(
    options: IPaginationOptions,
    filters: {
      status?: string;
      client?: string;
      contract?: string;
      priority?: string;
      project_manager?: string;
      search?: string;
    },
    user: IAuthUser
  ) {
    const { page, limit, skip, sortBy, sortOrder } =
      paginationHelpers.calculatePagination(options);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const cond: any = { is_Deleted: false, ...this.scope(user) };
    if (filters.status) cond.status = filters.status;
    if (filters.client) cond.client = filters.client;
    if (filters.contract) cond.contract = filters.contract;
    if (filters.priority) cond.priority = filters.priority;
    if (filters.project_manager) cond.project_manager = filters.project_manager;
    if (filters.search) cond.name = { $regex: filters.search, $options: "i" };

    const [data, total] = await Promise.all([
      ProjectModel.find(cond)
        .populate(populateRefs)
        .sort({ [sortBy]: sortOrder === "desc" ? -1 : 1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      ProjectModel.countDocuments(cond),
    ]);
    return { meta: { page, limit, total }, data };
  }

  async getById(id: string, user: IAuthUser) {
    const project = await ProjectModel.findOne({
      _id: id,
      is_Deleted: false,
      ...this.scope(user),
    }).populate(populateRefs);
    if (!project)
      throw new ApiError(HttpStatusCode.NOT_FOUND, "Project not found.");
    return project;
  }

  /** Financial summary. Invoiced/collected land in Phase 4; budget & contract
   *  value are real today. */
  async summary(id: string, user: IAuthUser) {
    const project = await ProjectModel.findOne({
      _id: id,
      is_Deleted: false,
      ...this.scope(user),
    });
    if (!project)
      throw new ApiError(HttpStatusCode.NOT_FOUND, "Project not found.");

    let contract_value = 0;
    if (project.contract) {
      const contract = await ContractModel.findById(project.contract).select(
        "total_value"
      );
      if (contract) contract_value = decimal128ToNumber(contract.total_value.amount);
    }

    const fin = await projectInvoiceFinancials(id);
    return {
      budget: decimal128ToNumber(project.budget.amount),
      contract_value,
      invoiced: fin.invoiced,
      collected: fin.collected,
      outstanding: fin.outstanding,
      remaining: Math.max(0, contract_value - fin.invoiced),
    };
  }

  async update(id: string, data: Record<string, unknown>, user: IAuthUser) {
    const before = await ProjectModel.findOne({
      _id: id,
      is_Deleted: false,
      ...this.scope(user),
    });
    if (!before)
      throw new ApiError(HttpStatusCode.NOT_FOUND, "Project not found.");
    if (data.client) await ClientService.assertAccess(String(data.client), user);

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const patch: any = { ...data };
    if (data.budget !== undefined || data.currency !== undefined) {
      const currency = (data.currency as string) || before.budget.currency;
      const amount =
        data.budget !== undefined
          ? (data.budget as string | number)
          : before.budget.amount.toString();
      patch.budget = money(amount, currency);
    }
    delete patch.currency;

    const msg = data.messaging as { sms?: string; email?: string } | undefined;
    if (msg) {
      patch.messaging = {
        sms: msg.sms || before.messaging.sms,
        email: msg.email || before.messaging.email,
      };
    }

    await ProjectModel.findByIdAndUpdate(id, patch);
    return { updated: await this.getById(id, user), before: before.toObject() };
  }

  async remove(id: string, user: IAuthUser) {
    const project = await ProjectModel.findOne({
      _id: id,
      is_Deleted: false,
      ...this.scope(user),
    });
    if (!project)
      throw new ApiError(HttpStatusCode.NOT_FOUND, "Project not found.");
    await ProjectModel.findByIdAndUpdate(id, { is_Deleted: true });
    return project;
  }
}

export const ProjectService = new Project();
