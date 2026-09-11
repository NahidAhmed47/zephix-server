import ApiError from "@/middlewares/error";
import { HttpStatusCode } from "@/lib/httpStatus";
import { HostingModel } from "./hosting.model";
import { RECORD_TYPE, HOSTING_TYPE, HOSTING_STATUS } from "./hosting.enum";
import { ClientService } from "@/modules/client/client.service";
import { NotificationService } from "@/modules/notification/notification.service";
import { NOTIFICATION_TYPE } from "@/modules/notification/notification.enum";
import { encrypt, decrypt } from "@/lib/encryption";
import { IAuthUser } from "@/lib/rbac";
import { paginationHelpers } from "@/helpers/paginationHelpers";
import { IPaginationOptions } from "@/interfaces/pagination.interfaces";

/* eslint-disable @typescript-eslint/no-explicit-any */

const populateRefs = [
  { path: "client", select: "name" },
  { path: "project", select: "name" },
  { path: "created_by", select: "name email" },
];

/** Strip the encrypted credential before returning; expose only a boolean. */
const toPublic = (doc: any) => {
  if (!doc) return doc;
  const obj = doc.toObject ? doc.toObject() : doc;
  const { credentials, ...rest } = obj;
  return { ...rest, credentials: "", has_credentials: !!credentials };
};

const soonest = (r: any): number => {
  const times = [r.domain_expiry, r.hosting_expiry, r.ssl_expiry]
    .filter(Boolean)
    .map((d: any) => new Date(d).getTime());
  return times.length ? Math.min(...times) : Number.MAX_SAFE_INTEGER;
};

class Hosting {
  /** Hosting records follow client data access (spec §41). */
  private async clientScope(user: IAuthUser) {
    const ids = await ClientService.accessibleClientIds(user);
    if (ids === null) return {};
    return { client: { $in: ids } };
  }

  async create(data: Record<string, unknown>, user: IAuthUser) {
    await ClientService.assertAccess(String(data.client), user);
    const doc = await HostingModel.create({
      name: data.name,
      type: data.type || RECORD_TYPE.DOMAIN,
      client: data.client,
      project: data.project || null,
      registrar: data.registrar || "",
      domain_expiry: data.domain_expiry || null,
      auto_renew:
        data.auto_renew !== undefined ? Boolean(data.auto_renew) : false,
      nameservers: data.nameservers || "",
      provider: data.provider || "",
      hosting_type: data.hosting_type || HOSTING_TYPE.OTHER,
      server_location: data.server_location || "",
      server_ip: data.server_ip || "",
      control_panel_url: data.control_panel_url || "",
      hosting_expiry: data.hosting_expiry || null,
      ssl_expiry: data.ssl_expiry || null,
      status: data.status || HOSTING_STATUS.ACTIVE,
      credentials: data.credentials ? encrypt(String(data.credentials)) : "",
      notes: data.notes || "",
      created_by: user.id,
    });
    return toPublic(await HostingModel.findById(doc._id).populate(populateRefs));
  }

