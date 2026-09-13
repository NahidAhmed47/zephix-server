import { Types } from "mongoose";
import ApiError from "@/middlewares/error";
import { HttpStatusCode } from "@/lib/httpStatus";
import { DealModel } from "./deal.model";
import { DEAL_STAGE, OPEN_STAGES } from "./deal.enum";
import { ClientService } from "@/modules/client/client.service";
import { ContractService } from "@/modules/contract/contract.service";
import { scopeFilter } from "@/shared/scope";
import { IAuthUser } from "@/lib/rbac";
import {
  money,
  mulMoney,
  decimal128ToString,
  DEFAULT_CURRENCY,
} from "@/lib/money";
import { paginationHelpers } from "@/helpers/paginationHelpers";
import { IPaginationOptions } from "@/interfaces/pagination.interfaces";

const populateRefs = [
  { path: "client", select: "name" },
  { path: "owner", select: "name email" },
];

class Service {
  private scope(user: IAuthUser) {
    return scopeFilter(user, "deals", { own: "created_by", assigned: "owner" });
  }

  /** Convert a scope filter's string ids to ObjectId for use in aggregations. */
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

  private weighted(amount: string | number, currency: string, probability: number) {
    return mulMoney(money(amount, currency), (Number(probability) || 0) / 100);
  }

  async create(data: Record<string, unknown>, user: IAuthUser) {
    const currency = (data.currency as string) || DEFAULT_CURRENCY;
    if (data.client) await ClientService.assertAccess(String(data.client), user);
    const expectedAmount = (data.expected_value as string | number) ?? 0;
    const probability = Number(data.probability ?? 0);

    const doc = await DealModel.create({
      name: data.name,
      client: data.client || null,
      lead_name: data.lead_name || "",
      service: data.service || null,
      expected_value: money(expectedAmount, currency),
      probability,
      weighted_value: this.weighted(expectedAmount, currency, probability),
      expected_close_date: data.expected_close_date || null,
      stage: data.stage || DEAL_STAGE.LEAD,
      owner: data.owner || user.id,
      notes: data.notes || "",
      created_by: user.id,
    });
    return this.getById(String(doc._id), user);
  }

