import ApiError from "@/middlewares/error";
import { HttpStatusCode } from "@/lib/httpStatus";
import { ContractModel, ContractServiceModel } from "./contract.model";
import { CONTRACT_STATUS, LIVE_CONTRACT_STATUSES } from "./contract.enum";
import { ClientService } from "@/modules/client/client.service";
import { InvoiceService } from "@/modules/invoice/invoice.service";
import { RecurringBillingService } from "@/modules/recurringBilling/recurringBilling.service";
import { RecurringBillingModel } from "@/modules/recurringBilling/recurringBilling.model";
import { scopeFilter } from "@/shared/scope";
import { IAuthUser } from "@/lib/rbac";
import {
  money,
  mulMoney,
  sumMoney,
  addMoney,
  zeroMoney,
  decimal128ToString,
  IMoney,
  DEFAULT_CURRENCY,
} from "@/lib/money";
import {
  PRICING_MODEL,
  RECURRING_PRICING_MODELS,
  PRICING_MODEL_MONTHS,
} from "@/modules/service/service.enum";
import { MESSAGING_PREF } from "@/modules/client/client.enum";
import { paginationHelpers } from "@/helpers/paginationHelpers";
import { IPaginationOptions } from "@/interfaces/pagination.interfaces";

const populateRefs = [
  { path: "client", select: "name" },
  { path: "account_manager", select: "name email" },
  { path: "created_by", select: "name email" },
];

interface LineInput {
  service?: string | null;
  name: string;
  description?: string;
  pricing_model?: string;
  price?: number | string;
  quantity?: number | string;
  start_date?: string;
  end_date?: string;
  messaging?: { sms?: string; email?: string };
}

class Contract {
  private scope(user: IAuthUser) {
    return scopeFilter(user, "contracts", {
      own: "created_by",
      assigned: "account_manager",
    });
  }

  /** MRR contribution of one line = its total normalized to a monthly figure. */
  private lineMrr(pricingModel: string, lineTotal: IMoney): IMoney {
    if (!RECURRING_PRICING_MODELS.includes(pricingModel))
      return zeroMoney(lineTotal.currency);
    const months = PRICING_MODEL_MONTHS[pricingModel] || 1;
    return mulMoney(lineTotal, 1 / months);
  }

  private async genContractNumber(): Promise<string> {
    const year = new Date().getFullYear();
    const prefix = `ZPX-${year}-`;
    const count = await ContractModel.countDocuments({
      contract_number: { $regex: `^${prefix}` },
    });
    return `${prefix}${String(count + 1).padStart(4, "0")}`;
  }

  /** Stable natural key for a line, used to carry the `invoiced` flag across a
   *  destructive line resync so already-billed milestones are not re-billed. */
  private lineKey(name: string, pricingModel: string, priceStr: string): string {
    return `${name}|${pricingModel}|${priceStr}`;
  }

  /**
   * Replace a contract's service lines with the provided set and return the
   * recomputed aggregates. All money is computed server-side (spec §54). The
   * milestone `invoiced` flag is preserved across the resync (spec §A5).
   */
  private async syncLines(
    contractId: string,
    currency: string,
    lines: LineInput[]
  ): Promise<{ total: IMoney; mrr: IMoney }> {
    const existing = await ContractServiceModel.find({
      contract: contractId,
      is_Deleted: false,
    }).lean();
    const priorInvoiced = new Map<string, boolean>();
    for (const e of existing) {
      priorInvoiced.set(
        this.lineKey(
          e.name,
          e.pricing_model,
          decimal128ToString(e.price.amount)
        ),
        !!e.invoiced
      );
    }

    await ContractServiceModel.deleteMany({ contract: contractId });
    if (!lines.length)
      return { total: zeroMoney(currency), mrr: zeroMoney(currency) };

    const docs = lines.map((l) => {
      const quantity = Number(l.quantity ?? 1);
      const pricing_model = l.pricing_model || PRICING_MODEL.FIXED;
      const price = money(l.price ?? 0, currency);
      const line_total = mulMoney(price, quantity);
      const key = this.lineKey(
        l.name,
        pricing_model,
        decimal128ToString(price.amount)
      );
      return {
        contract: contractId,
        service: l.service || null,
        name: l.name,
        description: l.description || "",
        pricing_model,
        price,
        quantity,
        line_total,
        start_date: l.start_date || null,
        end_date: l.end_date || null,
        invoiced: priorInvoiced.get(key) ?? false,
        messaging: {
          sms: l.messaging?.sms || MESSAGING_PREF.INHERIT,
          email: l.messaging?.email || MESSAGING_PREF.INHERIT,
        },
      };
    });
    await ContractServiceModel.insertMany(docs);

    const total = sumMoney(
      docs.map((d) => d.line_total),
      currency
    );
    const mrr = docs.reduce(
      (acc, d) => addMoney(acc, this.lineMrr(d.pricing_model, d.line_total)),
      zeroMoney(currency)
    );
    return { total, mrr };
  }