  async list(
    options: IPaginationOptions,
    filters: {
      client?: string;
      project?: string;
      status?: string;
      search?: string;
    },
    user: IAuthUser
  ) {
    const { page, limit, skip, sortBy, sortOrder } =
      paginationHelpers.calculatePagination(options);
    const cond: any = { is_Deleted: false, ...(await this.clientScope(user)) };
    if (filters.client) cond.client = filters.client;
    if (filters.project) cond.project = filters.project;
    if (filters.status) cond.status = filters.status;
    if (filters.search) cond.name = { $regex: filters.search, $options: "i" };

    const [data, total] = await Promise.all([
      HostingModel.find(cond)
        .populate(populateRefs)
        .sort({ [sortBy === "createdAt" ? "name" : sortBy]: sortOrder === "desc" ? -1 : 1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      HostingModel.countDocuments(cond),
    ]);
    return { meta: { page, limit, total }, data: data.map(toPublic) };
  }

  async getById(id: string, user: IAuthUser) {
    const doc = await HostingModel.findOne({
      _id: id,
      is_Deleted: false,
      ...(await this.clientScope(user)),
    }).populate(populateRefs);
    if (!doc)
      throw new ApiError(HttpStatusCode.NOT_FOUND, "Hosting record not found.");
    return toPublic(doc);
  }

  /** Decrypt + return the stored credentials (gated by hosting.view_credentials). */
  async reveal(id: string, user: IAuthUser) {
    const doc = await HostingModel.findOne({
      _id: id,
      is_Deleted: false,
      ...(await this.clientScope(user)),
    });
    if (!doc)
      throw new ApiError(HttpStatusCode.NOT_FOUND, "Hosting record not found.");
    return { credentials: doc.credentials ? decrypt(doc.credentials) : "" };
  }

  async update(id: string, data: Record<string, unknown>, user: IAuthUser) {
    const before = await HostingModel.findOne({
      _id: id,
      is_Deleted: false,
      ...(await this.clientScope(user)),
    });
    if (!before)
      throw new ApiError(HttpStatusCode.NOT_FOUND, "Hosting record not found.");
    if (data.client) await ClientService.assertAccess(String(data.client), user);

    const patch: any = { ...data };
    // Only replace the credential when a new non-empty value is provided.
    if (typeof data.credentials === "string" && data.credentials.length > 0)
      patch.credentials = encrypt(data.credentials);
    else delete patch.credentials;
    if (data.auto_renew !== undefined) patch.auto_renew = Boolean(data.auto_renew);

    await HostingModel.findByIdAndUpdate(id, patch);
    return {
      updated: await this.getById(id, user),
      before: toPublic(before.toObject()),
    };
  }

  async remove(id: string, user: IAuthUser) {
    const doc = await HostingModel.findOne({
      _id: id,
      is_Deleted: false,
      ...(await this.clientScope(user)),
    });
    if (!doc)
      throw new ApiError(HttpStatusCode.NOT_FOUND, "Hosting record not found.");
    await HostingModel.findByIdAndUpdate(id, { is_Deleted: true });
    return toPublic(doc);
  }

  /** Records whose domain / hosting / SSL expires within `days`, soonest first. */
  async expiring(days: number, user: IAuthUser) {
    const until = new Date(Date.now() + days * 86400000);
    const cond: any = {
      is_Deleted: false,
      ...(await this.clientScope(user)),
      $or: [
        { domain_expiry: { $lte: until } },
        { hosting_expiry: { $lte: until } },
        { ssl_expiry: { $lte: until } },
      ],
    };
    const data = (
      await HostingModel.find(cond).populate(populateRefs).lean()
    )
      .map(toPublic)
      .sort((a, b) => soonest(a) - soonest(b));
    return { meta: { page: 1, limit: data.length, total: data.length }, data };
  }

  /** Cron: notify each client's account manager of imminent expiries (§64).
   *  Deduped by NotificationService. Global (not scoped). */
  async generateExpiryAlerts(now: Date = new Date(), days = 14) {
    const until = new Date(now.getTime() + days * 86400000);
    const records = await HostingModel.find({
      is_Deleted: false,
      $or: [
        { domain_expiry: { $lte: until } },
        { hosting_expiry: { $lte: until } },
        { ssl_expiry: { $lte: until } },
      ],
    })
      .populate({ path: "client", select: "name account_manager" })
      .lean();

    let alerts = 0;
    for (const r of records as any[]) {
      const recipient = r.client?.account_manager;
      if (!recipient) continue;
      await NotificationService.notify({
        user: recipient,
        type: NOTIFICATION_TYPE.SYSTEM,
        title: `${r.name} — domain/hosting expiring soon`,
        message: `Renew before it lapses (${r.client?.name || "client"}).`,
        link: `/crm/clients/${r.client?._id}`,
      });
      alerts++;
    }
    return { hosting_alerts: alerts };
  }
}

export const HostingService = new Hosting();