  async list(
    options: IPaginationOptions,
    filters: { stage?: string; client?: string; owner?: string; search?: string },
    user: IAuthUser
  ) {
    const { page, limit, skip, sortBy, sortOrder } =
      paginationHelpers.calculatePagination(options);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const cond: any = { is_Deleted: false, ...this.scope(user) };
    if (filters.stage) cond.stage = filters.stage;
    if (filters.client) cond.client = filters.client;
    if (filters.owner) cond.owner = filters.owner;
    if (filters.search) cond.name = { $regex: filters.search, $options: "i" };

    const [data, total] = await Promise.all([
      DealModel.find(cond)
        .populate(populateRefs)
        .sort({ [sortBy]: sortOrder === "desc" ? -1 : 1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      DealModel.countDocuments(cond),
    ]);
    return { meta: { page, limit, total }, data };
  }

  async getById(id: string, user: IAuthUser) {
    const deal = await DealModel.findOne({
      _id: id,
      is_Deleted: false,
      ...this.scope(user),
    }).populate(populateRefs);
    if (!deal) throw new ApiError(HttpStatusCode.NOT_FOUND, "Deal not found.");
    return deal;
  }

  async update(id: string, data: Record<string, unknown>, user: IAuthUser) {
    const before = await DealModel.findOne({
      _id: id,
      is_Deleted: false,
      ...this.scope(user),
    });
    if (!before) throw new ApiError(HttpStatusCode.NOT_FOUND, "Deal not found.");
    if (data.client) await ClientService.assertAccess(String(data.client), user);

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const patch: any = { ...data };
    if (
      data.expected_value !== undefined ||
      data.probability !== undefined ||
      data.currency !== undefined
    ) {
      const currency =
        (data.currency as string) || before.expected_value.currency;
      const expectedAmount =
        data.expected_value !== undefined
          ? (data.expected_value as string | number)
          : before.expected_value.amount.toString();
      const probability =
        data.probability !== undefined
          ? Number(data.probability)
          : before.probability;
      patch.expected_value = money(expectedAmount, currency);
      patch.probability = probability;
      patch.weighted_value = this.weighted(expectedAmount, currency, probability);
    }
    delete patch.currency;

    const updated = await DealModel.findByIdAndUpdate(id, patch, {
      new: true,
    }).populate(populateRefs);
    return { updated, before: before.toObject() };
  }

  async updateStage(id: string, stage: string, user: IAuthUser) {
    const before = await DealModel.findOne({
      _id: id,
      is_Deleted: false,
      ...this.scope(user),
    });
    if (!before) throw new ApiError(HttpStatusCode.NOT_FOUND, "Deal not found.");
    const updated = await DealModel.findByIdAndUpdate(
      id,
      { stage },
      { new: true }
    ).populate(populateRefs);
    return { updated, before: before.toObject() };
  }

  /**
   * Convert a won deal into a draft contract (spec §A1/§F1). Seeds a line from
   * the deal's service + expected value, links deal↔contract for attribution,
   * marks the deal won, and activates the client. The user lands on the draft
   * contract to review/adjust before issuing anything.
   */
  async convert(id: string, user: IAuthUser) {
    const deal = await DealModel.findOne({
      _id: id,
      is_Deleted: false,
      ...this.scope(user),
    });
    if (!deal) throw new ApiError(HttpStatusCode.NOT_FOUND, "Deal not found.");
    if (!deal.client)
      throw new ApiError(
        HttpStatusCode.BAD_REQUEST,
        "Link this deal to a client before converting it to a contract."
      );
    if (deal.converted_contract)
      throw new ApiError(
        HttpStatusCode.CONFLICT,
        "This deal has already been converted to a contract."
      );
    await ClientService.assertAccess(String(deal.client), user);

    const amount = decimal128ToString(deal.expected_value.amount);
    const currency = deal.expected_value.currency;
    const services =
      Number(amount) > 0 || deal.service
        ? [
            {
              service: deal.service ? String(deal.service) : "",
              name: deal.name,
              pricing_model: "fixed",
              price: amount,
              quantity: 1,
            },
          ]
        : [];

    const contract = await ContractService.create(
      {
        client: String(deal.client),
        deal: String(deal._id),
        name: deal.name,
        status: "draft",
        currency,
        account_manager: deal.owner ? String(deal.owner) : "",
        services,
      },
      user
    );

    await DealModel.findByIdAndUpdate(id, {
      stage: DEAL_STAGE.WON,
      converted_contract: contract._id,
    });
    await ClientService.markActive(String(deal.client));

    return contract;
  }

  async remove(id: string, user: IAuthUser) {
    const deal = await DealModel.findOne({
      _id: id,
      is_Deleted: false,
      ...this.scope(user),
    });
    if (!deal) throw new ApiError(HttpStatusCode.NOT_FOUND, "Deal not found.");
    await DealModel.findByIdAndUpdate(id, { is_Deleted: true });
    return deal;
  }

  async pipeline(user: IAuthUser) {
    const agg = await DealModel.aggregate([
      { $match: { is_Deleted: false, ...this.aggScope(user) } },
      {
        $group: {
          _id: "$stage",
          count: { $sum: 1 },
          expected: { $sum: { $toDouble: "$expected_value.amount" } },
          weighted: { $sum: { $toDouble: "$weighted_value.amount" } },
        },
      },
    ]);

    let totalPipeline = 0;
    let weightedPipeline = 0;
    let wonValue = 0;
    let openCount = 0;
    for (const g of agg) {
      if (OPEN_STAGES.includes(g._id)) {
        totalPipeline += g.expected;
        weightedPipeline += g.weighted;
        openCount += g.count;
      }
      if (g._id === DEAL_STAGE.WON) wonValue += g.expected;
    }

    return {
      by_stage: agg.map((g) => ({
        stage: g._id,
        count: g.count,
        value: g.expected,
        weighted: g.weighted,
      })),
      total_pipeline: totalPipeline,
      weighted_pipeline: weightedPipeline,
      won_value: wonValue,
      open_count: openCount,
    };
  }
}

export const DealService = new Service();