  async create(data: Record<string, unknown>, user: IAuthUser) {
    await ClientService.assertAccess(String(data.client), user);
    const currency = (data.currency as string) || DEFAULT_CURRENCY;
    const contract_number = await this.genContractNumber();
    const msg = data.messaging as { sms?: string; email?: string } | undefined;

    const doc = await ContractModel.create({
      contract_number,
      client: data.client,
      deal: data.deal || null,
      name: data.name,
      status: data.status || CONTRACT_STATUS.DRAFT,
      start_date: data.start_date || null,
      end_date: data.end_date || null,
      renewal_date: data.renewal_date || null,
      currency,
      total_value: zeroMoney(currency),
      mrr_value: zeroMoney(currency),
      payment_terms_days: Number(data.payment_terms_days ?? 0),
      account_manager: data.account_manager || user.id,
      messaging: {
        sms: msg?.sms || MESSAGING_PREF.INHERIT,
        email: msg?.email || MESSAGING_PREF.INHERIT,
      },
      notes: data.notes || "",
      created_by: user.id,
    });

    const { total, mrr } = await this.syncLines(
      String(doc._id),
      currency,
      (data.services as LineInput[]) || []
    );
    doc.total_value = total;
    doc.mrr_value = mrr;
    await doc.save();

    // A live contract activates the client (§A4).
    if ((data.status || CONTRACT_STATUS.DRAFT) === CONTRACT_STATUS.ACTIVE)
      await ClientService.markActive(String(data.client));

    return this.getById(String(doc._id), user);
  }

  async list(
    options: IPaginationOptions,
    filters: {
      status?: string;
      client?: string;
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
    if (filters.client) cond.client = filters.client;
    if (filters.account_manager) cond.account_manager = filters.account_manager;
    if (filters.search) {
      cond.$or = [
        { name: { $regex: filters.search, $options: "i" } },
        { contract_number: { $regex: filters.search, $options: "i" } },
      ];
    }

    const [data, total] = await Promise.all([
      ContractModel.find(cond)
        .populate(populateRefs)
        .sort({ [sortBy]: sortOrder === "desc" ? -1 : 1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      ContractModel.countDocuments(cond),
    ]);
    return { meta: { page, limit, total }, data };
  }

  /** Active contracts whose end date falls within the next `days` days. */
  async expiring(days: number, user: IAuthUser) {
    const now = new Date();
    const until = new Date();
    until.setDate(until.getDate() + days);
    const data = await ContractModel.find({
      is_Deleted: false,
      ...this.scope(user),
      status: { $in: LIVE_CONTRACT_STATUSES },
      end_date: { $gte: now, $lte: until },
    })
      .populate(populateRefs)
      .sort({ end_date: 1 })
      .lean();
    return { meta: { page: 1, limit: data.length, total: data.length }, data };
  }

  async getById(id: string, user: IAuthUser) {
    const contract = await ContractModel.findOne({
      _id: id,
      is_Deleted: false,
      ...this.scope(user),
    }).populate(populateRefs);
    if (!contract)
      throw new ApiError(HttpStatusCode.NOT_FOUND, "Contract not found.");
    const services = await ContractServiceModel.find({
      contract: id,
      is_Deleted: false,
    })
      .populate({ path: "service", select: "name" })
      .lean();
    return { ...contract.toObject(), services };
  }

  async update(id: string, data: Record<string, unknown>, user: IAuthUser) {
    const before = await ContractModel.findOne({
      _id: id,
      is_Deleted: false,
      ...this.scope(user),
    });
    if (!before)
      throw new ApiError(HttpStatusCode.NOT_FOUND, "Contract not found.");

    const currency = (data.currency as string) || before.currency;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const patch: any = { ...data };
    delete patch.services;
    patch.currency = currency;

    const msg = data.messaging as { sms?: string; email?: string } | undefined;
    if (msg) {
      patch.messaging = {
        sms: msg.sms || before.messaging.sms,
        email: msg.email || before.messaging.email,
      };
    }

    await ContractModel.findByIdAndUpdate(id, patch);

    if (data.services !== undefined) {
      const { total, mrr } = await this.syncLines(
        id,
        currency,
        data.services as LineInput[]
      );
      await ContractModel.findByIdAndUpdate(id, {
        total_value: total,
        mrr_value: mrr,
      });
    }

    if (data.status === CONTRACT_STATUS.ACTIVE)
      await ClientService.markActive(String(before.client));

    return { updated: await this.getById(id, user), before: before.toObject() };
  }

  async renew(id: string, data: Record<string, unknown>, user: IAuthUser) {
    const before = await ContractModel.findOne({
      _id: id,
      is_Deleted: false,
      ...this.scope(user),
    });
    if (!before)
      throw new ApiError(HttpStatusCode.NOT_FOUND, "Contract not found.");

    await ContractModel.findByIdAndUpdate(id, {
      start_date: data.start_date || before.end_date || before.start_date,
      end_date: data.end_date,
      renewal_date: data.renewal_date || null,
      status: CONTRACT_STATUS.ACTIVE,
    });
    await ClientService.markActive(String(before.client));
    return { updated: await this.getById(id, user), before: before.toObject() };
  }

  /**
   * Draft an invoice from a contract's one-off (non-recurring) lines so billed
   * amounts reconcile to the agreement (spec §A2/§F2). Recurring lines are
   * handled by schedules (§A3); milestone dates are handled by the cron (§A5).
   */
  async generateInvoice(id: string, user: IAuthUser) {
    const contract = await ContractModel.findOne({
      _id: id,
      is_Deleted: false,
      ...this.scope(user),
    });
    if (!contract)
      throw new ApiError(HttpStatusCode.NOT_FOUND, "Contract not found.");

    const lines = await ContractServiceModel.find({
      contract: id,
      is_Deleted: false,
    });
    const billable = lines.filter(
      (l) => !RECURRING_PRICING_MODELS.includes(l.pricing_model)
    );
    if (!billable.length)
      throw new ApiError(
        HttpStatusCode.BAD_REQUEST,
        "This contract has no one-off (non-recurring) lines to invoice."
      );

    return InvoiceService.create(
      {
        client: String(contract.client),
        contract: String(contract._id),
        currency: contract.currency,
        status: "draft",
        lines: billable.map((l) => ({
          description: l.name,
          quantity: l.quantity,
          unit_price: decimal128ToString(l.price.amount),
          service: l.service ? String(l.service) : "",
        })),
      },
      user
    );
  }

  /**
   * Create recurring billing schedules from a contract's recurring lines
   * (spec §A3). Idempotent-ish: a line already backed by a schedule (same
   * service + frequency + label) is skipped so re-running won't double-bill.
   */
  async generateSchedules(id: string, user: IAuthUser) {
    const contract = await ContractModel.findOne({
      _id: id,
      is_Deleted: false,
      ...this.scope(user),
    });
    if (!contract)
      throw new ApiError(HttpStatusCode.NOT_FOUND, "Contract not found.");

    const lines = await ContractServiceModel.find({
      contract: id,
      is_Deleted: false,
    });
    const recurring = lines.filter((l) =>
      RECURRING_PRICING_MODELS.includes(l.pricing_model)
    );
    if (!recurring.length)
      throw new ApiError(
        HttpStatusCode.BAD_REQUEST,
        "This contract has no recurring lines to schedule."
      );

    const existing = await RecurringBillingModel.find({
      contract: id,
      is_Deleted: false,
    }).lean();

    let created = 0;
    let skipped = 0;
    for (const l of recurring) {
      // Recurring pricing-model values map 1:1 onto billing frequencies.
      const frequency = l.pricing_model;
      const dup = existing.find(
        (e) =>
          String(e.service || "") === String(l.service || "") &&
          e.frequency === frequency &&
          (e.description || "") === (l.name || "")
      );
      if (dup) {
        skipped++;
        continue;
      }
      const start = l.start_date || contract.start_date || new Date();
      await RecurringBillingService.create(
        {
          client: String(contract.client),
          contract: String(contract._id),
          service: l.service ? String(l.service) : "",
          amount: decimal128ToString(l.line_total.amount),
          currency: contract.currency,
          frequency,
          start_date: new Date(start).toISOString(),
          description: l.name,
        },
        user
      );
      created++;
    }
    return { created, skipped, total: recurring.length };
  }

  /**
   * Cron step (spec §A5): raise an invoice for every milestone line whose due
   * date has arrived and that has not yet been billed, then mark it invoiced.
   * Idempotent via the line `invoiced` flag and error-tolerant per line (§59).
   */
  async generateDueMilestones(now: Date = new Date()) {
    const lines = await ContractServiceModel.find({
      is_Deleted: false,
      pricing_model: PRICING_MODEL.MILESTONE,
      invoiced: { $ne: true },
      start_date: { $ne: null, $lte: now },
    });

    let generated = 0;
    let skipped = 0;
    let failed = 0;
    for (const l of lines) {
      try {
        const contract = await ContractModel.findOne({
          _id: l.contract,
          is_Deleted: false,
        });
        if (!contract || contract.status === CONTRACT_STATUS.CANCELLED) {
          skipped++;
          continue;
        }
        await InvoiceService.createInternal({
          client: String(contract.client),
          contract: String(contract._id),
          currency: contract.currency,
          issue_date: new Date(l.start_date || now).toISOString(),
          status: "issued",
          lines: [
            {
              description: l.name,
              quantity: l.quantity,
              unit_price: decimal128ToString(l.price.amount),
            },
          ],
        });
        await ContractServiceModel.findByIdAndUpdate(l._id, { invoiced: true });
        generated++;
      } catch (e) {
        failed++;
        console.error(
          "[cron] milestone invoice generation failed:",
          (e as Error).message
        );
      }
    }
    return { due: lines.length, generated, skipped, failed };
  }

  async remove(id: string, user: IAuthUser) {
    const contract = await ContractModel.findOne({
      _id: id,
      is_Deleted: false,
      ...this.scope(user),
    });
    if (!contract)
      throw new ApiError(HttpStatusCode.NOT_FOUND, "Contract not found.");
    await ContractModel.findByIdAndUpdate(id, { is_Deleted: true });
    return contract;
  }
}

export const ContractService = new Contract();
